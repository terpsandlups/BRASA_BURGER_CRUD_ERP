import { codigoPedido } from './pedidoApresentacao.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabasePortal as supabase } from './supabasePortal.js'
import { criarEnvioTransacional } from './pedidoTransacional.js'
import { mensagemPortal, montarSolicitacao, totalCarrinho } from './portalCliente.js'
import { acessarContaCliente, armazenamentoDaSessao } from './acessoCliente.js'
import { acompanharAoVivo } from './atualizacaoAoVivo.js'
import { categoriasPublicas, filtrarCatalogoPublico, prepararCatalogoPublico } from './catalogoPublico.js'

export const ESTADOS = { aguardando: 'Aguardando confirmação da loja', aceita: 'Confirmado pela loja', recusada: 'Recusado pela loja', cancelada: 'Cancelado por você', recebido: 'Recebido', em_preparo: 'Em preparo', pronto: 'Pronto', saiu_entrega: 'Saiu para entrega', entregue: 'Entregue', cancelado: 'Cancelado' }

export default function usePortalCliente() {
  const { marca = 'brasa-burger' } = useParams()
  const [catalogo, setCatalogo] = useState({ lojas: [], itens: [] })
  const [carregando, setCarregando] = useState(true)
  useEffect(() => { document.title = `${catalogo.empresa?.nome || 'Pedidos online'} · Pedidos` }, [catalogo.empresa?.nome])
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [loja, setLoja] = useState('')
  const [tipo, setTipo] = useState('presencial')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('todos')
  const [produtoAberto, setProdutoAberto] = useState(null)
  const [ultimoAdicionado, setUltimoAdicionado] = useState('')
  const [itens, setItens] = useState([])
  const [session, setSession] = useState(null)
  const [sessaoPronta, setSessaoPronta] = useState(false)
  const [cadastro, setCadastro] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cliente, setCliente] = useState({ nome: '', cpf: '', telefone: '' })
  const [cpfVinculado, setCpfVinculado] = useState('')
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
  const ultimaConta=useRef(null)
  const envio = useMemo(() => criarEnvioTransacional(supabase, undefined, {
    storage: armazenamentoDaSessao(), chave: `convivium.mobile.${session?.user.id || 'anon'}.${marca}`, funcao: 'enviar_solicitacao_mobile',
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
      setCatalogo({...data,itens:prepararCatalogoPublico(data.itens || [],marca)})
    } catch (error) { if(consulta===consultaCatalogo.current) setErro(mensagemPortal(error)) }
    finally { if(consulta===consultaCatalogo.current) setCarregando(false) }
  }
  useEffect(() => { setCatalogo({lojas:[],itens:[]});setLoja('');setItens([]);setCotacao(null);setCategoria('todos');setProdutoAberto(null);setBusca('');carregarCardapio();return()=>{consultaCatalogo.current++} }, [marca])
  useEffect(() => { setCotacao(null) }, [session?.user.id,loja,tipo])
  useEffect(() => {
    const atual=session?.user.id || null
    if (ultimaConta.current && ultimaConta.current !== atual) {
      setCliente({ nome:'', cpf:'', telefone:'' }); setEndereco({}); setObservacoes(''); setTroco(''); setAviso('')
    }
    ultimaConta.current=atual
    setPaginaPedidos(0)
  }, [session?.user.id])
  useEffect(() => {
    let ativo=true
    setCpfVinculado('')
    if(!session?.user.id) return
    supabase.rpc('meu_cadastro_cliente').then(({data,error})=>{
      if(!ativo) return
      if(error){setErro('Não foi possível carregar seu cadastro. Atualize a página ou contate a loja.');return}
      if(data){setCliente(data);setCpfVinculado(data.cpf)}
    }).catch(()=>{if(ativo)setErro('Não foi possível carregar seu cadastro.')})
    return()=>{ativo=false}
  },[session?.user.id])
  useEffect(() => {
    if (!cotacao) return
    const timer=setTimeout(()=>setCotacao(null),Math.max(0,Date.parse(cotacao.expira_em)-Date.now()))
    return ()=>clearTimeout(timer)
  },[cotacao])
  useEffect(() => {
    let ativo = true
    let eventoRecebido = false
    supabase.auth.getSession().then(({ data, error }) => {
      if (ativo && !eventoRecebido) { if (error) setErro('Não foi possível recuperar sua sessão.'); setSession(data?.session || null); setSessaoPronta(true) }
    }).catch(() => { if (ativo) { setErro('Não foi possível conectar.'); setSessaoPronta(true) } })
    const { data } = supabase.auth.onAuthStateChange((_event, atual) => { if (ativo) { eventoRecebido=true; setSession(atual); setSessaoPronta(true) } })
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
    const encerrar=acompanharAoVivo(supabase,`cliente-pedidos:${session.user.id}`,[
      {table:'solicitacoes_mobile',filter:`usuario_id=eq.${session.user.id}`},
      {table:'eventos_pedidos_cliente',filter:`usuario_id=eq.${session.user.id}`},
    ],()=>atualizar().catch(() => { if (ativo) setErroPedidos('Não foi possível atualizar seus pedidos.') }))
    return () => { ativo = false; encerrar() }
  }, [session?.user.id, aviso, paginaPedidos])

  const unidade = catalogo.lojas.find(l => l.id === loja)
  const subtotal = totalCarrinho(itens)
  const categorias = categoriasPublicas(catalogo.itens, tipo)
  const visiveis = filtrarCatalogoPublico(catalogo.itens, { tipo, categoria, busca })
  const totalUnidades = itens.reduce((s, i) => s + i.quantidade, 0)
  const adicaoBloqueada = !loja || pendente || ocupado
  function escolherLoja(id) { setLoja(id); setItens([]); if (catalogo.lojas.find(l => l.id === id)?.tipo_operacao === 'delivery_only') setTipo('delivery') }
  function adicionar(produto, extras) {
    if (adicaoBloqueada) return
    const chave = `${produto.id}:${extras.map(a => a.id).sort().join(',')}`
    setItens(prev => prev.some(i => i.chave === chave)
      ? prev.map(i => i.chave === chave ? { ...i, quantidade: Math.min(99, i.quantidade + 1) } : i)
      : [...prev, { ...produto, extras, chave, quantidade: 1 }])
    setUltimoAdicionado(`${produto.nome} adicionado ao pedido.`)
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
      const data = await acessarContaCliente(supabase.auth, { cadastro, email, senha, retorno: `${window.location.origin}${import.meta.env.BASE_URL}pedir/${marca}`, ...(cadastro ? cliente : {}) },supabase.functions)
      setSenha('')
      if (cadastro && !data.session) setAviso('Confira seu e-mail para confirmar o cadastro e depois entre na sua conta.')
    })
  }
  async function enviar(event) {
    event.preventDefault()
    if (!session) { setErro('Entre na sua conta para enviar.'); return }
    let enviado=false
    await executar(async () => {
      try {
        const dados = pendente ? null : montarSolicitacao({ lojaId: loja, tipo, pagamento, cliente, itens, endereco:cotacao?.endereco || endereco, observacoes, troco, cotacaoId:cotacao?.cotacao_id, taxaEntrega:cotacao?.taxa || 0 })
        if(!pendente){
          const {data,error}=await supabase.rpc('cadastrar_perfil_cliente',{p_cpf:dados.cpf,p_nome:dados.nome,p_telefone:dados.telefone})
          if(error) throw error
          setCpfVinculado(data.cpf)
        }
        const id = await envio.enviar(dados)
        if(cotacao?.endereco) setEndereco(cotacao.endereco)
        setCotacao(null)
        enviado=true
        setItens([]); setPaginaPedidos(0); setAviso(`Solicitação #${codigoPedido(id)} enviada. Aguarde a confirmação da loja.`)
      } finally { setPendente(envio.temPendente()) }
    })
    return enviado
  }
  return {marca,catalogo,carregando,erro,setErro,aviso,setAviso,loja,tipo,setTipo,busca,setBusca,categoria,setCategoria,produtoAberto,setProdutoAberto,ultimoAdicionado,itens,setItens,session,sessaoPronta,cadastro,setCadastro,email,setEmail,senha,setSenha,cliente,setCliente,cpfVinculado,endereco,setEndereco,pagamento,setPagamento,observacoes,setObservacoes,troco,setTroco,cotacao,setCotacao,ocupado,pendente,pedidos,erroPedidos,paginaPedidos,setPaginaPedidos,unidade,subtotal,categorias,visiveis,totalUnidades,adicaoBloqueada,escolherLoja,adicionar,executar,autenticar,enviar,carregarCardapio}
}
