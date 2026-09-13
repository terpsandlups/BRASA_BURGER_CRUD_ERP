import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatarCPF } from '../lib/format.js'
import PageHeader from '../components/layout/PageHeader.jsx'
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
}

export default function Historico() {
  const [lojas, setLojas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_VAZIO)

  useEffect(() => {
    supabase.from('lojas').select('*').eq('ativo', true).then(({ data }) => data && setLojas(data))
  }, [])

  async function buscar() {
    setCarregando(true)
    let query = supabase
      .from('pedidos')
      .select('*, lojas(nome), clientes(nome), itens_pedido(*, produtos(nome), itens_pedido_adicionais(*, adicionais(nome)))', { count: 'exact' })
      .order('criado_em', { ascending: false })

    if (filtros.dataInicio) query = query.gte('criado_em', `${filtros.dataInicio}T00:00:00`)
    if (filtros.dataFim) query = query.lte('criado_em', `${filtros.dataFim}T23:59:59`)
    if (filtros.lojaId !== 'todas') query = query.eq('loja_id', filtros.lojaId)
    if (filtros.status !== 'todos') query = query.eq('status', filtros.status)
    if (filtros.formaPagamento !== 'todas') query = query.eq('forma_pagamento', filtros.formaPagamento)
    if (filtros.tipoAtendimento !== 'todos') query = query.eq('tipo_atendimento', filtros.tipoAtendimento)

    const termo = filtros.busca.trim()
    if (termo) {
      const digitos = termo.replace(/\D/g, '')
      if (/^\d+$/.test(termo) && termo.length < 8) {
        // parece número de pedido
        query = query.eq('id', termo)
      } else if (digitos.length === 11) {
        query = query.eq('cliente_cpf', digitos)
      }
      // busca por nome não filtra no servidor (join não é filtrável direto) — feita client-side abaixo
    }

    const de = pagina * POR_PAGINA
    const ate = de + POR_PAGINA - 1
    const { data, count } = await query.range(de, ate)

    setPedidos(data || [])
    setTotalRegistros(count || 0)
    setCarregando(false)
  }

  useEffect(() => { buscar() }, [filtros, pagina])

  function atualizarFiltro(campo, valor) {
    setPagina(0)
    setFiltros({ ...filtros, [campo]: valor })
  }

  // busca por nome do cliente é feita client-side (join não é filtrável direto)
  const termoNome = filtros.busca.trim().toLowerCase()
  const pedidosExibidos = /^\d+$/.test(termoNome) || termoNome === ''
    ? pedidos
    : pedidos.filter((p) => p.clientes?.nome?.toLowerCase().includes(termoNome))

  const totalPaginas = Math.ceil(totalRegistros / POR_PAGINA)

  return (
    <div>
      <PageHeader titulo="Histórico de Pedidos" descricao="Consulte, filtre e recupere qualquer pedido já realizado." />

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
          <label className="text-[11px] uppercase text-fumaca">Canal</label>
          <select value={filtros.tipoAtendimento} onChange={(e) => atualizarFiltro('tipoAtendimento', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm">
            <option value="todos">Todos</option>
            <option value="presencial">Presencial</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[11px] uppercase text-fumaca">Buscar (nº pedido, CPF ou nome do cliente)</label>
          <input value={filtros.busca} onChange={(e) => atualizarFiltro('busca', e.target.value)}
            placeholder="Ex: 1042, 123.456.789-00 ou João"
            className="w-full mt-1 px-2 py-1.5 border border-superficie2/40 text-sm" />
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
                <th className="py-2 px-3">Canal</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Pagamento</th>
                <th className="py-2 px-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidosExibidos.map((p) => (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                    className="border-b border-superficie2/10 cursor-pointer hover:bg-osso/60">
                    <td className="py-2 px-3 font-medium">#{p.id}</td>
                    <td className="py-2 px-3">{new Date(p.criado_em).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-3">{p.clientes?.nome || formatarCPF(p.cliente_cpf)}</td>
                    <td className="py-2 px-3">{p.lojas?.nome}</td>
                    <td className="py-2 px-3 capitalize">{p.tipo_atendimento}</td>
                    <td className="py-2 px-3">
                      <span className={p.status === 'cancelado' ? 'text-brasa' : ''}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="py-2 px-3">{PAGAMENTO_LABEL[p.forma_pagamento] || '—'}</td>
                    <td className="py-2 px-3 font-medium">R$ {Number(p.valor_total).toFixed(2)}</td>
                  </tr>
                  {expandido === p.id && (
                    <tr className="bg-osso/40">
                      <td colSpan={8} className="p-4">
                        <p className="text-xs uppercase text-fumaca mb-2">Itens do pedido</p>
                        <ul className="space-y-1 mb-3">
                          {p.itens_pedido?.map((item) => (
                            <li key={item.id} className="text-sm flex justify-between">
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
                        <div className="text-sm font-medium flex justify-between border-t border-superficie2/20 pt-2">
                          <span>Total do pedido</span>
                          <span>R$ {Number(p.valor_total).toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
