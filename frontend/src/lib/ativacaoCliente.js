import { emailEquipe } from './recuperacaoAcesso.js'
import { validarCPF } from './format.js'

// Nenhum dado pessoal é consultado a partir de um CPF público.
export async function solicitarAtivacaoCliente(auth,{cpf,email,retorno}) {
  if(!validarCPF(String(cpf).replace(/\D/g,''))) throw new Error('Confira o CPF do seu cadastro na loja.')
  const endereco=emailEquipe(email)
  const url=new URL(retorno)
  if(!['https:','http:'].includes(url.protocol)) throw new Error('Endereço de retorno inválido.')
  const {error}=await auth.signInWithOtp({email:endereco,options:{shouldCreateUser:true,emailRedirectTo:url.href}})
  if(error) throw new Error(error.status===429 ? 'Limite de envios atingido. Aguarde e confira também a pasta de spam.' : 'Não foi possível enviar a confirmação. Tente mais tarde ou peça à loja para conferir seu e-mail cadastrado.')
}
