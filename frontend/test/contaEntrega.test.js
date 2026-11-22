import test from 'node:test'
import assert from 'node:assert/strict'
import { salvarPerfilConsumidor, perfilAlterado } from '../src/lib/perfilConsumidor.js'
import { chaveCotacao, enderecoCompleto, pontoFavorito, pontoDoDispositivo } from '../src/lib/cotacaoEntrega.js'
import { criarCacheCalculos, chaveCache } from '../../supabase/functions/calcular-entrega/cache.mjs'
import { consultarORS } from '../../supabase/functions/calcular-entrega/openrouteservice.mjs'

const perfil={nome:'Cliente Teste',cpf:'52998224725',telefone:'11999999999'}
const endereco={cep:'13201000',endereco:'Rua Exemplo',numero:'10',bairro:'Centro',cidade:'Jundiaí',estado:'SP'}
test('conta: pedido reutiliza cadastro oficial sem recadastrar; alteração salva uma vez',async()=>{
  let chamadas=0
  const api={rpc:async(nome,args)=>{chamadas++;assert.equal(nome,'cadastrar_perfil_cliente');return {data:{cpf:args.p_cpf,nome:args.p_nome,telefone:args.p_telefone}}}}
  assert.deepEqual(await salvarPerfilConsumidor(api,{...perfil,cpf:'529.982.247-25',telefone:'(11) 99999-9999'},perfil),perfil)
  assert.equal(chamadas,0)
  const salvo=await salvarPerfilConsumidor(api,{...perfil,nome:'Nome Atualizado'},perfil)
  await salvarPerfilConsumidor(api,salvo,salvo)
  assert.equal(chamadas,1)
  assert.equal(perfilAlterado(perfil,perfil),false)
  await assert.rejects(()=>salvarPerfilConsumidor(api,{...perfil,cpf:'11144477735'},perfil),/CPF vinculado/)
  assert.equal(chamadas,1)
})
test('frete: chave agrupa CEP formatado, mas distingue complemento, número e ponto',()=>{
  const chave=chaveCotacao('loja',endereco,null)
  assert.equal(chaveCotacao('loja',{...endereco,cep:'13201-000'},null),chave)
  for(const alterado of [{...endereco,numero:'100'},{...endereco,complemento:'Apto 2'}])assert.notEqual(chaveCotacao('loja',alterado,null),chave)
  assert.notEqual(chaveCotacao('outra',endereco,null),chave)
  assert.notEqual(chaveCotacao('loja',endereco,{latitude:-23,longitude:-46}),chave)
  assert.ok(enderecoCompleto(endereco));assert.equal(enderecoCompleto({...endereco,numero:''}),false)
  assert.equal(pontoFavorito({...endereco,latitude:null,longitude:null}),null)
  assert.throws(()=>pontoDoDispositivo({latitude:-23,longitude:-46,accuracy:500}),/imprecisa/)
  assert.deepEqual(pontoDoDispositivo({latitude:-23,longitude:-46,accuracy:30}),{latitude:-23,longitude:-46})
})
test('frete: cache reúne consultas simultâneas, separa trajetos e não guarda falhas',async()=>{
  const banco=new Map();let consultas=0
  const cache=criarCacheCalculos({get:async chave=>banco.get(chave),set:async(chave,tipo,valor,ttl)=>{assert.equal(ttl,86400);banco.set(chave,valor)}})
  const calcular=async()=>{consultas++;await new Promise(resolve=>setTimeout(resolve,5));return 3456}
  assert.deepEqual(await Promise.all([cache('rota',[1,2],calcular),cache('rota',[1,2],calcular)]),[3456,3456])
  await cache('rota',[1,2],calcular);assert.equal(consultas,1)
  await cache('rota',[2,1],calcular);assert.equal(consultas,2)
  await assert.rejects(()=>cache('rota',[9,9],async()=>{throw new Error('cota')}),/cota/)
  await cache('rota',[9,9],calcular);assert.equal(consultas,3)
  assert.match(await chaveCache('geocodigo',['Rua Teste']),/^[a-f0-9]{64}$/)
})
test('frete: uma rota confirmada reutiliza distância; falha no cache permite cálculo real',async()=>{
  const banco=new Map();let chamadas=0
  const reutilizar=criarCacheCalculos({get:async chave=>banco.get(chave),set:async(chave,_tipo,valor)=>banco.set(chave,valor)})
  const config={apiKey:'teste',origem:{latitude:-23.1,longitude:-46.9},destino:{latitude:-23.2,longitude:-46.8},reutilizar,
    fetchFn:async()=>{chamadas++;return Response.json({routes:[{summary:{distance:3500}}]})}}
  assert.equal((await consultarORS(config)).metros,3500)
  assert.equal((await consultarORS(config)).metros,3500);assert.equal(chamadas,1)
  const indisponivel=criarCacheCalculos({get:async()=>{throw new Error('offline')},set:async()=>{throw new Error('offline')}})
  assert.equal((await consultarORS({...config,reutilizar:indisponivel})).metros,3500)
  assert.equal(chamadas,2)
})
