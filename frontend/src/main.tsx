import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App.tsx'
import { Toaster } from './components/ui/sonner.tsx'

import './index.css'
import "./fonts.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter> {/* Wrap App with BrowserRouter */}
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
)
