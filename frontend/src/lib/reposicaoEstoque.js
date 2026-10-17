// Guarda a chave até obter uma resposta definitiva; uma falha de rede pode
// ocorrer depois do commit e não autoriza lançar uma segunda entrada.
export function criarRepositorEstoque(client, gerarId = () => crypto.randomUUID()) {
  const pendentes = new Map()
  const emCurso = new Map()
  const chave = item => `${item.loja_id}:${item.ingrediente_id}`
  return {
    temPendente: item => pendentes.has(chave(item)),
    enviar(item, quantidade) {
      const id = chave(item)
      if (emCurso.has(id)) return emCurso.get(id)
      const valor = Number(quantidade)
      if (!Number.isFinite(valor) || valor <= 0 || valor > 999999999.999 || Math.abs(valor * 1000 - Math.round(valor * 1000)) > 0.00001) {
        return Promise.reject(new Error('Informe quantidade positiva com até três casas decimais.'))
      }
      if (pendentes.has(id) && pendentes.get(id).quantidade !== valor) {
        return Promise.reject(new Error('Confirme a reposição anterior com a mesma quantidade antes de alterar o valor.'))
      }
      if (!pendentes.has(id)) pendentes.set(id, { requisicao: gerarId(), quantidade: valor })
      const pendente = pendentes.get(id)
      const promessa = (async () => {
        const { data, error } = await client.rpc('repor_estoque_transacional', {
          p_requisicao: pendente.requisicao, p_loja: item.loja_id,
          p_ingrediente: item.ingrediente_id, p_quantidade: pendente.quantidade,
        })
        if (error) {
          if ((/^[0-9A-Z]{5}$/.test(error.code || '') && !error.code.startsWith('08')) || error.code === 'PGRST202') pendentes.delete(id)
          throw error
        }
        if (data == null) throw new Error('Resposta não confirmada. Reenvie a mesma reposição.')
        pendentes.delete(id)
        return data
      })().finally(() => emCurso.delete(id))
      emCurso.set(id, promessa)
      return promessa
    },
  }
}
