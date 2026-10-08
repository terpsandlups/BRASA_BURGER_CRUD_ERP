import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient.js'
import { calcularDashboard, carregarTodasPaginas, diaBrasil } from '../lib/dashboard.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import KPICard from '../components/data-display/KPICard.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { SkeletonLinhas } from '../components/ui/Skeleton.jsx'

const moeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (v) => v == null ? '—' : `${v.toFixed(2).replace('.', ',')}%`
const inicioMes = () => `${diaBrasil(new Date()).slice(0, 7)}-01`

export default function Analytics() {
  const [inicio, setInicio] = useState(inicioMes)
  const [fim, setFim] = useState(() => diaBrasil(new Date()))
  const [loja, setLoja] = useState('todas')
  const [canal, setCanal] = useState('todos')
  const [atendimento, setAtendimento] = useState('todos')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [pedidos, setPedidos] = useState([])
  const [custos, setCustos] = useState([])
  const [lojas, setLojas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [revisao, setRevisao] = useState(0)
  const [atualizado, setAtualizado] = useState(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      if (!inicio || !fim || inicio > fim) {
        setErro('Escolha um período válido: a data inicial deve ser anterior ou igual à final.')
        setCarregando(false)
        return
      }
      setCarregando(true)
      setErro('')
      try {
        const limiteFim = new Date(`${fim}T00:00:00-03:00`)
        limiteFim.setUTCDate(limiteFim.getUTCDate() + 1)
        const [vendas, fichas, unidades] = await Promise.all([
          carregarTodasPaginas(() => supabase.from('pedidos')
            .select('id, loja_id, criado_em, valor_total, taxa_entrega, canal_venda, tipo_atendimento, status, lojas(nome), itens_pedido(produto_sku, variacao_id, quantidade, preco_unitario, produtos(nome))')
            .gte('criado_em', `${inicio}T00:00:00-03:00`).lt('criado_em', limiteFim.toISOString())
            .neq('status', 'cancelado').order('criado_em').order('id')),
          carregarTodasPaginas(() => supabase.from('vw_custo_variacao').select('variacao_id, custo_ficha_tecnica').order('variacao_id')),
          supabase.from('lojas').select('id, nome').eq('ativo', true).order('nome'),
        ])
        if (unidades.error) throw unidades.error
        if (!ativo) return
        setPedidos(vendas)
        setCustos(fichas)
        setLojas(unidades.data || [])
        setAtualizado(new Date())
      } catch (error) {
        if (ativo) setErro('Não foi possível carregar as análises: ' + error.message)
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [inicio, fim, revisao])

  const recorte = useMemo(() => pedidos.filter((p) =>
    (loja === 'todas' || p.loja_id === loja) &&
    (canal === 'todos' || p.canal_venda === canal) &&
    (atendimento === 'todos' || p.tipo_atendimento === atendimento)
  ), [pedidos, loja, canal, atendimento])
  const metrica = useMemo(() => calcularDashboard(recorte, custos), [recorte, custos])
  const unidades = useMemo(() => lojas.filter((l) => loja === 'todas' || l.id === loja).map((l) => ({
    ...l, ...calcularDashboard(recorte.filter((p) => p.loja_id === l.id), custos),
  })), [lojas, loja, recorte, custos])
  const produtos = metrica.produtos.filter((p) => `${p.nome} ${p.sku}`.toLowerCase().includes(buscaProduto.toLowerCase()))

  function exportarProdutos() {
    const celula = (v) => `"${String(v).replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`
    const linhas = [['SKU', 'Produto', 'Quantidade', 'Receita dos itens (R$)'], ...produtos.map((p) => [p.sku, p.nome, p.quantidade, p.receita.toFixed(2).replace('.', ',')])]
    const blob = new Blob(['\uFEFF' + linhas.map((linha) => linha.map(celula).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `produtos-${inicio}-${fim}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const campo = 'block w-full border border-borda bg-branco p-2 mt-1 text-sm'
  return <div>
    <PageHeader titulo="Portal de Analytics" descricao="Explore vendas, produtos e desempenho das unidades." acaoPrincipal={<Button onClick={() => setRevisao((v) => v + 1)} disabled={carregando}>Atualizar análises</Button>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
      <label className="text-xs">Data inicial<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} /></label>
      <label className="text-xs">Data final<input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={campo} /></label>
      <label className="text-xs">Unidade<select value={loja} onChange={(e) => setLoja(e.target.value)} className={campo}><option value="todas">Todas as unidades</option>{lojas.map((l) => <option value={l.id} key={l.id}>{l.nome}</option>)}</select></label>
      <label className="text-xs">Canal de venda<select value={canal} onChange={(e) => setCanal(e.target.value)} className={campo}><option value="todos">Todos</option><option value="proprio">Próprio</option><option value="ifood">iFood</option><option value="rappi">Rappi</option></select></label>
      <label className="text-xs">Atendimento<select value={atendimento} onChange={(e) => setAtendimento(e.target.value)} className={campo}><option value="todos">Todos</option><option value="presencial">Presencial</option><option value="delivery">Delivery</option></select></label>
    </div>
    {carregando ? <SkeletonLinhas linhas={8} /> : erro ? <div role="alert"><EmptyState titulo="Análise indisponível" descricao={erro} /></div> : <>
      <p className="text-xs text-fumaca mb-4">Período no horário de São Paulo. Pedidos não cancelados, incluindo os em andamento. Atualizado às {atualizado?.toLocaleTimeString('pt-BR')}.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 mb-5">
        <KPICard titulo="Faturamento" valor={moeda(metrica.faturamentoTotal)} />
        <KPICard titulo="Frete cobrado" valor={moeda(metrica.receitaFrete)} contexto="Incluído no faturamento" />
        <KPICard titulo="Pedidos" valor={metrica.pedidosTotal} />
        <KPICard titulo="Ticket médio" valor={metrica.ticketMedio == null ? '—' : moeda(metrica.ticketMedio)} />
        <KPICard titulo="CMV estimado" valor={percentual(metrica.cmvPercentual)} />
        <KPICard titulo="Margem bruta estimada" valor={percentual(metrica.margemPercentual)} />
      </div>
      <p className="text-xs text-fumaca mb-5">Faturamento: {moeda(metrica.faturamentoItens)} em itens/adicionais e {moeda(metrica.receitaFrete)} em frete próprio. Custos calculados pela ficha técnica atual; cobertura de {percentual(metrica.coberturaCusto)} da receita dos itens-base. Adicionais, descontos e taxas não entram no CMV e na margem aqui apresentados. A margem não é lucro líquido.</p>
      {!recorte.length ? <EmptyState titulo="Nenhuma venda no recorte" descricao="Ajuste as datas, a unidade ou os canais." /> : <>
        <section className="bg-branco border border-borda p-5 mb-5">
          <h2 className="text-xl mb-4">Receita por dia com vendas</h2>
          <ResponsiveContainer width="100%" height={230}><BarChart data={metrica.evolucao}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dia" /><YAxis /><Tooltip formatter={(v) => moeda(v)} /><Bar dataKey="valor" name="Faturamento" fill="#C98A3A" /></BarChart></ResponsiveContainer>
        </section>
        <section className="bg-branco border border-borda p-5 mb-5 overflow-x-auto">
          <h2 className="text-xl mb-3">Comparação de unidades</h2>
          <table className="w-full text-sm text-left"><thead><tr><th className="p-2">Unidade</th><th>Pedidos</th><th>Faturamento</th><th>Ticket médio</th><th>CMV estimado</th></tr></thead><tbody>{unidades.map((u) => <tr key={u.id}><td className="p-2">{u.nome}</td><td>{u.pedidosTotal}</td><td>{moeda(u.faturamentoTotal)}</td><td>{u.ticketMedio == null ? '—' : moeda(u.ticketMedio)}</td><td>{percentual(u.cmvPercentual)}</td></tr>)}</tbody></table>
        </section>
        <section className="bg-branco border border-borda p-5 overflow-x-auto">
          <div className="flex flex-wrap justify-between gap-3 mb-3"><h2 className="text-xl">Produtos — ranking por receita</h2><Button variant="secondary" onClick={exportarProdutos}>Exportar CSV</Button></div>
          <label className="text-xs">Buscar no ranking<input value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} placeholder="Nome ou SKU" className={campo} /></label>
          <table className="w-full text-sm text-left mt-4"><thead><tr><th className="p-2">Produto</th><th>SKU</th><th>Quantidade</th><th>Receita dos itens-base</th></tr></thead><tbody>{produtos.map((p) => <tr key={p.sku}><td className="p-2">{p.nome}</td><td>{p.sku}</td><td>{p.quantidade}</td><td>{moeda(p.receita)}</td></tr>)}</tbody></table>
          {!produtos.length && <p className="text-sm py-4">Nenhum produto encontrado no ranking.</p>}
        </section>
      </>}
    </>}
  </div>
}
