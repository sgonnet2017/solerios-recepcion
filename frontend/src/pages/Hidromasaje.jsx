import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/services/api'
import { PageSpinner } from '@/components/ui/Spinner'
import ErrorCarga from '@/components/ui/ErrorCarga'
import AgendaDia from '@/components/hidromasaje/AgendaDia'
import AgendaSemana from '@/components/hidromasaje/AgendaSemana'
import ReservaModal from '@/components/hidromasaje/ReservaModal'
import ProximasReservas from '@/components/hidromasaje/ProximasReservas'
import { hoyUY, sumarDias, lunesDe, fechaLarga, fechaCorta, fechaColumna } from '@/utils/fechas'

const VISTAS = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'proximas', etiqueta: 'Próximas' },
]

export default function Hidromasaje() {
  const [vista, setVista] = useState('dia') // 'dia' | 'semana' | 'proximas'
  const [dia, setDia] = useState(hoyUY())
  const [config, setConfig] = useState(null)
  const [reservas, setReservas] = useState(null) // null = cargando
  const [errorCarga, setErrorCarga] = useState(false)
  // sube en 1 para volver a pedir las reservas (después de guardar)
  const [version, setVersion] = useState(0)
  const [abierto, setAbierto] = useState(null) // lo que recibe ReservaModal

  // En la compu, un clic en un campo de fecha no siempre abre el calendario:
  // showPicker() lo abre. En el celular el toque ya lo abre solo; si
  // showPicker no existe o el navegador no lo deja, no pasa nada.
  function abrirCalendario(e) {
    try {
      e.currentTarget.showPicker()
    } catch {
      // el navegador abre su calendario por su cuenta
    }
  }

  const lunes = lunesDe(dia)
  // la agenda del día también pide el anterior: una reserva de las 23:30
  // ocupa la primera media hora de este día
  const desde = vista === 'dia' ? sumarDias(dia, -1) : lunes
  const hasta = vista === 'dia' ? dia : sumarDias(lunes, 6)
  // qué hay que pedir: las próximas, o las de un día/semana
  const pedido = vista === 'proximas' ? 'proximas' : `${desde}|${hasta}`

  useEffect(() => {
    // si el usuario cambia de día antes de que llegue la respuesta, la
    // respuesta vieja se descarta (no pisa la del día nuevo)
    let vigente = true
    setReservas(null)
    Promise.all([
      config ? Promise.resolve({ data: config }) : api.get('/reservas/config'),
      pedido === 'proximas'
        ? api.get('/reservas/proximas')
        : api.get('/reservas', { params: { desde, hasta } }),
    ])
      .then(([cfg, res]) => {
        if (!vigente) return
        setConfig(cfg.data)
        setReservas(res.data)
        setErrorCarga(false)
      })
      .catch(() => vigente && setErrorCarga(true))
    return () => {
      vigente = false
    }
    // config se pide una sola vez; no hace falta volver a correr si cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido, version])

  const recargar = () => setVersion((v) => v + 1)
  const mover = (n) => setDia((d) => sumarDias(d, vista === 'dia' ? n : 7 * n))

  function alTerminar() {
    setAbierto(null)
    recargar()
  }

  // desde la semana o las próximas: abrir la agenda de ese día
  function irAlDia(d) {
    setDia(d)
    setVista('dia')
  }

  const hoy = hoyUY()
  // "estás en hoy": el día de hoy, o la semana que lo contiene
  const enHoy = vista === 'dia' ? dia === hoy : lunes === lunesDe(hoy)
  const titulo =
    vista === 'dia'
      ? fechaLarga(dia) + (dia === hoy ? ' · hoy' : '')
      : vista === 'semana'
        ? `Semana del ${fechaCorta(lunes)} al ${fechaCorta(sumarDias(lunes, 6))}`
        : 'Todas las reservas de acá en adelante'
  // lo que se ve entre las flechas: el día o la semana que se está mirando
  const etiqueta =
    vista === 'dia' ? fechaColumna(dia) : `${fechaCorta(lunes).slice(0, 5)} – ${fechaCorta(sumarDias(lunes, 6)).slice(0, 5)}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <h1 className="page-title">Hidromasaje</h1>
          <p className="text-text-muted text-sm mt-1">{titulo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <div className="flex rounded-lg border border-border-subtle overflow-hidden">
            {VISTAS.map(({ valor, etiqueta: texto }) => (
              <button
                key={valor}
                onClick={() => setVista(valor)}
                className={`px-3 py-1.5 text-sm ${vista === valor ? 'bg-gold text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
              >
                {texto}
              </button>
            ))}
          </div>
          {/* en "Próximas" no hay día elegido: sin flechas ni calendario */}
          {vista !== 'proximas' && (
          <div className="flex items-center gap-1">
            <button className="btn-secondary px-2" onClick={() => mover(-1)} aria-label="Anterior">
              <ChevronLeft size={16} />
            </button>
            {/* Tocar la fecha abre un calendario para saltar a cualquier día.
                Lo que se ve es la etiqueta; encima hay un campo de fecha
                transparente que recibe el toque. Tiene que ser un toque
                directo sobre el campo: muchos celulares (sobre todo iPhone)
                no abren el calendario si se lo pide otro botón. */}
            <div className="relative overflow-hidden btn-ghost min-w-[6.5rem] flex items-center justify-center gap-1.5 font-medium text-text-primary capitalize">
              <CalendarDays size={15} className="text-gold" />
              {etiqueta}
              <input
                type="date"
                aria-label="Elegir una fecha"
                title="Elegir una fecha"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={dia}
                onClick={abrirCalendario}
                onChange={(e) => e.target.value && setDia(e.target.value)}
              />
            </div>
            <button className="btn-secondary px-2" onClick={() => mover(1)} aria-label="Siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
          )}
          {vista !== 'proximas' && !enHoy && (
            <button className="btn-secondary" onClick={() => setDia(hoy)}>
              Volver a hoy
            </button>
          )}
        </div>
      </div>

      {errorCarga ? (
        <ErrorCarga mensaje="No se pudieron cargar las reservas." onReintentar={async () => recargar()} />
      ) : !reservas || !config ? (
        <PageSpinner />
      ) : vista === 'dia' ? (
        <AgendaDia
          dia={dia}
          config={config}
          reservas={reservas}
          onLibre={(hora, hidromasaje) => setAbierto({ modo: 'crear', dia, hora, hidromasaje })}
          onReserva={(reserva) => setAbierto({ modo: 'editar', reserva })}
        />
      ) : vista === 'semana' ? (
        <AgendaSemana
          lunes={lunes}
          hidromasajes={config.hidromasajes}
          reservas={reservas}
          onDia={irAlDia}
          onReserva={(reserva) => setAbierto({ modo: 'editar', reserva })}
        />
      ) : (
        <ProximasReservas
          hidromasajes={config.hidromasajes}
          reservas={reservas}
          onDia={irAlDia}
          onReserva={(reserva) => setAbierto({ modo: 'editar', reserva })}
        />
      )}

      {abierto && config && (
        <ReservaModal config={config} inicial={abierto} onClose={() => setAbierto(null)} onListo={alTerminar} />
      )}
    </div>
  )
}
