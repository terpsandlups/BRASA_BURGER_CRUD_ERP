const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// Agrupa uma única vez as variações; busca também por SKU e tamanho/variação.
export function filtrarCardapio({ produtos, variacoes, categorias, tipoAtendimento, categoria = 'todas', termo = '' }) {
  const busca = normalizar(termo)
  const porProduto = new Map()
  for (const variacao of variacoes) {
    if (!porProduto.has(variacao.produto_sku)) porProduto.set(variacao.produto_sku, [])
    porProduto.get(variacao.produto_sku).push(variacao)
  }
  return categorias.filter(cat => categoria === 'todas' || categoria === cat.nome).map(cat => ({
    ...cat,
    itens: produtos.filter(produto => produto.categorias?.nome === cat.nome &&
      (tipoAtendimento === 'delivery' ? produto.disponivel_delivery : produto.disponivel_presencial))
      .flatMap(produto => (porProduto.get(produto.sku) || [])
        .filter(variacao => normalizar(`${produto.nome} ${produto.nome_comercial || ''} ${produto.sku} ${variacao.nome_variacao}`).includes(busca))
        .map(variacao => ({ produto, variacao }))),
  })).filter(grupo => grupo.itens.length > 0)
}

export function pendenciaConclusao({ lojaId, cliente, itens, pagamento, freteObrigatorio, cotacaoAtiva, trocoPara, total }) {
  if (!lojaId) return 'Selecione a unidade para continuar.'
  if (!cliente) return 'Identifique o cliente pelo CPF.'
  if (!itens.length) return 'Adicione pelo menos um produto.'
  if (itens.some(item => !Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) < 1 || Number(item.quantidade) > 9999)) return 'Confira a quantidade dos itens (1 a 9.999).'
  if (freteObrigatorio && !cotacaoAtiva) return 'Calcule o frete para concluir a entrega.'
  if (!pagamento) return 'Selecione a forma de pagamento.'
  if (pagamento === 'dinheiro' && trocoPara !== '' && (!Number.isFinite(Number(trocoPara)) || Number(trocoPara) < total)) return 'O valor recebido deve cobrir o total.'
  return ''
}
