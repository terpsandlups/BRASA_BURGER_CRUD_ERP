import test from 'node:test'
import assert from 'node:assert/strict'
import { solicitarAtivacaoCliente,dadosPrimeiroAcesso } from '../src/lib/ativacaoCliente.js'

test('primeiro acesso separa e-mail de CPF ao reaproveitar a identificação digitada ou preenchida pelo navegador',()=>{
 assert.deepEqual(dadosPrimeiroAcesso(' conta@example.test '),{cpf:'',email:'conta@example.test'})
 assert.deepEqual(dadosPrimeiroAcesso('52998224725'),{cpf:'529.982.247-25',email:''})
 assert.deepEqual(dadosPrimeiroAcesso(''),{cpf:'',email:''})
})

test('primeiro acesso confirma e-mail sem reivindicar CPF nos metadados nem consultar a ficha pública',async()=>{
 let chamada
 await solicitarAtivacaoCliente({signInWithOtp:async dados=>{chamada=dados;return {}}},{cpf:'529.982.247-25',email:' TITULAR@example.test ',retorno:'https://example.test/pedir/brasa-burger?ativacao=1'})
 assert.deepEqual(chamada,{email:'titular@example.test',options:{shouldCreateUser:true,emailRedirectTo:'https://example.test/pedir/brasa-burger?ativacao=1'}})
})
test('primeiro acesso recusa dados inválidos e apresenta limite de envio',async()=>{
 let chamadas=0
 const auth={signInWithOtp:async()=>{chamadas++;return {error:{status:429}}}}
 await assert.rejects(solicitarAtivacaoCliente(auth,{cpf:'11111111111',email:'a@example.test',retorno:'https://example.test'}),/CPF/)
 assert.equal(chamadas,0)
 await assert.rejects(solicitarAtivacaoCliente(auth,{cpf:'52998224725',email:'a@example.test',retorno:'https://example.test'}),/Limite de envios/)
})
