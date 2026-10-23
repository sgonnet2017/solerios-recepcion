import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import api from '@/services/api'
import { PageSpinner } from '@/components/ui/Spinner'
import ErrorCarga from '@/components/ui/ErrorCarga'
import { hoyUY, sumarDias, lunesDe, diasEntre, fechaCorta } from '@/utils/fechas'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Calendario de cocheras: una fila por cochera, una columna por día, y cada
// asignación como una barra de su "desde" a su "hasta". No se guarda nada
// por día: las barras se calculan con los períodos que ya existen.
//  - tocar una barra → onBarra(cochera, barra)
//  - tocar un día vacío y después otro → onAsignar(cochera, desde, hasta)
const DIAS = 21 // tres semanas

const ESTILO_BARRA = {
  ocupada: 'bg-gold/20 border border-gold/50 text-gold-dark dark:text-gold-light',
  reserva: 'bg-sky-500/15 border border-dashed border-sky-500/70 text-sky-700 dark:text-sky-300',
  vencida: 'bg-orange-500/15 border border-orange-500/60 text-orange-700 dark:text-orange-300',
  liberada: 'bg-gray-400/10 border border-gray-400/40 text-text-muted',
}

// la grilla: la columna de las cocheras y una por día
const columnas = { gridTemplateColumns: `76px repeat(${DIAS}, minmax(34px, 1fr))`, minWidth: 76 + DIAS * 34 }

