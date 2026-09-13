import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState(null) // linha da tabela usuarios (perfil, loja)
  const [carregando, setCarregando] = useState(true)

  async function carregarUsuario(userId) {
    const { data } = await supabase
      .from('usuarios')
      .select('*, perfis(nome), lojas(nome)')
      .eq('id', userId)
      .single()
    setUsuario(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) carregarUsuario(session.user.id)
      setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) carregarUsuario(session.user.id)
      else setUsuario(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function entrar(email, senha) {
    return supabase.auth.signInWithPassword({ email, password: senha })
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  // Verifica permissão de um módulo. Administrador/Gerente sempre passam
  // (ajuste a regra fina ao integrar a tabela `permissoes` nas próximas fases).
  function podeAcessar(perfisPermitidos) {
    if (!usuario) return false
    return perfisPermitidos.includes(usuario.perfis?.nome)
  }

  return (
    <AuthContext.Provider value={{ session, usuario, carregando, entrar, sair, podeAcessar }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
