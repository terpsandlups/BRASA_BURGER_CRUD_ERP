import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import CamposEndereco from '../components/CamposEndereco.jsx'
import { formatarCPF, apenasDigitos, validarCPF, formatarTelefone } from '../lib/format.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import KPICard from '../components/data-display/KPICard.jsx'
import Button from '../components/ui/Button.jsx'
import SidePanel from '../components/layout/SidePanel.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import ConsultaEntrega from '../components/ConsultaEntrega.jsx'
import ItensPedido from '../components/ItensPedido.jsx'
import { codigoPedido, dinheiro, quantidadeItens, esperaPedido } from '../lib/pedidoApresentacao.js'
import { criarEnvioTransacional, montarPedidoTransacional, calcularPrecoCanal } from '../lib/pedidoTransacional.js'
import { exigeFreteProprio, cotacaoPedidoValida, totalComFrete } from '../lib/entrega.js'
import { carregarTodasPaginas, intervaloDashboard } from '../lib/dashboard.js'
import { filtrarPedidosOperacao, indicadoresOperacao, criarAtualizadorStatus, destinosReaproveitamento, cancelarPedidoTransacional } from '../lib/operacaoPedidos.js'

const COLUNAS = [
  { status: 'recebido', titulo: 'Novos Pedidos' },
  { status: 'em_preparo', titulo: 'Em Preparo' },
  { status: 'pronto', titulo: 'Pronto' },
  { status: 'saiu_entrega', titulo: 'Em Entrega' },
]

function proximoStatus(pedido) {
  if (pedido.status === 'recebido') return 'em_preparo'
  if (pedido.status === 'em_preparo') return 'pronto'
  if (pedido.status === 'pronto') return pedido.tipo_atendimento === 'delivery' ? 'saiu_entrega' : 'entregue'
  if (pedido.status === 'saiu_entrega') return 'entregue'
  return null
}

function rotuloAcao(pedido) {
  if (pedido.status === 'recebido') return 'Aceitar pedido'
  if (pedido.status === 'em_preparo') return 'Pronto para entrega'
  if (pedido.status === 'pronto') return pedido.tipo_atendimento === 'delivery' ? 'Enviar para entrega' : 'Entregar ao cliente'
  if (pedido.status === 'saiu_entrega') return 'Concluir entrega'
  return null
}

function minutosDecorridos(criadoEm, agora) {
  return Math.max(0, Math.floor((agora - new Date(criadoEm)) / 60000))
}

function corTempo(min) {
  if (min < 15) return { texto: 'text-oliva', ponto: 'bg-oliva' }
  if (min < 30) return { texto: 'text-ambar', ponto: 'bg-ambar' }
  return { texto: 'text-brasa', ponto: 'bg-brasa' }
}

const CANAL_LABEL = { proprio: 'Próprio', ifood: 'iFood', rappi: 'Rappi' }

function resumoEndereco(endereco) {
  if (!endereco || typeof endereco !== 'object') return 'Não registrado'
  return `${endereco.endereco || ''}, ${endereco.numero || ''} — ${endereco.bairro || ''}, ${endereco.cidade || ''}/${endereco.estado || ''} · CEP ${endereco.cep || ''}`
}

function CardPedido({ pedido, agora, onAvancar, onCancelar, onAbrirDetalhe, atualizando }) {
  const min = minutosDecorridos(pedido.criado_em, agora)
  const cor = corTempo(min)
  const acao = rotuloAcao(pedido)

  return (
    <article aria-label={`Pedido #${codigoPedido(pedido.id)}`} className="bg-branco border border-borda rounded-xl p-4 mb-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-fumaca" title={pedido.id}>
            <strong className="text-texto text-sm">#{codigoPedido(pedido.id)}</strong>
            {pedido.canal_venda && pedido.canal_venda !== 'proprio' && (
              <StatusBadge estado="neutro">{CANAL_LABEL[pedido.canal_venda]}</StatusBadge>
            )}
          </p>
          <p className="font-medium">{pedido.clientes?.nome || formatarCPF(pedido.cliente_cpf)}</p>
          <p className="text-xs text-fumaca mt-1">{pedido.lojas?.nome}</p>
        </div>
        <span className={`text-xs font-medium flex items-center gap-1.5 shrink-0 ml-2 rounded-full bg-osso px-2 py-1 ${cor.texto}`}>
          <span className={`w-2 h-2 rounded-full ${cor.ponto}`} />
          {esperaPedido(min)}
        </span>
      </div>

      <div className="text-xs mt-3 space-y-1">
        {pedido.itens_pedido?.slice(0, 2).map(item => <p key={item.id} className="truncate">{item.quantidade}× {item.produtos?.nome}{item.produto_variacoes?.nome_variacao ? ` · ${item.produto_variacoes.nome_variacao}` : ''}</p>)}
      </div>
      <button onClick={() => onAbrirDetalhe(pedido)} className="text-sm text-ambar mt-2 py-2 underline underline-offset-4">
        Ver {quantidadeItens(pedido)} itens e adicionais
      </button>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-superficie2/20">
        <span className="font-medium text-sm tabular-nums">{dinheiro(pedido.valor_total)}{Number(pedido.taxa_entrega) > 0 && <span className="text-xs text-fumaca ml-2">com frete</span>}</span>
        <span className="text-xs uppercase text-fumaca">{pedido.tipo_atendimento}</span>
      </div>

      {acao && onAvancar && (
        <button
          disabled={atualizando} onClick={() => onAvancar(pedido)}
          className="w-full rounded-lg mt-3 bg-ambar text-carvao text-sm font-medium py-3 hover:bg-carvao hover:text-osso transition-colors"
        >
          {atualizando ? 'Atualizando…' : acao}
        </button>
      )}
      {onCancelar && <button
        disabled={atualizando} onClick={() => onCancelar(pedido)}
        className="w-full mt-1.5 text-xs text-brasa/70 hover:text-brasa py-1"
      >
        Cancelar pedido
      </button>}
    </article>
  )
}

