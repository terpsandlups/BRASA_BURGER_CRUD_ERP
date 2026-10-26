import { before, after, beforeEach, afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { calcularPrecoCanal } from '../src/lib/pedidoTransacional.js'

// PostgreSQL real em WASM. Nenhuma chamada à rede ou ao Supabase de produção.
let db
const loja = '10000000-0000-0000-0000-000000000001'
const carne = '40000000-0000-0000-0000-000000000001'
const bacon = '40000000-0000-0000-0000-000000000002'
const admin = '20000000-0000-0000-0000-000000000001'
const variacao = '50000000-0000-0000-0000-000000000001'
const extra = '60000000-0000-0000-0000-000000000001'
const sql = async path => readFile(new URL(path, import.meta.url), 'utf8')
const valor = async (query, params = []) => Object.values((await db.query(query, params)).rows[0])[0]
const saldo = ingrediente => valor('SELECT quantidade_disponivel::float FROM estoque_lojas WHERE loja_id=$1 AND ingrediente_id=$2', [loja, ingrediente])

before(async () => {
  db = new PGlite()
  await db.exec(await sql('./fixtures/erp.sql'))
  for (const path of [
    '../../sql/migration_fase2_estoque.sql',
    '../../supabase/migrations/20261008010733_frete_no_pedido.sql',
    '../../supabase/migrations/20261008012909_restringir_escrita_pedidos.sql',
    '../../supabase/migrations/20261009000030_cancelamento_estorno_estoque.sql',
    '../../supabase/migrations/20261009001643_corrigir_fatos_cancelados.sql',
    '../../supabase/migrations/20261017173447_operacao_estoque_segura.sql',
    '../../supabase/migrations/20261017174630_proteger_acessos_operacionais.sql',
    '../../supabase/migrations/20261025000912_portal_clientes_convivium.sql',
    '../../sql/edicao_fichas_vigente.sql',
    '../../sql/migration_configuracao_entrega.sql',
    '../../supabase/migrations/20261025004910_empresas_acesso_frete_cliente.sql',
  ]) await db.exec(await sql(path))
})
after(async () => { await db?.close() })
beforeEach(async () => { await db.exec('BEGIN'); await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [admin]) })
afterEach(async () => { await db.exec('ROLLBACK') })

async function rejeita(query, params, mensagem) {
  await db.exec('SAVEPOINT esperado')
  try { await assert.rejects(db.query(query, params), mensagem) }
  finally { await db.exec('ROLLBACK TO SAVEPOINT esperado; RELEASE SAVEPOINT esperado') }
}
function dados(qtd = 1, adicionais = true) {
  return { loja_id: loja, cliente_cpf: '12345678900', tipo_atendimento: 'presencial', forma_pagamento: 'pix', canal_venda: 'proprio',
    itens: [{ variacao_id: variacao, quantidade: qtd, preco_unitario: 25, adicionais: adicionais ? [{ id: extra, preco_unitario: 3 }] : [] }] }
}
async function pedido(payload = dados(), chave = randomUUID()) {
  return valor('SELECT criar_pedido_transacional($1, $2::jsonb)', [chave, JSON.stringify(payload)])
}
const cancelar = (id, destino, alvo = null, status = 'recebido') => valor('SELECT cancelar_pedido_transacional($1,$2,$3,$4,$5)', [id, status, 'Teste isolado de cancelamento', destino, alvo])

const mobileUser = '20000000-0000-0000-0000-000000000005'
async function contaMobile() {
  await db.query('INSERT INTO auth.users(id) VALUES($1)', [mobileUser])
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [mobileUser])
}
function dadosMobile() {
  return { loja_id: loja, tipo_atendimento: 'presencial', forma_pagamento: 'pix', nome: 'Cliente Mobile',
    cpf: '52998224725', telefone: '11999999999', observacoes: '', troco_para: null, endereco: null, itens: dados().itens }
}
const solicitar = (payload = dadosMobile(), chave = randomUUID()) => valor('SELECT enviar_solicitacao_mobile($1,$2::jsonb)', [chave,JSON.stringify(payload)])
const decidirMobile = (id, acao, cotacao = null, motivo = null) => valor('SELECT decidir_solicitacao_mobile($1,$2,$3,$4)', [id,acao,motivo,cotacao])
const administrar=(acao,dados)=>valor('SELECT administrar_plataforma($1,$2::jsonb)',[acao,JSON.stringify(dados)])

