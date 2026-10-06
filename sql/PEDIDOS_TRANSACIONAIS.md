# Ativação do pedido transacional

1. No SQL Editor do projeto Supabase existente, executar `migration_pedido_transacional.sql`. O arquivo já contém BEGIN/COMMIT; se ocorrer erro, não ativar o frontend.
2. Acrescentar `VITE_PEDIDO_TRANSACIONAL=true` ao `.env` local do frontend (não ao SQL Editor).
3. Reiniciar a prévia Vite. Em uma publicação, a variável deve estar configurada antes de gerar o build.

O fluxo anterior permanece ativo enquanto essa variável não for true. A função nova não executa fallback para gravações separadas se falhar.

## Alterações no banco

- Tabela privada `requisicoes_pedido`: chave por usuário/requisição, conteúdo original e pedido resultante.
- Função `criar_pedido_transacional`: valida usuário ativo, permissão de vendas e unidade; confere disponibilidade e preços pelo catálogo; cria pedido, itens e adicionais juntos.
- Os triggers atuais de estoque executam na mesma transação. Qualquer exceção desfaz também as baixas.
- Cada adicional é gravado com a quantidade total da linha (ex.: três burgers com bacon geram três adicionais).
- O estoque da ficha e dos adicionais precisa estar vinculado à loja. Insumos sem saldo cadastrado causam rejeição do pedido.
- Reenvios com a mesma chave retornam o pedido original, sem novas baixas. O frontend mantém a chave durante a confirmação de uma resposta perdida; não fechar/recarregar a página até a confirmação.

## Limites e validação necessária

SQL preparado e revisado contra os scripts locais, ainda não executado nesta tarefa: não há administração SQL ou PostgreSQL local disponível. Testes automatizados do cliente cobrem concorrência de cliques, resposta perdida, correção após erro SQL e montagem dos dados.

Validar no ambiente de desenvolvimento após ativar:

1. Criar pedido de teste com dois produtos iguais e um adicional por produto; conferir o total e a baixa de duas porções do adicional.
2. Enviar a mesma requisição duas vezes: mesmo UUID de pedido, mesmas quantidades em estoque.
3. Enviar requisição com segundo item inválido: nenhum pedido, item ou baixa da primeira linha deve persistir.
4. Conferir rejeição de usuário inativo/sem permissão, loja alheia, preço adulterado e variação indisponível.
5. Conferir troco insuficiente: nenhum registro ou baixa deve persistir.

O cancelamento e a restituição de estoque ainda são etapas posteriores; esta migração não altera essa regra. Também não proíbe estoque negativo nem exige ficha técnica para produtos que ainda não a têm. As políticas antigas de escrita direta não são revogadas: o reforço global de RLS exige revisão específica das permissões existentes.
