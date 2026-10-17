import test from 'node:test'
import assert from 'node:assert/strict'
import { temPermissao } from '../src/lib/permissoes.js'

test('interface limita ações pelo perfil e recusa usuário inativo', () => {
  const usuario = { ativo: true, perfis: { nome: 'Visualização' } }
  const regras = [{ modulo: 'vendas', pode_visualizar: true, pode_criar: false, pode_editar: false }]
  assert.equal(temPermissao(usuario, regras, 'vendas'), true)
  assert.equal(temPermissao(usuario, regras, 'vendas', 'editar'), false)
  assert.equal(temPermissao(usuario, regras, 'estoque'), false)
  assert.equal(temPermissao({ ...usuario, ativo: false, perfis: { nome: 'Administrador' } }, [], 'vendas'), false)
  assert.equal(temPermissao({ ...usuario, perfis: { nome: 'Estoque' } }, [], 'estoque', 'editar'), true)
  assert.equal(temPermissao({ ...usuario, perfis: { nome: 'Administrador' } }, [], 'vendas', 'editar'), true)
})