export default function CalendarioCocheras({ idsVisibles, version, onBarra, onAsignar }) {
  const hoy = hoyUY()
  const [inicio, setInicio] = useState(lunesDe(hoy))
  const [cocheras, setCocheras] = useState(null) // null = cargando
  const [error, setError] = useState(false)
  const [reintento, setReintento] = useState(0)
  // primer toque: { cochera, desde } — falta elegir el día de fin
  const [seleccion, setSeleccion] = useState(null)

  const fin = sumarDias(inicio, DIAS - 1)
  const dias = Array.from({ length: DIAS }, (_, i) => sumarDias(inicio, i))

  useEffect(() => {
    // si cambian de semana antes de que llegue la respuesta, la vieja se descarta
    let vigente = true
    setCocheras(null)
    api
      .get('/cocheras/calendario', { params: { desde: inicio, hasta: fin } })
      .then(({ data }) => {
        if (!vigente) return
        setCocheras(data)
        setError(false)
      })
      .catch(() => vigente && setError(true))
    return () => {
      vigente = false
    }
  }, [inicio, fin, version, reintento])

  function tocarDia(cochera, dia) {
    // primer toque, u otra cochera, o un día anterior: arranca de nuevo
    if (!seleccion || seleccion.cochera.id !== cochera.id || dia < seleccion.desde) {
      setSeleccion({ cochera, desde: dia })
      return
    }
    setSeleccion(null)
    onAsignar(cochera, seleccion.desde, dia)
  }

  // columna (1 = la primera de días) de un día, recortada a lo que se ve
  const col = (dia) => Math.min(Math.max(diasEntre(inicio, dia), 0), DIAS - 1) + 2

  const filas = cocheras?.filter((c) => !idsVisibles || idsVisibles.has(c.id))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button className="btn-secondary px-2" onClick={() => setInicio(sumarDias(inicio, -7))} aria-label="Semana anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[7.5rem] text-center text-sm font-medium text-text-primary">
            {fechaCorta(inicio).slice(0, 5)} – {fechaCorta(fin).slice(0, 5)}
          </span>
          <button className="btn-secondary px-2" onClick={() => setInicio(sumarDias(inicio, 7))} aria-label="Semana siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
        {inicio !== lunesDe(hoy) && (
          <button className="btn-secondary" onClick={() => setInicio(lunesDe(hoy))}>
            Volver a hoy
          </button>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary sm:ml-auto">
          <span className="flex items-center gap-1.5"><i className={`inline-block w-3.5 h-2.5 rounded-sm ${ESTILO_BARRA.ocupada}`} />Ocupada</span>
          <span className="flex items-center gap-1.5"><i className={`inline-block w-3.5 h-2.5 rounded-sm ${ESTILO_BARRA.reserva}`} />Reserva</span>
          <span className="flex items-center gap-1.5"><i className={`inline-block w-3.5 h-2.5 rounded-sm ${ESTILO_BARRA.vencida}`} />Venció</span>
          <span className="flex items-center gap-1.5"><i className={`inline-block w-3.5 h-2.5 rounded-sm ${ESTILO_BARRA.liberada}`} />Ya liberada</span>
        </div>
      </div>

      {/* después del primer toque: qué falta y cómo salir */}
      {seleccion ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
          <span className="text-text-primary">
            <b>{seleccion.cochera.codigo}</b> desde el {fechaCorta(seleccion.desde)}: tocá el día de fin
          </span>
          <button
            className="btn-ghost py-1 ml-auto"
            onClick={() => {
              setSeleccion(null)
              onAsignar(seleccion.cochera, seleccion.desde, '')
            }}
          >
            Sin fecha de fin
          </button>
          <button className="btn-ghost py-1" onClick={() => setSeleccion(null)} aria-label="Cancelar selección">
            <X size={16} />
          </button>
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          Tocá una barra para ver sus opciones, o dos días libres de una cochera (inicio y fin) para asignarla.
        </p>
      )}

      {error ? (
        <ErrorCarga mensaje="No se pudo cargar el calendario." onReintentar={async () => setReintento((n) => n + 1)} />
      ) : !filas ? (
        <PageSpinner />
      ) : (
        <div className="card overflow-x-auto">
          {/* cabecera: los días */}
          <div className="grid border-b border-border-subtle" style={columnas}>
            <div className="sticky left-0 z-20 bg-bg-card border-r border-border-subtle flex items-end px-3 pb-2 text-[11px] uppercase tracking-wider text-text-muted" style={{ gridRow: 1, gridColumn: 1 }}>
              Cochera
            </div>
            {dias.map((d, i) => {
              const esHoy = d === hoy
              const mes = i === 0 || d.endsWith('-01')
              return (
                <div
                  key={d}
                  style={{ gridRow: 1, gridColumn: i + 2 }}
                  className={`relative h-14 flex flex-col items-center justify-end pb-1.5 text-[11px] text-text-muted border-l border-border-subtle ${esHoy ? 'bg-gold/10' : ''}`}
                >
                  {mes && (
                    <span className="absolute top-1 left-1 text-[10px] font-semibold uppercase tracking-wider text-gold whitespace-nowrap">
                      {format(parseISO(d), 'MMMM', { locale: es })}
                    </span>
                  )}
                  {format(parseISO(d), 'EEE', { locale: es })}
                  <b
                    className={`text-[13px] font-semibold ${esHoy ? 'w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center' : 'text-text-primary'}`}
                  >
                    {Number(d.slice(8))}
                  </b>
                </div>
              )
            })}
          </div>

          {/* una fila por cochera */}
          {filas.map((c) => (
            <div key={c.id} className="grid border-b border-border-subtle last:border-b-0" style={columnas}>
              <div
                className="sticky left-0 z-20 bg-bg-card border-r border-border-subtle flex items-center px-3 font-heading font-semibold text-sm text-text-primary"
                style={{ gridRow: 1, gridColumn: 1 }}
              >
                {c.codigo}
              </div>

              {/* los días vacíos (debajo de las barras): se tocan para asignar */}
              {dias.map((d, i) => {
                const elegido = seleccion?.cochera.id === c.id && seleccion.desde === d
                return (
                  <button
                    key={d}
                    onClick={() => tocarDia(c, d)}
                    style={{ gridRow: 1, gridColumn: i + 2 }}
                    className={`h-11 border-l border-border-subtle transition-colors hover:bg-gold/10 ${d === hoy ? 'bg-gold/5' : ''} ${elegido ? '!bg-gold/30 ring-2 ring-inset ring-gold' : ''}`}
                    aria-label={`${c.codigo}, ${fechaCorta(d)}`}
                  />
                )
              })}

              {/* las barras, encima de los días */}
              {c.barras.map((b) => {
                const sinFin = b.hasta === null
                const empiezaAntes = b.desde < inicio
                const sigueDespues = sinFin || b.hasta > fin
                return (
                  <button
                    key={b.id}
                    onClick={() => onBarra(c, b)}
                    style={{ gridRow: 1, gridColumn: `${col(b.desde)} / ${col(sinFin ? fin : b.hasta) + 1}` }}
                    className={`z-10 self-center h-7 mx-0.5 px-2 rounded-md text-xs font-medium text-left truncate ${ESTILO_BARRA[b.tipo]} ${empiezaAntes ? 'rounded-l-none border-l-0' : ''} ${sigueDespues ? 'rounded-r-none border-r-0' : ''}`}
                    title={`Apto. ${b.apartamento} · ${fechaCorta(b.desdeReal)} → ${b.hastaReal ? fechaCorta(b.hastaReal) : 'sin fecha de fin'}`}
                  >
                    {empiezaAntes && '← '}Apto. {b.apartamento}
                    {sinFin && ' · sin fin →'}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
