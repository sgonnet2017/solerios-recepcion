import { Router } from "express";
import { z } from "zod";
import { getPrisma } from "../services/prisma.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  PASO_RESERVA_MIN,
  DURACION_RESERVA_MIN,
  HORARIO_HIDROMASAJE,
  HIDROMASAJES,
} from "../constants.js";
import {
  esDiaValido,
  inicioDeDiaUY,
  finDeDiaUY,
  instanteUY,
  diaYHoraUY,
} from "../utils/fechas.js";

const router = Router();
router.use(requireAuth);

// Un :id que no es un uuid haría fallar a Postgres con un error 500
router.param("id", (req, res, next, id) => {
  if (!z.string().uuid().safeParse(id).success)
    return res.status(404).json({ error: "Reserva no encontrada" });
  next();
});

const MIN_MS = 60 * 1000;
// Los "bloques" anti-choque son siempre de 15 minutos, aunque las reservas
// empiecen en hora justa: así, si quedara una reserva vieja de las 15:15, una
// nueva de las 15:00 igual choca con ella (comparten los bloques 15:15-15:45).
const BLOQUE_MIN = 15;
// cuántos bloques ocupa una reserva: 60 / 15 = 4
const BLOQUES_POR_RESERVA = DURACION_RESERVA_MIN / BLOQUE_MIN;
// Para no traer meses enteros de una vez (la agenda pide un día o una semana)
const MAX_DIAS_CONSULTA = 31;

const dia = z.string().refine(esDiaValido, "Fecha inválida");
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");
const apartamento = z.string().trim().min(1, "Falta el apartamento").max(100);

// opcional; vacío o null = sin comentario
const comentario = z.string().trim().max(500, "El comentario es demasiado largo").nullable();

// el número de uno de los hidromasajes que existen (1 o 2)
const hidromasaje = z
  .number()
  .int()
  .refine((n) => HIDROMASAJES.some((h) => h.numero === n), "Ese hidromasaje no existe");

const listarSchema = z.object({ desde: dia, hasta: dia.optional() });
const crearSchema = z.object({ hidromasaje, apartamento, dia, hora, comentario: comentario.optional() });
// Una reserva hecha no cambia de día ni de hora (para eso se cancela y se
// reserva otro turno): solo el apartamento y el comentario
const editarSchema = z
  .object({ apartamento: apartamento.optional(), comentario: comentario.optional() })
  .strict("Solo se puede cambiar el apartamento o el comentario")
  .refine((d) => Object.keys(d).length > 0, "No hay nada para cambiar");

const aMinutos = (texto) => Number(texto.slice(0, 2)) * 60 + Number(texto.slice(3, 5));

// Revisa que una reserva pueda empezar a esa hora: en la grilla (hora justa),
// dentro del horario y que no haya terminado. Devuelve el mensaje o null.
// (Que no se pise con otra lo controla la base, con los bloques.)
function errorDeTurno(diaTurno, horaTurno) {
  const minutos = aMinutos(horaTurno);
  if (minutos % PASO_RESERVA_MIN !== 0)
    return PASO_RESERVA_MIN === 60
      ? "Las reservas empiezan en hora justa (por ejemplo 14:00 o 15:00)"
      : `Las reservas empiezan cada ${PASO_RESERVA_MIN} minutos`;
  if (HORARIO_HIDROMASAJE) {
    const { apertura, cierre } = HORARIO_HIDROMASAJE;
    if (minutos < aMinutos(apertura) || minutos + DURACION_RESERVA_MIN > aMinutos(cierre))
      return `Fuera del horario del hidromasaje (${apertura} a ${cierre})`;
  }
  const fin = instanteUY(diaTurno, horaTurno).getTime() + DURACION_RESERVA_MIN * MIN_MS;
  if (fin <= Date.now()) return "Ese horario ya pasó";
  return null;
}

// inicio y fin de la reserva, más los bloques de 15 minutos que ocupa en
// ESE hidromasaje (los del otro no se tocan)
function datosDelTurno(numero, diaTurno, horaTurno) {
  const inicio = instanteUY(diaTurno, horaTurno);
  const bloques = Array.from({ length: BLOQUES_POR_RESERVA }, (_, i) => ({
    hidromasaje: numero,
    inicio: new Date(inicio.getTime() + i * BLOQUE_MIN * MIN_MS),
  }));
  return {
    hidromasaje: numero,
    inicio,
    fin: new Date(inicio.getTime() + DURACION_RESERVA_MIN * MIN_MS),
    bloques: { create: bloques },
  };
}

