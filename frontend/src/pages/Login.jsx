import { useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Login() {
  const { entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await entrar(email, senha)
    setEnviando(false)
    if (error) setErro('E-mail ou senha inválidos.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-carvao">
      <form onSubmit={handleSubmit} className="bg-superficie text-osso p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-ambar mb-1">Brasa Burguer</h1>
        <p className="text-xs text-fumaca mb-6">Painel de Gestão</p>

        <label className="text-xs uppercase tracking-wide text-fumaca">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar"
        />

        <label className="text-xs uppercase tracking-wide text-fumaca">Senha</label>
        <input
          type="password"
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
      </form>
    </div>
  )
}
