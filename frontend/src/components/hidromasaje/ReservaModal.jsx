import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import Modal from '@/components/ui/Modal'
import { fechaLarga, aMinutos, aHora } from '@/utils/fechas'

// Crear, editar o cancelar una reserva.
//  - inicial = { modo: 'crear', dia, hora }: el turno libre que se tocó
//  - inicial = { modo: 'editar', reserva }: una reserva existente
// Una reserva hecha no cambia de día ni de hora: solo el apartamento y el
// comentario (para otro turno, se cancela y se reserva de nuevo).
export default function ReservaModal({ config, inicial, onClose, onListo }) {
  const editando = inicial.modo === 'editar'
  const original = editando ? inicial.reserva : null
  const dia = original?.dia ?? inicial.dia
  const hora = original?.hora ?? inicial.hora
  const horaFin = original?.horaFin ?? aHora(aMinutos(hora) + config.duracionMin)
  const [form, setForm] = useState({
    apartamento: original?.apartamento ?? '',
    comentario: original?.comentario ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (editando) {
        // solo se manda lo que cambió
        const cambios = {}
        if (form.apartamento.trim() !== original.apartamento) cambios.apartamento = form.apartamento
        if (form.comentario.trim() !== (original.comentario ?? '')) cambios.comentario = form.comentario
        if (Object.keys(cambios).length === 0) return onClose()
        await api.patch(`/reservas/${original.id}`, cambios)
        toast.success('Reserva actualizada')
      } else {
        await api.post('/reservas', { ...form, dia, hora })
        toast.success(`Reservado ${hora} para el apto. ${form.apartamento.trim()}`)
      }
      onListo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar')
      // otro tomó el turno justo antes: se recarga la agenda para que se vea
      if (err.response?.status === 409) onListo()
    } finally {
      setGuardando(false)
    }
  }

  async function cancelarReserva() {
    setGuardando(true)
    try {
      await api.post(`/reservas/${original.id}/cancelar`)
      toast.success('Reserva cancelada')
      onListo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cancelar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={editando ? 'Reserva del hidromasaje' : 'Reservar hidromasaje'} onClose={onClose}>
      <p className="text-sm text-text-secondary">
        {fechaLarga(dia)} · {hora} a {horaFin}
      </p>

      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="label-xs" htmlFor="apartamento">Apartamento</label>
          <input
            id="apartamento" name="apartamento" className="input-field" required autoFocus
            maxLength={100} value={form.apartamento} onChange={cambiar}
          />
        </div>
        <div>
          <label className="label-xs" htmlFor="comentario">Comentario (opcional)</label>
          <textarea
            id="comentario" name="comentario" className="input-field" rows={2}
            maxLength={500} value={form.comentario} onChange={cambiar}
          />
        </div>

        {confirmandoCancelar ? (
          <div className="rounded-lg border border-status-alert/40 bg-status-alert/10 p-3 space-y-3">
            <p className="text-sm text-text-primary">
              ¿Cancelar la reserva del apto. {original.apartamento}? El turno queda libre.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirmandoCancelar(false)}>
                No
              </button>
              <button type="button" className="btn-danger" onClick={cancelarReserva} disabled={guardando}>
                Sí, cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {editando && (
              <button
                type="button" className="btn-ghost text-status-alert mr-auto"
                onClick={() => setConfirmandoCancelar(true)}
              >
                Cancelar reserva
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
              {guardando && <Loader2 size={14} className="animate-spin" />}
              {editando ? 'Guardar' : 'Reservar'}
            </button>
          </div>
        )}
      </form>
    </Modal>
  )
}
