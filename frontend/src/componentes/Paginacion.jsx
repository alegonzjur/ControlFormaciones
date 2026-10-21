// La API pagina de 25 en 25 (PAGE_SIZE en settings.py).
const TAMANO_PAGINA = 25

export function Paginacion({ total, pagina, onCambiar }) {
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA))
  if (paginas === 1) return null
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button
        type="button"
        className="boton boton--secundario"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        Anterior
      </button>
      <span>
        Página {pagina} de {paginas}
      </span>
      <button
        type="button"
        className="boton boton--secundario"
        disabled={pagina >= paginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente
      </button>
    </nav>
  )
}