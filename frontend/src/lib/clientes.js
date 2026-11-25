export function filtrarClientes(clientes, busca) {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const digitos = /^[\d().+\-\s]+$/.test(termo) ? termo.replace(/\D/g, '') : ''
  return clientes.filter(cliente => !termo ||
    String(cliente.nome || '').toLocaleLowerCase('pt-BR').includes(termo) ||
    String(cliente.email || '').toLocaleLowerCase('pt-BR').includes(termo) ||
    (digitos.length > 0 && [cliente.cpf,cliente.telefone].some(v=>String(v || '').replace(/\D/g,'').includes(digitos))))
}

export function clientesComMesmoContato(clientes,form) {
  const cpf=String(form.cpf || '').replace(/\D/g,'')
  const email=String(form.email || '').trim().toLowerCase()
  const telefone=String(form.telefone || '').replace(/\D/g,'')
  return clientes.filter(c=>String(c.cpf).trim()!==cpf &&
    ((email && String(c.email || '').trim().toLowerCase()===email) ||
     (telefone.length>=10 && String(c.telefone || '').replace(/\D/g,'')===telefone)))
}
