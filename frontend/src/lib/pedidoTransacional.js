export function montarPedidoTransacional({ lojaId, clienteCpf, tipoAtendimento, formaPagamento, canalVenda, observacoes, trocoPara, itens }) {
  return {
    loja_id: lojaId, cliente_cpf: clienteCpf, tipo_atendimento: tipoAtendimento,
    forma_pagamento: formaPagamento, canal_venda: canalVenda,
    observacoes: observacoes.trim() || null,
    troco_para: formaPagamento === 'dinheiro' ? Number(trocoPara) : null,
    itens: itens.map((item) => ({
      variacao_id: item.variacao_id, quantidade: Number(item.quantidade),
      preco_unitario: Number(Number(item.preco_unitario).toFixed(2)),
      adicionais: item.adicionaisSelecionados.map((a) => ({ id: a.id, preco_unitario: Number(a.preco_adicional) })),
    })),
  }
}

export function criarEnvioTransacional(client, gerarId = () => crypto.randomUUID()) {
  let pendente = null
  let emCurso = null
  return {
    temPendente: () => pendente !== null,
    enviar(dados) {
      if (emCurso) return emCurso
      if (!pendente) pendente = { id: gerarId(), dados: JSON.parse(JSON.stringify(dados)) }
      const requisicao = pendente
      emCurso = (async () => {
        const { data, error } = await client.rpc('criar_pedido_transacional', {
          p_requisicao: requisicao.id, p_dados: requisicao.dados,
        })
        if (error) {
          // Erro SQL confirma rollback. Erros de transporte não confirmam o resultado.
          if (/^[0-9A-Z]{5}$/.test(error.code || '') && !error.code.startsWith('08')) pendente = null
          if (error.code === 'PGRST202') pendente = null
          throw error
        }
        if (!data) throw new Error('Resposta sem identificador. Reenvie para confirmar o pedido.')
        pendente = null
        return data
      })().finally(() => { emCurso = null })
      return emCurso
    },
  }
}
