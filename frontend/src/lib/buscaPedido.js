export function interpretarBuscaPedido(valor) {
  const termo = valor.trim().replace(/^#/, '')
  if (!termo) return { tipo: 'vazio', valor: '' }
  if (/^[\d.\-\s]+$/.test(termo) && termo.replace(/\D/g, '').length === 11) {
    return { tipo: 'cpf', valor: termo.replace(/\D/g, '') }
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(termo)) {
    return { tipo: 'id', valor: termo }
  }
  if (/^\d+$/.test(termo)) return { tipo: 'id_incompleto', valor: termo }
  return { tipo: 'nome', valor: termo.replace(/[\\%_]/g, '\\$&') }
}
