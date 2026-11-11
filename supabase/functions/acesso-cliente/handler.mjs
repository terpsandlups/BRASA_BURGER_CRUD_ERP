// A senha é conferida pelo Supabase Auth. O CPF/e-mail resolvido fica no servidor.
export function criarAcessoCliente({ allowedOrigins, resolverConta, autenticar, cadastrar, limitarCadastro }) {
  return async request => {
    const origin=request.headers.get('origin')
    const headers={'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin'}
    if(origin && allowedOrigins.includes(origin)) Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'})
    const responder=(status,body)=>new Response(JSON.stringify(body),{status,headers})
    if(origin && !allowedOrigins.includes(origin)) return responder(403,{error:'Origem não autorizada.'})
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers})
    if(request.method!=='POST') return responder(405,{error:'Método não permitido.'})
    try {
      const reader=request.body?.getReader(); if(!reader) return responder(400,{error:'Informe CPF e senha.'})
      let bytes=0; const chunks=[]
      for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2048){await reader.cancel();return responder(413,{error:'Dados excedem o limite.'})}chunks.push(value)}
      const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
      const dados=JSON.parse(new TextDecoder().decode(buffer))
      const cpf=String(dados.cpf || '').replace(/\D/g,'')
      if(!/^\d{11}$/.test(cpf) || typeof dados.senha!=='string' || !dados.senha || dados.senha.length>256) return responder(400,{error:'Confira CPF e senha.'})
      if(dados.acao && !['cadastro','entrar'].includes(dados.acao)) return responder(400,{error:'Ação inválida.'})
      if(dados.acao==='cadastro'){
        const nome=String(dados.nome || '').trim(),telefone=String(dados.telefone || '').replace(/\D/g,'')
        if(dados.senha.length<8 || nome.length<2 || nome.length>120 || !/^\d{10,11}$/.test(telefone)) return responder(400,{error:'Confira nome, telefone e senha com pelo menos oito caracteres.'})
        if(!cadastrar || !limitarCadastro) return responder(503,{error:'Cadastro indisponível.'})
        const origemRede=request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'sem-ip'
        if(!await limitarCadastro(origemRede)) return responder(429,{error:'Limite de cadastros atingido nesta rede. Aguarde ou contate a loja.'})
        // Identificador técnico, sem caixa de e-mail ou identidade de terceiros.
        // Não modifica a confirmação exigida para contas de e-mail já existentes.
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(cpf))),n=>n.toString(16).padStart(2,'0')).join('')
        const emailInterno=`cpf-${hash}@clientes.convivium.invalid`
        const {error:erroCadastro}=await cadastrar({email:emailInterno,password:dados.senha,email_confirm:true,user_metadata:{cpf,nome,telefone}})
        if(erroCadastro) return responder(400,{error:'Não foi possível criar a conta. Confira o CPF ou entre na conta que já possui.'})
        const {data,error}=await autenticar(emailInterno,dados.senha)
        if(error || !data?.session) return responder(503,{error:'Cadastro recebido. Tente entrar com CPF e senha.'})
        return responder(200,{access_token:data.session.access_token,refresh_token:data.session.refresh_token})
      }
      const email=await resolverConta(cpf)
      if(email==='__limite__') return responder(429,{error:'Muitas tentativas. Aguarde cinco minutos.'})
      // Mesmo contrato de falha para CPF desconhecido e senha incorreta.
      const {data,error}=await autenticar(email || 'conta-inexistente@example.invalid',dados.senha)
      if(!email || error || !data?.session) return responder(401,{error:'CPF ou senha inválidos, ou e-mail ainda não confirmado. Confira também a confirmação de cadastro.'})
      const {access_token,refresh_token}=data.session
      return responder(200,{access_token,refresh_token})
    } catch(error) {
      return responder(error instanceof SyntaxError ? 400 : 503,{error:error instanceof SyntaxError ? 'Confira os dados enviados.' : 'Acesso indisponível. Tente novamente em instantes.'})
    }
  }
}
