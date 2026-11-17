export function imagemPublica(valor) {
  const texto = String(valor || '').trim()
  if (!texto) return ''
  try {
    const url = new URL(texto)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
  } catch { return '' }
}

const categoriasPiloto = [
  [/^(LAN|ART|SM|MSB|ESP|SAND)/, 'Lanches', 10],
  [/^(BAT|POR|CRO)/, 'Acompanhamentos', 20],
  [/^(BEB|CERV|CHOPP)/, 'Bebidas', 30],
  [/^(COO|SOB)/, 'Sobremesas', 40],
]

// Compatibilidade com o catálogo publicado do piloto, que ainda não retorna
// categorias. A categoria configurada pela empresa sempre tem prioridade.
export function prepararCatalogoPublico(itens, marca) {
  return itens.map(item => {
    if (marca !== 'brasa-burger' || (item.categoria && item.categoria !== 'Outros')) return item
    const familia = categoriasPiloto.find(([padrao]) => padrao.test(String(item.sku || '').toUpperCase()))
    return familia ? {...item, categoria:familia[1], categoria_ordem:familia[2]} : item
  })
}

export function iconeCategoria(categoria) {
  const nome = String(categoria || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/bebida|cerveja|chopp/.test(nome)) return 'bebida'
  if (/acompanhamento|porcao|batata|entrada/.test(nome)) return 'batata'
  if (/sobremesa|doce/.test(nome)) return 'sobremesa'
  if (/prato|executivo/.test(nome)) return 'prato'
  return 'produto'
}

export function agruparCatalogoPublico(itens, tipo) {
  return categoriasPublicas(itens,tipo).map(categoria => ({
    categoria, itens:itens.filter(item => item[tipo] && (item.categoria || 'Outros') === categoria),
  }))
}

export function categoriasPublicas(itens, tipo) {
  const categorias = new Map()
  for (const item of itens) {
    if (!item[tipo]) continue
    const nome = item.categoria || 'Outros'
    categorias.set(nome, Math.min(categorias.get(nome) ?? Infinity, Number(item.categoria_ordem) || 0))
  }
  return [...categorias].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'pt-BR')).map(([nome]) => nome)
}

export function filtrarCatalogoPublico(itens, { tipo, categoria = 'todos', busca = '' }) {
  const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const termo = normalizar(busca.trim())
  return itens.filter(item => item[tipo] &&
    (categoria === 'todos' || (categoria === 'destaques' ? item.destaque : (item.categoria || 'Outros') === categoria)) &&
    normalizar(`${item.nome} ${item.variacao} ${item.descricao || ''}`).includes(termo))
}
