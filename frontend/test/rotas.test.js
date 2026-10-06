import test from 'node:test'
import assert from 'node:assert/strict'
import { criarHandler, interpretarRota, enderecoParaRota } from '../../supabase/functions/calcular-entrega/handler.mjs'

const endereco = { endereco: 'Rua Exemplo', numero: '10', bairro: 'Centro', cidade: 'Jundiaí', estado: 'SP', cep: '13201000' }
const loja = '11111111-1111-1111-1111-111111111111'
const ponto = { placeId: 'exemplo', type: ['street_address'], geocoderStatus: {} }
const rota = () => ({ routes: [{ distanceMeters: 3500 }], geocodingResults: { origin: { ...ponto }, destination: { ...ponto } } })
function preparar({ authError = null, rpcError = null, apiKey = 'chave-teste', resposta = rota(), falhaRede = false } = {}) {
  const chamadas = []
  const handler = criarHandler({ apiKey, provider: 'google', allowedOrigins: ['http://localhost:5173'],
    criarCliente: () => ({ auth: { getUser: async () => ({ data: { user: authError ? null : { id: 'usuario' } }, error: authError }) },
      rpc: async (nome, args) => { chamadas.push({ nome, args }); return { data: { ...endereco, valor_km: 1.5 }, error: rpcError } } }),
    fetchFn: async (url, options) => { chamadas.push({ url, options }); if (falhaRede) throw new Error('segredo'); return Response.json(resposta) },
  })
  const request = (body = { loja_id: loja, destino: endereco }, headers = {}) => new Request('https://example.test', {
    method: 'POST', headers: { origin: 'http://localhost:5173', authorization: 'Bearer token-teste', ...headers }, body: JSON.stringify(body),
  })
  return { handler, chamadas, request }
}

test('usa origem e tarifa do banco, envia apenas endereço ao Google e calcula taxa', async () => {
  const { handler, chamadas, request } = preparar()
  const response = await handler(request({ loja_id: loja, destino: { ...endereco, cpf: 'nao-enviar', complemento: 'privado' }, valor_km: 0.01, origem: 'falsa' }))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).taxa, 5.25)
  assert.equal(chamadas[0].nome, 'preparar_consulta_rota')
  const enviada = JSON.parse(chamadas[1].options.body)
  assert.equal(enviada.origin.address, enderecoParaRota(endereco))
  assert.equal(enviada.travelMode, 'DRIVE')
  assert.ok(!chamadas[1].options.body.includes('nao-enviar'))
  assert.ok(!chamadas[1].options.body.includes('privado'))
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
})

test('não consulta provedor sem autenticação, permissão, configuração ou orçamento', async () => {
  for (const [opcoes, status] of [
    [{ authError: { message: 'inválido' } }, 401],
    [{ rpcError: { code: '42501' } }, 403],
    [{ rpcError: { code: 'P0001' } }, 429],
    [{ rpcError: { code: '22023' } }, 422],
    [{ apiKey: '' }, 503],
  ]) {
    const { handler, chamadas, request } = preparar(opcoes)
    assert.equal((await handler(request())).status, status)
    assert.ok(!chamadas.some(c => c.url))
  }
})

test('recusa origem externa, endereço incompleto e corpo excessivo antes da RPC', async () => {
  const { handler, chamadas, request } = preparar()
  assert.equal((await handler(request(undefined, { origin: 'https://outro.test' }))).status, 403)
  assert.equal((await handler(request({ loja_id: loja, destino: {} }))).status, 400)
  assert.equal((await handler(request({ muito: 'a'.repeat(9000) }))).status, 413)
  assert.equal((await handler(request(undefined, { authorization: '' }))).status, 401)
  assert.equal(chamadas.length, 0)
})

test('rejeita correspondência parcial, genérica, rota ausente e distância inválida', () => {
  const parcial = rota(); parcial.geocodingResults.destination.partialMatch = true
  const generica = rota(); generica.geocodingResults.origin.type = ['postal_code']
  for (const data of [parcial, generica, {}, { ...rota(), routes: [] }, { ...rota(), routes: [{ distanceMeters: -1 }] }]) {
    assert.throws(() => interpretarRota(data, 1.5))
  }
})

test('falha de rede não retorna taxa zero nem detalhes internos', async () => {
  const { handler, request } = preparar({ falhaRede: true })
  const resposta = await handler(request())
  assert.equal(resposta.status, 502)
  const body = await resposta.json()
  assert.equal(body.taxa, undefined)
  assert.ok(!body.error.includes('segredo'))
})
