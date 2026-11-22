import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';
process.env.RUNTIME_NODE_MODULES ||= 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const standardRoot='C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@pdf-lib/standard-fonts/lib/';
registerHooks({resolve(specifier,context,nextResolve){if(specifier.startsWith('#standard-fonts/')){let name=specifier.split('/')[1];name=name.replace(/^(Helvetica|Courier)(Bold|Oblique)/,'$1-$2').replace(/^(Times)(Roman|Bold|Italic)/,'$1-$2');return {url:pathToFileURL(standardRoot+name+'.compressed.json').href,shortCircuit:true}}return nextResolve(specifier,context)}});
const {Presentation,PresentationFile}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs');
const root=process.cwd(),revision=process.env.DECK_REVISION||'aula-visual-20261116-r2';
const skill='C:/Users/User/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations';
const python='C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const data=JSON.parse(await fs.readFile('docs/entrega-02/SLIDES_CONTEUDO.json','utf8'));
const cfg={academica:['Convivium-Entrega-2','apresentacao'],tecnica:['Fundamentos-Tecnicos-Convivium','fundamentos-tecnicos'],negocio:['Convivium-Modelo-de-Negocio','modelo-de-negocio']};
const bg='#FAF8F4',ink='#202226',muted='#606169',gold='#8C5D1B',dark='#141619',cream='#F7F2E8',amber='#E4AE65';
const out=path.join(root,'Slides/Aula-Visual-2026');await fs.mkdir(out,{recursive:true});await fs.mkdir('output/pdf',{recursive:true});
function text(s,str,x,y,w,h,size=28,color=ink,bold=false,typeface='Arial'){
 const box=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 box.text=str;box.text.style={fontSize:size,typeface,color,bold,wrap:true,insets:0,verticalAlignment:'top'};return box;
}
async function image(s,file,x,y,w,h,fit='contain'){
 const bytes=await fs.readFile(path.join(root,file));
 s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:/\.jpe?g$/i.test(file)?'image/jpeg':'image/png',alt:file.includes('comprovantes')?'Fotografia ilustrativa de comprovantes de restaurante':'Imagem de apoio identificada nas notas do slide',position:{left:x,top:y,width:w,height:h},fit});
}
for(const [kind,slides] of Object.entries(data)){
 if(process.env.DECK_KIND && process.env.DECK_KIND!==kind)continue;
 const [stemBase,pdfName]=cfg[kind];const stem=stemBase+'-Visual';const p=Presentation.create({slideSize:{width:1280,height:720}});const tableOwners=[];
 for(const [i,d] of slides.entries()){
  const s=p.slides.add();const cover=d.kind==='cover';s.background.fill=cover?dark:bg;
  s.speakerNotes.text=d.notes+(d.caption?'\nImagem: '+d.caption:'')+'\n\nFonte de código e material de aula: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP';
  if(cover){
   text(s,d.title,64,115,1120,210,72,cream,true);
   text(s,d.subtitle,68,370,710,100,30,amber);
   if(d.backgroundImage) await image(s,d.backgroundImage,840,370,370,235, d.backgroundImage.includes('comprovantes')?'cover':'contain');
   text(s,d.detail,68,530,720,105,23,'#C8C7C5');
  }else{
   text(s,d.title,64,52,1152,100,48,ink,true);
   if(d.kind==='steps'){
    text(s,d.lead,68,180,1140,95,32,gold,true);
    const gap=d.steps.length>3?88:108;
    for(const [j,step] of d.steps.entries()){
      text(s,String(j+1).padStart(2,'0'),68,302+j*gap,70,58,38,gold,true);
      text(s,step.title,165,306+j*gap,330,60,28,ink,true);
      text(s,step.detail,545,308+j*gap,665,65,26,muted);
    }
   }else if(d.kind==='table'){
    tableOwners.push(i+1);const values=[d.headers,...d.rows],rows=values.length,cols=d.headers.length;
    const widths=cols===2?[335,817]:[300,515,337];
    const t=s.tables.add({rows,columns:cols,left:64,top:205,width:1152,height:Math.min(380,rows*78),columnWidths:widths,values});
    t.borders.assign({style:'solid',fill:'#D4CEC4',width:1});
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
     const cell=t.getCell(r,c);cell.fill=r===0?dark:bg;
     cell.text.style={fontSize:25,typeface:'Arial',color:r===0?cream:ink,bold:r===0,wrap:true,insets:14,verticalAlignment:'middle'};
    }
   }else if(d.kind==='number'){
    text(s,d.number,64,190,1150,145,112,gold,true);
    text(s,d.lead,70,350,1130,75,30,ink,true);
    text(s,d.body,70,455,1130,180,29,muted);
   }else if(d.kind==='code'){
    text(s,d.code,70,215,1140,320,29,ink,false,'Consolas');
    text(s,d.caption,70,575,1130,70,25,gold);
   }else if(d.kind==='screenshot'){
    text(s,d.left,64,222,350,340,30,ink);
    await image(s,d.image,445,205,770,433);
    text(s,d.caption,445,642,770,32,16,muted);
   }else if(d.kind==='photo'){
    text(s,d.lead,64,205,430,150,34,ink,true);
    text(s,d.body,64,385,430,225,26,muted);
    await image(s,d.image,550,205,665,374,'contain');text(s,d.caption || 'Imagem ilustrativa',550,610,665,48,15,muted);
   }else{
    if(d.lead)text(s,d.lead,68,180,1140,98,32,gold,true);
    if(d.leftTitle){
     text(s,d.leftTitle,68,330,525,55,28,ink,true);text(s,d.left,68,404,525,d.decorationImage?185:220,27,muted);
     if(d.decorationImage) await image(s,d.decorationImage,68,605,220,56);
     text(s,d.rightTitle,675,330,535,55,28,ink,true);text(s,d.right,675,404,535,220,27,muted);
    }else{text(s,d.body||'',68,330,1130,240,30,muted);if(d.small)text(s,d.small,68,595,1130,60,22,gold)}
   }
  }
  text(s,`Convívium Management System  ${String(i+1).padStart(2,'0')} de ${slides.length}`,64,682,1150,22,14,cover?'#B9B5AE':muted);
 }
 const build=path.join(root,'.entrega-02-build',revision,kind);await fs.mkdir(build,{recursive:true});await fs.mkdir(path.join(root,'.entrega-02-build','validacoes'),{recursive:true});
 const candidate=path.join(build,'candidate.pptx'),checked=path.join(build,'validado.pptx');
 await (await PresentationFile.exportPptx(p)).save(candidate);
 const result=await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:checked,pythonExecutable:python,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit',...tableOwners.flatMap(n=>['--require-native-table-slide',String(n)])],requiredNativeTableOwnerSlides:tableOwners,fontPolicy:{basis:'design',families:slides.some(x=>x.kind==='code')?['Arial','Consolas']:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(root,'.entrega-02-build','validacoes',revision+'-'+kind+'.json')});
 await fs.copyFile(checked,path.join(out,stem+'.pptx'));
 // O PDF usa as páginas PNG em resolução dupla, após validação do PPTX.
 const previews=path.join(build,'previews');await fs.mkdir(previews,{recursive:true});
 for(const [i,s] of p.slides.items.entries()){
  const png=await p.export({slide:s,format:'png',scale:2});await fs.writeFile(path.join(previews,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
 }
 const {execFileSync}=await import('node:child_process');
 execFileSync(python,['-c',`from PIL import Image; from pathlib import Path; p=Path(r'${previews.replaceAll('\\','/')}'); imgs=[Image.open(f).convert('RGB') for f in sorted(p.glob('slide-*.png'))]; imgs[0].save(r'${path.join(root,'output/pdf','aula-'+pdfName+'-visual.pdf').replaceAll('\\','/')}',save_all=True,append_images=imgs[1:],resolution=192.0)`],{stdio:'pipe'});
 console.log(`${stem}: ${slides.length} slides exportados, renderizados e validados`);
}
