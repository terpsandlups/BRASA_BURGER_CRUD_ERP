import { Falha } from './erro.mjs'

const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const texto = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const tiposVia = { av: 'avenida', r: 'rua', rod: 'rodovia', tv: 'travessa', al: 'alameda', est: 'estrada', pc: 'praca' }
const rua = valor => texto(valor).replace(/^(av|r|rod|tv|al|est|pc)\.?\s+/, (_, tipo) => `${tiposVia[tipo]} `)
const estados = {
  acre: 'ac', alagoas: 'al', amapa: 'ap', amazonas: 'am', bahia: 'ba', ceara: 'ce', distritofederal: 'df',
  espiritosanto: 'es', goias: 'go', maranhao: 'ma', matogrosso: 'mt', matogrossodosul: 'ms', minasgerais: 'mg',
  para: 'pa', paraiba: 'pb', parana: 'pr', pernambuco: 'pe', piaui: 'pi', riodejaneiro: 'rj',
  riograndedonorte: 'rn', riograndedosul: 'rs', rondonia: 'ro', roraima: 'rr', santacatarina: 'sc',
  saopaulo: 'sp', sergipe: 'se', tocantins: 'to',
}
function uf(properties) {
  // Não usar o nome para encobrir uma sigla divergente retornada pelo provedor.
  const valor = normalizar(properties.region_a || properties.region)
  return estados[valor] || valor.replace(/^br(?=[a-z]{2}$)/, '')
}

function divergencias(item, esperado) {
  const p = item?.properties || {}
  const coords = item?.geometry?.coordinates
  const campos = []
  if (!(item?.geometry?.type === 'Point' && Array.isArray(coords) && coords.length === 2 &&
    coords.every(Number.isFinite) && Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) <= 90)) campos.push('coordenadas')
  if (p.layer !== 'address' || typeof p.confidence !== 'number' || p.confidence < 0.9 ||
    !Number.isFinite(p.confidence) || p.match_type === 'fallback') campos.push('precisão do imóvel')
  if (p.country_a !== 'BRA') campos.push('país')
  if (!p.housenumber || texto(p.housenumber) !== texto(esperado.numero)) campos.push('número')
  if (!p.street || rua(p.street) !== rua(esperado.endereco)) campos.push('rua')
  if (!texto(p.locality || p.localadmin) || texto(p.locality || p.localadmin) !== texto(esperado.cidade)) campos.push('cidade')
  if (!p.postalcode || normalizar(p.postalcode) !== normalizar(esperado.cep)) campos.push('CEP')
  if (!uf(p) || uf(p) !== normalizar(esperado.estado)) campos.push('UF')
  return campos
}

// Política conservadora do MVP: confiança não substitui a conferência do endereço.
export function selecionarEndereco(data, esperado, etapa = 'Endereço') {
  if (!Array.isArray(data?.features)) throw new Falha(502, `${etapa}: resposta inválida do serviço de localização. Nenhuma taxa foi calculada.`)
  const avaliados = data.features.map(item => ({ item, campos: divergencias(item, esperado) }))
  const candidatos = avaliados.filter(({ campos }) => campos.length === 0).map(({ item }) => item)
  const pontos = new Map(candidatos.map(item => [JSON.stringify(item.geometry.coordinates), item]))
  if (pontos.size > 1) throw new Falha(422, `${etapa}: mais de uma localização corresponde ao endereço. Nenhuma taxa automática foi gerada.`)
  if (pontos.size === 0) {
    const proximo = avaliados.sort((a, b) => a.campos.length - b.campos.length)[0]
    const motivo = proximo
      ? `A base de endereços não confirmou: ${proximo.campos.join(', ')}.`
      : 'A base de endereços não encontrou esse imóvel.'
    throw new Falha(422, `${etapa}: ${motivo} Confira o cadastro; dados corretos também podem não ter cobertura no serviço gratuito. Nenhuma taxa automática foi gerada.`)
  }
  const ponto = [...pontos.values()][0]
  return { coordenadas: ponto.geometry.coordinates, endereco: ponto.properties.label || '' }
}

