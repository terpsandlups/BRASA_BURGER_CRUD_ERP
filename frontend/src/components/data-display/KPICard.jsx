export default function KPICard({ titulo, valor, variacao, contexto }) {
  return (
    <div className="bg-branco border border-borda p-5">
      <p className="text-[11px] uppercase tracking-wide text-fumaca">{titulo}</p>
      <p className="font-display text-3xl text-texto mt-1">{valor}</p>
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
