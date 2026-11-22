import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import CamposEndereco from './CamposEndereco.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { chaveCotacao, enderecoCompleto, pontoFavorito, pontoDoDispositivo } from '../lib/cotacaoEntrega.js'
const MapaPonto = lazy(()=>import('./MapaPonto.jsx'))

export default function ConsultaEntrega({ lojaId, pontoSalvo, origemPendente, modoPedido = false,
  clienteCpf = '', destinoInicial = {}, cotacaoInicial = null, onCotacao, onInvalidar, portal = false, automatico = false, clienteApi = supabase }) {
  const inicialValida = cotacaoInicial && Date.parse(cotacaoInicial.expira_em)>Date.now() ? cotacaoInicial : null
  const [destino, setDestino] = useState(()=>Object.fromEntries(['cep','endereco','numero','complemento','bairro','cidade','estado'].map(c=>[c,destinoInicial[c] || ''])))
  const [ponto, setPonto] = useState(()=>pontoFavorito(destinoInicial))
  const [pontoConfirmado, setPontoConfirmado] = useState(()=>!!pontoFavorito(destinoInicial))
  const [mostrarMapa,setMostrarMapa] = useState(!portal)
  const [editando,setEditando] = useState(false)
  const [localizando,setLocalizando] = useState(false)
  const [aguardarAte,setAguardarAte] = useState(0)
  const [centroMapa, setCentroMapa] = useState(null)
  const [buscandoMapa, setBuscandoMapa] = useState(false)
  const [erroMapa, setErroMapa] = useState('')
  const [resultado, setResultado] = useState(inicialValida)
  const [erro, setErro] = useState('')
  const [consultando, setConsultando] = useState(false)
  const trava = useRef(false)
  const versao = useRef(0)
  const ultimaTentativa = useRef(inicialValida ? chaveCotacao(lojaId,destinoInicial,pontoFavorito(destinoInicial)) : '')
  const callbacks=useRef({onCotacao,onInvalidar})
  callbacks.current={onCotacao,onInvalidar}
  const assinatura=chaveCotacao(lojaId,destino,ponto)
  useEffect(() => () => { versao.current += 1 }, [])
  useEffect(() => {
    if (!automatico || editando || !lojaId || !enderecoCompleto(destino) || (ponto && !pontoConfirmado) || aguardarAte>Date.now() || ultimaTentativa.current===assinatura) return
    const timer = setTimeout(() => consultar({ preventDefault() {} }), 1200)
    return () => clearTimeout(timer)
  }, [automatico, editando, assinatura, pontoConfirmado, aguardarAte])
  useEffect(()=>{
    if(!aguardarAte)return
    const timer=setTimeout(()=>setAguardarAte(0),Math.max(0,aguardarAte-Date.now()))
    return()=>clearTimeout(timer)
  },[aguardarAte])
  useEffect(() => {
    if (!automatico || !resultado?.expira_em) return
    const timer=setTimeout(()=>{ callbacks.current.onInvalidar?.();setResultado(null);setErro('A cotação expirou. Clique em calcular para atualizar o frete.') },Math.max(0,Date.parse(resultado.expira_em)-Date.now()))
    return ()=>clearTimeout(timer)
  },[automatico,resultado])

  function alterar(campo, valor) {
    versao.current += 1
    onInvalidar?.()
    setDestino(anterior => ({ ...anterior, [campo]: valor }))
    if (campo !== 'complemento') { setPonto(null); setPontoConfirmado(false); setCentroMapa(null); setErroMapa('') }
    setResultado(null)
    setErro('')
  }

  async function buscarNoMapa() {
    if (consultando || buscandoMapa || origemPendente || aguardarAte>Date.now()) return
    onInvalidar?.()
    const atual = ++versao.current
    setBuscandoMapa(true)
    setErroMapa('')
    setResultado(null)
    try {
      const { data, error } = await clienteApi.functions.invoke('calcular-entrega', {
        body: { acao: 'sugerir_mapa', ...(portal ? { portal:true } : {}), loja_id: lojaId, destino },
      })
      if (error) {
        let mensagem = 'Não foi possível localizar a região. Mova o mapa manualmente.'
        try { const falha=await error.context?.json();mensagem=falha?.error || mensagem;if(falha?.tentar_em_segundos)setAguardarAte(Date.now()+falha.tentar_em_segundos*1000) } catch { /* resposta não JSON */ }
        throw new Error(mensagem)
      }
      if (!data?.apenas_centro || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
        throw new Error('O serviço não retornou um ponto confiável para centralizar o mapa.')
      }
      if (atual === versao.current) {
        setPonto(null)
        setPontoConfirmado(false)
        setCentroMapa({ latitude: data.latitude, longitude: data.longitude, precisao: data.precisao, seq: atual })
      }
    } catch (error) {
      if (atual === versao.current) setErroMapa(error.message)
    } finally { setBuscandoMapa(false) }
  }

  async function consultar(event) {
    event.preventDefault()
    if (trava.current || origemPendente || (ponto && !pontoConfirmado) || aguardarAte>Date.now()) return
    if(resultado && ultimaTentativa.current===assinatura && (!resultado.expira_em || Date.parse(resultado.expira_em)>Date.now()))return
    if(!enderecoCompleto(destino)){setErro('Preencha CEP, rua, número, bairro, cidade e UF antes de calcular.');return}
    ultimaTentativa.current=assinatura
    onInvalidar?.()
    trava.current = true
    const atual = ++versao.current
    setConsultando(true)
    setResultado(null)
    setErro('')
    try {
      // A tarifa e a origem são carregadas no servidor, nunca aceitas do navegador.
      const { data, error } = await clienteApi.functions.invoke('calcular-entrega', {
        body: { ...(modoPedido ? (portal ? { acao:'cotar_mobile',portal:true } : { acao: 'cotar_pedido', cliente_cpf: clienteCpf }) : {}),
          loja_id: lojaId, destino: { ...destino,
          ...(ponto ? { latitude: ponto.latitude, longitude: ponto.longitude } : {}) } },
      })
      if (error) {
        let mensagem = 'Não foi possível consultar a entrega. Tente novamente ou contate o responsável pela unidade.'
        try { const falha=await error.context?.json();mensagem=falha?.error || mensagem;if(falha?.tentar_em_segundos)setAguardarAte(Date.now()+falha.tentar_em_segundos*1000) } catch { /* erro de rede ou resposta não JSON */ }
        throw new Error(mensagem)
      }
      if (data?.error) throw new Error(data.error)
      if (!Number.isFinite(data?.taxa) || data.taxa<0 || !Number.isInteger(data?.distancia_metros) || data.distancia_metros<=0) throw new Error('Resposta de cálculo inválida.')
      if (modoPedido && (!data.cotacao_id || !Number.isFinite(Date.parse(data.expira_em)) || Date.parse(data.expira_em)<=Date.now())) throw new Error('O servidor não confirmou uma cotação válida. Calcule o frete novamente.')
      if (atual === versao.current) {
        setResultado(data)
        if (modoPedido) callbacks.current.onCotacao?.({ ...data, endereco: { ...destino, ...(data.ponto_destino || ponto || {}) } })
      }
    } catch (error) {
      if (atual === versao.current) setErro(error.message)
    } finally {
      trava.current = false
      setConsultando(false)
    }
  }

  function usarLocalizacao() {
    if(!navigator.geolocation){setErroMapa('Seu navegador não oferece localização. Preencha o endereço normalmente.');return}
    const atual=++versao.current
    setLocalizando(true);setErroMapa('');onInvalidar?.();setResultado(null)
    navigator.geolocation.getCurrentPosition(posicao=>{
      if(atual!==versao.current)return
      try {setPonto(pontoDoDispositivo(posicao.coords));setPontoConfirmado(false);setErro('')}
      catch(error){setErroMapa(error.message)}
      finally{setLocalizando(false)}
    },()=>{if(atual===versao.current){setLocalizando(false);setErroMapa('Não foi possível acessar a localização. Você pode usar o endereço ou ajustar o mapa.')}},{enableHighAccuracy:true,timeout:10000,maximumAge:0})
  }

  return (
    <section className="ui-form delivery-quote">
      <h2 className="font-display text-xl">{modoPedido ? 'Frete do pedido' : 'Consultar entrega'}</h2>
      <p className="text-sm text-fumaca my-3">{portal ? 'Preencha o CEP e o número, confira o endereço e saia dos campos. Calculamos o frete uma vez, quando tudo estiver pronto.' : 'Tarifa da unidade e distância pela rota de carro. Confirme o imóvel no mapa quando necessário.'}</p>
      {pontoSalvo && <p className="text-xs text-ambar mb-3">Origem: ponto salvo da unidade.</p>}
      <form onSubmit={consultar} onFocusCapture={()=>setEditando(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setEditando(false)}}>
        <fieldset disabled={consultando || buscandoMapa || localizando}>
          <legend className="text-sm mb-3">Endereço de destino</legend>
          <CamposEndereco valores={destino} onChange={alterar} />
          <div className="portal-inline-actions mt-3"><button type="button" onClick={usarLocalizacao} className="text-sm underline text-ambar">{localizando ? 'Localizando…' : 'Estou no endereço: usar minha localização'}</button>{portal && <button type="button" onClick={()=>setMostrarMapa(v=>!v)} className="text-sm underline text-ambar">{mostrarMapa ? 'Fechar mapa' : 'Ajustar localização no mapa'}</button>}</div>
          {mostrarMapa && <button type="button" onClick={buscarNoMapa} disabled={origemPendente || aguardarAte>Date.now()} className="text-sm underline text-ambar mt-3 disabled:opacity-50">
            {buscandoMapa ? 'Localizando região...' : 'Encontrar endereço no mapa'}
          </button>}
          {erroMapa && <p role="alert" className="text-sm text-brasa mt-2">{erroMapa}</p>}
          {centroMapa && <p role="status" className="text-xs text-ambar mt-2">
            {centroMapa.precisao === 'imovel'
              ? 'O serviço encontrou o imóvel. Tente calcular sem marcar um ponto.'
              : `Mapa centralizado na região ${centroMapa.precisao === 'cep' ? 'do CEP' : 'da rua'}. Clique no imóvel exato para confirmar; esta sugestão não será usada automaticamente na taxa.`}
          </p>}
          {mostrarMapa && <Suspense fallback={<p>Carregando mapa…</p>}><MapaPonto titulo="Ponto da entrega (destino)" ponto={ponto} centroSugerido={centroMapa} desabilitado={consultando || buscandoMapa}
            onChange={valor => { versao.current += 1; onInvalidar?.(); setPonto(valor); setPontoConfirmado(false); setCentroMapa(null); setResultado(null); setErro('') }} /></Suspense>}
          {ponto && <label className="flex items-start gap-2 text-xs text-ambar mt-3">
            <input type="checkbox" checked={pontoConfirmado} onChange={e => {onInvalidar?.();setResultado(null);setPontoConfirmado(e.target.checked)}} />
            Confirmo que esta localização corresponde ao endereço de entrega. Ela será usada no cálculo do frete.
          </label>}
          <p className="text-xs text-fumaca mt-3">A consulta de rota compartilha endereço e coordenadas com openrouteservice. Nome, CPF, telefone e complemento não são enviados.</p>
          {origemPendente && <p className="text-xs text-ambar mt-3">Salve as alterações da loja acima antes de consultar a rota.</p>}
          <button type="submit" disabled={origemPendente || (ponto && !pontoConfirmado) || aguardarAte>Date.now()} className="bg-ambar text-carvao px-4 py-2 mt-4 disabled:opacity-50">{consultando ? 'Consultando rota...' : aguardarAte>Date.now() ? 'Aguarde para consultar novamente' : modoPedido ? 'Calcular frete do pedido' : 'Calcular distância e taxa'}</button>
        </fieldset>
      </form>
      {erro && <div role="alert" className="mt-3 text-sm text-brasa">
        <p>{erro}</p>
        {erro.startsWith('Endereço da loja (origem):') && <p className="mt-2">Confira rua, número e CEP salvos na origem da unidade. Se a base gratuita não tiver o imóvel, marque o ponto correto da loja acima e salve.</p>}
        {erro.startsWith('Endereço de entrega (destino):') && <p className="mt-2">Confira rua, número e CEP do destino. Se a base gratuita não tiver o imóvel, marque o ponto correto da entrega no mapa.</p>}
      </div>}
      {resultado && (portal ? <div role="status" className="mt-4"><p className="text-lg text-ambar">Frete: {resultado.taxa.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><p className="text-xs text-fumaca">Cotação válida por 15 minutos · Rotas © openrouteservice / HeiGIT · © OpenStreetMap contributors</p></div> : (
        <div role="status" className="mt-4">
          <p className="text-sm">Origem consultada: {resultado.origem}</p>
          <p className="text-sm">Destino consultado: {resultado.destino}</p>
          {resultado.origem_localizada && <p className="text-sm">Origem localizada: {resultado.origem_localizada}</p>}
          {resultado.destino_localizado && <p className="text-sm">Destino localizado: {resultado.destino_localizado}</p>}
          <p className="text-sm text-ambar">Base do cálculo: loja por {resultado.origem_modo === 'ponto_marcado' ? 'ponto marcado' : 'endereço confirmado'}; entrega por {resultado.destino_modo === 'ponto_marcado' ? 'ponto marcado' : 'endereço confirmado'}.</p>
          <div className="border border-superficie2 p-3 mt-3 inline-flex items-center gap-4">
            <span>{(resultado.distancia_metros / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} km</span>
            <span className="text-sm text-white font-normal" translate="no">{resultado.provedor}</span>
          </div>
          <p className="text-xl text-ambar mt-3">Taxa calculada pela loja: {resultado.taxa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="text-sm">Tarifa aplicada: {resultado.valor_km.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/km</p>
          <p className="text-xs text-fumaca mt-2">Rota de carro, somente ida, sem trânsito em tempo real. {modoPedido ? 'Cotação válida por 15 minutos.' : 'Consulta sem lançamento no pedido.'}</p>
          {resultado.provedor === 'openrouteservice' && <p className="text-xs mt-3">Rotas: <a className="underline" href="https://openrouteservice.org/" target="_blank" rel="noreferrer">© openrouteservice / HeiGIT</a> · Dados: <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>}
        </div>
      ))}
    </section>
  )
}