test('mobile: conta sem perfil calcula frete com orçamento próprio e não consulta configuração interna',async()=>{
  await db.query("INSERT INTO configuracoes_entrega(loja_id,cep,endereco,numero,bairro,cidade,estado,valor_km) VALUES($1,'13201000','Rua Exemplo','10','Centro','Jundiaí','SP',1.5)",[loja])
  await contaMobile();await db.exec('SET LOCAL ROLE authenticated')
  assert.equal(Number(await valor('SELECT count(*) FROM configuracoes_entrega')),0)
  for(let i=0;i<3;i++) assert.equal((await valor('SELECT preparar_consulta_rota_mobile($1)',[loja])).valor_km,1.5)
  await rejeita('SELECT preparar_consulta_rota_mobile($1)',[loja],/Limite/)
})

test('mobile: cotação vencida ou de outro titular não envia pedido nem cria cadastro',async()=>{
  await contaMobile()
  const payload=dadosMobile();payload.tipo_atendimento='delivery';payload.endereco={cep:'13201000',endereco:'Rua Exemplo',numero:'10',bairro:'Centro',cidade:'Jundiaí',estado:'SP'}
  const id=randomUUID();payload.cotacao_id=id
  await db.query("INSERT INTO cotacoes_mobile(id,usuario_id,loja_id,origem,destino,distancia_metros,valor_km,taxa,expira_em) VALUES($1,$2,$3,'{}',$4,2500,1.5,3.75,now()-interval '1 minute')",[id,mobileUser,loja,JSON.stringify(payload.endereco)])
  await rejeita('SELECT enviar_solicitacao_mobile($1,$2)',[randomUUID(),JSON.stringify(payload)],/Frete expirado/)
  await db.query("UPDATE cotacoes_mobile SET expira_em=now()+interval '15 minutes',usuario_id=$1 WHERE id=$2",[admin,id])
  await rejeita('SELECT enviar_solicitacao_mobile($1,$2)',[randomUUID(),JSON.stringify(payload)],/Frete expirado/)
  assert.equal(Number(await valor('SELECT count(*) FROM solicitacoes_mobile')),0)
})

test('mobile: reserva é idempotente e mantém o frete contratado durante espera pelo aceite',async()=>{
  await contaMobile()
  const payload=dadosMobile();payload.tipo_atendimento='delivery';payload.endereco={cep:'13201000',endereco:'Rua Exemplo',numero:'10',bairro:'Centro',cidade:'Jundiaí',estado:'SP'}
  const id=randomUUID();payload.cotacao_id=id
  await db.query("INSERT INTO cotacoes_mobile(id,usuario_id,loja_id,origem,destino,distancia_metros,valor_km,taxa) VALUES($1,$2,$3,'{}',$4,2500,1.5,3.75)",[id,mobileUser,loja,JSON.stringify(payload.endereco)])
  const chave=randomUUID();const solicitacao=await solicitar(payload,chave)
  assert.equal(await solicitar(payload,chave),solicitacao)
  await rejeita('SELECT enviar_solicitacao_mobile($1,$2)',[randomUUID(),JSON.stringify(payload)],/Frete expirado/)
  await db.query("UPDATE cotacoes_mobile SET expira_em=now()-interval '1 minute' WHERE id=$1",[id])
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[admin])
  const pedidoId=await decidirMobile(solicitacao,'aceitar')
  assert.equal(Number(await valor('SELECT taxa_entrega FROM pedidos WHERE id=$1',[pedidoId])),3.75)
})

