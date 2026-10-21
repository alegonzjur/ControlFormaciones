import { useState } from 'react'
import { api } from '../api'
import { Autocompletar } from '../componentes/Autocompletar'
import { Aviso, BotonesFormulario, Campo } from '../componentes/Formulario'
import { erroresDeApi, hoyISO } from '../utilidades'

// Registra (o edita) un curso completado por un empleado.
//
// Se usa desde los dos lados de la relación, como usuarios y grupos en AD:
// - desde la ficha del empleado: `empleado` fijo, se elige el curso
// - desde la ficha del curso:    `curso` fijo, se elige el empleado
//
// empleado / curso: { id, etiqueta } del lado fijo
// formacion: registro existente si se está editando
export function FormacionForm({ empleado, curso, formacion, onGuardado, onCancelar }) {
  const eligeCurso = Boolean(empleado)
  const [elegido, setElegido] = useState(() => {
    if (!formacion) return null
    return eligeCurso
      ? { id: formacion.curso, etiqueta: formacion.curso_nombre }
      : { id: formacion.empleado, etiqueta: formacion.empleado_nombre }
  })
  const [valores, setValores] = useState({
    nivel: formacion?.nivel ?? '',
    horas: formacion?.horas ?? '',
    fecha_realizacion: formacion?.fecha_realizacion ?? '',
  })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { campos, generales } = erroresDeApi(error)
  const errorElegido = eligeCurso ? campos.curso : campos.empleado

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const datos = {
      empleado: eligeCurso ? empleado.id : elegido?.id ?? null,
      curso: eligeCurso ? elegido?.id ?? null : curso.id,
      nivel: valores.nivel.trim(),
      horas: valores.horas === '' ? null : Number(valores.horas),
      fecha_realizacion: valores.fecha_realizacion || null,
    }
    try {
      const guardado = formacion
        ? await api(`/formaciones/${formacion.id}/`, { method: 'PUT', body: datos })
        : await api('/formaciones/', { method: 'POST', body: datos })
      onGuardado(guardado)
    } catch (err) {
      setError(err)
      setEnviando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <Aviso mensajes={generales} />
      <p className="formulario__contexto">
        {eligeCurso ? 'Empleado' : 'Curso'}: <strong>{eligeCurso ? empleado.etiqueta : curso.etiqueta}</strong>
      </p>

      <div className="formulario__rejilla">
        <Campo etiqueta={eligeCurso ? 'Curso' : 'Empleado'} error={errorElegido}>
          {(p) =>
            eligeCurso ? (
              <Autocompletar
                {...p}
                ruta="/cursos/"
                etiquetaDe={(c) => c.nombre}
                valor={elegido}
                onCambiar={setElegido}
                placeholder="Escribe para buscar un curso"
              />
            ) : (
              <Autocompletar
                {...p}
                ruta="/empleados/"
                etiquetaDe={(emp) => emp.nombre_completo}
                detalleDe={(emp) => [emp.num_empleado, emp.sede, !emp.activo && 'de baja'].filter(Boolean).join(', ')}
                valor={elegido}
                onCambiar={setElegido}
                placeholder="Escribe nombre, apellidos o nº de empleado"
              />
            )
          }
        </Campo>

        <Campo etiqueta="Nivel" error={campos.nivel} ayuda="Vacío si el curso no tiene niveles" ancho="tercio">
          {(p) => <input {...p} value={valores.nivel} onChange={cambiar('nivel')} maxLength={20} />}
        </Campo>
        <Campo etiqueta="Horas" error={campos.horas} ancho="tercio">
          {(p) => (
            <input {...p} type="number" min="1" step="1" inputMode="numeric" value={valores.horas} onChange={cambiar('horas')} />
          )}
        </Campo>
        <Campo etiqueta="Fecha de realización" error={campos.fecha_realizacion} ancho="tercio">
          {(p) => (
            <input
              {...p}
              type="date"
              max={hoyISO()}
              value={valores.fecha_realizacion}
              onChange={cambiar('fecha_realizacion')}
            />
          )}
        </Campo>
      </div>

      <BotonesFormulario
        enviando={enviando}
        textoEnviar={formacion ? 'Guardar cambios' : 'Registrar curso'}
        onCancelar={onCancelar}
      />
    </form>
  )
}