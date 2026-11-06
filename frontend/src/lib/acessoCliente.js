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

export async function acessarContaCliente(auth, { cadastro, email, senha, retorno }) {
  const credenciais = { email: email.trim(), password: senha }
  const { data, error } = cadastro
    ? await auth.signUp({ ...credenciais, options: { emailRedirectTo: retorno } })
    : await auth.signInWithPassword(credenciais)
  if (error) throw new Error(mensagemAcessoCliente(error))
  return data
}

export async function reenviarConfirmacaoCliente(auth, email, retorno) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Informe seu e-mail para reenviar a confirmação.')
  const { error } = await auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: retorno } })
  if (error) throw new Error(mensagemAcessoCliente(error))
}
