import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarCEP } from '../src/lib/cep.js'

test('ViaCEP preenche endereço e envia somente oito dígitos do CEP',async()=>{
  const original=globalThis.fetch
  globalThis.fetch=async url=>{assert.equal(url,'https://viacep.com.br/ws/01001000/json/');return Response.json({logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP'})}
  try{assert.deepEqual(await buscarCEP('01001-000'),{logradouro:'Praça da Sé',bairro:'Sé',cidade:'São Paulo',estado:'SP'})}finally{globalThis.fetch=original}
})
test('ViaCEP permite preenchimento manual se CEP não existir ou serviço falhar',async()=>{
  const original=globalThis.fetch
  try{
    globalThis.fetch=async()=>Response.json({erro:true});assert.equal(await buscarCEP('99999999'),null)
    globalThis.fetch=async()=>{throw new Error('Sem rede')};assert.equal(await buscarCEP('01001000'),null)
    assert.equal(await buscarCEP('123'),null)
  }finally{globalThis.fetch=original}
})
