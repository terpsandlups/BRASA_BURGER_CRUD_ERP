const CAMPOS = ['cep','endereco','numero','bairro','cidade','estado','complemento']
export function chaveCotacao(lojaId, destino, ponto) {
  const campos=CAMPOS.map(c=>String(destino[c] || '').trim().toLowerCase())
  campos[0]=campos[0].replace(/\D/g,'')
  return JSON.stringify([lojaId,...campos,ponto?.latitude ?? null,ponto?.longitude ?? null])
}
export function enderecoCompleto(destino) {
  return /^\d{8}$/.test(String(destino.cep || '').replace(/\D/g,'')) && CAMPOS.filter(c=>c!=='complemento').every(c=>String(destino[c] || '').trim()) && /^[A-Za-z]{2}$/.test(destino.estado || '')
}
export function pontoFavorito(destino) {
  if(destino.latitude==null || destino.longitude==null)return null
  const latitude=Number(destino.latitude),longitude=Number(destino.longitude)
  return Number.isFinite(latitude) && latitude>=-34 && latitude<=6 && Number.isFinite(longitude) && longitude>=-74 && longitude<=-34 ? {latitude,longitude} : null
}
export function pontoDoDispositivo(coords) {
  if(!Number.isFinite(coords?.accuracy) || coords.accuracy>100)throw new Error('A localização do dispositivo está imprecisa. Use o endereço ou ajuste o ponto no mapa.')
  const ponto=pontoFavorito(coords)
  if(!ponto)throw new Error('Não foi possível obter uma localização válida no Brasil.')
  return ponto
}
