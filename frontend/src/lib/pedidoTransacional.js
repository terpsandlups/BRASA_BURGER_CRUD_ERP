// Os preços e percentuais do catálogo têm duas casas no PostgreSQL. Inteiros
// evitam que 24,90 × 1,15 vire 28,63 no JS em vez de 28,64 no banco.
export function calcularPrecoCanal(preco, markup = 0) {
  const centavos = BigInt(Number(preco).toFixed(2).replace('.', ''))
  const pontos = BigInt(Number(markup).toFixed(2).replace('.', ''))
  const numerador = centavos * (10000n + pontos)
  const modulo = numerador < 0n ? -numerador : numerador
  const arredondado = (modulo + 5000n) / 10000n
  return Number(numerador < 0n ? -arredondado : arredondado) / 100
}

export function montarPedidoTransacional({ lojaId, clienteCpf, tipoAtendimento, formaPagamento, canalVenda, observacoes, trocoPara, itens, cotacaoId = null }) {
  return {
    loja_id: lojaId, cliente_cpf: clienteCpf, tipo_atendimento: tipoAtendimento,
    forma_pagamento: formaPagamento, canal_venda: canalVenda,
    cotacao_entrega_id: tipoAtendimento === 'delivery' && canalVenda === 'proprio' ? cotacaoId : null,
    observacoes: observacoes.trim() || null,
    troco_para: formaPagamento === 'dinheiro' ? Number(trocoPara) : null,
    itens: itens.map((item) => ({
      variacao_id: item.variacao_id, quantidade: Number(item.quantidade),
      preco_unitario: Number(Number(item.preco_unitario).toFixed(2)),
      adicionais: item.adicionaisSelecionados.map((a) => ({ id: a.id, preco_unitario: Number(a.preco_adicional) })),
    })),
  }
}

export function criarEnvioTransacional(client, gerarId = () => crypto.randomUUID(), { storage = null, chave = 'brasa.pedido.pendente' } = {}) {
  let pendente = null
  try {
    const salvo = JSON.parse(storage?.getItem(chave) || 'null')
    if (salvo?.id && salvo?.dados?.loja_id && Array.isArray(salvo?.dados?.itens)) pendente = salvo
  } catch { /* Armazenamento indisponível não impede o envio transacional. */ }
  const salvar = () => {
    try { if (pendente) storage?.setItem(chave, JSON.stringify(pendente)); else storage?.removeItem(chave) } catch { /* A trava em memória continua ativa. */ }
  }
  let emCurso = null
  return {
    temPendente: () => pendente !== null,
    enviar(dados) {
      if (emCurso) return emCurso
      if (!pendente) { pendente = { id: gerarId(), dados: JSON.parse(JSON.stringify(dados)) }; salvar() }
      const requisicao = pendente
      emCurso = (async () => {
        const { data, error } = await client.rpc('criar_pedido_transacional', {
          p_requisicao: requisicao.id, p_dados: requisicao.dados,
        })
        if (error) {
          // Erro SQL confirma rollback. Erros de transporte não confirmam o resultado.
          if (/^[0-9A-Z]{5}$/.test(error.code || '') && !error.code.startsWith('08')) pendente = null
          if (error.code === 'PGRST202') pendente = null
          salvar()
          throw error
        }
        if (!data) throw new Error('Resposta sem identificador. Reenvie para confirmar o pedido.')
        pendente = null
        salvar()
        return data
      })().finally(() => { emCurso = null })
      return emCurso
    },
  }
}
