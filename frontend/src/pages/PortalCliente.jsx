import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { criarEnvioTransacional } from '../lib/pedidoTransacional.js'
import { mensagemPortal, montarSolicitacao, totalCarrinho } from '../lib/portalCliente.js'
import { dinheiro, codigoPedido } from '../lib/pedidoApresentacao.js'
import ConsultaEntrega from '../components/ConsultaEntrega.jsx'
import Icon from '../components/ui/Icon.jsx'
import './portalCliente.css'

const ESTADOS = { aguardando: 'Aguardando confirmação da loja', aceita: 'Confirmado pela loja', recusada: 'Recusado pela loja', cancelada: 'Cancelado por você', recebido: 'Recebido', em_preparo: 'Em preparo', pronto: 'Pronto', saiu_entrega: 'Saiu para entrega', entregue: 'Entregue', cancelado: 'Cancelado' }

function Produto({ produto, onAdicionar, desabilitado }) {
  const [extras, setExtras] = useState([])
  return <article className="portal-product">
    <div className="portal-product-icon"><Icon nome="produto" size={28} /></div>
    <div className="flex-1 min-w-0"><h3>{produto.nome}</h3><p className="text-sm text-fumaca">{produto.variacao}</p>
      {produto.adicionais.length > 0 && <details className="mt-3"><summary className="text-sm cursor-pointer">Adicionais</summary>
        {produto.adicionais.map(a => <label className="flex gap-2 items-center text-sm mt-2" key={a.id}><input type="checkbox" checked={extras.some(e => e.id === a.id)} onChange={e => setExtras(prev => e.target.checked ? [...prev, a] : prev.filter(x => x.id !== a.id))} />{a.nome} · {dinheiro(a.preco)}</label>)}
      </details>}
    </div>
    <div className="text-right"><strong>{dinheiro(Number(produto.preco) + extras.reduce((s, a) => s + Number(a.preco), 0))}</strong><button type="button" disabled={desabilitado} className="portal-add" onClick={() => onAdicionar(produto, extras)} aria-label={`Adicionar ${produto.nome}, ${produto.variacao}`}><Icon nome="mais" size={18} />Adicionar</button></div>
  </article>
}

