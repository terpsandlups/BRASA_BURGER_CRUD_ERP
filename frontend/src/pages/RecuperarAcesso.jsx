import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { atualizarSenhaRecuperada, solicitarRecuperacao, urlRecuperacao } from '../lib/recuperacaoAcesso.js'
import './login.css'

export default function RecuperarAcesso() {
  const { session, sair, encerrarRecuperacao } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [conta, setConta] = useState(null)
  const [erroLink] = useState(() => new URLSearchParams(window.location.hash.slice(1)).has('error'))
  const [validando, setValidando] = useState(!!session && !erroLink)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [espera, setEspera] = useState(0)
  const trava = useRef(false)
  const usuarioId = session?.user.id

  useEffect(() => {
    let atual = true
    setConta(null)
    setSenha(''); setConfirmacao('')
    if (!usuarioId || erroLink) { setValidando(false); return () => { atual = false } }
    setValidando(true)
    supabase.auth.getUser().then(({ data, error }) => {
      if (atual) {
        if (!error && data?.user?.id === usuarioId) setConta(data.user)
        else setErro('Sua sessão expirou. Solicite um novo link de recuperação.')
      }
    }).catch(() => { if (atual) setErro('Não foi possível verificar o link. Confira a conexão e tente novamente.') })
      .finally(() => { if (atual) setValidando(false) })
    return () => { atual = false }
  }, [usuarioId, erroLink])

  useEffect(() => {
    if (!espera) return
    const timer = setInterval(() => setEspera(n => Math.max(0, n - 1)), 1000)
    return () => clearInterval(timer)
  }, [espera > 0])

  async function enviarLink(event) {
    event.preventDefault()
    if (trava.current || espera) return
    trava.current = true; setEnviando(true); setErro(''); setAviso('')
    try {
      await solicitarRecuperacao(supabase.auth, email, urlRecuperacao(window.location.origin, import.meta.env.BASE_URL))
      setAviso('Se houver uma conta para esse e-mail, você receberá um link para criar uma nova senha. Confira a caixa de entrada e o spam. Use o link mais recente.')
      setEspera(60)
    } catch (error) { setErro(error.message) }
    finally { trava.current = false; setEnviando(false) }
  }

  async function salvarSenha(event) {
    event.preventDefault()
    if (trava.current || !conta) return
    trava.current = true; setEnviando(true); setErro(''); setAviso('')
    try {
      await atualizarSenhaRecuperada(supabase.auth, { senha, confirmacao, usuarioId: conta.id })
      setSenha(''); setConfirmacao('')
      try { await sair(); navigate('/?senha=atualizada', { replace: true }) }
      catch { setAviso('Senha atualizada. Use a nova senha no próximo acesso.'); setConta(null) }
    } catch (error) { setErro(error.message) }
    finally { trava.current = false; setEnviando(false) }
  }

  return <main className="app-shell login-shell">
    <section className="login-story">
      <div className="login-platform"><b>C</b><span>Convívium<small>MANAGEMENT SYSTEM</small></span></div>
      <p className="login-eyebrow">ACESSO DA EQUIPE</p>
      <h1>Sua conta.<br /><span>Seu acesso de volta.</span></h1>
      <p>Recupere o acesso pelo e-mail cadastrado. Seu perfil, empresa e unidades continuam os mesmos.</p>
    </section>
    <form onSubmit={conta ? salvarSenha : enviarLink} className="login-form" aria-label="Recuperar acesso">
      <p className="login-eyebrow">CONVÍVIUM ERP</p>
      <h1 className="text-2xl font-semibold text-ambar">{conta ? 'Criar nova senha' : 'Recuperar acesso'}</h1>
      {validando ? <p role="status">Verificando seu link…</p> : <>
        {erroLink && <p role="alert" className="login-notice">O link expirou ou já foi utilizado. Solicite um novo link abaixo.</p>}
        {conta ? <>
          <p className="login-account-email">Conta: {conta.email}</p>
          <label htmlFor="nova-senha">Nova senha</label>
          <input id="nova-senha" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={senha} onChange={e => setSenha(e.target.value)} disabled={enviando} aria-describedby="regra-senha" />
          <p id="regra-senha" className="login-password-hint">Use pelo menos 8 caracteres. Prefira uma senha única.</p>
          <label htmlFor="confirmar-senha">Confirmar nova senha</label>
          <input id="confirmar-senha" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} disabled={enviando} />
        </> : <>
          <p className="login-recovery-description">Informe o e-mail da sua conta da equipe. Você definirá a nova senha no link recebido.</p>
          <label htmlFor="recuperacao-email">E-mail cadastrado</label>
          <input id="recuperacao-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={enviando} />
        </>}
        {erro && <p role="alert" className="text-brasa login-notice">{erro}</p>}
        {aviso && <p role="status" className="login-notice">{aviso}</p>}
        <button disabled={enviando || (!conta && espera > 0)}>{enviando ? 'Aguarde…' : conta ? 'Salvar nova senha' : espera ? `Aguarde ${espera}s para reenviar` : 'Enviar link de recuperação'}</button>
      </>}
      <Link to="/" onClick={encerrarRecuperacao} className="login-recovery-link">Voltar ao acesso da equipe</Link>
    </form>
  </main>
}
