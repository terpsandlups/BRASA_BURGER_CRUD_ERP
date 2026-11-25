import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { aplicarBootstrap } from './bootstrap.mjs'
import { authTeste } from './auth-teste.mjs'

export async function verificarSimulador(url){
 const base=new URL(url)
 if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw new Error('Simulador: teste exige PostgreSQL local descartável.')
 const admin=new pg.Client({connectionString:url});await admin.connect()
 const nome='convivium_sim_'+randomUUID().replaceAll('-','')
 let banco
 try{
  await admin.query(`CREATE DATABASE "${nome}"`)
  base.pathname='/'+nome
  banco=new pg.Client({connectionString:base.href});await banco.connect()
  await banco.query(authTeste);await aplicarBootstrap(sql=>banco.query(sql))
  await banco.query(await readFile(new URL('../../sql/instalacao/dados_demonstracao.sql',import.meta.url),'utf8'))
  await banco.query("UPDATE lojas SET tipo_operacao='delivery_only' WHERE slug='demo-retiro'")
  // Catálogo local descartável com quatro famílias; nenhuma cópia de clientes reais.
  await banco.query(`DO $$ DECLARE cat uuid; ing uuid; v uuid; g text; i integer; BEGIN
   SELECT id INTO ing FROM ingredientes LIMIT 1;
   FOREACH g IN ARRAY ARRAY['Lanches','Bebidas','Acompanhamentos','Sobremesas'] LOOP
    SELECT id INTO cat FROM categorias WHERE nome=g;
    IF cat IS NULL THEN INSERT INTO categorias(nome,empresa_id) VALUES(g,'a0000000-0000-0000-0000-000000000001') RETURNING id INTO cat; END IF;
    FOR i IN 1..10 LOOP
     INSERT INTO produtos(sku,nome,categoria_id,empresa_id) VALUES(g||i,g||' Teste '||i,cat,'a0000000-0000-0000-0000-000000000001');
     INSERT INTO produto_variacoes(produto_sku,nome_variacao,preco_venda) VALUES(g||i,'Único',10+i) RETURNING id INTO v;
     INSERT INTO fichas_tecnicas(variacao_id,ingrediente_id,peso_quantidade) VALUES(v,ing,1);
    END LOOP;
   END LOOP;
   INSERT INTO clientes(empresa_id,cpf,nome,telefone) VALUES('a0000000-0000-0000-0000-000000000001','52998224725','Registro anterior ao teste','11999999999');
   INSERT INTO pedidos(loja_id,cliente_cpf,tipo_atendimento,status,forma_pagamento,canal_venda,observacoes) SELECT id,'52998224725','delivery','entregue','pix','proprio','Registro anterior ao teste' FROM lojas LIMIT 1;
  END $$;`)
  const inicio=Date.now()
  await new Promise((resolve,reject)=>{
   const processo=spawn(process.env.PYTHON || 'python',['-m','unittest','discover','-s','scripts','-p','test_simulador.py','-v'],
    {cwd:new URL('../../',import.meta.url),env:{...process.env,SIMULADOR_TEST_URL:base.href},stdio:'inherit',windowsHide:true})
   processo.on('error',reject);processo.on('exit',codigo=>codigo===0?resolve():reject(new Error('Teste do simulador falhou.')))
  })
  return {aprovado:true,duracao_segundos:Math.round((Date.now()-inicio)/1000),vendas:9000,clientes:600,estoque:'preservado',reexecucao:'sem duplicatas',erro_fk:'rollback integral'}
 }finally{
  await banco?.end();await admin.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);await admin.end()
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\','/').split('/').at(-1))){
 if(!process.env.POSTGRES_TEST_URL)throw new Error('Defina POSTGRES_TEST_URL local descartável.')
 console.log(JSON.stringify(await verificarSimulador(process.env.POSTGRES_TEST_URL)))
}
