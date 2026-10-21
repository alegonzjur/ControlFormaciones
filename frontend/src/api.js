// Cliente de la API de Django.
//
// - Envía la cookie de sesión (mismo origen: en desarrollo vía el proxy de
//   Vite, en producción porque Django sirve también el frontend).
// - Añade la cabecera X-CSRFToken en las peticiones que modifican datos,
//   leyendo la cookie "cf_csrftoken" EN CADA PETICIÓN: Django cambia el token
//   al iniciar sesión, así que no vale leerlo una sola vez al arrancar.
// - Convierte cualquier respuesta de error en un ApiError con el estado HTTP
//   y el cuerpo JSON, para que los formularios puedan mostrar los mensajes.

const COOKIE_CSRF = 'cf_csrftoken'
const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS']

export class ApiError extends Error {
  constructor(status, data) {
    super(mensajeDeError(status, data))
    this.name = 'ApiError'
    this.status = status
    this.data = data ?? {}
  }
}

function mensajeDeError(status, data) {
  if (data?.detail) return data.detail
  if (status === 0) return 'No se puede conectar con el servidor. Comprueba la conexión y vuelve a intentarlo.'
  if (status === 404) return 'No existe o ya se ha eliminado.'
  if (status >= 500) return 'Error del servidor. Si se repite, avisa al administrador de la aplicación.'
  return `Error ${status}`
}

function leerCookie(nombre) {
  const fila = document.cookie.split('; ').find((c) => c.startsWith(`${nombre}=`))
  return fila ? decodeURIComponent(fila.split('=')[1]) : null
}

// La capa de sesión registra aquí qué hacer ante un 401 (sesión caducada)
let alPerderSesion = null
export function registrarSesionPerdida(fn) {
  alPerderSesion = fn
}

export async function api(ruta, { method = 'GET', body, params, signal } = {}) {
  const url = new URL(`/api${ruta}`, window.location.origin)
  for (const [clave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, valor)
  }

  const headers = { Accept: 'application/json' }
  if (!METODOS_SEGUROS.includes(method)) {
    // Primera visita: aún no hay cookie CSRF. Este endpoint la crea.
    if (!leerCookie(COOKIE_CSRF)) await fetch('/api/auth/csrf/', { credentials: 'same-origin' })
    headers['X-CSRFToken'] = leerCookie(COOKIE_CSRF) ?? ''
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let respuesta
  try {
    respuesta = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error // petición cancelada a propósito
    throw new ApiError(0, null)
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    if (respuesta.status === 401) alPerderSesion?.()
    throw new ApiError(respuesta.status, datos)
  }
  return datos
}