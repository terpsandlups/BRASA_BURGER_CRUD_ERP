'use strict';
const decks=window.CONVIVIUM_SLIDES;
const nomes={academica:'Entrega 2',tecnica:'Linguagens e tecnologias',negocio:'Modelo de negócio'};
const $=id=>document.getElementById(id);
const texto=(tag,conteudo,classe)=>{const no=document.createElement(tag);no.textContent=conteudo || '';if(classe)no.className=classe;return no};
const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
let modo='academica',pagina=0;
function imagem(caminho,legenda,alt){const fig=document.createElement('figure');const img=document.createElement('img');img.src=caminho;img.alt=alt || legenda || 'Imagem do projeto';fig.append(img);if(legenda)fig.append(texto('figcaption',legenda));return fig}
function calculadora(pai){
 const demo=document.createElement('section');demo.className='demo';demo.setAttribute('aria-label','Simulação de CMV');
 const campos=[['Receita dos itens',27.9],['Custo conhecido',8.9]].map(([nome,valor])=>{const label=texto('label',nome);const input=document.createElement('input');Object.assign(input,{type:'number',min:'0',max:'100000',step:'0.01',value:String(valor)});label.append(input);demo.append(label);return input});
 const resultado=document.createElement('output');resultado.setAttribute('aria-live','polite');demo.append(resultado);
 const calcular=()=>{const [receita,custo]=campos.map(c=>c.valueAsNumber);resultado.textContent=Number.isFinite(receita)&&receita>0&&Number.isFinite(custo)&&custo>=0?`CMV ${(custo/receita*100).toFixed(2).replace('.',',')}% · Margem ${(100-custo/receita*100).toFixed(2).replace('.',',')}%`:'Informe receita positiva e custo válido.'};
 campos.forEach(c=>c.addEventListener('input',calcular));calcular();demo.append(texto('p','Exemplo didático. Receita elegível dos itens com custo conhecido, sem frete. Margem simplificada não é lucro líquido.'));pai.append(demo);
}
function fluxo(pai){
 const etapas=[['Aguardando a loja','Solicitação enviada à unidade escolhida. Estoque ainda sem baixa.'],['Confirmado pela loja','Aceite cria uma venda e baixa os insumos uma vez.'],['Em preparo','O consumidor recebe a atualização do andamento.'],['Pronto para retirada','A unidade finaliza o preparo.'],['Entregue','Pedido concluído pela equipe.']];
 let etapa=0;const demo=document.createElement('section');demo.className='demo';demo.setAttribute('aria-label','Demonstração do fluxo do pedido');const estado=texto('strong','');estado.setAttribute('aria-live','polite');const explicacao=texto('p','');const avancar=texto('button','Avançar etapa'),reiniciar=texto('button','Reiniciar');avancar.type=reiniciar.type='button';const atualizar=()=>{estado.textContent=etapas[etapa][0];explicacao.textContent=etapas[etapa][1];avancar.disabled=etapa===etapas.length-1};avancar.onclick=()=>{etapa++;atualizar()};reiniciar.onclick=()=>{etapa=0;atualizar()};demo.append(estado,avancar,reiniciar,explicacao,texto('p','Simulação local para explicação. Nenhum pedido é enviado e nenhum estoque é alterado.'));atualizar();pai.append(demo);
}
function mostrar(){
 const slides=decks[modo],d=slides[pagina],pai=$('slide');pai.replaceChildren();pai.className='';
 if(d.kind==='cover'){
  const capa=document.createElement('div');capa.className='cover';const copy=document.createElement('div');copy.append(texto('h1',d.title),texto('p',d.subtitle,'lead'),texto('p',d.detail,'body'));capa.append(copy);if(d.backgroundImage)capa.append(imagem(d.backgroundImage,'',d.imageAlt));pai.append(capa);
 }else{
  pai.append(texto('h1',d.title));
  if(d.kind==='table'){
   const table=document.createElement('table'),head=document.createElement('thead'),body=document.createElement('tbody'),tr=document.createElement('tr');d.headers.forEach(t=>{const th=texto('th',t);th.scope='col';tr.append(th)});head.append(tr);d.rows.forEach(row=>{const r=document.createElement('tr');row.forEach(v=>r.append(texto('td',v)));body.append(r)});table.append(head,body);pai.append(table);
  }else if(d.kind==='number'){pai.append(texto('div',d.number,'number'),texto('p',d.lead,'lead'),texto('p',d.body,'body'));
  }else if(d.kind==='code'){pai.append(texto('pre',d.code,'code'),texto('p',d.caption,'small'));
  }else if(d.kind==='screenshot'||d.kind==='photo'){
   const bloco=document.createElement('div');bloco.className='photo';const copy=document.createElement('div');if(d.lead)copy.append(texto('p',d.lead,'lead'));copy.append(texto('p',d.left || d.body,'body'));bloco.append(copy,imagem(d.image,d.caption || 'Imagem ilustrativa, conforme fonte nas notas.'));pai.append(bloco);
  }else{
   if(d.lead)pai.append(texto('p',d.lead,'lead'));
   if(d.leftTitle){const cols=document.createElement('div');cols.className='columns';for(const lado of ['left','right']){const col=document.createElement('section');col.append(texto('h2',d[lado+'Title']),texto('p',d[lado]));if(lado==='left'&&d.decorationImage){const img=document.createElement('img');img.src=d.decorationImage;img.alt='Logo oficial Python';img.className='decoration';col.append(img)}cols.append(col)}pai.append(cols)}else pai.append(texto('p',d.body,'body'));
   if(d.small)pai.append(texto('p',d.small,'small'));
  }
  if(/CMV com base|Cálculo com interpretação/.test(d.title))calculadora(pai);
  if(d.title==='Fluxo operacional')fluxo(pai);
 }
 $('fontes').textContent=d.notes+'\nCódigo: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP';$('notas').open=false;
 $('posicao').textContent=`${nomes[modo]} · ${pagina+1} de ${slides.length}`;$('modo').value=modo;
 $('pagina').replaceChildren(...slides.map((s,i)=>{const o=texto('option',`${i+1}. ${s.title.replaceAll('\n',' ')}`);o.value=String(i);return o}));$('pagina').value=String(pagina);
 $('anterior').disabled=pagina===0;$('proxima').disabled=pagina===slides.length-1;$('progresso').max=slides.length;$('progresso').value=pagina+1;
 document.title=`${d.title.replaceAll('\n',' ')} · Convívium`;
}
function navegar(m,p){modo=m;pagina=Math.max(0,Math.min(decks[m].length-1,p));const hash=`#${modo}/${pagina+1}`;if(location.hash===hash)mostrar();else location.hash=hash}
function lerHash(){const [m,p]=location.hash.slice(1).split('/');modo=Object.hasOwn(decks,m)?m:'academica';pagina=Math.max(0,Math.min(decks[modo].length-1,(Number(p)||1)-1));if(!Number.isInteger(pagina))pagina=0;mostrar()}
$('modo').onchange=e=>navegar(e.target.value,0);$('pagina').onchange=e=>navegar(modo,Number(e.target.value));$('anterior').onclick=()=>navegar(modo,pagina-1);$('proxima').onclick=()=>navegar(modo,pagina+1);
$('tela').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('tela').textContent='Use F11 para tela cheia'}};
document.addEventListener('fullscreenchange',()=>{$('tela').textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia'});
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,button,summary')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='ArrowRight'){e.preventDefault();navegar(modo,pagina+1)}if(e.key==='ArrowLeft'){e.preventDefault();navegar(modo,pagina-1)}});
window.addEventListener('hashchange',lerHash);lerHash();
