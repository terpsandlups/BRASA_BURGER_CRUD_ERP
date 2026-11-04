import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { aplicarBootstrap } from './bootstrap.mjs';
import { authTeste } from './auth-teste.mjs';

export async function verificarPostgres(url){
 const base=new URL(url);
 if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname)) throw new Error('Use somente PostgreSQL local e descartável.');
 const conexoes=[];const bancos=[];const resultados=[];
 const conectar=async(connectionString)=>{const c=new pg.Client({connectionString});try{await c.connect()}catch(error){await c.end().catch(()=>{});throw error}conexoes.push(c);return c};
 const admin=await conectar(url);
 try{
  for(let n=1;n<=2;n++){
   const nome='convivium_test_'+randomUUID().replaceAll('-','');bancos.push(nome);
   await admin.query(`CREATE DATABASE "${nome}"`);
   const alvo=new URL(url);alvo.pathname='/'+nome;
   const owner=await conectar(alvo.href);
   await owner.query(authTeste);await aplicarBootstrap(sql=>owner.query(sql));
   assert.equal(Number((await owner.query('SELECT count(*) FROM empresas')).rows[0].count),1);
   resultados.push(`Instalação integral em banco vazio ${n}: aprovada`);
   if(n!==1) continue;
   const master=randomUUID(),cliente=randomUUID(),gerente=randomUUID();
   for(const [id,email] of [[master,'master@example.test'],[cliente,'cliente@example.test'],[gerente,'gerente@example.test']]) await owner.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,email]);
   await owner.query("SELECT erp_privado.provisionar_primeiro_master('master@example.test')");
   const sessao=async(id)=>{const c=await conectar(alvo.href);await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await c.query('SET ROLE authenticated');return c};
   const m1=await sessao(master),m2=await sessao(master),c1=await sessao(cliente),c2=await sessao(cliente);
   const rpc=async(c,acao,dados)=>(await c.query('SELECT administrar_plataforma($1,$2::jsonb) AS id',[acao,JSON.stringify(dados)])).rows[0].id;
   const loja=await rpc(m1,'loja',{nome:'Unidade de teste A',tipo_operacao:'presencial_delivery'});
   const outra=await rpc(m1,'loja',{nome:'Unidade de teste B',tipo_operacao:'presencial_delivery'});
   await rpc(m1,'colaborador',{email:'gerente@example.test',nome:'Gerente de teste',perfil:'Gerente',loja_id:outra});
   const empresa='a0000000-0000-0000-0000-000000000001';
   const ing=randomUUID(),varId=randomUUID(),cat=(await owner.query('SELECT id FROM categorias LIMIT 1')).rows[0].id;
   await owner.query("INSERT INTO ingredientes(id,nome,unidade_medida,custo_unitario,empresa_id) VALUES($1,'Insumo sintético','g',0.05,$2)",[ing,empresa]);
   await owner.query("INSERT INTO produtos(sku,nome,categoria_id,empresa_id) VALUES('DEMO-BURGER','Burger de teste',$1,$2)",[cat,empresa]);
   await owner.query("INSERT INTO produto_variacoes(id,produto_sku,nome_variacao,preco_venda) VALUES($1,'DEMO-BURGER','150 g',25)",[varId]);
   await owner.query('INSERT INTO fichas_tecnicas(variacao_id,ingrediente_id,peso_quantidade) VALUES($1,$2,150)',[varId,ing]);
   await owner.query('INSERT INTO estoque_lojas(loja_id,ingrediente_id,quantidade_disponivel) VALUES($1,$2,1000)',[loja,ing]);
   const payload={loja_id:loja,tipo_atendimento:'presencial',forma_pagamento:'pix',nome:'Consumidor Sintético',cpf:'52998224725',telefone:'11999999999',observacoes:'Validação descartável',endereco:null,troco_para:null,itens:[{variacao_id:varId,quantidade:1,preco_unitario:25,adicionais:[]}]};
   const chave=randomUUID();
   const enviar=c=>c.query('SELECT enviar_solicitacao_mobile($1,$2::jsonb) AS id',[chave,JSON.stringify(payload)]);
   const enviados=await Promise.all([enviar(c1),enviar(c2)]);
   const solicitacao=enviados[0].rows[0].id;assert.equal(enviados[1].rows[0].id,solicitacao);
   const saldo=async()=>Number((await owner.query('SELECT quantidade_disponivel FROM estoque_lojas WHERE loja_id=$1 AND ingrediente_id=$2',[loja,ing])).rows[0].quantidade_disponivel);
   assert.equal(await saldo(),1000);
   resultados.push('Duas conexões de consumidor enviam a mesma chave: uma solicitação e nenhuma baixa');
   const aceitar=c=>c.query("SELECT decidir_solicitacao_mobile($1,'aceitar',NULL,NULL) AS id",[solicitacao]);
   const aceitos=await Promise.all([aceitar(m1),aceitar(m2)]);
   const pedido=aceitos[0].rows[0].id;assert.equal(aceitos[1].rows[0].id,pedido);
   assert.equal(await saldo(),850);
   assert.equal(Number((await owner.query('SELECT count(*) FROM pedidos')).rows[0].count),1);
   resultados.push('Duas conexões da equipe aceitam simultaneamente: uma venda de R$ 25,00 e uma baixa de 150 g');
   const g=await sessao(gerente);
   assert.equal((await g.query('SELECT * FROM pedidos')).rowCount,0);
   await assert.rejects(g.query("SELECT avancar_pedido_transacional($1,'recebido')",[pedido]),/permissão|unidade|acesso/i);
   resultados.push('Gerente de outra unidade: leitura vazia e alteração negada');
   await m1.query("SELECT cancelar_pedido_transacional($1,'recebido','Validação de devolução','devolver_estoque',NULL)",[pedido]);
   assert.equal(await saldo(),1000);
   assert.equal((await owner.query('SELECT status FROM pedidos WHERE id=$1',[pedido])).rows[0].status,'cancelado');
   resultados.push('Cancelamento devolve 150 g e preserva pedido cancelado no histórico');
   payload.itens[0].quantidade=99;
   const s2=(await c1.query('SELECT enviar_solicitacao_mobile($1,$2::jsonb) AS id',[randomUUID(),JSON.stringify(payload)])).rows[0].id;
   await assert.rejects(m1.query("SELECT decidir_solicitacao_mobile($1,'aceitar',NULL,NULL)",[s2]),/estoque/i);
   assert.equal(await saldo(),1000);
   assert.equal(Number((await owner.query('SELECT count(*) FROM pedidos')).rows[0].count),1);
   resultados.push('Estoque insuficiente: rollback sem venda/baixa parcial');
   try{assert.equal((await c1.query('SELECT * FROM clientes')).rowCount,0)}
   catch(error){assert.equal(error.code,'42501')}
  }
  return {data:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',dateStyle:'short'}).format(new Date()),ambiente:'PostgreSQL nativo local, dois bancos vazios e conexões independentes; contrato Auth de teste',resultados};
 }finally{
  for(const c of conexoes.slice(1).reverse()) await c.end().catch(()=>{});
  for(const nome of bancos) await admin.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
  await admin.end();
 }
}

if(process.env.POSTGRES_TEST_URL){
 const result=await verificarPostgres(process.env.POSTGRES_TEST_URL);
 console.log(JSON.stringify(result,null,2));
}
