import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Tiene que coincidir con APP_SLUG del backend
const APP_SLUG = 'recepcion'

// Entrada desde el Portal: llega con ?token=... en la dirección. Se lee el
// usuario de adentro del token y se saca el token de la barra de direcciones.
// (Copiado de Obras.)
function readPortalToken() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (!token) return null
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    window.history.replaceState({}, '', url.toString())
    // sin la app habilitada, el backend lo va a rechazar igual (403)
    if (!payload.apps?.some((a) => a.slug === APP_SLUG)) return null
    return {
      token,
      user: { id: payload.id, name: payload.name, email: payload.email },
    }
  } catch {
    return null
  }
}

const portalAuth = readPortalToken()

export const useAuthStore = create(
  persist(
    (set) => ({
      token: portalAuth?.token ?? null,
      user: portalAuth?.user ?? null,

      setAuth: (token, user) => set({ token, user }),
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      // se guarda en el navegador para no pedir login en cada recarga
      name: 'recepcion-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => () => {
        // un token nuevo del Portal le gana a la sesión guardada (se difiere a
        // un microtask porque useAuthStore todavía no terminó de asignarse)
        if (portalAuth) {
          queueMicrotask(() =>
            useAuthStore.setState({ token: portalAuth.token, user: portalAuth.user }),
          )
        }
      },
    },
  ),
)
