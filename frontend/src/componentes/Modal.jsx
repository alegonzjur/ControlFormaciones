import { useEffect, useId, useRef } from 'react'

// Ventana modal sobre el elemento nativo <dialog>: el navegador se encarga de
// bloquear el fondo, cerrar con Esc y mantener el foco dentro.
export function Modal({ titulo, abierto, onCerrar, children, ancho = 'normal' }) {
  const ref = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className={`modal modal--${ancho}`}
      aria-labelledby={idTitulo}
      onClose={onCerrar}
    >
      <div className="modal__cabecera">
        <h2 id={idTitulo}>{titulo}</h2>
        <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
          ×
        </button>
      </div>
      {/* El contenido solo se monta abierto: cada apertura empieza limpia */}
      {abierto && <div className="modal__cuerpo">{children}</div>}
    </dialog>
  )
}