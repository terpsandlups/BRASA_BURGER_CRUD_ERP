import { useState } from 'react'
import Icon from './ui/Icon.jsx'
import { dinheiro } from '../lib/pedidoApresentacao.js'
import { imagemPublica } from '../lib/catalogoPublico.js'

export function ImagemProduto({ produto, grande = false }) {
  const [falhou, setFalhou] = useState(false)
  const url = imagemPublica(produto.imagem_url)
  const categoria = (produto.categoria || '').toLocaleLowerCase('pt-BR')
  const ilustracao = /lanche|hamb[uú]rguer|combo/.test(categoria) ? 'burger' : /bebida/.test(categoria) ? 'bebida' : /sobremesa/.test(categoria) ? 'sobremesa' : /executivo|prato/.test(categoria) ? 'executivo' : null
  return <div className={`portal-product-image ${grande ? 'is-large' : ''}`}>
    {url && !falhou ? <img src={url} alt={produto.nome} loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
      : ilustracao ? <><img src={`${import.meta.env.BASE_URL}imagens/cardapio/${ilustracao}.webp`} alt={`Ilustração da categoria ${produto.categoria}`} loading="lazy" /><span>Imagem ilustrativa</span></>
        : <Icon nome="produto" size={grande ? 56 : 34} />}
  </div>
}

export default function ProdutoPortal({ produto, onAdicionar, onDetalhar, desabilitado }) {
  return <article className="portal-product">
    <button type="button" className="portal-product-main" onClick={() => onDetalhar(produto)} aria-label={`Ver detalhes de ${produto.nome}, ${produto.variacao}`}>
      <ImagemProduto key={`${produto.id}:${produto.imagem_url || ''}`} produto={produto} />
      <div className="portal-product-copy">{produto.destaque && <span className="portal-badge">Destaque da casa</span>}<h3>{produto.nome}</h3><p>{produto.descricao || produto.variacao}</p>{produto.descricao && <small>{produto.variacao}</small>}</div>
    </button>
    <div className="portal-product-bottom"><strong>{dinheiro(produto.preco)}</strong><button type="button" disabled={desabilitado} className="portal-add" onClick={() => produto.adicionais.length ? onDetalhar(produto) : onAdicionar(produto, [])} aria-label={`Adicionar ${produto.nome}, ${produto.variacao}`}><Icon nome="mais" size={18} /><span>Adicionar</span></button></div>
  </article>
}

export function DetalheProduto({ produto, onAdicionar, desabilitado }) {
  const [extras, setExtras] = useState([])
  const total = Number(produto.preco) + extras.reduce((s, a) => s + Number(a.preco), 0)
  return <div className="portal-product-detail">
    <ImagemProduto produto={produto} grande />
    <p className="portal-eyebrow">{produto.categoria || 'Cardápio'} · {produto.variacao}</p>
    <h2>{produto.nome}</h2>{produto.descricao && <p>{produto.descricao}</p>}
    {produto.adicionais.length > 0 && <fieldset disabled={desabilitado} className="portal-extras"><legend>Deixe do seu jeito</legend>{produto.adicionais.map(a => <label key={a.id}><input type="checkbox" checked={extras.some(e => e.id === a.id)} onChange={e => setExtras(prev => e.target.checked ? [...prev, a] : prev.filter(x => x.id !== a.id))} /><span>{a.nome}</span><strong>+ {dinheiro(a.preco)}</strong></label>)}</fieldset>}
    <button disabled={desabilitado} type="button" className="portal-primary" onClick={() => onAdicionar(produto, extras)}>Adicionar ao pedido · {dinheiro(total)}</button>
    {desabilitado && <p className="text-sm text-fumaca">Selecione a unidade e o atendimento no cardápio para adicionar.</p>}
  </div>
}
