import { AlertTriangle, History } from 'lucide-react'
import EstadoBadge from '@/components/ui/EstadoBadge'
import { fechaCorta } from '@/utils/fechas'

// La tarjeta de una cochera. No hace pedidos: avisa qué botón se tocó con
// onAccion('asignar' | 'extender' | 'liberar' | 'reasignar' | 'historial')
// y la pantalla decide qué ventana abrir.
export default function CocheraCard({ cochera, onAccion }) {
  const { codigo, estado, asignacion } = cochera
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
