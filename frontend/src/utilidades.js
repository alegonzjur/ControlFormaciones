import { useEffect, useState } from 'react'
import { api } from './api'

// --- Fechas ----------------------------------------------------------------
// La API usa "AAAA-MM-DD". Se formatea partiendo el texto, sin pasar por
// new Date(), para evitar desfases de un día por la zona horaria.

export function formatearFecha(iso) {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}

// Fecha de hoy en hora local, en el formato de los <input type="date">
export function hoyISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function plural(n, singular, pluralTexto = `${singular}s`) {
  return `${n.toLocaleString('es-ES')} ${n === 1 ? singular : pluralTexto}`
}

// --- Errores de la API -------------------------------------------------------

// Separa los errores que devuelve DRF: { campo: ['msg'], non_field_errors: [...], detail }
export function erroresDeApi(error) {
  if (!error) return { campos: {}, generales: [] }
  const datos = error.data ?? {}
  const campos = {}
  const generales = []
  for (const [clave, valor] of Object.entries(datos)) {
    const texto = Array.isArray(valor) ? valor.join(' ') : String(valor)
    if (clave === 'non_field_errors' || clave === 'detail') generales.push(texto)
    else campos[clave] = texto
  }
  if (generales.length === 0 && Object.keys(campos).length === 0) generales.push(error.message)
  return { campos, generales }
}

// --- Hooks -----------------------------------------------------------------

// Devuelve el valor solo cuando lleva `ms` milisegundos sin cambiar.
// Evita lanzar una búsqueda por cada tecla.
export function useRetardo(valor, ms = 300) {
  const [retardado, setRetardado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setRetardado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return retardado
}

// Carga datos de la API y los vuelve a pedir cuando cambian ruta o params.
// Cancela la petición anterior si llega una nueva, para que una respuesta
// lenta de una búsqueda antigua no pise a la más reciente.
// Mientras recarga conserva los datos anteriores (evita parpadeos).
export function useApi(ruta, params) {
  const clave = `${ruta}?${new URLSearchParams(params ?? {}).toString()}`
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const control = new AbortController()
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    api(ruta, { params, signal: control.signal })
      .then((datos) => setEstado({ datos, error: null, cargando: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setEstado({ datos: null, error, cargando: false })
      })
    return () => control.abort()
    // `clave` resume ruta + params; usar el objeto params directamente
    // provocaría una petición en cada renderizado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, version])

  return { ...estado, recargar: () => setVersion((v) => v + 1) }
}