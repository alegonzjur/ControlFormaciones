import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, registrarSesionPerdida } from '../api'
import { SesionContexto } from './contexto'

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(undefined)

  useEffect(() => {
    // Cualquier 401 de la API (p. ej. la sesión caducó a las 8 h) cierra la
    // sesión en el frontend y las rutas protegidas redirigen al login.
    registrarSesionPerdida(() => setUsuario(null))
    api('/auth/me/')
      .then(setUsuario)
      .catch(() => setUsuario(null))
  }, [])

  const iniciarSesion = useCallback(async (username, password) => {
    const datos = await api('/auth/login/', { method: 'POST', body: { username, password } })
    setUsuario(datos)
    return datos
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await api('/auth/logout/', { method: 'POST' })
    } finally {
      setUsuario(null)
    }
  }, [])

  const valor = useMemo(
    () => ({ usuario, iniciarSesion, cerrarSesion }),
    [usuario, iniciarSesion, cerrarSesion],
  )

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}