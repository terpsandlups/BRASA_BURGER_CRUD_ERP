import { validarCPF } from './format.js'

export function armazenamentoDaSessao() {
  try { return window.sessionStorage } catch { return null }
}

export function mensagemAcessoCliente(error) {
  if (error?.code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação abaixo.'
  if (error?.code === 'invalid_credentials') return 'E-mail ou senha inválidos.'
  if (error?.code === 'signup_disabled') return 'O cadastro está temporariamente indisponível. Entre em contato com a loja.'
  if (error?.code === 'weak_password') return 'Escolha uma senha mais forte, com pelo menos oito caracteres.'
  if (error?.status === 429 || /rate_limit/.test(error?.code || '')) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
  return 'Não foi possível acessar sua conta. Confira sua conexão e tente novamente.'
}

export async function acessarContaCliente(auth, { cadastro, email, senha, retorno, cpf, nome, telefone }, functions) {
  const credenciais = { email: email.trim(), password: senha }
  if ((functions && cadastro && cpf) || (!cadastro && !email.includes('@'))) {
    const documento=(cadastro ? cpf : email).replace(/\D/g,'')
    if(!validarCPF(documento)) throw new Error('Confira o CPF.')
    if(!functions) throw new Error('Acesso por CPF indisponível. Entre com seu e-mail ou contate a loja.')
    const { data, error }=await functions.invoke('acesso-cliente',{body:{cpf:documento,senha,...(cadastro ? {acao:'cadastro',nome:nome?.trim(),telefone:telefone?.replace(/\D/g,'')} : {})}})
    if(error){let mensagem='Não foi possível entrar com CPF. Confira sua conexão e tente novamente.';try{mensagem=(await error.context?.json())?.error || mensagem}catch{/* Falha de transporte. */}throw new Error(mensagem)}
    if(!data?.access_token || !data?.refresh_token) throw new Error('O servidor não confirmou o acesso. Tente novamente.')
    const resposta=await auth.setSession(data)
    if(resposta.error) throw new Error(mensagemAcessoCliente(resposta.error))
    return resposta.data
  }
  const perfil=cpf ? {cpf:cpf.replace(/\D/g,''),nome:nome?.trim(),telefone:telefone?.replace(/\D/g,'')} : null
  if(perfil && (!validarCPF(perfil.cpf) || !perfil.nome || perfil.nome.length<2 || !/^\d{10,11}$/.test(perfil.telefone || ''))) throw new Error('Confira CPF, nome e telefone do cadastro.')
  const { data, error } = cadastro
    ? await auth.signUp({ ...credenciais, options: { emailRedirectTo: retorno, ...(perfil ? {data:perfil} : {}) } })
    : await auth.signInWithPassword(credenciais)
  if (error) throw new Error(mensagemAcessoCliente(error))
  return data
}

export async function reenviarConfirmacaoCliente(auth, email, retorno) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Informe seu e-mail para reenviar a confirmação.')
  const { error } = await auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: retorno } })
  if (error) throw new Error(mensagemAcessoCliente(error))
}
