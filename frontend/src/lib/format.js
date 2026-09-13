export function formatarCPF(valor) {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 11)
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function apenasDigitos(valor) {
  return (valor || '').replace(/\D/g, '').slice(0, 11)
}

// Validação real de CPF (dígitos verificadores) — confere consistência
// matemática do número, não confirma existência na Receita Federal.
export function validarCPF(valor) {
  const cpf = apenasDigitos(valor)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false // todos os dígitos iguais

  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf[10])) return false

  return true
}

export function formatarTelefone(valor) {
  const d = (valor || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => {
      let r = a ? `(${a}` : ''
      if (a.length === 2) r += ') '
      r += b
      if (c) r += `-${c}`
      return r
    })
  }
  return d.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) => {
    let r = a ? `(${a}` : ''
    if (a.length === 2) r += ') '
    r += b
    if (c) r += `-${c}`
    return r
  })
}
