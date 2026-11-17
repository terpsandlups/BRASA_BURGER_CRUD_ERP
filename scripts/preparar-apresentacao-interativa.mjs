import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const pasta=new URL('frontend/public/apresentacao/',root);
await mkdir(new URL('assets/',pasta),{recursive:true});
const data=JSON.parse(await readFile(new URL('docs/entrega-02/SLIDES_CONTEUDO.json',root),'utf8'));
for(const slides of Object.values(data))for(const slide of slides)for(const campo of ['image','backgroundImage','decorationImage']){
 if(!slide[campo])continue;
 const nome=path.basename(slide[campo]);await copyFile(new URL(slide[campo],root),new URL('assets/'+nome,pasta));slide[campo]='assets/'+nome;
}
await writeFile(new URL('conteudo.js',pasta),'window.CONVIVIUM_SLIDES = '+JSON.stringify(data,null,2)+';\n');
await copyFile(new URL('frontend/public/imagens/cardapio/burger.webp',root),new URL('assets/burger-ilustracao.webp',pasta));
const creditos=await readFile(new URL('Slides/Entrega-2/assets/CREDITOS.md',root),'utf8');
const creditosCardapio=await readFile(new URL('frontend/public/imagens/cardapio/CREDITOS.md',root),'utf8');
const creditosAula=await readFile(new URL('Slides/Entrega-2/assets/CREDITOS-AULA-VISUAL.md',root),'utf8');
await writeFile(new URL('assets/CREDITOS.md',pasta),creditos+'\n\n'+creditosCardapio+'\n\n'+creditosAula);
console.log('Apresentação preparada: duas aplicações conectadas e três trilhas com 31 páginas.');
