import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { aplicarBootstrap } from '../scripts/bootstrap.mjs';
import { authTeste } from '../scripts/auth-teste.mjs';
import { readFile } from 'node:fs/promises';

test('bootstrap: instala todos os SQLs em dois bancos vazios, sem fixture de negocio',async()=>{
 for(let repeticao=0;repeticao<2;repeticao++){
  const db=new PGlite({extensions:{uuid_ossp}});
  try{
   await db.exec(authTeste);
   await aplicarBootstrap(sql=>db.exec(sql));
   assert.equal((await db.query('SELECT count(*)::int AS n FROM empresas')).rows[0].n,1);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM usuarios')).rows[0].n,0);
   assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_proc WHERE proname='administrar_plataforma'")).rows[0].n,1);
   await db.query("INSERT INTO auth.users VALUES('20000000-0000-0000-0000-000000000001','master@example.test','{}')");
   await db.query("SELECT erp_privado.provisionar_primeiro_master('master@example.test')");
   assert.equal((await db.query('SELECT master FROM usuarios')).rows[0].master,true);
   await assert.rejects(db.query("SELECT erp_privado.provisionar_primeiro_master('master@example.test')"),/Já existe/);
   await db.exec(await readFile(new URL('../../sql/instalacao/dados_demonstracao.sql',import.meta.url),'utf8'));
   assert.equal((await db.query('SELECT count(*)::int AS n FROM lojas')).rows[0].n,3);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM produtos')).rows[0].n,1);
   await assert.rejects(db.exec(await readFile(new URL('../../sql/instalacao/dados_demonstracao.sql',import.meta.url),'utf8')),/banco novo/);
   await db.exec('ROLLBACK');
   await db.exec('SET ROLE anon');
   await assert.rejects(db.query('SELECT * FROM clientes'),/permission denied/);
  }finally{await db.close()}
 }
});
