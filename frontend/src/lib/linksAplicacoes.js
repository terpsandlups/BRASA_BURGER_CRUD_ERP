export function enderecoPortal(slug) {
  if (!slug) return ''
  const configurado = import.meta.env.VITE_PORTAL_URL
  const base = configurado || new URL(import.meta.env.BASE_URL,window.location.origin).href
  try {
    const url = new URL(base.endsWith('/') ? base : base+'/')
    if(!['https:','http:'].includes(url.protocol)) return ''
    return new URL('pedir/'+encodeURIComponent(slug),url).href
  }catch{return ''}
}