function pontoManual(dados, etapa) {
  const temLatitude = dados?.latitude !== null && dados?.latitude !== undefined
  const temLongitude = dados?.longitude !== null && dados?.longitude !== undefined
  if (!temLatitude && !temLongitude) return null
  const latitude = Number(dados.latitude)
  const longitude = Number(dados.longitude)
  if (!temLatitude || !temLongitude || dados.latitude === '' || dados.longitude === '' ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -34 || latitude > 6 || longitude < -74 || longitude > -34) {
    throw new Falha(422, `${etapa}: ponto marcado inválido. Remarque o imóvel no mapa; nenhuma taxa foi calculada.`)
  }
  return { coordenadas: [longitude, latitude], endereco: '', modo: 'ponto_marcado' }
}

export async function consultarORS({ apiKey, origem, destino, textoOrigem, textoDestino, fetchFn }) {
  const signal = AbortSignal.timeout(12000)
  async function consultar(url, options = {}) {
    try {
      const resposta = await fetchFn(url, { ...options, signal, headers: { Authorization: apiKey, 'Content-Type': 'application/json' } })
      if (resposta.status === 429) throw new Falha(429, 'Cota gratuita do serviço de rotas atingida. Aguarde a renovação; não haverá troca para um serviço pago.')
      if (!resposta.ok) throw new Falha(502, 'Serviço gratuito indisponível. Confira a chave e as cotas do openrouteservice.')
      return await resposta.json()
    } catch (error) {
      if (error instanceof Falha) throw error
      throw new Falha(502, 'O serviço gratuito não respondeu. Nenhuma taxa foi calculada.')
    }
  }
  async function localizar(texto, esperado, etapa) {
    const url = new URL('https://api.heigit.org/pelias/v1/search')
    url.searchParams.set('text', texto)
    url.searchParams.set('boundary.country', 'BRA')
    url.searchParams.set('layers', 'address')
    url.searchParams.set('size', '5')
    const primeiraBusca = await consultar(url.toString())
    try {
      return selecionarEndereco(primeiraBusca, esperado, etapa)
    } catch (error) {
      if (!(error instanceof Falha) || error.status !== 422) throw error
    }
    // A busca livre pode interpretar número, bairro e CEP como parte da rua.
    // A segunda busca separa os campos, mantendo a mesma validação rigorosa.
    const estruturada = new URL('https://api.heigit.org/pelias/v1/search/structured')
    estruturada.searchParams.set('address', `${esperado.endereco} ${esperado.numero}`)
    estruturada.searchParams.set('locality', esperado.cidade)
    estruturada.searchParams.set('region', esperado.estado)
    estruturada.searchParams.set('postalcode', esperado.cep)
    estruturada.searchParams.set('country', 'BRA')
    estruturada.searchParams.set('boundary.country', 'BRA')
    estruturada.searchParams.set('layers', 'address')
    estruturada.searchParams.set('size', '5')
    return selecionarEndereco(await consultar(estruturada.toString()), esperado, etapa)
  }
  // Sem retries: até quatro geocodificações e uma rota por cálculo.
  const origemPonto = pontoManual(origem, 'Endereço da loja (origem)')
  const destinoPonto = pontoManual(destino, 'Endereço de entrega (destino)')
  const partida = origemPonto ||
    { ...await localizar(textoOrigem, origem, 'Endereço da loja (origem)'), modo: 'endereco_confirmado' }
  const chegada = destinoPonto ||
    { ...await localizar(textoDestino, destino, 'Endereço de entrega (destino)'), modo: 'endereco_confirmado' }
  const data = await consultar('https://api.heigit.org/openrouteservice/v2/directions/driving-car/json', {
    method: 'POST', body: JSON.stringify({ coordinates: [partida.coordenadas, chegada.coordenadas],
      units: 'm', instructions: false, geometry: false }),
  })
  const distancia = data?.routes?.[0]?.summary?.distance
  if (typeof distancia !== 'number' || !Number.isFinite(distancia) || distancia <= 0 || distancia > 1000000) {
    throw new Falha(422, 'Nenhuma rota válida foi encontrada. Nenhuma taxa foi calculada.')
  }
  return { metros: Math.round(distancia), origemLocalizada: partida.endereco, destinoLocalizado: chegada.endereco,
    origemModo: partida.modo, destinoModo: chegada.modo }
}
