import Icon from './Icon.jsx'

export default function EmptyState({ titulo, descricao, acao }) {
  return (
    <div className="ui-empty text-center">
      <span className="ui-empty-icon"><Icon nome="busca" size={23} /></span>
      <p className="font-display text-lg text-texto">{titulo}</p>
      {descricao && <p className="text-sm text-fumaca mt-1">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}
