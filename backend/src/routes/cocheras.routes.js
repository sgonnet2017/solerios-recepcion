import { Router } from "express";
import { z } from "zod";
import { getPrisma } from "../services/prisma.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { esDiaValido, hoyUY, aColumnaDia, deColumnaDia, inicioDeDiaUY } from "../utils/fechas.js";

const router = Router();
router.use(requireAuth);

// Un :id que no es un uuid haría fallar a Postgres con un error 500
router.param("id", (req, res, next, id) => {
  if (!z.string().uuid().safeParse(id).success)
    return res.status(404).json({ error: "Cochera no encontrada" });
  next();
});
router.param("asignacionId", (req, res, next, id) => {
  if (!z.string().uuid().safeParse(id).success)
    return res.status(404).json({ error: "Reserva no encontrada" });
  next();
});

const dia = z.string().refine(esDiaValido, "Fecha inválida");
const apartamento = z.string().trim().min(1, "Falta el apartamento").max(100);

const asignarSchema = z.object({
  apartamento,
  // vacío = hoy; posterior a hoy = reserva a futuro
  desde: dia.optional(),
  // vacío o null = sin fecha de fin (solo si empieza hoy o antes)
  hasta: dia.nullable().optional(),
});
const extenderSchema = z.object({ hasta: dia.nullable() });

// Un error esperado (fechas que se pisan, cochera libre...) con el código y
// el mensaje que se le muestra a recepción
class ErrorDeNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// --- Fechas ---
// Los días se manejan como texto "2026-11-01", que ordena igual que el
// calendario. "Sin fecha de fin" se trata como un día lejísimo.
const SIN_FIN = "9999-12-31";
const dd_mm = (texto) => `${texto.slice(8, 10)}/${texto.slice(5, 7)}`;

// El período que ocupa una asignación activa. Una vencida (empezó, su "hasta"
// ya pasó y nadie la liberó) se considera ocupada hasta hoy: no se sabe si el
// auto sigue ahí, así que no se puede asignar a otro hasta resolverla.
function periodo(a, hoy) {
  const desde = deColumnaDia(a.desde);
  let hasta = deColumnaDia(a.hasta) ?? SIN_FIN;
  if (desde <= hoy && hasta < hoy) hasta = hoy;
  return { desde, hasta };
}

const sePisan = (p, q) => p.desde <= q.hasta && q.desde <= p.hasta;

// Separa las asignaciones activas de una cochera en la actual (la que ya
// empezó) y las próximas (reservas a futuro), y calcula el estado de hoy:
// Libre / Ocupada / Venció — se calcula, no se guarda (ver schema.prisma)
function clasificar(activas, hoy) {
  const empezadas = activas
    .filter((a) => deColumnaDia(a.desde) <= hoy)
    .sort((a, b) => b.desde - a.desde);
  const actual = empezadas[0] ?? null;
  const proximas = activas
    .filter((a) => deColumnaDia(a.desde) > hoy)
    .sort((a, b) => a.desde - b.desde);
  let estado = "libre";
  if (actual) {
    const hasta = deColumnaDia(actual.hasta);
    estado = hasta && hasta < hoy ? "vencida" : "ocupada";
  }
  return { actual, proximas, estado };
}

// en-uso / reservada / liberada / cancelada (liberada antes de empezar)
function situacion(a, hoy) {
  const desde = deColumnaDia(a.desde);
  if (a.liberadaEn) return a.liberadaEn < inicioDeDiaUY(desde) ? "cancelada" : "liberada";
  return desde > hoy ? "reservada" : "en-uso";
}

function formatearAsignacion(a, hoy = hoyUY()) {
  return {
    id: a.id,
    apartamento: a.apartamento,
    desde: deColumnaDia(a.desde),
    hasta: deColumnaDia(a.hasta),
    situacion: situacion(a, hoy),
    liberadaEn: a.liberadaEn,
    creadoPor: a.creadoPor,
    createdAt: a.createdAt,
  };
}

// Revisa las fechas de una asignación nueva. Devuelve el mensaje de error o null.
function errorDeFechas(desde, hasta, hoy) {
  if (hasta && hasta < desde) return "El hasta no puede ser anterior al desde";
  if (hasta && hasta < hoy) return "El hasta no puede ser una fecha pasada";
  if (desde > hoy && !hasta) return "Una reserva a futuro necesita fecha de fin";
  return null;
}

