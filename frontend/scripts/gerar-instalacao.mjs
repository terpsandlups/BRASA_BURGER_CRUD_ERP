import {writeFile} from 'node:fs/promises';
import {fontesBootstrap} from './bootstrap.mjs';
const fontes=await fontesBootstrap();
const sql='-- CONVIVIUM: instalacao integral em projeto Supabase NOVO.\n'+
 '-- Nao reaplicar em banco operacional. Auth/roles pertencem ao Supabase.\n\n'+
 "DO $$ BEGIN IF to_regclass('public.lojas') IS NOT NULL OR to_regclass('public.empresas') IS NOT NULL THEN RAISE EXCEPTION 'Instalacao permitida somente em projeto novo, sem tabelas do ERP.'; END IF; END $$;\n"+
 fontes.map(f=>`\n-- FONTE: ${f.arquivo}\n${f.sql}\n`).join('\n');
await writeFile(new URL('../../sql/instalacao/convivium-completo.sql',import.meta.url),sql.trimEnd()+'\n');
console.log(`Instalador gerado a partir de ${fontes.length} fontes SQL.`);
