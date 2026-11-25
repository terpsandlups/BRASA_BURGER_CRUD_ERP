import { useState } from 'react'
import { solicitarAtivacaoCliente } from '../lib/ativacaoCliente.js'
import { atualizarSenhaRecuperada } from '../lib/recuperacaoAcesso.js'
import { formatarCPF } from '../lib/format.js'
import SidePanel from './layout/SidePanel.jsx'

export default function AtivacaoCliente({api,marca,cpfInicial='',session,perfil,concluir}) {
  const [aberto,setAberto]=useState(false),[cpf,setCpf]=useState(cpfInicial),[email,setEmail]=useState('')
  const [senha,setSenha]=useState(''),[confirmacao,setConfirmacao]=useState('')
  const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[aviso,setAviso]=useState('')
  async function enviar(e){
    e.preventDefault();if(ocupado)return;setOcupado(true);setErro('');setAviso('')
    try {
      if(session){
        await atualizarSenhaRecuperada(api.auth,{senha,confirmacao,usuarioId:session.user.id})
        setSenha('');setConfirmacao('');concluir()
      }else{
        const retorno=new URL(`${window.location.origin}${import.meta.env.BASE_URL}pedir/${marca}`)
        retorno.searchParams.set('etapa','pedidos');retorno.searchParams.set('ativacao','1')
        await solicitarAtivacaoCliente(api.auth,{cpf:cpf || cpfInicial,email,retorno:retorno.href})
        setAviso('Confira seu e-mail e abra o link de confirmação para continuar. Seus dados da loja serão reconhecidos após a confirmação, quando o e-mail corresponder a um único cadastro.')
      }
    }catch(error){setErro(error.message)}finally{setOcupado(false)}
  }
  const fechar=()=>{if(ocupado)return;if(session)concluir();else setAberto(false)}
  return <>
    {!session && <button type="button" className="portal-secondary" onClick={()=>{setCpf(cpfInicial);setAberto(true)}}>Já tenho cadastro na loja · Continuar primeiro acesso</button>}
    <SidePanel aberto={aberto || !!session} onFechar={fechar} titulo="Primeiro acesso">
    <section className="portal-form" aria-label="Primeiro acesso">
    <h2>{session ? 'Defina sua senha de acesso' : 'Cadastro incompleto — continue seu cadastro'}</h2>
    <p className="portal-form-note">{session ? (perfil?.cpf ? 'Seus dados foram reconhecidos. Defina uma senha para os próximos acessos com CPF ou e-mail.' : 'Defina uma senha e complete seus dados abaixo. Se já tiver cadastro na loja, confirme com a equipe o e-mail registrado.') : 'Se a loja já cadastrou seus dados, ative o acesso ao aplicativo confirmando o mesmo e-mail. Você não precisa repetir nome e telefone quando o cadastro for reconhecido.'}</p>
    <form className="portal-form" onSubmit={enviar}><fieldset className="portal-form" disabled={ocupado}>
      {session ? <><label>Nova senha<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)} /></label><label>Confirme a senha<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)} /></label></> : <><label>CPF<input required inputMode="numeric" maxLength={14} value={cpf} onChange={e=>setCpf(formatarCPF(e.target.value))} /></label><label>E-mail cadastrado na loja<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label></>}
      <button className="portal-primary">{ocupado ? 'Aguarde…' : session ? 'Salvar senha e continuar' : 'Confirmar meu e-mail'}</button>
    </fieldset></form>
    {aviso&&<p role="status" className="portal-notice">{aviso}</p>}{erro&&<p role="alert" className="portal-notice is-error">{erro}</p>}
    {!session&&<button type="button" className="portal-text-link" disabled={ocupado} onClick={fechar}>Voltar ao login</button>}
    </section></SidePanel>
  </>
}
