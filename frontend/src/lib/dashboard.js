const dataBrasil = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})

export function diaBrasil(data) {
  const partes = Object.fromEntries(dataBrasil.formatToParts(new Date(data)).map(({ type, value }) => [type, value]))
  return `${partes.year}-${partes.month}-${partes.day}`
}

// Os períodos incluem hoje e começam à meia-noite em São Paulo (UTC-3).
export function intervaloDashboard(periodo, agora = new Date()) {
  const hoje = diaBrasil(agora)
  const inicio = new Date(`${hoje}T00:00:00-03:00`)
  inicio.setUTCDate(inicio.getUTCDate() - periodo + 1)
  const dias = Array.from({ length: periodo }, (_, i) => {
    const dia = new Date(inicio)
    dia.setUTCDate(dia.getUTCDate() + i)
    return diaBrasil(dia)
  })
  return { inicio: inicio.toISOString(), fim: agora.toISOString(), dias }
}

// Paginação também cobre projetos cujo limite de linhas seja menor que 500.
export async function carregarTodasPaginas(criarConsulta) {
  const registros = []
  for (;;) {
    const { data, error } = await criarConsulta().range(registros.length, registros.length + 499)
    if (error) throw error
    if (!data?.length) return registros
    registros.push(...data)
  }
}

export function calcularDashboard(pedidos, custos, dias = []) {
  const validos = pedidos.filter((p) => p.status !== 'cancelado')
  const faturamentoTotal = validos.reduce((soma, p) => soma + Number(p.valor_total), 0)
  const custoPorVariacao = new Map(custos
    .filter((c) => c.custo_ficha_tecnica != null && Number.isFinite(Number(c.custo_ficha_tecnica)))
    .map((c) => [c.variacao_id, Number(c.custo_ficha_tecnica)]))
  let custoTotal = 0
  let receitaComFicha = 0
  let receitaItens = 0
  let itensSemFicha = 0
  const produtos = new Map()
  const porDia = new Map(dias.map((dia) => [dia, 0]))
  const porLoja = new Map()
  const porCanal = new Map()
  const nomesCanal = { proprio: 'Próprio', ifood: 'iFood', rappi: 'Rappi' }

  for (const p of validos) {
    const dia = diaBrasil(p.criado_em)
    porDia.set(dia, (porDia.get(dia) || 0) + Number(p.valor_total))
    const loja = porLoja.get(p.loja_id) || { loja: p.lojas?.nome || 'Sem unidade', faturamento: 0 }
    loja.faturamento += Number(p.valor_total)
    porLoja.set(p.loja_id, loja)
    const canal = nomesCanal[p.canal_venda] || 'Não informado'
    porCanal.set(canal, (porCanal.get(canal) || 0) + 1)

    for (const item of p.itens_pedido || []) {
      const quantidade = Number(item.quantidade)
      const receita = Number(item.preco_unitario) * quantidade
      receitaItens += receita
      const custo = custoPorVariacao.get(item.variacao_id)
      if (custo !== undefined) {
        custoTotal += custo * quantidade
        receitaComFicha += receita
      } else {
        itensSemFicha += quantidade
      }
      const produto = produtos.get(item.produto_sku) || {
        sku: item.produto_sku, nome: item.produtos?.nome || item.produto_sku, quantidade: 0, receita: 0,
      }
      produto.quantidade += quantidade
      produto.receita += receita
      produtos.set(item.produto_sku, produto)
    }
  }
  const cmvPercentual = receitaComFicha > 0 ? custoTotal / receitaComFicha * 100 : null
  return {
    faturamentoTotal, pedidosTotal: validos.length,
    ticketMedio: validos.length ? faturamentoTotal / validos.length : null,
    cmvPercentual, margemPercentual: cmvPercentual === null ? null : 100 - cmvPercentual,
    custoTotal, receitaComFicha, itensSemFicha,
    coberturaCusto: receitaItens > 0 ? receitaComFicha / receitaItens * 100 : null,
    evolucao: [...porDia].sort(([a], [b]) => a.localeCompare(b)).map(([data, valor]) => ({
      data, dia: data.slice(5).split('-').reverse().join('/'), valor,
    })),
    faturamentoPorLoja: [...porLoja.values()],
    canais: [...porCanal].map(([nome, valor]) => ({ nome, valor })),
    topProdutos: [...produtos.values()].sort((a, b) => b.quantidade - a.quantidade).slice(0, 6),
  }
}
