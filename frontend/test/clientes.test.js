import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarClientes,clientesComMesmoContato } from '../src/lib/clientes.js'
const clientes = [{ nome: 'Maria', cpf: '12345678900' }, { nome: 'José', cpf: '98765432100' }, { nome: null, cpf: null }]
test('busca CRM aceita CPF pontuado, parcial e nome sem diferenciar maiúsculas', () => {
  assert.deepEqual(filtrarClientes(clientes, '123.456.789-00'), [clientes[0]])
  assert.deepEqual(filtrarClientes(clientes, '987.654'), [clientes[1]])
  assert.deepEqual(filtrarClientes(clientes, ' MARIA '), [clientes[0]])
})
test('busca vazia lista todos, nome inexistente não corresponde a CPF vazio', () => {
  assert.equal(filtrarClientes(clientes, ' ').length, 3)
  assert.equal(filtrarClientes(clientes, 'outro').length, 0)
})
test('busca CRM encontra telefone formatado e e-mail sem criar outro CPF',()=>{
 const ficha={cpf:'52998224725',nome:'Cliente',telefone:'11988887777',email:'cliente@example.test'}
 assert.deepEqual(filtrarClientes([ficha],'(11) 98888-7777'),[ficha])
 assert.deepEqual(filtrarClientes([ficha],'CLIENTE@EXAMPLE.TEST'),[ficha])
})
test('contato coincidente sinaliza possível duplicidade, sem fundir CPFs de pessoas diferentes',()=>{
 const ficha={cpf:'52998224725',nome:'Cliente',telefone:'(11) 98888-7777',email:'cliente@example.test'}
 assert.deepEqual(clientesComMesmoContato([ficha],{cpf:'11144477735',telefone:'11988887777'}),[ficha])
 assert.deepEqual(clientesComMesmoContato([ficha],{cpf:'11144477735',email:' CLIENTE@example.test '}),[ficha])
 assert.deepEqual(clientesComMesmoContato([ficha],{...ficha,telefone:'11988887777'}),[])
})
