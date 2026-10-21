import { NavLink, Outlet, useNavigate } from 'react-router'
import { useSesion } from '../sesion/contexto'

// Cabecera con las dos pestañas y la sesión; el contenido va en <Outlet />.
export function Estructura() {
  const { usuario, cerrarSesion } = useSesion()
  const navegar = useNavigate()
  const rol = usuario.puede_editar ? 'Administrador' : 'Lector'

  async function salir() {
    await cerrarSesion()
    navegar('/login', { replace: true })
  }

  return (
    <>
      <a className="saltar" href="#contenido">Ir al contenido</a>
      <header className="cabecera">
        <div className="cabecera__interior">
          <p className="cabecera__marca">Control de formación</p>
          <nav className="pestanas" aria-label="Secciones">
            <NavLink to="/empleados" className="pestana">Empleados</NavLink>
            <NavLink to="/cursos" className="pestana">Cursos</NavLink>
          </nav>
          <div className="cabecera__usuario">
            <span>
              {usuario.nombre} <span className="cabecera__rol">{rol}</span>
            </span>
            <button type="button" className="boton-enlace" onClick={salir}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main id="contenido" className="contenido">
        <Outlet />
      </main>
    </>
  )
}