export default function KPICard({ titulo, valor, variacao, contexto }) {
  return (
    <div className="bg-branco border border-borda rounded-xl p-4 sm:p-5 min-w-0 h-full">
      <p className="text-[11px] uppercase tracking-wide text-fumaca">{titulo}</p>
      <p className="font-display text-2xl sm:text-3xl text-texto mt-1 tabular-nums break-words">{valor}</p>
      {variacao && (
        <p className={`text-xs mt-1.5 ${variacao.positiva ? 'text-oliva' : 'text-brasa'}`}>
          {variacao.positiva ? '↑' : '↓'} {variacao.texto}
        </p>
      )}
      {contexto && (
        <>
          <div className="border-t border-borda mt-3 pt-2">
            <p className="text-xs text-fumaca">{contexto}</p>
          </div>
        </>
      )}
    </div>
  )
}
