import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
const PortalCliente = lazy(() => import('./pages/PortalCliente.jsx'))
const ErpApp = lazy(() => import('./ErpApp.jsx'))

// Entrada integrada para o MVP e a aula, com a área da equipe protegida no ERP.
export default function App() {
  return <ErrorBoundary><Suspense fallback={<p role="status" className="p-8">Carregando aplicação…</p>}><Routes>
    <Route path="/pedir" element={<PortalCliente />} />
    <Route path="/pedir/:marca" element={<PortalCliente />} />
    <Route path="*" element={<ErpApp />} />
  </Routes></Suspense></ErrorBoundary>
}
