import test from 'node:test'
import assert from 'node:assert/strict'
import { criarRepositorEstoque } from '../src/lib/reposicaoEstoque.js'
const item = { loja_id: 'loja', ingrediente_id: 'carne' }

test('reposição recupera resposta perdida com mesma chave e quantidade', async () => {
  const chamadas = []
  const repositor = criarRepositorEstoque({ rpc: async (nome, args) => {
    chamadas.push(args)
    return chamadas.length === 1 ? { error: { message: 'rede indisponível' } } : { data: 102.125 }
  } }, () => 'req1')
  await assert.rejects(repositor.enviar(item, 2.125))
  assert.equal(repositor.temPendente(item), true)
  await assert.rejects(repositor.enviar(item, 4), /mesma quantidade/)
  assert.equal(await repositor.enviar(item, 2.125), 102.125)
  assert.deepEqual(chamadas[0], chamadas[1])
  assert.equal(repositor.temPendente(item), false)
})
test('reposição rejeita quantidade inválida antes da rede e libera após rollback SQL', async () => {
  let chamadas = 0
  const repositor = criarRepositorEstoque({ rpc: async () => { chamadas++; return { error: { code: 'P0001', message: 'sem permissão' } } } })
  for (const quantidade of ['', 0, -1, 0.0001, Infinity]) await assert.rejects(repositor.enviar(item, quantidade), /positiva/)
  assert.equal(chamadas, 0)
  await assert.rejects(repositor.enviar(item, 1), error => error.code === 'P0001' && error.message === 'sem permissão')
  assert.equal(repositor.temPendente(item), false)
})
