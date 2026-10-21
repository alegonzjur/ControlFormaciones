import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Aviso } from '../componentes/Formulario'
import { Modal } from '../componentes/Modal'
import { Situacion } from '../componentes/Situacion'
import { Volver } from '../componentes/Volver'
import { ConfirmarEliminar } from '../formularios/ConfirmarEliminar'
import { CursoForm } from '../formularios/CursoForm'
import { FormacionForm } from '../formularios/FormacionForm'
import { useSesion } from '../sesion/contexto'
import { formatearFecha, plural, useApi } from '../utilidades'

const TODOS = '__todos__'

// Ficha del curso: todos los empleados que lo han completado, con su nivel.
export function CursoDetalle() {
  const { id } = useParams()
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const { datos: curso, error, recargar } = useApi(`/cursos/${id}/`)
  const [nivel, setNivel] = useState(TODOS)
  const [ventana, setVentana] = useState(null)
  const cerrar = () => setVentana(null)
  const guardadoYRecargar = () => {
    cerrar()
    recargar()
  }

  if (error) {
    return (
      <>
        <Volver a="/cursos" texto="Cursos" />
        <Aviso mensajes={error.status === 404 ? 'Este curso no existe o se ha eliminado.' : error.message} />
      </>
    )
  }
  if (!curso) return <p className="cargando-pagina">Cargando…</p>

  // Niveles presentes en este curso, para filtrar ('' = sin nivel)
  const niveles = [...new Set(curso.formaciones.map((f) => f.nivel))].sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true }),
  )
  const nivelValido = nivel === TODOS || niveles.includes(nivel) ? nivel : TODOS
  const visibles =
    nivelValido === TODOS ? curso.formaciones : curso.formaciones.filter((f) => f.nivel === nivelValido)
  const numEmpleados = new Set(curso.formaciones.map((f) => f.empleado)).size
  const lado = { id: curso.id, etiqueta: curso.nombre }

  return (
    <>
      <Volver a="/cursos" texto="Cursos" />

      <div className="encabezado">
        <div>
          <h1>{curso.nombre}</h1>
          <p className="encabezado__sub">
            Completado por {plural(numEmpleados, 'empleado')}
          </p>
        </div>
        {usuario.puede_editar && (
          <div className="encabezado__acciones">
            <button type="button" className="boton boton--secundario" onClick={() => setVentana({ tipo: 'renombrar' })}>
              Cambiar nombre
            </button>
            <button type="button" className="boton boton--peligro-suave" onClick={() => setVentana({ tipo: 'eliminar' })}>
              Eliminar
            </button>
          </div>
        )}
      </div>

      <section className="seccion" aria-labelledby="titulo-empleados">
        <div className="seccion__cabecera">
          <h2 id="titulo-empleados">Empleados con este curso</h2>
          {usuario.puede_editar && (
            <button type="button" className="boton boton--primario" onClick={() => setVentana({ tipo: 'formacion' })}>
              Asignar a un empleado
            </button>
          )}
        </div>

        {niveles.length > 1 && (
          <div className="filtros" role="group" aria-label="Nivel">
            <button type="button" className="filtro" aria-pressed={nivelValido === TODOS} onClick={() => setNivel(TODOS)}>
              Todos los niveles
            </button>
            {niveles.map((n) => (
              <button key={n} type="button" className="filtro" aria-pressed={nivelValido === n} onClick={() => setNivel(n)}>
                {n ? `Nivel ${n}` : 'Sin nivel'}
              </button>
            ))}
          </div>
        )}

        {curso.formaciones.length === 0 ? (
          <p className="vacio">
            Ningún empleado tiene este curso todavía.
            {usuario.puede_editar && ' Usa «Asignar a un empleado» para registrar el primero.'}
          </p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Empleado</th>
                  <th scope="col">Situación</th>
                  <th scope="col">Nivel</th>
                  <th scope="col" className="num">Horas</th>
                  <th scope="col">Fecha</th>
                  {usuario.puede_editar && <th scope="col"><span className="oculto-visual">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id}>
                    <td><Link to={`/empleados/${f.empleado}`}>{f.empleado_nombre}</Link></td>
                    <td><Situacion activo={f.empleado_activo} /></td>
                    <td>{f.nivel || '—'}</td>
                    <td className="num">{f.horas}</td>
                    <td>{formatearFecha(f.fecha_realizacion)}</td>
                    {usuario.puede_editar && (
                      <td className="acciones">
                        <button
                          type="button"
                          className="boton-enlace"
                          onClick={() => setVentana({ tipo: 'formacion', formacion: f })}
                          aria-label={`Editar el registro de ${f.empleado_nombre}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="boton-enlace boton-enlace--peligro"
                          onClick={() => setVentana({ tipo: 'quitar', formacion: f })}
                          aria-label={`Quitar a ${f.empleado_nombre}`}
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal titulo="Cambiar nombre del curso" abierto={ventana?.tipo === 'renombrar'} onCerrar={cerrar}>
        <CursoForm curso={curso} onGuardado={guardadoYRecargar} onCancelar={cerrar} />
      </Modal>

      <Modal titulo="Eliminar curso" abierto={ventana?.tipo === 'eliminar'} onCerrar={cerrar}>
        <ConfirmarEliminar
          ruta={`/cursos/${curso.id}/`}
          mensaje={`Se eliminará «${curso.nombre}» del catálogo. Solo es posible si ningún empleado lo tiene registrado.`}
          onEliminado={() => navegar('/cursos', { replace: true })}
          onCancelar={cerrar}
        />
      </Modal>

      <Modal
        titulo={ventana?.formacion ? 'Editar registro' : 'Asignar curso a un empleado'}
        abierto={ventana?.tipo === 'formacion'}
        onCerrar={cerrar}
      >
        <FormacionForm curso={lado} formacion={ventana?.formacion} onGuardado={guardadoYRecargar} onCancelar={cerrar} />
      </Modal>

      <Modal titulo="Quitar empleado del curso" abierto={ventana?.tipo === 'quitar'} onCerrar={cerrar}>
        {ventana?.formacion && (
          <ConfirmarEliminar
            ruta={`/formaciones/${ventana.formacion.id}/`}
            mensaje={`Se quitará «${curso.nombre}${ventana.formacion.nivel ? ` (nivel ${ventana.formacion.nivel})` : ''}» del historial de ${ventana.formacion.empleado_nombre}.`}
            textoBoton="Quitar"
            onEliminado={guardadoYRecargar}
            onCancelar={cerrar}
          />
        )}
      </Modal>
    </>
  )
}