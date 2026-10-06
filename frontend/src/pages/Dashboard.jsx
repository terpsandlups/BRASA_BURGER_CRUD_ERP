import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabaseClient.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import KPICard from '../components/data-display/KPICard.jsx'
import { SkeletonLinhas } from '../components/ui/Skeleton.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Button from '../components/ui/Button.jsx'
import { calcularDashboard, carregarTodasPaginas, intervaloDashboard } from '../lib/dashboard.js'

const CORES_CANAL = ['#C98A3A', '#211E1A', '#2E7D5B', '#766F66']

export default function Dashboard() {
  const [lojas, setLojas] = useState([])
  const [lojaFiltro, setLojaFiltro] = useState('todas')
  const [periodo, setPeriodo] = useState(30)
  const [pedidos, setPedidos] = useState([])
  const [custos, setCustos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    supabase.from('lojas').select('*').eq('ativo', true).then(({ data }) => data && setLojas(data))
  }, [])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setLoading(true)
      setErro('')
      const intervalo = intervaloDashboard(periodo)
      try {
        const [ped, cust] = await Promise.all([
          carregarTodasPaginas(() => {
            let query = supabase
              .from('pedidos')
              .select('id, valor_total, criado_em, canal_venda, status, loja_id, lojas(nome), itens_pedido(produto_sku, variacao_id, quantidade, preco_unitario, produtos(nome))')
              .gte('criado_em', intervalo.inicio)
              .lte('criado_em', intervalo.fim)
              .neq('status', 'cancelado')
              .order('criado_em', { ascending: true })
            if (lojaFiltro !== 'todas') query = query.eq('loja_id', lojaFiltro)
            return query
          }),
          carregarTodasPaginas(() => supabase
            .from('vw_custo_variacao')
            .select('variacao_id, custo_ficha_tecnica')
            .order('variacao_id')),
        ])
        if (!ativo) return
        setPedidos(ped)
        setCustos(cust)
      } catch (e) {
        if (!ativo) return
        setPedidos([])
        setCustos([])
        setErro(e?.message || 'Não foi possível carregar os indicadores.')
      } finally {
        if (ativo) setLoading(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [lojaFiltro, periodo, tentativa])

  const metrica = useMemo(() => {
    const { dias } = intervaloDashboard(periodo)
    return calcularDashboard(pedidos, custos, dias)
  }, [pedidos, custos, periodo])

  return (
    <div>
      <PageHeader
        titulo="Painel Geral"
        descricao="Visão consolidada da rede"
        acaoPrincipal={
          <div className="flex items-center gap-2">
            <select aria-label="Período" value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}
              className="px-3 py-2 border border-borda text-sm bg-branco">
              <option value={1}>Hoje</option>
              <option value={7}>Últimos 7 dias</option>
              <option value={15}>Últimos 15 dias</option>
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
      ) : erro ? (
        <EmptyState
          titulo="Não foi possível carregar o painel"
          descricao={erro}
          acao={<Button variant="secondary" onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</Button>}
        />
      ) : pedidos.length === 0 ? (
        <EmptyState titulo="Nenhum pedido no período" descricao="Ajuste o período ou a unidade selecionada." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <KPICard titulo="Faturamento" valor={`R$ ${metrica.faturamentoTotal.toFixed(2)}`} />
            <KPICard titulo="Pedidos" valor={metrica.pedidosTotal} />
            <KPICard titulo="Ticket médio" valor={metrica.ticketMedio !== null ? `R$ ${metrica.ticketMedio.toFixed(2)}` : '—'} />
            <KPICard titulo="CMV estimado" valor={metrica.cmvPercentual !== null ? `${metrica.cmvPercentual.toFixed(1)}%` : '—'} contexto={metrica.coberturaCusto !== null ? `Cobertura: ${metrica.coberturaCusto.toFixed(0)}% da receita dos itens` : 'Sem itens com custo cadastrado'} />
            <KPICard titulo="Margem bruta estimada" valor={metrica.margemPercentual !== null ? `${metrica.margemPercentual.toFixed(1)}%` : '—'} contexto={metrica.itensSemFicha > 0 ? `${metrica.itensSemFicha} item(ns) sem ficha técnica` : 'Todos os itens têm ficha técnica'} />
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
                  <Line type="monotone" dataKey="valor" stroke="#C98A3A" strokeWidth={2} dot={periodo === 1} />
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
