import { useEffect, useId, useState } from 'react'
import { api } from '../api'
import { useRetardo } from '../utilidades'

// Campo de texto que busca en la API mientras se escribe y deja elegir un
// resultado. Se usa para elegir un curso (desde la ficha de un empleado) o un
// empleado (desde la ficha de un curso). Hace falta porque los listados están
// paginados: un <select> solo mostraría los 25 primeros.
//
// Sigue el patrón "combobox" de WAI-ARIA: flechas para moverse, Enter para
// elegir, Esc para cerrar.
//
// valor: { id, etiqueta } | null
export function Autocompletar({
  ruta,
  etiquetaDe,
  detalleDe,
  valor,
  onCambiar,
  placeholder,
  ...atributosInput // id, aria-invalid, aria-describedby (desde <Campo>)
}) {
  const idLista = useId()
  const [texto, setTexto] = useState(valor?.etiqueta ?? '')
  const [abierto, setAbierto] = useState(false)
  // Resultados junto con la búsqueda a la que responden: si no coinciden con
  // la búsqueda actual, es que la respuesta todavía no ha llegado.
  const [respuesta, setRespuesta] = useState({ para: null, resultados: [] })
  const [indice, setIndice] = useState(-1)
  const busqueda = useRetardo(texto, 250)
  const resultados = respuesta.resultados
  const cargando = abierto && respuesta.para !== busqueda

  useEffect(() => {
    if (!abierto) return
    const control = new AbortController()
    api(ruta, { params: { search: busqueda }, signal: control.signal })
      .then((datos) => {
        setRespuesta({ para: busqueda, resultados: datos.results })
        setIndice(datos.results.length ? 0 : -1)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setRespuesta({ para: busqueda, resultados: [] })
      })
    return () => control.abort()
  }, [ruta, busqueda, abierto])

  function elegir(item) {
    const etiqueta = etiquetaDe(item)
    setTexto(etiqueta)
    setAbierto(false)
    onCambiar({ id: item.id, etiqueta })
  }

  function alEscribir(e) {
    setTexto(e.target.value)
    setAbierto(true)
    if (valor) onCambiar(null) // al editar el texto se pierde la selección
  }

  function alPulsarTecla(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!abierto) setAbierto(true)
      else setIndice((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndice((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && abierto) {
      e.preventDefault() // que Enter elija en lugar de enviar el formulario
      if (resultados[indice]) elegir(resultados[indice])
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault()
      e.stopPropagation() // que Esc cierre la lista, no la ventana modal
      setAbierto(false)
    }
  }

  const idOpcion = (i) => `${idLista}-${i}`
  const mostrarLista = abierto

  return (
    <div className="autocompletar">
      <input
        {...atributosInput}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={mostrarLista ? true : false}
        aria-controls={idLista}
        aria-activedescendant={mostrarLista && indice >= 0 ? idOpcion(indice) : undefined}
        placeholder={placeholder}
        value={texto}
        onChange={alEscribir}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={alPulsarTecla}
      />
      {mostrarLista && (
        <ul className="autocompletar__lista" id={idLista} role="listbox">
          {resultados.map((item, i) => (
            <li
              key={item.id}
              id={idOpcion(i)}
              role="option"
              aria-selected={i === indice}
              className={i === indice ? 'activa' : undefined}
              // mousedown en lugar de click: se dispara antes del blur del input
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(item)
              }}
              onMouseEnter={() => setIndice(i)}
            >
              <span>{etiquetaDe(item)}</span>
              {detalleDe && <span className="autocompletar__detalle">{detalleDe(item)}</span>}
            </li>
          ))}
          {!cargando && resultados.length === 0 && (
            <li className="autocompletar__vacio" role="presentation">
              {busqueda ? `Sin resultados para «${busqueda}»` : 'Todavía no hay registros'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}