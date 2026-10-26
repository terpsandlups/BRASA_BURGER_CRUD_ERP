import { validarCPF } from './format.js'

export function montarSolicitacao({ lojaId, tipo, pagamento, cliente, itens, endereco, observacoes, troco, cotacaoId = null, taxaEntrega = 0 }) {
  if (!lojaId || !itens.length) throw new Error('Selecione a unidade e os itens.')
  if (!validarCPF(cliente.cpf)) throw new Error('Confira o CPF.')
  if (cliente.nome.trim().length < 2 || !/^\d{10,11}$/.test(cliente.telefone.replace(/\D/g, ''))) throw new Error('Confira nome e telefone.')
  const valorTroco = pagamento === 'dinheiro' && troco ? Number(troco.replace(',', '.')) : null
  if (tipo === 'delivery' && !cotacaoId) throw new Error('Aguarde o cálculo do frete antes de enviar.')
  if (valorTroco !== null && (!Number.isFinite(valorTroco) || valorTroco < totalCarrinho(itens) + Number(taxaEntrega))) throw new Error('Informe um valor para troco igual ou maior que o total.')
  return {
    loja_id: lojaId, tipo_atendimento: tipo, forma_pagamento: pagamento, cotacao_id: tipo === 'delivery' ? cotacaoId : null,
    nome: cliente.nome.trim(), cpf: cliente.cpf.replace(/\D/g, ''), telefone: cliente.telefone.replace(/\D/g, ''),
    observacoes: observacoes.trim(), troco_para: valorTroco,
    endereco: tipo === 'delivery' ? { ...endereco, cep: (endereco.cep || '').replace(/\D/g, ''), estado: (endereco.estado || '').toUpperCase() } : null,
    itens: itens.map(i => ({ variacao_id: i.id, quantidade: i.quantidade, preco_unitario: Number(i.preco),
      adicionais: i.extras.map(a => ({ id: a.id, preco_unitario: Number(a.preco) })) })),
  }
}

export function totalCarrinho(itens) {
  return itens.reduce((soma, i) => soma + (Math.round(Number(i.preco) * 100) + i.extras.reduce((s, a) => s + Math.round(Number(a.preco) * 100), 0)) * i.quantidade, 0) / 100
}

export function mensagemPortal(error) {
  if (error?.code === 'PGRST202' || error?.code === '42P01') return 'Pedidos online temporariamente indisponíveis. Tente novamente mais tarde.'
  if (/^[0-9A-Z]{5}$/.test(error?.code || '') && error.code !== 'P0001') return 'Não foi possível concluir. Atualize o cardápio e confira os dados.'
  return error?.message || 'Não foi possível conectar. Tente novamente.'
}
