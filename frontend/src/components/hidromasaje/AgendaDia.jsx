import { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { armarAgenda, hoyUY } from '@/utils/fechas'

// La agenda de un día, en filas de 15 minutos (ver armarAgenda):
// reserva → se toca para editar o cancelar; libre → se toca para reservar;
// "no entra" y pasado → en gris.
export default function AgendaDia({ dia, config, reservas, onLibre, onReserva }) {
  const listaRef = useRef(null)
  const proximoRef = useRef(null)
  const esHoy = dia === hoyUY()
  const filas = armarAgenda(dia, config, reservas)

  // hoy: la lista arranca mostrando la hora actual, no las 00:00. Se mueve
  // solo la lista (no la página), así el título y los botones quedan a la vista.
  useEffect(() => {
    const lista = listaRef.current
    if (!lista) return
    lista.scrollTop = esHoy && proximoRef.current ? proximoRef.current.offsetTop - 8 : 0
  }, [dia, esHoy])

  // la primera fila que todavía no pasó (adonde se lleva la vista)
  const proxima = filas.find((f) => f.tipo !== 'pasado')

  return (
    <div
      ref={listaRef}
      className="card relative divide-y divide-border-subtle overflow-y-auto max-h-[calc(100vh-12rem)]"
    >
      {filas.map((f) => (
        <div
          key={f.hora}
          ref={f === proxima ? proximoRef : undefined}
          className={`flex items-center gap-4 px-4 py-2 ${f.tipo === 'pasado' ? 'opacity-50' : ''}`}
        >
          <span className="font-mono text-sm text-text-secondary whitespace-nowrap w-14 shrink-0">{f.hora}</span>

          {f.tipo === 'reserva' && (
            <button
              onClick={() => onReserva(f.reserva)}
              className="flex-1 min-w-0 text-left rounded-lg px-3 py-2 bg-gold/15 border border-gold/25 hover:bg-gold/20 transition-colors"
            >
              <span className="font-medium text-text-primary">Apto. {f.reserva.apartamento}</span>
              <span className="text-xs text-text-secondary ml-2">
                {f.reserva.hora} a {f.reserva.horaFin}
              </span>
              {f.reserva.creadoPor && (
                <span className="text-xs text-text-muted ml-2">· cargó {f.reserva.creadoPor}</span>
              )}
              {f.reserva.comentario && (
                <span className="block text-xs text-text-secondary truncate">{f.reserva.comentario}</span>
              )}
            </button>
          )}

          {f.tipo === 'libre' && (
            <button
              onClick={() => onLibre(f.hora)}
              className="flex-1 text-left rounded-lg px-3 py-1.5 text-sm text-text-muted border border-dashed border-border-subtle hover:border-gold/40 hover:text-gold transition-colors flex items-center gap-2"
            >
              <Plus size={14} /> Libre · Reservar
            </button>
          )}

          {f.tipo === 'no-entra' && (
            <span className="flex-1 text-xs text-text-muted">
              No entra una hora antes de la reserva de las {f.siguiente}
            </span>
          )}

          {f.tipo === 'pasado' && <span className="flex-1 text-sm text-text-muted">—</span>}
        </div>
      ))}
    </div>
  )
}
