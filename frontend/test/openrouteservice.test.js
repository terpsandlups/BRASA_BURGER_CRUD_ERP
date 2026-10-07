import test from 'node:test'
import assert from 'node:assert/strict'
import { criarHandler } from '../../supabase/functions/calcular-entrega/handler.mjs'
import { selecionarEndereco, sugerirCentroMapa } from '../../supabase/functions/calcular-entrega/openrouteservice.mjs'

const endereco = { endereco: 'Rua Exemplo', numero: '10', bairro: 'Centro', cidade: 'Jundiaí', estado: 'SP', cep: '13201000' }
const ponto = () => ({ geometry: { type: 'Point', coordinates: [-46.9, -23.1] }, properties: {
  layer: 'address', confidence: 1, match_type: 'exact', country_a: 'BRA', region_a: 'SP',
  locality: 'Jundiaí', street: 'Rua Exemplo', housenumber: '10', postalcode: '13201-000', label: 'Rua Exemplo, 10, Jundiaí',
} })
function ambiente({ quota = false, impreciso = false, invalida = false, destinoImpreciso = false,
  buscaLivreImprecisa = false, origemPonto = null, destinoPonto = null, key = 'chave-ficticia' } = {}) {
  const chamadas = []
  const handler = criarHandler({ apiKey: key, allowedOrigins: ['http://localhost:5173'],
    criarCliente: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
      rpc: async () => ({ data: { ...endereco, ...origemPonto, valor_km: 1.5 } }) }),
    fetchFn: async (url, options) => {
      chamadas.push({ url, options })
      if (quota) return Response.json({}, { status: 429 })
      if (url.includes('/pelias/v1/search')) {
        const p = ponto(); if (impreciso || (destinoImpreciso && chamadas.length >= 2) ||
          (buscaLivreImprecisa && !url.includes('/structured'))) p.properties.layer = 'street'
        return Response.json({ features: [p] })
      }
      return Response.json({ routes: [{ summary: { distance: invalida ? -10 : 3500.4 } }] })
    },
  })
  const request = () => new Request('https://example.test', { method: 'POST',
    headers: { origin: 'http://localhost:5173', authorization: 'Bearer teste' },
    body: JSON.stringify({ loja_id: '11111111-1111-1111-1111-111111111111',
      destino: { ...endereco, ...destinoPonto, cpf: 'sigiloso', complemento: 'privado' }, valor_km: 0.01 }),
  })
  return { handler, chamadas, request }
}
test('padrão gratuito: duas geocodificações, uma rota e tarifa do servidor', async () => {
  const { handler, chamadas, request } = ambiente()
  const resposta = await handler(request())
  assert.equal(resposta.status, 200)
  const data = await resposta.json()
  assert.equal(data.provedor, 'openrouteservice')
  assert.equal(data.origem_modo, 'endereco_confirmado')
  assert.equal(data.destino_modo, 'endereco_confirmado')
  assert.equal(data.taxa, 5.25)
  assert.equal(data.distancia_metros, 3500)
  assert.equal(chamadas.length, 3)
  assert.ok(chamadas.every(c => new URL(c.url).hostname === 'api.heigit.org'))
  assert.equal(new URL(chamadas[0].url).pathname, '/pelias/v1/search')
  assert.equal(new URL(chamadas[2].url).pathname, '/openrouteservice/v2/directions/driving-car/json')
  assert.ok(chamadas.every(c => !c.url.includes('chave-ficticia')))
  assert.ok(!JSON.stringify(chamadas).includes('sigiloso'))
  assert.ok(!JSON.stringify(chamadas).includes('privado'))
  assert.deepEqual(JSON.parse(chamadas[2].options.body).coordinates, [[-46.9, -23.1], [-46.9, -23.1]])
})
test('cota esgotada não dispara retry nem fallback pago', async () => {
  const { handler, chamadas, request } = ambiente({ quota: true })
  const resposta = await handler(request())
  assert.equal(resposta.status, 429)
  assert.equal(chamadas.length, 1)
  assert.equal((await resposta.json()).taxa, undefined)
})
test('endereço impreciso interrompe antes de consultar rota; chave ausente não consulta', async () => {
  for (const [config, status, quantidade] of [[{ impreciso: true }, 422, 2], [{ key: '' }, 503, 0], [{ invalida: true }, 422, 3]]) {
    const { handler, chamadas, request } = ambiente(config)
    assert.equal((await handler(request())).status, status)
    assert.equal(chamadas.length, quantidade)
  }
})
test('valida país, rua, número, cidade, CEP, UF, confiança e ambiguidade', () => {
  for (const [campo, valor] of [['country_a', 'USA'], ['street', 'Outra rua'], ['housenumber', '20'], ['locality', 'Outra cidade'], ['postalcode', '00000000'], ['region_a', 'RJ'], ['confidence', 0.5], ['match_type', 'fallback']]) {
    const p = ponto(); p.properties[campo] = valor
    assert.throws(() => selecionarEndereco({ features: [p] }, endereco))
  }
  const outro = ponto(); outro.geometry.coordinates = [-46.8, -23.2]
  assert.throws(() => selecionarEndereco({ features: [ponto(), outro] }, endereco))
  const p = ponto(); p.geometry.coordinates = [200, 100]
  assert.throws(() => selecionarEndereco({ features: [p] }, endereco))
})

