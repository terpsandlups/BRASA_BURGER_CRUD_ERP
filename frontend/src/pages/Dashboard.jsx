import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabaseClient.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import KPICard from '../components/data-display/KPICard.jsx'
import { SkeletonLinhas } from '../components/ui/Skeleton.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const CORES_CANAL = ['#C98A3A', '#211E1A']

export default function Dashboard() {
  const [lojas, setLojas] = useState([])
  const [lojaFiltro, setLojaFiltro] = useState('todas')
  const [periodo, setPeriodo] = useState(30)
  const [pedidos, setPedidos] = useState([])
  const [custos, setCustos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('lojas').select('*').eq('ativo', true).then(({ data }) => data && setLojas(data))
  }, [])

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const desde = new Date()
      desde.setDate(desde.getDate() - periodo)

      let query = supabase
        .from('pedidos')
        .select('id, valor_total, criado_em, tipo_atendimento, status, loja_id, lojas(nome), itens_pedido(produto_sku, variacao_id, quantidade, preco_unitario, produtos(nome))')
        .gte('criado_em', desde.toISOString())
        .neq('status', 'cancelado')

      if (lojaFiltro !== 'todas') query = query.eq('loja_id', lojaFiltro)

      const [{ data: ped }, { data: cust }] = await Promise.all([
        query,
        supabase.from('vw_custo_variacao').select('variacao_id, custo_ficha_tecnica'),
      ])

      setPedidos(ped || [])
      setCustos(cust || [])
      setLoading(false)
    }
    carregar()
  }, [lojaFiltro, periodo])

  const metrica = useMemo(() => {
    const faturamentoTotal = pedidos.reduce((acc, p) => acc + Number(p.valor_total), 0)
    const pedidosTotal = pedidos.length
    const ticketMedio = pedidosTotal > 0 ? faturamentoTotal / pedidosTotal : 0

    const custoPorVariacao = new Map(custos.map((c) => [c.variacao_id, Number(c.custo_ficha_tecnica)]))
    let custoTotal = 0
    let receitaComFicha = 0
    const produtoAgregado = new Map()

    for (const p of pedidos) {
      for (const item of p.itens_pedido || []) {
        const receitaItem = Number(item.preco_unitario) * item.quantidade
        const custoUnit = custoPorVariacao.get(item.variacao_id)
        if (custoUnit !== undefined) {
          custoTotal += custoUnit * item.quantidade
          receitaComFicha += receitaItem
        }
        const nome = item.produtos?.nome || item.produto_sku
        const atual = produtoAgregado.get(nome) || { nome, quantidade: 0, receita: 0 }
        atual.quantidade += item.quantidade
        atual.receita += receitaItem
        produtoAgregado.set(nome, atual)
      }
    }

    const cmvPercentual = receitaComFicha > 0 ? (custoTotal / receitaComFicha) * 100 : null
    const margemPercentual = cmvPercentual !== null ? 100 - cmvPercentual : null

    // evolução por dia
    const porDia = new Map()
    for (const p of pedidos) {
      const dia = p.criado_em.slice(0, 10)
      porDia.set(dia, (porDia.get(dia) || 0) + Number(p.valor_total))
    }
    const evolucao = Array.from(porDia.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, valor]) => ({ dia: dia.slice(5).split('-').reverse().join('/'), valor }))

    // faturamento por loja
    const porLoja = new Map()
    for (const p of pedidos) {
      const nome = p.lojas?.nome || 'Sem unidade'
      porLoja.set(nome, (porLoja.get(nome) || 0) + Number(p.valor_total))
    }
    const faturamentoPorLoja = Array.from(porLoja.entries()).map(([loja, faturamento]) => ({ loja, faturamento }))

    // canais
    const canais = [
      { nome: 'Presencial', valor: pedidos.filter((p) => p.tipo_atendimento === 'presencial').length },
      { nome: 'Delivery', valor: pedidos.filter((p) => p.tipo_atendimento === 'delivery').length },
    ].filter((c) => c.valor > 0)

    const topProdutos = Array.from(produtoAgregado.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 6)

    return { faturamentoTotal, pedidosTotal, ticketMedio, cmvPercentual, margemPercentual, evolucao, faturamentoPorLoja, canais, topProdutos }
  }, [pedidos, custos])

  return (
    <div>
      <PageHeader
        titulo="Painel Geral"
        descricao="Visão consolidada da rede"
        acaoPrincipal={
          <div className="flex items-center gap-2">
            <select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}
              className="px-3 py-2 border border-borda text-sm bg-branco">
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
            <select value={lojaFiltro} onChange={(e) => setLojaFiltro(e.target.value)}
              className="px-3 py-2 border border-borda text-sm bg-branco">
              <option value="todas">Todas as unidades</option>
              {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
        }
      />

      {loading ? (
        <SkeletonLinhas linhas={6} />
      ) : pedidos.length === 0 ? (
        <EmptyState titulo="Nenhum pedido no período" descricao="Ajuste o período ou a unidade selecionada." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <KPICard titulo="Faturamento" valor={`R$ ${metrica.faturamentoTotal.toFixed(2)}`} />
            <KPICard titulo="Pedidos" valor={metrica.pedidosTotal} />
            <KPICard titulo="Ticket médio" valor={`R$ ${metrica.ticketMedio.toFixed(2)}`} />
            <KPICard titulo="CMV" valor={metrica.cmvPercentual !== null ? `${metrica.cmvPercentual.toFixed(1)}%` : '—'} />
            <KPICard titulo="Margem" valor={metrica.margemPercentual !== null ? `${metrica.margemPercentual.toFixed(1)}%` : '—'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-branco border border-borda p-6">
              <h3 className="font-display text-lg text-texto mb-4">Evolução do faturamento</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={metrica.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D0C4" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, 'Faturamento']} />
                  <Line type="monotone" dataKey="valor" stroke="#C98A3A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-branco border border-borda p-6">
              <h3 className="font-display text-lg text-texto mb-4">Faturamento por unidade</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metrica.faturamentoPorLoja}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D8D0C4" />
                  <XAxis dataKey="loja" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, 'Faturamento']} />
                  <Bar dataKey="faturamento" fill="#C98A3A" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-branco border border-borda p-6">
              <h3 className="font-display text-lg text-texto mb-4">Top produtos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-fumaca border-b border-borda">
                    <th className="pb-2">Produto</th>
                    <th className="pb-2 text-right">Qtd.</th>
                    <th className="pb-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {metrica.topProdutos.map((p) => (
                    <tr key={p.nome} className="border-b border-borda/50 last:border-0">
                      <td className="py-1.5">{p.nome}</td>
                      <td className="py-1.5 text-right">{p.quantidade}</td>
                      <td className="py-1.5 text-right">R$ {p.receita.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-branco border border-borda p-6">
              <h3 className="font-display text-lg text-texto mb-4">Canais</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={metrica.canais} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={80}>
                    {metrica.canais.map((_, i) => <Cell key={i} fill={CORES_CANAL[i % CORES_CANAL.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