test('empresas: master cadastra empresa/unidade, troca contexto e CPF se repete sem compartilhar cadastro',async()=>{
  const empresa=await administrar('empresa',{nome:'Outra hamburgueria',slug:'outra-hamburgueria'})
  await administrar('selecionar_empresa',{id:empresa})
  await administrar('empresa',{id:empresa,nome:'Outra personalizada',cor:'#efc778',logo_url:'https://example.test/logo.png'})
  const unidade=await administrar('loja',{nome:'Unidade Nova',tipo_operacao:'presencial_delivery'})
  await db.query("INSERT INTO clientes(cpf,nome) VALUES('12345678900','Contato de outra marca')")
  await db.exec('SET LOCAL ROLE authenticated')
  assert.equal(Number(await valor('SELECT count(*) FROM lojas')),1)
  assert.equal(await valor('SELECT id FROM lojas'),unidade)
  assert.equal(await valor("SELECT nome FROM clientes WHERE cpf='12345678900'"),'Contato de outra marca')
  assert.equal(Number(await valor('SELECT count(*) FROM produtos')),0)
  assert.equal(Number(await valor('SELECT count(*) FROM ingredientes')),0)
  assert.equal(Number(await valor('SELECT count(*) FROM fichas_tecnicas')),0)
  assert.equal(Number(await valor('SELECT count(*) FROM estoque_lojas')),0)
  await rejeita('SELECT criar_pedido_transacional($1,$2)',[randomUUID(),JSON.stringify(dados())],/Sem permissão/)
  const catalogo=await valor("SELECT cardapio_mobile('outra-hamburgueria')")
  assert.equal(catalogo.empresa.nome,'Outra personalizada')
  assert.equal(catalogo.empresa.cor,'#efc778');assert.equal(catalogo.empresa.logo_url,'https://example.test/logo.png')
  assert.equal(catalogo.lojas.length,1);assert.equal(catalogo.itens.length,0)
  await administrar('selecionar_empresa',{id:'a0000000-0000-0000-0000-000000000001'})
  assert.equal(await valor("SELECT nome FROM clientes WHERE cpf='12345678900'"),'Cliente fictício')
})

test('empresas: administrador da marca vê suas unidades, gerente vê só a sua e não provisiona contas',async()=>{
  await db.query('UPDATE usuarios SET master=false WHERE id=$1',[admin])
  const unidade=await administrar('loja',{nome:'Unidade Três',tipo_operacao:'delivery_only'})
  await db.exec('SET LOCAL ROLE authenticated')
  assert.equal(Number(await valor('SELECT count(*) FROM lojas')),3)
  await rejeita('SELECT administrar_plataforma($1,$2)', ['empresa',JSON.stringify({nome:'Não permitido',slug:'outra'})],/master/)
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",['20000000-0000-0000-0000-000000000003'])
  assert.equal(Number(await valor('SELECT count(*) FROM lojas')),1)
  await rejeita('SELECT administrar_plataforma($1,$2)', ['loja',JSON.stringify({nome:'Não permitido',tipo_operacao:'delivery_only'})],/administrador/)
  await rejeita('SELECT criar_pedido_transacional($1,$2)',[randomUUID(),JSON.stringify({...dados(),loja_id:unidade})],/Sem permissão/)
})

test('empresas: vínculo de colaborador não promove master nem transfere conta de outra empresa',async()=>{
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'gerente@exemplo.test')",[mobileUser])
  await administrar('colaborador',{nome:'Gerente novo',email:'gerente@exemplo.test',perfil:'Gerente',loja_id:loja})
  assert.equal(await valor('SELECT master FROM usuarios WHERE id=$1',[mobileUser]),false)
  assert.equal(await valor('SELECT loja_id FROM usuarios WHERE id=$1',[mobileUser]),loja)
  const empresa=await administrar('empresa',{nome:'Marca Dois',slug:'marca-dois'})
  await administrar('selecionar_empresa',{id:empresa})
  await rejeita('SELECT administrar_plataforma($1,$2)', ['colaborador',JSON.stringify({nome:'Transferir',email:'gerente@exemplo.test',perfil:'Administrador'})],/outra empresa/)
})

