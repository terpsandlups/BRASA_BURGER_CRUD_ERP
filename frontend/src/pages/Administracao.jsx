import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Link } from 'react-router-dom'

const campo='block w-full border border-borda rounded-lg p-3 mt-2'
export default function Administracao() {
  const { usuario,recarregarUsuario }=useAuth()
  const [empresas,setEmpresas]=useState([])
  const [lojas,setLojas]=useState([])
  const [marca,setMarca]=useState({ nome:usuario.empresas.nome,cor:usuario.empresas.cor,logo_url:usuario.empresas.logo_url || '' })
  const [nova,setNova]=useState({ nome:'',slug:'',cor:'#e4ae65',logo_url:'' })
  const [loja,setLoja]=useState({ nome:'',tipo_operacao:'presencial_delivery',ativo:true })
  const [colaborador,setColaborador]=useState({nome:'',email:'',perfil:'Gerente',loja_id:''})
  const [erro,setErro]=useState('')
  const [aviso,setAviso]=useState('')
  const [ocupado,setOcupado]=useState(false)
  const [revisao,setRevisao]=useState(0)
  const trava=useRef(false)
  useEffect(() => {
    let ativo=true
    Promise.all([supabase.from('empresas').select('id,nome,slug').order('nome'),supabase.from('lojas').select('id,nome,tipo_operacao,ativo').order('nome')])
      .then(([e,l]) => { if(!ativo) return; if(e.error || l.error) throw e.error || l.error; setEmpresas(e.data); setLojas(l.data) })
      .catch(() => { if(ativo) setErro('Não foi possível carregar a administração.') })
    return () => { ativo=false }
  },[usuario.empresa_id,revisao])
  async function salvar(acao,dados,mensagem) {
    if(trava.current) return
    trava.current=true;setOcupado(true);setErro('');setAviso('')
    try {
      const {error}=await supabase.rpc('administrar_plataforma',{p_acao:acao,p_dados:dados})
      if(error) throw error
      setAviso(mensagem);setRevisao(v=>v+1)
      if(acao==='selecionar_empresa' || (acao==='empresa' && dados.id)) recarregarUsuario()
      if(acao==='empresa' && !dados.id) setNova({nome:'',slug:'',cor:'#e4ae65',logo_url:''})
      if(acao==='loja') setLoja({nome:'',tipo_operacao:'presencial_delivery',ativo:true})
    } catch(error) { setErro(error.code==='P0001' ? error.message : 'Não foi possível salvar. Confira os dados e suas permissões.') }
    finally {trava.current=false;setOcupado(false)}
  }
  return <>
    <PageHeader titulo={usuario.master ? 'Conta master' : 'Administração'} descricao={usuario.master ? 'Empresas da plataforma e operação selecionada.' : `Configurações de ${usuario.empresas.nome}.`} icone="ajuste" />
    {erro && <p role="alert" className="text-brasa mb-4">{erro}</p>}{aviso && <p role="status" className="text-oliva mb-4">{aviso}</p>}
    {usuario.master && <section className="bg-branco border border-borda rounded-xl p-6 mb-6"><label className="block">Empresa em administração<select disabled={ocupado} className={campo} value={usuario.empresa_id} onChange={e=>salvar('selecionar_empresa',{id:e.target.value},'Empresa selecionada.')}>
      {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></label></section>}
    <div className="grid xl:grid-cols-2 gap-6">
      <form className="bg-branco border border-borda rounded-xl p-6 space-y-4" onSubmit={e=>{e.preventDefault();salvar('empresa',{...marca,id:usuario.empresa_id},'Identidade atualizada.')}}>
        <h2 className="text-xl">Identidade do estabelecimento</h2><fieldset disabled={ocupado} className="space-y-4">
          <label className="block text-sm">Nome da marca<input required maxLength={120} className={campo} value={marca.nome} onChange={e=>setMarca(v=>({...v,nome:e.target.value}))} /></label>
          <label className="block text-sm">Cor da marca<input type="color" className="block mt-2 w-20 h-11" value={marca.cor} onChange={e=>setMarca(v=>({...v,cor:e.target.value}))} /></label>
          <label className="block text-sm">Logo (URL HTTPS)<input type="url" className={campo} value={marca.logo_url} onChange={e=>setMarca(v=>({...v,logo_url:e.target.value}))} /></label>
          <button className="bg-ambar px-4 py-3 rounded-lg">Salvar identidade</button>
        </fieldset>
        <a className="text-ambar text-sm underline" href={`/pedir/${usuario.empresas.slug}`} target="_blank" rel="noreferrer">Abrir portal de {usuario.empresas.nome}</a>
      </form>
      <section className="bg-branco border border-borda rounded-xl p-6"><h2 className="text-xl mb-4">Unidades</h2>
        <ul className="space-y-3 mb-5">{lojas.map(l=><li key={l.id} className="flex gap-4 justify-between text-sm border-b border-borda pb-3"><span>{l.nome} · {l.ativo ? 'Ativa' : 'Inativa'}</span><button disabled={ocupado} className="text-ambar underline" onClick={()=>setLoja(l)}>Editar</button></li>)}</ul>
        <form onSubmit={e=>{e.preventDefault();salvar('loja',loja,'Unidade salva. Configure endereço e tarifa em Entregas.')}}><fieldset disabled={ocupado} className="space-y-4">
          <label className="block text-sm">Nome da unidade<input required maxLength={120} className={campo} value={loja.nome} onChange={e=>setLoja(v=>({...v,nome:e.target.value}))} /></label>
          <label className="block text-sm">Operação<select className={campo} value={loja.tipo_operacao} onChange={e=>setLoja(v=>({...v,tipo_operacao:e.target.value}))}><option value="presencial_delivery">Retirada e entrega</option><option value="delivery_only">Somente entrega</option></select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={loja.ativo} onChange={e=>setLoja(v=>({...v,ativo:e.target.checked}))} />Unidade ativa</label>
          <button className="bg-ambar px-4 py-3 rounded-lg">{loja.id ? 'Salvar unidade' : 'Cadastrar unidade'}</button>
          {loja.id && <button type="button" className="ml-3 underline" onClick={()=>setLoja({nome:'',tipo_operacao:'presencial_delivery',ativo:true})}>Nova unidade</button>}
        </fieldset></form><Link to="/entregas" className="inline-block mt-5 text-sm underline text-ambar">Configurar endereço e frete</Link>
      </section>
      <form className="bg-branco border border-borda rounded-xl p-6 space-y-4" onSubmit={e=>{e.preventDefault();salvar('colaborador',colaborador,'Acesso da equipe atualizado.')}}>
        <h2 className="text-xl">Acessos da equipe</h2><p className="text-sm text-fumaca">Vincule uma conta já cadastrada. Administrador acessa todas as unidades desta empresa; os demais perfis acessam a unidade selecionada.</p>
        <fieldset disabled={ocupado} className="space-y-4">
          <label className="block text-sm">Nome<input required maxLength={120} className={campo} value={colaborador.nome} onChange={e=>setColaborador(v=>({...v,nome:e.target.value}))} /></label>
          <label className="block text-sm">E-mail da conta<input type="email" required className={campo} value={colaborador.email} onChange={e=>setColaborador(v=>({...v,email:e.target.value}))} /></label>
          <label className="block text-sm">Perfil<select className={campo} value={colaborador.perfil} onChange={e=>setColaborador(v=>({...v,perfil:e.target.value}))}>{['Administrador','Gerente','Operador','Estoque','Visualização'].map(p=><option key={p}>{p}</option>)}</select></label>
          {colaborador.perfil!=='Administrador' && <label className="block text-sm">Unidade<select required className={campo} value={colaborador.loja_id} onChange={e=>setColaborador(v=>({...v,loja_id:e.target.value}))}><option value="">Selecione a unidade</option>{lojas.filter(l=>l.ativo).map(l=><option key={l.id} value={l.id}>{l.nome}</option>)}</select></label>}
          <button className="bg-ambar px-4 py-3 rounded-lg">Salvar acesso</button>
        </fieldset>
      </form>
      {usuario.master && <form className="bg-branco border border-borda rounded-xl p-6 space-y-4" onSubmit={e=>{e.preventDefault();salvar('empresa',nova,'Empresa cadastrada. Selecione-a para cadastrar unidades e equipe.')}}>
        <h2 className="text-xl">Novo cliente da plataforma</h2><fieldset disabled={ocupado} className="space-y-4">
          <label className="block text-sm">Nome do estabelecimento<input required minLength={2} maxLength={120} className={campo} value={nova.nome} onChange={e=>setNova(v=>({...v,nome:e.target.value}))} /></label>
          <label className="block text-sm">Identificador do portal<input required pattern="[a-z0-9][a-z0-9-]{1,79}" placeholder="exemplo-hamburgueria" className={campo} value={nova.slug} onChange={e=>setNova(v=>({...v,slug:e.target.value}))} /></label>
          <button className="bg-ambar px-4 py-3 rounded-lg">Cadastrar empresa</button>
        </fieldset>
      </form>}
    </div>
  </>
}
