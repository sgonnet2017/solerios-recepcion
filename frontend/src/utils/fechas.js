import { format, parseISO, addDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

// Los días viajan como texto "2026-10-16" (así los manda el backend).
// parseISO de un día sin hora da las 00:00 locales de ese día, así que
// formatearlo nunca lo corre a otro día.

// "Hoy" en Uruguay, aunque la compu tenga otra zona horaria
export function hoyUY() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo' }).format(new Date())
}

export function sumarDias(dia, n) {
  return format(addDays(parseISO(dia), n), 'yyyy-MM-dd')
}

// El lunes de la semana de ese día
export function lunesDe(dia) {
  return format(startOfWeek(parseISO(dia), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

// "16/10/2026"
export function fechaCorta(dia) {
  return dia ? format(parseISO(dia), 'dd/MM/yyyy') : ''
}

// "Jueves 16 de octubre" (solo la primera letra en mayúscula)
export function fechaLarga(dia) {
  const texto = format(parseISO(dia), "EEEE d 'de' MMMM", { locale: es })
  return texto[0].toUpperCase() + texto.slice(1)
}

// "jue 16"
export function fechaColumna(dia) {
  return format(parseISO(dia), 'EEE d', { locale: es })
}

// Un instante (ej. liberadaEn) → "16/10/2026 14:30" en hora de Uruguay
export function fechaHora(instante) {
  return new Date(instante).toLocaleString('es-UY', {
    timeZone: 'America/Montevideo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// "14:30" → minutos desde las 00:00
export function aMinutos(hora) {
  return Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
}

// minutos desde las 00:00 → "14:30" (1440 → "00:00")
export function aHora(minutos) {
  const m = minutos % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// Las filas de la agenda de un día, una cada pasoMin (15 minutos). Cada fila:
//  - { tipo: 'reserva', hora, reserva }  donde empieza una reserva (las filas
//    que cubre después no se muestran: la reserva ya dice hasta qué hora va)
//  - { tipo: 'libre', hora }             se puede reservar desde acá
//  - { tipo: 'no-entra', hora, siguiente } libre, pero no hay una hora entera
//                                        antes de la próxima reserva
//  - { tipo: 'pasado', hora }            ya no se puede reservar
// `reservas` puede traer las del día anterior: una de las 23:30 ocupa la
// primera media hora de este día.
export function armarAgenda(dia, { pasoMin, duracionMin, horario }, reservas) {
  const base = Date.parse(`${dia}T00:00:00-03:00`)
  // cada reserva como minutos desde las 00:00 de este día (puede ser negativo)
  const ocupadas = reservas.map((r) => {
    const empieza = (Date.parse(`${r.dia}T${r.hora}:00-03:00`) - base) / 60000
    return { reserva: r, empieza, termina: empieza + duracionMin }
  })
  const desde = horario ? aMinutos(horario.apertura) : 0
  const hasta = horario ? aMinutos(horario.cierre) : 1440

  const filas = []
  for (let m = desde; m < hasta; m += pasoMin) {
    const hora = aHora(m)
    const ocupada = ocupadas.find((o) => o.empieza <= m && m < o.termina)
    if (ocupada) {
      // la reserva se muestra una vez, en su primera fila de este día
      if (m === Math.max(ocupada.empieza, desde)) filas.push({ tipo: 'reserva', hora, reserva: ocupada.reserva })
      continue
    }
    // una reserva nueva acá ocuparía [m, m + duracionMin)
    if (m + duracionMin > hasta) continue
    if (base + (m + duracionMin) * 60000 <= Date.now()) {
      filas.push({ tipo: 'pasado', hora })
      continue
    }
    const choca = ocupadas.find((o) => o.empieza < m + duracionMin && m < o.termina)
    filas.push(choca ? { tipo: 'no-entra', hora, siguiente: choca.reserva.hora } : { tipo: 'libre', hora })
  }
  return filas
}