test('empresas: trigger barra estoque, ficha e edição privilegiada com insumos de outra marca',async()=>{
  const empresa=await administrar('empresa',{nome:'Isolada',slug:'isolada'})
  await administrar('selecionar_empresa',{id:empresa})
  const unidade=await administrar('loja',{nome:'Isolada Centro',tipo_operacao:'presencial_delivery'})
  await rejeita('INSERT INTO estoque_lojas(loja_id,ingrediente_id) VALUES($1,$2)',[unidade,carne],/empresas diferentes/)
  await rejeita("SELECT editar_variacao($1,'100g',25,'Alteração indevida',30)",[variacao],/Sem permissão/)
  await rejeita('SELECT repor_estoque_transacional($1,$2,$3,10)',[randomUUID(),loja,carne],/Sem permissão/)
})

test('banco: edição vigente de ficha e variação valida perfil, precisão e versão anterior', async () => {
  const fichaId=await valor('SELECT id FROM fichas_tecnicas LIMIT 1')
  assert.equal(await valor('SELECT editar_quantidade_ficha($1,100,125.125)',[fichaId]),fichaId)
  await rejeita('SELECT editar_quantidade_ficha($1,100,150)',[fichaId],/outra sessão/)
  await rejeita('SELECT editar_quantidade_ficha($1,125.125,0)',[fichaId],/inválida/)
  assert.equal(await valor("SELECT editar_variacao($1,'100g',25,'125g',27.9)",[variacao]),variacao)
  await rejeita("SELECT editar_variacao($1,'100g',25,'150g',30)",[variacao],/outra sessão/)
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",['20000000-0000-0000-0000-000000000002'])
  await rejeita('SELECT editar_quantidade_ficha($1,125.125,150)',[fichaId],/Sem permissão/)
  await rejeita("SELECT editar_variacao($1,'125g',27.9,'150g',30)",[variacao],/Sem permissão/)
})

test('mobile: cadastro público não cria colaborador e catálogo público não revela custos nem clientes', async () => {
  await contaMobile()
  assert.equal(Number(await valor('SELECT count(*) FROM usuarios WHERE id=$1', [mobileUser])), 0)
  await db.exec('SET LOCAL ROLE anon')
  const catalogo = await valor('SELECT cardapio_mobile()')
  assert.equal(catalogo.itens.find(i => i.id === variacao).preco, 25)
  assert.ok(!JSON.stringify(catalogo).includes('custo'))
  await rejeita('SELECT * FROM clientes', [], /permission denied/)
  await rejeita('SELECT * FROM solicitacoes_mobile', [], /permission denied/)
  await rejeita('SELECT enviar_solicitacao_mobile($1,$2::jsonb)', [randomUUID(),JSON.stringify(dadosMobile())], /permission denied/)
})

test('mobile: solicitação idempotente não vende, não baixa estoque e não atualiza cadastro por CPF', async () => {
  await contaMobile()
  const chave = randomUUID(); const payload = dadosMobile()
  const id = await solicitar(payload,chave)
  assert.equal(await solicitar(payload,chave), id)
  assert.equal(await saldo(carne), 1000)
  assert.equal(Number(await valor('SELECT count(*) FROM pedidos')), 0)
  assert.equal(Number(await valor('SELECT count(*) FROM clientes WHERE cpf=$1', [payload.cpf])), 0)
  assert.equal(Number(await valor('SELECT subtotal FROM solicitacoes_mobile WHERE id=$1', [id])), 28)
  assert.equal((await valor('SELECT resumo_itens FROM solicitacoes_mobile WHERE id=$1', [id]))[0].nome, 'Burger teste · 100g')
  payload.nome = 'Outro nome'
  await rejeita('SELECT enviar_solicitacao_mobile($1,$2::jsonb)', [chave,JSON.stringify(payload)], /conteúdo diferente/)
})

test('mobile: cliente não lê ERP ou solicitações de terceiros nem aceita sua própria solicitação', async () => {
  await contaMobile(); const id = await solicitar()
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2)', [id,'aceitar'], /Sem permissão/)
  await db.exec('SET LOCAL ROLE authenticated')
  for (const tabela of ['usuarios','clientes','estoque_lojas','pedidos','fichas_tecnicas']) assert.equal(Number(await valor(`SELECT count(*) FROM ${tabela}`)), 0)
  assert.equal(Number(await valor('SELECT count(*) FROM solicitacoes_mobile')), 1)
  await rejeita("UPDATE solicitacoes_mobile SET status='aceita'", [], /permission denied/)
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", ['20000000-0000-0000-0000-000000000004'])
  assert.equal(Number(await valor('SELECT count(*) FROM solicitacoes_mobile')), 0)
  assert.equal((await valor('SELECT acompanhar_solicitacoes_mobile()')).length, 0)
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2)', [id,'cancelar'], /Sem permissão/)
})

