import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { SessionProvider } from './context/Session.tsx'
import { Toaster } from './components/Toaster.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
        <Toaster />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
