import { useId } from 'react'

// Piezas comunes de los formularios y de la presentación de errores.

// Campo con etiqueta y error asociado (accesible: aria-invalid/aria-describedby).
// `children` recibe el id que debe llevar el control.
export function Campo({ etiqueta, error, ayuda, children, ancho = 'completo' }) {
  const id = useId()
  const idDescripcion = `${id}-desc`
  const describe = error || ayuda ? idDescripcion : undefined
  return (
    <div className={`campo campo--${ancho}`}>
      <label htmlFor={id}>{etiqueta}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describe })}
      {error ? (
        <p className="campo__error" id={idDescripcion}>{error}</p>
      ) : (
        ayuda && <p className="campo__ayuda" id={idDescripcion}>{ayuda}</p>
      )}
    </div>
  )
}

export function Aviso({ mensajes, tipo = 'error' }) {
  const lista = (Array.isArray(mensajes) ? mensajes : [mensajes]).filter(Boolean)
  if (lista.length === 0) return null
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {lista.map((m) => (
        <p key={m}>{m}</p>
      ))}
    </div>
  )
}

export function BotonesFormulario({ enviando, textoEnviar, onCancelar }) {
  return (
    <div className="formulario__botones">
      <button type="button" className="boton boton--secundario" onClick={onCancelar}>
        Cancelar
      </button>
      <button type="submit" className="boton boton--primario" disabled={enviando}>
        {enviando ? 'Guardando…' : textoEnviar}
      </button>
    </div>
  )
}