import { useEffect, useId, useState } from 'react'
import { plural, useRetardo } from '../utilidades'

// Campo de búsqueda principal de cada pestaña. Busca mientras se escribe
// (con 300 ms de retardo) y muestra a su lado cuántos resultados hay.
export function Buscador({ etiqueta, placeholder, valorInicial, onBuscar, total, cargando, singular, pluralTexto }) {
  const id = useId()
  const [texto, setTexto] = useState(valorInicial)
  const retardado = useRetardo(texto.trim(), 300)

  useEffect(() => {
    if (retardado !== valorInicial) onBuscar(retardado)
    // Solo reaccionamos al texto ya retardado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retardado])

  return (
    <div className="buscador">
      <label htmlFor={id} className="buscador__etiqueta">{etiqueta}</label>
      <div className="buscador__fila">
        <input
          id={id}
          type="search"
          className="buscador__input"
          placeholder={placeholder}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        <p className="buscador__total" aria-live="polite">
          {total === undefined ? '' : cargando ? 'Buscando…' : plural(total, singular, pluralTexto)}
        </p>
      </div>
    </div>
  )
}