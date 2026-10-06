import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularDashboard, intervaloDashboard } from '../src/lib/dashboard.js'

test('Hoje usa a data de São Paulo mesmo após a meia-noite UTC', () => {
  const intervalo = intervaloDashboard(1, new Date('2026-09-14T01:30:00Z'))
  assert.equal(intervalo.inicio, '2026-09-13T03:00:00.000Z')
  assert.equal(intervalo.fim, '2026-09-14T01:30:00.000Z')
  assert.deepEqual(intervalo.dias, ['2026-09-13'])
})

test('período inclui o dia atual e a quantidade exata de dias', () => {
  const intervalo = intervaloDashboard(7, new Date('2026-09-13T18:00:00-03:00'))
  assert.equal(intervalo.inicio, '2026-09-07T03:00:00.000Z')
  assert.equal(intervalo.dias.length, 7)
  assert.deepEqual([intervalo.dias[0], intervalo.dias.at(-1)], ['2026-09-07', '2026-09-13'])
})

test('calcula CMV agregado apenas sobre itens com ficha e informa cobertura', () => {
  const pedidos = [{
    id: '1', status: 'entregue', valor_total: 55.8, criado_em: '2026-09-13T12:00:00-03:00',
    loja_id: 'japy', lojas: { nome: 'Japy' }, canal_venda: 'ifood',
    itens_pedido: [
      { produto_sku: 'A', variacao_id: 'v1', quantidade: 1, preco_unitario: 27.9, produtos: { nome: 'Burger A' } },
      { produto_sku: 'B', variacao_id: 'v2', quantidade: 1, preco_unitario: 27.9, produtos: { nome: 'Burger B' } },
    ],
  }]
  const resultado = calcularDashboard(pedidos, [{ variacao_id: 'v1', custo_ficha_tecnica: 8.9 }], ['2026-09-13'])
  assert.equal(resultado.cmvPercentual.toFixed(2), '31.90')
  assert.equal(resultado.margemPercentual.toFixed(2), '68.10')
  assert.equal(resultado.coberturaCusto, 50)
  assert.equal(resultado.itensSemFicha, 1)
  assert.deepEqual(resultado.canais, [{ nome: 'iFood', valor: 1 }])
})

test('exclui cancelamentos de todas as métricas', () => {
  const resultado = calcularDashboard([{
    status: 'cancelado', valor_total: 99, criado_em: '2026-09-13T10:00:00-03:00',
    loja_id: 'retiro', canal_venda: 'proprio', itens_pedido: [],
  }], [], ['2026-09-13'])
  assert.equal(resultado.pedidosTotal, 0)
  assert.equal(resultado.faturamentoTotal, 0)
  assert.equal(resultado.ticketMedio, null)
  assert.deepEqual(resultado.canais, [])
})
