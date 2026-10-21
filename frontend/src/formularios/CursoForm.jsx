import { useState } from 'react'
import { api } from '../api'
import { Aviso, BotonesFormulario, Campo } from '../componentes/Formulario'
import { erroresDeApi } from '../utilidades'

// Alta (sin `curso`) o cambio de nombre (con `curso`) de un curso del catálogo.
export function CursoForm({ curso, onGuardado, onCancelar }) {
  const [nombre, setNombre] = useState(curso?.nombre ?? '')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { campos, generales } = erroresDeApi(error)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const guardado = curso
        ? await api(`/cursos/${curso.id}/`, { method: 'PATCH', body: { nombre } })
        : await api('/cursos/', { method: 'POST', body: { nombre } })
      onGuardado(guardado)
    } catch (err) {
      setError(err)
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <Aviso mensajes={generales} />
      <Campo
        etiqueta="Nombre del curso"
        error={campos.nombre}
        ayuda="Sin el nivel: el nivel se indica al asignar el curso a cada empleado."
      >
        {(p) => (
          <input {...p} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        )}
      </Campo>
      <BotonesFormulario
        enviando={enviando}
        textoEnviar={curso ? 'Guardar nombre' : 'Crear curso'}
        onCancelar={onCancelar}
      />
    </form>
  )
}