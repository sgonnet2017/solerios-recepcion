import Modal from '@/components/ui/Modal'
import { fechaCorta } from '@/utils/fechas'

const DESCRIPCION = {
  ocupada: 'En uso',
  reserva: 'Reserva a futuro',
  vencida: 'Venció sin liberar: ¿sigue ocupada?',
  liberada: 'Ya liberada',
}

// Lo que se abre al tocar una barra del calendario: sus datos y los mismos
// botones que tiene la tarjeta. No hace pedidos: avisa con onAccion(tipo,
// reserva?) y la pantalla abre la ventana que corresponde (igual que la tarjeta).
export default function BarraModal({ cochera, barra, onAccion, onClose }) {
  const esActual = cochera.asignacion?.id === barra.id
  const reserva = cochera.proximas.find((r) => r.id === barra.id)

  return (
    <Modal titulo={`${cochera.codigo} · Apto. ${barra.apartamento}`} onClose={onClose}>
      <div className="text-sm space-y-1">
        <p className="text-text-primary">
          {fechaCorta(barra.desdeReal)} → {barra.hastaReal ? fechaCorta(barra.hastaReal) : 'sin fecha de fin'}
        </p>
        <p className="text-text-muted">
          {DESCRIPCION[barra.tipo]}
          {barra.creadoPor && ` · cargó ${barra.creadoPor}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {esActual && (
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
        {reserva && (
          <button className="btn-secondary text-status-alert" onClick={() => onAccion('cancelar-reserva', reserva)}>
            Cancelar reserva
          </button>
        )}
        <button className="btn-ghost ml-auto" onClick={() => onAccion('historial')}>
          Historial
        </button>
      </div>
    </Modal>
  )
}
