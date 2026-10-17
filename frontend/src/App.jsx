import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import Sidebar, { Navegacao } from './components/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import SidePanel from './components/layout/SidePanel.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import Login from './pages/Login.jsx'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Clientes = lazy(() => import('./pages/Clientes.jsx'))
const Produtos = lazy(() => import('./pages/Produtos.jsx'))
const Pedidos = lazy(() => import('./pages/Pedidos.jsx'))
const Historico = lazy(() => import('./pages/Historico.jsx'))
const Estoque = lazy(() => import('./pages/Estoque.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const Entregas = lazy(() => import('./pages/Entregas.jsx'))

function Acesso({ modulo, children }) {
  const { podeOperar } = useAuth()
  return podeOperar(modulo) ? children : <div role="alert" className="rounded-xl border border-borda bg-branco p-6">
    <h1 className="text-2xl mb-2">Acesso restrito</h1>
    <p className="text-sm text-fumaca">Seu perfil não possui acesso a este módulo. Use o menu para abrir uma área disponível.</p>
  </div>
}

function AreaProtegida() {
  const { session, usuario, carregando, erroUsuario, recarregarUsuario, sair } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()
  useEffect(() => { setMenuAberto(false) }, [location.pathname])

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-carvao text-osso">Carregando...</div>
  }
  if (!session) {
    return <Login />
  }
  if (erroUsuario || !usuario) return <div role="alert" className="min-h-screen bg-osso flex items-center justify-center p-6">
    <div className="bg-branco border border-borda rounded-xl p-6 max-w-lg space-y-4">
      <h1 className="text-2xl">Não foi possível carregar seu acesso</h1>
      <p>{erroUsuario || 'Carregue novamente seu perfil para continuar.'}</p>
      <button className="bg-ambar rounded-lg px-4 py-3 mr-3" onClick={recarregarUsuario}>Tentar novamente</button>
      <button className="underline" onClick={() => sair().catch(() => window.location.reload())}>Voltar ao login</button>
    </div>
  </div>

  return (
    <div className="flex min-h-screen bg-osso">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onAbrirMenu={() => setMenuAberto(true)} menuAberto={menuAberto} />
        <main id="conteudo" className="flex-1 min-w-0 px-4 py-5 sm:px-6 lg:py-8 xl:px-8">
          <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<div role="status" className="bg-branco border border-borda rounded-xl p-8 text-fumaca">Carregando página…</div>}>
          <Routes>
            <Route path="/" element={<Acesso modulo="vendas"><Dashboard /></Acesso>} />
            <Route path="/pedidos" element={<Acesso modulo="vendas"><Pedidos /></Acesso>} />
            <Route path="/historico" element={<Acesso modulo="vendas"><Historico /></Acesso>} />
            <Route path="/clientes" element={<Acesso modulo="clientes"><Clientes /></Acesso>} />
            <Route path="/produtos" element={<Acesso modulo="produtos"><Produtos /></Acesso>} />
            <Route path="/estoque" element={<Acesso modulo="estoque"><Estoque /></Acesso>} />
            <Route path="/analytics" element={<Acesso modulo="vendas"><Analytics /></Acesso>} />
            <Route path="/entregas" element={<Acesso modulo="vendas"><Entregas /></Acesso>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <SidePanel aberto={menuAberto} onFechar={() => setMenuAberto(false)} titulo="Brasa Burguer">
        <Navegacao onNavegar={() => setMenuAberto(false)} />
      </SidePanel>
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
