import { useEffect, useRef, useState } from 'react'
import CamposEndereco from './CamposEndereco.jsx'
import MapaPonto from './MapaPonto.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function ConsultaEntrega({ lojaId, pontoSalvo, origemPendente, modoPedido = false,
  clienteCpf = '', destinoInicial = {}, onCotacao, onInvalidar, portal = false, automatico = false }) {
  const [destino, setDestino] = useState(destinoInicial)
  const [ponto, setPonto] = useState(null)
  const [pontoConfirmado, setPontoConfirmado] = useState(false)
  const [centroMapa, setCentroMapa] = useState(null)
  const [buscandoMapa, setBuscandoMapa] = useState(false)
  const [erroMapa, setErroMapa] = useState('')
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [consultando, setConsultando] = useState(false)
  const trava = useRef(false)
  const versao = useRef(0)
  useEffect(() => () => { versao.current += 1 }, [])
  useEffect(() => {
    if (!automatico || !lojaId || !/^\d{8}$/.test(String(destino.cep || '').replace(/\D/g,'')) || ['cep','endereco','numero','bairro','cidade','estado'].some(c => !String(destino[c] || '').trim()) || (ponto && !pontoConfirmado)) return
    const timer = setTimeout(() => consultar({ preventDefault() {} }), 1000)
    return () => clearTimeout(timer)
  }, [automatico, lojaId, destino, ponto, pontoConfirmado])
  useEffect(() => {
    if (!automatico || !resultado?.expira_em) return
    const timer=setTimeout(()=>{ onInvalidar?.();setResultado(null);setDestino(d=>({...d})) },Math.max(0,Date.parse(resultado.expira_em)-Date.now()))
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
    if (consultando || buscandoMapa || origemPendente) return
    onInvalidar?.()
    const atual = ++versao.current
    setBuscandoMapa(true)
    setErroMapa('')
    setResultado(null)
    try {
      const { data, error } = await supabase.functions.invoke('calcular-entrega', {
        body: { acao: 'sugerir_mapa', ...(portal ? { portal:true } : {}), loja_id: lojaId, destino },
      })
      if (error) {
        let mensagem = 'Não foi possível localizar a região. Mova o mapa manualmente.'
        try { mensagem = (await error.context?.json())?.error || mensagem } catch { /* resposta não JSON */ }
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
    if (trava.current || origemPendente || (ponto && !pontoConfirmado)) return
    onInvalidar?.()
    trava.current = true
    const atual = ++versao.current
    setConsultando(true)
    setResultado(null)
    setErro('')
    try {
      // A tarifa e a origem são carregadas no servidor, nunca aceitas do navegador.
      const { data, error } = await supabase.functions.invoke('calcular-entrega', {
        body: { ...(modoPedido ? (portal ? { acao:'cotar_mobile',portal:true } : { acao: 'cotar_pedido', cliente_cpf: clienteCpf }) : {}),
          loja_id: lojaId, destino: { ...destino,
          ...(ponto ? { latitude: ponto.latitude, longitude: ponto.longitude } : {}) } },
      })
      if (error) {
        let mensagem = 'Não foi possível consultar a entrega. Tente novamente ou contate o responsável pela unidade.'
        try { mensagem = (await error.context?.json())?.error || mensagem } catch { /* erro de rede ou resposta não JSON */ }
        throw new Error(mensagem)
      }
      if (data?.error) throw new Error(data.error)
      if (!Number.isFinite(data?.taxa) || !Number.isInteger(data?.distancia_metros)) throw new Error('Resposta de cálculo inválida.')
      if (modoPedido && (!data.cotacao_id || !data.expira_em)) throw new Error('O servidor não confirmou a cotação do pedido.')
      if (atual === versao.current) {
        setResultado(data)
        if (modoPedido) onCotacao?.({ ...data, endereco: { ...destino } })
      }
    } catch (error) {
      if (atual === versao.current) setErro(error.message)
    } finally {
      trava.current = false
      setConsultando(false)
    }
  }

  return (
    <section className="ui-form delivery-quote">
      <h2 className="font-display text-xl">{modoPedido ? 'Frete do pedido' : 'Consultar entrega'}</h2>
      <p className="text-sm text-fumaca my-3">{portal ? 'Preencha o endereço. O frete será calculado automaticamente.' : 'Tarifa da unidade e distância pela rota de carro. Confirme o imóvel no mapa quando necessário.'}</p>
      {pontoSalvo && <p className="text-xs text-ambar mb-3">Origem: ponto salvo da unidade.</p>}
      <form onSubmit={consultar}>
        <fieldset disabled={consultando || buscandoMapa}>
          <legend className="text-sm mb-3">Endereço de destino</legend>
          <CamposEndereco valores={destino} onChange={alterar} />
          {(!portal || erro) && <button type="button" onClick={buscarNoMapa} disabled={origemPendente} className="text-sm underline text-ambar mt-3 disabled:opacity-50">
            {buscandoMapa ? 'Localizando região...' : 'Encontrar endereço no mapa'}
          </button>}
          {erroMapa && <p role="alert" className="text-sm text-brasa mt-2">{erroMapa}</p>}
          {centroMapa && <p role="status" className="text-xs text-ambar mt-2">
            {centroMapa.precisao === 'imovel'
              ? 'O serviço encontrou o imóvel. Tente calcular sem marcar um ponto.'
              : `Mapa centralizado na região ${centroMapa.precisao === 'cep' ? 'do CEP' : 'da rua'}. Clique no imóvel exato para confirmar; esta sugestão não será usada automaticamente na taxa.`}
          </p>}
          {(!portal || erro || centroMapa || ponto) && <MapaPonto titulo="Ponto da entrega (destino)" ponto={ponto} centroSugerido={centroMapa} desabilitado={consultando || buscandoMapa}
            onChange={valor => { versao.current += 1; onInvalidar?.(); setPonto(valor); setPontoConfirmado(false); setCentroMapa(null); setResultado(null); setErro('') }} />}
          {ponto && <label className="flex items-start gap-2 text-xs text-ambar mt-3">
            <input type="checkbox" checked={pontoConfirmado} onChange={e => {onInvalidar?.();setResultado(null);setPontoConfirmado(e.target.checked)}} />
            Confirmo que o ponto marcado é o imóvel de entrega informado. Sei que o ponto, não o CEP, será usado na distância.
          </label>}
          <p className="text-xs text-fumaca mt-3">A consulta de rota compartilha endereço e coordenadas com openrouteservice. Nome, CPF, telefone e complemento não são enviados.</p>
          {origemPendente && <p className="text-xs text-ambar mt-3">Salve as alterações da loja acima antes de consultar a rota.</p>}
          <button type="submit" disabled={origemPendente || (ponto && !pontoConfirmado)} className="bg-ambar text-carvao px-4 py-2 mt-4 disabled:opacity-50">{consultando ? 'Consultando rota...' : modoPedido ? 'Calcular frete do pedido' : 'Calcular distância e taxa'}</button>
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
