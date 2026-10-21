import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Loader2, Lock, Mail, Building2 } from 'lucide-react'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

// Mismo login que Obras: el email y la contraseña los revisa el Portal (a
// través del backend). Lo normal es entrar desde el Portal, sin pasar por acá.
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
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
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-xl bg-gold/15 border border-gold/25 mx-auto mb-4 flex items-center justify-center">
          <Building2 size={28} className="text-gold" />
        </div>
        <h1 className="font-heading text-2xl text-text-primary font-semibold">Recepción</h1>
        <p className="text-gold text-xs tracking-widest uppercase mt-1">Cocheras e hidromasaje</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="font-heading text-2xl text-text-primary font-light">Bienvenido</h2>
          <p className="text-text-muted text-sm mt-1">Ingresá con tu cuenta del Portal</p>
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
                  required className="input-field pl-9" autoComplete="email"
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
                  required placeholder="••••••••" className="input-field pl-9" autoComplete="current-password"
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
      </div>
    </div>
  )
}
