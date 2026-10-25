import { useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Login() {
  const { entrar } = useAuth()
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
    <div className="min-h-screen flex items-center justify-center bg-carvao">
      <form onSubmit={handleSubmit} className="bg-superficie text-osso p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-ambar mb-1">Convivium</h1>
        <p className="text-xs text-fumaca mb-6">Management System · Acesso da equipe</p>

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

        {erro && <p className="text-sm text-brasa mb-4">{erro}</p>}

        <button
          disabled={enviando}
          className="w-full bg-ambar text-carvao font-medium px-5 py-2.5 hover:bg-osso transition-colors"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
        <a href="/pedir" className="block text-center text-sm text-ambar underline mt-5">Fazer um pedido</a>
      </form>
    </div>
  )
}
