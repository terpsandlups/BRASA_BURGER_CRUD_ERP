import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { criarAcessoCliente } from './handler.mjs'

const options={auth:{persistSession:false,autoRefreshToken:false}}
const url=Deno.env.get('SUPABASE_URL')!
const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const admin=createClient(url,secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options)
Deno.serve(criarAcessoCliente({
  allowedOrigins:[...(Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s=>s.trim()).filter(Boolean),'https://terpsandlups.github.io'],
  resolverConta:async(cpf:string)=>{const {data,error}=await admin.rpc('preparar_login_cliente',{p_cpf:cpf});if(error)throw error;return data},
  limitarCadastro:async(chave:string)=>{const {data,error}=await admin.rpc('reservar_cadastro_cliente',{p_chave:chave});if(error)throw error;return data===true},
  cadastrar:(dados:Parameters<typeof admin.auth.admin.createUser>[0])=>admin.auth.admin.createUser(dados),
  autenticar:(email:string,senha:string)=>createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,options).auth.signInWithPassword({email,password:senha}),
}))
