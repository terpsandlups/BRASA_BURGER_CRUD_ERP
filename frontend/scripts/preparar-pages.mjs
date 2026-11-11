import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.PAGES_BASE || '/';
if(!/^\/(?:[A-Za-z0-9_.-]+\/)?$/.test(base))throw new Error('Base pública inválida.');
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Abrindo Convívium</title><p>Abrindo Convívium…</p><script>
const base=${JSON.stringify(base)};
if(location.pathname.startsWith(base))location.replace(base+'?__convivium_route='+encodeURIComponent('/'+location.pathname.slice(base.length)+location.search)+location.hash);
</script><noscript>Ative JavaScript para abrir o portal.</noscript></html>`;
await writeFile(new URL('../dist/404.html',import.meta.url),html);
await writeFile(new URL('../dist/.nojekyll',import.meta.url),'');
const index=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
if(!index.includes(base+'assets/'))throw new Error('O build não utiliza a base pública configurada.');
console.log('Rotas diretas preparadas para '+base);
