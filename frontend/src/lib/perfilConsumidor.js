import { validarCPF } from './format.js'

export function normalizarPerfil(cliente) {
  return { nome: String(cliente?.nome || '').trim(), cpf: String(cliente?.cpf || '').replace(/\D/g, ''), telefone: String(cliente?.telefone || '').replace(/\D/g, '') }
}

export function validarPerfil(cliente) {
  const perfil = normalizarPerfil(cliente)
  if (!validarCPF(perfil.cpf)) throw new Error('Confira o CPF.')
  if (perfil.nome.length < 2 || perfil.nome.length > 120 || !/^\d{10,11}$/.test(perfil.telefone)) throw new Error('Confira nome e telefone.')
  return perfil
}

export function perfilAlterado(cliente, salvo) {
  const atual = normalizarPerfil(cliente)
  const anterior = normalizarPerfil(salvo)
  return ['cpf','nome','telefone'].some(campo => atual[campo] !== anterior[campo])
}

export async function salvarPerfilConsumidor(api, cliente, salvo, marca) {
  const perfil = validarPerfil(cliente)
  if (salvo?.cpf && perfil.cpf !== normalizarPerfil(salvo).cpf) throw new Error('Use o CPF vinculado à sua conta.')
  if (!perfilAlterado(perfil, salvo)) return normalizarPerfil(salvo)
  const { data, error } = await api.rpc('cadastrar_perfil_cliente', { p_cpf:perfil.cpf, p_nome:perfil.nome, p_telefone:perfil.telefone, ...(marca ? {p_slug:marca} : {}) })
  if (error) throw error
  if (!data?.cpf) throw new Error('Não foi possível confirmar seu cadastro. Tente novamente.')
  return normalizarPerfil(data)
}
