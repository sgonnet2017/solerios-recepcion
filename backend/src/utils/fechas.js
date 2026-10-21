// El servidor (Vercel) trabaja en UTC, pero "hoy", "mañana" y la hora de un
// vencimiento tienen que ser los de Uruguay — que no tiene horario de verano
// (UTC-3 todo el año).
const OFFSET_UY_MS = -3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export const ZONA_HORARIA_UY = "America/Montevideo";

// Las 00:00 (hora de Uruguay) del día en que cae `fecha`
export function inicioDelDiaUY(fecha = new Date()) {
  const enUY = fecha.getTime() + OFFSET_UY_MS;
  return new Date(Math.floor(enUY / DIA_MS) * DIA_MS - OFFSET_UY_MS);
}

// --- Días elegidos por el usuario ("2026-10-05" de un selector de fecha) ---
// Un día elegido es un día de Uruguay: va de las 00:00 a las 23:59:59.999 hora
// de Uruguay (en UTC, de las 03:00 de ese día a las 02:59 del siguiente). Tratar
// "2026-10-05" como las 00:00 UTC lo corría 3 horas.

const FORMATO_DIA = /^\d{4}-\d{2}-\d{2}$/;

// "2026-10-05" tiene que ser un día que exista (JavaScript acepta "31 de
// febrero" y lo pasa en silencio al 3 de marzo, por eso se compara de vuelta)
export function esDiaValido(texto) {
  if (typeof texto !== "string" || !FORMATO_DIA.test(texto)) return false;
  const inicio = new Date(`${texto}T00:00:00.000-03:00`);
  if (isNaN(inicio)) return false;
  return new Date(inicio.getTime() + OFFSET_UY_MS).toISOString().slice(0, 10) === texto;
}

export function inicioDeDiaUY(texto) {
  return new Date(`${texto}T00:00:00.000-03:00`);
}

export function finDeDiaUY(texto) {
  return new Date(`${texto}T23:59:59.999-03:00`);
}

// --- Columnas de solo fecha (@db.Date, ej. desde/hasta de una cochera) ---
// Prisma las guarda y las devuelve como las 00:00 UTC de ese día, sin hora ni
// zona. Se manejan como texto "2026-10-05" para compararlas sin corrimientos.

// "Hoy" en Uruguay como texto: "2026-10-05"
export function hoyUY(ahora = new Date()) {
  return new Date(ahora.getTime() + OFFSET_UY_MS).toISOString().slice(0, 10);
}

// "2026-10-05" → el Date que espera una columna @db.Date
export function aColumnaDia(texto) {
  return new Date(`${texto}T00:00:00.000Z`);
}

// Date leído de una columna @db.Date → "2026-10-05" (o null)
export function deColumnaDia(fecha) {
  return fecha ? fecha.toISOString().slice(0, 10) : null;
}

// --- Día + hora de pared de Uruguay (turnos del hidromasaje) ---

// "2026-10-05" + "14:30" (hora de Uruguay) → el instante en que cae
export function instanteUY(dia, hora) {
  return new Date(`${dia}T${hora}:00.000-03:00`);
}

// Un instante → su día y hora en Uruguay: { dia: "2026-10-05", hora: "14:30" }
export function diaYHoraUY(fecha) {
  const texto = new Date(fecha.getTime() + OFFSET_UY_MS).toISOString();
  return { dia: texto.slice(0, 10), hora: texto.slice(11, 16) };
}

// --- Semana, mes y calendario de Uruguay ---

// Un Date cuyos getUTC*() devuelven la hora de pared de Uruguay
const aParedUY = (fecha) => new Date(fecha.getTime() + OFFSET_UY_MS);
// Al revés: las 00:00 de Uruguay de un día dado (el mes puede salirse de
// 0-11 y el día de 1-31: Date.UTC los acomoda solo, por ej. el mes -1 es diciembre)
const medianocheUY = (anio, mes, dia) =>
  new Date(Date.UTC(anio, mes, dia) - OFFSET_UY_MS);

// El lunes (00:00 de Uruguay) de la semana en que cae `ahora`
export function inicioDeSemanaUY(ahora = new Date()) {
  const p = aParedUY(ahora);
  const diaSemana = p.getUTCDay() === 0 ? 7 : p.getUTCDay(); // lunes = 1
  return medianocheUY(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() - (diaSemana - 1));
}

// El día 1 (00:00 de Uruguay) del mes en que cae `ahora`, o de hace `mesesAtras` meses
export function inicioDeMesUY(ahora = new Date(), mesesAtras = 0) {
  const p = aParedUY(ahora);
  return medianocheUY(p.getUTCFullYear(), p.getUTCMonth() - mesesAtras, 1);
}

// En qué mes y año de Uruguay cae un instante: { anio, mes } (mes 0-11)
export function mesUY(fecha) {
  const p = aParedUY(fecha);
  return { anio: p.getUTCFullYear(), mes: p.getUTCMonth() };
}

// Días de calendario (hora de Uruguay) que faltan para `fecha`:
// 0 = hoy, 1 = mañana, negativo = ya pasó ese día
export function diasHasta(fecha, ahora = new Date()) {
  return Math.round(
    (inicioDelDiaUY(fecha).getTime() - inicioDelDiaUY(ahora).getTime()) /
      DIA_MS,
  );
}

// Solo la fecha ("5/10/2026"), en el día de Uruguay. toLocaleDateString("es-UY")
// a secas cambia el formato pero NO la zona horaria: en el servidor (UTC) un
// control de las 22:00 de Uruguay saldría con la fecha del día siguiente.
export function formatearFechaUY(fecha) {
  return fecha.toLocaleDateString("es-UY", { timeZone: ZONA_HORARIA_UY });
}

export function formatearFechaHoraUY(fecha) {
  return fecha.toLocaleString("es-UY", { timeZone: ZONA_HORARIA_UY });
}
