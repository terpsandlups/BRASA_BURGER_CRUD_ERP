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
await copyFile(new URL('Slides/Entrega-2/assets/CREDITOS.md',root),new URL('assets/CREDITOS.md',pasta));
console.log('Apresentação interativa preparada: três trilhas, 31 páginas, imagens locais.');
