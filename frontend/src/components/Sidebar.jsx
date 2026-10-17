import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

const links = [
  { to: '/', label: 'Painel', end: true, modulo: 'vendas' },
  { to: '/analytics', label: 'Analytics', modulo: 'vendas' },
  { to: '/entregas', label: 'Entregas', modulo: 'vendas' },
  { to: '/pedidos', label: 'Pedidos', modulo: 'vendas' },
  { to: '/historico', label: 'Histórico', modulo: 'vendas' },
  { to: '/clientes', label: 'Clientes', modulo: 'clientes' },
  { to: '/produtos', label: 'Produtos & Fichas Técnicas', modulo: 'produtos' },
  { to: '/estoque', label: 'Estoque', modulo: 'estoque' },
]

export function Navegacao({ onNavegar, escuro = false }) {
  const { podeOperar } = useAuth()
  return <nav aria-label="Menu principal" className="space-y-1.5">
    {links.filter(link => podeOperar(link.modulo)).map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={onNavegar}
      className={({ isActive }) => `block px-4 py-3 rounded-lg font-medium text-sm transition-colors ${isActive
        ? 'bg-ambar text-carvao'
        : escuro ? 'text-osso/80 hover:bg-superficie2 hover:text-osso' : 'text-texto hover:bg-osso'}`}>
      {link.label}
    </NavLink>)}
  </nav>
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 bg-carvao text-osso h-dvh sticky top-0 flex-col overflow-y-auto">
      <div className="px-6 py-8 border-b border-superficie2">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-ambar">
          Brasa Burguer
        </h1>
        <p className="text-xs text-fumaca mt-1">Painel de Gestão · Rede de Unidades</p>
      </div>

      <div className="flex-1 px-3 py-6"><Navegacao escuro /></div>
      <p className="px-6 pb-6 text-xs text-osso/50">Operação · Gestão · Resultados</p>
    </aside>
  )
}
