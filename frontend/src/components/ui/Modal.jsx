import { useEffect } from 'react'
import { X } from 'lucide-react'

// Ventana que se abre encima de la pantalla (mismo estilo que los modales de
// Obras). Se cierra con la X, con Escape o tocando afuera.
export default function Modal({ titulo, onClose, children, ancho = 'max-w-md' }) {
  useEffect(() => {
    const alApretar = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', alApretar)
    return () => window.removeEventListener('keydown', alApretar)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`card w-full ${ancho} p-6 max-h-[85vh] overflow-y-auto space-y-4`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-title">{titulo}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