test('mobile: aceite transacional baixa uma vez e mantém canal próprio e acompanhamento do titular', async () => {
  await contaMobile(); const id = await solicitar()
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [admin])
  const pedidoId = await decidirMobile(id,'aceitar')
  assert.equal(await decidirMobile(id,'aceitar'), pedidoId)
  assert.equal(await saldo(carne), 900)
  assert.equal(Number(await valor('SELECT valor_total FROM pedidos WHERE id=$1', [pedidoId])), 28)
  assert.equal(await valor('SELECT canal_venda FROM pedidos WHERE id=$1', [pedidoId]), 'proprio')
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [mobileUser])
  const acompanhamento = await valor('SELECT acompanhar_solicitacoes_mobile()')
  assert.equal(acompanhamento[0].etapa,'recebido')
  assert.equal(acompanhamento[0].total,28)
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2)', [id,'cancelar'], /outra sessão/)
})

test('mobile: preço adulterado, adicional repetido, CPF inválido e quantidade fracionária são recusados', async () => {
  await contaMobile()
  for (const alterar of [p => { p.itens[0].preco_unitario=0.01 }, p => { p.itens[0].adicionais.push(p.itens[0].adicionais[0]) }, p => { p.cpf='11111111111' }, p => { p.itens[0].quantidade=1.5 }]) {
    const payload = dadosMobile(); alterar(payload)
    await rejeita('SELECT enviar_solicitacao_mobile($1,$2::jsonb)', [randomUUID(),JSON.stringify(payload)], /Preço|Adicionais|CPF|Quantidade/)
  }
  assert.equal(Number(await valor('SELECT count(*) FROM solicitacoes_mobile')),0)
})

test('mobile: estoque insuficiente e preço atualizado revertem aceite e cadastro', async () => {
  await contaMobile(); const id = await solicitar()
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [admin])
  await db.query('UPDATE estoque_lojas SET quantidade_disponivel=10 WHERE ingrediente_id=$1', [carne])
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2)', [id,'aceitar'], /Estoque insuficiente/)
  assert.equal(await valor('SELECT status FROM solicitacoes_mobile WHERE id=$1',[id]), 'aguardando')
  assert.equal(Number(await valor("SELECT count(*) FROM clientes WHERE cpf='52998224725'")), 0)
  await db.query('UPDATE estoque_lojas SET quantidade_disponivel=1000 WHERE ingrediente_id=$1', [carne])
  await db.query('UPDATE produto_variacoes SET preco_venda=30 WHERE id=$1',[variacao])
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2)', [id,'aceitar'], /Preço alterado/)
  assert.equal(await saldo(carne),1000)
})

test('mobile: cancelamento e recusa exigem titular/permissão, motivo e estado pendente', async () => {
  await contaMobile(); const a = await solicitar(); const b = await solicitar()
  await decidirMobile(a,'cancelar'); await decidirMobile(a,'cancelar')
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [admin])
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2)',[a,'aceitar'], /outra sessão/)
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2)',[b,'recusar'], /motivo/)
  await decidirMobile(b,'recusar',null,'Loja encerrada')
  assert.equal(await saldo(carne),1000)
})

test('mobile: limites de envio bloqueiam spam sem impedir recuperação idempotente', async () => {
  await contaMobile(); const chave = randomUUID(); const id = await solicitar(dadosMobile(),chave)
  for (let i=0;i<4;i++) await solicitar()
  await rejeita('SELECT enviar_solicitacao_mobile($1,$2::jsonb)',[randomUUID(),JSON.stringify(dadosMobile())],/Limite/)
  assert.equal(await solicitar(dadosMobile(),chave),id)
})

