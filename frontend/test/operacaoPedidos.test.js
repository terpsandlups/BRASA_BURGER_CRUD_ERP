import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarPedidosOperacao, indicadoresOperacao, criarAtualizadorStatus, destinosReaproveitamento, cancelarPedidoTransacional } from '../src/lib/operacaoPedidos.js'

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
  let concluir; let chamadas = 0; const parametros = []
  const atualizar = criarAtualizadorStatus({ rpc: (nome, args) => {
    chamadas++; parametros.push([nome, args]); return new Promise(resolve => { concluir = resolve })
  } })
  const primeira = atualizar(pedidos[0])
  assert.equal(await atualizar(pedidos[0]), false)
  assert.equal(chamadas, 1)
  assert.deepEqual(parametros, [['avancar_pedido_transacional', { p_pedido: 'abc', p_status_esperado: 'em_preparo' }]])
  concluir({ data: 'pronto', error: null })
  assert.equal(await primeira, true)
})
test('status sem linha atualizada não é tratado como sucesso e libera nova tentativa', async () => {
  const atualizar = criarAtualizadorStatus({ rpc: async () => ({ data: null, error: null }) })
  await assert.rejects(atualizar(pedidos[0]), /outra sessão/)
  await assert.rejects(atualizar(pedidos[0]), /outra sessão/)
})
test('reaproveitamento só oferece pedido idêntico na mesma unidade', () => {
  const item = { produto_sku: 'BR1', variacao_id: 'v1', quantidade: 2,
    itens_pedido_adicionais: [{ adicional_id: 'bacon', quantidade: 2 }] }
  const origem = { id: 'o', loja_id: 'a', estoque_rastreado: true, itens_pedido: [item] }
  const destino = { ...origem, id: 'd', itens_pedido: [{ ...item, itens_pedido_adicionais: [...item.itens_pedido_adicionais] }] }
  assert.deepEqual(destinosReaproveitamento(origem, [origem, destino]), [destino])
  assert.deepEqual(destinosReaproveitamento(origem, [{ ...destino, loja_id: 'b' }]), [])
  assert.deepEqual(destinosReaproveitamento(origem, [{ ...destino, itens_pedido: [{ ...item, quantidade: 1 }] }]), [])
  assert.deepEqual(destinosReaproveitamento(origem, [{ ...destino, itens_pedido: [{ ...item, itens_pedido_adicionais: [] }] }]), [])
})
test('cancelamento envia estorno, motivo e destino por RPC', async () => {
  let args
  const client = { rpc: async (nome, parametros) => { assert.equal(nome, 'cancelar_pedido_transacional'); args = parametros; return { data: 88.5, error: null } } }
  assert.equal(await cancelarPedidoTransacional(client, pedidos[0], { motivo: '  erro do cliente ', destino: 'perda_operacional' }), 88.5)
  assert.deepEqual(args, { p_pedido: 'abc', p_status_esperado: 'em_preparo', p_motivo: 'erro do cliente', p_destino: 'perda_operacional', p_pedido_destino: null })
  await assert.rejects(cancelarPedidoTransacional(client, pedidos[0], { motivo: 'x', destino: 'perda_operacional' }), /motivo/)
})
