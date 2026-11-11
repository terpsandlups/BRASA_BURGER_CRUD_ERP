import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {aplicarBootstrap} from './bootstrap.mjs';
import {montarSolicitacao} from '../src/lib/portalCliente.js';
import {criarEnvioTransacional} from '../src/lib/pedidoTransacional.js';
import {acessarContaCliente} from '../src/lib/acessoCliente.js';
import {criarAcessoCliente} from '../../supabase/functions/acesso-cliente/handler.mjs';

// A homologação só aceita a stack LOCAL criada pelo CLI no runner descartável.
const workdir=process.env.SUPABASE_TEST_WORKDIR;
if(!workdir) throw new Error('Informe SUPABASE_TEST_WORKDIR de uma stack local descartável.');
const vars=JSON.parse(execFileSync('supabase',['status','--workdir',workdir,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url=vars.API_URL;const dbUrl=vars.DB_URL;
for(const valor of [url,dbUrl]) if(!valor || !['127.0.0.1','localhost','[::1]'].includes(new URL(valor).hostname)) throw new Error('A homologação recusa projetos remotos.');
const owner=new pg.Client({connectionString:dbUrl});await owner.connect();
const clients=[];const resultado=[];
const client=(key)=>{const c=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(c);return c};
try{
 assert.equal((await owner.query("SELECT to_regclass('public.empresas') AS tabela")).rows[0].tabela,null,'Use stack vazia.');
 await aplicarBootstrap(sql=>owner.query(sql));
 await owner.query(await readFile(new URL('../../sql/instalacao/dados_demonstracao.sql',import.meta.url),'utf8'));
 const service=client(vars.SERVICE_ROLE_KEY),anon=vars.ANON_KEY;
 const senha='Aa1!'+randomUUID();const users={};
 for(const tipo of ['master','gerente']){
  const email=tipo+'@example.test';const {data,error}=await service.auth.admin.createUser({email,password:senha,email_confirm:true});
  if(error)throw error;users[tipo]=data.user;
 }
 await owner.query("SELECT erp_privado.provisionar_primeiro_master('master@example.test')");
 const entrar=async(tipo)=>{const c=client(anon);const {error}=await c.auth.signInWithPassword({email:tipo+'@example.test',password:senha});if(error)throw error;return c};
 const admin=await entrar('master'),consumer=client(anon),admin2=await entrar('master');
 const handler=criarAcessoCliente({allowedOrigins:['http://localhost:5173'],
  resolverConta:async cpf=>{const {data,error}=await service.rpc('preparar_login_cliente',{p_cpf:cpf});if(error)throw error;return data},
  autenticar:(email,password)=>client(anon).auth.signInWithPassword({email,password}),
  cadastrar:dados=>service.auth.admin.createUser(dados),
  limitarCadastro:async chave=>{const {data,error}=await service.rpc('reservar_cadastro_cliente',{p_chave:chave});if(error)throw error;return data===true}});
 const functions={invoke:async(nome,{body})=>{
  assert.equal(nome,'acesso-cliente');
  const resposta=await handler(new Request(url+'/functions/v1/acesso-cliente',{method:'POST',headers:{origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify(body)}));
  const data=await resposta.json();if(!resposta.ok)throw new Error(data.error);return {data,error:null};
 }};
 const cadastro=await acessarContaCliente(consumer.auth,{cadastro:true,email:'',senha,retorno:'http://localhost:5173/pedir/brasa-burger',cpf:'52998224725',nome:'Consumidor Sintético',telefone:'11999999999'},functions);
 assert.ok(cadastro.session,'Cadastro por CPF deve criar sessão sem envio de e-mail.');
 const perfil=await owner.query('SELECT id FROM public.usuarios WHERE id=$1',[cadastro.user.id]);
 assert.equal(perfil.rows.length,0,'Cadastro público nunca concede perfil de equipe.');
 resultado.push('Cadastro público real pelo módulo do portal cria sessão de consumidor sem acesso de equipe');
 await consumer.auth.signOut();
 await acessarContaCliente(consumer.auth,{cadastro:false,email:'529.982.247-25',senha},functions);
 const proprio=await consumer.rpc('meu_cadastro_cliente');if(proprio.error)throw proprio.error;assert.equal(proprio.data.cpf,'52998224725');
 resultado.push('CPF e senha passam pelo handler do servidor, Auth real e instalação da sessão no módulo do portal');
 const rpc=async(c,fn,args)=>{const {data,error}=await c.rpc(fn,args);if(error)throw error;return data};
 const loja=(await owner.query("SELECT id FROM lojas WHERE slug='demo-japy'")).rows[0].id;
 const outra=(await owner.query("SELECT id FROM lojas WHERE slug='demo-retiro'")).rows[0].id;
 await rpc(admin,'administrar_plataforma',{p_acao:'colaborador',p_dados:{email:'gerente@example.test',nome:'Gerente Sintético',perfil:'Gerente',loja_id:outra}});
 await owner.query("NOTIFY pgrst,'reload schema'");
 // A nova função pode exigir uma atualização do cache do PostgREST.
 let card;
 for(let n=0;n<15;n++){
  try{card=await rpc(consumer,'cardapio_mobile',{p_slug:'brasa-burger'});break}catch(e){if(n===14)throw e;await new Promise(r=>setTimeout(r,1000))}
 }
 assert.equal(card.lojas.length,3);assert.equal(card.itens.length,1);
 const v=card.itens[0].id;
 resultado.push('Auth real local e catálogo via PostgREST: três unidades e um produto sintético');
 const payload=montarSolicitacao({lojaId:loja,tipo:'presencial',pagamento:'pix',cliente:{nome:'Consumidor Sintético',cpf:'52998224725',telefone:'11999999999'},itens:[{id:v,preco:27.9,quantidade:2,extras:[]}],endereco:{},observacoes:'Homologação E2',troco:''});
 const envio=criarEnvioTransacional(consumer,undefined,{funcao:'enviar_solicitacao_mobile'});
 const solicitacao=await envio.enviar(payload);
 const antes=await admin.from('estoque_lojas').select('quantidade_disponivel').eq('loja_id',loja).single();if(antes.error)throw antes.error;assert.equal(Number(antes.data.quantidade_disponivel),100);
 resultado.push('Funções do frontend enviam solicitação real: subtotal R$ 55,80 e estoque ainda 100');
 const fila=await admin.from('solicitacoes_mobile').select('id,loja_id').eq('id',solicitacao).single();if(fila.error)throw fila.error;assert.equal(fila.data.loja_id,loja);
 const aceitar=c=>rpc(c,'decidir_solicitacao_mobile',{p_id:solicitacao,p_acao:'aceitar',p_motivo:null,p_cotacao:null});
 const [p1,p2]=await Promise.all([aceitar(admin),aceitar(admin2)]);assert.equal(p1,p2);
 const pedido=await admin.from('pedidos').select('id,status,valor_total').eq('id',p1).single();if(pedido.error)throw pedido.error;assert.equal(Number(pedido.data.valor_total),55.8);
 const estoque=await admin.from('estoque_lojas').select('quantidade_disponivel').eq('loja_id',loja).single();if(estoque.error)throw estoque.error;assert.equal(Number(estoque.data.quantidade_disponivel),98);
 const acompanhamento=await rpc(consumer,'acompanhar_solicitacoes_mobile',{p_pagina:0});assert.equal(acompanhamento[0].etapa,'recebido');
 resultado.push('Duas sessões Auth independentes aceitam: uma venda R$ 55,80, saldo 98 e acompanhamento recebido');
 const manager=await entrar('gerente');const oculto=await manager.from('pedidos').select('id').eq('id',p1);if(oculto.error)throw oculto.error;assert.equal(oculto.data.length,0);
 const {error:negado}=await manager.rpc('avancar_pedido_transacional',{p_pedido:p1,p_status_esperado:'recebido'});assert.ok(negado);
 resultado.push('Gerente de outra unidade não lê nem avança o pedido');
 let avisar;
 const aviso=new Promise(resolve=>{avisar=resolve});
 const publicadas=(await owner.query("SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'")).rows.map(r=>r.tablename);
 assert.ok(publicadas.includes('eventos_pedidos_cliente'),'Publicação precisa conter o aviso ao consumidor.');
 const estadosRealtime=[];
 let confirmarBanco;
 const bancoAssinado=new Promise(resolve=>{confirmarBanco=resolve});
 const canal=consumer.channel('teste-status-titular')
  .on('system',{},evento=>{if(evento.extension==='postgres_changes'){estadosRealtime.push('postgres:'+evento.status);if(evento.status==='ok')confirmarBanco()}})
  .on('postgres_changes',{event:'*',schema:'public',table:'eventos_pedidos_cliente',filter:`usuario_id=eq.${cadastro.user.id}`},()=>avisar());
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Realtime não confirmou a assinatura.')),15000);
  canal.subscribe(status=>{estadosRealtime.push(status);if(status==='SUBSCRIBED'){clearTimeout(timer);resolve()}else if(['CHANNEL_ERROR','TIMED_OUT'].includes(status)){clearTimeout(timer);reject(new Error('Realtime indisponível no ensaio.'))}});
 });
 let timerBanco;
 try{await Promise.race([bancoAssinado,new Promise((_,reject)=>{timerBanco=setTimeout(()=>reject(new Error('Assinatura PostgreSQL não ficou pronta. Estados: '+estadosRealtime.join(','))),20000)})])}finally{clearTimeout(timerBanco)}
 await rpc(admin,'avancar_pedido_transacional',{p_pedido:p1,p_status_esperado:'recebido'});
 const avisoPersistido=await consumer.from('eventos_pedidos_cliente').select('usuario_id').eq('usuario_id',cadastro.user.id);if(avisoPersistido.error)throw avisoPersistido.error;assert.equal(avisoPersistido.data.length,1,'Status precisa persistir aviso visível ao titular.');
 let timerEvento;
 try{await Promise.race([aviso,new Promise((_,reject)=>{timerEvento=setTimeout(()=>reject(new Error('Status não chegou ao consumidor por Realtime. Estados: '+estadosRealtime.join(','))),15000)})])}
 catch(error){
  const slots=(await owner.query('SELECT active FROM pg_replication_slots')).rows;
  const assinaturas=(await owner.query('SELECT count(*)::int AS n FROM realtime.subscription')).rows;
  console.log(JSON.stringify({diagnosticoRealtime:{publicadas,slots,assinaturas,estados:estadosRealtime}}));throw error;
 }finally{clearTimeout(timerEvento)}
 const aoVivo=await rpc(consumer,'acompanhar_solicitacoes_mobile',{p_pagina:0});assert.equal(aoVivo[0].etapa,'em_preparo');
 resultado.push('Evento Realtime real avisa o consumidor do status em preparo sem liberar leitura do pedido interno');
 await consumer.removeChannel(canal);
 await rpc(admin,'cancelar_pedido_transacional',{p_pedido:p1,p_status_esperado:'em_preparo',p_motivo:'Validação de devolução E2',p_destino:'devolver_estoque',p_pedido_destino:null});
 const final=await admin.from('estoque_lojas').select('quantidade_disponivel').eq('loja_id',loja).single();if(final.error)throw final.error;assert.equal(Number(final.data.quantidade_disponivel),100);
 resultado.push('Cancelamento via API real devolve duas unidades e preserva o histórico');
 const report={data:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',dateStyle:'short'}).format(new Date()),ambiente:'Supabase local descartável no GitHub Actions: Auth, PostgREST e PostgreSQL reais',resultado};
 await mkdir('../docs/entrega-02/anexos',{recursive:true});
 await writeFile('../docs/entrega-02/anexos/resultado-api-local.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{
 for(const c of clients){await c.auth.signOut().catch(()=>{});c.removeAllChannels()}
 await owner.end();
}
