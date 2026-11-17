import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <React.Suspense fallback={<p role="status" className="p-8">Carregando aplicação…</p>}><App /></React.Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
