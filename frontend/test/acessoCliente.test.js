import test from 'node:test'
import assert from 'node:assert/strict'
import { acessarContaCliente, mensagemAcessoCliente, reenviarConfirmacaoCliente, armazenamentoDaSessao } from '../src/lib/acessoCliente.js'

test('cliente entra com senha existente de seis caracteres e e-mail normalizado', async () => {
  const auth = { async signInWithPassword(dados) { assert.deepEqual(dados,{email:'cliente@example.test',password:'abc123'}); return {data:{session:{user:{id:'cliente'}}}} } }
  const dados=await acessarContaCliente(auth,{cadastro:false,email:' cliente@example.test ',senha:'abc123'})
  assert.equal(dados.session.user.id,'cliente')
})

test('cadastro retorna confirmação pendente e preserva retorno ao portal da marca', async () => {
  const auth = { async signUp(dados) { assert.equal(dados.options.emailRedirectTo,'https://loja.example/pedir/brasa-burger'); return {data:{session:null}} } }
  assert.equal((await acessarContaCliente(auth,{cadastro:true,email:'a@example.test',senha:'senha-teste',retorno:'https://loja.example/pedir/brasa-burger'})).session,null)
})

test('cliente recebe orientação para e-mail não confirmado e limite de tentativas', async () => {
  const auth={async signInWithPassword(){return {error:{code:'email_not_confirmed'}}}}
  await assert.rejects(acessarContaCliente(auth,{cadastro:false,email:'a@example.test',senha:'abc123'}),/Confirme seu e-mail/)
  assert.match(mensagemAcessoCliente({status:429}),/Aguarde/)
  assert.doesNotMatch(mensagemAcessoCliente({message:'detalhe interno secreto'}),/secreto/)
})

test('reenvio exige e-mail e usa confirmação de cadastro no retorno correto', async () => {
  const auth={async resend(dados){assert.deepEqual(dados,{type:'signup',email:'a@example.test',options:{emailRedirectTo:'https://loja.example/pedir/marca'}});return {error:null}}}
  await assert.rejects(reenviarConfirmacaoCliente(auth,'','retorno'),/Informe seu e-mail/)
  await reenviarConfirmacaoCliente(auth,' a@example.test ','https://loja.example/pedir/marca')
})

test('bloqueio do armazenamento do navegador permite continuar sem persistência', () => {
  const anterior=Object.getOwnPropertyDescriptor(globalThis,'window')
  Object.defineProperty(globalThis,'window',{configurable:true,value:{get sessionStorage(){throw new Error('SecurityError')}}})
  try { assert.equal(armazenamentoDaSessao(),null) } finally { if(anterior) Object.defineProperty(globalThis,'window',anterior);else delete globalThis.window }
})
