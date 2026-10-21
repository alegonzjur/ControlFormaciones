import { createContext, useContext } from 'react'

// usuario: undefined = comprobando sesión, null = sin sesión, objeto = conectado
//   { username, nombre, grupos: [...], puede_editar: bool }
export const SesionContexto = createContext(null)

export function useSesion() {
  return useContext(SesionContexto)
}