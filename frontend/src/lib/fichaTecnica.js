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

export function resumirFicha(ficha, precoVenda) {
  const linhas = ficha.map(item => {
    const quantidade = Number(item.peso_quantidade), custo = item.ingredientes?.custo_unitario
    const valorCusto = custo !== null && custo !== undefined && Number.isFinite(Number(custo)) && Number(custo)>=0 && Number.isFinite(quantidade) && quantidade>0 ? quantidade*Number(custo) : null
    return {...item, valorCusto, custoCentavos:valorCusto === null ? null : Math.round(valorCusto*100)}
  })
  const completa = linhas.length>0 && linhas.every(l=>l.custoCentavos !== null)
  const custoExato = completa ? linhas.reduce((s,l)=>s+l.valorCusto,0) : null
  const custoCentavos = completa ? Math.round(custoExato*100) : null
  const precoCentavos = Math.round(Number(precoVenda)*100)
  const cmv = completa && Number.isFinite(precoCentavos) && precoCentavos>0 ? custoExato/Number(precoVenda)*100 : null
  return {linhas,custoCentavos,cmv,margem:cmv === null ? null : 100-cmv}
}
