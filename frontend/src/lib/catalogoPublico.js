export function imagemPublica(valor) {
  const texto = String(valor || '').trim()
  if (!texto) return ''
  try {
    const url = new URL(texto)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
  } catch { return '' }
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
