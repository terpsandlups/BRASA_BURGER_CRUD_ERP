import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import CadastroInsumo from '../components/CadastroInsumo.jsx'

export default function Estoque() {
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
  const travaVinculo = useRef(false)
  const consultaRef = useRef(0)

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
    if (!lojaId) return
    const consulta = ++consultaRef.current
    setEstoque([])
    const { data, error } = await supabase
      .from('estoque_lojas')
      .select('*, ingredientes(nome, unidade_medida, categoria)')
      .eq('loja_id', lojaId)
      .order('quantidade_disponivel', { ascending: true })
    if (consulta !== consultaRef.current) return
    if (error) setErro(error.message)
    else setEstoque(data || [])
  }

  useEffect(() => { carregar(); carregarIngredientes() }, [])
  useEffect(() => { carregarEstoque(filtroLoja) }, [filtroLoja])

  const chave = (item) => `${item.loja_id}-${item.ingrediente_id}`

  async function repor(item) {
    const valor = Number(reposicao[chave(item)])
    if (!valor || valor <= 0) return
    setSalvandoChave(chave(item))
    const { error } = await supabase
      .from('estoque_lojas')
      .update({ quantidade_disponivel: Number(item.quantidade_disponivel) + valor })
      .eq('loja_id', item.loja_id)
      .eq('ingrediente_id', item.ingrediente_id)
    setSalvandoChave(null)
    if (error) {
      alert('Não foi possível repor: ' + error.message)
      return
    }
    setReposicao({ ...reposicao, [chave(item)]: '' })
    carregarEstoque(filtroLoja)
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
      <PageHeader titulo="Estoque" descricao="Insumos e saldos por unidade, ligados às fichas técnicas." acaoPrincipal={<Button onClick={() => setMostrarCadastro(!mostrarCadastro)}>{mostrarCadastro ? 'Fechar cadastro' : '+ Cadastrar insumo'}</Button>} />

      {mostrarCadastro && <CadastroInsumo onSalvo={carregarIngredientes} />}
      {erro && <p role="alert" className="text-brasa mb-4">{erro}</p>}

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

      <div className="overflow-x-auto"><table className="w-full text-sm bg-white">
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
                  {Number(item.quantidade_disponivel).toFixed(0)}
                </td>
                <td className="py-2 text-fumaca">{Number(item.quantidade_minima).toFixed(0)}</td>
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
                      placeholder="qtd"
                      value={reposicao[chave(item)] || ''}
                      onChange={(e) => setReposicao({ ...reposicao, [chave(item)]: e.target.value })}
                      className="w-20 px-2 py-1 border border-superficie2/40 text-xs"
                    />
                    <button
                      onClick={() => repor(item)}
                      disabled={salvandoChave === chave(item)}
                      className="px-2.5 py-1 bg-ambar text-carvao text-xs hover:bg-carvao hover:text-osso transition-colors"
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table></div>
    </div>
  )
}
