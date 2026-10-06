import test from 'node:test'
import assert from 'node:assert/strict'
import { validarVariacao, validarQuantidadeFicha } from '../src/lib/fichaTecnica.js'
test('normaliza preço e nome sem modificar peso da variação', () => {
  assert.deepEqual(validarVariacao(' Artesanal 200g ', '29,90'), { nome_variacao: 'Artesanal 200g', preco_venda: 29.9 })
  assert.throws(() => validarVariacao(' ', '20'))
  assert.throws(() => validarVariacao('Smash', '1.999'))
})
test('preserva três casas na quantidade, sem converter unidades', () => {
  assert.equal(validarQuantidadeFicha('150'), 150)
  assert.equal(validarQuantidadeFicha('0,125'), 0.125)
  assert.throws(() => validarQuantidadeFicha('0.0001'))
})
test('rejeita zero, negativos, vazios e valores além do banco', () => {
  for (const valor of ['', null, 0, -1, Infinity, 'abc', '1e3', '1.000,50']) {
    assert.throws(() => validarQuantidadeFicha(valor))
    assert.throws(() => validarVariacao('Smash', valor))
  }
  assert.throws(() => validarQuantidadeFicha('10000000'))
  assert.throws(() => validarVariacao('Smash', '100000000'))
})
