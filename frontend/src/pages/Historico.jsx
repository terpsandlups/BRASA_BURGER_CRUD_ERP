import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatarCPF } from '../lib/format.js'
import { interpretarBuscaPedido } from '../lib/buscaPedido.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import SidePanel from '../components/layout/SidePanel.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { SkeletonLinhas } from '../components/ui/Skeleton.jsx'

const STATUS_LABEL = {
  recebido: 'Recebido', em_preparo: 'Em preparo', pronto: 'Pronto',
  saiu_entrega: 'Em entrega', entregue: 'Entregue', cancelado: 'Cancelado',
}
const PAGAMENTO_LABEL = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro' }

const POR_PAGINA = 25

const FILTROS_VAZIO = {
  dataInicio: '', dataFim: '', lojaId: 'todas', busca: '',
  status: 'todos', formaPagamento: 'todas', tipoAtendimento: 'todos',
  canalVenda: 'todos',
}

export default function Historico() {
  const [lojas, setLojas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_VAZIO)
  const [erro, setErro] = useState('')
  const consultaRef = useRef(0)

  useEffect(() => {
    supabase.from('lojas').select('*').eq('ativo', true).then(({ data }) => data && setLojas(data))
  }, [])

  async function buscar() {
    const consulta = ++consultaRef.current
    setCarregando(true)
    setErro('')
    try {
    if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) throw new Error('A data inicial deve ser anterior ou igual à final.')
    const busca = interpretarBuscaPedido(filtros.busca)
    if (busca.tipo === 'id_incompleto') throw new Error('Use o identificador completo do pedido (UUID), o CPF completo ou o nome do cliente.')
    const relacaoCliente = busca.tipo === 'nome' ? 'clientes!inner(nome)' : 'clientes(nome)'
    let query = supabase
      .from('pedidos')
      .select(`*, lojas(nome), ${relacaoCliente}, itens_pedido(*, produtos(nome), itens_pedido_adicionais(*, adicionais(nome)))`, { count: 'exact' })
      .order('criado_em', { ascending: false })
      .order('id', { ascending: false })

    if (filtros.dataInicio) query = query.gte('criado_em', `${filtros.dataInicio}T00:00:00-03:00`)
    if (filtros.dataFim) {
      const fimExclusivo = new Date(`${filtros.dataFim}T00:00:00-03:00`)
      fimExclusivo.setUTCDate(fimExclusivo.getUTCDate() + 1)
      query = query.lt('criado_em', fimExclusivo.toISOString())
    }
    if (filtros.lojaId !== 'todas') query = query.eq('loja_id', filtros.lojaId)
    if (filtros.status !== 'todos') query = query.eq('status', filtros.status)
    if (filtros.formaPagamento !== 'todas') query = query.eq('forma_pagamento', filtros.formaPagamento)
    if (filtros.tipoAtendimento !== 'todos') query = query.eq('tipo_atendimento', filtros.tipoAtendimento)
    if (filtros.canalVenda !== 'todos') query = query.eq('canal_venda', filtros.canalVenda)

    if (busca.tipo === 'id') query = query.eq('id', busca.valor)
    if (busca.tipo === 'cpf') query = query.eq('cliente_cpf', busca.valor)
    if (busca.tipo === 'nome') query = query.ilike('clientes.nome', `%${busca.valor}%`)

    const de = pagina * POR_PAGINA
    const ate = de + POR_PAGINA - 1
    const { data, count, error } = await query.range(de, ate)
    if (error) throw error
    if (consulta !== consultaRef.current) return

    setPedidos(data || [])
    setTotalRegistros(count || 0)
    } catch (error) {
      if (consulta !== consultaRef.current) return
      setPedidos([])
      setTotalRegistros(0)
      setErro('Não foi possível consultar o histórico: ' + error.message)
    } finally {
      if (consulta === consultaRef.current) setCarregando(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(buscar, 250)
    return () => { clearTimeout(timer); consultaRef.current += 1 }
  }, [filtros, pagina])

  function atualizarFiltro(campo, valor) {
    setPagina(0)
    setFiltros(atuais => ({ ...atuais, [campo]: valor }))
  }

  const pedidosExibidos = pedidos

  const totalPaginas = Math.ceil(totalRegistros / POR_PAGINA)

  return (
    <div>
      <PageHeader titulo="Histórico de Pedidos" descricao="Consulte, filtre e recupere qualquer pedido já realizado." />
      {erro && <p role="alert" className="text-brasa mb-4">{erro}</p>}

      {/* Filtros */}
      <div className="bg-white border border-superficie2/20 p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[11px] uppercase text-fumaca">De</label>
          <input type="date" value={filtros.dataInicio}
            onChange={(e) => atualizarFiltro('dataInicio', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm" />
        </div>
        <div>
          <label className="text-[11px] uppercase text-fumaca">Até</label>
          <input type="date" value={filtros.dataFim}
            onChange={(e) => atualizarFiltro('dataFim', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm" />
        </div>
        <div>
          <label className="text-[11px] uppercase text-fumaca">Unidade</label>
          <select value={filtros.lojaId} onChange={(e) => atualizarFiltro('lojaId', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm">
            <option value="todas">Todas</option>
            {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase text-fumaca">Status</label>
          <select value={filtros.status} onChange={(e) => atualizarFiltro('status', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm">
            <option value="todos">Todos</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase text-fumaca">Pagamento</label>
          <select value={filtros.formaPagamento} onChange={(e) => atualizarFiltro('formaPagamento', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm">
            <option value="todas">Todas</option>
            {Object.entries(PAGAMENTO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase text-fumaca">Atendimento</label>
          <select value={filtros.tipoAtendimento} onChange={(e) => atualizarFiltro('tipoAtendimento', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm">
            <option value="todos">Todos</option>
            <option value="presencial">Presencial</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[11px] uppercase text-fumaca">Buscar (ID completo do pedido, CPF ou nome)</label>
          <input value={filtros.busca} onChange={(e) => atualizarFiltro('busca', e.target.value)}
            placeholder="Cole o ID completo, informe CPF ou nome"
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm" />
        </div>
        <div>
          <label className="text-[11px] uppercase text-fumaca">Canal de venda</label>
          <select value={filtros.canalVenda} onChange={e => atualizarFiltro('canalVenda', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm">
            <option value="todos">Todos</option>
            <option value="proprio">Próprio</option>
            <option value="ifood">iFood</option>
            <option value="rappi">Rappi</option>
          </select>
        </div>
        <div className="col-span-2 md:col-span-4 flex justify-end">
          <button onClick={() => { setFiltros(FILTROS_VAZIO); setPagina(0) }}
            className="text-xs text-ambar">Limpar filtros</button>
        </div>
      </div>

      {/* Resultados */}
      {carregando ? (
        <SkeletonLinhas linhas={5} />
      ) : pedidosExibidos.length === 0 ? (
        <EmptyState titulo="Nenhum pedido encontrado" descricao="Ajuste os filtros e tente novamente." />
      ) : (
        <div className="bg-white border border-superficie2/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-fumaca border-b border-superficie2/20">
                <th className="py-2 px-3">Pedido</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Cliente</th>
                <th className="py-2 px-3">Unidade</th>
                <th className="py-2 px-3">Atendimento / Canal</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Pagamento</th>
                <th className="py-2 px-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidosExibidos.map((p) => (
                  <tr key={p.id}
                    onClick={() => setExpandido(p.id)}
                    className="border-b border-superficie2/10 cursor-pointer hover:bg-osso/60">
                    <td className="py-2 px-3 font-medium">#{p.id}</td>
                    <td className="py-2 px-3">{new Date(p.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                    <td className="py-2 px-3">{p.clientes?.nome || formatarCPF(p.cliente_cpf)}</td>
                    <td className="py-2 px-3">{p.lojas?.nome}</td>
                    <td className="py-2 px-3 capitalize">{p.tipo_atendimento} / {{ proprio: 'Próprio', ifood: 'iFood', rappi: 'Rappi' }[p.canal_venda] || '—'}</td>
                    <td className="py-2 px-3">
                      <span className={p.status === 'cancelado' ? 'text-brasa' : ''}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="py-2 px-3">{PAGAMENTO_LABEL[p.forma_pagamento] || '—'}</td>
                    <td className="py-2 px-3 font-medium">R$ {Number(p.valor_total).toFixed(2)}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SidePanel
        aberto={pedidosExibidos.some(p => p.id === expandido)}
        onFechar={() => setExpandido(null)}
        titulo={expandido ? `Pedido #${expandido}` : ''}
      >
        {(() => {
          const p = pedidosExibidos.find((ped) => ped.id === expandido)
          if (!p) return null
          return (
            <div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                <div>
                  <p className="text-xs uppercase text-fumaca">Cliente</p>
                  <p>{p.clientes?.nome || formatarCPF(p.cliente_cpf)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-fumaca">Unidade</p>
                  <p>{p.lojas?.nome}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-fumaca">Status</p>
                  <p className={p.status === 'cancelado' ? 'text-brasa' : ''}>{STATUS_LABEL[p.status]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-fumaca">Pagamento</p>
                  <p>{PAGAMENTO_LABEL[p.forma_pagamento] || '—'}</p>
                </div>
              </div>

              <p className="text-xs uppercase text-fumaca mb-2">Itens do pedido</p>
              <ul className="space-y-2 mb-4">
                {p.itens_pedido?.map((item) => (
                  <li key={item.id} className="text-sm flex justify-between border-b border-borda pb-2">
                    <span>
                      {item.quantidade}x {item.produtos?.nome}
                      {item.itens_pedido_adicionais?.length > 0 && (
                        <span className="text-fumaca text-xs">
                          {' '}(+ {item.itens_pedido_adicionais.map((a) => a.adicionais?.nome).join(', ')})
                        </span>
                      )}
                    </span>
                    <span>R$ {Number(item.preco_unitario * item.quantidade).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="text-sm font-medium flex justify-between border-t border-borda pt-3">
                <span>Total do pedido</span>
                <span>R$ {Number(p.valor_total).toFixed(2)}</span>
              </div>
            </div>
          )
        })()}
      </SidePanel>


      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-fumaca">
            Página {pagina + 1} de {totalPaginas} · {totalRegistros} pedidos
          </span>
          <div className="flex gap-2">
            <button disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}
              className="px-3 py-1.5 border border-superficie2/40 disabled:opacity-30">Anterior</button>
            <button disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(pagina + 1)}
              className="px-3 py-1.5 border border-superficie2/40 disabled:opacity-30">Próxima</button>
          </div>
        </div>
      )}
    </div>
  )
}
