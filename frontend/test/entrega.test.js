import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularTaxaEntrega, prepararConfiguracaoEntrega, exigeFreteProprio, cotacaoPedidoValida, totalComFrete } from '../src/lib/entrega.js'

test('taxa proporcional por km, vírgula decimal e arredondamento final', () => {
  assert.equal(calcularTaxaEntrega(4, 1.5), 6)
  assert.equal(calcularTaxaEntrega('3,5', '1,50'), 5.25)
  assert.equal(calcularTaxaEntrega('1.235', '1.50'), 1.85)
  assert.equal(calcularTaxaEntrega('0.01', '1.50'), 0.02)
})

test('não cobra usando entradas vazias, negativas ou inválidas', () => {
  for (const invalido of ['', null, -1, 0, Infinity, 'abc', '1,2,3', 1001, '1e2']) {
    assert.throws(() => calcularTaxaEntrega(invalido, 1.5))
    assert.throws(() => calcularTaxaEntrega(1, invalido))
  }
  assert.throws(() => calcularTaxaEntrega(0.0001, 1.5))
})

const endereco = { cep: '13201-000', numero: '10', endereco: 'Rua Exemplo', bairro: 'Centro', cidade: 'Jundiaí', estado: 'sp', valor_km: '1,50' }
test('normaliza endereço e tarifa da loja sem aceitar endereço incompleto', () => {
  const dados = prepararConfiguracaoEntrega(endereco)
  assert.equal(dados.cep, '13201000')
  assert.equal(dados.estado, 'SP')
  assert.equal(dados.valor_km, 1.5)
  assert.equal(dados.latitude, null)
  assert.equal(dados.longitude, null)
  for (const campo of ['cep', 'numero', 'endereco', 'bairro', 'cidade', 'estado', 'valor_km']) {
    assert.throws(() => prepararConfiguracaoEntrega({ ...endereco, [campo]: '' }))
  }
  assert.throws(() => prepararConfiguracaoEntrega({ ...endereco, estado: 'XX' }))
  assert.throws(() => prepararConfiguracaoEntrega({ ...endereco, valor_km: '1.555' }))
  assert.deepEqual([prepararConfiguracaoEntrega({ ...endereco, latitude: -23.1, longitude: -46.9 }).latitude,
    prepararConfiguracaoEntrega({ ...endereco, latitude: -23.1, longitude: -46.9 }).longitude], [-23.1, -46.9])
  assert.throws(() => prepararConfiguracaoEntrega({ ...endereco, latitude: -23.1 }))
  assert.throws(() => prepararConfiguracaoEntrega({ ...endereco, latitude: -90, longitude: -46.9 }))
})

test('frete do pedido só se aplica ao delivery próprio e depende de cotação válida', () => {
  assert.equal(exigeFreteProprio('delivery', 'proprio'), true)
  assert.equal(exigeFreteProprio('delivery', 'ifood'), false)
  assert.equal(exigeFreteProprio('presencial', 'proprio'), false)
  const cotacao = { cotacao_id: '22222222-2222-2222-2222-222222222222', lojaId: 'loja',
    clienteCpf: '12345678900', taxa: 5.25, expira_em: '2026-10-08T02:00:00Z' }
  const agora = Date.parse('2026-10-08T01:50:00Z')
  assert.equal(cotacaoPedidoValida(cotacao, 'loja', '12345678900', agora), true)
  assert.equal(cotacaoPedidoValida(cotacao, 'outra', '12345678900', agora), false)
  assert.equal(cotacaoPedidoValida(cotacao, 'loja', 'outro', agora), false)
  assert.equal(cotacaoPedidoValida(cotacao, 'loja', '12345678900', Date.parse(cotacao.expira_em)), false)
  assert.equal(totalComFrete(27.9, cotacao.taxa), 33.15)
})
