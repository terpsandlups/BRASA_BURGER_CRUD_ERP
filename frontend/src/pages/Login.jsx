import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { useLocation } from 'react-router-dom'
import Icon from '../components/ui/Icon.jsx'
import './login.css'
import { enderecoPortal } from '../lib/linksAplicacoes.js'

export default function Login() {
  const { entrar } = useAuth()
  const location=useLocation()
  const marca=new URLSearchParams(location.search).get('marca') || 'brasa-burger'
  const [identidade,setIdentidade]=useState(null)
  useEffect(()=>{let ativo=true;supabase.rpc('cardapio_mobile',{p_slug:marca}).then(({data})=>{if(ativo)setIdentidade(data?.empresa || null)}).catch(()=>{});return()=>{ativo=false}},[marca])
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const emCurso = useRef(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (emCurso.current) return
    emCurso.current = true
    setErro('')
    setEnviando(true)
    try {
      const { error } = await entrar(email, senha)
      if (error) setErro(error.status === 400 ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar. Confira sua conexão e tente novamente.')
    } catch { setErro('Não foi possível conectar. Tente novamente.') }
    finally { emCurso.current = false; setEnviando(false) }
  }

  return (
    <main className="app-shell login-shell" style={{'--ui-gold':identidade?.cor || '#e4ae65'}}>
      <section className="login-story"><div className="login-platform"><b>C</b><span>Convívium<small>MANAGEMENT SYSTEM</small></span></div><p className="login-eyebrow">ERP DA EMPRESA</p><h1>Sua operação.<br /><span>Uma visão completa.</span></h1><p>Pedidos, catálogo, insumos e custos no ambiente de gestão da sua empresa.</p><div className="login-modules">{[['pedido','Pedidos'],['produto','Catálogo'],['estoque','Estoque'],['analytics','Indicadores']].map(([icone,nome])=><span key={icone}><Icon nome={icone} size={18} />{nome}</span>)}</div><small>Personalizado para a sua marca. Por Convívium.</small></section>
      <form onSubmit={handleSubmit} className="login-form">
        <p className="login-eyebrow">ACESSO DA EQUIPE</p>
        {identidade?.logo_url && <img src={identidade.logo_url} alt="" className="h-16 w-16 object-contain mb-4" />}
        <h1 className="font-display text-2xl font-semibold text-ambar mb-1">{identidade?.nome || 'Convívium'}</h1>
        <p className="text-xs text-fumaca mb-6">Entre com sua conta para gerenciar a operação.</p>

        <label htmlFor="login-email" className="text-xs uppercase tracking-wide text-fumaca">E-mail</label>
        <input
          type="email"
          id="login-email" autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar"
        />

        <label htmlFor="login-senha" className="text-xs uppercase tracking-wide text-fumaca">Senha</label>
        <input
          type="password"
          id="login-senha" autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar"
        />

        {erro && <p role="alert" className="text-sm text-brasa mb-4">{erro}</p>}

        <button
          disabled={enviando}
          className="w-full bg-ambar text-carvao font-medium px-5 py-2.5 hover:bg-osso transition-colors"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
        {enderecoPortal(marca) && <a href={enderecoPortal(marca)} target="_blank" rel="noopener" className="block text-center text-sm text-ambar underline mt-5">Portal do consumidor ↗</a>}
        <p className="text-xs text-fumaca mt-6 text-center">Acesso conforme seu perfil, empresa e unidade.</p>
      </form>
    </main>
  )
}
