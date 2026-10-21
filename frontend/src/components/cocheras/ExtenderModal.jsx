import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import Modal from '@/components/ui/Modal'
import { hoyUY, fechaCorta } from '@/utils/fechas'

// Cambia el "hasta" de la asignación en uso. Vacío = sin fecha de fin.
export default function ExtenderModal({ cochera, onClose, onListo }) {
  const hoy = hoyUY()
  const { asignacion } = cochera
  // si ya venció, se propone vacío en vez de la fecha vieja (que no se acepta)
  const [hasta, setHasta] = useState(asignacion.hasta && asignacion.hasta >= hoy ? asignacion.hasta : '')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      await api.post(`/cocheras/${cochera.id}/extender`, { hasta: hasta || null })
      toast.success(hasta ? `${cochera.codigo} hasta el ${fechaCorta(hasta)}` : `${cochera.codigo} sin fecha de fin`)
      onListo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Extender ${cochera.codigo}`} onClose={onClose}>
      <p className="text-sm text-text-secondary">
        Apto. {asignacion.apartamento}, desde el {fechaCorta(asignacion.desde)}.
      </p>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="label-xs" htmlFor="hasta">Nuevo hasta</label>
          <input
            id="hasta" type="date" className="input-field" autoFocus
            min={asignacion.desde > hoy ? asignacion.desde : hoy}
            value={hasta} onChange={(e) => setHasta(e.target.value)}
          />
          <p className="text-xs text-text-muted mt-1">Dejalo vacío para que no tenga fecha de fin.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
            {guardando && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}
