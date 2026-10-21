import { Navigate, useLocation } from 'react-router'
import { useSesion } from './contexto'

// Envuelve las rutas que exigen haber iniciado sesión.
// Guarda la dirección pedida para volver a ella tras el login.
export function RequiereSesion({ children }) {
  const { usuario } = useSesion()
  const ubicacion = useLocation()

  if (usuario === undefined) {
    return <p className="cargando-pagina">Cargando…</p>
  }
  if (usuario === null) {
    return <Navigate to="/login" replace state={{ desde: ubicacion }} />
  }
  return children
}