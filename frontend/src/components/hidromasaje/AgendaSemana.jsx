import { Plus } from 'lucide-react'
import { sumarDias, fechaColumna, hoyUY } from '@/utils/fechas'
import EtiquetaHidromasaje from './EtiquetaHidromasaje'

// Una columna por día (en el celular, uno abajo del otro) con solo las
// reservas hechas, para ver de un vistazo qué días están cargados. Cada una
// dice en qué hidromasaje es (H1 / H2).
// Tocar el día abre su agenda; tocar una reserva la abre para editar.
export default function AgendaSemana({ lunes, hidromasajes, reservas, onDia, onReserva }) {
  const hoy = hoyUY()
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {dias.map((dia) => {
        const delDia = reservas.filter((r) => r.dia === dia)
        return (
          <div key={dia} className={`card p-3 space-y-2 ${dia === hoy ? 'border-gold/50' : ''}`}>
            <button
              onClick={() => onDia(dia)}
              className={`w-full text-left font-heading font-medium capitalize hover:text-gold ${dia === hoy ? 'text-gold' : 'text-text-primary'}`}
            >
              {fechaColumna(dia)}
            </button>
            {delDia.length === 0 && <p className="text-xs text-text-muted">Sin reservas</p>}
            {delDia.map((r) => (
              <button
                key={r.id}
                onClick={() => onReserva(r)}
                className="w-full text-left rounded-md px-2 py-1 text-xs bg-gold/10 border border-gold/25 hover:bg-gold/20 flex items-center gap-1.5"
                title={r.comentario ?? undefined}
              >
                <EtiquetaHidromasaje numero={r.hidromasaje} hidromasajes={hidromasajes} />
                <span className="truncate">
                  <span className="font-mono">{r.hora}</span> · Apto. {r.apartamento}
                </span>
              </button>
            ))}
            {dia >= hoy && (
              <button
                onClick={() => onDia(dia)}
                className="w-full text-xs text-text-muted hover:text-gold flex items-center gap-1"
              >
                <Plus size={12} /> Reservar
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
