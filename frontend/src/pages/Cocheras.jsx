import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Search } from 'lucide-react'
import api from '@/services/api'
import { PageSpinner } from '@/components/ui/Spinner'
import ErrorCarga from '@/components/ui/ErrorCarga'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import CocheraCard from '@/components/cocheras/CocheraCard'
import AsignarModal from '@/components/cocheras/AsignarModal'
import ExtenderModal from '@/components/cocheras/ExtenderModal'
import HistorialModal from '@/components/cocheras/HistorialModal'
import CalendarioCocheras from '@/components/cocheras/CalendarioCocheras'
import BarraModal from '@/components/cocheras/BarraModal'
import { fechaCorta } from '@/utils/fechas'

const FILTROS = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'libre', etiqueta: 'Libres' },
  { valor: 'ocupada', etiqueta: 'Ocupadas' },
  { valor: 'vencida', etiqueta: 'Vencidas' },
]

const VISTAS = [
  { valor: 'tarjetas', etiqueta: 'Tarjetas' },
  { valor: 'calendario', etiqueta: 'Calendario' },
]

// la vista elegida se recuerda en el navegador (si no se puede, tarjetas)
function vistaGuardada() {
  try {
    return localStorage.getItem('recepcion-vista-cocheras') === 'calendario' ? 'calendario' : 'tarjetas'
  } catch {
    return 'tarjetas'
  }
}

export default function Cocheras() {
  const [cocheras, setCocheras] = useState(null) // null = cargando
  const [errorCarga, setErrorCarga] = useState(false)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState(vistaGuardada)
  // sube en 1 después de guardar algo, para que el calendario se recargue
  const [version, setVersion] = useState(0)
  // la ventana abierta: { tipo: 'asignar' | 'extender' | 'barra' | ..., cochera, reserva?, barra?, inicial? }
  const [abierto, setAbierto] = useState(null)

  function elegirVista(v) {
    setVista(v)
    try {
      localStorage.setItem('recepcion-vista-cocheras', v)
    } catch {
      // sin almacenamiento: se elige de nuevo la próxima vez
    }
  }

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/cocheras')
      setCocheras(data)
      setErrorCarga(false)
    } catch {
      setErrorCarga(true)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // después de guardar algo: cerrar la ventana y traer la lista actualizada
  function alTerminar() {
    setAbierto(null)
    cargar()
    setVersion((v) => v + 1)
  }

  async function liberar(cochera) {
    try {
      await api.post(`/cocheras/${cochera.id}/liberar`)
      toast.success(`${cochera.codigo} liberada`)
      alTerminar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo liberar')
    }
  }

  async function cancelarReserva(cochera, reserva) {
    try {
      await api.post(`/cocheras/${cochera.id}/reservas/${reserva.id}/cancelar`)
      toast.success(`Reserva de ${cochera.codigo} cancelada`)
      alTerminar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cancelar')
    }
  }

  if (errorCarga && !cocheras)
    return <ErrorCarga mensaje="No se pudieron cargar las cocheras." onReintentar={cargar} />
  if (!cocheras) return <PageSpinner />

  const cuenta = (estado) => cocheras.filter((c) => c.estado === estado).length
  const texto = busqueda.trim().toLowerCase()
  const visibles = cocheras.filter(
    (c) =>
      (filtro === 'todas' || c.estado === filtro) &&
      (!texto ||
        c.codigo.toLowerCase().includes(texto) ||
        c.asignacion?.apartamento.toLowerCase().includes(texto) ||
        c.proximas?.some((r) => r.apartamento.toLowerCase().includes(texto))),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Cocheras</h1>
        <p className="text-text-muted text-sm mt-1">
          {cuenta('libre')} libres · {cuenta('ocupada')} ocupadas
          {cuenta('vencida') > 0 && (
            <span className="text-orange-600 dark:text-orange-400 font-medium"> · {cuenta('vencida')} vencidas</span>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex shrink-0 rounded-lg border border-border-subtle overflow-hidden self-start">
          {VISTAS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              onClick={() => elegirVista(valor)}
              className={`px-3 py-1.5 text-sm ${vista === valor ? 'bg-gold text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(({ valor, etiqueta }) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={filtro === valor ? 'sidebar-item-active py-1.5' : 'sidebar-item py-1.5 border border-border-subtle'}
            >
              {etiqueta}
              {valor !== 'todas' && <span className="opacity-70">{cuenta(valor)}</span>}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input-field pl-9"
            placeholder="Buscar cochera o apto."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="text-text-muted text-sm">Ninguna cochera coincide.</p>
      ) : vista === 'calendario' ? (
        // mismos filtros y búsqueda: el calendario muestra solo esas cocheras
        <CalendarioCocheras
          idsVisibles={new Set(visibles.map((c) => c.id))}
          version={version}
          onBarra={(cochera, barra) => setAbierto({ tipo: 'barra', cochera, barra })}
          onAsignar={(cochera, desde, hasta) =>
            setAbierto({ tipo: 'asignar', cochera, inicial: { desde, hasta } })
          }
        />
      ) : (
        // grid-cols-1: en el celular, una columna del ancho exacto de la
        // pantalla (sin eso, una línea larga como "Reservada: ..." la estira)
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((c) => (
            <CocheraCard
              key={c.id}
              cochera={c}
              onAccion={(tipo, reserva) => setAbierto({ tipo, cochera: c, reserva })}
            />
          ))}
        </div>
      )}

      {['asignar', 'reservar', 'reasignar'].includes(abierto?.tipo) && (
        <AsignarModal
          cochera={abierto.cochera}
          modo={abierto.tipo}
          inicial={abierto.inicial}
          onClose={() => setAbierto(null)}
          onListo={alTerminar}
        />
      )}
      {abierto?.tipo === 'barra' && (
        <BarraModal
          cochera={abierto.cochera}
          barra={abierto.barra}
          onAccion={(tipo, reserva) => setAbierto({ tipo, cochera: abierto.cochera, reserva })}
          onClose={() => setAbierto(null)}
        />
      )}
      {abierto?.tipo === 'extender' && (
        <ExtenderModal cochera={abierto.cochera} onClose={() => setAbierto(null)} onListo={alTerminar} />
      )}
      {abierto?.tipo === 'historial' && (
        <HistorialModal cochera={abierto.cochera} onClose={() => setAbierto(null)} />
      )}
      {abierto?.tipo === 'liberar' && (
        <ConfirmarDialog
          titulo={`Liberar ${abierto.cochera.codigo}`}
          mensaje={`La cochera deja de estar asignada al apto. ${abierto.cochera.asignacion.apartamento}. Queda en el historial.`}
          textoConfirmar="Liberar"
          onConfirmar={() => liberar(abierto.cochera)}
          onClose={() => setAbierto(null)}
        />
      )}
      {abierto?.tipo === 'cancelar-reserva' && (
        <ConfirmarDialog
          titulo={`Cancelar reserva de ${abierto.cochera.codigo}`}
          mensaje={`Se cancela la reserva del apto. ${abierto.reserva.apartamento} (${fechaCorta(abierto.reserva.desde)} al ${fechaCorta(abierto.reserva.hasta)}). Queda en el historial.`}
          textoConfirmar="Cancelar reserva"
          onConfirmar={() => cancelarReserva(abierto.cochera, abierto.reserva)}
          onClose={() => setAbierto(null)}
        />
      )}
    </div>
  )
}
