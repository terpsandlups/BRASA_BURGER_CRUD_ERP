import { useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { imagemPublica } from '../lib/catalogoPublico.js'

export default function EditarCardapio({ produto, empresaId, categorias, onSalvo }) {
  const [form,setForm] = useState({nome_comercial:produto.nome_comercial || '',descricao:produto.descricao || '',imagem_url:produto.imagem_url || '',categoria_id:produto.categoria_id || '',destaque:!!produto.destaque,disponivel_delivery:!!produto.disponivel_delivery,disponivel_presencial:!!produto.disponivel_presencial})
  const [salvando,setSalvando] = useState(false)
  const [erro,setErro] = useState('')
  const trava = useRef(false)
  const campo = 'block w-full mt-1 px-3 py-3 border border-borda rounded-lg'
  const alterar = (nome,valor) => setForm(v=>({...v,[nome]:valor}))
  async function salvar(event) {
    event.preventDefault()
    if(trava.current) return
    if(form.imagem_url.trim() && !imagemPublica(form.imagem_url)){setErro('Informe uma URL HTTPS de imagem sem usuário ou senha.');return}
    trava.current=true;setSalvando(true);setErro('')
    try {
      const {data,error}=await supabase.from('produtos').update({...form,nome_comercial:form.nome_comercial.trim(),descricao:form.descricao.trim(),imagem_url:imagemPublica(form.imagem_url) || null}).eq('sku',produto.sku).eq('empresa_id',empresaId).select('sku').maybeSingle()
      if(error) throw error
      if(!data) throw new Error('Seu acesso não permite alterar este produto. Recarregue o catálogo.')
      await onSalvo()
    }catch(error){setErro('Não foi possível salvar o cardápio: '+error.message)}
    finally{trava.current=false;setSalvando(false)}
  }
  if(!Object.hasOwn(produto,'imagem_url') || !Object.hasOwn(produto,'destaque')) return <div className="space-y-3"><h2 className="text-xl">Personalização do cardápio</h2><p className="text-sm text-fumaca">A edição de fotos e destaques aguarda ativação pelo administrador da plataforma. O cardápio e os pedidos continuam disponíveis.</p></div>
  return <form onSubmit={salvar} className="space-y-5">
    <p className="text-sm text-fumaca">Estas informações aparecem no portal da sua empresa. Preços e adicionais são os cadastrados nas variações.</p>
    {erro && <p role="alert" className="text-brasa text-sm">{erro}</p>}
    <fieldset disabled={salvando} className="space-y-4">
      <label className="block text-sm">Nome no cardápio<input maxLength={120} className={campo} value={form.nome_comercial} placeholder={produto.nome} onChange={e=>alterar('nome_comercial',e.target.value)} /></label>
      <label className="block text-sm">Categoria<select required className={campo} value={form.categoria_id} onChange={e=>alterar('categoria_id',e.target.value)}><option value="">Selecione</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
      <label className="block text-sm">Descrição curta<textarea maxLength={1000} rows={3} className={campo} value={form.descricao} onChange={e=>alterar('descricao',e.target.value)} /></label>
      <label className="block text-sm">Foto do produto (URL HTTPS)<input type="url" maxLength={2000} className={campo} placeholder="https://…/produto.jpg" value={form.imagem_url} onChange={e=>alterar('imagem_url',e.target.value)} /></label>
      {imagemPublica(form.imagem_url) && <img src={imagemPublica(form.imagem_url)} alt="Prévia da foto escolhida" referrerPolicy="no-referrer" className="w-full max-h-56 object-cover rounded-xl" />}
      <p className="text-xs text-fumaca">Use uma foto autorizada que represente o produto. Sem foto, o portal mostra um ícone ou uma imagem identificada como ilustrativa.</p>
      {[['destaque','Destacar no cardápio'],['disponivel_delivery','Disponível para entrega'],['disponivel_presencial','Disponível para retirada']].map(([nome,rotulo])=><label key={nome} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form[nome]} onChange={e=>alterar(nome,e.target.checked)} />{rotulo}</label>)}
      <button className="bg-ambar text-carvao w-full px-4 py-3 rounded-lg">{salvando ? 'Salvando…' : 'Salvar no cardápio'}</button>
    </fieldset>
  </form>
}
