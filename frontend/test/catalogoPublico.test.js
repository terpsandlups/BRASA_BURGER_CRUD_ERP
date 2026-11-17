import test from 'node:test'
import assert from 'node:assert/strict'
import { categoriasPublicas, filtrarCatalogoPublico, imagemPublica } from '../src/lib/catalogoPublico.js'

const itens = [
  { id:1,nome:'Açaí',variacao:'300ml',descricao:'Com banana',categoria:'Sobremesas',categoria_ordem:3,destaque:true,delivery:true,presencial:false },
  { id:2,nome:'Hambúrguer',variacao:'150g',categoria:'Lanches',categoria_ordem:1,destaque:false,delivery:true,presencial:true },
  { id:3,nome:'Suco',variacao:'Copo',categoria:'Bebidas',categoria_ordem:2,destaque:true,delivery:false,presencial:true },
]
test('catálogo combina disponibilidade, categoria, destaque e busca sem acentos',()=>{
  assert.deepEqual(categoriasPublicas(itens,'presencial'),['Lanches','Bebidas'])
  assert.deepEqual(filtrarCatalogoPublico(itens,{tipo:'delivery',categoria:'destaques',busca:'acai'}).map(i=>i.id),[1])
  assert.deepEqual(filtrarCatalogoPublico(itens,{tipo:'presencial',categoria:'destaques'}).map(i=>i.id),[3])
  assert.deepEqual(filtrarCatalogoPublico(itens,{tipo:'delivery',categoria:'Bebidas'}),[])
  assert.equal(filtrarCatalogoPublico(itens,{tipo:'delivery',busca:'banana'}).length,1)
})
test('imagens públicas aceitam somente HTTPS sem credenciais',()=>{
  assert.equal(imagemPublica('https://example.test/prato.webp'),'https://example.test/prato.webp')
  for(const url of ['javascript:alert(1)','data:image/svg+xml,qualquer','http://example.test/img','https://usuario:senha@example.test/img','/privado',''])assert.equal(imagemPublica(url),'')
})
