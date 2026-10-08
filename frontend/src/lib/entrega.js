// Valores monetários em centavos e distância em metros evitam arredondar cada km.
export function numeroDecimal(valor) {
  const texto = String(valor ?? '').trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(texto)) return NaN
  return Number(texto.replace(',', '.'))
}

export function calcularTaxaEntrega(distanciaKm, valorKm) {
  const distancia = numeroDecimal(distanciaKm)
  const tarifa = numeroDecimal(valorKm)
  if (!Number.isFinite(distancia) || distancia <= 0 || distancia > 1000) {
    throw new Error('Informe uma distância maior que zero e até 1.000 km.')
  }
  if (!Number.isFinite(tarifa) || tarifa <= 0 || tarifa > 1000) {
    throw new Error('Informe um valor por km maior que zero e até R$ 1.000,00.')
  }
  const metros = Math.round(distancia * 1000)
  const centavosKm = Math.round(tarifa * 100)
  if (metros < 1 || centavosKm < 1) throw new Error('A precisão mínima é de 1 metro e 1 centavo por km.')
  return Math.round(metros * centavosKm / 1000) / 100
}

export function exigeFreteProprio(tipoAtendimento, canalVenda) {
  return tipoAtendimento === 'delivery' && canalVenda === 'proprio'
}

export function cotacaoPedidoValida(cotacao, lojaId, clienteCpf, agora = Date.now()) {
  return Boolean(cotacao && cotacao.lojaId === lojaId && cotacao.clienteCpf === clienteCpf &&
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(cotacao.cotacao_id || '') &&
    Number.isFinite(cotacao.taxa) && cotacao.taxa >= 0 &&
    Number.isFinite(Date.parse(cotacao.expira_em)) && Date.parse(cotacao.expira_em) > agora)
}

export function totalComFrete(subtotal, taxa = 0) {
  return Math.round((Number(subtotal) + Number(taxa)) * 100) / 100
}

export function prepararConfiguracaoEntrega(valores) {
  const campos = ['cep', 'numero', 'endereco', 'bairro', 'cidade', 'estado', 'complemento']
  const dados = Object.fromEntries(campos.map(campo => [campo, String(valores[campo] ?? '').trim()]))
  dados.cep = dados.cep.replace(/\D/g, '')
  dados.estado = dados.estado.toUpperCase()
  if (!/^\d{8}$/.test(dados.cep)) throw new Error('Informe um CEP com 8 dígitos.')
  if (['numero', 'endereco', 'bairro', 'cidade'].some(campo => !dados[campo])) {
    throw new Error('Preencha rua, número (ou s/n), bairro e cidade da loja.')
  }
  if (!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(dados.estado)) {
    throw new Error('Informe uma UF válida.')
  }
  const tarifa = numeroDecimal(valores.valor_km)
  calcularTaxaEntrega(1, tarifa)
  if (Math.abs(tarifa * 100 - Math.round(tarifa * 100)) > 1e-8) {
    throw new Error('O valor por km deve ter no máximo duas casas decimais.')
  }
  const temLatitude = valores.latitude !== null && valores.latitude !== undefined
  const temLongitude = valores.longitude !== null && valores.longitude !== undefined
  if (temLatitude !== temLongitude) throw new Error('Marque novamente o ponto da loja no mapa.')
  if (temLatitude) {
    const latitude = Number(valores.latitude)
    const longitude = Number(valores.longitude)
    if (valores.latitude === '' || valores.longitude === '' ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -34 || latitude > 6 || longitude < -74 || longitude > -34) {
      throw new Error('O ponto da loja deve estar no Brasil. Marque-o novamente no mapa.')
    }
    return { ...dados, valor_km: tarifa, latitude, longitude }
  }
  return { ...dados, valor_km: tarifa, latitude: null, longitude: null }
}
