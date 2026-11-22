import test from 'node:test'
import assert from 'node:assert/strict'
import { atualizarSenhaRecuperada, emailEquipe, mensagemErroLogin, solicitarRecuperacao, urlRecuperacao } from '../src/lib/recuperacaoAcesso.js'

test('retorno de recuperação mantém origem e subpasta do ERP, sem destino controlado pelo formulário', () => {
  assert.equal(urlRecuperacao('https://terpsandlups.github.io', '/BRASA_BURGER_CRUD_ERP/'), 'https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/?acesso=recuperar')
  assert.equal(urlRecuperacao('http://localhost:5173'), 'http://localhost:5173/?acesso=recuperar')
  for (const origem of ['javascript:alert(1)', 'https://site.test/rota', 'https://usuario@site.test']) assert.throws(() => urlRecuperacao(origem))
  for (const base of ['//outro.test/', '/../', '/?next=outro.test/']) assert.throws(() => urlRecuperacao('https://site.test', base))
})

test('entrada e recuperação normalizam somente o e-mail; endereço inválido não chama o Auth', async () => {
  assert.equal(emailEquipe('  Equipe@Example.test  '), 'equipe@example.test')
  let chamadas = 0
  await assert.rejects(solicitarRecuperacao({ resetPasswordForEmail: () => { chamadas++ } }, 'sem-email', 'https://site.test/'), /e-mail válido/)
  assert.equal(chamadas, 0)
})

test('solicitação usa a recuperação oficial com URL fixa e não revela existência de conta', async () => {
  const chamadas = []
  const auth = { resetPasswordForEmail: async (...args) => { chamadas.push(args); return { data: {}, error: null } } }
  assert.equal(await solicitarRecuperacao(auth, ' Equipe@Example.test ', 'https://site.test/?acesso=recuperar'), undefined)
  assert.deepEqual(chamadas, [['equipe@example.test', { redirectTo: 'https://site.test/?acesso=recuperar' }]])
  await assert.rejects(solicitarRecuperacao({ resetPasswordForEmail: async () => ({ error: { status: 429 } }) }, 'equipe@example.test', 'https://site.test/'), /Limite de envios/)
})

test('senha divergente, curta ou sessão ausente impedem alteração', async () => {
  let chamadas = 0
  const auth = { getUser: async () => { chamadas++; return {} }, updateUser: async () => { chamadas++; return {} } }
  for (const dados of [
    { senha: 'curta', confirmacao: 'curta', usuarioId: 'usuario-1' },
    { senha: 'Senha!Sintetica1', confirmacao: 'diferente', usuarioId: 'usuario-1' },
    { senha: 'Senha!Sintetica1', confirmacao: 'Senha!Sintetica1' },
  ]) await assert.rejects(atualizarSenhaRecuperada(auth, dados))
  assert.equal(chamadas, 0)
})

test('servidor valida titular antes da troca; sessão expirada ou trocada não altera senha', async () => {
  let atualizacoes = 0
  const dados = { senha: 'Senha!Sintetica1', confirmacao: 'Senha!Sintetica1', usuarioId: 'usuario-1' }
  for (const resposta of [{ data: { user: { id: 'outro' } } }, { error: { status: 401 } }]) {
    await assert.rejects(atualizarSenhaRecuperada({ getUser: async () => resposta, updateUser: async () => { atualizacoes++ } }, dados), /sessão mudou ou expirou/)
  }
  assert.equal(atualizacoes, 0)
})

test('troca envia apenas senha ao Auth, sem modificar perfil, empresa ou master', async () => {
  const senha = '  Senha Sintetica 1!  ', chamadas = []
  await atualizarSenhaRecuperada({ getUser: async () => ({ data: { user: { id: 'usuario-1' } } }), updateUser: async dados => { chamadas.push(dados); return { error: null } } }, { senha, confirmacao: senha, usuarioId: 'usuario-1' })
  assert.deepEqual(chamadas, [{ password: senha }], 'Senha conserva os espaços digitados; nenhum metadado administrativo é enviado.')
})

test('falhas de senha iguais ou fracas retornam instrução sem expor resposta interna', async () => {
  const dados = { senha: 'Senha!Sintetica1', confirmacao: 'Senha!Sintetica1', usuarioId: 'usuario-1' }
  for (const [code, esperado] of [['same_password', /diferente/], ['weak_password', /mais forte/], ['otp_expired', /expirado/]]) {
    await assert.rejects(atualizarSenhaRecuperada({ getUser: async () => ({ data: { user: { id: 'usuario-1' } } }), updateUser: async () => ({ error: { code, message: 'resposta interna' } }) }, dados), esperado)
  }
})

test('login diferencia limite, confirmação de e-mail e credenciais inválidas', () => {
  assert.match(mensagemErroLogin({ status: 429 }), /Aguarde/)
  assert.match(mensagemErroLogin({ status: 400, code: 'email_not_confirmed' }), /Confirme seu e-mail/)
  assert.match(mensagemErroLogin({ status: 400, code: 'invalid_credentials' }), /Esqueci minha senha/)
})
