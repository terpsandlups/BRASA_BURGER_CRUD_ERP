import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

const links = [
  { to: '/', label: 'Painel', end: true },
  { to: '/pedidos', label: 'Pedidos' },
  { to: '/historico', label: 'Histórico' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/produtos', label: 'Produtos & Fichas Técnicas' },
  { to: '/estoque', label: 'Estoque' },
]

export default function Sidebar() {
  const { usuario, sair } = useAuth()

  return (
    <aside className="w-64 shrink-0 bg-carvao text-osso min-h-screen flex flex-col">
      <div className="px-6 py-8 border-b border-superficie2">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-ambar">
          Brasa Burguer
        </h1>
        <p className="text-xs text-fumaca mt-1">Painel de Gestão · Rede de Unidades</p>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `block px-4 py-2.5 rounded-sm font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-ambar text-carvao'
                  : 'text-osso/80 hover:bg-superficie2 hover:text-osso'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-superficie2 text-xs">
        <p className="text-osso">{usuario?.nome}</p>
        <p className="text-fumaca">
          {usuario?.perfis?.nome} · {usuario?.lojas?.nome ?? 'Todas as unidades'}
        </p>
        <button onClick={sair} className="mt-2 text-ambar hover:underline">
          Sair
        </button>
      </div>
    </aside>
  )
}
