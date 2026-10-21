import { useLocation, useNavigate } from 'react-router'

// Vuelve a la página anterior (conservando la búsqueda que había) o, si se
// llegó directamente a la ficha (enlace o favorito), al listado.
export function Volver({ a, texto }) {
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const hayHistorial = ubicacion.key !== 'default'
  return (
    <button type="button" className="volver" onClick={() => (hayHistorial ? navegar(-1) : navegar(a))}>
      ‹ {texto}
    </button>
  )
}