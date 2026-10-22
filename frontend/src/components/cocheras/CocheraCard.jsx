import { AlertTriangle, CalendarClock, History, X } from 'lucide-react'
import EstadoBadge from '@/components/ui/EstadoBadge'
import { fechaCorta } from '@/utils/fechas'

// La tarjeta de una cochera. No hace pedidos: avisa qué botón se tocó con
// onAccion('asignar' | 'reservar' | 'extender' | 'liberar' | 'reasignar' |
// 'historial') u onAccion('cancelar-reserva', reserva), y la pantalla decide
// qué ventana abrir.
export default function CocheraCard({ cochera, onAccion }) {
  const { codigo, estado, asignacion, proximas = [] } = cochera
  const vencida = estado === 'vencida'

  return (
    <div className={`card p-4 flex flex-col gap-3 ${vencida ? 'border-orange-500/50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-heading text-xl font-semibold text-text-primary">{codigo}</span>
        <EstadoBadge estado={estado} />
      </div>

      {asignacion ? (
        <div className="text-sm space-y-0.5">
          <p className="text-text-primary font-medium">Apto. {asignacion.apartamento}</p>
          <p className="text-text-muted">
            Desde {fechaCorta(asignacion.desde)}
            {' · '}
            {asignacion.hasta ? `hasta ${fechaCorta(asignacion.hasta)}` : 'sin fecha de fin'}
          </p>
        </div>
      ) : (
        <p className="text-sm text-text-muted">Sin asignar</p>
      )}

      {vencida && (
        <p className="text-sm rounded-lg px-3 py-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          El período terminó, ¿sigue ocupada?
        </p>
      )}

      {/* reservas a futuro: hasta ese día la cochera sigue como está */}
      {proximas.length > 0 && (
        <div className="space-y-1">
          {proximas.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-sky-500/10 text-sky-700 dark:text-sky-300"
            >
              <CalendarClock size={15} className="shrink-0" />
              {/* sin recortar: si no entra, baja de renglón (las fechas son lo importante) */}
              <span className="flex-1 min-w-0">
                Reservada: Apto. {r.apartamento} · {fechaCorta(r.desde).slice(0, 5)} → {fechaCorta(r.hasta).slice(0, 5)}
              </span>
              <button
                onClick={() => onAccion('cancelar-reserva', r)}
                className="shrink-0 rounded p-0.5 hover:bg-sky-500/20"
                title="Cancelar reserva"
                aria-label={`Cancelar la reserva del apto. ${r.apartamento}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-auto pt-1">
        {estado === 'libre' ? (
          <button className="btn-primary" onClick={() => onAccion('asignar')}>
            Asignar
          </button>
        ) : (
          <>
            <button className="btn-secondary" onClick={() => onAccion('extender')}>
              Extender
            </button>
            <button className="btn-secondary" onClick={() => onAccion('liberar')}>
              Liberar
            </button>
            <button className="btn-secondary" onClick={() => onAccion('reasignar')}>
              Otro apto.
            </button>
            <button className="btn-secondary" onClick={() => onAccion('reservar')}>
              Reservar
            </button>
          </>
        )}
        <button
          className="btn-ghost ml-auto"
          onClick={() => onAccion('historial')}
          title="Historial"
          aria-label={`Historial de ${codigo}`}
        >
          <History size={16} />
        </button>
      </div>
    </div>
  )
}
