import { useState } from 'react'
import { formatarCPF } from '../lib/format.js'
import Icon from './ui/Icon.jsx'

export default function PerfilConsumidor({ portal:p }) {
  const [editando,setEditando] = useState(false)
  const [erro,setErro] = useState('')
  const [salvando,setSalvando] = useState(false)
  if(p.erroPerfil) return <div role="alert" className="portal-notice is-error"><p>{p.erroPerfil}</p><button type="button" onClick={p.recarregarPerfil}>Carregar meu cadastro</button></div>
  if(!p.perfilPronto) return <p role="status">Carregando seus dados salvos…</p>
  const aberto = editando || !p.perfilSalvo
  async function salvar() {
    setSalvando(true);setErro('')
    try { await p.salvarPerfil();setEditando(false) }
    catch(error){setErro(error.message || 'Não foi possível salvar os dados.')}
    finally{setSalvando(false)}
  }
  return <section className="portal-profile">
    <div className="portal-card-heading"><Icon nome="conta" size={22} /><h2>Seus dados da conta</h2></div>
    {!aberto ? <><div className="portal-profile-summary"><strong>{p.perfilSalvo.nome}</strong><span>{p.perfilSalvo.telefone}</span><small>CPF {formatarCPF(p.perfilSalvo.cpf)}</small></div><p className="portal-form-note">Esses dados já estão salvos. Você não precisa se cadastrar a cada pedido.</p><button type="button" className="portal-text-link" onClick={()=>setEditando(true)}>Editar nome ou telefone</button></> : <fieldset className="portal-form" disabled={salvando || p.ocupado}>
      {!p.perfilSalvo && <p className="portal-form-note">Vincule seus dados uma única vez. Nos próximos pedidos, eles já estarão aqui.</p>}
      <label>Nome<input required maxLength={120} autoComplete="name" value={p.cliente.nome} onChange={e=>p.setCliente(c=>({...c,nome:e.target.value}))} /></label>
      <div className="portal-form-columns"><label>CPF<input required inputMode="numeric" maxLength={14} readOnly={!!p.cpfVinculado} value={p.cliente.cpf} onChange={e=>p.setCliente(c=>({...c,cpf:formatarCPF(e.target.value)}))} /></label><label>Telefone<input required type="tel" autoComplete="tel" maxLength={20} value={p.cliente.telefone} onChange={e=>p.setCliente(c=>({...c,telefone:e.target.value}))} /></label></div>
      <div className="portal-inline-actions"><button type="button" className="portal-secondary" onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar meus dados'}</button>{p.perfilSalvo && <button type="button" className="portal-text-link" onClick={()=>{p.setCliente(p.perfilSalvo);setEditando(false);setErro('')}}>Cancelar edição</button>}</div>
      {erro && <p role="alert" className="text-brasa">{erro}</p>}
    </fieldset>}
  </section>
}
