// Eventos são apenas avisos: cada atualização relê os dados autorizados por RLS/RPC.
export function acompanharAoVivo(client, nome, tabelas, atualizar, { intervalo = 15000, ambiente = globalThis } = {}) {
  let encerrado=false, emCurso=false, novamente=false, agendado=null
  const executar=async()=>{
    if(encerrado) return
    if(emCurso){novamente=true;return}
    emCurso=true
    try{await atualizar()}catch{/* A tela apresenta o erro e o próximo ciclo tenta recuperar. */}
    finally{emCurso=false;if(novamente && !encerrado){novamente=false;agendar()}}
  }
  const agendar=()=>{if(encerrado)return;ambiente.clearTimeout(agendado);agendado=ambiente.setTimeout(executar,200)}
  let canal=client.channel(nome)
  for(const tabela of tabelas) canal=canal.on('postgres_changes',{event:'*',schema:'public',...(typeof tabela==='string'?{table:tabela}:tabela)},agendar)
  canal=canal.on('system',{},evento=>{if(evento.extension==='postgres_changes' && evento.status==='ok')agendar()})
  canal.subscribe(status=>{if(status==='SUBSCRIBED')agendar()})
  const timer=ambiente.setInterval(executar,intervalo)
  const aoVoltar=()=>{if(ambiente.document?.visibilityState==='visible')agendar()}
  ambiente.document?.addEventListener('visibilitychange',aoVoltar)
  void executar()
  return()=>{encerrado=true;ambiente.clearInterval(timer);ambiente.clearTimeout(agendado);ambiente.document?.removeEventListener('visibilitychange',aoVoltar);client.removeChannel(canal)}
}