test('mobile: frete exige endereço da solicitação, cotação válida e unidade autorizada', async () => {
  await contaMobile()
  const payload = dadosMobile(); payload.tipo_atendimento='delivery'
  payload.endereco={ cep:'13211772',endereco:'Rua Teste',numero:'10',bairro:'Centro',cidade:'Jundiaí',estado:'SP',complemento:'' }
  const cotacao=randomUUID()
  await db.query(`INSERT INTO cotacoes_mobile(id,usuario_id,loja_id,origem,destino,distancia_metros,valor_km,taxa)
    VALUES($1,$2,$3,'{}',$4,2500,1.5,3.75)`, [cotacao,mobileUser,loja,JSON.stringify({ ...payload.endereco,numero:'99' })])
  payload.cotacao_id=cotacao
  await rejeita('SELECT enviar_solicitacao_mobile($1,$2)',[randomUUID(),JSON.stringify(payload)],/endereço/)
  await db.query('UPDATE cotacoes_mobile SET destino=$1 WHERE id=$2',[JSON.stringify(payload.endereco),cotacao])
  const id=await solicitar(payload)
  assert.equal(Number(await valor('SELECT taxa_entrega FROM solicitacoes_mobile WHERE id=$1',[id])),3.75)
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", ['20000000-0000-0000-0000-000000000003'])
  await rejeita('SELECT decidir_solicitacao_mobile($1,$2,NULL,$3)',[id,'aceitar',cotacao],/Sem permissão/)
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [admin])
  const pedidoId=await decidirMobile(id,'aceitar')
  assert.equal(Number(await valor('SELECT valor_total FROM pedidos WHERE id=$1',[pedidoId])),31.75)
  assert.equal(await saldo(carne),900)
})

test('banco: pedido soma adicionais e baixa os insumos exatamente uma vez no reenvio', async () => {
  const chave = randomUUID()
  const id = await pedido(dados(2), chave)
  assert.equal(Number(await valor('SELECT valor_total FROM pedidos WHERE id=$1', [id])), 56)
  assert.equal(await saldo(carne), 800)
  assert.equal(await saldo(bacon), 960)
  assert.equal(await pedido(dados(2), chave), id)
  assert.equal(await saldo(carne), 800)
})

