import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'

// "¿Seguro que querés...?" antes de una acción que no se deshace.
// onConfirmar tiene que devolver la promesa del pedido, así el botón muestra
// que está trabajando y no se puede tocar dos veces.
export default function ConfirmarDialog({ titulo, mensaje, textoConfirmar, onConfirmar, onClose }) {
  const [trabajando, setTrabajando] = useState(false)

  async function confirmar() {
    setTrabajando(true)
    try {
      await onConfirmar()
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <Modal titulo={titulo} onClose={onClose}>
      <p className="text-text-secondary text-sm">{mensaje}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={trabajando}>
          Volver
        </button>
        <button className="btn-danger flex items-center gap-2" onClick={confirmar} disabled={trabajando}>
          {trabajando && <Loader2 size={14} className="animate-spin" />}
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  )
}
