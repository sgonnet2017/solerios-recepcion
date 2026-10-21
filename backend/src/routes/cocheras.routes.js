import { Router } from "express";
import { z } from "zod";
import { getPrisma } from "../services/prisma.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { esDiaValido, hoyUY, aColumnaDia, deColumnaDia } from "../utils/fechas.js";

const router = Router();
router.use(requireAuth);

// Un :id que no es un uuid haría fallar a Postgres con un error 500
router.param("id", (req, res, next, id) => {
  if (!z.string().uuid().safeParse(id).success)
    return res.status(404).json({ error: "Cochera no encontrada" });
  next();
});

const dia = z.string().refine(esDiaValido, "Fecha inválida");
const apartamento = z.string().trim().min(1, "Falta el apartamento").max(100);

const asignarSchema = z.object({
  apartamento,
  // vacío = hoy
  desde: dia.optional(),
  // vacío o null = sin fecha de fin
  hasta: dia.nullable().optional(),
});
const extenderSchema = z.object({ hasta: dia.nullable() });

// Libre / Ocupada / Venció — se calcula, no se guarda (ver schema.prisma)
function calcularEstado(asignacionEnUso, hoy) {
  if (!asignacionEnUso) return "libre";
  const hasta = deColumnaDia(asignacionEnUso.hasta);
  return hasta && hasta < hoy ? "vencida" : "ocupada";
}

function formatearAsignacion(a) {
  return {
    id: a.id,
    apartamento: a.apartamento,
    desde: deColumnaDia(a.desde),
    hasta: deColumnaDia(a.hasta),
    liberadaEn: a.liberadaEn,
    creadoPor: a.creadoPor,
    createdAt: a.createdAt,
  };
}

// Revisa las fechas de una asignación nueva: no se asigna a futuro y el
// "hasta" no puede quedar en el pasado. Devuelve el mensaje de error o null.
function errorDeFechas(desde, hasta, hoy) {
  if (desde > hoy) return "No se puede asignar a futuro: el desde tiene que ser hoy o antes";
  if (hasta && hasta < desde) return "El hasta no puede ser anterior al desde";
  if (hasta && hasta < hoy) return "El hasta no puede ser una fecha pasada";
  return null;
}

function datosNuevaAsignacion(cocheraId, { apartamento, desde, hasta }, user) {
  return {
    cocheraId,
    apartamento,
    desde: aColumnaDia(desde),
    hasta: hasta ? aColumnaDia(hasta) : null,
    enUsoCocheraId: cocheraId,
    creadoPor: user?.name ?? null,
  };
}

// GET /cocheras — todas, con su estado y la asignación en uso (si tiene)
router.get("/", async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const cocheras = await prisma.cochera.findMany({
      include: { asignaciones: { where: { liberadaEn: null } } },
    });
    const hoy = hoyUY();
    const resultado = cocheras
      .map((c) => {
        const enUso = c.asignaciones[0] ?? null;
        return {
          id: c.id,
          codigo: c.codigo,
          estado: calcularEstado(enUso, hoy),
          asignacion: enUso ? formatearAsignacion(enUso) : null,
        };
      })
      // orden "natural": C-2 antes que C-10
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    res.json(resultado);
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
    res.json({
      id: cochera.id,
      codigo: cochera.codigo,
      asignaciones: cochera.asignaciones.map(formatearAsignacion),
    });
  } catch (err) {
    next(err);
  }
});

// POST /cocheras/:id/asignar — solo si está libre
router.post("/:id/asignar", async (req, res, next) => {
  const parsed = asignarSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const hoy = hoyUY();
  const datos = { ...parsed.data, desde: parsed.data.desde ?? hoy };
  const error = errorDeFechas(datos.desde, datos.hasta, hoy);
  if (error) return res.status(400).json({ error });
  try {
    const prisma = getPrisma();
    const cochera = await prisma.cochera.findUnique({ where: { id: req.params.id } });
    if (!cochera) return res.status(404).json({ error: "Cochera no encontrada" });
    const asignacion = await prisma.asignacion.create({
      data: datosNuevaAsignacion(cochera.id, datos, req.user),
    });
    res.status(201).json(formatearAsignacion(asignacion));
  } catch (err) {
    // P2002 = ya hay una asignación en uso (la regla @unique de enUsoCocheraId)
    if (err.code === "P2002")
      return res.status(409).json({ error: "La cochera ya está ocupada" });
    next(err);
  }
});

// POST /cocheras/:id/extender — cambia el "hasta" de la asignación en uso
router.post("/:id/extender", async (req, res, next) => {
  const parsed = extenderSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const { hasta } = parsed.data;
  if (hasta && hasta < hoyUY())
    return res.status(400).json({ error: "El hasta no puede ser una fecha pasada" });
  try {
    const prisma = getPrisma();
    const enUso = await prisma.asignacion.findUnique({
      where: { enUsoCocheraId: req.params.id },
    });
    if (!enUso) return res.status(409).json({ error: "La cochera no está ocupada" });
    if (hasta && hasta < deColumnaDia(enUso.desde))
      return res.status(400).json({ error: "El hasta no puede ser anterior al desde" });
    const asignacion = await prisma.asignacion.update({
      where: { id: enUso.id },
      data: { hasta: hasta ? aColumnaDia(hasta) : null },
    });
    res.json(formatearAsignacion(asignacion));
  } catch (err) {
    next(err);
  }
});

// POST /cocheras/:id/liberar — cierra la asignación en uso
router.post("/:id/liberar", async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const asignacion = await prisma.asignacion.update({
      where: { enUsoCocheraId: req.params.id },
      data: { liberadaEn: new Date(), enUsoCocheraId: null },
    });
    res.json(formatearAsignacion(asignacion));
  } catch (err) {
    // P2025 = no había asignación en uso (ya estaba libre, o alguien la liberó recién)
    if (err.code === "P2025")
      return res.status(409).json({ error: "La cochera no está ocupada" });
    next(err);
  }
});

// POST /cocheras/:id/reasignar — cierra la actual y crea la nueva, en una
// sola transacción: o pasan las dos cosas o ninguna
router.post("/:id/reasignar", async (req, res, next) => {
  const parsed = asignarSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const hoy = hoyUY();
  const datos = { ...parsed.data, desde: parsed.data.desde ?? hoy };
  const error = errorDeFechas(datos.desde, datos.hasta, hoy);
  if (error) return res.status(400).json({ error });
  try {
    const prisma = getPrisma();
    const [, nueva] = await prisma.$transaction([
      prisma.asignacion.update({
        where: { enUsoCocheraId: req.params.id },
        data: { liberadaEn: new Date(), enUsoCocheraId: null },
      }),
      prisma.asignacion.create({
        data: datosNuevaAsignacion(req.params.id, datos, req.user),
      }),
    ]);
    res.status(201).json(formatearAsignacion(nueva));
  } catch (err) {
    if (err.code === "P2025")
      return res.status(409).json({ error: "La cochera no está ocupada: usá Asignar" });
    // P2002 = otra recepcionista la reasignó al mismo tiempo
    if (err.code === "P2002")
      return res.status(409).json({ error: "La cochera cambió recién, recargá la pantalla" });
    next(err);
  }
});

export default router;
