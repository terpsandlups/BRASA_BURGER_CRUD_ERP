export function decimalPositivo(valor, casas, maximo) {
  const texto = String(valor ?? '').trim().replace(',', '.')
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${casas}})?$`).test(texto)) throw new Error(`Informe um número positivo com até ${casas} casas decimais.`)
  const numero = Number(texto)
  if (!Number.isFinite(numero) || numero <= 0 || numero > maximo) throw new Error('Valor fora do intervalo permitido.')
  return numero
}
export function validarVariacao(nome, preco) {
  const nomeLimpo = String(nome ?? '').trim()
  if (!nomeLimpo || nomeLimpo.length > 100) throw new Error('Informe um nome com até 100 caracteres.')
  return { nome_variacao: nomeLimpo, preco_venda: decimalPositivo(preco, 2, 99999999.99) }
}
export const validarQuantidadeFicha = valor => decimalPositivo(valor, 3, 9999999.999)
