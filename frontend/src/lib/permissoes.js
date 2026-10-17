export function temPermissao(usuario, permissoes, modulo, acao = 'visualizar') {
  if (!usuario?.ativo || !['visualizar', 'criar', 'editar'].includes(acao)) return false
  if (['Administrador', 'Gerente'].includes(usuario.perfis?.nome)) return true
  if (usuario.perfis?.nome === 'Estoque' && modulo === 'estoque') return true
  return permissoes.some(p => p.modulo === modulo && p[`pode_${acao}`] === true)
}
