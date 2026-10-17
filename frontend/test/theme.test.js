import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8')
const token = nome => {
  const valor = css.match(new RegExp(`--ui-${nome}: (#[a-f0-9]{6});`, 'i'))?.[1]
  assert.ok(valor, `Token ${nome} precisa declarar uma cor hexadecimal`)
  return valor
}
const luminancia = cor => {
  const canais = cor.slice(1).match(/../g).map(hex => parseInt(hex, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  return canais[0] * .2126 + canais[1] * .7152 + canais[2] * .0722
}
const contraste = (a, b) => {
  const valores = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (valores[0] + .05) / (valores[1] + .05)
}

for (const texto of ['text', 'muted', 'gold', 'success', 'danger']) {
  test(`tema: ${texto} mantém contraste AA sobre fundo, cards e campos`, () => {
    for (const fundo of ['bg', 'panel', 'raised']) {
      assert.ok(contraste(token(texto), token(fundo)) >= 4.5, `${texto}/${fundo} abaixo de 4,5:1`)
    }
  })
}

test('tema: texto escuro do CTA tem contraste AA sobre a cor de ação', () => {
  assert.ok(contraste('#181614', token('action')) >= 4.5)
})
