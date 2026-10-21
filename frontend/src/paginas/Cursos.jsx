import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Buscador } from '../componentes/Buscador'
import { Aviso } from '../componentes/Formulario'
import { Modal } from '../componentes/Modal'
import { Paginacion } from '../componentes/Paginacion'
import { CursoForm } from '../formularios/CursoForm'
import { useSesion } from '../sesion/contexto'
import { useApi } from '../utilidades'

// Pestaña "Cursos": búsqueda en el catálogo y nº de empleados de cada curso.
export function Cursos() {
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creando, setCreando] = useState(false)

  const q = params.get('q') ?? ''
  const pagina = Number(params.get('pagina')) || 1
  const { datos, error, cargando } = useApi('/cursos/', {
    search: q,
    page: pagina > 1 ? pagina : undefined,
  })

  function actualizar(cambios) {
    const nuevos = new URLSearchParams(params)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
    }
    if (!('pagina' in cambios)) nuevos.delete('pagina')
    setParams(nuevos, { replace: true })
  }

  return (
    <>
      <div className="encabezado">
        <h1>Cursos</h1>
        {usuario.puede_editar && (
          <button type="button" className="boton boton--primario" onClick={() => setCreando(true)}>
            Nuevo curso
          </button>
        )}
      </div>

      <Buscador
        etiqueta="Buscar curso"
        placeholder="Nombre del curso"
        valorInicial={q}
        onBuscar={(texto) => actualizar({ q: texto })}
        total={datos?.count}
        cargando={cargando}
        singular="curso"
      />

      <Aviso mensajes={error?.message} />

      {datos && datos.results.length === 0 && (
        <p className="vacio">
          {q
            ? `Ningún curso coincide con «${q}». Prueba con una sola palabra del nombre.`
            : 'Todavía no hay cursos en el catálogo.'}
        </p>
      )}

      {datos && datos.results.length > 0 && (
        <div className={`tabla-contenedor${cargando ? ' tabla-contenedor--cargando' : ''}`}>
          <table className="tabla tabla--navegable">
            <thead>
              <tr>
                <th scope="col">Curso</th>
                <th scope="col" className="num">Empleados</th>
              </tr>
            </thead>
            <tbody>
              {datos.results.map((c) => (
                <tr
                  key={c.id}
                  onClick={(ev) => {
                    if (!ev.target.closest('a')) navegar(`/cursos/${c.id}`)
                  }}
                >
                  <td>
                    <Link to={`/cursos/${c.id}`} className="tabla__principal">{c.nombre}</Link>
                  </td>
                  <td className="num">{c.num_empleados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {datos && (
        <Paginacion total={datos.count} pagina={pagina} onCambiar={(p) => actualizar({ pagina: p > 1 ? String(p) : '' })} />
      )}

      <Modal titulo="Nuevo curso" abierto={creando} onCerrar={() => setCreando(false)}>
        <CursoForm onGuardado={(nuevo) => navegar(`/cursos/${nuevo.id}`)} onCancelar={() => setCreando(false)} />
      </Modal>
    </>
  )
}