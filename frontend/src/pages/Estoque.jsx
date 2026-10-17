import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import CadastroInsumo from '../components/CadastroInsumo.jsx'
import { criarRepositorEstoque } from '../lib/reposicaoEstoque.js'
import KPICard from '../components/data-display/KPICard.jsx'

const quantidadeFormatada = valor => Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

export default function Estoque() {
  const { podeOperar } = useAuth()
  const [lojas, setLojas] = useState([])
  const [estoque, setEstoque] = useState([])
  const [filtroLoja, setFiltroLoja] = useState('')
  const [busca, setBusca] = useState('')
  const [somenteAlerta, setSomenteAlerta] = useState(false)
  const [reposicao, setReposicao] = useState({}) // { "lojaId-ingredienteId": valor digitado }
  const [salvandoChave, setSalvandoChave] = useState(null)
  const [mostrarCadastro, setMostrarCadastro] = useState(false)
  const [ingredientes, setIngredientes] = useState([])
  const [novoSaldo, setNovoSaldo] = useState({ ingrediente_id: '', quantidade_disponivel: '0', quantidade_minima: '0' })
  const [vinculando, setVinculando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [pendentes, setPendentes] = useState({})
  const travaVinculo = useRef(false)
  const consultaRef = useRef(0)
  const lojaAtualRef = useRef(filtroLoja)
  lojaAtualRef.current = filtroLoja
  const repositorRef = useRef(null)
  if (!repositorRef.current) repositorRef.current = criarRepositorEstoque(supabase)
  const travaReposicao = useRef(false)

  async function carregarIngredientes() {
    const { data, error } = await supabase.from('ingredientes').select('id, nome, unidade_medida').eq('ativo', true).order('nome')
    if (error) setErro(error.message)
    else setIngredientes(data || [])
  }

  async function vincular(e) {
    e.preventDefault()
    if (travaVinculo.current || !filtroLoja || !novoSaldo.ingrediente_id) return
    const quantidade = Number(novoSaldo.quantidade_disponivel)
    const minimo = Number(novoSaldo.quantidade_minima)
    if (![quantidade, minimo].every((n) => Number.isFinite(n) && n >= 0)) return
    travaVinculo.current = true
    setVinculando(true)
    setErro('')
    try {
      const { error } = await supabase.from('estoque_lojas').insert({
        loja_id: filtroLoja, ingrediente_id: novoSaldo.ingrediente_id,
        quantidade_disponivel: quantidade, quantidade_minima: minimo,
      })
      if (error) throw error
      setNovoSaldo({ ingrediente_id: '', quantidade_disponivel: '0', quantidade_minima: '0' })
      await carregarEstoque(filtroLoja)
    } catch (error) {
      setErro('Não foi possível vincular o insumo à unidade: ' + error.message)
    } finally {
      travaVinculo.current = false
      setVinculando(false)
    }
  }

  async function carregar() {
    const { data: l } = await supabase.from('lojas').select('*').eq('ativo', true)
    if (l) {
      setLojas(l)
      if (!filtroLoja && l.length > 0) setFiltroLoja(l[0].id)
    }
  }

  async function carregarEstoque(lojaId) {
    if (!lojaId || lojaId !== lojaAtualRef.current) return
    const consulta = ++consultaRef.current
    setCarregando(true)
    const { data, error } = await supabase
      .from('estoque_lojas')
      .select('*, ingredientes(nome, unidade_medida, categoria)')
      .eq('loja_id', lojaId)
      .order('quantidade_disponivel', { ascending: true })
    if (consulta !== consultaRef.current || lojaId !== lojaAtualRef.current) return
    setCarregando(false)
    if (error) setErro(error.message)
    else { setEstoque(data || []); setErro('') }
  }

  useEffect(() => { carregar(); carregarIngredientes() }, [])
  useEffect(() => { setEstoque([]); carregarEstoque(filtroLoja) }, [filtroLoja])

  const chave = (item) => `${item.loja_id}-${item.ingrediente_id}`

  async function repor(item) {
    if (travaReposicao.current) return
    const valor = Number(reposicao[chave(item)])
    travaReposicao.current = true
    setSalvandoChave(chave(item))
    setErro('')
    setMensagem('')
    try {
      await repositorRef.current.enviar(item, valor)
      setReposicao(atuais => ({ ...atuais, [chave(item)]: '' }))
      setMensagem(`Reposição registrada: ${quantidadeFormatada(valor)} ${item.ingredientes?.unidade_medida} de ${item.ingredientes?.nome}.`)
      await carregarEstoque(item.loja_id)
    } catch (error) {
      const pendente = repositorRef.current.temPendente(item)
      setErro(pendente ? 'A resposta não foi confirmada. Clique em Confirmar para recuperar a mesma reposição sem duplicar o estoque.' : 'Não foi possível repor: ' + error.message)
    } finally {
      setPendentes(atuais => ({ ...atuais, [chave(item)]: repositorRef.current.temPendente(item) }))
      setSalvandoChave(null)
      travaReposicao.current = false
    }
  }

  const itensFiltrados = estoque.filter((item) => {
    const abaixoDoMinimo = Number(item.quantidade_disponivel) < Number(item.quantidade_minima)
    if (somenteAlerta && !abaixoDoMinimo) return false
    const termo = busca.trim().toLowerCase()
    if (!termo) return true
    return item.ingredientes?.nome?.toLowerCase().includes(termo)
  })

  const totalAlertas = estoque.filter((i) => Number(i.quantidade_disponivel) < Number(i.quantidade_minima)).length

  return (
    <div>
      <PageHeader titulo="Estoque" descricao="Insumos e saldos por unidade, ligados às fichas técnicas." acaoPrincipal={podeOperar('estoque','criar') && <Button onClick={() => setMostrarCadastro(!mostrarCadastro)}>{mostrarCadastro ? 'Fechar cadastro' : '+ Cadastrar insumo'}</Button>} />

      {mostrarCadastro && <CadastroInsumo onSalvo={carregarIngredientes} />}
      {erro && <p role="alert" className="text-brasa mb-4">{erro}</p>}
      {mensagem && <p role="status" className="text-oliva bg-oliva/5 border border-oliva/30 rounded-lg p-3 mb-4">{mensagem}</p>}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <KPICard titulo="Insumos nesta unidade" valor={estoque.length} />
        <KPICard titulo="Abaixo do mínimo" valor={totalAlertas} />
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select aria-label="Unidade do estoque" disabled={vinculando} value={filtroLoja} onChange={(e) => { setFiltroLoja(e.target.value); setNovoSaldo({ ingrediente_id: '', quantidade_disponivel: '0', quantidade_minima: '0' }) }}
          className="px-3 py-2 border border-superficie2/40 text-sm">
          {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        <input
          placeholder="Buscar ingrediente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="px-3 py-2 border border-superficie2/40 text-sm flex-1 min-w-[200px]"
        />
        <button
          onClick={() => setSomenteAlerta(!somenteAlerta)}
          className={`px-3 py-2 text-sm ${somenteAlerta ? 'bg-brasa text-osso' : 'bg-white border border-superficie2/30'}`}
        >
          ⚠️ Só abaixo do mínimo {totalAlertas > 0 && `(${totalAlertas})`}
        </button>
      </div>

      {mostrarCadastro && <form onSubmit={vincular} className="bg-branco border border-borda p-5 mb-5">
        <h2 className="text-xl mb-3">Vincular insumo à unidade selecionada</h2>
        <fieldset disabled={vinculando} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm">Insumo
            <select required value={novoSaldo.ingrediente_id} onChange={(e) => setNovoSaldo({ ...novoSaldo, ingrediente_id: e.target.value })} className="block border border-borda p-2 w-full">
              <option value="">Selecione...</option>
              {ingredientes.filter((i) => !estoque.some((s) => s.ingrediente_id === i.id)).map((i) => <option key={i.id} value={i.id}>{i.nome} ({i.unidade_medida})</option>)}
            </select>
          </label>
          <label className="text-sm">Saldo inicial (g/ml/un)
            <input required type="number" min="0" step="0.001" value={novoSaldo.quantidade_disponivel} onChange={(e) => setNovoSaldo({ ...novoSaldo, quantidade_disponivel: e.target.value })} className="block border border-borda p-2 w-full" />
          </label>
          <label className="text-sm">Estoque mínimo (g/ml/un)
            <input required type="number" min="0" step="0.001" value={novoSaldo.quantidade_minima} onChange={(e) => setNovoSaldo({ ...novoSaldo, quantidade_minima: e.target.value })} className="block border border-borda p-2 w-full" />
          </label>
          <Button disabled={!filtroLoja}>{vinculando ? 'Salvando...' : 'Vincular à unidade'}</Button>
        </fieldset>
      </form>}

      {carregando && <p role="status" className="text-sm text-fumaca mb-3">Atualizando saldos…</p>}
      <div className="overflow-x-auto rounded-xl border border-borda"><table className="w-full min-w-[640px] text-sm bg-white">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-fumaca">
            <th className="py-2">Ingrediente</th>
            <th className="py-2">Disponível</th>
            <th className="py-2">Mínimo</th>
            <th className="py-2">Status</th>
            <th className="py-2">Repor</th>
          </tr>
        </thead>
        <tbody>
          {itensFiltrados.map((item) => {
            const abaixo = Number(item.quantidade_disponivel) < Number(item.quantidade_minima)
            return (
              <tr key={chave(item)} className={abaixo ? 'bg-brasa/5' : ''}>
                <td className="py-2">
                  {item.ingredientes?.nome}
                  <span className="text-fumaca text-xs"> ({item.ingredientes?.unidade_medida})</span>
                </td>
                <td className={`py-2 font-medium ${abaixo ? 'text-brasa' : ''}`}>
                  {quantidadeFormatada(item.quantidade_disponivel)}
                </td>
                <td className="py-2 text-fumaca">{quantidadeFormatada(item.quantidade_minima)}</td>
                <td className="py-2">
                  {abaixo ? (
                    <span className="text-xs text-brasa font-medium">⚠️ Repor</span>
                  ) : (
                    <span className="text-xs text-oliva">OK</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      disabled={!podeOperar('estoque','editar')}
                      min="0.001" step="0.001" aria-label={`Quantidade para repor ${item.ingredientes?.nome}`}
                      readOnly={pendentes[chave(item)] || salvandoChave === chave(item)}
                      placeholder="qtd"
                      value={reposicao[chave(item)] || ''}
                      onChange={(e) => { const valor = e.target.value; setReposicao(atuais => ({ ...atuais, [chave(item)]: valor })) }}
                      className="w-20 px-2 py-1 border border-superficie2/40 text-xs"
                    />
                    <button
                      onClick={() => repor(item)}
                      disabled={!podeOperar('estoque','editar') || salvandoChave !== null}
                      aria-label={`${pendentes[chave(item)] ? 'Confirmar reposição de' : 'Repor'} ${item.ingredientes?.nome}`}
                      className="px-3 py-2 rounded-lg bg-ambar text-carvao text-xs hover:bg-carvao hover:text-osso transition-colors"
                    >
                      {salvandoChave === chave(item) ? 'Salvando…' : pendentes[chave(item)] ? 'Confirmar' : 'Repor'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table></div>
      {!carregando && itensFiltrados.length === 0 && <p className="text-center p-8 text-sm text-fumaca">Nenhum insumo encontrado. Confira os filtros ou vincule insumos a esta unidade.</p>}
    </div>
  )
}
