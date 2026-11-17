/* A apresentação abre as aplicações conectadas. Não contém pedidos ou métricas fictícios. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const base = location.protocol === 'file:' ? 'https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/' : new URL('../',location.href).href;
  const clienteUrl = new URL('pedir/brasa-burger',base).href;
  const modulos = {
    dashboard:['Dashboard','Vendas, ticket médio e indicadores calculados sobre os pedidos autorizados.',''],
    solicitacoes:['Pedidos do portal','Solicitações enviadas pelos consumidores à unidade escolhida. O aceite da loja inicia a operação.','solicitacoes'],
    pedidos:['Gestão de pedidos','Acompanhe o preparo e avance o status dos pedidos no quadro da operação.','pedidos'],
    produtos:['Produtos e ficha técnica','Catálogo, preços, composição de receitas e custos dos insumos.','produtos'],
    clientes:['Clientes da empresa','Cadastros de clientes acessíveis somente à equipe autorizada.','clientes'],
    estoque:['Insumos e estoque','Insumos e saldos por unidade da empresa.','estoque'],
  };
  document.querySelectorAll('[data-app-link="cliente"]').forEach(a=>a.href=clienteUrl);
  let ultimaArea = null;
  function mostrarArea() {
    const [raiz,segmento] = location.hash.slice(1).split('/');
    const area = Object.hasOwn(window.CONVIVIUM_SLIDES,raiz) ? 'slides' : ['cliente','erp'].includes(raiz) ? raiz : 'visao';
    for(const id of ['visao','cliente','erp','slides'])byId(id==='slides' ? id : 'view-'+id).hidden=id!==area;
    document.querySelectorAll('[data-area]').forEach(a=>{if(a.dataset.area===area)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
    if(area==='cliente' && !byId('app-cliente').getAttribute('src'))byId('app-cliente').src=clienteUrl;
    if(area==='erp') {
      const modulo=Object.hasOwn(modulos,segmento)?segmento:'dashboard';
      const [titulo,descricao,caminho]=modulos[modulo];
      const url=new URL(caminho+'?marca=brasa-burger',base).href;
      byId('modulo-titulo').textContent=titulo;byId('modulo-descricao').textContent=descricao;
      if(byId('app-erp').getAttribute('src')!==url)byId('app-erp').src=url;
      byId('abrir-erp').href=url;
      document.querySelectorAll('[data-modulo]').forEach(a=>{if(a.dataset.modulo===modulo)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
    }
    if(area!=='slides')document.title=({visao:'Uma plataforma. Duas experiências.',cliente:'Portal do consumidor',erp:'ERP da empresa'})[area]+' · Convívium';
    if(ultimaArea!==null && ultimaArea!==area){byId('conteudo').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})}
    ultimaArea=area;
  }
  function tamanho(celular) {
    byId('moldura-cliente').classList.toggle('is-phone',celular);
    byId('ver-celular').setAttribute('aria-pressed',String(celular));byId('ver-desktop').setAttribute('aria-pressed',String(!celular));
  }
  byId('ver-celular').onclick=()=>tamanho(true);byId('ver-desktop').onclick=()=>tamanho(false);
  window.addEventListener('hashchange',mostrarArea);mostrarArea();
})();
