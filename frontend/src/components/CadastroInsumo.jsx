import { useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import Button from './ui/Button.jsx'

const inicial = { nome: '', unidade_medida: 'g', custo_unitario: '', categoria: '' }

export default function CadastroInsumo({ onSalvo }) {
  const [form, setForm] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const trava = useRef(false)

  async function salvar(e) {
    e.preventDefault()
    if (trava.current) return
    if (!form.nome.trim() || form.custo_unitario === '' || !Number.isFinite(Number(form.custo_unitario)) || Number(form.custo_unitario) < 0) {
      setMensagem('Informe nome e custo válido, maior ou igual a zero.')
      return
    }
    trava.current = true
    setSalvando(true)
    setMensagem('')
    try {
      const { error } = await supabase.from('ingredientes').insert({
        ...form, nome: form.nome.trim(), categoria: form.categoria.trim() || null,
        custo_unitario: Number(form.custo_unitario), ativo: true,
      })
      if (error) throw error
      setForm(inicial)
      setMensagem('Insumo cadastrado. Agora vincule-o ao estoque da unidade abaixo.')
      onSalvo()
    } catch (error) {
      setMensagem('Não foi possível cadastrar o insumo: ' + error.message)
    } finally {
      trava.current = false
      setSalvando(false)
    }
  }

  return <form onSubmit={salvar} className="bg-branco border border-borda p-5 mb-5">
    <h2 className="text-xl mb-3">Cadastrar insumo</h2>
    <fieldset disabled={salvando} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-sm">Nome
        <input required maxLength={150} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="block w-full border border-borda p-2 mt-1" />
      </label>
      <label className="text-sm">Categoria
        <input placeholder="Ex.: proteína, embalagem, molho" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="block w-full border border-borda p-2 mt-1" />
      </label>
      <label className="text-sm">Unidade de medida
        <select value={form.unidade_medida} onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })} className="block w-full border border-borda p-2 mt-1">
          <option value="g">Grama (g)</option><option value="ml">Mililitro (ml)</option><option value="un">Unidade (un)</option>
        </select>
      </label>
      <label className="text-sm">Custo em reais por {form.unidade_medida}
        <input required type="number" min="0" max="999999.9999" step="0.0001" value={form.custo_unitario} onChange={(e) => setForm({ ...form, custo_unitario: e.target.value })} className="block w-full border border-borda p-2 mt-1" />
      </label>
      <p className="text-xs text-fumaca sm:col-span-2">Use a mesma unidade da ficha técnica. Exemplo: carne a R$ 40,00/kg custa R$ 0,0400 por grama.</p>
      <Button>{salvando ? 'Salvando...' : 'Cadastrar insumo'}</Button>
    </fieldset>
    {mensagem && <p role="status" className="text-sm mt-3">{mensagem}</p>}
  </form>
}