// Corta con un 409 si el período nuevo se pisa con otra asignación activa
// de la cochera (sin contar `excluirId`, la que se está modificando). Se
// revisan de la más temprana a la más tardía, así el mensaje nombra el primer
// choque (por ejemplo, una vencida antes que una reserva de dentro de un mes).
function chequearQueNoSePise(activas, nuevo, hoy, excluirId = null) {
  const pedido = { desde: nuevo.desde, hasta: nuevo.hasta ?? SIN_FIN };
  const enOrden = [...activas].sort((a, b) => a.desde - b.desde);
  for (const a of enOrden) {
    if (a.id === excluirId) continue;
    const p = periodo(a, hoy);
    if (!sePisan(p, pedido)) continue;
    const hasta = deColumnaDia(a.hasta);
    const cuando = hasta
      ? `${dd_mm(p.desde)} → ${dd_mm(hasta)}${hasta < hoy ? ", vencida sin liberar" : ""}`
      : `desde ${dd_mm(p.desde)}, sin fecha de fin`;
    throw new ErrorDeNegocio(409, `Se pisa con la del apto. ${a.apartamento} (${cuando})`);
  }
}

// Abre una transacción, "traba" la cochera (ver `version` en schema.prisma)
// y le pasa a `hacer` la cochera con sus asignaciones activas, ya leídas con
// la traba puesta. Si dos recepcionistas guardan a la vez en la misma
// cochera, la segunda espera acá y después ve lo que guardó la primera.
async function enLaCochera(cocheraId, hacer) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    let cochera;
    try {
      cochera = await tx.cochera.update({
        where: { id: cocheraId },
        data: { version: { increment: 1 } },
        include: { asignaciones: { where: { liberadaEn: null } } },
      });
    } catch (err) {
      if (err.code === "P2025") throw new ErrorDeNegocio(404, "Cochera no encontrada");
      throw err;
    }
    return hacer(tx, cochera);
  });
}

function datosNuevaAsignacion(cocheraId, { apartamento, desde, hasta }, user) {
  return {
    cocheraId,
    apartamento,
    desde: aColumnaDia(desde),
    hasta: hasta ? aColumnaDia(hasta) : null,
    creadoPor: user?.name ?? null,
  };
}

// Responde los errores esperados con su mensaje; el resto, al manejador de app.js
function responderError(err, res, next) {
  if (err instanceof ErrorDeNegocio) return res.status(err.status).json({ error: err.message });
  next(err);
}

// Lo que la pantalla necesita de una cochera: estado de hoy, la asignación
// actual (si tiene) y sus reservas a futuro. `c.asignaciones` = las activas.
function armarCochera(c, hoy) {
  const { actual, proximas, estado } = clasificar(c.asignaciones, hoy);
  return {
    id: c.id,
    codigo: c.codigo,
    estado,
    asignacion: actual ? formatearAsignacion(actual, hoy) : null,
    proximas: proximas.map((a) => formatearAsignacion(a, hoy)),
  };
}

// orden "natural": C-2 antes que C-10
const porCodigo = (a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true });

// GET /cocheras — todas, con su estado de hoy, la asignación actual (si
// tiene) y sus reservas a futuro
router.get("/", async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const cocheras = await prisma.cochera.findMany({
      include: { asignaciones: { where: { liberadaEn: null } } },
    });
    const hoy = hoyUY();
    res.json(cocheras.map((c) => armarCochera(c, hoy)).sort(porCodigo));
  } catch (err) {
    next(err);
  }
});

// --- Calendario ---
// Para el calendario no se guarda nada por día: se toman los períodos
// (desde → hasta) que ya existen y se devuelve, por cochera, la "barra" que
// ocupa cada uno dentro del rango pedido.
const MAX_DIAS_CALENDARIO = 62;
const calendarioSchema = z.object({ desde: dia, hasta: dia });

