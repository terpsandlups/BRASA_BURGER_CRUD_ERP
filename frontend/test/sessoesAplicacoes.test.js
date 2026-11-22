import test from 'node:test'
import assert from 'node:assert/strict'
import { opcoesSessao } from '../src/lib/sessoesAplicacoes.js'

test('retorno de autenticação é capturado por uma só aplicação, inclusive no deploy em subpasta',()=>{
 for(const base of ['/','/BRASA_BURGER_CRUD_ERP/']){
  for(const rota of ['pedir','pedir/brasa-burger']){
   assert.equal(opcoesSessao('consumidor',base+rota,base).auth.detectSessionInUrl,true)
   assert.equal(opcoesSessao('erp',base+rota,base).auth.detectSessionInUrl,false)
  }
  for(const rota of ['','pedidos','produtos']){
   assert.equal(opcoesSessao('erp',base+rota,base).auth.detectSessionInUrl,true)
   assert.equal(opcoesSessao('consumidor',base+rota,base).auth.detectSessionInUrl,false)
  }
  assert.ok(opcoesSessao('consumidor',base,base).auth.storageKey)
  assert.equal(opcoesSessao('erp',base,base).auth.storageKey,undefined,'Preserva a chave de sessão já usada pela equipe.')
 }
})
