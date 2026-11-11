import test from 'node:test'
import assert from 'node:assert/strict'
import { criarAcessoCliente } from '../../supabase/functions/acesso-cliente/handler.mjs'

const origem='https://loja.example'
const req=(body,origin=origem)=>new Request('https://api.example/functions/v1/acesso-cliente',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
test('CPF e senha retornam somente tokens depois de validação real pelo Auth',async()=>{
  const handler=criarAcessoCliente({allowedOrigins:[origem],resolverConta:async cpf=>{assert.equal(cpf,'52998224725');return 'privado@example.test'},autenticar:async(email,senha)=>{assert.equal(email,'privado@example.test');assert.equal(senha,'segredo-teste');return {data:{session:{access_token:'token',refresh_token:'renovar',user:{email}}}}}})
  const resposta=await handler(req({cpf:'529.982.247-25',senha:'segredo-teste'}))
  assert.equal(resposta.status,200);assert.equal(resposta.headers.get('Cache-Control'),'no-store')
  assert.deepEqual(await resposta.json(),{access_token:'token',refresh_token:'renovar'})
})
test('CPF inexistente e senha incorreta não revelam identidade ou existência da conta',async()=>{
  const falha=async email=>criarAcessoCliente({allowedOrigins:[origem],resolverConta:async()=>email,autenticar:async()=>({error:{message:'detalhe sensível'}})})(req({cpf:'52998224725',senha:'incorreta'}))
  const [a,b]=await Promise.all([falha(null),falha('privado@example.test')])
  assert.equal(a.status,401);assert.equal(b.status,401);assert.deepEqual(await a.json(),await b.json())
})
test('login CPF recusa origem, corpo excessivo e esgotamento antes de conferir senha',async()=>{
  let chamadas=0
  const handler=criarAcessoCliente({allowedOrigins:[origem],resolverConta:async()=>'__limite__',autenticar:async()=>{chamadas++}})
  assert.equal((await handler(req({cpf:'52998224725',senha:'teste'},'https://invasor.example'))).status,403)
  assert.equal((await handler(req({cpf:'52998224725',senha:'x'.repeat(3000)}))).status,413)
  assert.equal((await handler(req({cpf:'52998224725',senha:'teste'}))).status,429)
  assert.equal(chamadas,0)
})

test('cadastro CPF usa identificador interno e senha no Auth, sem reivindicar e-mail pessoal',async()=>{
  let criado
  const handler=criarAcessoCliente({allowedOrigins:[origem],limitarCadastro:async()=>true,cadastrar:async dados=>{criado=dados;return {error:null}},autenticar:async(email,senha)=>{assert.equal(email,criado.email);assert.equal(senha,'SenhaAula123');return {data:{session:{access_token:'novo',refresh_token:'renovar'}}}}})
  const resposta=await handler(req({acao:'cadastro',cpf:'52998224725',senha:'SenhaAula123',nome:'Cliente Teste',telefone:'11999999999',role:'service_role',email:'terceiro@example.test'}))
  assert.equal(resposta.status,200);assert.match(criado.email,/^cpf-[a-f0-9]{64}@clientes\.convivium\.invalid$/)
  assert.deepEqual(criado.user_metadata,{cpf:'52998224725',nome:'Cliente Teste',telefone:'11999999999'})
  assert.equal(criado.role,undefined);assert.equal(criado.email_confirm,true)
})
test('cadastro CPF limita rede e recusa senha curta antes de criar conta',async()=>{
  let chamadas=0
  const handler=criarAcessoCliente({allowedOrigins:[origem],limitarCadastro:async()=>false,cadastrar:async()=>{chamadas++}})
  const dados={acao:'cadastro',cpf:'52998224725',senha:'SenhaAula123',nome:'Cliente Teste',telefone:'11999999999'}
  assert.equal((await handler(req({...dados,senha:'curta'}))).status,400)
  assert.equal((await handler(req(dados))).status,429);assert.equal(chamadas,0)
})
