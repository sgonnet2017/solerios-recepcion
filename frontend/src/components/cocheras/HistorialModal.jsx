import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import Modal from '@/components/ui/Modal'
import { fechaCorta, fechaHora } from '@/utils/fechas'

// Todas las asignaciones que tuvo una cochera, la más nueva primero
export default function HistorialModal({ cochera, onClose }) {
  const [asignaciones, setAsignaciones] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get(`/cocheras/${cochera.id}/historial`)
      .then(({ data }) => setAsignaciones(data.asignaciones))
      .catch(() => setError(true))
  }, [cochera.id])

  return (
    <Modal titulo={`Historial de ${cochera.codigo}`} onClose={onClose} ancho="max-w-lg">
      {asignaciones === null && !error && (
        <p className="text-text-muted text-sm flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Cargando...
        </p>
      )}
      {error && <p className="text-status-alert text-sm">No se pudo cargar el historial. Revisá la conexión.</p>}
      {asignaciones?.length === 0 && <p className="text-text-muted text-sm">Nunca se asignó.</p>}

      <ul className="space-y-2">
        {asignaciones?.map((a) => (
          <li key={a.id} className="rounded-lg border border-border-subtle px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-primary">Apto. {a.apartamento}</span>
              {a.liberadaEn ? (
                <span className="text-xs text-text-muted">Liberada el {fechaHora(a.liberadaEn)}</span>
              ) : (
                <span className="badge-ocupada">En uso</span>
              )}
            </div>
            <p className="text-text-muted">
              {fechaCorta(a.desde)} → {a.hasta ? fechaCorta(a.hasta) : 'sin fecha de fin'}
              {a.creadoPor && ` · cargó ${a.creadoPor}`}
            </p>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
