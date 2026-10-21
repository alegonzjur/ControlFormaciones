// Estado del empleado: se deduce de fecha_baja (activo = sin fecha de baja).
export function Situacion({ activo }) {
  return activo ? (
    <span className="situacion situacion--activo">Activo</span>
  ) : (
    <span className="situacion situacion--baja">De baja</span>
  )
}