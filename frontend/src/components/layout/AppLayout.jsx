import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Building2 } from 'lucide-react'
import Sidebar from './Sidebar'

// El marco de todas las pantallas (una vez logueado): menú a la izquierda y
// la pantalla elegida en <Outlet />. Igual que Obras.
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tema, setTema] = useState(() => {
    const saved = localStorage.getItem('recepcion-tema')
    if (saved) return saved
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
    localStorage.setItem('recepcion-tema', tema)
  }, [tema])

  return (
    <div className="flex min-h-screen bg-bg-primary">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tema={tema}
        onToggleTema={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen overflow-x-hidden">
        {/* barra de arriba, solo en el celular */}
        <header className="lg:hidden sticky top-0 z-20 bg-bg-secondary border-b border-border-subtle px-4 flex items-center gap-3 shrink-0 pt-[env(safe-area-inset-top)] h-[calc(3.5rem+env(safe-area-inset-top))]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 -ml-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-gold" />
            <span className="font-heading text-sm font-semibold text-text-primary tracking-wide">
              Recepción
            </span>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
