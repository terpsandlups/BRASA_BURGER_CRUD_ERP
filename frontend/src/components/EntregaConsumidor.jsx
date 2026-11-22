import { useEffect, useRef, useState } from 'react'
import ConsultaEntrega from './ConsultaEntrega.jsx'
import Icon from './ui/Icon.jsx'
import { pontoFavorito } from '../lib/cotacaoEntrega.js'

const CAMPOS = ['cep','endereco','numero','complemento','bairro','cidade','estado']
const SELECAO = 'id,apelido,cep,endereco,numero,complemento,bairro,cidade,estado,latitude,longitude'

export default function EntregaConsumidor({ api, usuarioId, lojaId, endereco, cotacao, onCotacao, onInvalidar }) {
  const [favoritos,setFavoritos] = useState([])
  const [carregando,setCarregando] = useState(true)
  const [erro,setErro] = useState('')
  const [aviso,setAviso] = useState('')
  const [ocupado,setOcupado] = useState(false)
  const [apelido,setApelido] = useState('Casa')
  const [remover,setRemover] = useState('')
  const [escolhido,setEscolhido] = useState('')
  const [destino,setDestino] = useState(endereco)
  const [revisao,setRevisao] = useState(0)
  const versao = useRef(0)
  const trava = useRef(false)
  useEffect(()=>{
    let ativo=true
    setCarregando(true)
    api.from('enderecos_consumidor').select(SELECAO).order('criado_em',{ascending:false}).then(({data,error})=>{
      if(!ativo)return
      if(error) setErro(['42P01','PGRST205'].includes(error.code) ? 'Os favoritos aguardam a atualização do banco. Você pode preencher o endereço normalmente.' : 'Não foi possível carregar seus endereços favoritos.')
      else {setFavoritos(data || []);setErro('')}
    }).catch(()=>{if(ativo)setErro('Não foi possível carregar seus endereços favoritos.')}).finally(()=>{if(ativo)setCarregando(false)})
    return()=>{ativo=false;versao.current++}
  },[api,usuarioId])

  function escolher(id) {
    const favorito=favoritos.find(e=>e.id===id)
    onInvalidar();setEscolhido(id);setDestino(favorito || {});setRevisao(n=>n+1);setAviso('');setErro('')
  }
  async function executar(acao) {
    if(trava.current)return
    trava.current=true;setOcupado(true);setErro('');setAviso('')
    const atual=versao.current
    try {await acao(atual)}
    catch(error){if(atual===versao.current)setErro(error.message || 'Não foi possível atualizar seus favoritos.')}
    finally{trava.current=false;if(atual===versao.current)setOcupado(false)}
  }
  async function salvar(atual) {
    if(!cotacao?.endereco || Date.parse(cotacao.expira_em)<=Date.now())throw new Error('Calcule o frete para confirmar o endereço antes de salvar.')
    if(!apelido.trim())throw new Error('Dê um nome ao endereço, como Casa ou Trabalho.')
    const dados=Object.fromEntries(CAMPOS.map(c=>[c,String(cotacao.endereco[c] || '').trim()]))
    dados.cep=dados.cep.replace(/\D/g,'');dados.estado=dados.estado.toUpperCase()
    const ponto=cotacao.ponto_destino || pontoFavorito(cotacao.endereco)
    const {data,error}=await api.from('enderecos_consumidor').insert({...dados,apelido:apelido.trim(),...(ponto ? {latitude:ponto.latitude,longitude:ponto.longitude} : {})}).select(SELECAO).single()
    if(error)throw new Error(['42P01','PGRST205'].includes(error.code) ? 'Os favoritos ainda aguardam a atualização do banco.' : 'Não foi possível salvar este endereço. Tente novamente.')
    if(atual!==versao.current)return
    setFavoritos(anteriores=>[data,...anteriores]);setEscolhido(data.id);setAviso('Endereço salvo na sua conta. Ele estará aqui no próximo pedido.')
  }
  async function excluir(atual) {
    const {data,error}=await api.from('enderecos_consumidor').delete().eq('id',remover).select('id')
    if(error || !data?.length)throw new Error('Não foi possível remover este endereço.')
    if(atual!==versao.current)return
    setFavoritos(anteriores=>anteriores.filter(e=>e.id!==remover));setRemover('');setEscolhido('');setAviso('Endereço removido dos favoritos. O pedido atual foi mantido.')
  }
  return <div className="portal-address-book">
    <div className="portal-card-heading"><Icon nome="local" size={21} /><h3>Seus endereços favoritos</h3></div>
    {carregando ? <p role="status" className="portal-form-note">Carregando endereços…</p> : favoritos.length>0 ? <div className="portal-form">
      <label>Escolher um endereço<select value={escolhido} disabled={ocupado} onChange={e=>escolher(e.target.value)}><option value="">Usar outro endereço</option>{favoritos.map(e=><option value={e.id} key={e.id}>{e.apelido} · {e.endereco}, {e.numero}</option>)}</select></label>
      {escolhido && (remover===escolhido ? <div className="portal-inline-actions"><span>Remover este favorito?</span><button type="button" disabled={ocupado} className="portal-text-link" onClick={()=>executar(excluir)}>Sim, remover</button><button type="button" disabled={ocupado} className="portal-text-link" onClick={()=>setRemover('')}>Manter</button></div> : <button type="button" disabled={ocupado} className="portal-text-link" onClick={()=>setRemover(escolhido)}>Remover dos favoritos</button>)}
    </div> : <p className="portal-form-note">Salve o endereço após calcular o frete. No próximo pedido, basta escolhê-lo aqui.</p>}
    {erro && <p role="alert" className="portal-form-note text-brasa">{erro}</p>}
    <ConsultaEntrega key={lojaId+':'+revisao} clienteApi={api} lojaId={lojaId} modoPedido portal automatico destinoInicial={destino} cotacaoInicial={cotacao} onCotacao={onCotacao} onInvalidar={onInvalidar} />
    {cotacao && <div className="portal-save-address"><label>Nome deste endereço<input maxLength={40} value={apelido} onChange={e=>setApelido(e.target.value)} placeholder="Casa, Trabalho…" /></label><button type="button" className="portal-secondary" disabled={ocupado} onClick={()=>executar(salvar)}><Icon nome="check" size={17} />{ocupado ? 'Salvando…' : 'Salvar como favorito'}</button></div>}
    {aviso && <p role="status" className="portal-form-note text-ambar">{aviso}</p>}
  </div>
}
