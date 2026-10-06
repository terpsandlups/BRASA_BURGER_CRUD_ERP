import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/AuthContext.jsx'
import CamposEndereco from '../components/CamposEndereco.jsx'
import ConsultaEntrega from '../components/ConsultaEntrega.jsx'
import MapaPonto from '../components/MapaPonto.jsx'
import { calcularTaxaEntrega, prepararConfiguracaoEntrega } from '../lib/entrega.js'

const vazio = { cep: '', numero: '', endereco: '', complemento: '', bairro: '', cidade: '', estado: '', valor_km: '1,50', latitude: null, longitude: null }
const input = 'w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso text-sm'
const moeda = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Entregas() {
  const { usuario } = useAuth()
  const [lojas, setLojas] = useState([])
  const [lojaId, setLojaId] = useState('')
  const [valores, setValores] = useState(vazio)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [distancia, setDistancia] = useState('')
  const [revisao, setRevisao] = useState(0)
  const [pronto, setPronto] = useState(false)
  const [versaoSalva, setVersaoSalva] = useState(0)
  const [pontoSalvo, setPontoSalvo] = useState(null)
  const [pontoLojaConfirmado, setPontoLojaConfirmado] = useState(false)
  const [alteracaoPendente, setAlteracaoPendente] = useState(false)
  const trava = useRef(false)
  const podeEditar = usuario?.ativo && ['Administrador', 'Gerente'].includes(usuario?.perfis?.nome)

  useEffect(() => {
    let atual = true
    if (!usuario) return () => { atual = false }
    let consulta = supabase.from('lojas').select('id,nome').eq('ativo', true).order('nome')
    if (usuario.loja_id) consulta = consulta.eq('id', usuario.loja_id)
    consulta.then(({ data, error }) => {
      if (!atual) return
      if (error) { setErro(error.message); setCarregando(false); return }
      setLojas(data || [])
      setLojaId(anterior => data?.some(loja => loja.id === anterior) ? anterior : data?.[0]?.id || '')
      if (!data?.length) setCarregando(false)
    }).catch(error => { if (atual) { setErro(error.message); setCarregando(false) } })
    return () => { atual = false }
  }, [usuario, revisao])

  useEffect(() => {
    let atual = true
    if (!lojaId) return () => { atual = false }
    setCarregando(true)
    setPronto(false)
    setErro('')
    setAviso('')
    setValores({ ...vazio })
    setPontoSalvo(null)
    setPontoLojaConfirmado(false)
    setAlteracaoPendente(false)
    setDistancia('')
    supabase.from('configuracoes_entrega').select('loja_id,cep,endereco,numero,complemento,bairro,cidade,estado,valor_km,latitude,longitude').eq('loja_id', lojaId).maybeSingle()
      .then(({ data, error }) => {
        if (!atual) return
        if (error) throw error
        setValores(data ? { ...data, valor_km: String(data.valor_km).replace('.', ',') } : { ...vazio })
        setPontoSalvo(data?.latitude != null && data?.longitude != null ? { latitude: data.latitude, longitude: data.longitude } : null)
        setPontoLojaConfirmado(data?.latitude != null && data?.longitude != null)
        setPronto(true)
        setCarregando(false)
        if (!data) setAviso('Esta loja ainda não tem configuração salva. R$ 1,50/km é uma sugestão inicial.')
      }).catch(error => {
        if (!atual) return
        setErro(['42P01', 'PGRST205'].includes(error.code)
          ? 'Configuração ainda não instalada. Execute sql/migration_configuracao_entrega.sql no Supabase e clique em Recarregar.'
          : `Não foi possível carregar a configuração: ${error.message}`)
        setCarregando(false)
      })
    return () => { atual = false }
  }, [lojaId, revisao])

  async function salvar(event) {
    event.preventDefault()
    if (trava.current || !podeEditar || !pronto) return
    trava.current = true
    setSalvando(true)
    setErro('')
    setAviso('')
    try {
      if (valores.latitude != null && !pontoLojaConfirmado) throw new Error('Confirme que o ponto da loja corresponde ao imóvel antes de salvar.')
      const dados = prepararConfiguracaoEntrega(valores)
      const { data, error } = await supabase.from('configuracoes_entrega')
        .upsert({ loja_id: lojaId, ...dados }, { onConflict: 'loja_id' }).select('loja_id').single()
      if (error) throw error
      if (!data) throw new Error('O banco não confirmou a gravação.')
      setPontoSalvo(dados.latitude != null ? { latitude: dados.latitude, longitude: dados.longitude } : null)
      setPontoLojaConfirmado(dados.latitude != null)
      setAlteracaoPendente(false)
      setVersaoSalva(v => v + 1)
      setAviso('Endereço e tarifa salvos. A cobrança automática nos pedidos ainda não está ativada.')
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar a configuração.')
    } finally {
      trava.current = false
      setSalvando(false)
    }
  }

  let taxa = null
  let erroSimulacao = ''
  if (distancia.trim()) {
    try { taxa = calcularTaxaEntrega(distancia, valores.valor_km) }
    catch (error) { erroSimulacao = error.message }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-carvao">Entregas por distância</h1>
      <p className="text-sm text-fumaca mt-2 mb-6">Endereço de saída e tarifa por unidade. Esta etapa configura e simula; não altera pedidos.</p>
      <label className="text-sm">Unidade
        <select aria-label="Unidade" value={lojaId} disabled={salvando || carregando} onChange={e => setLojaId(e.target.value)} className={input}>
          {!lojas.length && <option value="">Nenhuma unidade disponível</option>}
          {lojas.map(loja => <option key={loja.id} value={loja.id}>{loja.nome}</option>)}
        </select>
      </label>
      <button type="button" disabled={salvando || carregando} onClick={() => setRevisao(v => v + 1)} className="text-sm underline my-3">Recarregar</button>
      {erro && <p role="alert" className="text-brasa text-sm mb-4">{erro}</p>}
      {aviso && <p role="status" className="text-sm mb-4">{aviso}</p>}
      {carregando ? <p>Carregando configuração...</p> : pronto && (
        <>
          <form onSubmit={salvar} className="bg-carvao text-osso p-5">
            <h2 className="font-display text-xl mb-4">Origem da entrega</h2>
            <fieldset disabled={!podeEditar || salvando}>
              <CamposEndereco key={`${lojaId}-${revisao}`} valores={valores} onChange={(campo, valor) => {
                setAlteracaoPendente(true)
                if (campo !== 'complemento') setPontoLojaConfirmado(false)
                setValores(anterior => ({ ...anterior, [campo]: valor,
                  ...(campo === 'complemento' ? {} : { latitude: null, longitude: null }) }))
              }} />
              <label className="block text-sm mt-4">Valor por quilômetro (R$)
                <input value={valores.valor_km} onChange={e => { setAlteracaoPendente(true); setValores(anterior => ({ ...anterior, valor_km: e.target.value })) }} inputMode="decimal" className={input} required />
              </label>
              <MapaPonto titulo="Ponto da loja (origem)" ponto={valores.latitude != null ? { latitude: valores.latitude, longitude: valores.longitude } : null}
                desabilitado={!podeEditar || salvando} onChange={ponto => {
                  setAlteracaoPendente(true)
                  setPontoLojaConfirmado(false)
                  setValores(anterior => ({ ...anterior, latitude: ponto?.latitude ?? null, longitude: ponto?.longitude ?? null }))
                }} />
              {valores.latitude != null && podeEditar && <label className="flex items-start gap-2 text-xs text-ambar mt-3">
                <input type="checkbox" checked={pontoLojaConfirmado} onChange={e => setPontoLojaConfirmado(e.target.checked)} />
                Confirmo que este ponto é o imóvel da loja. O cálculo usará esta posição, mesmo se o endereço digitado for diferente.
              </label>}
              {alteracaoPendente && <p className="text-xs text-ambar mt-2">Alterações pendentes: salve a configuração antes de consultar uma rota.</p>}
              {podeEditar && <button className="bg-ambar text-carvao px-4 py-2 mt-4" type="submit">{salvando ? 'Salvando...' : 'Salvar configuração'}</button>}
            </fieldset>
            {!podeEditar && <p className="text-sm mt-3">Somente Administrador ou Gerente pode alterar esta configuração.</p>}
          </form>
          <ConsultaEntrega key={`${lojaId}-${revisao}-${versaoSalva}`} lojaId={lojaId}
            pontoSalvo={pontoSalvo} origemPendente={alteracaoPendente} />
          <section className="bg-carvao text-osso p-5 mt-5">
            <h2 className="font-display text-xl">Simular taxa — distância manual</h2>
            <p className="text-sm text-fumaca mt-2">Use a distância do trajeto pelas ruas, somente de ida. O CEP não calcula esse trajeto. A simulação usa a tarifa exibida acima, mesmo antes de salvar.</p>
            <label className="block text-sm mt-4">Distância em km
              <input value={distancia} onChange={e => setDistancia(e.target.value)} inputMode="decimal" placeholder="Ex.: 3,5" className={input} />
            </label>
            {erroSimulacao && <p role="alert" className="text-sm mt-3">{erroSimulacao}</p>}
            {taxa !== null && <p role="status" className="text-2xl text-ambar mt-3">Taxa simulada: {moeda(taxa)}</p>}
            <p className="text-xs text-fumaca mt-3">Proporcional aos quilômetros, arredondada ao centavo no final. Sem taxa mínima, ida e volta ou integração com marketplaces nesta etapa.</p>
          </section>
        </>
      )}
    </div>
  )
}
