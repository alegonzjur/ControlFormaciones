import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router'
import { CursoDetalle } from './paginas/CursoDetalle'
import { Cursos } from './paginas/Cursos'
import { EmpleadoDetalle } from './paginas/EmpleadoDetalle'
import { Empleados } from './paginas/Empleados'
import { Estructura } from './paginas/Estructura'
import { Login } from './paginas/Login'
import { RequiereSesion } from './sesion/RequiereSesion'
import { SesionProvider } from './sesion/SesionProvider'

function NoEncontrada() {
  return (
    <>
      <h1>Página no encontrada</h1>
      <p className="vacio">
        Esta dirección no existe. Vuelve a <Link to="/empleados">Empleados</Link> o a <Link to="/cursos">Cursos</Link>.
      </p>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequiereSesion>
                <Estructura />
              </RequiereSesion>
            }
          >
            <Route index element={<Navigate to="/empleados" replace />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="empleados/:id" element={<EmpleadoDetalle />} />
            <Route path="cursos" element={<Cursos />} />
            <Route path="cursos/:id" element={<CursoDetalle />} />
            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  )
}