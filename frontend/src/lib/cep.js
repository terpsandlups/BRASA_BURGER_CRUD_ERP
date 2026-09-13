export function formatarCEP(valor) {
  const d = (valor || '').replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d{1,3})/, '$1-$2')
}

export async function buscarCEP(cepFormatadoOuDigitos) {
  const digitos = (cepFormatadoOuDigitos || '').replace(/\D/g, '')
  if (digitos.length !== 8) return null
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
    if (!resposta.ok) return null
    const dados = await resposta.json()
    if (dados.erro) return null
    return {
      logradouro: dados.logradouro || '',
      bairro: dados.bairro || '',
      cidade: dados.localidade || '',
      estado: dados.uf || '',
    }
  } catch {
    return null
  }
}
