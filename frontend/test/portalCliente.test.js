import test from 'node:test'
import assert from 'node:assert/strict'
import { montarSolicitacao, totalCarrinho } from '../src/lib/portalCliente.js'
import { criarEnvioTransacional } from '../src/lib/pedidoTransacional.js'

const itens = [{ id:'variacao', preco:24.9, quantidade:3, extras:[{ id:'bacon', preco:3.15 }] }]
function form() { return { lojaId:'loja',tipo:'presencial',pagamento:'dinheiro',cliente:{ nome:' Cliente ',cpf:'529.982.247-25',telefone:'(11) 99999-9999' },itens,endereco:{},observacoes:' Sem cebola ',troco:'' } }

test('portal: subtotal em centavos, dados normalizados e pagamento presencial sem frete inventado', () => {
  assert.equal(totalCarrinho(itens),84.15)
  const dados=montarSolicitacao(form())
  assert.equal(dados.cpf,'52998224725'); assert.equal(dados.telefone,'11999999999')
  assert.equal(dados.troco_para,null); assert.equal(dados.endereco,null)
  assert.equal(dados.observacoes,'Sem cebola'); assert.equal(dados.itens[0].adicionais[0].preco_unitario,3.15)
  assert.equal(dados.canal_venda,undefined); assert.equal(dados.taxa_entrega,undefined)
})

test('portal: recusa CPF, contato e troco inválidos antes de enviar', () => {
  assert.throws(() => montarSolicitacao({ ...form(),cliente:{ ...form().cliente,cpf:'11111111111' } }),/CPF/)
  assert.throws(() => montarSolicitacao({ ...form(),troco:'abc' }),/troco/)
  assert.throws(() => montarSolicitacao({ ...form(),troco:'80' }),/troco/)
  assert.equal(montarSolicitacao({ ...form(),troco:'100,00' }).troco_para,100)
})

test('portal: resposta perdida recupera a mesma solicitação e não muda para RPC de venda', async () => {
  const chamadas=[]
  const envio=criarEnvioTransacional({ rpc:async (nome,args) => {
    chamadas.push({nome,args}); if (chamadas.length===1) throw new TypeError('Falha de rede')
    return { data:'solicitacao',error:null }
  } },() => 'chave-original',{funcao:'enviar_solicitacao_mobile'})
  await assert.rejects(envio.enviar(montarSolicitacao(form())),/rede/)
  assert.equal(await envio.enviar(null),'solicitacao')
  assert.equal(chamadas[0].nome,'enviar_solicitacao_mobile')
  assert.deepEqual(chamadas[0],chamadas[1])
})