test('aceita abreviação de tipo da via e UF por nome sem perder a identidade da rua', () => {
  const esperado = { ...endereco, endereco: 'Avenida Reserva do Japy' }
  const p = ponto()
  p.properties.street = 'Av. Reserva do Japy'
  delete p.properties.region_a
  p.properties.region = 'São Paulo'
  assert.deepEqual(selecionarEndereco({ features: [p] }, esperado).coordenadas, p.geometry.coordinates)
  p.properties.region_a = 'BR-SP'
  assert.doesNotThrow(() => selecionarEndereco({ features: [p] }, esperado))
  p.properties.region_a = 'RJ'
  assert.throws(() => selecionarEndereco({ features: [p] }, esperado), /UF/)
  p.properties.region_a = 'SP'
  p.properties.street = 'Rua Reserva do Japy'
  assert.throws(() => selecionarEndereco({ features: [p] }, esperado), /rua/)
})

test('não confunde números ou palavras ao remover pontuação e espaços', () => {
  const p = ponto()
  p.properties.housenumber = '1-0'
  assert.throws(() => selecionarEndereco({ features: [p] }, endereco), /número/)
  p.properties.housenumber = '10'
  p.properties.street = 'Rua Exem plo'
  assert.throws(() => selecionarEndereco({ features: [p] }, endereco), /rua/)
})

test('informa campos ausentes, cobertura e resposta inválida sem revelar dados do provedor', () => {
  const p = ponto()
  delete p.properties.postalcode
  p.properties.label = 'CONTEUDO_PRIVADO'
  assert.throws(() => selecionarEndereco({ features: [p] }, endereco, 'Destino'), error =>
    error.status === 422 && /Destino:.*CEP/.test(error.message) && !error.message.includes('CONTEUDO_PRIVADO'))
  assert.throws(() => selecionarEndereco({ features: [] }, endereco), /não encontrou esse imóvel/)
  assert.throws(() => selecionarEndereco({ features: {} }, endereco), error => error.status === 502)
  assert.throws(() => selecionarEndereco({ features: [null] }, endereco), error => error.status === 422)
})

test('distingue loja e destino e nunca consulta rota após falha de localização', async () => {
  for (const [config, etapa, total] of [[{ impreciso: true }, /Endereço da loja \(origem\)/, 2],
    [{ destinoImpreciso: true }, /Endereço de entrega \(destino\)/, 3]]) {
    const { handler, chamadas, request } = ambiente(config)
    const resposta = await handler(request())
    assert.equal(resposta.status, 422)
    const data = await resposta.json()
    assert.match(data.error, etapa)
    assert.equal(data.taxa, undefined)
    assert.equal(chamadas.length, total)
  }
})

