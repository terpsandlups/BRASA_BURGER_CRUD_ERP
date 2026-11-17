import Icon from './ui/Icon.jsx'
import { dinheiro } from '../lib/pedidoApresentacao.js'
import { totalCarrinho } from '../lib/portalCliente.js'
import { iconeCategoria } from '../lib/catalogoPublico.js'

export default function ResumoPedidoPortal({itens,unidade,tipo,cotacao,editar=false,bloqueado=false,onQuantidade}) {
  const subtotal=totalCarrinho(itens)
  return <section className="portal-order-summary" aria-label="Resumo do pedido">
    <div className="portal-summary-heading"><Icon nome="sacola" size={22} /><div><h2>Seu pedido</h2><p>{unidade?.nome || 'Selecione uma unidade'} · {tipo === 'delivery' ? 'Entrega' : 'Retirada'}</p></div></div>
    <div className="portal-cart-items">{itens.map(i=><article className="portal-cart-item" key={i.chave}>
      <span className={`portal-cart-icon food-${iconeCategoria(i.categoria)}`}><Icon nome={iconeCategoria(i.categoria)} size={26} /></span>
      <div className="portal-cart-item-copy"><h3>{i.nome}</h3><p>{i.variacao}{i.extras.length ? ` · ${i.extras.map(a=>a.nome).join(', ')}` : ''}</p><strong>{dinheiro(totalCarrinho([i]))}</strong></div>
      {editar ? <div className="portal-quantity"><button type="button" disabled={bloqueado} aria-label={`Diminuir ${i.nome}, ${i.variacao}`} onClick={()=>onQuantidade(i,-1)}>−</button><span>{i.quantidade}</span><button type="button" disabled={bloqueado || i.quantidade>=99} aria-label={`Aumentar ${i.nome}, ${i.variacao}`} onClick={()=>onQuantidade(i,1)}>+</button></div> : <span className="portal-item-amount">{i.quantidade}×</span>}
    </article>)}</div>
    <dl className="portal-totals"><div><dt>Subtotal dos itens</dt><dd>{dinheiro(subtotal)}</dd></div><div><dt>{tipo === 'delivery' ? 'Entrega' : 'Retirada na loja'}</dt><dd>{tipo !== 'delivery' ? 'Sem frete' : cotacao ? dinheiro(cotacao.taxa) : 'A calcular'}</dd></div><div className="portal-grand-total"><dt>{tipo === 'delivery' && !cotacao ? 'Subtotal sem frete' : 'Total'}</dt><dd>{dinheiro(subtotal+Number(cotacao?.taxa || 0))}</dd></div></dl>
  </section>
}
