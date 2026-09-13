const ESTADOS = {
  ativo: 'bg-oliva/10 text-oliva border-oliva/30',
  sucesso: 'bg-oliva/10 text-oliva border-oliva/30',
  em_preparo: 'bg-ambar/10 text-ambar border-ambar/30',
  pronto: 'bg-ambar/10 text-ambar border-ambar/30',
  atencao: 'bg-atencao/10 text-atencao border-atencao/30',
  atrasado: 'bg-brasa/10 text-brasa border-brasa/30',
  erro: 'bg-brasa/10 text-brasa border-brasa/30',
  inativo: 'bg-fumaca/10 text-fumaca border-fumaca/30',
  neutro: 'bg-fumaca/10 text-fumaca border-fumaca/30',
}

export default function StatusBadge({ estado = 'neutro', children }) {
  return (
    <span className={`inline-flex items-center text-[11px] uppercase tracking-wide px-2 py-0.5 border ${ESTADOS[estado] || ESTADOS.neutro}`}>
      {children}
    </span>
  )
}
