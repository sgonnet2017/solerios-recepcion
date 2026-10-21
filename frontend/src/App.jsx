import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Cocheras from '@/pages/Cocheras'
import Hidromasaje from '@/pages/Hidromasaje'

// Sin sesión → al login (recordando a qué pantalla se quería entrar)
function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  return token ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#161616',
            color: '#F5F0E8',
            border: '1px solid #2A2A2A',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#4CAF82', secondary: '#161616' } },
          error: { iconTheme: { primary: '#E85555', secondary: '#161616' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/cocheras" replace />} />
            <Route path="cocheras" element={<Cocheras />} />
            <Route path="hidromasaje" element={<Hidromasaje />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