export default function PortalCliente() {
  const { marca = 'brasa-burger' } = useParams()
  const [catalogo, setCatalogo] = useState({ lojas: [], itens: [] })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [loja, setLoja] = useState('')
  const [tipo, setTipo] = useState('presencial')
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState([])
  const [session, setSession] = useState(null)
  const [sessaoPronta, setSessaoPronta] = useState(false)
  const [cadastro, setCadastro] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cliente, setCliente] = useState({ nome: '', cpf: '', telefone: '' })
  const [endereco, setEndereco] = useState({})
  const [pagamento, setPagamento] = useState('pix')
  const [observacoes, setObservacoes] = useState('')
  const [troco, setTroco] = useState('')
  const [cotacao, setCotacao] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [pendente, setPendente] = useState(false)
  const [pedidos, setPedidos] = useState([])
  const [erroPedidos, setErroPedidos] = useState('')
  const [paginaPedidos, setPaginaPedidos] = useState(0)
  const trava = useRef(false)
  const consultaCatalogo=useRef(0)
  const envio = useMemo(() => criarEnvioTransacional(supabase, undefined, {
    storage: window.sessionStorage, chave: `convivium.mobile.${session?.user.id || 'anon'}.${marca}`, funcao: 'enviar_solicitacao_mobile',
  }), [session?.user.id,marca])
  useEffect(() => { setPendente(envio.temPendente()) }, [envio])

  async function carregarCardapio() {
    const consulta=++consultaCatalogo.current
    setCarregando(true); setErro('')
    try {
      const { data, error } = await supabase.rpc('cardapio_mobile', { p_slug:marca })
      if (error) throw error
      if(consulta!==consultaCatalogo.current) return
      if (!data?.empresa) throw new Error('Estabelecimento indisponível.')
      setCatalogo(data)
    } catch (error) { if(consulta===consultaCatalogo.current) setErro(mensagemPortal(error)) }
    finally { if(consulta===consultaCatalogo.current) setCarregando(false) }
  }
  useEffect(() => { setCatalogo({lojas:[],itens:[]});setLoja('');setItens([]);setCotacao(null);carregarCardapio();return()=>{consultaCatalogo.current++} }, [marca])
  useEffect(() => { setCotacao(null) }, [session?.user.id,loja,tipo])
  useEffect(() => {
    if (!cotacao) return
    const timer=setTimeout(()=>setCotacao(null),Math.max(0,Date.parse(cotacao.expira_em)-Date.now()))
    return ()=>clearTimeout(timer)
  },[cotacao])
  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (ativo) { if (error) setErro('Não foi possível recuperar sua sessão.'); setSession(data?.session || null); setSessaoPronta(true) }
    }).catch(() => { if (ativo) { setErro('Não foi possível conectar.'); setSessaoPronta(true) } })
    const { data } = supabase.auth.onAuthStateChange((_event, atual) => { if (ativo) { setSession(atual); setSessaoPronta(true) } })
    return () => { ativo = false; data.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    setPedidos([]); setErroPedidos('')
    if (!session?.user.id) return
    let ativo = true
    async function atualizar() {
      const { data, error } = await supabase.rpc('acompanhar_solicitacoes_mobile', { p_pagina: paginaPedidos })
      if (!ativo) return
      if (error) setErroPedidos(mensagemPortal(error))
      else { setPedidos(data || []); setErroPedidos('') }
    }
    atualizar().catch(() => { if (ativo) setErroPedidos('Não foi possível atualizar seus pedidos.') })
    const timer = setInterval(() => { atualizar().catch(() => { if (ativo) setErroPedidos('Não foi possível atualizar seus pedidos.') }) }, 15000)
    return () => { ativo = false; clearInterval(timer) }
  }, [session?.user.id, aviso, paginaPedidos])

  const unidade = catalogo.lojas.find(l => l.id === loja)
  const subtotal = totalCarrinho(itens)
  const visiveis = catalogo.itens.filter(p => p[tipo] && `${p.nome} ${p.variacao}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')))
  function escolherLoja(id) { setLoja(id); setItens([]); if (catalogo.lojas.find(l => l.id === id)?.tipo_operacao === 'delivery_only') setTipo('delivery') }
  function adicionar(produto, extras) {
    const chave = `${produto.id}:${extras.map(a => a.id).sort().join(',')}`
    setItens(prev => prev.some(i => i.chave === chave)
      ? prev.map(i => i.chave === chave ? { ...i, quantidade: Math.min(99, i.quantidade + 1) } : i)
      : [...prev, { ...produto, extras, chave, quantidade: 1 }])
  }
  async function executar(acao) {
    if (trava.current) return
    trava.current = true; setOcupado(true); setErro(''); setAviso('')
    try { await acao() } catch (error) { setErro(mensagemPortal(error)) }
    finally { trava.current = false; setOcupado(false) }
  }
  async function autenticar(event) {
    event.preventDefault()
    await executar(async () => {
      const { data, error } = cadastro ? await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: `${window.location.origin}/pedir/${marca}` } }) : await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) throw new Error(cadastro ? 'Não foi possível criar a conta. Confira os dados e tente novamente.' : 'Não foi possível entrar. Confira e-mail e senha.')
      setSenha('')
      if (cadastro && !data.session) setAviso('Confira seu e-mail para confirmar o cadastro e depois entre na sua conta.')
    })
  }
  async function enviar(event) {
    event.preventDefault()
    if (!session) { setErro('Entre na sua conta para enviar.'); return }
    await executar(async () => {
      try {
        const dados = pendente ? null : montarSolicitacao({ lojaId: loja, tipo, pagamento, cliente, itens, endereco:cotacao?.endereco || endereco, observacoes, troco, cotacaoId:cotacao?.cotacao_id, taxaEntrega:cotacao?.taxa || 0 })
        const id = await envio.enviar(dados)
        if(cotacao?.endereco) setEndereco(cotacao.endereco)
        setCotacao(null)
        setItens([]); setAviso(`Solicitação #${codigoPedido(id)} enviada. Aguarde a confirmação da loja.`)
      } finally { setPendente(envio.temPendente()) }
    })
  }
  return <div className="app-shell portal-shell min-h-screen" style={{'--ui-gold':catalogo.empresa?.cor || '#e4ae65'}}>
    <header className="portal-header"><Link to={`/pedir/${marca}`} className="portal-brand">{catalogo.empresa?.logo_url && <img src={catalogo.empresa.logo_url} alt="" className="h-12 w-12 object-contain inline-block mr-3" />}{catalogo.empresa?.nome || 'Brasa Burger'}<span>Pedidos online</span></Link><Link className="text-sm text-fumaca" to={`/?marca=${marca}`}>Acesso da equipe</Link></header>
    <main className="portal-main">
      <section className="portal-intro"><p className="portal-eyebrow">SEU PRÓXIMO PEDIDO</p><h1>Feito para o seu momento.</h1><p>Escolha seus favoritos. A loja confirma o pedido e você paga na retirada ou na entrega.</p></section>
      {erro && <div role="alert" className="portal-notice text-brasa">{erro}<button type="button" className="underline ml-3" onClick={carregarCardapio}>Atualizar cardápio</button></div>}
      {aviso && <p role="status" className="portal-notice text-oliva">{aviso}</p>}
      {carregando && <p role="status">Carregando cardápio…</p>}
      <div className="portal-grid">
        <section aria-label="Cardápio">
          <fieldset disabled={pendente || ocupado} className="portal-filters">
            <label>Unidade<select value={loja} onChange={e => escolherLoja(e.target.value)}><option value="">Selecione a unidade</option>{catalogo.lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></label>
            <label>Atendimento<select value={tipo} onChange={e => { setTipo(e.target.value); setItens([]) }}><option value="presencial" disabled={unidade?.tipo_operacao === 'delivery_only'}>Retirada na loja</option><option value="delivery">Entrega</option></select></label>
            <label className="portal-search">Buscar no cardápio<input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Produto ou variação" /></label>
          </fieldset>
          <div className="portal-catalog">{visiveis.map(p => <Produto key={p.id} produto={p} onAdicionar={adicionar} desabilitado={!loja || pendente || ocupado} />)}</div>
          {!carregando && !visiveis.length && <p className="portal-notice">Nenhum produto disponível.</p>}
        </section>
        <aside className="portal-checkout" id="carrinho">
          <h2>Seu pedido <Icon nome="sacola" /></h2>
          {!itens.length && <p className="text-fumaca text-sm my-4">Escolha os itens do cardápio.</p>}
          <fieldset disabled={pendente || ocupado}>{itens.map(i => <div key={i.chave} className="portal-cart-item"><div><strong>{i.nome}</strong><p className="text-sm text-fumaca">{i.variacao}{i.extras.length ? ` · ${i.extras.map(a => a.nome).join(', ')}` : ''}</p><span>{dinheiro(totalCarrinho([i]))}</span></div><div className="portal-quantity"><button type="button" aria-label={`Diminuir ${i.nome}`} onClick={() => setItens(prev => prev.map(x => x.chave === i.chave ? { ...x, quantidade: x.quantidade - 1 } : x).filter(x => x.quantidade > 0))}>−</button><span>{i.quantidade}</span><button type="button" aria-label={`Aumentar ${i.nome}`} disabled={i.quantidade >= 99} onClick={() => adicionar(i, i.extras)}>+</button></div></div>)}</fieldset>
          <div className="portal-total"><span>Itens</span><strong>{dinheiro(subtotal)}</strong></div>
          {tipo === 'delivery' && <div className="flex justify-between text-sm mb-3"><span>Frete</span><strong>{cotacao ? dinheiro(cotacao.taxa) : 'Informe o endereço'}</strong></div>}
          <div className="flex justify-between mb-5"><span>Total</span><strong>{dinheiro(subtotal + Number(cotacao?.taxa || 0))}</strong></div>
          {!sessaoPronta ? <p role="status">Carregando sua conta…</p> : !session ? <form onSubmit={autenticar} className="portal-form"><h3>{cadastro ? 'Criar conta' : 'Entre para pedir'}</h3><label>E-mail<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Senha<input required minLength={8} type="password" autoComplete={cadastro ? 'new-password' : 'current-password'} value={senha} onChange={e => setSenha(e.target.value)} /></label><button disabled={ocupado} className="portal-primary">{ocupado ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}</button><button type="button" className="text-sm underline" onClick={() => setCadastro(v => !v)}>{cadastro ? 'Já tenho uma conta' : 'Criar uma conta'}</button></form> : <>
            <div className="flex justify-between gap-2 text-sm my-4"><span className="break-all">{session.user.email}</span><button type="button" disabled={ocupado} className="underline" onClick={() => executar(async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; setCliente({ nome: '', cpf: '', telefone: '' }); setEndereco({}); setPaginaPedidos(0) })}>Sair</button></div>
            {tipo === 'delivery' && loja && itens.length > 0 && !pendente && <div className="mb-5"><ConsultaEntrega key={`${loja}:${session.user.id}`} lojaId={loja} modoPedido portal automatico destinoInicial={endereco} onCotacao={setCotacao} onInvalidar={()=>setCotacao(null)} /></div>}
            <form onSubmit={enviar} className="portal-form">
              {pendente ? <p role="alert">O último envio aguarda confirmação. Consulte o resultado antes de enviar outro pedido.</p> : <fieldset disabled={ocupado} className="portal-form">
                <label>Nome<input required maxLength={120} autoComplete="name" value={cliente.nome} onChange={e => setCliente(c => ({ ...c, nome: e.target.value }))} /></label><label>CPF<input required inputMode="numeric" maxLength={14} value={cliente.cpf} onChange={e => setCliente(c => ({ ...c, cpf: e.target.value }))} /></label><label>Telefone<input required type="tel" autoComplete="tel" maxLength={20} value={cliente.telefone} onChange={e => setCliente(c => ({ ...c, telefone: e.target.value }))} /></label>
                <label>Pagamento na {tipo === 'delivery' ? 'entrega' : 'retirada'}<select value={pagamento} onChange={e => setPagamento(e.target.value)}><option value="pix">Pix</option><option value="credito">Cartão de crédito</option><option value="debito">Cartão de débito</option><option value="dinheiro">Dinheiro</option></select></label>
                {pagamento === 'dinheiro' && <label>Troco para (opcional)<input inputMode="decimal" value={troco} onChange={e => setTroco(e.target.value)} /></label>}
                <label>Observações<textarea maxLength={500} value={observacoes} onChange={e => setObservacoes(e.target.value)} /></label>
              </fieldset>}
              <p className="text-xs text-fumaca">Seus dados serão usados pela loja para atender este pedido. O envio depende da confirmação de disponibilidade. Pagamento diretamente à loja.</p>
              <button disabled={ocupado || (!pendente && (!itens.length || (tipo==='delivery' && !cotacao)))} className="portal-primary">{ocupado ? 'Enviando…' : pendente ? 'Confirmar último envio' : 'Enviar pedido à loja'}</button>
            </form>
          </>}
        </aside>
      </div>
      {session && <section className="portal-orders"><h2>Meus pedidos</h2>{erroPedidos && <p role="alert" className="text-brasa">{erroPedidos}</p>}{!pedidos.length && !erroPedidos && <p className="text-fumaca">Nenhum pedido nesta página.</p>}
        {pedidos.map(p => <article className="portal-order" key={p.id}><div><strong>#{codigoPedido(p.id)} · {p.loja}</strong><p className="text-sm text-fumaca">{new Date(p.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p><p>{ESTADOS[p.etapa || p.status]}</p>{p.motivo && <p>{p.motivo}</p>}<p>{p.total !== null ? `Total confirmado: ${dinheiro(p.total)} · Frete: ${dinheiro(p.frete)}` : `Subtotal: ${dinheiro(p.subtotal)}`}</p></div>{p.status === 'aguardando' && <button type="button" disabled={ocupado} className="underline" onClick={() => executar(async () => { const { error } = await supabase.rpc('decidir_solicitacao_mobile', { p_id: p.id, p_acao: 'cancelar' }); if (error) throw error; setAviso(`Solicitação #${codigoPedido(p.id)} cancelada.`) })}>Cancelar solicitação</button>}</article>)}
        <div className="flex gap-4 mt-4"><button disabled={paginaPedidos === 0} onClick={() => setPaginaPedidos(p => p - 1)}>Anterior</button><span>Página {paginaPedidos + 1}</span><button disabled={pedidos.length < 20} onClick={() => setPaginaPedidos(p => p + 1)}>Próxima</button></div>
      </section>}
      <footer className="portal-footer">{catalogo.empresa?.nome || 'Brasa Burger'} · Por Convívium Management System</footer>
    </main>
    {itens.length > 0 && <a className="portal-cart-link" href="#carrinho"><Icon nome="sacola" size={18} />Ver pedido · {dinheiro(subtotal)}</a>}
  </div>
}
