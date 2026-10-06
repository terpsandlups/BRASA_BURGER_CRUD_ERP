import { useAuth } from '../../lib/AuthContext.jsx'

export default function Topbar() {
  const { usuario, sair } = useAuth()

  return (
    <header className="h-16 shrink-0 bg-branco border-b border-borda flex items-center justify-between px-8">
      <div className="flex items-center gap-2 text-xs text-fumaca">
        <span className="w-2 h-2 rounded-full bg-oliva inline-block" />
        Sessão ativa
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-texto">{usuario?.nome}</p>
          <p className="text-xs text-fumaca">
            {usuario?.perfis?.nome} · {usuario?.lojas?.nome ?? 'Todas as unidades'}
          </p>
        </div>
        <button onClick={sair} className="text-sm text-ambar hover:underline">
          Sair
        </button>
      </div>
    </header>
  )
}
