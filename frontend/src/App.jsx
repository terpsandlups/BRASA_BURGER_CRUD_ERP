import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clientes from './pages/Clientes.jsx'
import Produtos from './pages/Produtos.jsx'
import Pedidos from './pages/Pedidos.jsx'
import Historico from './pages/Historico.jsx'
import Estoque from './pages/Estoque.jsx'
import Analytics from './pages/Analytics.jsx'
import Entregas from './pages/Entregas.jsx'

function AreaProtegida() {
  const { session, carregando } = useAuth()

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-carvao text-osso">Carregando...</div>
  }
  if (!session) {
    return <Login />
  }

  return (
    <div className="flex min-h-screen bg-osso">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-10 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/entregas" element={<Entregas />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AreaProtegida />
    </AuthProvider>
  )
}
