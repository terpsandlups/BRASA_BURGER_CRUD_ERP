import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarClientes } from '../src/lib/clientes.js'
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
