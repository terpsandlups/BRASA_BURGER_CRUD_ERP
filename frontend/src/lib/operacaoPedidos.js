export function filtrarPedidosOperacao(pedidos, lojaId = 'todas', busca = '') {
  const termo = busca.trim().toLocaleLowerCase('pt-BR').replace(/^#/, '')
  const buscaCpf = /^[\d.\-\s]+$/.test(termo) ? termo.replace(/\D/g, '') : ''
  return pedidos.filter(p => (lojaId === 'todas' || p.loja_id === lojaId) && (
    !termo || String(p.id).toLowerCase().includes(termo) ||
    (buscaCpf.length > 0 && String(p.cliente_cpf || '').includes(buscaCpf)) ||
    (p.clientes?.nome || '').toLocaleLowerCase('pt-BR').includes(termo)
  ))
}

// Busca textual filtra os cartões; os indicadores resumem a unidade inteira.
export function indicadoresOperacao(hoje, ativos, lojaId, agora) {
  const validos = filtrarPedidosOperacao(hoje, lojaId).filter(p => p.status !== 'cancelado')
  const operacao = filtrarPedidosOperacao(ativos, lojaId)
  return {
    pedidosHoje: validos.length,
    faturamentoHoje: validos.reduce((soma, p) => soma + Number(p.valor_total), 0),
    emPreparo: operacao.filter(p => p.status === 'em_preparo').length,
    emEntrega: operacao.filter(p => p.status === 'saiu_entrega').length,
    atrasados: operacao.filter(p => new Date(agora) - new Date(p.criado_em) >= 30 * 60000).length,
  }
}

export function criarAtualizadorStatus(client) {
  const emCurso = new Set()
  return async (pedido, alteracoes) => {
    if (emCurso.has(pedido.id)) return false
    emCurso.add(pedido.id)
    try {
      const { data, error } = await client.from('pedidos').update(alteracoes)
        .eq('id', pedido.id).eq('status', pedido.status).select('id').maybeSingle()
      if (error) throw error
      if (!data) throw new Error('O pedido mudou em outra sessão ou você não tem permissão. Atualize a lista antes de tentar novamente.')
      return true
    } finally { emCurso.delete(pedido.id) }
  }
}
