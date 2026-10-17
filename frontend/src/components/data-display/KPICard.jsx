import Icon from '../ui/Icon.jsx'

export default function KPICard({ titulo, valor, variacao, contexto, icone = 'analytics', alerta = false }) {
  return (
    <div className={`ui-kpi${alerta ? ' is-warning' : ''}`}>
      <p className="ui-kpi-label"><Icon nome={icone} size={15} />{titulo}</p>
      <p className="ui-kpi-value">{valor}</p>
      {variacao && (
        <p className={`text-xs mt-1.5 ${variacao.positiva ? 'text-oliva' : 'text-brasa'}`}>
          {variacao.positiva ? '↑' : '↓'} {variacao.texto}
        </p>
      )}
      {contexto && <p className="ui-kpi-context">{contexto}</p>}
    </div>
  )
}
