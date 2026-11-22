// Só o servidor tem acesso ao cache. A chave não contém endereço em texto,
// chave de API, CPF, nome, telefone ou complemento.
export async function chaveCache(tipo, dados) {
  const bytes=new TextEncoder().encode(JSON.stringify(['ors-v1',tipo,dados]))
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')
}

export function criarCacheCalculos(armazenamento) {
  const emCurso=new Map()
  return async function reutilizar(tipo,dados,calcular) {
    const chave=await chaveCache(tipo,dados)
    if(emCurso.has(chave))return emCurso.get(chave)
    // O cache é uma otimização: uma indisponibilidade não vira frete zero.
    const executar=async()=>{
      let valor
      try {valor=await armazenamento.get(chave)} catch { /* calcular normalmente */ }
      if(valor)return valor
      valor=await calcular()
      try {await armazenamento.set(chave,tipo,valor,tipo==='geocodigo' ? 7*86400 : 86400)} catch { /* resposta válida permanece utilizável */ }
      return valor
    }
    if(emCurso.size>=128)return executar()
    const promessa=executar().finally(()=>emCurso.delete(chave))
    emCurso.set(chave,promessa)
    return promessa
  }
}
