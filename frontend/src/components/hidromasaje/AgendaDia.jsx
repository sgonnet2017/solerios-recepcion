import { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { filasDelDia, columnaDelDia, aHora, hoyUY } from '@/utils/fechas'

// cada fila es un turno (1 hora); alcanza para apto., horario y comentario
const ALTO_FILA = '4.25rem'

// La agenda de un día con los hidromasajes lado a lado: una columna por
// hidromasaje y las mismas filas (una por hora) para todos. Cada reserva es
// un bloque que ocupa su fila.
//  - tocar "Libre" → onLibre(hora, numeroDeHidromasaje)
//  - tocar una reserva → onReserva(reserva)
export default function AgendaDia({ dia, config, reservas, onLibre, onReserva }) {
  const listaRef = useRef(null)
  const ahoraRef = useRef(null)
  const esHoy = dia === hoyUY()
  const filas = filasDelDia(config)
  const columnas = config.hidromasajes.map((h) => ({
    ...h,
    ...columnaDelDia(
      dia,
      config,
      reservas.filter((r) => r.hidromasaje === h.numero),
    ),
  }))

  // la primera fila que todavía no pasó (en cualquier hidromasaje): adonde se
  // lleva la vista si es hoy
  const filaAhora = esHoy
    ? Math.min(...columnas.map((c) => c.celdas.find((x) => x.tipo !== 'pasado')?.fila ?? filas.length))
    : 0

  // hoy: la lista arranca mostrando la hora actual. Se mueve solo la lista (no
  // la página), así el título y los botones quedan a la vista.
  useEffect(() => {
    const lista = listaRef.current
    if (!lista) return
    lista.scrollTop = esHoy && ahoraRef.current ? ahoraRef.current.offsetTop - 48 : 0
  }, [dia, esHoy])

  const grilla = {
    gridTemplateColumns: `3.25rem repeat(${columnas.length}, minmax(0, 1fr))`,
    gridTemplateRows: `auto repeat(${filas.length}, ${ALTO_FILA})`,
  }

  return (
    <div ref={listaRef} className="card relative overflow-y-auto max-h-[calc(100vh-12rem)]">
      <div className="grid" style={grilla}>
        {/* cabecera: el nombre de cada hidromasaje (queda fija al bajar) */}
        <div className="sticky top-0 z-20 bg-bg-card border-b border-border-subtle" style={{ gridRow: 1, gridColumn: 1 }} />
        {columnas.map((c, i) => (
          <div
            key={c.numero}
            className="sticky top-0 z-20 bg-bg-card border-b border-l border-border-subtle px-2 py-2.5 text-center font-heading font-semibold text-sm text-text-primary"
            style={{ gridRow: 1, gridColumn: i + 2 }}
          >
            {c.nombre}
          </div>
        ))}

        {/* la columna de las horas */}
        {filas.map((m, f) => (
          <div
            key={m}
            ref={f === filaAhora ? ahoraRef : undefined}
            className="pr-2 text-right font-mono text-xs text-text-secondary border-t border-border-subtle pt-1"
            style={{ gridRow: f + 2, gridColumn: 1 }}
          >
            {aHora(m)}
          </div>
        ))}

        {columnas.map((c, i) => (
          <Columna key={c.numero} columna={c} col={i + 2} onLibre={onLibre} onReserva={onReserva} />
        ))}
      </div>
    </div>
  )
}

function Columna({ columna, col, onLibre, onReserva }) {
  return (
    <>
      {/* los huecos sin reserva */}
      {columna.celdas.map((x) => (
        <div
          key={x.fila}
          className="border-t border-l border-border-subtle p-0.5"
          style={{ gridRow: x.fila + 2, gridColumn: col }}
        >
          {x.tipo === 'libre' && (
            <button
              onClick={() => onLibre(x.hora, columna.numero)}
              className="w-full h-full rounded-md text-xs text-text-muted border border-dashed border-border-subtle hover:border-gold/50 hover:text-gold hover:bg-gold/5 transition-colors flex items-center justify-center gap-1"
              aria-label={`Reservar ${columna.nombre} a las ${x.hora}`}
            >
              <Plus size={12} /> Libre
            </button>
          )}
          {x.tipo === 'no-entra' && (
            <span
              className="w-full h-full flex items-center justify-center text-[11px] text-text-muted"
              title={`No entra una hora antes de la reserva de las ${x.siguiente}`}
            >
              no entra
            </span>
          )}
          {x.tipo === 'pasado' && <span className="block w-full h-full bg-bg-hover rounded-sm" />}
        </div>
      ))}

      {/* las reservas: un bloque que ocupa todas sus filas */}
      {columna.bloques.map(({ reserva, fila, filas }) => (
        <div
          key={reserva.id}
          className="border-t border-l border-border-subtle p-0.5"
          style={{ gridRow: `${fila + 2} / span ${filas}`, gridColumn: col }}
        >
          <button
            onClick={() => onReserva(reserva)}
            className="w-full h-full rounded-lg px-2 py-1 text-left bg-gold/15 border border-gold/30 hover:bg-gold/25 transition-colors overflow-hidden"
          >
            <span className="block font-medium text-sm text-text-primary truncate">Apto. {reserva.apartamento}</span>
            <span className="block text-xs text-text-secondary">
              {reserva.hora} a {reserva.horaFin}
            </span>
            {reserva.comentario && (
              <span className="block text-xs text-text-muted truncate">{reserva.comentario}</span>
            )}
          </button>
        </div>
      ))}
    </>
  )
}
