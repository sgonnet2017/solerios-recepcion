import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import Modal from '@/components/ui/Modal'
import { hoyUY } from '@/utils/fechas'

// Sirve para las dos cosas que crean una asignación:
//  - modo "asignar": la cochera está libre
//  - modo "reasignar": está ocupada; se cierra la actual y empieza la nueva
// onListo() avisa a la pantalla que recargue la lista.
export default function AsignarModal({ cochera, modo, onClose, onListo }) {
  const hoy = hoyUY()
  const [form, setForm] = useState({ apartamento: '', desde: hoy, hasta: '' })
  const [guardando, setGuardando] = useState(false)

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      await api.post(`/cocheras/${cochera.id}/${modo}`, {
        apartamento: form.apartamento,
        desde: form.desde,
        // vacío = sin fecha de fin
        hasta: form.hasta || null,
      })
      toast.success(`${cochera.codigo} asignada al apto. ${form.apartamento.trim()}`)
      onListo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={modo === 'asignar' ? `Asignar ${cochera.codigo}` : `${cochera.codigo} a otro apartamento`}
      onClose={onClose}
    >
      {modo === 'reasignar' && (
        <p className="text-sm text-text-secondary">
          Se cierra la asignación del apto. {cochera.asignacion.apartamento} y empieza la nueva.
        </p>
      )}
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="label-xs" htmlFor="apartamento">Apartamento</label>
          <input
            id="apartamento" name="apartamento" className="input-field" autoFocus required
            placeholder='Ej. "201" o "Jorge Perez 201"'
            value={form.apartamento} onChange={cambiar} maxLength={100}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-xs" htmlFor="desde">Desde</label>
            {/* no se asigna a futuro */}
            <input
              id="desde" name="desde" type="date" className="input-field" required
              max={hoy} value={form.desde} onChange={cambiar}
            />
          </div>
          <div>
            <label className="label-xs" htmlFor="hasta">Hasta (opcional)</label>
            <input
              id="hasta" name="hasta" type="date" className="input-field"
              min={form.desde > hoy ? form.desde : hoy} value={form.hasta} onChange={cambiar}
            />
          </div>
        </div>
        <p className="text-xs text-text-muted">Sin "hasta", la cochera queda ocupada sin fecha de fin.</p>
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
