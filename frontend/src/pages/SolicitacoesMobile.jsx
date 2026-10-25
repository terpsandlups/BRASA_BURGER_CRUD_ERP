import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { dinheiro, codigoPedido } from '../lib/pedidoApresentacao.js'
import { mensagemPortal } from '../lib/portalCliente.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import SidePanel from '../components/layout/SidePanel.jsx'
import ConsultaEntrega from '../components/ConsultaEntrega.jsx'

function Atendimento({ solicitacao: s, onAtualizar }) {
  const { podeOperar } = useAuth()
  const [motivo, setMotivo] = useState('')
  const [cotacao, setCotacao] = useState(null)
  const [clientePronto, setClientePronto] = useState(false)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const trava = useRef(false)
  const dados = s.dados
  const permitido = podeOperar('vendas','criar')
  async function executar(acao) {
    if (trava.current) return
    trava.current = true; setOcupado(true); setErro('')
    try { await acao() } catch (error) { setErro(mensagemPortal(error)) }
    finally { trava.current = false; setOcupado(false) }
  }
  async function decidir(acao) {
    await executar(async () => {
      const { error } = await supabase.rpc('decidir_solicitacao_mobile', { p_id: s.id, p_acao: acao, p_motivo: acao === 'recusar' ? motivo : null, p_cotacao: cotacao?.cotacao_id || null })
      if (error) throw error
      await onAtualizar()
    })
  }
  return <div className="space-y-5">
    <div><h2 className="text-xl">{dados.nome}</h2><p>{dados.telefone}</p><p className="text-sm text-fumaca">CPF {dados.cpf} · {dados.tipo_atendimento === 'delivery' ? 'Entrega' : 'Retirada'} · {dados.forma_pagamento}</p></div>
    {s.resumo_itens.map((i, index) => <div key={index} className="border-b border-borda pb-3"><p>{i.quantidade} × {i.nome}</p><p className="text-sm text-fumaca">{i.adicionais.join(', ')} · {dinheiro(i.total)}</p></div>)}
    {dados.observacoes && <p className="border border-borda rounded-lg p-3">{dados.observacoes}</p>}
    <p>Subtotal: <strong>{dinheiro(s.subtotal)}</strong></p>
    {dados.troco_para && <p>Troco para: {dinheiro(dados.troco_para)}</p>}
    {dados.tipo_atendimento === 'delivery' && <>
      <p className="text-sm">{dados.endereco.endereco}, {dados.endereco.numero} · {dados.endereco.bairro} · {dados.endereco.cidade}/{dados.endereco.estado} · {dados.endereco.cep} {dados.endereco.complemento}</p>
      {!clientePronto ? <button disabled={!permitido || ocupado} className="bg-ambar px-4 py-3 rounded-lg" onClick={() => executar(async () => {
        const { error } = await supabase.from('clientes').upsert({ cpf: dados.cpf, nome: dados.nome, telefone: dados.telefone }, { onConflict: 'cpf', ignoreDuplicates: true })
        if (error) throw error
        setClientePronto(true)
      })}>Preparar cálculo de frete</button> : <ConsultaEntrega lojaId={s.loja_id} modoPedido clienteCpf={dados.cpf} destinoInicial={dados.endereco} onCotacao={setCotacao} onInvalidar={() => setCotacao(null)} />}
      <p className="text-sm text-fumaca">Confirme o frete com o cliente pelo telefone antes de aceitar. Use o endereço da solicitação.</p>
    </>}
    {erro && <p role="alert" className="text-brasa">{erro}</p>}
    <button disabled={!permitido || ocupado || (dados.tipo_atendimento === 'delivery' && (!cotacao || Date.parse(cotacao.expira_em) <= Date.now()))} className="bg-ambar w-full px-4 py-3 rounded-lg disabled:opacity-50" onClick={() => decidir('aceitar')}>{ocupado ? 'Processando…' : `Aceitar · ${dinheiro(Number(s.subtotal) + Number(cotacao?.taxa || 0))}`}</button>
    <label className="block text-sm">Motivo da recusa<textarea value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)} className="block w-full border border-borda p-3 mt-2" /></label>
    <button disabled={!permitido || ocupado || motivo.trim().length < 3} className="border border-borda w-full px-4 py-3 rounded-lg disabled:opacity-50" onClick={() => decidir('recusar')}>Recusar solicitação</button>
  </div>
}

export default function SolicitacoesMobile() {
  const [lista, setLista] = useState([])
  const [selecionada, setSelecionada] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [revisao, setRevisao] = useState(0)
  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const { data, error } = await supabase.from('solicitacoes_mobile').select('*').eq('status','aguardando').order('criado_em').order('id').limit(100)
        if (error) throw error
        if (ativo) { setLista(data || []); setErro('') }
      } catch (error) { if (ativo) setErro(mensagemPortal(error)) }
      finally { if (ativo) setCarregando(false) }
    }
    carregar()
    const timer = setInterval(carregar, 15000)
    return () => { ativo = false; clearInterval(timer) }
  }, [revisao])
  return <>
    <PageHeader titulo="Pedidos do celular" descricao="Solicitações aguardando confirmação da unidade." icone="sacola" acoesSecundarias={<><a href="/pedir" target="_blank" rel="noreferrer" className="text-sm underline">Portal do cliente</a><button className="border border-borda px-4 py-2 rounded-lg" onClick={() => setRevisao(r => r + 1)}>Atualizar</button></>} />
    {erro && <p role="alert" className="text-brasa mb-4">{erro}</p>}
    {carregando ? <p role="status">Carregando solicitações…</p> : lista.length === 0 ? <div className="rounded-xl border border-borda bg-branco p-8"><h2 className="text-xl">Nenhum pedido aguardando</h2><p className="text-fumaca mt-2">As solicitações recebidas pelo portal aparecerão aqui.</p></div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{lista.map(s => <article key={s.id} className="bg-branco border border-borda rounded-xl p-5"><div className="flex justify-between gap-3"><strong>#{codigoPedido(s.id)}</strong><span className="text-xs text-fumaca">{new Date(s.criado_em).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span></div><h2 className="text-lg mt-3">{s.dados.nome}</h2><p className="text-sm text-fumaca">{s.dados.tipo_atendimento === 'delivery' ? 'Entrega · frete a confirmar' : 'Retirada na loja'}</p><p className="mt-3">{dinheiro(s.subtotal)}</p><button className="bg-ambar w-full rounded-lg py-3 mt-4" onClick={() => setSelecionada(s)}>Conferir solicitação</button></article>)}</div>}
    {lista.length === 100 && <p className="mt-4 text-sm text-fumaca">Exibindo as 100 solicitações mais antigas. Atenda a fila para carregar as próximas.</p>}
    <Link to="/pedidos" className="inline-block text-sm text-ambar underline mt-6">Abrir quadro de pedidos confirmados</Link>
    <SidePanel aberto={!!selecionada} onFechar={() => setSelecionada(null)} titulo={selecionada ? `Solicitação #${codigoPedido(selecionada.id)}` : 'Solicitação'}>{selecionada && <Atendimento key={selecionada.id} solicitacao={selecionada} onAtualizar={async () => { setSelecionada(null); setRevisao(r => r + 1) }} />}</SidePanel>
  </>
}
