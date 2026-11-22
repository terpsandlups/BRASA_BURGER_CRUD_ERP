export function emailEquipe(valor) {
  const email = String(valor || '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.')
  return email
}

export function urlRecuperacao(origem, base = '/') {
  const url = new URL(origem)
  if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origem || !/^\/(?:[\w-]+\/)*$/.test(base)) throw new Error('Endereço de retorno inválido.')
  return new URL(base + '?acesso=recuperar', url).href
}

export function mensagemErroLogin(erro) {
  if (erro?.status === 429 || ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(erro?.code)) return 'Muitas tentativas em sequência. Aguarde um minuto antes de tentar novamente.'
  if (erro?.code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Confira também a pasta de spam.'
  if (erro?.code === 'user_banned') return 'Esta conta está com acesso suspenso. Contate o responsável pela plataforma.'
  if (erro?.code === 'invalid_credentials' || erro?.status === 400) return 'E-mail ou senha inválidos. Confira os dados ou use “Esqueci minha senha”.'
  return 'Não foi possível entrar. Confira sua conexão e tente novamente.'
}

export async function solicitarRecuperacao(auth, email, retorno) {
  const { error } = await auth.resetPasswordForEmail(emailEquipe(email), { redirectTo: retorno })
  if (error) {
    if (error.status === 429) throw new Error('Limite de envios atingido. Aguarde antes de solicitar outro link; confira também a pasta de spam.')
    throw new Error('Não foi possível enviar o link de recuperação. Tente mais tarde ou contate o responsável pela plataforma.')
  }
}

export async function atualizarSenhaRecuperada(auth, { senha, confirmacao, usuarioId }) {
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128) throw new Error('Use uma senha entre 8 e 128 caracteres.')
  if (senha !== confirmacao) throw new Error('As senhas não coincidem.')
  if (!usuarioId) throw new Error('Abra o link de recuperação recebido no e-mail.')
  const { data, error: erroSessao } = await auth.getUser()
  if (erroSessao || !data?.user || data.user.id !== usuarioId) throw new Error('Sua sessão mudou ou expirou. Solicite um novo link de recuperação.')
  const { error } = await auth.updateUser({ password: senha })
  if (error?.code === 'same_password') throw new Error('Escolha uma senha diferente da anterior.')
  if (error?.code === 'weak_password') throw new Error('A senha não atende às regras de segurança. Use uma senha mais forte.')
  if (error) throw new Error('Não foi possível atualizar a senha. O link pode ter expirado; solicite outro se necessário.')
}
