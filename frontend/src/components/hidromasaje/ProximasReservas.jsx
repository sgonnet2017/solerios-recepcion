import { ChevronRight } from 'lucide-react'
import { fechaLarga, hoyUY, sumarDias } from '@/utils/fechas'
import EtiquetaHidromasaje from './EtiquetaHidromasaje'

// Todas las reservas de ahora en adelante, agrupadas por día, cada una con
// su hidromasaje (H1 / H2).
// Tocar el día abre su agenda; tocar una reserva la abre para editar.
export default function ProximasReservas({ hidromasajes, reservas, onDia, onReserva }) {
  if (reservas.length === 0) {
    return <p className="text-text-muted text-sm">No hay reservas de acá en adelante.</p>
  }

  const hoy = hoyUY()
  const manana = sumarDias(hoy, 1)
  // { "2026-10-20": [reserva, ...], ... } — ya vienen ordenadas por hora
  const porDia = Object.groupBy
    ? Object.groupBy(reservas, (r) => r.dia)
    : reservas.reduce((g, r) => ({ ...g, [r.dia]: [...(g[r.dia] ?? []), r] }), {})

  return (
    <div className="space-y-4">
      {Object.entries(porDia).map(([dia, delDia]) => (
        <div key={dia} className="card overflow-hidden">
          <button
            onClick={() => onDia(dia)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border-subtle hover:text-gold text-left"
          >
            <span className="font-heading font-medium">
              {fechaLarga(dia)}
              {dia === hoy && <span className="text-gold"> · hoy</span>}
              {dia === manana && <span className="text-text-muted"> · mañana</span>}
            </span>
            <span className="flex items-center gap-1 text-xs text-text-muted">
              {delDia.length} {delDia.length === 1 ? 'reserva' : 'reservas'}
              <ChevronRight size={14} />
            </span>
          </button>
          <ul className="divide-y divide-border-subtle">
            {delDia.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onReserva(r)}
                  className="w-full flex items-start gap-4 px-4 py-2 text-left hover:bg-bg-hover"
                >
                  <span className="font-mono text-sm text-text-secondary whitespace-nowrap pt-0.5">
                    {r.hora}
                    <span className="hidden sm:inline"> – {r.horaFin}</span>
                  </span>
                  <span className="min-w-0">
                    <EtiquetaHidromasaje numero={r.hidromasaje} hidromasajes={hidromasajes} />{' '}
                    <span className="font-medium text-text-primary">Apto. {r.apartamento}</span>
                    {r.creadoPor && <span className="text-xs text-text-muted ml-2">cargó {r.creadoPor}</span>}
                    {r.comentario && (
                      <span className="block text-xs text-text-secondary truncate">{r.comentario}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
