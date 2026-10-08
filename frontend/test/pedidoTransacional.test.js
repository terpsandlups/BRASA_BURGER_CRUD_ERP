import test from 'node:test'
import assert from 'node:assert/strict'
import { criarEnvioTransacional, montarPedidoTransacional } from '../src/lib/pedidoTransacional.js'

test('reenvio após resposta perdida preserva chave e conteúdo originais', async () => {
  const chamadas = []
  const envio = criarEnvioTransacional({ rpc: async (_, args) => {
    chamadas.push(args)
    return chamadas.length === 1 ? { error: { message: 'Failed to fetch' } } : { data: 'pedido-1' }
  } }, () => 'chave-1')
  await assert.rejects(envio.enviar({ itens: [1] }))
  assert.equal(envio.temPendente(), true)
  assert.equal(await envio.enviar(), 'pedido-1')
  assert.deepEqual(chamadas[0], chamadas[1])
  assert.equal(envio.temPendente(), false)
})

test('cliques simultâneos fazem uma única chamada', async () => {
  let resolver
  let chamadas = 0
  const envio = criarEnvioTransacional({ rpc: () => {
    chamadas++
    return new Promise((resolve) => { resolver = resolve })
  } }, () => 'chave')
  const a = envio.enviar({})
  const b = envio.enviar({})
  resolver({ data: 'pedido' })
  assert.deepEqual(await Promise.all([a, b]), ['pedido', 'pedido'])
  assert.equal(chamadas, 1)
})

test('erro SQL permite corrigir dados e iniciar uma nova requisição', async () => {
  let contador = 0
  const chamadas = []
  const envio = criarEnvioTransacional({ rpc: async (_, args) => {
    chamadas.push(args)
    return chamadas.length === 1 ? { error: { code: 'P0001', message: 'Preço alterado' } } : { data: 'pedido' }
  } }, () => String(++contador))
  await assert.rejects(envio.enviar({ valor: 1 }))
  assert.equal(envio.temPendente(), false)
  await envio.enviar({ valor: 2 })
  assert.notEqual(chamadas[0].p_requisicao, chamadas[1].p_requisicao)
  assert.equal(chamadas[1].p_dados.valor, 2)
})

test('monta itens com preços arredondados e mantém quantidade para baixa de adicionais', () => {
  const dados = montarPedidoTransacional({ lojaId: 'loja', clienteCpf: 'cpf', tipoAtendimento: 'delivery',
    formaPagamento: 'pix', canalVenda: 'ifood', observacoes: '  sem cebola  ', trocoPara: '50',
    itens: [{ variacao_id: 'v1', quantidade: 3, preco_unitario: 22.885,
      adicionaisSelecionados: [{ id: 'a1', preco_adicional: '4.50' }] }],
  })
  assert.equal(dados.troco_para, null)
  assert.equal(dados.observacoes, 'sem cebola')
  assert.equal(dados.itens[0].quantidade, 3)
  assert.equal(dados.itens[0].adicionais[0].preco_unitario, 4.5)
  assert.equal(dados.cotacao_entrega_id, null)
})

test('delivery próprio inclui apenas o identificador da cotação, não o valor escolhido no navegador', () => {
  const dados = montarPedidoTransacional({ lojaId: 'loja', clienteCpf: '12345678900', tipoAtendimento: 'delivery',
    formaPagamento: 'pix', canalVenda: 'proprio', observacoes: '', trocoPara: '', itens: [],
    cotacaoId: '22222222-2222-2222-2222-222222222222' })
  assert.equal(dados.cotacao_entrega_id, '22222222-2222-2222-2222-222222222222')
  assert.equal(dados.taxa_entrega, undefined)
  assert.equal(dados.valor_total, undefined)
})
