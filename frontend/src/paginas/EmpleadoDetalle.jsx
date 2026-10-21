import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Aviso } from '../componentes/Formulario'
import { Modal } from '../componentes/Modal'
import { Situacion } from '../componentes/Situacion'
import { Volver } from '../componentes/Volver'
import { ConfirmarEliminar } from '../formularios/ConfirmarEliminar'
import { EmpleadoForm } from '../formularios/EmpleadoForm'
import { FormacionForm } from '../formularios/FormacionForm'
import { useSesion } from '../sesion/contexto'
import { formatearFecha, plural, useApi } from '../utilidades'

// Ficha completa del empleado y los cursos que ha completado.
export function EmpleadoDetalle() {
  const { id } = useParams()
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const { datos: empleado, error, recargar } = useApi(`/empleados/${id}/`)
  // Ventana abierta: { tipo: 'editar' | 'eliminar' | 'formacion' | 'quitar', formacion? }
  const [ventana, setVentana] = useState(null)
  const cerrar = () => setVentana(null)
  const guardadoYRecargar = () => {
    cerrar()
    recargar()
  }

  if (error) {
    return (
      <>
        <Volver a="/empleados" texto="Empleados" />
        <Aviso mensajes={error.status === 404 ? 'Este empleado no existe o se ha eliminado.' : error.message} />
      </>
    )
  }
  if (!empleado) return <p className="cargando-pagina">Cargando…</p>

  const totalHoras = empleado.formaciones.reduce((suma, f) => suma + f.horas, 0)
  const lado = { id: empleado.id, etiqueta: empleado.nombre_completo }

  return (
    <>
      <Volver a="/empleados" texto="Empleados" />

      <div className="encabezado">
        <div>
          <h1>{empleado.nombre_completo}</h1>
          <p className="encabezado__sub">
            <Situacion activo={empleado.activo} />
            {plural(empleado.formaciones.length, 'curso completado', 'cursos completados')},{' '}
            {plural(totalHoras, 'hora', 'horas')} en total
          </p>
        </div>
        {usuario.puede_editar && (
          <div className="encabezado__acciones">
            <button type="button" className="boton boton--secundario" onClick={() => setVentana({ tipo: 'editar' })}>
              Editar datos
            </button>
            <button type="button" className="boton boton--peligro-suave" onClick={() => setVentana({ tipo: 'eliminar' })}>
              Eliminar
            </button>
          </div>
        )}
      </div>

      <dl className="datos">
        <div><dt>Nº de empleado</dt><dd>{empleado.num_empleado || '—'}</dd></div>
        <div><dt>Grupo profesional</dt><dd>{empleado.grupo_profesional}</dd></div>
        <div><dt>Sede</dt><dd>{empleado.sede_nombre}</dd></div>
        <div><dt>Contrato</dt><dd>{empleado.contrato_nombre}</dd></div>
        <div><dt>Antigüedad</dt><dd>{formatearFecha(empleado.fecha_antiguedad)}</dd></div>
        <div><dt>Baja</dt><dd>{formatearFecha(empleado.fecha_baja)}</dd></div>
      </dl>

      <section className="seccion" aria-labelledby="titulo-cursos">
        <div className="seccion__cabecera">
          <h2 id="titulo-cursos">Cursos completados</h2>
          {usuario.puede_editar && (
            <button type="button" className="boton boton--primario" onClick={() => setVentana({ tipo: 'formacion' })}>
              Registrar curso
            </button>
          )}
        </div>

        {empleado.formaciones.length === 0 ? (
          <p className="vacio">
            Todavía no tiene cursos registrados.
            {usuario.puede_editar && ' Usa «Registrar curso» para añadir el primero.'}
          </p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Curso</th>
                  <th scope="col">Nivel</th>
                  <th scope="col" className="num">Horas</th>
                  <th scope="col">Fecha</th>
                  {usuario.puede_editar && <th scope="col"><span className="oculto-visual">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {empleado.formaciones.map((f) => (
                  <tr key={f.id}>
                    <td><Link to={`/cursos/${f.curso}`}>{f.curso_nombre}</Link></td>
                    <td>{f.nivel || '—'}</td>
                    <td className="num">{f.horas}</td>
                    <td>{formatearFecha(f.fecha_realizacion)}</td>
                    {usuario.puede_editar && (
                      <td className="acciones">
                        <button
                          type="button"
                          className="boton-enlace"
                          onClick={() => setVentana({ tipo: 'formacion', formacion: f })}
                          aria-label={`Editar ${f.curso_nombre}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="boton-enlace boton-enlace--peligro"
                          onClick={() => setVentana({ tipo: 'quitar', formacion: f })}
                          aria-label={`Quitar ${f.curso_nombre}`}
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

      <Modal titulo="Editar datos del empleado" abierto={ventana?.tipo === 'editar'} onCerrar={cerrar} ancho="ancho">
        <EmpleadoForm empleado={empleado} onGuardado={guardadoYRecargar} onCancelar={cerrar} />
      </Modal>

      <Modal titulo="Eliminar empleado" abierto={ventana?.tipo === 'eliminar'} onCerrar={cerrar}>
        <ConfirmarEliminar
          ruta={`/empleados/${empleado.id}/`}
          mensaje={`Se eliminará a ${empleado.nombre_completo}. Si deja la empresa, registra su fecha de baja en lugar de eliminarlo: así se conserva su historial.`}
          onEliminado={() => navegar('/empleados', { replace: true })}
          onCancelar={cerrar}
        />
      </Modal>

      <Modal
        titulo={ventana?.formacion ? 'Editar curso registrado' : 'Registrar curso completado'}
        abierto={ventana?.tipo === 'formacion'}
        onCerrar={cerrar}
      >
        <FormacionForm
          empleado={lado}
          formacion={ventana?.formacion}
          onGuardado={guardadoYRecargar}
          onCancelar={cerrar}
        />
      </Modal>

      <Modal titulo="Quitar curso" abierto={ventana?.tipo === 'quitar'} onCerrar={cerrar}>
        {ventana?.formacion && (
          <ConfirmarEliminar
            ruta={`/formaciones/${ventana.formacion.id}/`}
            mensaje={`Se quitará «${ventana.formacion.curso_nombre}${ventana.formacion.nivel ? ` (nivel ${ventana.formacion.nivel})` : ''}» del historial de ${empleado.nombre_completo}.`}
            textoBoton="Quitar curso"
            onEliminado={guardadoYRecargar}
            onCancelar={cerrar}
          />
        )}
      </Modal>
    </>
  )
}