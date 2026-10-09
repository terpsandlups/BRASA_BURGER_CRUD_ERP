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
  return async (pedido) => {
    if (emCurso.has(pedido.id)) return false
    emCurso.add(pedido.id)
    try {
      const { data, error } = await client.rpc('avancar_pedido_transacional', {
        p_pedido: pedido.id, p_status_esperado: pedido.status,
      })
      if (error) throw error
      if (!data) throw new Error('O pedido mudou em outra sessão ou você não tem permissão. Atualize a lista antes de tentar novamente.')
      return true
    } finally { emCurso.delete(pedido.id) }
  }
}

export function assinaturaItensPedido(pedido) {
  return (pedido.itens_pedido || []).map(item => JSON.stringify({
    sku: item.produto_sku,
    variacao: item.variacao_id,
    quantidade: Number(item.quantidade),
    adicionais: (item.itens_pedido_adicionais || [])
      .map(a => `${a.adicional_id}:${Number(a.quantidade)}`).sort(),
  })).sort().join('|')
}

export function destinosReaproveitamento(origem, ativos) {
  const assinatura = assinaturaItensPedido(origem)
  if (!assinatura || !origem.estoque_rastreado) return []
  return ativos.filter(p => p.id !== origem.id && p.loja_id === origem.loja_id &&
    p.estoque_rastreado && assinaturaItensPedido(p) === assinatura)
}

export async function cancelarPedidoTransacional(client, pedido, { motivo, destino, pedidoDestinoId }) {
  if (motivo.trim().length < 3 || motivo.trim().length > 500) throw new Error('Informe um motivo entre 3 e 500 caracteres.')
  if (!['devolver_estoque', 'perda_operacional', 'reaproveitar'].includes(destino)) throw new Error('Selecione o destino dos itens.')
  if (destino === 'reaproveitar' && !pedidoDestinoId) throw new Error('Selecione o pedido que receberá os itens.')
  const { data, error } = await client.rpc('cancelar_pedido_transacional', {
    p_pedido: pedido.id,
    p_status_esperado: pedido.status,
    p_motivo: motivo.trim(),
    p_destino: destino,
    p_pedido_destino: destino === 'reaproveitar' ? pedidoDestinoId : null,
  })
  if (error) throw error
  return data
}
