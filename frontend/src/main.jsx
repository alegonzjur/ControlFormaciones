import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuente incluida en el build: no depende de que el servidor tenga internet
import '@fontsource-variable/public-sans/wght.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)