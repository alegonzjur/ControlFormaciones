import { useState } from 'react'
import { api } from '../api'
import { Aviso, BotonesFormulario, Campo } from '../componentes/Formulario'
import { erroresDeApi, useApi } from '../utilidades'

const VACIO = {
  nombre: '',
  apellido1: '',
  apellido2: '',
  num_empleado: '',
  grupo_profesional: '',
  sede: '',
  contrato: '',
  fecha_antiguedad: '',
  fecha_baja: '',
}

// Alta (sin `empleado`) o edición (con `empleado`) de los datos del empleado.
export function EmpleadoForm({ empleado, onGuardado, onCancelar }) {
  const [valores, setValores] = useState(() =>
    empleado
      ? Object.fromEntries(Object.keys(VACIO).map((k) => [k, empleado[k] ?? '']))
      : VACIO,
  )
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const sedes = useApi('/sedes/')
  const contratos = useApi('/contratos/')
  const { campos, generales } = erroresDeApi(error)

  const cambiar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const datos = {
      ...valores,
      // Vacío -> null: num_empleado es único y admite varios NULL, pero no
      // varios ''. fecha_baja vacía significa "sigue en activo".
      num_empleado: valores.num_empleado.trim() || null,
      fecha_baja: valores.fecha_baja || null,
      // Obligatorios: null hace que la API responda "Este campo no puede ser
      // nulo", más claro que el error de formato que daría ''.
      grupo_profesional: valores.grupo_profesional || null,
      sede: valores.sede || null,
      contrato: valores.contrato || null,
      fecha_antiguedad: valores.fecha_antiguedad || null,
    }
    try {
      const guardado = empleado
        ? await api(`/empleados/${empleado.id}/`, { method: 'PUT', body: datos })
        : await api('/empleados/', { method: 'POST', body: datos })
      onGuardado(guardado)
    } catch (err) {
      setError(err)
      setEnviando(false)
    }
  }

  const sinCatalogos =
    (sedes.datos && sedes.datos.length === 0) || (contratos.datos && contratos.datos.length === 0)

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <Aviso mensajes={generales} />
      {sinCatalogos && (
        <Aviso
          tipo="info"
          mensajes="Faltan sedes o tipos de contrato. Debe darlos de alta el administrador del sistema desde /admin."
        />
      )}

      <div className="formulario__rejilla">
        <Campo etiqueta="Nombre" error={campos.nombre} ancho="medio">
          {(p) => <input {...p} value={valores.nombre} onChange={cambiar('nombre')} required />}
        </Campo>
        <Campo etiqueta="Nº de empleado" error={campos.num_empleado} ayuda="Opcional" ancho="medio">
          {(p) => <input {...p} value={valores.num_empleado} onChange={cambiar('num_empleado')} />}
        </Campo>
        <Campo etiqueta="Primer apellido" error={campos.apellido1} ancho="medio">
          {(p) => <input {...p} value={valores.apellido1} onChange={cambiar('apellido1')} required />}
        </Campo>
        <Campo etiqueta="Segundo apellido" error={campos.apellido2} ancho="medio">
          {(p) => <input {...p} value={valores.apellido2} onChange={cambiar('apellido2')} />}
        </Campo>

        <Campo etiqueta="Grupo profesional" error={campos.grupo_profesional} ancho="tercio">
          {(p) => (
            <select {...p} value={valores.grupo_profesional} onChange={cambiar('grupo_profesional')}>
              <option value="">Elige…</option>
              <option value="PAS">PAS</option>
              <option value="PDI">PDI</option>
            </select>
          )}
        </Campo>
        <Campo etiqueta="Sede" error={campos.sede} ancho="tercio">
          {(p) => (
            <select {...p} value={valores.sede} onChange={cambiar('sede')}>
              <option value="">Elige…</option>
              {sedes.datos?.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo etiqueta="Contrato" error={campos.contrato} ancho="tercio">
          {(p) => (
            <select {...p} value={valores.contrato} onChange={cambiar('contrato')}>
              <option value="">Elige…</option>
              {contratos.datos?.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
        </Campo>

        <Campo etiqueta="Fecha de antigüedad" error={campos.fecha_antiguedad} ancho="medio">
          {(p) => (
            <input {...p} type="date" value={valores.fecha_antiguedad} onChange={cambiar('fecha_antiguedad')} />
          )}
        </Campo>
        <Campo
          etiqueta="Fecha de baja"
          error={campos.fecha_baja}
          ayuda="Déjala vacía si sigue trabajando"
          ancho="medio"
        >
          {(p) => (
            <input {...p} type="date" value={valores.fecha_baja} onChange={cambiar('fecha_baja')} />
          )}
        </Campo>
      </div>

      <BotonesFormulario
        enviando={enviando}
        textoEnviar={empleado ? 'Guardar cambios' : 'Crear empleado'}
        onCancelar={onCancelar}
      />
    </form>
  )
}