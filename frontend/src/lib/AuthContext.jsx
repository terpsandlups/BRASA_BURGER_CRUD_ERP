import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'
import { temPermissao } from './permissoes.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState(null) // linha da tabela usuarios (perfil, loja)
  const [permissoes, setPermissoes] = useState([])
  const [sessaoPronta, setSessaoPronta] = useState(false)
  const [carregandoUsuario, setCarregandoUsuario] = useState(true)
  const [erroUsuario, setErroUsuario] = useState('')
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return
      if (error) setErroUsuario('Não foi possível recuperar sua sessão. Recarregue a página.')
      setSession(data?.session || null)
      setSessaoPronta(true)
    }).catch(() => { if (ativo) { setErroUsuario('Não foi possível conectar. Recarregue a página.'); setSessaoPronta(true) } })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setSessaoPronta(true)
    })

    return () => { ativo = false; listener.subscription.unsubscribe() }
  }, [])

  // Consultas de perfil ficam fora do callback de autenticação e respostas de
  // uma sessão antiga não podem substituir o usuário que acabou de entrar.
  const userId = session?.user.id
  useEffect(() => {
    let ativo = true
    setUsuario(null)
    setPermissoes([])
    if (!userId) { setCarregandoUsuario(false); return () => { ativo = false } }
    setCarregandoUsuario(true)
    setErroUsuario('')
    ;(async () => {
      try {
        const { data, error } = await supabase.from('usuarios').select('*, perfis(nome), lojas(nome)').eq('id', userId).maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Sua conta não tem acesso à equipe. Para fazer pedidos, abra o portal do cliente.')
        if (!data.ativo) throw new Error('Seu usuário está inativo. Solicite a liberação ao administrador.')
        const { data: regras, error: erroRegras } = await supabase.from('permissoes').select('*').eq('perfil_id', data.perfil_id)
        if (erroRegras) throw erroRegras
        if (ativo) { setPermissoes(regras || []); setUsuario(data) }
      } catch (error) {
        if (ativo) setErroUsuario(error.message || 'Não foi possível carregar seu perfil.')
      } finally { if (ativo) setCarregandoUsuario(false) }
    })()
    return () => { ativo = false }
  }, [userId, tentativa])
  const carregando = !sessaoPronta || (!!session && (carregandoUsuario || (!usuario && !erroUsuario)))

  async function entrar(email, senha) {
    return supabase.auth.signInWithPassword({ email, password: senha })
  }

  async function sair() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  function podeAcessar(perfisPermitidos) {
    if (!usuario) return false
    return perfisPermitidos.includes(usuario.perfis?.nome)
  }

  return (
    <AuthContext.Provider value={{ session, usuario, carregando, erroUsuario, recarregarUsuario: () => setTentativa(n => n + 1), entrar, sair, podeAcessar,
      podeOperar: (modulo, acao) => temPermissao(usuario, permissoes, modulo, acao) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
