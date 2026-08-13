import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const isOficinaDomain = window.location.hostname.startsWith('oficina');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App isOficinaDomain={isOficinaDomain} />
  </StrictMode>,
)