test('banco: markup no navegador coincide com round numeric do PostgreSQL', async () => {
  for (const [preco,markup] of [[24.9,15],[29.9,15],[19.9,15],[22.89,12],[0.05,10],[0.01,50]]) {
    const banco = Number(await valor('SELECT round($1::numeric*(1+$2::numeric/100),2)', [preco,markup]))
    assert.equal(calcularPrecoCanal(preco,markup), banco, `${preco} com markup ${markup}`)
  }
  await db.exec("UPDATE produto_variacoes SET preco_venda=24.90 WHERE produto_sku='LAN001'; UPDATE configuracoes_canal SET markup_preco_percentual=15 WHERE canal_venda='ifood'")
  const payload = dados(2)
  payload.canal_venda = 'ifood'
  payload.itens[0].preco_unitario = calcularPrecoCanal(24.9,15)
  const id = await pedido(payload)
  assert.equal(Number(await valor('SELECT valor_total FROM pedidos WHERE id=$1', [id])), 63.28)
})
test('banco: estoque insuficiente em adicional reverte pedido e baixas anteriores', async () => {
  await db.query('UPDATE estoque_lojas SET quantidade_disponivel=10 WHERE ingrediente_id=$1', [bacon])
  await rejeita('SELECT criar_pedido_transacional($1,$2::jsonb)', [randomUUID(), JSON.stringify(dados())], /Estoque insuficiente/)
  assert.equal(await saldo(carne), 1000)
  assert.equal(Number(await valor('SELECT count(*) FROM pedidos')), 0)
})
test('banco: devolução usa fotografia da venda mesmo após editar a ficha', async () => {
  const id = await pedido(dados(2))
  await db.exec('UPDATE fichas_tecnicas SET peso_quantidade=300')
  assert.equal(Number(await cancelar(id, 'devolver_estoque')), 56)
  assert.equal(await saldo(carne), 1000)
  assert.equal(await saldo(bacon), 1000)
  await rejeita('SELECT cancelar_pedido_transacional($1,$2,$3,$4,NULL)', [id,'recebido','Motivo repetido','devolver_estoque'], /outra sessão/)
  assert.equal(await saldo(carne), 1000)
  assert.equal(Number(await valor('SELECT valor_total FROM fato_vendas WHERE pedido_id=$1', [id])), 0)
  assert.equal(Number(await valor('SELECT count(*) FROM fato_itens_venda WHERE pedido_id=$1', [id])), 0)
})
test('banco: perda mantém estoque e registra custo histórico; ficha ausente não vira custo zero', async () => {
  const id = await pedido()
  await cancelar(id, 'perda_operacional')
  assert.equal(await saldo(carne), 900)
  assert.equal(Number(await valor('SELECT custo_operacional FROM cancelamentos_pedido WHERE pedido_id=$1', [id])), 2.8)
  const payload = dados(); payload.itens = [{ variacao_id: '50000000-0000-0000-0000-000000000002', quantidade: 1, preco_unitario: 5, adicionais: [] }]
  const semFicha = await pedido(payload)
  await cancelar(semFicha, 'perda_operacional')
  assert.equal(await valor('SELECT custo_operacional FROM cancelamentos_pedido WHERE pedido_id=$1', [semFicha]), null)
})
test('banco: reaproveitamento em cadeia compensa somente baixas duplicadas e devolve uma vez', async () => {
  const a = await pedido(); const b = await pedido(); const c = await pedido()
  assert.equal(await saldo(carne), 700)
  await cancelar(a, 'reaproveitar', b)
  assert.equal(await saldo(carne), 800)
  await cancelar(b, 'reaproveitar', c)
  assert.equal(await saldo(carne), 900)
  await cancelar(c, 'devolver_estoque')
  assert.equal(await saldo(carne), 1000)
  assert.equal(await saldo(bacon), 1000)
})
test('banco: reaproveitamento rejeita adicional diferente e alteração física na ficha', async () => {
  const a = await pedido()
  const b = await pedido(dados(1, false))
  await rejeita('SELECT cancelar_pedido_transacional($1,$2,$3,$4,$5)', [a,'recebido','Teste isolado','reaproveitar',b], /mesmos itens/)
  await db.exec('UPDATE fichas_tecnicas SET peso_quantidade=150')
  const c = await pedido()
  await rejeita('SELECT cancelar_pedido_transacional($1,$2,$3,$4,$5)', [a,'recebido','Teste isolado','reaproveitar',c], /ficha técnica mudou/)
  assert.equal(await saldo(carne), 650)
  assert.equal(Number(await valor('SELECT count(*) FROM cancelamentos_pedido')), 0)
})
test('banco: transições recusam status antigo e cancelamento direto', async () => {
  const id = await pedido()
  assert.equal(await valor('SELECT avancar_pedido_transacional($1,$2)', [id,'recebido']), 'em_preparo')
  await rejeita('SELECT avancar_pedido_transacional($1,$2)', [id,'recebido'], /outra sessão/)
  await rejeita("UPDATE pedidos SET status='cancelado' WHERE id=$1", [id], /cancelamento transacional/)
})
test('banco: visualizador, usuário inativo e gerente de outra unidade não alteram pedido', async () => {
  const id = await pedido()
  for (const sufixo of ['2','3','4']) {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [`20000000-0000-0000-0000-00000000000${sufixo}`])
    await rejeita('SELECT avancar_pedido_transacional($1,$2)', [id,'recebido'], /Sem permissão/)
    await rejeita('SELECT cancelar_pedido_transacional($1,$2,$3,$4,NULL)', [id,'recebido','Teste isolado','perda_operacional'], /Sem permissão/)
  }
})
test('banco: reposição soma ao saldo atual e reenvio não duplica entrada', async () => {
  const chave = randomUUID()
  await pedido()
  const query = 'SELECT repor_estoque_transacional($1,$2,$3,$4)'
  const params = [chave, loja, carne, 150.125]
  assert.equal(Number(await valor(query, params)), 1050.125)
  await pedido()
  assert.equal(Number(await valor(query, params)), 1050.125)
  assert.equal(await saldo(carne), 950.125)
  await rejeita(query, [chave,loja,carne,200], /outro conteúdo/)
  await rejeita(query, [randomUUID(),loja,carne,-5], /positiva/)
})
test('banco: navegador não consegue forjar status, saldo ou lançamento de estorno', async () => {
  await db.exec('SET LOCAL ROLE authenticated')
  await rejeita("UPDATE pedidos SET status='cancelado'", [], /permission denied/)
  await rejeita('UPDATE estoque_lojas SET quantidade_disponivel=99999', [], /permission denied/)
  await rejeita('INSERT INTO cancelamentos_pedido(pedido_id) VALUES (gen_random_uuid())', [], /permission denied/)
})

