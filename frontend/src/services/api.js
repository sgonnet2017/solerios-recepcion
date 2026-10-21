import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// Copiado de Obras. En tu compu VITE_API_URL queda vacío y se usa el desvío
// de Vite (/api → backend); publicado, apunta a la dirección del backend.
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  timeout: 10000,
})

// Cada pedido sale con el token de la sesión
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

// Si el backend contesta 401 (token vencido), pide uno nuevo con /auth/refresh
// y repite el pedido. Si varios pedidos fallan juntos, esperan en una fila al
// mismo refresh en vez de pedir uno cada uno.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
        useAuthStore.getState().setToken(data.token)
        processQueue(null, data.token)
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // solo cerrar la sesión si el servidor la rechazó; un corte de red no
        // significa que la sesión esté mal
        if (refreshError.response) {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
