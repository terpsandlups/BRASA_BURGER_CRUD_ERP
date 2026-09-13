export default function PageHeader({ titulo, descricao, acaoPrincipal, acoesSecundarias }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="font-display text-3xl text-texto">{titulo}</h1>
        {descricao && <p className="text-sm text-fumaca mt-1">{descricao}</p>}
      </div>
      <div className="flex items-center gap-2">
        {acoesSecundarias}
        {acaoPrincipal}
      </div>
    </div>
  )
}
