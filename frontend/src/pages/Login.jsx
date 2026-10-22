import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Loader2, Lock, Mail } from 'lucide-react'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import ZulamianLogo from '@/assets/Logo.png'

// Copia del login de Obras (mismo diseño), con el nombre de esta app. El email
// y la contraseña los revisa el Portal, a través del backend.
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.token, data.user)
      // si te mandaron a loguearte desde otra pantalla, volvés a esa
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col items-center justify-center px-12 bg-bg-secondary border-r border-border-subtle relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center space-y-8 max-w-xs w-full">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-2xl bg-white/90 p-3 shadow-lg flex items-center justify-center">
              <img src={ZulamianLogo} alt="Zulamian" className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gold/20" />
              <span className="text-gold tracking-[0.3em] uppercase text-[10px] font-medium">Sistema</span>
              <div className="flex-1 h-px bg-gold/20" />
            </div>
            <h1 className="font-heading text-4xl font-light text-text-primary tracking-tight">
              Solerios
            </h1>
            <p className="text-text-muted text-sm mt-3 leading-relaxed">
              Recepción
            </p>
          </div>
        </div>

        <p className="absolute bottom-6 text-xs text-text-muted">
          © {new Date().getFullYear()} Zulamian Desarrollos Inmobiliarios
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden text-center mb-10">
          <div className="w-16 h-16 rounded-xl bg-white/90 p-2 mx-auto mb-4 flex items-center justify-center">
            <img src={ZulamianLogo} alt="Zulamian" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-heading text-2xl text-text-primary font-semibold">Solerios</h1>
          <p className="text-gold text-xs tracking-widest uppercase mt-1">Recepción</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-heading text-2xl text-text-primary font-light">Bienvenido</h2>
            <p className="text-text-muted text-sm mt-1">Ingresá tu cuenta para continuar</p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    required placeholder="usuario@zulamian.com"
                    className="input-field pl-9" autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password" name="password" value={form.password} onChange={handleChange}
                    required placeholder="••••••••"
                    className="input-field pl-9" autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
              </button>

              <a
                href={`${import.meta.env.VITE_PORTAL_URL || 'http://localhost:5174'}/recuperar?appSlug=recepcion`}
                className="block text-center text-text-muted hover:text-gold text-xs transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </form>
          </div>

          <p className="lg:hidden text-center text-text-muted text-xs mt-6">
            © {new Date().getFullYear()} Zulamian Desarrollos Inmobiliarios
          </p>
        </div>
      </div>
    </div>
  )
}
