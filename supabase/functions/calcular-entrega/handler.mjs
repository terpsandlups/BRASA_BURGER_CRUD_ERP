import { Falha } from './erro.mjs'
import { consultarORS } from './openrouteservice.mjs'

export function enderecoParaRota(dados) {
  if (!dados || typeof dados !== 'object') throw new Falha(400, 'Informe o endereço completo.')
  const limites = { endereco: 250, numero: 30, bairro: 150, cidade: 150, estado: 2, cep: 9 }
  const e = {}
  for (const [campo, limite] of Object.entries(limites)) {
    if (typeof dados[campo] !== 'string' || !dados[campo].trim() || dados[campo].length > limite) {
      throw new Falha(400, `Preencha corretamente o campo ${campo} do endereço.`)
    }
    e[campo] = dados[campo].trim()
  }
  e.cep = e.cep.replace(/-/g, '')
  e.estado = e.estado.toUpperCase()
  if (!/^\d{8}$/.test(e.cep) || !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(e.estado)) {
    throw new Falha(400, 'Confira o CEP e a UF do endereço.')
  }
  // Complemento, CPF, nome e telefone não são enviados ao provedor.
  return `${e.endereco}, ${e.numero}, ${e.bairro}, ${e.cidade} - ${e.estado}, ${e.cep}, Brasil`
}

export function interpretarRota(data, valorKm) {
  for (const ponto of [data?.geocodingResults?.origin, data?.geocodingResults?.destination]) {
    if (!ponto?.placeId || ponto.partialMatch || (ponto.geocoderStatus?.code || 0) !== 0 ||
      !ponto.type?.some(tipo => ['street_address', 'premise', 'subpremise'].includes(tipo))) {
      throw new Falha(422, 'O Google não confirmou um endereço preciso. Confira rua e número da loja e do destino.')
    }
  }
  const metros = data?.routes?.[0]?.distanceMeters
  return precificarDistancia(metros, valorKm, 'Google Maps')
}

export function precificarDistancia(metros, valorKm, provedor) {
  const tarifa = Number(valorKm)
  if (!Number.isInteger(metros) || metros <= 0 || metros > 1000000) {
    throw new Falha(422, 'Nenhuma distância válida foi encontrada para este trajeto. Nenhuma taxa foi calculada.')
  }
  if (!Number.isFinite(tarifa) || tarifa <= 0 || tarifa > 1000) throw new Falha(422, 'Tarifa salva inválida.')
  return {
    distancia_metros: metros, valor_km: tarifa,
    taxa: Math.round(metros * Math.round(tarifa * 100) / 1000) / 100,
    provedor, modo: 'DRIVE', somente_simulacao: true,
  }
}

export function criarHandler({ apiKey, provider = 'openrouteservice', allowedOrigins, criarCliente, fetchFn = fetch }) {
  return async request => {
    const origin = request.headers.get('origin')
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' }
    if (origin && allowedOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info'
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    }
    const responder = (status, body) => new Response(JSON.stringify(body), { status, headers })
    if (origin && !allowedOrigins.includes(origin)) return responder(403, { error: 'Origem não autorizada.' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return responder(405, { error: 'Método não permitido.' })
    try {
      const authorization = request.headers.get('authorization') || ''
      if (!/^Bearer \S+$/i.test(authorization)) throw new Falha(401, 'Entre novamente para consultar a entrega.')
      const client = criarCliente(authorization)
      const { data: sessao, error: authError } = await client.auth.getUser(authorization.slice(7))
      if (authError || !sessao?.user) throw new Falha(401, 'Sessão inválida. Entre novamente.')
      if (!['openrouteservice', 'google'].includes(provider)) throw new Falha(503, 'Provedor de rotas inválido.')
      if (!apiKey) throw new Falha(503, 'Serviço de rotas ainda não configurado nos Secrets do Supabase.')
      // Limita o corpo inclusive quando Content-Length não é enviado.
      const reader = request.body?.getReader()
      if (!reader) throw new Falha(400, 'Informe loja e destino.')
      const chunks = []; let tamanho = 0
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          tamanho += value.length
          if (tamanho > 8192) { await reader.cancel(); throw new Falha(413, 'Endereço excede o tamanho permitido.') }
          chunks.push(value)
        }
      } finally { reader.releaseLock() }
      const bytes = new Uint8Array(tamanho); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      let body
      try { body = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new Falha(400, 'Requisição inválida.') }
      if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body?.loja_id || '')) throw new Falha(400, 'Selecione uma loja válida.')
      const destino = enderecoParaRota(body.destino)
      // O navegador não decide origem, tarifa ou permissões. A RPC usa auth.uid().
      const { data: config, error } = await client.rpc('preparar_consulta_rota', { p_loja: body.loja_id })
      if (error) {
        if (error.code === '42501') throw new Falha(403, 'Sem permissão para consultar rotas nesta unidade.')
        if (error.code === 'P0001') throw new Falha(429, 'Limite de consultas atingido. Aguarde antes de tentar novamente.')
        if (error.code === '22023') throw new Falha(422, 'Salve o endereço e a tarifa da loja antes de consultar.')
        throw new Falha(503, 'Não foi possível preparar a consulta. Confira a instalação da migração de rotas.')
      }
      const origem = enderecoParaRota(config)
      if (provider === 'openrouteservice') {
        const rota = await consultarORS({ apiKey, origem: config, destino: body.destino, textoOrigem: origem, textoDestino: destino, fetchFn })
        return responder(200, { ...precificarDistancia(rota.metros, config.valor_km, 'openrouteservice'), origem, destino,
          origem_localizada: rota.origemLocalizada, destino_localizado: rota.destinoLocalizado,
          origem_modo: rota.origemModo, destino_modo: rota.destinoModo })
      }
      let resposta
      try {
        resposta = await fetchFn('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.distanceMeters,geocodingResults' },
          body: JSON.stringify({ origin: { address: origem }, destination: { address: destino },
            travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', computeAlternativeRoutes: false,
            languageCode: 'pt-BR', regionCode: 'br', units: 'METRIC' }),
        })
      } catch { throw new Falha(502, 'O serviço de mapas não respondeu. Tente novamente; nenhuma taxa foi calculada.') }
      if (!resposta.ok) throw new Falha(502, 'Não foi possível consultar o Google Maps. Confira chave, API, faturamento e cotas.')
      const resultado = interpretarRota(await resposta.json(), config.valor_km)
      return responder(200, { ...resultado, origem, destino })
    } catch (error) {
      // Não devolver erros brutos do provedor ou do banco, nem registrar endereços/chaves.
      return responder(error instanceof Falha ? error.status : 500,
        { error: error instanceof Falha ? error.message : 'Não foi possível calcular a entrega.' })
    }
  }
}
