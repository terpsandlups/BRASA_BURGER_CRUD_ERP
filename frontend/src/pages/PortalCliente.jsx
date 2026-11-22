import { useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import usePortalCliente, { ESTADOS } from '../lib/usePortalCliente.js'
import { supabasePortal as supabase } from '../lib/supabasePortal.js'
import { reenviarConfirmacaoCliente } from '../lib/acessoCliente.js'
import { agruparCatalogoPublico, iconeCategoria } from '../lib/catalogoPublico.js'
import { dinheiro, codigoPedido } from '../lib/pedidoApresentacao.js'
import { formatarCPF } from '../lib/format.js'
import Icon from '../components/ui/Icon.jsx'
import ProdutoPortal, { DetalheProduto } from '../components/ProdutoPortal.jsx'
import ResumoPedidoPortal from '../components/ResumoPedidoPortal.jsx'
import EntregaConsumidor from '../components/EntregaConsumidor.jsx'
import PerfilConsumidor from '../components/PerfilConsumidor.jsx'
import SidePanel from '../components/layout/SidePanel.jsx'
import './portalCliente.css'

const ETAPAS = ['cardapio','carrinho','identificacao','finalizar','pedidos']
const PASSOS = [['cardapio','Cardápio'],['carrinho','Carrinho'],['identificacao','Identificação'],['finalizar','Confirmar']]
const MENSAGENS = {Lanches:'O principal do seu pedido.',Acompanhamentos:'Para completar a sua escolha.',Bebidas:'Escolha o que vai acompanhar.',Sobremesas:'Um doce para finalizar.'}

export default function PortalCliente() {
  const p = usePortalCliente()
  const [parametros,setParametros] = useSearchParams()
  const etapa = ETAPAS.includes(parametros.get('etapa')) ? parametros.get('etapa') : 'cardapio'
  const retorno = ['cardapio','finalizar','pedidos'].includes(parametros.get('retorno')) ? parametros.get('retorno') : 'cardapio'
  const tituloEtapa = useRef(null)
  const irPara = useCallback((destino, depois) => {
    setParametros(atuais => {
      const novos=new URLSearchParams(atuais)
      if(destino==='cardapio')novos.delete('etapa');else novos.set('etapa',destino)
      if(depois)novos.set('retorno',depois);else novos.delete('retorno')
      return novos
    })
  },[setParametros])
  useEffect(() => {
    tituloEtapa.current?.focus({preventScroll:true})
    window.scrollTo({top:0,behavior:'instant'})
  },[etapa])
  useEffect(() => {
    if(!p.sessaoPronta)return
    if(etapa==='identificacao' && p.session)irPara(retorno)
    else if((etapa==='finalizar'||etapa==='pedidos') && !p.session)irPara('identificacao',etapa)
    else if(etapa==='finalizar' && !p.itens.length && !p.pendente)irPara('carrinho')
  },[etapa,p.sessaoPronta,p.session?.user.id,p.itens.length,p.pendente,retorno,irPara])
  const continuar = () => p.session ? irPara('finalizar') : irPara('identificacao','finalizar')
  const grupos = agruparCatalogoPublico(p.visiveis,p.tipo)
  const passoAtual = PASSOS.findIndex(([id])=>id===etapa)
  const bloqueado = p.ocupado || p.pendente
  function quantidade(item,delta) {
    if(bloqueado)return
    if(delta>0)p.adicionar(item,item.extras)
    else p.setItens(atuais=>atuais.map(i=>i.chave===item.chave ? {...i,quantidade:i.quantidade-1} : i).filter(i=>i.quantidade>0))
  }
  async function sair() {
    await p.executar(async()=>{
      const {error}=await supabase.auth.signOut({scope:'local'})
      if(error)throw error
      p.setCliente({nome:'',cpf:'',telefone:''});p.setEndereco({});p.setPaginaPedidos(0)
      irPara('cardapio')
    })
  }
  const resumo = editar => <ResumoPedidoPortal itens={p.itens} unidade={p.unidade} tipo={p.tipo} cotacao={p.cotacao} editar={editar} bloqueado={bloqueado} onQuantidade={quantidade} />
  const titulo = (sobretitulo,texto,descricao) => <div className="portal-page-heading"><p className="portal-eyebrow">{sobretitulo}</p><h1 tabIndex={-1} ref={tituloEtapa}>{texto}</h1>{descricao && <p>{descricao}</p>}</div>

  return <div className="app-shell portal-shell" style={{'--ui-gold':p.catalogo.empresa?.cor || '#e4ae65','--ui-action':p.catalogo.empresa?.cor || '#e4ae65'}}>
    <a href="#portal-conteudo" className="portal-skip">Ir ao conteúdo</a>
    <header className="portal-header"><Link to={'/pedir/'+p.marca} className="portal-brand">
      {p.catalogo.empresa?.logo_url ? <img src={p.catalogo.empresa.logo_url} alt="" /> : <span className="portal-brand-icon"><Icon nome="produto" size={26} /></span>}
      <span>{p.catalogo.empresa?.nome || (p.carregando ? 'Carregando loja…' : 'Pedidos online')}<small>Seu pedido, direto com a loja</small></span>
    </Link><nav className="portal-header-actions" aria-label="Sua navegação">
      <button type="button" aria-current={etapa==='cardapio' ? 'page' : undefined} onClick={()=>irPara('cardapio')} className="portal-menu-link">Cardápio</button>
      <button type="button" aria-current={etapa==='carrinho' ? 'page' : undefined} onClick={()=>irPara('carrinho')} aria-label={'Carrinho, '+p.totalUnidades+(p.totalUnidades===1 ? ' item' : ' itens')}><Icon nome="sacola" size={20} /><span className="portal-action-label">Pedido</span><b>{p.totalUnidades}</b></button>
      <button type="button" aria-label={p.session ? 'Meus pedidos' : 'Entrar'} onClick={()=>irPara(p.session ? 'pedidos' : 'identificacao',p.session ? undefined : 'pedidos')}><Icon nome="conta" size={20} /><span className="portal-action-label">{p.session ? 'Meus pedidos' : 'Entrar'}</span></button>
    </nav></header>
    <main className="portal-main" id="portal-conteudo">
      {etapa!=='pedidos' && <nav className="portal-steps" aria-label="Etapas do pedido">{PASSOS.map(([id,nome],indice)=><button key={id} type="button" aria-current={etapa===id ? 'step' : undefined} className={indice<passoAtual ? 'is-complete' : ''} onClick={()=>id==='identificacao' ? irPara(p.session && p.itens.length ? 'finalizar' : 'identificacao','finalizar') : irPara(id)}><span>{indice<passoAtual ? <Icon nome="check" size={14} /> : indice+1}</span>{nome}</button>)}</nav>}
      {p.erro && <div role="alert" className="portal-notice is-error"><Icon nome="alerta" size={20} /><p>{p.erro}</p>{!p.catalogo.empresa && <button type="button" onClick={p.carregarCardapio}>Tentar novamente</button>}<button type="button" aria-label="Fechar aviso" onClick={()=>p.setErro('')}>×</button></div>}
      {p.aviso && <p role="status" className="portal-notice is-success"><Icon nome="check" size={20} />{p.aviso}</p>}
      {p.pendente && etapa!=='finalizar' && <div className="portal-notice"><p>Um envio aguarda confirmação. Consulte o resultado para continuar.</p><button type="button" onClick={()=>irPara('finalizar')}>Consultar envio</button></div>}

      {etapa==='cardapio' && <>
        <section className="portal-intro"><div><p className="portal-eyebrow">FEITO PARA O SEU MOMENTO</p><h1 tabIndex={-1} ref={tituloEtapa}>Seu pedido.<br /><span>Do seu jeito.</span></h1><p>Escolha seus favoritos. A loja cuida do resto.</p><div className="portal-intro-badges"><span><Icon nome="sacola" size={15} /> Retirada ou entrega</span><span>Canal próprio da loja</span></div></div><div className="portal-intro-visual" aria-label="Ilustração de hambúrguer"><span className="portal-hero-sticker sticker-fries"><Icon nome="batata" size={34} /></span><img src={import.meta.env.BASE_URL+'imagens/cardapio/burger.webp'} alt="Hambúrguer ilustrativo" /><span className="portal-hero-sticker sticker-drink"><Icon nome="bebida" size={32} /></span><small>Imagem ilustrativa</small></div></section>
        <section className="portal-service" aria-label="Escolha da unidade" id="escolha-unidade"><div className="portal-service-copy"><Icon nome="local" size={23} /><div><h2>De qual unidade você vai pedir?</h2><p>{p.loja ? 'Seu pedido será enviado para esta unidade.' : 'Selecione para começar a montar o pedido.'}</p></div></div><fieldset disabled={bloqueado} className="portal-service-fields"><label>Unidade<select value={p.loja} onChange={e=>p.escolherLoja(e.target.value)}><option value="">Selecione a unidade</option>{p.catalogo.lojas.map(l=><option key={l.id} value={l.id}>{l.nome}</option>)}</select></label><label>Como receber<select value={p.tipo} onChange={e=>{p.setTipo(e.target.value);p.setItens([]);p.setCategoria('todos')}}><option value="presencial" disabled={p.unidade?.tipo_operacao==='delivery_only'}>Retirar na loja</option><option value="delivery">Receber em casa</option></select></label></fieldset></section>
        <div className="portal-menu-heading"><div><p className="portal-eyebrow">ESCOLHA POR CATEGORIA</p><h2>O que vai ser hoje?</h2></div><label className="portal-search"><Icon nome="busca" size={19} /><input aria-label="Buscar no cardápio" type="search" value={p.busca} onChange={e=>p.setBusca(e.target.value)} placeholder="Buscar um favorito…" /></label></div>
        <nav className="portal-categories" aria-label="Categorias do cardápio">
          <button type="button" aria-pressed={p.categoria==='todos'} onClick={()=>p.setCategoria('todos')}><span className="portal-category-icon"><Icon nome="ajuste" size={24} /></span><span>Todos</span></button>
          {p.catalogo.itens.some(i=>i[p.tipo]&&i.destaque) && <button type="button" aria-pressed={p.categoria==='destaques'} onClick={()=>p.setCategoria('destaques')}><span className="portal-category-icon">✦</span><span>Destaques</span></button>}
          {p.categorias.map(c=><button key={c} type="button" aria-pressed={p.categoria===c} onClick={()=>p.setCategoria(c)}><span className={'portal-category-icon food-'+iconeCategoria(c)}><Icon nome={iconeCategoria(c)} size={28} /></span><span>{c}</span></button>)}
        </nav>
        {p.carregando && <p role="status" className="portal-loading">Preparando o cardápio…</p>}
        {!p.carregando && !p.visiveis.length && <div className="portal-empty"><Icon nome="busca" size={44} /><h2>Nenhum favorito por aqui ainda.</h2><p>Tente outra busca ou categoria.</p><button className="portal-secondary" type="button" onClick={()=>{p.setBusca('');p.setCategoria('todos')}}>Ver todo o cardápio</button></div>}
        <div className="portal-menu-sections">{grupos.map(grupo=><section className="portal-menu-section" key={grupo.categoria} aria-label={grupo.categoria}><div className="portal-catalog-heading"><span className={'portal-section-icon food-'+iconeCategoria(grupo.categoria)}><Icon nome={iconeCategoria(grupo.categoria)} size={25} /></span><div><h2>{grupo.categoria}</h2><p>{MENSAGENS[grupo.categoria] || 'Explore as opções desta categoria.'}</p></div><span className="portal-option-count">{grupo.itens.length} {grupo.itens.length===1 ? 'opção' : 'opções'}</span></div><div className="portal-catalog">{grupo.itens.map(produto=><ProdutoPortal key={produto.id} produto={produto} onAdicionar={p.adicionar} onDetalhar={p.setProdutoAberto} desabilitado={p.adicaoBloqueada} />)}</div></section>)}</div>
      </>}

      {etapa==='carrinho' && <>
        {titulo('02 / SEU PEDIDO','Tudo certo por aqui?','Revise os itens antes de continuar.')}
        {!p.itens.length ? <div className="portal-empty"><Icon nome="sacola" size={54} /><h2>Seu carrinho está esperando.</h2><p>Encontre algo gostoso no cardápio para começar.</p><button type="button" className="portal-primary" onClick={()=>irPara('cardapio')}>Escolher meus favoritos <Icon nome="seta" size={18} /></button></div> : <div className="portal-flow-grid"><div>{resumo(true)}<button className="portal-text-link" type="button" onClick={()=>irPara('cardapio')}>+ Adicionar mais itens</button></div><aside className="portal-next-card"><span className="portal-round-icon"><Icon nome="check" size={24} /></span><h2>Falta pouco!</h2><p>{p.session ? 'Na próxima etapa, confira seus dados e escolha como pagar.' : 'Agora você entra na conta ou cria seu cadastro, sem perder o carrinho.'}</p><button type="button" className="portal-primary" disabled={bloqueado} onClick={continuar}>Continuar pedido <Icon nome="seta" size={18} /></button><small>Pagamento diretamente à loja.</small></aside></div>}
      </>}

      {etapa==='identificacao' && !p.session && <div className="portal-auth-layout"><section className="portal-auth-card">
        {titulo('03 / SUA CONTA',p.cadastro ? 'Sua primeira vez?' : 'Que bom ter você aqui.',p.cadastro ? 'Crie a conta e acompanhe seus pedidos.' : 'Entre com CPF e senha para continuar.')}
        {retorno==='finalizar' && p.itens.length>0 && <p className="portal-auth-cart-note"><Icon nome="sacola" size={18} />Seu carrinho com {p.totalUnidades} itens está guardado nesta navegação.</p>}
        <form onSubmit={p.autenticar} className="portal-form"><fieldset disabled={p.ocupado} className="portal-form">
          {p.cadastro ? <><label>Nome completo<input required autoComplete="name" maxLength={120} value={p.cliente.nome} onChange={e=>p.setCliente(c=>({...c,nome:e.target.value}))} /></label><label>CPF<input required inputMode="numeric" maxLength={14} value={p.cliente.cpf} onChange={e=>p.setCliente(c=>({...c,cpf:formatarCPF(e.target.value)}))} /></label><label>Telefone<input required type="tel" autoComplete="tel" maxLength={20} value={p.cliente.telefone} onChange={e=>p.setCliente(c=>({...c,telefone:e.target.value}))} /></label></> : <label>CPF ou e-mail<input required type="text" autoComplete="username" value={p.email} onChange={e=>p.setEmail(e.target.value)} placeholder="Seu CPF ou e-mail cadastrado" /></label>}
          <label>Senha<input required minLength={p.cadastro ? 8 : undefined} type="password" autoComplete={p.cadastro ? 'new-password' : 'current-password'} value={p.senha} onChange={e=>p.setSenha(e.target.value)} placeholder={p.cadastro ? 'Pelo menos 8 caracteres' : 'Sua senha'} /></label>
          <button className="portal-primary" disabled={p.ocupado || !p.sessaoPronta}>{p.ocupado ? 'Aguarde…' : p.cadastro ? 'Criar minha conta' : 'Entrar e continuar'}<Icon nome="seta" size={18} /></button>
          <button type="button" className="portal-secondary" onClick={()=>{p.setCadastro(v=>!v);p.setErro('');p.setSenha('')}}>{p.cadastro ? 'Já tenho uma conta' : 'Sou novo, quero me cadastrar'}</button>
          {!p.cadastro && p.email.includes('@') && <button type="button" className="portal-text-link" onClick={()=>p.executar(async()=>{await reenviarConfirmacaoCliente(supabase.auth,p.email,window.location.origin+import.meta.env.BASE_URL+'pedir/'+p.marca);p.setAviso('Se houver um cadastro aguardando confirmação, você receberá um novo link por e-mail.')})}>Reenviar confirmação de e-mail</button>}
        </fieldset><p className="portal-form-note">Use seus próprios dados. A conta permite acompanhar os pedidos feitos às lojas.</p></form>
        <button type="button" className="portal-text-link" onClick={()=>irPara(retorno==='finalizar' ? 'carrinho' : 'cardapio')}>← {retorno==='finalizar' ? 'Voltar ao carrinho' : 'Explorar o cardápio'}</button>
      </section><aside className="portal-auth-aside"><span className="portal-big-sticker"><Icon nome="produto" size={104} /></span><h2>Do cardápio<br />até a sua mesa.</h2><p>Escolha. Personalize. Acompanhe.</p><div><Icon nome="check" size={18} /> Pedido direto com a loja</div><div><Icon nome="check" size={18} /> Seus favoritos, do seu jeito</div></aside></div>}

      {etapa==='finalizar' && p.session && <>
        {titulo('04 / CONFIRMAÇÃO','Seu próximo favorito está quase aí.','Confira como receber e os dados do pedido.')}
        <div className="portal-flow-grid"><div className="portal-checkout-details">
          <section className="portal-checkout-card"><div className="portal-card-heading"><Icon nome="local" size={23} /><h2>{p.tipo==='delivery' ? 'Entrega na sua casa' : 'Retirada na loja'}</h2></div><p className="portal-checkout-unit">{p.unidade?.nome}</p>{!p.pendente && <button type="button" className="portal-text-link" onClick={()=>irPara('cardapio')}>Alterar unidade ou atendimento</button>}
            {p.tipo==='delivery' && p.loja && p.itens.length>0 && !p.pendente && <EntregaConsumidor api={supabase} key={p.loja+':'+p.session.user.id} usuarioId={p.session.user.id} lojaId={p.loja} endereco={p.endereco} cotacao={p.cotacao} onCotacao={cotacao=>{p.setCotacao(cotacao);if(cotacao?.endereco)p.setEndereco(cotacao.endereco)}} onInvalidar={()=>p.setCotacao(null)} />}
            {p.tipo!=='delivery' && <p className="portal-form-note">Acompanhe o pedido. A loja informa quando estiver pronto para retirar.</p>}
          </section>
          <form onSubmit={async event=>{if(await p.enviar(event))irPara('pedidos')}} className="portal-checkout-card portal-form">
            {p.pendente ? <div role="alert"><h2>Consultar o último envio</h2><p>A confirmação consulta o mesmo envio e evita repetir seu pedido.</p></div> : <fieldset disabled={p.ocupado} className="portal-form">
              <PerfilConsumidor key={p.session.user.id} portal={p} />
              <div className="portal-card-heading portal-payment-heading"><Icon nome="cartao" size={22} /><h2>Como você vai pagar?</h2></div>
              <label>Pagamento na {p.tipo==='delivery' ? 'entrega' : 'retirada'}<select value={p.pagamento} onChange={e=>p.setPagamento(e.target.value)}><option value="pix">Pix</option><option value="credito">Cartão de crédito</option><option value="debito">Cartão de débito</option><option value="dinheiro">Dinheiro</option></select></label>
              {p.pagamento==='dinheiro' && <label>Troco para (opcional)<input inputMode="decimal" value={p.troco} onChange={e=>p.setTroco(e.target.value)} /></label>}
              <label>Alguma observação? <span className="portal-optional">Opcional</span><textarea maxLength={500} rows={3} value={p.observacoes} onChange={e=>p.setObservacoes(e.target.value)} placeholder="Uma informação para a equipe da loja…" /></label>
            </fieldset>}
            <p className="portal-form-note">Seus dados serão usados para atender este pedido. A loja confirma a disponibilidade. Pagamento diretamente à loja.</p>
            <button disabled={p.ocupado || (!p.pendente && (!p.perfilPronto || !p.itens.length || (p.tipo==='delivery'&&!p.cotacao)))} className="portal-primary">{p.ocupado ? 'Enviando…' : p.pendente ? 'Consultar último envio' : 'Enviar pedido à loja'}<Icon nome="seta" size={18} /></button>
            {p.tipo==='delivery'&&!p.cotacao&&!p.pendente && <p className="portal-form-note">Preencha o endereço e aguarde o cálculo do frete para enviar.</p>}
          </form>
        </div><aside className="portal-final-summary">{resumo(false)}{!p.pendente && <button type="button" className="portal-text-link" onClick={()=>irPara('carrinho')}>Editar meu pedido</button>}</aside></div>
      </>}

      {etapa==='pedidos' && p.session && <>
        {titulo('SUA CONTA','Meus pedidos','Acompanhe a confirmação e o preparo pela loja.')}
        <div className="portal-account-strip"><span><Icon nome="conta" size={18} />{p.perfilSalvo?.nome || (!p.perfilPronto ? 'Carregando seu nome…' : 'Complete seus dados da conta')}</span><button type="button" disabled={p.ocupado} onClick={sair}>Sair da conta</button></div>
        <div className="portal-checkout-card portal-form"><PerfilConsumidor key={p.session.user.id} portal={p} /></div>
        {p.erroPedidos && <p role="alert" className="portal-notice is-error">{p.erroPedidos}</p>}
        {!p.pedidos.length&&!p.erroPedidos && <div className="portal-empty"><Icon nome="pedido" size={48} /><h2>Seu primeiro favorito está no cardápio.</h2><p>Os pedidos desta conta aparecem aqui depois do envio.</p><button type="button" className="portal-primary" onClick={()=>irPara('cardapio')}>Fazer um pedido</button></div>}
        <div className="portal-orders">{p.pedidos.map(pedido=><article className="portal-order" key={pedido.id}><div className="portal-order-top"><span><Icon nome="pedido" size={18} />#{codigoPedido(pedido.id)}</span><span className="portal-order-state">{ESTADOS[pedido.etapa||pedido.status] || pedido.status}</span></div><h2>{pedido.loja}</h2><p>{new Date(pedido.criado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>{pedido.motivo && <p>{pedido.motivo}</p>}<strong>{pedido.total!==null ? 'Total confirmado: '+dinheiro(pedido.total)+' · Frete: '+dinheiro(pedido.frete) : 'Subtotal: '+dinheiro(pedido.subtotal)}</strong>{pedido.status==='aguardando' && <button type="button" disabled={p.ocupado} className="portal-text-link" onClick={()=>p.executar(async()=>{const {error}=await supabase.rpc('decidir_solicitacao_mobile',{p_id:pedido.id,p_acao:'cancelar'});if(error)throw error;p.setAviso('Solicitação #'+codigoPedido(pedido.id)+' cancelada.')})}>Cancelar solicitação</button>}</article>)}</div>
        {p.pedidos.length>0 && <nav className="portal-pagination" aria-label="Páginas de pedidos"><button disabled={p.paginaPedidos===0} onClick={()=>p.setPaginaPedidos(n=>n-1)}>Anterior</button><span>Página {p.paginaPedidos+1}</span><button disabled={p.pedidos.length<20} onClick={()=>p.setPaginaPedidos(n=>n+1)}>Próxima</button></nav>}
      </>}
      {!p.sessaoPronta && etapa!=='cardapio' && etapa!=='carrinho' && <p role="status" className="portal-loading">Carregando sua conta…</p>}
      <footer className="portal-footer"><Icon nome="produto" size={20} /><span>{p.catalogo.empresa?.nome || 'Pedidos online'}<small>Tecnologia Convívium Management System</small></span><span>Seu pedido começa aqui.</span></footer>
    </main>
    <p role="status" className="sr-only">{p.ultimoAdicionado}</p>
    <SidePanel aberto={!!p.produtoAberto} onFechar={()=>p.setProdutoAberto(null)} titulo={p.produtoAberto?.nome || 'Produto'}>{p.produtoAberto && <DetalheProduto key={p.produtoAberto.id} produto={p.produtoAberto} desabilitado={p.adicaoBloqueada} onAdicionar={(produto,extras)=>{p.adicionar(produto,extras);p.setProdutoAberto(null)}} />}</SidePanel>
    {etapa==='cardapio' && p.itens.length>0 && <button type="button" className="portal-cart-link" onClick={()=>irPara('carrinho')}><span>{p.totalUnidades}</span><Icon nome="sacola" size={20} />Ver meu pedido<strong>{dinheiro(p.subtotal)}</strong><Icon nome="seta" size={18} /></button>}
  </div>
}
