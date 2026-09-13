import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import CamposEndereco from '../components/CamposEndereco.jsx'
import { formatarCPF, apenasDigitos, validarCPF, formatarTelefone } from '../lib/format.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import KPICard from '../components/data-display/KPICard.jsx'
import Button from '../components/ui/Button.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'

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

function CardPedido({ pedido, agora, onAvancar, onCancelar, expandido, onToggle }) {
  const min = minutosDecorridos(pedido.criado_em, agora)
  const cor = corTempo(min)
  const acao = rotuloAcao(pedido)

  return (
    <div className="bg-white border border-superficie2/20 p-4 mb-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-fumaca">
            #{pedido.id} · {pedido.lojas?.nome}
            {pedido.canal_venda && pedido.canal_venda !== 'proprio' && (
              <StatusBadge estado="neutro">{CANAL_LABEL[pedido.canal_venda]}</StatusBadge>
            )}
          </p>
          <p className="font-medium">{pedido.clientes?.nome || formatarCPF(pedido.cliente_cpf)}</p>
        </div>
        <span className={`text-xs font-medium flex items-center gap-1.5 ${cor.texto}`}>
          <span className={`w-2 h-2 rounded-full ${cor.ponto}`} />
          {min} min
        </span>
      </div>

      <button onClick={onToggle} className="text-xs text-ambar mt-2">
        {expandido ? 'Ocultar itens' : `${pedido.itens_pedido?.length || 0} item(ns) — ver detalhes`}
      </button>

      {expandido && (
        <>
          <ul className="mt-2 text-sm space-y-1">
            {pedido.itens_pedido?.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span>{item.quantidade}x {item.produtos?.nome}</span>
                {item.produtos?.categorias?.nome && (
                  <span className="text-[10px] uppercase text-fumaca border border-fumaca/30 px-1.5">
                    {item.produtos.categorias.nome}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {pedido.observacoes && (
            <p className="text-xs text-ambar mt-2 italic">Obs: {pedido.observacoes}</p>
          )}
          {pedido.forma_pagamento === 'dinheiro' && pedido.troco_para && (
            <p className="text-xs text-fumaca mt-1">
              Troco para R$ {Number(pedido.troco_para).toFixed(2)}
              {' '}(troco: R$ {(Number(pedido.troco_para) - Number(pedido.valor_total)).toFixed(2)})
            </p>
          )}
        </>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-superficie2/20">
        <span className="font-medium text-sm">R$ {Number(pedido.valor_total).toFixed(2)}</span>
        <span className="text-xs uppercase text-fumaca">{pedido.tipo_atendimento}</span>
      </div>

      {acao && (
        <button
          onClick={() => onAvancar(pedido)}
          className="w-full mt-3 bg-ambar text-carvao text-sm font-medium py-2 hover:bg-carvao hover:text-osso transition-colors"
        >
          {acao}
        </button>
      )}
      <button
        onClick={() => onCancelar(pedido)}
        className="w-full mt-1.5 text-xs text-brasa/70 hover:text-brasa py-1"
      >
        Cancelar pedido
      </button>
    </div>
  )
}

export default function Pedidos() {
  const [lojas, setLojas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [variacoes, setVariacoes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState([])
  const [adicionais, setAdicionais] = useState([])
  const [pedidosAtivos, setPedidosAtivos] = useState([])
  const [pedidosHoje, setPedidosHoje] = useState([])

  const [filtroLoja, setFiltroLoja] = useState('todas')
  const [busca, setBusca] = useState('')
  const [agora, setAgora] = useState(new Date())
  const [expandidoId, setExpandidoId] = useState(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas')

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
  const [tipoAtendimento, setTipoAtendimento] = useState('delivery')
  const [itens, setItens] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [canalVenda, setCanalVenda] = useState('proprio')
  const [configCanais, setConfigCanais] = useState([])
  const [observacoes, setObservacoes] = useState('')
  const [trocoPara, setTrocoPara] = useState('')
  const [selecionandoAdicionaisPara, setSelecionandoAdicionaisPara] = useState(null)

  async function carregarCatalogo() {
    const [{ data: l }, { data: p }, { data: v }, { data: cat }, { data: pad }, { data: ad }, { data: canais }] = await Promise.all([
      supabase.from('lojas').select('*').eq('ativo', true),
      supabase.from('produtos').select('*, categorias(nome)').eq('ativo', true),
      supabase.from('produto_variacoes').select('*'),
      supabase.from('categorias').select('*').order('ordem'),
      supabase.from('produto_adicionais_disponiveis').select('*'),
      supabase.from('adicionais').select('*'),
      supabase.from('configuracoes_canal').select('*'),
    ])
    if (l) setLojas(l)
    if (p) setProdutos(p)
    if (v) setVariacoes(v)
    if (cat) setCategorias(cat)
    if (pad) setAdicionaisDisponiveis(pad)
    if (ad) setAdicionais(ad)
    if (canais) setConfigCanais(canais)
  }

  async function carregarPedidos() {
    const inicioHoje = new Date()
    inicioHoje.setHours(0, 0, 0, 0)

    const { data: ativos } = await supabase
      .from('pedidos')
      .select('*, lojas(nome), clientes(nome), itens_pedido(*, produtos(nome, categorias(nome)))')
      .in('status', ['recebido', 'em_preparo', 'pronto', 'saiu_entrega'])
      .order('criado_em', { ascending: true })

    const { data: hoje } = await supabase
      .from('pedidos')
      .select('id, valor_total, status')
      .gte('criado_em', inicioHoje.toISOString())

    if (ativos) setPedidosAtivos(ativos)
    if (hoje) setPedidosHoje(hoje)
  }

  useEffect(() => {
    carregarCatalogo()
    carregarPedidos()
    const intervaloTempo = setInterval(() => setAgora(new Date()), 30000)
    const intervaloDados = setInterval(carregarPedidos, 20000)
    return () => { clearInterval(intervaloTempo); clearInterval(intervaloDados) }
  }, [])

  const pedidosFiltrados = pedidosAtivos.filter((p) => {
    const passaLoja = filtroLoja === 'todas' || p.loja_id === filtroLoja
    const termo = busca.trim().toLowerCase()
    const passaBusca = !termo ||
      String(p.id).includes(termo) ||
      p.cliente_cpf.includes(termo.replace(/\D/g, '')) ||
      (p.clientes?.nome || '').toLowerCase().includes(termo)
    return passaLoja && passaBusca
  })

  const kpis = useMemo(() => {
    const validos = pedidosHoje.filter((p) => p.status !== 'cancelado')
    return {
      pedidosHoje: validos.length,
      emPreparo: pedidosAtivos.filter((p) => p.status === 'em_preparo').length,
      emEntrega: pedidosAtivos.filter((p) => p.status === 'saiu_entrega').length,
      atrasados: pedidosAtivos.filter((p) => minutosDecorridos(p.criado_em, agora) >= 30).length,
      faturamentoHoje: validos.reduce((acc, p) => acc + Number(p.valor_total), 0),
    }
  }, [pedidosHoje, pedidosAtivos, agora])

  async function avancarStatus(pedido) {
    const novoStatus = proximoStatus(pedido)
    if (!novoStatus) return
    const { error } = await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedido.id)
    if (error) {
      alert('Não foi possível atualizar o pedido: ' + error.message)
      return
    }
    carregarPedidos()
  }

  async function cancelarPedido(pedido) {
    const motivo = prompt(`Cancelar pedido #${pedido.id} — motivo:`)
    if (motivo === null) return // usuário desistiu
    if (!motivo.trim()) {
      alert('Informe um motivo para o cancelamento.')
      return
    }
    const { error } = await supabase
      .from('pedidos')
      .update({ status: 'cancelado', motivo_cancelamento: motivo.trim() })
      .eq('id', pedido.id)
    if (error) {
      alert('Não foi possível cancelar: ' + error.message)
      return
    }
    carregarPedidos()
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
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from('clientes').select('*').eq('cpf', digitos).maybeSingle()
      if (data) {
        setClienteEncontrado(data)
        setStatusCliente('encontrado')
      } else {
        setStatusCliente('nao_encontrado')
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [cpfCliente])

  async function cadastrarClienteRapido() {
    if (!novoClienteNome || apenasDigitos(novoClienteTelefone).length < 10) {
      alert('Informe nome e telefone válidos (com DDD).')
      return
    }
    if (tipoAtendimento === 'delivery' && !novoClienteEndereco.cep) {
      alert('Pedido delivery precisa de endereço — informe ao menos o CEP.')
      return
    }
    setCadastrandoCliente(true)
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
    setCadastrandoCliente(false)
    if (error) {
      alert('Erro ao cadastrar cliente: ' + error.message)
      return
    }
    setClienteEncontrado(data)
    setStatusCliente('encontrado')
    setNovoClienteNome('')
    setNovoClienteTelefone('')
    setNovoClienteEndereco({})
  }

  const adicionaisDoProduto = (sku) => {
    const ids = adicionaisDisponiveis.filter((a) => a.produto_sku === sku).map((a) => a.adicional_id)
    return adicionais.filter((a) => ids.includes(a.id))
  }

  function adicionarItem(variacao) {
    const produto = produtos.find((p) => p.sku === variacao.produto_sku)
    const config = configCanais.find((c) => c.canal_venda === canalVenda)
    const markup = config ? Number(config.markup_preco_percentual) / 100 : 0
    const precoComMarkup = variacao.preco_venda * (1 + markup)
    setItens([...itens, {
      produto_sku: variacao.produto_sku,
      nome: `${produto.nome} — ${variacao.nome_variacao}`,
      variacao_id: variacao.id,
      quantidade: 1,
      preco_unitario: precoComMarkup,
      permiteAdicionais: produto.permite_adicionais,
      adicionaisSelecionados: [],
    }])
  }

  function removerItem(index) {
    setItens(itens.filter((_, i) => i !== index))
  }

  function alternarAdicional(indexItem, adicional) {
    setItens(itens.map((item, i) => {
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

  const valorTotal = itens.reduce((acc, i) => acc + valorItem(i), 0)

  async function finalizarPedido() {
    if (!lojaId || !clienteEncontrado || itens.length === 0 || !formaPagamento) {
      alert('Selecione a loja, confirme o cliente, adicione ao menos um item e escolha a forma de pagamento.')
      return
    }
    setEnviando(true)
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        loja_id: lojaId,
        cliente_cpf: clienteEncontrado.cpf,
        tipo_atendimento: tipoAtendimento,
        valor_total: valorTotal,
        forma_pagamento: formaPagamento,
        canal_venda: canalVenda,
        observacoes: observacoes.trim() || null,
        troco_para: formaPagamento === 'dinheiro' ? Number(trocoPara) : null,
        status: 'recebido',
      })
      .select()
      .single()

    if (error) {
      alert('Erro ao criar pedido: ' + error.message)
      setEnviando(false)
      return
    }

    for (const i of itens) {
      const { data: itemPedido } = await supabase
        .from('itens_pedido')
        .insert({
          pedido_id: pedido.id,
          produto_sku: i.produto_sku,
          variacao_id: i.variacao_id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
        })
        .select()
        .single()

      if (i.adicionaisSelecionados.length > 0) {
        await supabase.from('itens_pedido_adicionais').insert(
          i.adicionaisSelecionados.map((a) => ({
            item_pedido_id: itemPedido.id,
            adicional_id: a.id,
            quantidade: 1,
            preco_unitario: a.preco_adicional,
          }))
        )
      }
    }

    setItens([])
    setCpfCliente('')
    setClienteEncontrado(null)
    setStatusCliente('ocioso')
    setFormaPagamento('')
    setObservacoes('')
    setTrocoPara('')
    setCanalVenda('proprio')
    setEnviando(false)
    setMostrarFormulario(false)
    carregarPedidos()
  }

  return (
    <div>
      <PageHeader
        titulo="Pedidos"
        descricao="Gerencie e acompanhe os pedidos da sua rede em tempo real."
        acaoPrincipal={
          <Button variant="primary" onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            + Novo Pedido
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KPICard titulo="Pedidos hoje" valor={kpis.pedidosHoje} />
        <KPICard titulo="Em preparo" valor={kpis.emPreparo} />
        <KPICard titulo="Em entrega" valor={kpis.emEntrega} />
        <KPICard titulo="Atrasados" valor={kpis.atrasados} variacao={kpis.atrasados > 0 ? { positiva: false, texto: 'requer atenção' } : undefined} />
        <KPICard titulo="Faturamento hoje" valor={`R$ ${kpis.faturamentoHoje.toFixed(2)}`} />
      </div>

      {/* Formulário de novo pedido (colapsável) */}
      {mostrarFormulario && (
        <div className="bg-superficie text-osso p-6 mb-8 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Canal de venda</label>
            <div className="flex gap-2 mt-1">
              {configCanais.map((c) => (
                <button
                  key={c.canal_venda}
                  type="button"
                  onClick={() => setCanalVenda(c.canal_venda)}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-fumaca">Unidade</label>
              <select
                value={lojaId}
                onChange={(e) => { setLojaId(e.target.value); setTipoAtendimento('delivery') }}
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
                value={cpfCliente}
                onChange={(e) => setCpfCliente(formatarCPF(e.target.value))}
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
                <button type="button" onClick={() => setTipoAtendimento('delivery')}
                  className={`px-4 py-2 text-sm ${tipoAtendimento === 'delivery' ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2'}`}>
                  Delivery
                </button>
                <button type="button" disabled={somenteDelivery} onClick={() => setTipoAtendimento('presencial')}
                  className={`px-4 py-2 text-sm disabled:opacity-30 ${tipoAtendimento === 'presencial' ? 'bg-ambar text-carvao' : 'bg-carvao border border-superficie2'}`}>
                  Presencial
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Adicionar item</label>
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

            {categorias
              .filter((cat) => categoriaSelecionada === 'todas' || categoriaSelecionada === cat.nome)
              .map((cat) => {
                const produtosDaCategoria = produtos.filter((p) => p.categorias?.nome === cat.nome)
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
                              className="px-3 py-1.5 text-xs bg-carvao border border-superficie2 hover:border-ambar"
                            >
                              {produto.nome} · {v.nome_variacao}
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {itens.length > 0 && (
            <div className="border-t border-superficie2 pt-3">
              {itens.map((i, idx) => (
                <div key={idx} className="py-2 border-b border-superficie2/50 last:border-0">
                  <div className="flex justify-between text-sm">
                    <span>{i.nome}</span>
                    <span className="flex items-center gap-3">
                      R$ {valorItem(i).toFixed(2)}
                      <button onClick={() => removerItem(idx)} className="text-brasa text-xs">remover</button>
                    </span>
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
              <div className="flex justify-between font-medium mt-2 pt-2 border-t border-superficie2">
                <span>Total</span>
                <span>R$ {valorTotal.toFixed(2)}</span>
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
                <label className="text-xs uppercase tracking-wide text-fumaca">Troco para quanto?</label>
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
              enviando || !clienteEncontrado || !formaPagamento ||
              (formaPagamento === 'dinheiro' && (!trocoPara || Number(trocoPara) < valorTotal))
            }
            className="bg-ambar text-carvao font-medium px-5 py-2.5 hover:bg-osso transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {enviando ? 'Enviando...' : 'Finalizar pedido'}
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          placeholder="Buscar por pedido, cliente ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 border border-superficie2/40 focus:outline-none focus:border-ambar text-sm"
        />
        <select value={filtroLoja} onChange={(e) => setFiltroLoja(e.target.value)}
          className="px-3 py-2 border border-superficie2/40 text-sm">
          <option value="todas">Todas as unidades</option>
          {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-4 gap-4">
        {COLUNAS.map((coluna) => {
          const pedidosColuna = pedidosFiltrados.filter((p) => p.status === coluna.status)
          return (
            <div key={coluna.status}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm uppercase tracking-wide text-fumaca">{coluna.titulo}</h3>
                <span className="text-xs bg-superficie2/20 px-2 py-0.5">{pedidosColuna.length}</span>
              </div>
              <div className="min-h-[100px]">
                {pedidosColuna.length === 0 && (
                  <p className="text-xs text-fumaca/60 italic">Nenhum pedido aqui</p>
                )}
                {pedidosColuna.map((pedido) => (
                  <CardPedido
                    key={pedido.id}
                    pedido={pedido}
                    agora={agora}
                    onAvancar={avancarStatus}
                    onCancelar={cancelarPedido}
                    expandido={expandidoId === pedido.id}
                    onToggle={() => setExpandidoId(expandidoId === pedido.id ? null : pedido.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
