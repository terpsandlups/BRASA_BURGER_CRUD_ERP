export function opcoesSessao(aplicacao, pathname, base = '/') {
  const prefixo = `${base.endsWith('/') ? base : base+'/'}pedir`
  const noPortal = pathname === prefixo || pathname.startsWith(prefixo+'/')
  return {auth:{
    ...(aplicacao === 'consumidor' ? {storageKey:'convivium-consumidor-v1'} : {}),
    // Um retorno de confirmação de conta pertence somente à aplicação aberta.
    detectSessionInUrl:aplicacao === 'consumidor' ? noPortal : !noPortal,
  }}
}
