import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import Modal from '@/components/ui/Modal'
import { hoyUY, sumarDias, fechaCorta } from '@/utils/fechas'

// Sirve para todo lo que crea una asignación:
//  - modo "asignar": la cochera está libre (desde hoy, o a futuro = reserva)
//  - modo "reservar": está ocupada y se carga una reserva para más adelante
//  - modo "reasignar": está ocupada; se cierra la actual y empieza la nueva
// Si el "desde" es posterior a hoy, es una reserva y necesita "hasta".
// onListo() avisa a la pantalla que recargue la lista.
const TITULO = {
  asignar: (c) => `Asignar ${c}`,
  reservar: (c) => `Reservar ${c}`,
  reasignar: (c) => `${c} a otro apartamento`,
}

export default function AsignarModal({ cochera, modo, onClose, onListo }) {
  const hoy = hoyUY()
  const [form, setForm] = useState({
    apartamento: '',
    desde: modo === 'reservar' ? sumarDias(hoy, 1) : hoy,
    hasta: '',
  })
  const [guardando, setGuardando] = useState(false)
  const aFuturo = form.desde > hoy

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      // reservar usa el mismo pedido que asignar: el backend se da cuenta por la fecha
      await api.post(`/cocheras/${cochera.id}/${modo === 'reasignar' ? 'reasignar' : 'asignar'}`, {
        apartamento: form.apartamento,
        desde: form.desde,
        // vacío = sin fecha de fin
        hasta: form.hasta || null,
      })
      const apto = form.apartamento.trim()
      toast.success(
        aFuturo
          ? `${cochera.codigo} reservada del ${fechaCorta(form.desde)} al ${fechaCorta(form.hasta)} para el apto. ${apto}`
          : `${cochera.codigo} asignada al apto. ${apto}`,
      )
      onListo()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={TITULO[modo](cochera.codigo)} onClose={onClose}>
      {modo === 'reasignar' && (
        <p className="text-sm text-text-secondary">
          Se cierra la asignación del apto. {cochera.asignacion.apartamento} y empieza la nueva.
        </p>
      )}
      {modo === 'reservar' && (
        <p className="text-sm text-text-secondary">
          Hoy la usa el apto. {cochera.asignacion.apartamento}. La reserva no puede pisarse con eso.
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
            {/* pasar a otro apto. empieza ya: no se elige una fecha futura */}
            <input
              id="desde" name="desde" type="date" className="input-field" required
              max={modo === 'reasignar' ? hoy : undefined}
              min={modo === 'reservar' ? sumarDias(hoy, 1) : undefined}
              value={form.desde} onChange={cambiar}
            />
          </div>
          <div>
            <label className="label-xs" htmlFor="hasta">{aFuturo ? 'Hasta' : 'Hasta (opcional)'}</label>
            <input
              id="hasta" name="hasta" type="date" className="input-field" required={aFuturo}
              min={form.desde > hoy ? form.desde : hoy} value={form.hasta} onChange={cambiar}
            />
          </div>
        </div>
        <p className="text-xs text-text-muted">
          {aFuturo
            ? 'Empieza después de hoy: queda como reserva, y hasta ese día la cochera sigue libre.'
            : 'Sin "hasta", la cochera queda ocupada sin fecha de fin.'}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
            {guardando && <Loader2 size={14} className="animate-spin" />}
            {aFuturo ? 'Reservar' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