// El tramo que se dibuja de una asignación, o null si no se dibuja:
//  - activa: de su desde a su hasta (una vencida, hasta hoy)
//  - liberada: hasta el día en que se liberó (antes de su hasta si se fue
//    antes; después si estuvo vencida y se liberó tarde)
//  - cancelada (reserva que nunca empezó): no se dibuja
function barra(a, hoy) {
  const sit = situacion(a, hoy);
  if (sit === "cancelada") return null;
  const desde = deColumnaDia(a.desde);
  let hasta = deColumnaDia(a.hasta);
  let tipo;
  if (sit === "liberada") {
    tipo = "liberada";
    hasta = hoyUY(a.liberadaEn);
  } else if (sit === "reservada") {
    tipo = "reserva";
  } else {
    tipo = hasta && hasta < hoy ? "vencida" : "ocupada";
    if (tipo === "vencida") hasta = hoy;
  }
  return {
    id: a.id,
    apartamento: a.apartamento,
    desde,
    // null = sin fecha de fin (la barra sigue más allá del rango)
    hasta,
    // las fechas reales, para mostrar al tocar la barra
    desdeReal: desde,
    hastaReal: deColumnaDia(a.hasta),
    tipo,
    creadoPor: a.creadoPor,
  };
}

// GET /cocheras/calendario?desde=2026-10-19&hasta=2026-11-08 — cada cochera
// (con los mismos datos que GET /cocheras) y las barras que tocan ese rango
router.get("/calendario", async (req, res, next) => {
  const parsed = calendarioSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const { desde, hasta } = parsed.data;
  if (hasta < desde)
    return res.status(400).json({ error: "El hasta no puede ser anterior al desde" });
  if ((inicioDeDiaUY(hasta) - inicioDeDiaUY(desde)) / 86400000 + 1 > MAX_DIAS_CALENDARIO)
    return res.status(400).json({ error: `Se pueden pedir hasta ${MAX_DIAS_CALENDARIO} días` });
  try {
    const prisma = getPrisma();
    // todas las activas (son pocas: hacen falta enteras para el estado y las
    // reservas de la cochera) y, de las liberadas, solo las que tocan el rango
    const cocheras = await prisma.cochera.findMany({
      include: {
        asignaciones: {
          where: {
            OR: [
              { liberadaEn: null },
              // liberadas: empezó antes de que termine el rango y se liberó
              // después de que empieza (el filtro fino se hace abajo)
              { desde: { lte: aColumnaDia(hasta) }, liberadaEn: { gte: inicioDeDiaUY(desde) } },
            ],
          },
        },
      },
    });
    const hoy = hoyUY();
    const resultado = cocheras.map((c) => {
      const activas = c.asignaciones.filter((a) => !a.liberadaEn);
      const barras = c.asignaciones
        .map((a) => barra(a, hoy))
        // solo las que se ven en el rango pedido
        .filter((b) => b && b.desde <= hasta && (b.hasta === null || b.hasta >= desde))
        .sort((a, b) => (a.desde < b.desde ? -1 : 1));
      return { ...armarCochera({ ...c, asignaciones: activas }, hoy), barras };
    });
    res.json(resultado.sort(porCodigo));
  } catch (err) {
    next(err);
  }
});

// GET /cocheras/:id/historial — todas las asignaciones, la más nueva primero
router.get("/:id/historial", async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const cochera = await prisma.cochera.findUnique({
      where: { id: req.params.id },
      include: { asignaciones: { orderBy: [{ desde: "desc" }, { createdAt: "desc" }] } },
    });
    if (!cochera) return res.status(404).json({ error: "Cochera no encontrada" });
    const hoy = hoyUY();
    res.json({
      id: cochera.id,
      codigo: cochera.codigo,
      asignaciones: cochera.asignaciones.map((a) => formatearAsignacion(a, hoy)),
    });
  } catch (err) {
    next(err);
  }
});

// POST /cocheras/:id/asignar — asigna desde hoy (o antes), o reserva a futuro
// (desde posterior a hoy, con hasta obligatorio). No puede pisarse con otra.
router.post("/:id/asignar", async (req, res, next) => {
  const parsed = asignarSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const hoy = hoyUY();
  const datos = { ...parsed.data, desde: parsed.data.desde ?? hoy };
  const error = errorDeFechas(datos.desde, datos.hasta, hoy);
  if (error) return res.status(400).json({ error });
  try {
    const asignacion = await enLaCochera(req.params.id, async (tx, cochera) => {
      chequearQueNoSePise(cochera.asignaciones, datos, hoy);
      return tx.asignacion.create({ data: datosNuevaAsignacion(cochera.id, datos, req.user) });
    });
    res.status(201).json(formatearAsignacion(asignacion, hoy));
  } catch (err) {
    responderError(err, res, next);
  }
});

