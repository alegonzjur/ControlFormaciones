import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Buscador } from '../componentes/Buscador'
import { Aviso } from '../componentes/Formulario'
import { Modal } from '../componentes/Modal'
import { Paginacion } from '../componentes/Paginacion'
import { Situacion } from '../componentes/Situacion'
import { EmpleadoForm } from '../formularios/EmpleadoForm'
import { useSesion } from '../sesion/contexto'
import { formatearFecha, useApi } from '../utilidades'

const FILTROS = [
  { valor: '', texto: 'Todos' },
  { valor: 'activos', texto: 'Activos' },
  { valor: 'baja', texto: 'De baja' },
]

// Pestaña "Empleados": búsqueda + resumen de cada empleado.
// La búsqueda, el filtro y la página viven en la URL (?q=&situacion=&pagina=),
// así que al volver atrás desde una ficha se conservan.
export function Empleados() {
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creando, setCreando] = useState(false)

  const q = params.get('q') ?? ''
  const situacion = params.get('situacion') ?? ''
  const pagina = Number(params.get('pagina')) || 1

  const { datos, error, cargando } = useApi('/empleados/', {
    search: q,
    activo: { activos: 'true', baja: 'false' }[situacion],
    page: pagina > 1 ? pagina : undefined,
  })

  function actualizar(cambios) {
    const nuevos = new URLSearchParams(params)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
    }
    if (!('pagina' in cambios)) nuevos.delete('pagina') // filtro nuevo -> página 1
    setParams(nuevos, { replace: true })
  }

  return (
    <>
      <div className="encabezado">
        <h1>Empleados</h1>
        {usuario.puede_editar && (
          <button type="button" className="boton boton--primario" onClick={() => setCreando(true)}>
            Nuevo empleado
          </button>
        )}
      </div>

      <Buscador
        etiqueta="Buscar empleado"
        placeholder="Nombre, apellidos o nº de empleado"
        valorInicial={q}
        onBuscar={(texto) => actualizar({ q: texto })}
        total={datos?.count}
        cargando={cargando}
        singular="empleado"
      />

      <div className="filtros" role="group" aria-label="Situación">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className="filtro"
            aria-pressed={situacion === f.valor}
            onClick={() => actualizar({ situacion: f.valor })}
          >
            {f.texto}
          </button>
        ))}
      </div>

      <Aviso mensajes={error?.message} />

      {datos && datos.results.length === 0 && (
        <p className="vacio">
          {q
            ? `Ningún empleado coincide con «${q}». Prueba con un solo apellido o con el nº de empleado.`
            : 'Todavía no hay empleados con este filtro.'}
        </p>
      )}

      {datos && datos.results.length > 0 && (
        <div className={`tabla-contenedor${cargando ? ' tabla-contenedor--cargando' : ''}`}>
          <table className="tabla tabla--navegable">
            <thead>
              <tr>
                <th scope="col">Empleado</th>
                <th scope="col" className="opcional">Grupo</th>
                <th scope="col" className="opcional">Sede</th>
                <th scope="col" className="opcional">Contrato</th>
                <th scope="col" className="opcional">Antigüedad</th>
                <th scope="col" className="num">Cursos</th>
                <th scope="col" className="num">Horas</th>
                <th scope="col">Situación</th>
              </tr>
            </thead>
            <tbody>
              {datos.results.map((e) => (
                <tr
                  key={e.id}
                  onClick={(ev) => {
                    if (!ev.target.closest('a')) navegar(`/empleados/${e.id}`)
                  }}
                >
                  <td>
                    <Link to={`/empleados/${e.id}`} className="tabla__principal">
                      {e.nombre_completo}
                    </Link>
                    {e.num_empleado && <span className="tabla__secundario">Nº {e.num_empleado}</span>}
                  </td>
                  <td className="opcional">{e.grupo_profesional}</td>
                  <td className="opcional">{e.sede}</td>
                  <td className="opcional">{e.contrato}</td>
                  <td className="opcional">{formatearFecha(e.fecha_antiguedad)}</td>
                  <td className="num">{e.num_cursos}</td>
                  <td className="num">{e.total_horas}</td>
                  <td><Situacion activo={e.activo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {datos && (
        <Paginacion total={datos.count} pagina={pagina} onCambiar={(p) => actualizar({ pagina: p > 1 ? String(p) : '' })} />
      )}

      <Modal titulo="Nuevo empleado" abierto={creando} onCerrar={() => setCreando(false)} ancho="ancho">
        <EmpleadoForm
          onGuardado={(nuevo) => navegar(`/empleados/${nuevo.id}`)}
          onCancelar={() => setCreando(false)}
        />
      </Modal>
    </>
  )
}