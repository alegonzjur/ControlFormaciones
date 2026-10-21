import { useState } from 'react'
import { api } from '../api'
import { Aviso } from '../componentes/Formulario'

// Confirmación antes de borrar. Si la API lo impide (409: el registro tiene
// formaciones asociadas), muestra su explicación sin cerrar la ventana.
export function ConfirmarEliminar({ ruta, mensaje, textoBoton = 'Eliminar', onEliminado, onCancelar }) {
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function eliminar() {
    setEnviando(true)
    setError(null)
    try {
      await api(ruta, { method: 'DELETE' })
      onEliminado()
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="formulario">
      <p>{mensaje}</p>
      <Aviso mensajes={error} />
      <div className="formulario__botones">
        <button type="button" className="boton boton--secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={enviando}>
          {enviando ? 'Eliminando…' : textoBoton}
        </button>
      </div>
    </div>
  )
}