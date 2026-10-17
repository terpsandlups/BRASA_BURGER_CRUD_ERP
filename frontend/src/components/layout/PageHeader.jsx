import Icon from '../ui/Icon.jsx'

export default function PageHeader({ titulo, descricao, acaoPrincipal, acoesSecundarias, icone = 'painel' }) {
  return (
    <div className="page-heading flex items-start justify-between mb-6 flex-wrap gap-3">
      <div className="page-heading-copy">
        <span className="page-heading-icon"><Icon nome={icone} size={21} /></span>
        <div>
          <h1 className="font-display text-3xl text-texto">{titulo}</h1>
          {descricao && <p className="text-sm text-fumaca mt-1">{descricao}</p>}
        </div>
      </div>
      <div className="page-actions">
        {acoesSecundarias}
        {acaoPrincipal}
      </div>
    </div>
  )
}
