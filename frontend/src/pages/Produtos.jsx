import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'

const TONS = {
  oliva: 'border-oliva text-oliva',
  ambar: 'border-ambar text-ambar',
  brasa: 'border-brasa text-brasa',
}

function Badge({ children, tone = 'oliva' }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 border mr-1 ${TONS[tone]}`}>
      {children}
    </span>
  )
}

const PRODUTO_VAZIO = {
  sku: '', nome: '', nome_comercial: '', linha: '', categoria_id: '', subcategoria: '', descricao: '',
  permite_adicionais: false, vegano: false, vegetariano: false, contem_lactose: true,
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [variacoes, setVariacoes] = useState([])
  const [custos, setCustos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [ingredientes, setIngredientes] = useState([])
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState([])
  const [adicionais, setAdicionais] = useState([])
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [expandido, setExpandido] = useState(null)

  const [mostrarNovoProduto, setMostrarNovoProduto] = useState(false)
  const [novoProduto, setNovoProduto] = useState(PRODUTO_VAZIO)
  const [salvandoProduto, setSalvandoProduto] = useState(false)

  const [novaVariacaoPara, setNovaVariacaoPara] = useState(null) // sku
  const [formVariacao, setFormVariacao] = useState({ nome_variacao: '', preco_venda: '' })

  const [novoIngredientePara, setNovoIngredientePara] = useState(null) // variacao_id
  const [formIngrediente, setFormIngrediente] = useState({ ingrediente_id: '', peso_quantidade: '' })

  async function carregar() {
    const { data: p } = await supabase.from('produtos').select('*, categorias(nome)').order('sku')
    const { data: v } = await supabase.from('produto_variacoes').select('*')
    const { data: c } = await supabase.from('vw_custo_variacao').select('*')
    const { data: cat } = await supabase.from('categorias').select('*').order('ordem')
    const { data: ing } = await supabase.from('ingredientes').select('*').eq('ativo', true).order('nome')
    const { data: pad } = await supabase.from('produto_adicionais_disponiveis').select('*')
    const { data: ad } = await supabase.from('adicionais').select('*')
    if (p) setProdutos(p)
    if (v) setVariacoes(v)
    if (c) setCustos(c)
    if (cat) setCategorias(cat)
    if (ing) setIngredientes(ing)
    if (pad) setAdicionaisDisponiveis(pad)
    if (ad) setAdicionais(ad)
  }

  useEffect(() => { carregar() }, [])

  const variacoesDoProduto = (sku) => variacoes.filter((v) => v.produto_sku === sku)
  const custoDaVariacao = (variacaoId) => custos.find((c) => c.variacao_id === variacaoId)
  const fichaDaVariacao = (variacaoId) => {
    // usado só para saber se já tem itens de ficha técnica (via custo calculado)
    return custos.some((c) => c.variacao_id === variacaoId)
  }
  const adicionaisDoProduto = (sku) => {
    const ids = adicionaisDisponiveis.filter((a) => a.produto_sku === sku).map((a) => a.adicional_id)
    return adicionais.filter((a) => ids.includes(a.id))
  }
  const produtosFiltrados = produtos.filter(
    (p) => filtroCategoria === 'todas' || p.categorias?.nome === filtroCategoria
  )

  async function salvarNovoProduto(e) {
    e.preventDefault()
    if (!novoProduto.sku || !novoProduto.nome || !novoProduto.categoria_id) {
      alert('Preencha SKU, nome e categoria.')
      return
    }
    setSalvandoProduto(true)
    const { error } = await supabase.from('produtos').insert({
      ...novoProduto,
      sku: novoProduto.sku.toUpperCase().trim(),
    })
    setSalvandoProduto(false)
    if (error) {
      alert('Erro ao criar produto: ' + error.message)
      return
    }
    const skuCriado = novoProduto.sku.toUpperCase().trim()
    setNovoProduto(PRODUTO_VAZIO)
    setMostrarNovoProduto(false)
    await carregar()
    setExpandido(skuCriado)
    setNovaVariacaoPara(skuCriado)
  }

  async function alternarAtivo(produto) {
    const { error } = await supabase.from('produtos').update({ ativo: !produto.ativo }).eq('sku', produto.sku)
    if (error) {
      alert('Erro ao atualizar: ' + error.message)
      return
    }
    carregar()
  }

  async function salvarVariacao(sku) {
    if (!formVariacao.nome_variacao || !formVariacao.preco_venda) {
      alert('Preencha nome da variação e preço.')
      return
    }
    const { error } = await supabase.from('produto_variacoes').insert({
      produto_sku: sku,
      nome_variacao: formVariacao.nome_variacao,
      preco_venda: Number(formVariacao.preco_venda),
      padrao: variacoesDoProduto(sku).length === 0,
    })
    if (error) {
      alert('Erro ao criar variação: ' + error.message)
      return
    }
    setFormVariacao({ nome_variacao: '', preco_venda: '' })
    setNovaVariacaoPara(null)
    carregar()
  }

  async function salvarIngredienteFicha(variacaoId) {
    if (!formIngrediente.ingrediente_id || !formIngrediente.peso_quantidade) {
      alert('Selecione o ingrediente e a quantidade.')
      return
    }
    const { error } = await supabase.from('fichas_tecnicas').insert({
      variacao_id: variacaoId,
      ingrediente_id: formIngrediente.ingrediente_id,
      peso_quantidade: Number(formIngrediente.peso_quantidade),
    })
    if (error) {
      alert('Erro ao adicionar ingrediente: ' + error.message)
      return
    }
    setFormIngrediente({ ingrediente_id: '', peso_quantidade: '' })
    setNovoIngredientePara(null)
    carregar()
  }

  return (
    <div>
      <PageHeader
        titulo="Produtos & Fichas Técnicas"
        acaoPrincipal={
          <Button variant="primary" onClick={() => setMostrarNovoProduto(!mostrarNovoProduto)}>
            + Novo Produto
          </Button>
        }
      />
      <p className="text-sm text-fumaca mb-4">
        Cada variação tem peso pré-definido de ingredientes — o CMV é calculado
        automaticamente a partir da ficha técnica.
      </p>

      {mostrarNovoProduto && (
        <form onSubmit={salvarNovoProduto} className="bg-superficie text-osso p-6 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">SKU</label>
            <input required value={novoProduto.sku}
              onChange={(e) => setNovoProduto({ ...novoProduto, sku: e.target.value })}
              placeholder="Ex: LAN010"
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Nome técnico</label>
            <input required value={novoProduto.nome}
              onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
              placeholder="Ex: Hambúrguer Artesanal 150g"
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Nome comercial</label>
            <input value={novoProduto.nome_comercial}
              onChange={(e) => setNovoProduto({ ...novoProduto, nome_comercial: e.target.value })}
              placeholder="Ex: Serra Fina"
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Linha (opcional)</label>
            <input value={novoProduto.linha}
              onChange={(e) => setNovoProduto({ ...novoProduto, linha: e.target.value })}
              placeholder="Ex: Brasa Craft"
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Categoria</label>
            <select required value={novoProduto.categoria_id}
              onChange={(e) => setNovoProduto({ ...novoProduto, categoria_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso">
              <option value="">Selecione...</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-fumaca">Subcategoria (opcional)</label>
            <input value={novoProduto.subcategoria}
              onChange={(e) => setNovoProduto({ ...novoProduto, subcategoria: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso" />
          </div>
          <div className="col-span-2">
            <label className="text-xs uppercase tracking-wide text-fumaca">Descrição</label>
            <textarea value={novoProduto.descricao}
              onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso" />
          </div>
          <div className="col-span-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={novoProduto.permite_adicionais}
                onChange={(e) => setNovoProduto({ ...novoProduto, permite_adicionais: e.target.checked })} />
              Permite adicionais
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={novoProduto.vegano}
                onChange={(e) => setNovoProduto({ ...novoProduto, vegano: e.target.checked })} />
              Vegano
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={novoProduto.vegetariano}
                onChange={(e) => setNovoProduto({ ...novoProduto, vegetariano: e.target.checked })} />
              Vegetariano
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={novoProduto.contem_lactose}
                onChange={(e) => setNovoProduto({ ...novoProduto, contem_lactose: e.target.checked })} />
              Contém lactose
            </label>
          </div>
          <div className="col-span-2">
            <button disabled={salvandoProduto}
              className="bg-ambar text-carvao font-medium px-5 py-2.5 hover:bg-osso transition-colors">
              {salvandoProduto ? 'Salvando...' : 'Criar produto'}
            </button>
            <p className="text-xs text-fumaca mt-2">
              Depois de criar, você adiciona as variações (ex: 150g/200g) e a ficha técnica de cada uma.
            </p>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFiltroCategoria('todas')}
          className={`px-3 py-1.5 text-xs ${filtroCategoria === 'todas' ? 'bg-ambar text-carvao' : 'bg-white border border-superficie2/30'}`}>
          Todas
        </button>
        {categorias.map((cat) => (
          <button key={cat.id} onClick={() => setFiltroCategoria(cat.nome)}
            className={`px-3 py-1.5 text-xs ${filtroCategoria === cat.nome ? 'bg-ambar text-carvao' : 'bg-white border border-superficie2/30'}`}>
            {cat.nome}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {produtosFiltrados.map((produto) => (
          <div key={produto.sku} className={`bg-white border border-superficie2/20 ${!produto.ativo ? 'opacity-50' : ''}`}>
            <button
              onClick={() => setExpandido(expandido === produto.sku ? null : produto.sku)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <span className="text-xs text-fumaca">
                  {produto.sku} · {produto.categorias?.nome}
                  {produto.subcategoria ? ` · ${produto.subcategoria}` : ''}
                  {produto.linha ? ` · Linha ${produto.linha}` : ''}
                </span>
                <h3 className="font-display text-lg">
                  {produto.nome_comercial || produto.nome}
                </h3>
                {produto.nome_comercial && produto.nome_comercial !== produto.nome && (
                  <p className="text-xs text-fumaca">{produto.nome}</p>
                )}
                <div className="mt-1">
                  {!produto.ativo && <Badge tone="brasa">Inativo</Badge>}
                  {produto.vegano && <Badge tone="oliva">Vegano</Badge>}
                  {produto.vegetariano && !produto.vegano && <Badge tone="oliva">Vegetariano</Badge>}
                  {!produto.contem_lactose && <Badge tone="ambar">Sem lactose</Badge>}
                  {produto.permite_adicionais && <Badge tone="brasa">Personalizável</Badge>}
                </div>
              </div>
              <span className="text-ambar text-sm">{expandido === produto.sku ? 'Fechar' : 'Ver detalhes'}</span>
            </button>

            {expandido === produto.sku && (
              <div className="px-5 pb-5">
                <button
                  onClick={() => alternarAtivo(produto)}
                  className={`text-xs mb-3 px-3 py-1.5 border ${produto.ativo ? 'border-brasa text-brasa' : 'border-oliva text-oliva'}`}
                >
                  {produto.ativo ? 'Desativar produto' : 'Reativar produto'}
                </button>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {variacoesDoProduto(produto.sku).map((v) => {
                    const custo = custoDaVariacao(v.id)
                    return (
                      <div key={v.id} className="border border-superficie2/30 p-4">
                        <p className="font-medium">{v.nome_variacao}</p>
                        <p className="text-sm text-fumaca mt-1">Venda: R$ {Number(v.preco_venda).toFixed(2)}</p>
                        {custo ? (
                          <>
                            <p className="text-sm text-fumaca">Custo: R$ {Number(custo.custo_ficha_tecnica).toFixed(2)}</p>
                            <p className={`text-sm font-medium mt-1 ${custo.cmv_percentual > 35 ? 'text-brasa' : 'text-oliva'}`}>
                              CMV: {custo.cmv_percentual}%
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-brasa mt-1">Sem ficha técnica ainda</p>
                        )}

                        {novoIngredientePara === v.id ? (
                          <div className="mt-3 space-y-2 border-t border-superficie2/30 pt-3">
                            <select value={formIngrediente.ingrediente_id}
                              onChange={(e) => setFormIngrediente({ ...formIngrediente, ingrediente_id: e.target.value })}
                              className="w-full px-2 py-1.5 border border-superficie2/40 text-xs">
                              <option value="">Ingrediente...</option>
                              {ingredientes.map((i) => (
                                <option key={i.id} value={i.id}>{i.nome} ({i.unidade_medida})</option>
                              ))}
                            </select>
                            <input type="number" placeholder="Quantidade"
                              value={formIngrediente.peso_quantidade}
                              onChange={(e) => setFormIngrediente({ ...formIngrediente, peso_quantidade: e.target.value })}
                              className="w-full px-2 py-1.5 border border-superficie2/40 text-xs" />
                            <div className="flex gap-2">
                              <button onClick={() => salvarIngredienteFicha(v.id)}
                                className="flex-1 bg-ambar text-carvao text-xs py-1.5">Adicionar</button>
                              <button onClick={() => setNovoIngredientePara(null)}
                                className="px-3 text-xs text-fumaca">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setNovoIngredientePara(v.id)}
                            className="text-xs text-ambar mt-3">+ ingrediente na ficha técnica</button>
                        )}
                      </div>
                    )
                  })}

                  {novaVariacaoPara === produto.sku ? (
                    <div className="border border-dashed border-superficie2/40 p-4 space-y-2">
                      <input placeholder="Nome (ex: 200g)" value={formVariacao.nome_variacao}
                        onChange={(e) => setFormVariacao({ ...formVariacao, nome_variacao: e.target.value })}
                        className="w-full px-2 py-1.5 border border-superficie2/40 text-xs" />
                      <input type="number" placeholder="Preço de venda" value={formVariacao.preco_venda}
                        onChange={(e) => setFormVariacao({ ...formVariacao, preco_venda: e.target.value })}
                        className="w-full px-2 py-1.5 border border-superficie2/40 text-xs" />
                      <div className="flex gap-2">
                        <button onClick={() => salvarVariacao(produto.sku)}
                          className="flex-1 bg-ambar text-carvao text-xs py-1.5">Salvar</button>
                        <button onClick={() => setNovaVariacaoPara(null)}
                          className="px-3 text-xs text-fumaca">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setNovaVariacaoPara(produto.sku)}
                      className="border border-dashed border-superficie2/40 p-4 text-sm text-ambar hover:border-ambar">
                      + Nova variação
                    </button>
                  )}
                </div>

                {produto.permite_adicionais && adicionaisDoProduto(produto.sku).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-fumaca mb-2">Adicionais disponíveis</p>
                    <div className="flex flex-wrap gap-2">
                      {adicionaisDoProduto(produto.sku).map((a) => (
                        <span key={a.id} className="text-xs bg-superficie text-osso px-3 py-1.5">
                          {a.nome} · +R$ {Number(a.preco_adicional).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
