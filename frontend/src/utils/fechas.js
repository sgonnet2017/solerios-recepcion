import { format, parseISO, addDays, startOfWeek, differenceInCalendarDays } from 'date-fns'
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

// Cuántos días van de `desde` a `hasta` ("2026-10-19" a "2026-10-22" = 3)
export function diasEntre(desde, hasta) {
  return differenceInCalendarDays(parseISO(hasta), parseISO(desde))
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


// --- Agenda del hidromasaje ---
// El día se divide en filas de pasoMin (1 hora), de la apertura al cierre.
// Todos los hidromasajes comparten esas filas, así quedan lado a lado.
export function filasDelDia({ pasoMin, horario }) {
  const desde = horario ? aMinutos(horario.apertura) : 0
  const hasta = horario ? aMinutos(horario.cierre) : 1440
  const filas = []
  for (let m = desde; m < hasta; m += pasoMin) filas.push(m)
  return filas
}

// La columna de UN hidromasaje en la agenda del día:
//  - bloques: cada reserva con su primera fila y cuántas filas ocupa
//  - celdas: lo que va en cada fila que no ocupa ninguna reserva:
//      'libre'    se puede reservar desde acá
//      'no-entra' libre, pero no hay una hora entera antes de la próxima reserva
//      'pasado'   ya no se puede reservar (o no termina antes del cierre)
// `reservas` son las de ese hidromasaje, y puede traer las del día anterior:
// una de las 23:30 ocupa la primera media hora de este día.
export function columnaDelDia(dia, config, reservas) {
  const { pasoMin, duracionMin, horario } = config
  const filas = filasDelDia(config)
  const desde = filas[0]
  const hasta = horario ? aMinutos(horario.cierre) : 1440
  const base = Date.parse(`${dia}T00:00:00-03:00`)
  // cada reserva como minutos desde las 00:00 de este día (puede ser negativo)
  const ocupadas = reservas.map((r) => {
    const empieza = (Date.parse(`${r.dia}T${r.hora}:00-03:00`) - base) / 60000
    return { reserva: r, empieza, termina: empieza + duracionMin }
  })

  // Cada reserva ocupa las filas que toca. Si alguna no empezara en hora justa
  // (por ejemplo, una vieja de las 15:15), igual cubre filas enteras.
  const bloques = ocupadas
    .filter((o) => o.termina > desde && o.empieza < hasta)
    .map((o) => {
      const fila = Math.floor((Math.max(o.empieza, desde) - desde) / pasoMin)
      const hastaFila = Math.ceil((Math.min(o.termina, hasta) - desde) / pasoMin)
      return { reserva: o.reserva, fila, filas: hastaFila - fila }
    })

  const celdas = []
  filas.forEach((m, i) => {
    // la tapa una reserva que toca esta fila [m, m + pasoMin)
    if (ocupadas.some((o) => o.empieza < m + pasoMin && m < o.termina)) return
    const termina = m + duracionMin // una reserva nueva acá ocuparía [m, termina)
    let tipo = 'libre'
    let siguiente = null
    if (termina > hasta || base + termina * 60000 <= Date.now()) tipo = 'pasado'
    else {
      const choca = ocupadas.find((o) => o.empieza < termina && m < o.termina)
      if (choca) {
        tipo = 'no-entra'
        siguiente = choca.reserva.hora
      }
    }
    celdas.push({ fila: i, hora: aHora(m), tipo, siguiente })
  })

  return { bloques, celdas }
}