import { useEffect, useRef, useState } from 'react'
import CamposEndereco from './CamposEndereco.jsx'
import MapaPonto from './MapaPonto.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function ConsultaEntrega({ lojaId, pontoSalvo, origemPendente }) {
  const [destino, setDestino] = useState({})
  const [ponto, setPonto] = useState(null)
  const [pontoConfirmado, setPontoConfirmado] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [consultando, setConsultando] = useState(false)
  const trava = useRef(false)
  const versao = useRef(0)
  useEffect(() => () => { versao.current += 1 }, [])

  function alterar(campo, valor) {
    versao.current += 1
    setDestino(anterior => ({ ...anterior, [campo]: valor }))
    if (campo !== 'complemento') { setPonto(null); setPontoConfirmado(false) }
    setResultado(null)
    setErro('')
  }

  async function consultar(event) {
    event.preventDefault()
    if (trava.current || origemPendente || (ponto && !pontoConfirmado)) return
    trava.current = true
    const atual = ++versao.current
    setConsultando(true)
    setResultado(null)
    setErro('')
    try {
      // A tarifa e a origem são carregadas no servidor, nunca aceitas do navegador.
      const { data, error } = await supabase.functions.invoke('calcular-entrega', {
        body: { loja_id: lojaId, destino: { ...destino,
          ...(ponto ? { latitude: ponto.latitude, longitude: ponto.longitude } : {}) } },
      })
      if (error) {
        let mensagem = 'Não foi possível consultar. Confira se a função calcular-entrega foi publicada e configurada no Supabase.'
        try { mensagem = (await error.context?.json())?.error || mensagem } catch { /* erro de rede ou resposta não JSON */ }
        throw new Error(mensagem)
      }
      if (data?.error) throw new Error(data.error)
      if (!Number.isFinite(data?.taxa) || !Number.isInteger(data?.distancia_metros)) throw new Error('Resposta de cálculo inválida.')
      if (atual === versao.current) setResultado(data)
    } catch (error) {
      if (atual === versao.current) setErro(error.message)
    } finally {
      trava.current = false
      setConsultando(false)
    }
  }

  return (
    <section className="bg-carvao text-osso p-5 mt-5">
      <h2 className="font-display text-xl">Calcular pelas ruas — plano gratuito</h2>
      <p className="text-sm text-fumaca my-3">Para entregas próprias. O CEP preenche rua e cidade, mas não identifica o imóvel no mapa. Usamos a origem e a tarifa já salvas da loja.</p>
      <p className="text-xs text-fumaca mb-3">Sem ponto marcado, tentamos localizar cada endereço completo. Se houver ponto, a rota usa sua posição — não o endereço digitado — daquele lado do trajeto.</p>
      {pontoSalvo && <p className="text-xs text-ambar mb-3">A origem desta loja está marcada no mapa e será usada no cálculo. Confira o endereço salvo da loja antes de simular.</p>}
      <form onSubmit={consultar}>
        <fieldset disabled={consultando}>
          <legend className="text-sm mb-3">Endereço de destino</legend>
          <CamposEndereco valores={destino} onChange={alterar} />
          <MapaPonto titulo="Ponto da entrega (destino)" ponto={ponto} desabilitado={consultando}
            onChange={valor => { versao.current += 1; setPonto(valor); setPontoConfirmado(false); setResultado(null); setErro('') }} />
          {ponto && <label className="flex items-start gap-2 text-xs text-ambar mt-3">
            <input type="checkbox" checked={pontoConfirmado} onChange={e => setPontoConfirmado(e.target.checked)} />
            Confirmo que o ponto marcado é o imóvel de entrega informado. Sei que o ponto, não o CEP, será usado na distância.
          </label>}
          <p className="text-xs text-fumaca mt-3">O openrouteservice recebe os endereços que precisar localizar e as coordenadas dos pontos marcados. Não enviamos nome, CPF, telefone ou complemento. Sujeito às cotas gratuitas.</p>
          {origemPendente && <p className="text-xs text-ambar mt-3">Salve as alterações da loja acima antes de consultar a rota.</p>}
          <button type="submit" disabled={origemPendente || (ponto && !pontoConfirmado)} className="bg-ambar text-carvao px-4 py-2 mt-4 disabled:opacity-50">{consultando ? 'Consultando rota...' : 'Calcular distância e taxa'}</button>
        </fieldset>
      </form>
      {erro && <div role="alert" className="mt-3 text-sm text-brasa">
        <p>{erro}</p>
        {erro.startsWith('Endereço da loja (origem):') && <p className="mt-2">Confira rua, número e CEP salvos na origem da unidade. Se a base gratuita não tiver o imóvel, marque o ponto correto da loja acima e salve.</p>}
        {erro.startsWith('Endereço de entrega (destino):') && <p className="mt-2">Confira rua, número e CEP do destino. Se a base gratuita não tiver o imóvel, marque o ponto correto da entrega no mapa.</p>}
      </div>}
      {resultado && (
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
          <p className="text-xs text-fumaca mt-2">Rota de carro, somente ida, sem trânsito em tempo real. Pode diferir do percurso de moto. Simulação: não adicionada ao pedido.</p>
          {resultado.provedor === 'openrouteservice' && <p className="text-xs mt-3">Rotas: <a className="underline" href="https://openrouteservice.org/" target="_blank" rel="noreferrer">© openrouteservice / HeiGIT</a> · Dados: <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>}
        </div>
      )}
    </section>
  )
}