// POST /cocheras/:id/extender — cambia el "hasta" de la asignación actual
router.post("/:id/extender", async (req, res, next) => {
  const parsed = extenderSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const { hasta } = parsed.data;
  const hoy = hoyUY();
  if (hasta && hasta < hoy)
    return res.status(400).json({ error: "El hasta no puede ser una fecha pasada" });
  try {
    const asignacion = await enLaCochera(req.params.id, async (tx, cochera) => {
      const { actual } = clasificar(cochera.asignaciones, hoy);
      if (!actual) throw new ErrorDeNegocio(409, "La cochera no está ocupada");
      const desde = deColumnaDia(actual.desde);
      if (hasta && hasta < desde)
        throw new ErrorDeNegocio(400, "El hasta no puede ser anterior al desde");
      // extender no puede comerse una reserva que viene después
      chequearQueNoSePise(cochera.asignaciones, { desde, hasta }, hoy, actual.id);
      return tx.asignacion.update({
        where: { id: actual.id },
        data: { hasta: hasta ? aColumnaDia(hasta) : null },
      });
    });
    res.json(formatearAsignacion(asignacion, hoy));
  } catch (err) {
    responderError(err, res, next);
  }
});

// POST /cocheras/:id/liberar — cierra la asignación actual
router.post("/:id/liberar", async (req, res, next) => {
  const hoy = hoyUY();
  try {
    const asignacion = await enLaCochera(req.params.id, async (tx, cochera) => {
      const { actual } = clasificar(cochera.asignaciones, hoy);
      if (!actual) throw new ErrorDeNegocio(409, "La cochera no está ocupada");
      return tx.asignacion.update({
        where: { id: actual.id },
        data: { liberadaEn: new Date(), enUsoCocheraId: null },
      });
    });
    res.json(formatearAsignacion(asignacion, hoy));
  } catch (err) {
    responderError(err, res, next);
  }
});

// POST /cocheras/:id/reasignar — cierra la actual y empieza otra desde hoy
// (o antes), todo en la misma transacción: o pasan las dos cosas o ninguna
router.post("/:id/reasignar", async (req, res, next) => {
  const parsed = asignarSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const hoy = hoyUY();
  const datos = { ...parsed.data, desde: parsed.data.desde ?? hoy };
  if (datos.desde > hoy)
    return res.status(400).json({ error: "Para una fecha futura usá Reservar" });
  const error = errorDeFechas(datos.desde, datos.hasta, hoy);
  if (error) return res.status(400).json({ error });
  try {
    const nueva = await enLaCochera(req.params.id, async (tx, cochera) => {
      const { actual } = clasificar(cochera.asignaciones, hoy);
      if (!actual) throw new ErrorDeNegocio(409, "La cochera no está ocupada: usá Asignar");
      // la actual se cierra, así que solo cuentan las reservas de después
      chequearQueNoSePise(cochera.asignaciones, datos, hoy, actual.id);
      await tx.asignacion.update({
        where: { id: actual.id },
        data: { liberadaEn: new Date(), enUsoCocheraId: null },
      });
      return tx.asignacion.create({ data: datosNuevaAsignacion(cochera.id, datos, req.user) });
    });
    res.status(201).json(formatearAsignacion(nueva, hoy));
  } catch (err) {
    responderError(err, res, next);
  }
});

// POST /cocheras/:id/reservas/:asignacionId/cancelar — cancela una reserva a
// futuro (no se borra: queda en el historial como cancelada)
router.post("/:id/reservas/:asignacionId/cancelar", async (req, res, next) => {
  const hoy = hoyUY();
  try {
    const asignacion = await enLaCochera(req.params.id, async (tx, cochera) => {
      const reserva = cochera.asignaciones.find((a) => a.id === req.params.asignacionId);
      if (!reserva) throw new ErrorDeNegocio(404, "Reserva no encontrada");
      if (deColumnaDia(reserva.desde) <= hoy)
        throw new ErrorDeNegocio(409, "Esa reserva ya empezó: usá Liberar");
      return tx.asignacion.update({ where: { id: reserva.id }, data: { liberadaEn: new Date() } });
    });
    res.json(formatearAsignacion(asignacion, hoy));
  } catch (err) {
    responderError(err, res, next);
  }
});

export default router;