function DetalhePedido({ pedido, onAvancar, onCancelar, atualizando }) {
  const acao = rotuloAcao(pedido)
  return (
    <div className="space-y-5">
      <p className="text-xs text-fumaca break-all">Identificador completo: {pedido.id}</p>
      <div>
        <p className="text-xs uppercase text-fumaca">Cliente</p>
        <p className="font-medium text-lg">{pedido.clientes?.nome || formatarCPF(pedido.cliente_cpf)}</p>
        <p className="text-sm text-fumaca">{formatarCPF(pedido.cliente_cpf)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-fumaca">Unidade</p>
          <p>{pedido.lojas?.nome}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-fumaca">Canal</p>
          <p>{CANAL_LABEL[pedido.canal_venda] || 'Próprio'} · {pedido.tipo_atendimento}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-fumaca">Pagamento</p>
          <p className="capitalize">{pedido.forma_pagamento || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-fumaca">Status</p>
          <p className="capitalize">{pedido.status?.replace('_', ' ')}</p>
        </div>
      </div>

      {pedido.forma_pagamento === 'dinheiro' && pedido.troco_para && (
        <div className="bg-osso p-3 text-sm">
          Troco para {dinheiro(pedido.troco_para)}
          {' '}— troco: <strong>{dinheiro(Number(pedido.troco_para) - Number(pedido.valor_total))}</strong>
        </div>
      )}

      <div>
        <p className="text-xs uppercase text-fumaca mb-2">Itens do pedido</p>
        <ItensPedido itens={pedido.itens_pedido} />
      </div>

      {pedido.observacoes && (
        <div>
          <p className="text-xs uppercase text-fumaca">Observações</p>
          <p className="text-sm italic">{pedido.observacoes}</p>
        </div>
      )}

      {pedido.endereco_entrega && <div className="text-sm">
        <p className="text-xs uppercase text-fumaca">Endereço da entrega</p>
        <p>{resumoEndereco(pedido.endereco_entrega)}</p>
        {pedido.endereco_entrega.complemento && <p>{pedido.endereco_entrega.complemento}</p>}
      </div>}

      {pedido.cotacao_entrega_id && <div className="text-sm space-y-1">
        <div className="flex justify-between"><span>Itens</span><span>{dinheiro(pedido.subtotal_itens)}</span></div>
        <div className="flex justify-between"><span>Frete ({(Number(pedido.distancia_entrega_metros) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km)</span><span>{dinheiro(pedido.taxa_entrega)}</span></div>
      </div>}

      <div className="flex justify-between font-medium pt-3 border-t border-borda">
        <span>Total</span>
        <span>{dinheiro(pedido.valor_total)}</span>
      </div>

      {acao && onAvancar && (
        <Button variant="primary" className="w-full" disabled={atualizando} onClick={() => onAvancar(pedido)}>
          {acao}
        </Button>
      )}
      {onCancelar && <Button variant="danger" className="w-full" disabled={atualizando} onClick={() => onCancelar(pedido)}>
        Cancelar pedido
      </Button>}
    </div>
  )
}

export default function Pedidos() {
  const { session, podeOperar } = useAuth()
  const podeAvancar = podeOperar('vendas','criar') || podeOperar('vendas','editar')
  const [lojas, setLojas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [variacoes, setVariacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState([])
  const [adicionais, setAdicionais] = useState([])
  const [pedidosAtivos, setPedidosAtivos] = useState([])
  const [pedidosHoje, setPedidosHoje] = useState([])
  const [erroPedidos, setErroPedidos] = useState('')
  const [erroCatalogo, setErroCatalogo] = useState('')
  const [mensagemOperacao, setMensagemOperacao] = useState(null)
  const [erroFormulario, setErroFormulario] = useState('')
  const [atualizandoPedidos, setAtualizandoPedidos] = useState(false)
  const [carregandoPedidos, setCarregandoPedidos] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const cargaEmCursoRef = useRef(false)
  const recargaPendenteRef = useRef(false)
  const montadoRef = useRef(false)
  const consultaPedidosRef = useRef(0)
  const statusEmCursoRef = useRef(new Set())
  const atualizarStatusRef = useRef(null)
  if (!atualizarStatusRef.current) atualizarStatusRef.current = criarAtualizadorStatus(supabase)

  const [filtroLoja, setFiltroLoja] = useState('todas')
  const [busca, setBusca] = useState('')
  const [agora, setAgora] = useState(new Date())
  const [expandidoId, setExpandidoId] = useState(null)
  const pedidoDetalhe = pedidosAtivos.find(p => p.id === expandidoId) || null
  const [cancelamento, setCancelamento] = useState(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [destinoCancelamento, setDestinoCancelamento] = useState('')
  const [pedidoDestinoId, setPedidoDestinoId] = useState('')
  const [erroCancelamento, setErroCancelamento] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas')
  const [buscaProduto, setBuscaProduto] = useState('')

  // ----- formulário de novo pedido (mesma lógica de antes) -----
  const [lojaId, setLojaId] = useState('')
  const [cpfCliente, setCpfCliente] = useState('')
  const cpfClienteInputRef = useRef(null)
  const novoClienteTelefoneInputRef = useRef(null)

  useEffect(() => {
    if (cpfClienteInputRef.current && document.activeElement === cpfClienteInputRef.current) {
      const pos = cpfCliente.length
      cpfClienteInputRef.current.setSelectionRange(pos, pos)
    }
  }, [cpfCliente])
  const [statusCliente, setStatusCliente] = useState('ocioso') // ocioso | buscando | encontrado | nao_encontrado | invalido
  const [clienteEncontrado, setClienteEncontrado] = useState(null)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')

  useEffect(() => {
    if (novoClienteTelefoneInputRef.current && document.activeElement === novoClienteTelefoneInputRef.current) {
      const pos = novoClienteTelefone.length
      novoClienteTelefoneInputRef.current.setSelectionRange(pos, pos)
    }
  }, [novoClienteTelefone])
  const [novoClienteEndereco, setNovoClienteEndereco] = useState({})
  const [formaPagamento, setFormaPagamento] = useState('')
  const [cadastrandoCliente, setCadastrandoCliente] = useState(false)
  const cadastroRapidoRef = useRef(false)
  const [tentativaCliente, setTentativaCliente] = useState(0)
  const [tipoAtendimento, setTipoAtendimento] = useState('delivery')
  const [itens, setItens] = useState([])
  const [enviando, setEnviando] = useState(false)
  const envioEmCursoRef = useRef(false)
  const transacaoRef = useRef(null)
  if (!transacaoRef.current) transacaoRef.current = criarEnvioTransacional(supabase, undefined, { storage: window.sessionStorage, chave: `brasa.pedido.pendente.${session.user.id}` })
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(false)
  const [pedidosEmAtualizacao, setPedidosEmAtualizacao] = useState(() => new Set())
  const [canalVenda, setCanalVenda] = useState('proprio')
  const [configCanais, setConfigCanais] = useState([])
  const [observacoes, setObservacoes] = useState('')
  const [trocoPara, setTrocoPara] = useState('')
  const [cotacaoEntrega, setCotacaoEntrega] = useState(null)
  const [selecionandoAdicionaisPara, setSelecionandoAdicionaisPara] = useState(null)

  useEffect(() => {
    if (transacaoRef.current.temPendente()) { setConfirmacaoPendente(true); setMostrarFormulario(true) }
  }, [])

  useEffect(() => {
    if (confirmacaoPendente || enviando) return
    const config = configCanais.find((c) => c.canal_venda === canalVenda)
    if (!config) return
    setItens((atuais) => atuais.map((item) => {
      const variacao = variacoes.find((v) => v.id === item.variacao_id)
      if (!variacao) return item
      const preco = calcularPrecoCanal(variacao.preco_venda, config.markup_preco_percentual)
      return { ...item, preco_unitario: preco }
    }))
  }, [canalVenda, configCanais, variacoes, confirmacaoPendente, enviando])

  async function carregarCatalogo() {
    try {
    const resultados = await Promise.all([
      supabase.from('lojas').select('*').eq('ativo', true),
      supabase.from('produtos').select('*, categorias(nome)').eq('ativo', true),
      supabase.from('produto_variacoes').select('*'),
      supabase.from('categorias').select('*').order('ordem'),
      supabase.from('produto_adicionais_disponiveis').select('*'),
      supabase.from('adicionais').select('*').eq('ativo', true),
      supabase.from('configuracoes_canal').select('*'),
    ])
    const falha = resultados.find(r => r.error)
    if (falha) throw falha.error
    const [{ data: l }, { data: p }, { data: v }, { data: cat }, { data: pad }, { data: ad }, { data: canais }] = resultados
    if (l) setLojas(l)
    if (p) setProdutos(p)
    if (v) setVariacoes(v)
    if (cat) setCategorias(cat)
    if (pad) setAdicionaisDisponiveis(pad)
    if (ad) setAdicionais(ad)
    if (canais) setConfigCanais(canais)
    setErroCatalogo('')
    } catch (error) { setErroCatalogo('Não foi possível carregar o catálogo: ' + error.message) }
  }

  async function carregarPedidos() {
    if (cargaEmCursoRef.current) { recargaPendenteRef.current = true; return }
    cargaEmCursoRef.current = true
    setAtualizandoPedidos(true)
    const consulta = ++consultaPedidosRef.current
    const { inicio, fim } = intervaloDashboard(1)
    try {
      const [ativos, hoje] = await Promise.all([
        carregarTodasPaginas(() => supabase.from('pedidos')
          .select('*, lojas(nome), clientes(nome), itens_pedido(*, produtos(nome, categorias(nome)), produto_variacoes(nome_variacao), itens_pedido_adicionais(*, adicionais(nome)))')
          .in('status', ['recebido', 'em_preparo', 'pronto', 'saiu_entrega'])
          .order('criado_em', { ascending: true }).order('id', { ascending: true })),
        carregarTodasPaginas(() => supabase.from('pedidos').select('id, loja_id, valor_total, status')
          .gte('criado_em', inicio).lte('criado_em', fim).order('id', { ascending: true })),
      ])
      if (consulta !== consultaPedidosRef.current) return
      setPedidosAtivos(ativos)
      setPedidosHoje(hoje)
      setErroPedidos('')
      setUltimaAtualizacao(new Date())
    } catch (error) {
      if (consulta === consultaPedidosRef.current) setErroPedidos('Não foi possível atualizar os pedidos. Os dados exibidos podem estar desatualizados. ' + error.message)
    } finally {
      cargaEmCursoRef.current = false
      if (consulta === consultaPedidosRef.current) {
        setAtualizandoPedidos(false)
        setCarregandoPedidos(false)
      }
      if (recargaPendenteRef.current && montadoRef.current) { recargaPendenteRef.current = false; void carregarPedidos() }
    }
  }

  useEffect(() => {
    montadoRef.current = true
    carregarCatalogo()
    carregarPedidos()
    const intervaloTempo = setInterval(() => setAgora(new Date()), 30000)
    let atualizacaoAgendada
    const agendar = () => { clearTimeout(atualizacaoAgendada); atualizacaoAgendada = setTimeout(carregarPedidos, 300) }
    const aoVoltar = () => { if (document.visibilityState === 'visible') agendar() }
    const intervaloDados = setInterval(() => { if (document.visibilityState === 'visible') agendar() }, 30000)
    document.addEventListener('visibilitychange', aoVoltar)
    const canalRealtime = supabase
      .channel('pedidos-operacao')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, agendar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_pedido' }, agendar)
      .subscribe()
    return () => {
      montadoRef.current = false
      recargaPendenteRef.current = false
      consultaPedidosRef.current += 1
      clearInterval(intervaloTempo)
      clearInterval(intervaloDados)
      clearTimeout(atualizacaoAgendada)
      document.removeEventListener('visibilitychange', aoVoltar)
      supabase.removeChannel(canalRealtime)
    }
  }, [])

  function marcarPedidoEmAtualizacao(id, marcado) {
    setPedidosEmAtualizacao((atuais) => {
      const proximos = new Set(atuais)
      if (marcado) proximos.add(id)
      else proximos.delete(id)
      return proximos
    })
  }

  const pedidosFiltrados = filtrarPedidosOperacao(pedidosAtivos, filtroLoja, busca)
  const kpis = useMemo(() => indicadoresOperacao(pedidosHoje, pedidosAtivos, filtroLoja, agora),
    [pedidosHoje, pedidosAtivos, filtroLoja, agora])

  async function alterarStatus(pedido) {
    if (statusEmCursoRef.current.has(pedido.id)) return
    statusEmCursoRef.current.add(pedido.id)
    marcarPedidoEmAtualizacao(pedido.id, true)
    try {
      await atualizarStatusRef.current(pedido)
      setMensagemOperacao({ tipo: 'sucesso', texto: `Pedido #${codigoPedido(pedido.id)} atualizado.` })
    } catch (error) {
      setMensagemOperacao({ tipo: 'erro', texto: 'Não foi possível atualizar o pedido: ' + error.message })
    } finally {
      statusEmCursoRef.current.delete(pedido.id)
      marcarPedidoEmAtualizacao(pedido.id, false)
      await carregarPedidos()
    }
  }

  async function avancarStatus(pedido) {
    if (pedidosEmAtualizacao.has(pedido.id)) return
    if (!proximoStatus(pedido)) return
    await alterarStatus(pedido)
  }

  function cancelarPedido(pedido) {
    if (pedidosEmAtualizacao.has(pedido.id)) return
    setExpandidoId(null)
    setCancelamento(pedido)
    setMotivoCancelamento('')
    setDestinoCancelamento('')
    setPedidoDestinoId('')
    setErroCancelamento('')
  }

  async function confirmarCancelamento(event) {
    event.preventDefault()
    if (!cancelamento || statusEmCursoRef.current.has(cancelamento.id)) return
    statusEmCursoRef.current.add(cancelamento.id)
    marcarPedidoEmAtualizacao(cancelamento.id, true)
    setErroCancelamento('')
    try {
      await cancelarPedidoTransacional(supabase, cancelamento, {
        motivo: motivoCancelamento, destino: destinoCancelamento, pedidoDestinoId,
      })
      setMensagemOperacao({ tipo: 'sucesso', texto: `Pedido #${codigoPedido(cancelamento.id)} cancelado. ${dinheiro(cancelamento.valor_total)} estornados no ERP.` })
      setCancelamento(null)
    } catch (error) {
      setErroCancelamento(error.message)
    } finally {
      statusEmCursoRef.current.delete(cancelamento.id)
      marcarPedidoEmAtualizacao(cancelamento.id, false)
      await carregarPedidos()
    }
  }

  // ----- lógica do formulário de novo pedido -----
  const lojaSelecionada = lojas.find((l) => l.id === lojaId)
  const somenteDelivery = lojaSelecionada?.tipo_operacao === 'delivery_only'

  useEffect(() => {
    const digitos = apenasDigitos(cpfCliente)
    setClienteEncontrado(null)

    if (digitos.length < 11) {
      setStatusCliente('ocioso')
      return
    }
    if (!validarCPF(digitos)) {
      setStatusCliente('invalido')
      return
    }

    setStatusCliente('buscando')
    let ativa = true
    const timeout = setTimeout(async () => {
      try {
      const { data, error } = await supabase.from('clientes').select('*').eq('cpf', digitos).maybeSingle()
      if (!ativa) return
      if (error) throw error
      if (data) {
        setClienteEncontrado(data)
        setStatusCliente('encontrado')
      } else {
        setStatusCliente('nao_encontrado')
      }
      } catch { if (ativa) setStatusCliente('erro') }
    }, 300)
    return () => { ativa = false; clearTimeout(timeout) }
  }, [cpfCliente, tentativaCliente])

  async function cadastrarClienteRapido() {
    if (cadastroRapidoRef.current) return
    if (!novoClienteNome || apenasDigitos(novoClienteTelefone).length < 10) {
      setErroFormulario('Informe nome e telefone válidos (com DDD).')
      return
    }
    if (tipoAtendimento === 'delivery' && !novoClienteEndereco.cep) {
      setErroFormulario('Pedido delivery precisa de endereço — informe ao menos o CEP.')
      return
    }
    setCadastrandoCliente(true)
    cadastroRapidoRef.current = true
    try {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        cpf: apenasDigitos(cpfCliente),
        nome: novoClienteNome,
        telefone: apenasDigitos(novoClienteTelefone),
        ...novoClienteEndereco,
      })
      .select()
      .single()
    if (error) throw error
    setClienteEncontrado(data)
    setCotacaoEntrega(null)
    setStatusCliente('encontrado')
    setNovoClienteNome('')
    setNovoClienteTelefone('')
    setNovoClienteEndereco({})
    setErroFormulario('')
    } catch (error) { setErroFormulario('Erro ao cadastrar cliente: ' + error.message) }
    finally { setCadastrandoCliente(false); cadastroRapidoRef.current = false }
  }

  const adicionaisDoProduto = (sku) => {
    const ids = adicionaisDisponiveis.filter((a) => a.produto_sku === sku).map((a) => a.adicional_id)
    return adicionais.filter((a) => ids.includes(a.id))
  }

  function adicionarItem(variacao) {
    const produto = produtos.find((p) => p.sku === variacao.produto_sku)
    const config = configCanais.find((c) => c.canal_venda === canalVenda)
    const precoComMarkup = calcularPrecoCanal(variacao.preco_venda, config?.markup_preco_percentual || 0)
    setItens(atuais => {
      const existente = atuais.findIndex(item => item.variacao_id === variacao.id && item.adicionaisSelecionados.length === 0 && Number(item.quantidade) < 9999)
      if (existente >= 0) return atuais.map((item, i) => i === existente ? { ...item, quantidade: Number(item.quantidade) + 1 } : item)
      return [...atuais, {
      chave: crypto.randomUUID(),
      produto_sku: variacao.produto_sku,
      nome: `${produto.nome} — ${variacao.nome_variacao}`,
      variacao_id: variacao.id,
      quantidade: 1,
      preco_unitario: precoComMarkup,
      permiteAdicionais: produto.permite_adicionais,
      adicionaisSelecionados: [],
    }]
    })
  }

  function removerItem(index) {
    setItens(atuais => atuais.filter((_, i) => i !== index))
    setSelecionandoAdicionaisPara(null)
  }

  function alternarAdicional(indexItem, adicional) {
    setItens(atuais => atuais.map((item, i) => {
      if (i !== indexItem) return item
      const jaTem = item.adicionaisSelecionados.some((a) => a.id === adicional.id)
      return {
        ...item,
        adicionaisSelecionados: jaTem
          ? item.adicionaisSelecionados.filter((a) => a.id !== adicional.id)
          : [...item.adicionaisSelecionados, adicional],
      }
    }))
  }

  const valorItem = (item) =>
    item.quantidade * (item.preco_unitario + item.adicionaisSelecionados.reduce((acc, a) => acc + Number(a.preco_adicional), 0))

  const subtotalItens = itens.reduce((acc, i) => acc + valorItem(i), 0)
  const freteObrigatorio = exigeFreteProprio(tipoAtendimento, canalVenda)
  const cotacaoAtiva = freteObrigatorio && cotacaoPedidoValida(cotacaoEntrega, lojaId, clienteEncontrado?.cpf, agora.getTime())
  const valorFrete = cotacaoAtiva ? cotacaoEntrega.taxa : 0
  const valorTotal = totalComFrete(subtotalItens, valorFrete)

  async function finalizarPedido() {
    if (envioEmCursoRef.current) return
    if (!confirmacaoPendente && (!lojaId || !clienteEncontrado || itens.length === 0 || !formaPagamento)) {
      setErroFormulario('Selecione a loja, confirme o cliente, adicione ao menos um item e escolha a forma de pagamento.')
      return
    }
    if (!confirmacaoPendente && freteObrigatorio && !cotacaoPedidoValida(cotacaoEntrega, lojaId, clienteEncontrado.cpf)) {
      setErroFormulario('Calcule e confirme o frete desta entrega antes de finalizar. Se a cotação expirou, calcule novamente.')
      return
    }
    if (!confirmacaoPendente && itens.some(item => !Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) < 1 || Number(item.quantidade) > 9999)) {
      setErroFormulario('Cada item precisa ter quantidade inteira entre 1 e 9999.'); return
    }
    if (!confirmacaoPendente && formaPagamento === 'dinheiro' && trocoPara !== '' && (!Number.isFinite(Number(trocoPara)) || Number(trocoPara) < valorTotal)) {
      setErroFormulario('O valor recebido em dinheiro precisa cobrir o total do pedido com frete.'); return
    }
    envioEmCursoRef.current = true
    setEnviando(true)
    setErroFormulario('')
    try {
      const pedidoId = await transacaoRef.current.enviar(confirmacaoPendente ? undefined : montarPedidoTransacional({
          lojaId, clienteCpf: clienteEncontrado.cpf, tipoAtendimento, formaPagamento,
          canalVenda, observacoes, trocoPara: trocoPara === '' ? valorTotal : trocoPara, itens, cotacaoId: cotacaoEntrega?.cotacao_id,
        }))
      setConfirmacaoPendente(false)
      setMensagemOperacao({ tipo: 'sucesso', texto: `Pedido #${codigoPedido(pedidoId)} recebido pela cozinha.` })

      setItens([])
      setCpfCliente('')
      setClienteEncontrado(null)
      setStatusCliente('ocioso')
      setFormaPagamento('')
      setObservacoes('')
      setTrocoPara('')
      setCanalVenda('proprio')
      setCotacaoEntrega(null)
      setMostrarFormulario(false)
    } catch (erro) {
      const pendente = transacaoRef.current.temPendente()
      setConfirmacaoPendente(pendente)
      setErroFormulario(pendente
        ? 'Não foi possível confirmar a resposta. Use Confirmar envio anterior sem fechar esta página; o mesmo pedido será recuperado sem duplicação.'
        : 'Pedido não gravado: ' + (erro?.code === 'PGRST202' ? 'A função de pedidos ainda precisa ser instalada no Supabase.' : erro?.message || 'Confira os dados.'))
    } finally {
      setEnviando(false)
      envioEmCursoRef.current = false
      carregarPedidos()
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Operação de pedidos"
        descricao="Da confirmação à entrega, acompanhe cada etapa da sua cozinha."
        acoesSecundarias={<Button variant="secondary" disabled={atualizandoPedidos} onClick={carregarPedidos}>{atualizandoPedidos ? 'Atualizando…' : 'Atualizar'}</Button>}
        acaoPrincipal={
          <Button variant="primary" disabled={!podeOperar('vendas','criar') || enviando || confirmacaoPendente} onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            {mostrarFormulario ? 'Fechar formulário' : '+ Novo Pedido'}
          </Button>
        }
      />

      {mensagemOperacao && <div role={mensagemOperacao.tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg border p-3 mb-4 flex justify-between gap-3 text-sm ${mensagemOperacao.tipo === 'erro' ? 'border-brasa text-brasa bg-brasa/5' : 'border-oliva text-oliva bg-oliva/5'}`}>
        <p>{mensagemOperacao.texto}</p><button type="button" onClick={() => setMensagemOperacao(null)} aria-label="Fechar mensagem">×</button>
      </div>}
      {erroCatalogo && <p role="alert" className="text-brasa text-sm mb-3">{erroCatalogo} <button onClick={carregarCatalogo} className="underline">Recarregar catálogo</button></p>}

      {/* KPIs */}
      {erroPedidos && <p role="alert" className="text-brasa text-sm mb-3">{erroPedidos} <button onClick={carregarPedidos} className="underline">Tentar novamente</button></p>}
      <p className="text-xs text-fumaca mb-3">Indicadores da unidade selecionada. A busca por cliente ou pedido filtra somente os cartões. Hoje considera o horário de São Paulo.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <KPICard titulo="Pedidos hoje" valor={carregandoPedidos ? '—' : kpis.pedidosHoje} />
        <KPICard titulo="Em preparo" valor={carregandoPedidos ? '—' : kpis.emPreparo} />
        <KPICard titulo="Em entrega" valor={carregandoPedidos ? '—' : kpis.emEntrega} />
        <KPICard titulo="Atrasados" valor={carregandoPedidos ? '—' : kpis.atrasados} variacao={!carregandoPedidos && kpis.atrasados > 0 ? { positiva: false, texto: 'requer atenção' } : undefined} />
        <div className="col-span-2 md:col-span-1"><KPICard titulo="Faturamento hoje" valor={carregandoPedidos ? '—' : dinheiro(kpis.faturamentoHoje)} /></div>
      </div>

      {/* Formulário de novo pedido (colapsável) */}
      {mostrarFormulario && (
        <div className="bg-superficie text-osso rounded-xl p-4 sm:p-6 mb-8 space-y-4">
          <h2 className="text-2xl">Novo pedido</h2>
          {erroFormulario && <p role="alert" className="border border-ambar text-ambar p-3 rounded-lg">{erroFormulario}</p>}
          {confirmacaoPendente && <div role="alert">
            <p>Envio aguardando confirmação. Confirme antes de fechar esta página ou iniciar outro pedido.</p>
            <Button onClick={finalizarPedido} disabled={enviando}>Confirmar envio anterior</Button>
          </div>}
          <fieldset disabled={enviando || confirmacaoPendente} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Canal de venda</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {configCanais.map((c) => (
                <button
                  key={c.canal_venda}
                  type="button"
                  onClick={() => { setCanalVenda(c.canal_venda); setCotacaoEntrega(null) }}
                  className={`px-4 py-2 text-sm ${canalVenda === c.canal_venda ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2'}`}
                >
                  {c.nome_exibicao}
                  {Number(c.taxa_plataforma_percentual) > 0 && (
                    <span className="text-[10px] opacity-70 ml-1">(taxa {c.taxa_plataforma_percentual}%)</span>
                  )}
                </button>
              ))}
            </div>
            {canalVenda !== 'proprio' && (
              <p className="text-[11px] text-ambar mt-1">
                Preços ajustados automaticamente pra esse canal (markup pra compensar a comissão da plataforma).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-fumaca">Unidade</label>
              <select
                value={lojaId}
                onChange={(e) => { setLojaId(e.target.value); setTipoAtendimento('delivery'); setCotacaoEntrega(null) }}
                className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso"
              >
                <option value="">Selecione...</option>
                {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-fumaca">CPF do cliente</label>
              <input
                ref={cpfClienteInputRef}
                disabled={cadastrandoCliente} aria-label="CPF do cliente"
                value={cpfCliente}
                onChange={(e) => { setCpfCliente(formatarCPF(e.target.value)); setCotacaoEntrega(null) }}
                placeholder="000.000.000-00"
                maxLength={16}
                className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso"
              />

              {statusCliente === 'invalido' && (
                <p className="text-xs text-brasa mt-1">CPF inválido — confira os números.</p>
              )}
              {statusCliente === 'buscando' && (
                <p className="text-xs text-fumaca mt-1">Buscando...</p>
              )}
              {statusCliente === 'erro' && <p role="alert" className="text-xs text-ambar mt-2">Não foi possível consultar o cliente. <button type="button" onClick={() => setTentativaCliente(n => n + 1)} className="underline">Tentar novamente</button></p>}
              {statusCliente === 'encontrado' && (
                <p className="text-xs text-oliva mt-1">✓ Cliente: {clienteEncontrado?.nome}</p>
              )}
              {statusCliente === 'nao_encontrado' && (
                <div className="mt-2 p-4 bg-carvao border-2 border-ambar space-y-3">
                  <p className="text-sm text-ambar font-medium">
                    ⚠ CPF não cadastrado — complete o cadastro abaixo para continuar o pedido
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Nome completo"
                      value={novoClienteNome}
                      onChange={(e) => setNovoClienteNome(e.target.value)}
                      className="w-full px-2 py-1.5 bg-superficie border border-superficie2 text-osso text-xs"
                    />
                    <input
                      placeholder="(11) 98765-4321"
                      ref={novoClienteTelefoneInputRef}
                      value={novoClienteTelefone}
                      onChange={(e) => setNovoClienteTelefone(formatarTelefone(e.target.value))}
                      maxLength={16}
                      className="w-full px-2 py-1.5 bg-superficie border border-superficie2 text-osso text-xs"
                    />
                  </div>
                  <CamposEndereco
                    valores={novoClienteEndereco}
                    onChange={(campo, valor) => setNovoClienteEndereco((atual) => ({ ...atual, [campo]: valor }))}
                  />
                  <button
                    onClick={cadastrarClienteRapido}
                    disabled={cadastrandoCliente}
                    className="w-full bg-ambar text-carvao text-xs font-medium py-1.5"
                  >
                    {cadastrandoCliente ? 'Cadastrando...' : 'Cadastrar e usar'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {lojaSelecionada && (
            <div>
              <label className="text-xs uppercase tracking-wide text-fumaca">Tipo de atendimento</label>
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => { setTipoAtendimento('delivery'); setCotacaoEntrega(null) }}
                  className={`px-4 py-2 text-sm ${tipoAtendimento === 'delivery' ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2'}`}>
                  Delivery
                </button>
                <button type="button" disabled={somenteDelivery} onClick={() => { setTipoAtendimento('presencial'); setCotacaoEntrega(null) }}
                  className={`px-4 py-2 text-sm disabled:opacity-30 ${tipoAtendimento === 'presencial' ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2'}`}>
                  Presencial
                </button>
              </div>
            </div>
          )}

          {freteObrigatorio && lojaId && clienteEncontrado && (
            <ConsultaEntrega key={`${lojaId}-${clienteEncontrado.cpf}`} lojaId={lojaId} modoPedido
              pontoSalvo={lojaSelecionada?.latitude != null && lojaSelecionada?.longitude != null}
              clienteCpf={clienteEncontrado.cpf}
              destinoInicial={Object.fromEntries(['cep', 'numero', 'endereco', 'complemento', 'bairro', 'cidade', 'estado']
                .map(campo => [campo, String(clienteEncontrado[campo] ?? '').trim()]))}
              onInvalidar={() => setCotacaoEntrega(null)}
              onCotacao={dados => setCotacaoEntrega({ ...dados, lojaId, clienteCpf: clienteEncontrado.cpf })} />
          )}
          {freteObrigatorio && (!lojaId || !clienteEncontrado) && <p className="text-xs text-ambar">Selecione a unidade e o cliente para calcular o frete do pedido.</p>}
          {tipoAtendimento === 'delivery' && canalVenda !== 'proprio' && <p className="text-xs text-fumaca">Frete deste canal é tratado pela plataforma. O sistema não adiciona outra taxa.</p>}

          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Adicionar item</label>
            <input aria-label="Buscar produto no cardápio" placeholder="Buscar produto, nome ou SKU…" value={buscaProduto}
              onChange={e => setBuscaProduto(e.target.value)} className="w-full mt-2 px-3 py-3 bg-carvao border border-superficie2 rounded-lg text-sm" />
            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              <button
                onClick={() => setCategoriaSelecionada('todas')}
                className={`px-3 py-1.5 text-xs ${categoriaSelecionada === 'todas' ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2 text-osso'}`}
              >
                Todas
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaSelecionada(cat.nome)}
                  className={`px-3 py-1.5 text-xs ${categoriaSelecionada === cat.nome ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2 text-osso'}`}
                >
                  {cat.nome}
                </button>
              ))}
            </div>

            <div className="max-h-96 overflow-y-auto pr-1">{categorias
              .filter((cat) => categoriaSelecionada === 'todas' || categoriaSelecionada === cat.nome)
              .map((cat) => {
                const termo = buscaProduto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
                const produtosDaCategoria = produtos.filter(p => p.categorias?.nome === cat.nome &&
                  (tipoAtendimento === 'delivery' ? p.disponivel_delivery : p.disponivel_presencial) &&
                  `${p.nome} ${p.nome_comercial || ''} ${p.sku}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(termo))
                if (produtosDaCategoria.length === 0) return null
                return (
                  <div key={cat.id} className="mb-3">
                    <p className="text-[11px] uppercase tracking-wide text-fumaca mb-1.5">{cat.nome}</p>
                    <div className="flex flex-wrap gap-2">
                      {produtosDaCategoria.map((produto) =>
                        variacoes
                          .filter((v) => v.produto_sku === produto.sku)
                          .map((v) => (
                            <button
                              key={v.id}
                              onClick={() => adicionarItem(v)}
                              className="px-3 py-3 rounded-lg text-left text-xs bg-carvao border border-superficie2 hover:border-ambar"
                            >
                              {produto.nome} · {v.nome_variacao}
                              <span className="block text-ambar mt-1 font-medium">{dinheiro(calcularPrecoCanal(v.preco_venda, configCanais.find(c => c.canal_venda === canalVenda)?.markup_preco_percentual || 0))}</span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )
              })}</div>
          </div>

          {itens.length > 0 && (
            <div className="border-t border-superficie2 pt-3">
              {itens.map((i, idx) => (
                <div key={i.chave || idx} className="py-3 border-b border-superficie2/50 last:border-0">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>{i.nome}</span>
                    <span className="flex items-center gap-3">
                      {dinheiro(valorItem(i))}
                      <button onClick={() => removerItem(idx)} className="text-brasa text-xs">remover</button>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" aria-label={`Diminuir quantidade de ${i.nome}`} disabled={Number(i.quantidade) <= 1}
                      onClick={() => setItens(atuais => atuais.map((item, j) => j === idx ? { ...item, quantidade: Math.max(1, Number(item.quantidade) - 1) } : item))}
                      className="w-11 h-11 rounded-lg border border-superficie2">−</button>
                    <input type="number" min="1" max="9999" step="1" aria-label={`Quantidade de ${i.nome}`} value={i.quantidade}
                      onChange={e => { const qtd = e.target.value; setItens(atuais => atuais.map((item, j) => j === idx ? { ...item, quantidade: qtd } : item)) }}
                      className="w-20 text-center py-2 bg-carvao rounded-lg border border-superficie2" />
                    <button type="button" aria-label={`Aumentar quantidade de ${i.nome}`} disabled={Number(i.quantidade) >= 9999}
                      onClick={() => setItens(atuais => atuais.map((item, j) => j === idx ? { ...item, quantidade: (Number(item.quantidade) || 0) + 1 } : item))}
                      className="w-11 h-11 rounded-lg border border-superficie2">+</button>
                  </div>
                  {i.permiteAdicionais && (
                    <div className="mt-1">
                      <button type="button" onClick={() => setSelecionandoAdicionaisPara(selecionandoAdicionaisPara === idx ? null : idx)} className="text-xs text-ambar">
                        {i.adicionaisSelecionados.length > 0 ? `${i.adicionaisSelecionados.length} adicional(is) — editar` : '+ adicionar personalização'}
                      </button>
                      {selecionandoAdicionaisPara === idx && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {adicionaisDoProduto(i.produto_sku).map((a) => {
                            const marcado = i.adicionaisSelecionados.some((s) => s.id === a.id)
                            return (
                              <button key={a.id} type="button" onClick={() => alternarAdicional(idx, a)}
                                className={`text-xs px-2.5 py-1 border ${marcado ? 'bg-ambar text-carvao border-ambar' : 'border-superficie2 text-osso'}`}>
                                {a.nome} · +R$ {Number(a.preco_adicional).toFixed(2)}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="space-y-1 mt-2 pt-2 border-t border-superficie2 text-sm">
                <div className="flex justify-between"><span>Itens</span><span>{dinheiro(subtotalItens)}</span></div>
                {freteObrigatorio && <div className="flex justify-between"><span>Frete</span><span>{cotacaoAtiva ? dinheiro(valorFrete) : 'Calcule a rota'}</span></div>}
                <div className="flex justify-between font-medium pt-1"><span>Total</span><span>{freteObrigatorio && !cotacaoAtiva ? 'Aguardando frete' : dinheiro(valorTotal)}</span></div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Forma de pagamento</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { valor: 'pix', label: 'Pix' },
                { valor: 'credito', label: 'Crédito' },
                { valor: 'debito', label: 'Débito' },
                { valor: 'dinheiro', label: 'Dinheiro' },
              ].map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => setFormaPagamento(opcao.valor)}
                  className={`px-4 py-2 text-sm ${formaPagamento === opcao.valor ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2 text-osso'}`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>

            {formaPagamento === 'dinheiro' && (
              <div className="mt-2">
                <label className="text-xs uppercase tracking-wide text-fumaca">Valor recebido (deixe vazio para valor exato)</label>
                <input
                  type="number"
                  step="0.01"
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  placeholder={`Ex: ${Math.ceil(valorTotal / 10) * 10}`}
                  className="w-40 mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso text-sm"
                />
                {trocoPara && Number(trocoPara) >= valorTotal && (
                  <p className="text-xs text-oliva mt-1">
                    Troco: R$ {(Number(trocoPara) - valorTotal).toFixed(2)}
                  </p>
                )}
                {trocoPara && Number(trocoPara) < valorTotal && (
                  <p className="text-xs text-brasa mt-1">Valor menor que o total do pedido.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Observações do pedido</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: sem cebola, troco combinado na entrega, ponto da carne..."
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso text-sm"
            />
          </div>

          <button
            onClick={finalizarPedido}
            disabled={
              enviando || (!confirmacaoPendente && (!clienteEncontrado || !formaPagamento)) ||
              (freteObrigatorio && !cotacaoAtiva && !confirmacaoPendente) ||
              (!confirmacaoPendente && formaPagamento === 'dinheiro' && (!trocoPara || Number(trocoPara) < valorTotal))
            }
            className="bg-ambar text-carvao font-medium px-5 py-2.5 hover:bg-osso transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {enviando ? 'Enviando...' : confirmacaoPendente ? 'Confirmar envio anterior' : 'Finalizar pedido'}
          </button>
          </fieldset>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          placeholder="Buscar por pedido, cliente ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar pedido ou cliente" className="flex-1 basis-full sm:basis-0 min-w-0 sm:min-w-[220px] px-3 py-3 rounded-lg border border-borda focus:outline-none focus:border-ambar text-sm"
        />
        <select aria-label="Filtrar unidade dos pedidos" value={filtroLoja} onChange={(e) => setFiltroLoja(e.target.value)}
          className="w-full sm:w-auto max-w-full px-3 py-3 rounded-lg border border-borda text-sm">
          <option value="todas">Todas as unidades</option>
          {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4" aria-label="Etapas dos pedidos">
        {[{ status: 'todos', titulo: 'Todos' }, ...COLUNAS].map(coluna => <button type="button" key={coluna.status}
          onClick={() => setFiltroStatus(coluna.status)} aria-pressed={filtroStatus === coluna.status}
          className={`px-3 py-2 rounded-full text-xs border ${filtroStatus === coluna.status ? 'bg-carvao text-osso border-carvao' : 'bg-branco border-borda'}`}>
          {coluna.titulo} · {pedidosFiltrados.filter(p => coluna.status === 'todos' || p.status === coluna.status).length}
        </button>)}
        <span className="text-xs text-fumaca ml-auto">{ultimaAtualizacao ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString('pt-BR')}` : 'Carregando pedidos…'}</span>
      </div>

      {/* Kanban */}
      {carregandoPedidos && <p role="status" className="text-fumaca p-6">Buscando pedidos da operação…</p>}
      <div className={filtroStatus === 'todos' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4' : 'max-w-3xl'}>
        {COLUNAS.filter(c => filtroStatus === 'todos' || c.status === filtroStatus).map((coluna) => {
          const pedidosColuna = pedidosFiltrados.filter((p) => p.status === coluna.status)
          return (
            <section key={coluna.status} aria-label={coluna.titulo} className="min-w-0 bg-borda/20 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm uppercase tracking-wide text-fumaca">{coluna.titulo}</h3>
                <span className="text-xs bg-superficie2/20 px-2 py-0.5">{pedidosColuna.length}</span>
              </div>
              <div className="min-h-[100px]">
                {pedidosColuna.length === 0 && (
                  <p className="text-xs text-fumaca/60 italic">{carregandoPedidos ? 'Carregando…' : 'Nenhum pedido aqui'}</p>
                )}
                {pedidosColuna.map((pedido) => (
                  <CardPedido
                    key={pedido.id}
                    pedido={pedido}
                    agora={agora}
                    onAvancar={podeAvancar ? avancarStatus : null}
                    onCancelar={podeOperar('vendas','editar') ? cancelarPedido : null}
                    atualizando={pedidosEmAtualizacao.has(pedido.id)}
                    onAbrirDetalhe={pedido => setExpandidoId(pedido.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <SidePanel
        aberto={!!pedidoDetalhe}
        onFechar={() => setExpandidoId(null)}
        titulo={pedidoDetalhe ? `Pedido #${codigoPedido(pedidoDetalhe.id)}` : ''}
      >
        {pedidoDetalhe && (
          <DetalhePedido pedido={pedidoDetalhe} onAvancar={podeAvancar ? avancarStatus : null} onCancelar={podeOperar('vendas','editar') ? cancelarPedido : null} atualizando={pedidosEmAtualizacao.has(pedidoDetalhe.id)} />
        )}
      </SidePanel>
      <SidePanel aberto={!!cancelamento} onFechar={() => setCancelamento(null)}
        titulo={cancelamento ? `Cancelar pedido #${codigoPedido(cancelamento.id)}` : ''}>
        {cancelamento && <form onSubmit={confirmarCancelamento} className="space-y-5 text-sm">
          <p className="text-fumaca">O total de {dinheiro(cancelamento.valor_total)} será estornado no ERP e deixará de compor o faturamento. O sistema não devolve dinheiro automaticamente via Pix ou cartão.</p>
          <div>
            <label className="block text-xs uppercase text-fumaca mb-1" htmlFor="motivo-cancelamento">Motivo obrigatório</label>
            <textarea id="motivo-cancelamento" required minLength={3} maxLength={500}
              value={motivoCancelamento} onChange={e => setMotivoCancelamento(e.target.value)}
              className="w-full border border-borda p-2 min-h-24" placeholder="Explique o motivo do cancelamento" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs uppercase text-fumaca mb-2">Destino dos itens</legend>
            {[
              ['devolver_estoque', 'Devolver ao estoque', 'O preparo não consumiu os ingredientes; repõe a baixa original.'],
              ['perda_operacional', 'Perda operacional', 'O lanche já foi preparado; mantém a baixa de estoque como custo.'],
              ['reaproveitar', 'Encaixar em outro pedido', 'Aproveita o item pronto em pedido idêntico, sem segunda baixa.'],
            ].map(([valor, rotulo, detalhe]) => <label key={valor} className="flex gap-2 border border-borda p-3 cursor-pointer">
              <input type="radio" name="destino-cancelamento" value={valor} checked={destinoCancelamento === valor}
                disabled={!cancelamento.estoque_rastreado && valor !== 'perda_operacional'}
                onChange={() => { setDestinoCancelamento(valor); setPedidoDestinoId('') }} />
              <span><strong className="block">{rotulo}</strong><span className="text-fumaca">{detalhe}</span></span>
            </label>)}
          </fieldset>
          {!cancelamento.estoque_rastreado && <p className="text-xs text-ambar">Este pedido é anterior ao registro exato do consumo. Para não repor quantidades estimadas, só a perda operacional está disponível.</p>}
          {destinoCancelamento === 'reaproveitar' && <div>
            <label className="block text-xs uppercase text-fumaca mb-1" htmlFor="pedido-destino">Pedido ativo idêntico da mesma unidade</label>
            <select id="pedido-destino" required value={pedidoDestinoId} onChange={e => setPedidoDestinoId(e.target.value)}
              className="w-full border border-borda p-2">
              <option value="">Selecione um pedido</option>
              {destinosReaproveitamento(cancelamento, pedidosAtivos).map(p =>
                <option key={p.id} value={p.id}>#{p.id} · {p.clientes?.nome || formatarCPF(p.cliente_cpf)}</option>)}
            </select>
            {destinosReaproveitamento(cancelamento, pedidosAtivos).length === 0 && <p className="text-xs text-fumaca mt-1">Nenhum pedido com os mesmos itens, variações, adicionais e quantidades.</p>}
          </div>}
          {erroCancelamento && <p role="alert" className="text-brasa">{erroCancelamento}</p>}
          <Button variant="danger" className="w-full" type="submit"
            disabled={pedidosEmAtualizacao.has(cancelamento.id) || !destinoCancelamento ||
              (destinoCancelamento === 'reaproveitar' && !pedidoDestinoId)}>
            Confirmar cancelamento e estorno
          </Button>
        </form>}
      </SidePanel>
    </div>
  )
}
