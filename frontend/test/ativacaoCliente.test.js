import test from 'node:test'
import assert from 'node:assert/strict'
import { solicitarAtivacaoCliente } from '../src/lib/ativacaoCliente.js'

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
