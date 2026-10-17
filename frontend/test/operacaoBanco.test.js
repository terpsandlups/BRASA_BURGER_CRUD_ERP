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