test('busca estruturada só é chamada quando a livre não confirma e mantém conferência exata', async () => {
  const { handler, chamadas, request } = ambiente({ buscaLivreImprecisa: true })
  assert.equal((await handler(request())).status, 200)
  assert.equal(chamadas.length, 5)
  const params = new URL(chamadas[1].url).searchParams
  assert.equal(new URL(chamadas[1].url).pathname, '/pelias/v1/search/structured')
  assert.equal(params.get('address'), 'Rua Exemplo 10')
  assert.equal(params.get('postalcode'), endereco.cep)
  assert.equal(params.get('locality'), endereco.cidade)
})

test('pontos marcados dispensam geocodificação e são declarados no resultado', async () => {
  const { handler, chamadas, request } = ambiente({ origemPonto: { latitude: -23.1, longitude: -46.9 },
    destinoPonto: { latitude: -23.2, longitude: -46.8 } })
  const resposta = await handler(request())
  assert.equal(resposta.status, 200)
  const data = await resposta.json()
  assert.equal(data.origem_modo, 'ponto_marcado')
  assert.equal(data.destino_modo, 'ponto_marcado')
  assert.equal(data.origem_localizada, '')
  assert.equal(chamadas.length, 1)
  assert.deepEqual(JSON.parse(chamadas[0].options.body).coordinates, [[-46.9, -23.1], [-46.8, -23.2]])
})

test('ponto apenas de um lado localiza o outro endereço; ponto inválido não chama rota', async () => {
  for (const config of [{ origemPonto: { latitude: -23.1, longitude: -46.9 } },
    { destinoPonto: { latitude: -23.2, longitude: -46.8 } }]) {
    const { handler, chamadas, request } = ambiente(config)
    const resposta = await handler(request())
    assert.equal(resposta.status, 200)
    assert.equal(chamadas.length, 2)
    assert.ok(chamadas[0].url.includes('/pelias/v1/search'))
    assert.ok(chamadas[1].url.includes('/directions/driving-car/json'))
  }
  for (const config of [{ origemPonto: { latitude: -90, longitude: -46.9 } },
    { destinoPonto: { latitude: -23.2 } }]) {
    const { handler, chamadas, request } = ambiente(config)
    const resposta = await handler(request())
    assert.equal(resposta.status, 422)
    assert.equal((await resposta.json()).taxa, undefined)
    assert.equal(chamadas.length, 0)
  }
})

test('busca para centralizar mapa é autenticada, não consulta rota nem gera taxa', async () => {
  const { handler, chamadas, request } = ambiente()
  const original = request()
  const body = await original.json()
  const resposta = await handler(new Request(original.url, { method: 'POST', headers: original.headers,
    body: JSON.stringify({ ...body, acao: 'sugerir_mapa' }) }))
  assert.equal(resposta.status, 200)
  const data = await resposta.json()
  assert.deepEqual([data.latitude, data.longitude, data.precisao, data.apenas_centro], [-23.1, -46.9, 'imovel', true])
  assert.equal(data.taxa, undefined)
  assert.equal(chamadas.length, 1)
  assert.ok(chamadas[0].url.includes('/pelias/v1/search'))
})

test('busca aproximada centraliza apenas rua correta; local errado é recusado', async () => {
  const chamadas = []
  const buscar = async (url) => {
    chamadas.push(url)
    const p = ponto()
    p.properties.layer = 'street'
    delete p.properties.housenumber
    delete p.properties.postalcode
    return Response.json({ features: [p] })
  }
  const sugestao = await sugerirCentroMapa({ apiKey: 'teste', endereco, textoEndereco: 'Rua Exemplo, 10, Jundiaí', fetchFn: buscar })
  assert.equal(sugestao.precisao, 'rua')
  assert.equal(chamadas.length, 1)
  await assert.rejects(() => sugerirCentroMapa({ apiKey: 'teste', endereco, textoEndereco: 'Rua Exemplo, 10, Jundiaí',
    fetchFn: async () => { const p = ponto(); p.properties.locality = 'Outra cidade'; return Response.json({ features: [p] }) } }),
  /Não encontramos uma região confiável/)
  await assert.rejects(() => sugerirCentroMapa({ apiKey: 'teste', endereco, textoEndereco: 'Rua Exemplo, 10, Jundiaí',
    fetchFn: async () => { const p = ponto(); delete p.properties.locality; delete p.properties.postalcode; return Response.json({ features: [p] }) } }),
  /Não encontramos uma região confiável/)
})
