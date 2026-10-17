import { dinheiro, totalItemPedido } from '../lib/pedidoApresentacao.js'

export default function ItensPedido({ itens = [] }) {
  return <ul className="space-y-3">
    {itens.map(item => <li key={item.id} className="flex items-start justify-between gap-3 text-sm border-b border-borda pb-3">
      <div className="min-w-0">
        <p className="font-medium">{item.quantidade}× {item.produtos?.nome || item.produto_sku}</p>
        {item.produto_variacoes?.nome_variacao && <p className="text-xs text-fumaca">{item.produto_variacoes.nome_variacao}</p>}
        {(item.itens_pedido_adicionais || []).map(a => <p key={a.id || a.adicional_id} className="text-xs text-fumaca mt-1">
          + {a.quantidade}× {a.adicionais?.nome || 'Adicional'} · {dinheiro(Number(a.quantidade) * Number(a.preco_unitario))}
        </p>)}
      </div>
      <span className="shrink-0 font-medium tabular-nums">{dinheiro(totalItemPedido(item))}</span>
    </li>)}
  </ul>
}
