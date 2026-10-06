export function filtrarClientes(clientes, busca) {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const digitos = /^[\d.\-\s]+$/.test(termo) ? termo.replace(/\D/g, '') : ''
  return clientes.filter(cliente => !termo ||
    String(cliente.nome || '').toLocaleLowerCase('pt-BR').includes(termo) ||
    (digitos.length > 0 && String(cliente.cpf || '').includes(digitos)))
}
