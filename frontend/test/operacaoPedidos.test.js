import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarPedidosOperacao, indicadoresOperacao, criarAtualizadorStatus } from '../src/lib/operacaoPedidos.js'

const pedidos = [
  { id: 'abc', loja_id: 'a', cliente_cpf: '12345678900', clientes: { nome: 'João' }, status: 'em_preparo', valor_total: 25, criado_em: '2026-09-17T12:00:00Z' },
  { id: 'def', loja_id: 'b', cliente_cpf: null, clientes: { nome: 'Maria' }, status: 'saiu_entrega', valor_total: 50, criado_em: '2026-09-17T12:20:00Z' },
]
test('busca por nome não corresponde a todo CPF; aceita CPF formatado e ID com #', () => {
  assert.deepEqual(filtrarPedidosOperacao(pedidos, 'todas', 'maria').map(p => p.id), ['def'])
  assert.equal(filtrarPedidosOperacao(pedidos, 'todas', 'inexistente').length, 0)
  assert.equal(filtrarPedidosOperacao(pedidos, 'todas', '123.456.789-00')[0].id, 'abc')
  assert.equal(filtrarPedidosOperacao(pedidos, 'todas', '#ABC')[0].id, 'abc')
  assert.equal(filtrarPedidosOperacao(pedidos, 'a', 'maria').length, 0)
})
test('indicadores respeitam unidade, cancelamento e limite de 30 minutos', () => {
  const hoje = [...pedidos, { ...pedidos[0], id: 'cancelado', status: 'cancelado', valor_total: 200 }]
  assert.deepEqual(indicadoresOperacao(hoje, pedidos, 'a', new Date('2026-09-17T12:30:00Z')), {
    pedidosHoje: 1, faturamentoHoje: 25, emPreparo: 1, emEntrega: 0, atrasados: 1,
  })
  assert.equal(indicadoresOperacao(hoje, pedidos, 'todas', new Date('2026-09-17T12:30:00Z')).faturamentoHoje, 75)
})
test('status usa comparação com estado anterior e bloqueia clique simultâneo', async () => {
  let concluir; let chamadas = 0; const filtros = []
  const query = { eq: (campo, valor) => { filtros.push([campo, valor]); return query }, select: () => query,
    maybeSingle: () => new Promise(resolve => { concluir = resolve }) }
  const atualizar = criarAtualizadorStatus({ from: () => ({ update: () => { chamadas++; return query } }) })
  const primeira = atualizar(pedidos[0], { status: 'pronto' })
  assert.equal(await atualizar(pedidos[0], { status: 'pronto' }), false)
  assert.equal(chamadas, 1)
  assert.deepEqual(filtros, [['id', 'abc'], ['status', 'em_preparo']])
  concluir({ data: { id: 'abc' }, error: null })
  assert.equal(await primeira, true)
})
test('status sem linha atualizada não é tratado como sucesso e libera nova tentativa', async () => {
  const query = { eq: () => query, select: () => query, maybeSingle: async () => ({ data: null, error: null }) }
  const atualizar = criarAtualizadorStatus({ from: () => ({ update: () => query }) })
  await assert.rejects(atualizar(pedidos[0], {}), /outra sessão/)
  await assert.rejects(atualizar(pedidos[0], {}), /outra sessão/)
})
