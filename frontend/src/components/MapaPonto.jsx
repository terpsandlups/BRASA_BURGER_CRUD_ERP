import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const centroInicial = [-23.185, -46.93] // Jundiaí; não representa o endereço de uma loja.

export default function MapaPonto({ titulo, ponto, onChange, centroSugerido = null, desabilitado = false }) {
  const container = useRef(null)
  const mapa = useRef(null)
  const marcador = useRef(null)
  const aoMudar = useRef(onChange)
  const bloqueado = useRef(desabilitado)
  const [aviso, setAviso] = useState('')
  aoMudar.current = onChange
  bloqueado.current = desabilitado

  useEffect(() => {
    if (!container.current) return undefined
    const instancia = L.map(container.current, { scrollWheelZoom: false })
      .setView(ponto ? [Number(ponto.latitude), Number(ponto.longitude)] : centroInicial, ponto ? 17 : 13)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(instancia)
    instancia.on('click', evento => {
      if (bloqueado.current) return
      const latitude = Number(evento.latlng.lat.toFixed(6))
      const longitude = Number(evento.latlng.lng.toFixed(6))
      if (latitude < -34 || latitude > 6 || longitude < -74 || longitude > -34) {
        setAviso('Marque um ponto no Brasil.')
        return
      }
      setAviso('')
      aoMudar.current({ latitude, longitude })
    })
    mapa.current = instancia
    return () => { instancia.remove(); mapa.current = null; marcador.current = null }
  }, [])

  useEffect(() => {
    if (!mapa.current) return
    const latitude = Number(ponto?.latitude)
    const longitude = Number(ponto?.longitude)
    if (!ponto || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      if (marcador.current) { marcador.current.remove(); marcador.current = null }
      return
    }
    const posicao = [latitude, longitude]
    if (!marcador.current) {
      marcador.current = L.circleMarker(posicao, { radius: 9, color: '#fff', weight: 2, fillColor: '#df722b', fillOpacity: 1 }).addTo(mapa.current)
    } else marcador.current.setLatLng(posicao)
    mapa.current.setView(posicao, Math.max(mapa.current.getZoom(), 17))
  }, [ponto?.latitude, ponto?.longitude])

  useEffect(() => {
    if (!mapa.current || !centroSugerido) return
    const { latitude, longitude, precisao } = centroSugerido
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      mapa.current.setView([latitude, longitude], precisao === 'cep' ? 15 : 17)
    }
  }, [centroSugerido])

  return (
    <div className="mt-4">
      <p className="text-sm mb-2">{titulo}</p>
      <p className="text-xs text-fumaca mb-2">Amplie o mapa e clique no imóvel correto. O ponto marcado será usado no cálculo, mesmo que o endereço digitado seja diferente.</p>
      <div ref={container} className="w-full border border-superficie2" style={{ height: 280 }} aria-label={titulo} />
      {aviso && <p role="alert" className="text-sm text-brasa mt-2">{aviso}</p>}
      {ponto ? (
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span>Ponto selecionado: {Number(ponto.latitude).toFixed(6)}, {Number(ponto.longitude).toFixed(6)}</span>
          {!desabilitado && <button type="button" className="underline" onClick={() => onChange(null)}>Remover ponto</button>}
        </div>
      ) : <p className="text-xs text-fumaca mt-2">Nenhum ponto selecionado. O sistema tentará localizar o endereço pelos campos acima.</p>}
    </div>
  )
}