function formatearReserva(r) {
  const { dia: diaTurno, hora: horaTurno } = diaYHoraUY(r.inicio);
  return {
    id: r.id,
    hidromasaje: r.hidromasaje,
    apartamento: r.apartamento,
    comentario: r.comentario,
    dia: diaTurno,
    hora: horaTurno,
    horaFin: diaYHoraUY(r.fin).hora,
    creadoPor: r.creadoPor,
    createdAt: r.createdAt,
  };
}

// GET /reservas/config — los hidromasajes, los tiempos y el horario, para
// que la pantalla arme la agenda sin repetir estos valores
router.get("/config", (_req, res) => {
  res.json({
    hidromasajes: HIDROMASAJES,
    pasoMin: PASO_RESERVA_MIN,
    duracionMin: DURACION_RESERVA_MIN,
    horario: HORARIO_HIDROMASAJE,
  });
});

// GET /reservas?desde=2026-10-16&hasta=2026-10-22 — las activas de esos días
// (hora de Uruguay). Sin hasta = solo ese día.
router.get("/", async (req, res, next) => {
  const parsed = listarSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const { desde, hasta = desde } = parsed.data;
  if (hasta < desde)
    return res.status(400).json({ error: "El hasta no puede ser anterior al desde" });
  const dias = (inicioDeDiaUY(hasta) - inicioDeDiaUY(desde)) / 86400000 + 1;
  if (dias > MAX_DIAS_CONSULTA)
    return res.status(400).json({ error: `Se pueden pedir hasta ${MAX_DIAS_CONSULTA} días` });
  try {
    const prisma = getPrisma();
    const reservas = await prisma.reserva.findMany({
      where: {
        canceladaEn: null,
        inicio: { gte: inicioDeDiaUY(desde), lte: finDeDiaUY(hasta) },
      },
      orderBy: { inicio: "asc" },
    });
    res.json(reservas.map(formatearReserva));
  } catch (err) {
    next(err);
  }
});

// GET /reservas/proximas — todas las activas que todavía no terminaron (las
// de hoy que quedan y las futuras), la más cercana primero
const MAX_PROXIMAS = 500;
router.get("/proximas", async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const reservas = await prisma.reserva.findMany({
      where: { canceladaEn: null, fin: { gt: new Date() } },
      orderBy: { inicio: "asc" },
      take: MAX_PROXIMAS,
    });
    res.json(reservas.map(formatearReserva));
  } catch (err) {
    next(err);
  }
});

// POST /reservas — reserva un turno libre
router.post("/", async (req, res, next) => {
  const parsed = crearSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  const { hidromasaje: numero, apartamento: apto, dia: diaTurno, hora: horaTurno, comentario: coment } =
    parsed.data;
  const error = errorDeTurno(diaTurno, horaTurno);
  if (error) return res.status(400).json({ error });
  const nombre = HIDROMASAJES.find((h) => h.numero === numero).nombre;
  try {
    const prisma = getPrisma();
    const reserva = await prisma.reserva.create({
      data: {
        apartamento: apto,
        comentario: coment || null,
        ...datosDelTurno(numero, diaTurno, horaTurno),
        creadoPor: req.user?.name ?? null,
      },
    });
    res.status(201).json(formatearReserva(reserva));
  } catch (err) {
    // P2002 = algún bloque de ese hidromasaje ya lo ocupa otra reserva. Como
    // la reserva y sus bloques se crean juntos, no queda nada a medias.
    if (err.code === "P2002")
      return res.status(409).json({ error: `Ese horario se pisa con otra reserva del ${nombre}` });
    next(err);
  }
});

// PATCH /reservas/:id — cambia el apartamento y/o el comentario
router.patch("/:id", async (req, res, next) => {
  const parsed = editarSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const prisma = getPrisma();
    const existente = await prisma.reserva.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ error: "Reserva no encontrada" });
    if (existente.canceladaEn)
      return res.status(409).json({ error: "La reserva está cancelada" });

    // lo que no se manda queda como estaba
    const data = {};
    if (parsed.data.apartamento !== undefined) data.apartamento = parsed.data.apartamento;
    if (parsed.data.comentario !== undefined) data.comentario = parsed.data.comentario || null;

    const reserva = await prisma.reserva.update({ where: { id: existente.id }, data });
    res.json(formatearReserva(reserva));
  } catch (err) {
    next(err);
  }
});

// POST /reservas/:id/cancelar — no borra la reserva: la marca cancelada y
// borra sus bloques, así ese horario queda libre
router.post("/:id/cancelar", async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const existente = await prisma.reserva.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ error: "Reserva no encontrada" });
    if (existente.canceladaEn)
      return res.status(409).json({ error: "La reserva ya estaba cancelada" });
    await prisma.reserva.update({
      where: { id: existente.id },
      data: { canceladaEn: new Date(), bloques: { deleteMany: {} } },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
