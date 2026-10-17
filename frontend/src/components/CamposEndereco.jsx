import { useEffect, useId, useRef, useState } from 'react'
import { buscarCEP, formatarCEP } from '../lib/cep.js'

export default function CamposEndereco({ valores, onChange }) {
  const id = useId()
  const [buscando, setBuscando] = useState(false)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const cepInputRef = useRef(null)
  const consultaAtualRef = useRef(0)

  useEffect(() => () => { consultaAtualRef.current += 1 }, [])

  // Corrige o cursor pulando de posição quando o "-" é inserido sozinho
  useEffect(() => {
    if (cepInputRef.current && document.activeElement === cepInputRef.current) {
      const pos = (valores.cep || '').length
      cepInputRef.current.setSelectionRange(pos, pos)
    }
  }, [valores.cep])

  async function handleCepChange(valorDigitado) {
    const consulta = ++consultaAtualRef.current
    const formatado = formatarCEP(valorDigitado)
    onChange('cep', formatado)
    setNaoEncontrado(false)
    setBuscando(false)

    if (formatado.replace(/\D/g, '').length === 8) {
      setBuscando(true)
      const resultado = await buscarCEP(formatado)
      // Uma resposta antiga não pode substituir o CEP mais recente.
      if (consulta !== consultaAtualRef.current) return
      setBuscando(false)
      if (resultado) {
        onChange('endereco', resultado.logradouro)
        onChange('bairro', resultado.bairro)
        onChange('cidade', resultado.cidade)
        onChange('estado', resultado.estado)
      } else {
        setNaoEncontrado(true)
      }
    }
  }

  const inputClass = 'w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar text-sm'
  const labelClass = 'text-xs uppercase tracking-wide text-fumaca'

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor={`${id}-cep`} className={labelClass}>CEP</label>
        <input
          id={`${id}-cep`} inputMode="numeric" aria-busy={buscando}
          ref={cepInputRef}
          value={valores.cep || ''}
          onChange={(e) => handleCepChange(e.target.value)}
          placeholder="00000-000"
          maxLength={10}
          className={inputClass}
          autoComplete="off"
        />
        {buscando && <p className="text-[11px] text-fumaca mt-1">Buscando endereço...</p>}
        {naoEncontrado && <p className="text-[11px] text-brasa mt-1">CEP não encontrado — preencha manualmente.</p>}
      </div>
      <div>
        <label htmlFor={`${id}-numero`} className={labelClass}>Número</label>
        <input
          id={`${id}-numero`}
          value={valores.numero || ''}
          onChange={(e) => onChange('numero', e.target.value)}
          className={inputClass}
          autoComplete="off"
        />
      </div>
      <div className="col-span-2">
        <label htmlFor={`${id}-rua`} className={labelClass}>Rua / Avenida</label>
        <input
          id={`${id}-rua`}
          value={valores.endereco || ''}
          onChange={(e) => onChange('endereco', e.target.value)}
          className={inputClass}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor={`${id}-complemento`} className={labelClass}>Complemento</label>
        <input
          id={`${id}-complemento`}
          value={valores.complemento || ''}
          onChange={(e) => onChange('complemento', e.target.value)}
          placeholder="Apto, bloco, referência..."
          className={inputClass}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor={`${id}-bairro`} className={labelClass}>Bairro</label>
        <input
          id={`${id}-bairro`}
          value={valores.bairro || ''}
          onChange={(e) => onChange('bairro', e.target.value)}
          className={inputClass}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor={`${id}-cidade`} className={labelClass}>Cidade</label>
        <input
          id={`${id}-cidade`}
          value={valores.cidade || ''}
          onChange={(e) => onChange('cidade', e.target.value)}
          className={inputClass}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor={`${id}-uf`} className={labelClass}>UF</label>
        <input
          id={`${id}-uf`}
          value={valores.estado || ''}
          onChange={(e) => onChange('estado', e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          className={inputClass}
          autoComplete="off"
        />
      </div>
    </div>
  )
}
