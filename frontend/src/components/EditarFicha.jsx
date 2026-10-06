import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { carregarTodasPaginas } from '../lib/dashboard.js'
import { validarQuantidadeFicha, validarVariacao } from '../lib/fichaTecnica.js'
const campo = 'w-full border border-borda px-2 py-1.5 text-sm'

export default function EditarFicha({ variacao, onSalvo }) {
  const { usuario } = useAuth()
  const permitido = usuario?.ativo && ['Administrador', 'Gerente'].includes(usuario?.perfis?.nome)
  const [nome, setNome] = useState(variacao.nome_variacao)
  const [preco, setPreco] = useState(String(variacao.preco_venda))
  const [ficha, setFicha] = useState([])
  const [quantidades, setQuantidades] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [revisao, setRevisao] = useState(0)
  const trava = useRef(false)
  useEffect(() => { setNome(variacao.nome_variacao); setPreco(String(variacao.preco_venda)) }, [variacao.nome_variacao, variacao.preco_venda])
  useEffect(() => {
    let atual = true
    setCarregando(true)
    carregarTodasPaginas(() => supabase.from('fichas_tecnicas')
      .select('id,peso_quantidade,ingredientes(nome,unidade_medida,ativo)').eq('variacao_id', variacao.id).order('id'))
      .then(dados => {
        if (!atual) return
        setFicha(dados)
        setQuantidades(Object.fromEntries(dados.map(item => [item.id, String(item.peso_quantidade)])))
      }).catch(error => { if (atual) { setFicha([]); setErro('Falha ao carregar ficha: ' + error.message) } })
      .finally(() => { if (atual) setCarregando(false) })
    return () => { atual = false }
  }, [variacao.id, revisao])

  async function executar(funcao, dados) {
    if (trava.current || !permitido) return
    trava.current = true; setSalvando(true); setErro(''); setAviso('')
    try {
      const { data, error } = await supabase.rpc(funcao, dados())
      if (error) throw error
      if (!data) throw new Error('O banco não confirmou a alteração.')
      setAviso('Alteração salva. Recarregando custos atuais.')
      setRevisao(v => v + 1)
      await onSalvo()
    } catch (error) {
      setErro(error.code === 'PGRST202' ? 'Execute sql/migration_edicao_fichas.sql no Supabase para habilitar a edição.' : error.message)
    } finally { trava.current = false; setSalvando(false) }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fumaca">Catálogo compartilhado: alterações valem para todas as lojas. Quantidades por uma unidade da variação, na medida indicada (g/ml/un).</p>
      <p className="text-xs text-brasa">Não altera preços já vendidos nem repõe estoque. Relatórios baseados na ficha atual podem mudar; o custo histórico ainda não é congelado.</p>
      {erro && <p role="alert" className="text-sm text-brasa">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-oliva">{aviso}</p>}
      {!permitido && <p className="text-sm">Somente Administrador e Gerente podem editar.</p>}
      <fieldset disabled={!permitido || salvando || carregando} className="space-y-3">
        <label className="block text-sm">Nome da variação<input className={campo} value={nome} onChange={e => setNome(e.target.value)} /></label>
        <label className="block text-sm">Preço de venda (R$)<input className={campo} inputMode="decimal" value={preco} onChange={e => setPreco(e.target.value)} /></label>
        <button className="bg-ambar px-3 py-2 text-sm" onClick={() => executar('editar_variacao', () => {
          const dados = validarVariacao(nome, preco)
          return { p_id: variacao.id, p_nome_anterior: variacao.nome_variacao, p_preco_anterior: variacao.preco_venda, p_nome: dados.nome_variacao, p_preco: dados.preco_venda }
        })}>{salvando ? 'Salvando...' : 'Salvar variação'}</button>
      </fieldset>
      <h3 className="font-display text-xl">Ingredientes da ficha</h3>
      {carregando ? <p>Carregando...</p> : ficha.length === 0 ? <p className="text-sm">Nenhum ingrediente carregado.</p> : ficha.map(item => (
        <fieldset disabled={!permitido || salvando} key={item.id} className="border-t border-borda pt-3 space-y-2">
          <p className="text-sm font-medium">{item.ingredientes?.nome || 'Ingrediente indisponível'}{item.ingredientes?.ativo === false ? ' (inativo)' : ''}</p>
          <label className="block text-sm">Quantidade em {item.ingredientes?.unidade_medida || 'unidade cadastrada'}
            <input className={campo} inputMode="decimal" value={quantidades[item.id] || ''} onChange={e => setQuantidades(q => ({ ...q, [item.id]: e.target.value }))} />
          </label>
          <button className="text-sm text-ambar" onClick={() => executar('editar_quantidade_ficha', () => ({ p_id: item.id, p_anterior: item.peso_quantidade, p_quantidade: validarQuantidadeFicha(quantidades[item.id]) }))}>Salvar quantidade</button>
        </fieldset>
      ))}
      <button disabled={salvando || carregando} className="text-xs underline" onClick={() => { setErro(''); setRevisao(v => v + 1); onSalvo() }}>Recarregar dados salvos</button>
    </div>
  )
}
