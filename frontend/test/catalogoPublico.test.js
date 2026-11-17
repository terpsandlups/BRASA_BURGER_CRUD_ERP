import test from 'node:test'
import assert from 'node:assert/strict'
import { categoriasPublicas, filtrarCatalogoPublico, imagemPublica, prepararCatalogoPublico, agruparCatalogoPublico, iconeCategoria } from '../src/lib/catalogoPublico.js'

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

test('catálogo legado do Brasa separa as famílias do piloto sem modificar os dados recebidos',()=>{
  const legado=[
    {sku:'BEB001',nome:'Refrigerante',presencial:true},
    {sku:'LAN001',nome:'Hambúrguer',presencial:true},
    {sku:'BAT001',nome:'Batata',presencial:true},
    {sku:'SOB001',nome:'Sorvete',presencial:true},
    {sku:'CRO001',nome:'Croqueta',presencial:true},
    {sku:'CHOPP01',nome:'Chopp',presencial:true},
  ]
  const organizado=prepararCatalogoPublico(legado,'brasa-burger')
  assert.deepEqual(categoriasPublicas(organizado,'presencial'),['Lanches','Acompanhamentos','Bebidas','Sobremesas'])
  assert.deepEqual(agruparCatalogoPublico(organizado,'presencial').map(g=>[g.categoria,g.itens.length]),[['Lanches',1],['Acompanhamentos',2],['Bebidas',2],['Sobremesas',1]])
  assert.equal(legado[0].categoria,undefined)
  assert.deepEqual(filtrarCatalogoPublico(organizado,{tipo:'presencial',categoria:'Bebidas'}).map(i=>i.sku),['BEB001','CHOPP01'])
})

test('categoria configurada pela empresa prevalece e o mapeamento do piloto não vaza para outras empresas',()=>{
  const configurado={sku:'BEB001',categoria:'Especiais',categoria_ordem:8,presencial:true}
  assert.strictEqual(prepararCatalogoPublico([configurado],'brasa-burger')[0],configurado)
  const outro={sku:'LAN001',categoria:'Outros',presencial:true}
  assert.strictEqual(prepararCatalogoPublico([outro],'outra-empresa')[0],outro)
  assert.deepEqual(['Lanches','Acompanhamentos','Bebidas','Sobremesas'].map(iconeCategoria),['produto','batata','bebida','sobremesa'])
})
