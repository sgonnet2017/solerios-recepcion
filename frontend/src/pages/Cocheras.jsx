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

const FILTROS = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'libre', etiqueta: 'Libres' },
  { valor: 'ocupada', etiqueta: 'Ocupadas' },
  { valor: 'vencida', etiqueta: 'Vencidas' },
]

export default function Cocheras() {
  const [cocheras, setCocheras] = useState(null) // null = cargando
  const [errorCarga, setErrorCarga] = useState(false)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  // la ventana abierta: { tipo: 'asignar' | 'extender' | ..., cochera }
  const [abierto, setAbierto] = useState(null)

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
        c.asignacion?.apartamento.toLowerCase().includes(texto)),
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((c) => (
            <CocheraCard key={c.id} cochera={c} onAccion={(tipo) => setAbierto({ tipo, cochera: c })} />
          ))}
        </div>
      )}

      {(abierto?.tipo === 'asignar' || abierto?.tipo === 'reasignar') && (
        <AsignarModal
          cochera={abierto.cochera}
          modo={abierto.tipo}
          onClose={() => setAbierto(null)}
          onListo={alTerminar}
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
    </div>
  )
}
