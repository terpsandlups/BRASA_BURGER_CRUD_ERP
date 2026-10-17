import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarCardapio, pendenciaConclusao } from '../src/lib/cardapioPedido.js'

const catalogo = {
  categorias: [{ id: 1, nome: 'Lanches' }, { id: 2, nome: 'Bebidas' }],
  produtos: [
    { sku: 'LAN001', nome: 'Hambúrguer', nome_comercial: 'Brasa Clássico', categorias: { nome: 'Lanches' }, disponivel_delivery: true, disponivel_presencial: true },
    { sku: 'BEB001', nome: 'Água', categorias: { nome: 'Bebidas' }, disponivel_delivery: false, disponivel_presencial: true },
    { sku: 'LAN002', nome: 'Sem variação', categorias: { nome: 'Lanches' }, disponivel_delivery: true, disponivel_presencial: true },
  ],
  variacoes: [{ id: 1, produto_sku: 'LAN001', nome_variacao: '150g' }, { id: 2, produto_sku: 'LAN001', nome_variacao: '200g' }, { id: 3, produto_sku: 'BEB001', nome_variacao: '500ml' }],
  tipoAtendimento: 'delivery',
}

test('busca normaliza acentos e encontra nome comercial, SKU e variação', () => {
  for (const termo of ['hamburguer', 'BRASA CLASSICO', 'lan001']) {
    assert.equal(filtrarCardapio({ ...catalogo, termo })[0].itens.length, 2)
  }
  assert.deepEqual(filtrarCardapio({ ...catalogo, termo: '200g' })[0].itens.map(i => i.variacao.id), [2])
})

test('cardápio respeita atendimento e categoria, ocultando produtos sem variação', () => {
  assert.equal(filtrarCardapio(catalogo).length, 1)
  const presencial = filtrarCardapio({ ...catalogo, tipoAtendimento: 'presencial', categoria: 'Bebidas' })
  assert.equal(presencial.length, 1)
  assert.equal(presencial[0].itens[0].produto.sku, 'BEB001')
  assert.equal(filtrarCardapio({ ...catalogo, termo: 'inexistente' }).length, 0)
  assert.equal(filtrarCardapio(catalogo)[0].itens.length, 2)
})

const pedido = { lojaId: 'loja', cliente: { cpf: 'teste' }, itens: [{ quantidade: 1 }], pagamento: 'pix', freteObrigatorio: true, cotacaoAtiva: true, trocoPara: '', total: 30 }

test('conclusão indica a primeira pendência sem liberar carrinho incompleto', () => {
  assert.match(pendenciaConclusao({ ...pedido, lojaId: '' }), /unidade/)
  assert.match(pendenciaConclusao({ ...pedido, cliente: null }), /CPF/)
  assert.match(pendenciaConclusao({ ...pedido, itens: [] }), /produto/)
  assert.match(pendenciaConclusao({ ...pedido, pagamento: '' }), /pagamento/)
  assert.match(pendenciaConclusao({ ...pedido, cotacaoAtiva: false }), /frete/)
  assert.equal(pendenciaConclusao(pedido), '')
  assert.equal(pendenciaConclusao({ ...pedido, cotacaoAtiva: false, freteObrigatorio: false }), '')
})

test('quantidades inválidas não liberam conclusão', () => {
  for (const quantidade of ['', 0, -1, 1.5, 10000, 'abc']) {
    assert.match(pendenciaConclusao({ ...pedido, itens: [{ quantidade }] }), /quantidade/)
  }
  assert.equal(pendenciaConclusao({ ...pedido, itens: [{ quantidade: '2' }] }), '')
})

test('dinheiro aceita valor exato vazio e bloqueia valor inferior ou inválido', () => {
  for (const trocoPara of ['', '30', '50']) {
    assert.equal(pendenciaConclusao({ ...pedido, pagamento: 'dinheiro', trocoPara }), '')
  }
  for (const trocoPara of ['29.99', '-1', 'abc', 'Infinity']) {
    assert.match(pendenciaConclusao({ ...pedido, pagamento: 'dinheiro', trocoPara }), /valor recebido/)
  }
})
