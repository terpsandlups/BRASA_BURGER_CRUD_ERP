import { useAuth } from '../../lib/AuthContext.jsx'
import { useEffect, useState } from 'react'
import Icon from '../ui/Icon.jsx'

export default function Topbar({ onAbrirMenu, menuAberto }) {
  const { usuario, sair } = useAuth()
  const [online, setOnline] = useState(navigator.onLine)
  const [erro, setErro] = useState('')
  const [saindo, setSaindo] = useState(false)
  async function encerrar() {
    setSaindo(true)
    try { await sair() } catch { setErro('Não foi possível sair. Tente novamente.') }
    finally { setSaindo(false) }
  }
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine)
    window.addEventListener('online', atualizar)
    window.addEventListener('offline', atualizar)
    return () => { window.removeEventListener('online', atualizar); window.removeEventListener('offline', atualizar) }
  }, [])

  return (
    <header className="app-topbar min-h-16 shrink-0 bg-branco border-b border-borda flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
      <button type="button" onClick={onAbrirMenu} aria-label="Abrir menu" aria-expanded={menuAberto}
        className="lg:hidden rounded-lg border border-borda px-3 py-2 text-sm"><Icon nome="menu" size={18} /><span className="sr-only sm:not-sr-only">Menu</span></button>
      <div className="flex items-center gap-2 text-xs text-fumaca">
        <span className={`w-2 h-2 rounded-full inline-block ${online ? 'bg-oliva' : 'bg-brasa'}`} />
        <span className="hidden sm:inline">{online ? 'Sessão ativa' : 'Sem conexão'}</span>
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <div className="text-right leading-tight min-w-0">
          <p className="text-sm font-medium text-texto">{usuario?.nome}</p>
          <p className="text-xs text-fumaca truncate max-w-44 sm:max-w-none">
            {usuario?.perfis?.nome} · {usuario?.lojas?.nome ?? 'Todas as unidades'}
          </p>
        </div>
        {erro && <p role="alert" className="text-xs text-brasa">{erro}</p>}
        <button onClick={encerrar} disabled={saindo} className="text-sm text-ambar hover:underline">
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </header>
  )
}
