import test from 'node:test'
import assert from 'node:assert/strict'
import { resumirFicha } from '../src/lib/fichaTecnica.js'

test('ficha calcula gramas e unidades em centavos e não mascara custos ausentes',()=>{
 const ficha=[{id:1,peso_quantidade:160,ingredientes:{custo_unitario:'0.034'}},{id:2,peso_quantidade:1,ingredientes:{custo_unitario:'1.8'}}]
 const resumo=resumirFicha(ficha,20)
 assert.equal(resumo.custoCentavos,724)
 assert.ok(Math.abs(resumo.cmv-36.2)<1e-10)
 assert.equal(Math.round(resumo.margem*10)/10,63.8)
 for(const valor of [null,undefined,'inválido',-1])assert.equal(resumirFicha([{peso_quantidade:1,ingredientes:{custo_unitario:valor}}],20).custoCentavos,null)
 assert.equal(resumirFicha([],20).cmv,null)
 assert.equal(resumirFicha(ficha,0).cmv,null)
 assert.equal(resumirFicha(ficha,'inválido').cmv,null)
 const fracionada=Array.from({length:2},()=>({peso_quantidade:1,ingredientes:{custo_unitario:'0.005'}}))
 assert.equal(resumirFicha(fracionada,10).custoCentavos,1,'Arredonda o total depois de somar os custos fracionários, como a view do banco.')
})
