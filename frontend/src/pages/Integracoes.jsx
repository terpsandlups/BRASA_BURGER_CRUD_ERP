import PageHeader from '../components/layout/PageHeader.jsx'
import { Link } from 'react-router-dom'

const canais = [
  { nome: 'Canal próprio', estado: 'Ativo', texto: 'Pedidos no balcão, retirada e entrega. Solicitações do portal são confirmadas pela unidade.', link: '/solicitacoes', acao: 'Ver solicitações' },
  { nome: 'iFood', estado: 'Lançamento manual', texto: 'Registre a venda no PDV com o canal iFood. A taxa de entrega própria não é adicionada a pedidos do marketplace.', link: '/pedidos', acao: 'Abrir pedidos' },
  { nome: 'Goomer', estado: 'Integração planejada', texto: 'Conexão automática prevista para uma próxima etapa.' },
  { nome: 'Rappi', estado: 'Lançamento manual', texto: 'Registre a venda no PDV com o canal Rappi.', link: '/pedidos', acao: 'Abrir pedidos' },
]

export default function Integracoes() {
  return <><PageHeader titulo="Canais de venda" descricao="Operação própria e canais externos." icone="ajuste" />
    <div className="grid md:grid-cols-2 gap-5">{canais.map(c => <article key={c.nome} className="bg-branco border border-borda rounded-xl p-6"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl">{c.nome}</h2><span className="text-xs text-ambar border border-borda rounded-full px-3 py-1">{c.estado}</span></div><p className="text-sm text-fumaca mt-4 leading-relaxed">{c.texto}</p>{c.link && <Link to={c.link} className="inline-block text-sm text-ambar underline mt-5">{c.acao}</Link>}</article>)}</div>
  </>
}