test('banco: perfil de leitura não promove permissões nem altera o catálogo', async () => {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", ['20000000-0000-0000-0000-000000000002'])
  await db.exec('SET LOCAL ROLE authenticated')
  await rejeita("UPDATE permissoes SET pode_editar=true", [], /permission denied/)
  await rejeita("UPDATE perfis SET nome='Administrador'", [], /permission denied/)
  const alteradas = await db.query("UPDATE produtos SET nome='Alteração indevida' RETURNING sku")
  assert.equal(alteradas.rows.length, 0)
  await rejeita("INSERT INTO clientes(cpf,nome) VALUES ('11111111111','Sem permissão')", [], /row-level security/)
})
test('banco: RLS filtra pedidos por unidade e usuário inativo não lê operação', async () => {
  await pedido()
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", ['20000000-0000-0000-0000-000000000003'])
  await db.exec('SET LOCAL ROLE authenticated')
  assert.equal(Number(await valor('SELECT count(*) FROM pedidos')), 0)
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", ['20000000-0000-0000-0000-000000000004'])
  assert.equal(Number(await valor('SELECT count(*) FROM pedidos')), 0)
  assert.equal(Number(await valor('SELECT count(*) FROM estoque_lojas')), 0)
})

test('banco: frete entra no total e a mesma cotação não pode criar dois pedidos', async () => {
  const cotacao = randomUUID()
  await db.query(`INSERT INTO cotacoes_entrega(id,usuario_id,loja_id,cliente_cpf,origem,destino,distancia_metros,valor_km,taxa,provedor)
    VALUES ($1,$2,$3,'12345678900','{}','{}',2500,1.5,3.75,'openrouteservice')`, [cotacao,admin,loja])
  const payload = { ...dados(2), tipo_atendimento: 'delivery', cotacao_entrega_id: cotacao }
  const id = await pedido(payload)
  assert.equal(Number(await valor('SELECT valor_total FROM pedidos WHERE id=$1', [id])), 59.75)
  assert.equal(Number(await valor('SELECT subtotal_itens FROM pedidos WHERE id=$1', [id])), 56)
  await rejeita('SELECT criar_pedido_transacional($1,$2::jsonb)', [randomUUID(),JSON.stringify(payload)], /Cotação expirada/)
  assert.equal(await saldo(carne), 800)
})
test('banco: cotação vencida e destino de outra unidade são recusados sem baixa', async () => {
  const cotacao = randomUUID()
  await db.query(`INSERT INTO cotacoes_entrega(id,usuario_id,loja_id,cliente_cpf,origem,destino,distancia_metros,valor_km,taxa,provedor,criado_em,expira_em)
    VALUES ($1,$2,$3,'12345678900','{}','{}',2500,1.5,3.75,'openrouteservice',now()-interval '1 hour',now()-interval '1 minute')`, [cotacao,admin,loja])
  const payload = { ...dados(), tipo_atendimento: 'delivery', cotacao_entrega_id: cotacao }
  await rejeita('SELECT criar_pedido_transacional($1,$2::jsonb)', [randomUUID(),JSON.stringify(payload)], /Cotação expirada/)
  await db.query("UPDATE cotacoes_entrega SET expira_em=now()+interval '15 minutes' WHERE id=$1", [cotacao])
  payload.loja_id = '10000000-0000-0000-0000-000000000002'
  await rejeita('SELECT criar_pedido_transacional($1,$2::jsonb)', [randomUUID(),JSON.stringify(payload)], /Cotação expirada/)
  assert.equal(await saldo(carne), 1000)
})
