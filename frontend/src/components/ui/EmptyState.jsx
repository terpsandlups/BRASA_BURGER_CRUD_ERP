export default function EmptyState({ titulo, descricao, acao }) {
  return (
    <div className="text-center py-16">
      <p className="font-display text-lg text-texto">{titulo}</p>
      {descricao && <p className="text-sm text-fumaca mt-1">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}
