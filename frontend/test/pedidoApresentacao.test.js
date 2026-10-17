import test from 'node:test'
import assert from 'node:assert/strict'
import { totalItemPedido, quantidadeItens, esperaPedido } from '../src/lib/pedidoApresentacao.js'

test('detalhe soma adicionais sem multiplicar a quantidade duas vezes', () => {
  const item = { quantidade: 2, preco_unitario: '25.90', itens_pedido_adicionais: [{ quantidade: 2, preco_unitario: '3.50' }] }
  assert.equal(totalItemPedido(item), 58.8)
  assert.equal(quantidadeItens({ itens_pedido: [item, { quantidade: 3 }] }), 5)
})
test('tempo de espera apresenta horas e dias para pedidos antigos', () => {
  assert.equal(esperaPedido(35), '35 min')
  assert.equal(esperaPedido(65), '1h 5min')
  assert.equal(esperaPedido(1500), '1d 1h')
})
