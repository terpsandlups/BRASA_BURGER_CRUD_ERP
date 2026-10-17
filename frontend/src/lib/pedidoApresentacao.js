const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const dinheiro = valor => moeda.format(Number(valor || 0))
export const codigoPedido = id => String(id || '').slice(0, 8).toUpperCase()
export const quantidadeItens = pedido => (pedido.itens_pedido || []).reduce((total, item) => total + Number(item.quantidade), 0)

// A quantidade do adicional já representa todas as unidades da linha.
export function totalItemPedido(item) {
  const base = Number(item.quantidade) * Number(item.preco_unitario)
  const extras = (item.itens_pedido_adicionais || []).reduce((soma, a) => soma + Number(a.quantidade) * Number(a.preco_unitario), 0)
  return Math.round((base + extras + Number.EPSILON) * 100) / 100
}

export function esperaPedido(minutos) {
  if (minutos < 60) return `${minutos} min`
  if (minutos < 1440) return `${Math.floor(minutos / 60)}h ${minutos % 60}min`
  return `${Math.floor(minutos / 1440)}d ${Math.floor((minutos % 1440) / 60)}h`
}
