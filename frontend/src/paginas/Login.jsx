import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Aviso } from '../componentes/Formulario'
import { useSesion } from '../sesion/contexto'

export function Login() {
  const { usuario, iniciarSesion } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const destino = ubicacion.state?.desde?.pathname
    ? ubicacion.state.desde.pathname + (ubicacion.state.desde.search ?? '')
    : '/empleados'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={destino} replace />

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await iniciarSesion(username, password)
      navegar(destino, { replace: true })
    } catch (err) {
      setError(
        err.status === 429
          ? 'Demasiados intentos. Espera un minuto y vuelve a probar.'
          : err.message,
      )
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <form className="login__panel" onSubmit={enviar}>
        <h1>Control de formación</h1>
        <p className="login__intro">Inicia sesión con el usuario que te ha dado el administrador.</p>
        <Aviso mensajes={error} />
        <div className="campo">
          <label htmlFor="usuario">Usuario</label>
          <input
            id="usuario"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="campo">
          <label htmlFor="clave">Contraseña</label>
          <input
            id="clave"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="boton boton--primario boton--ancho" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  )
}