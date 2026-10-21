import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo, React (puerto 5173) reenvía las llamadas /api a Django (8002).
// Para el navegador todo sale del mismo origen, igual que en producción,
// donde Django servirá la API y el build de React desde el mismo puerto.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Si el 5173 está ocupado (p. ej. por el frontend de otro proyecto), falla
    // en vez de saltar al 5174: un cambio silencioso de puerto rompería
    // DJANGO_CSRF_TRUSTED_ORIGINS y el login fallaría sin motivo aparente.
    strictPort: true,
    proxy: {
      // 8002: el 8000 y el 8001 los usan otros aplicativos.
      // Es el mismo puerto que usará el servicio NSSM en producción.
      '/api': 'http://localhost:8002',
    },
  },
})