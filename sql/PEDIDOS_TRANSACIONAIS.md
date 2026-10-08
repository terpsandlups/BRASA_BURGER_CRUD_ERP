# Pedidos transacionais e frete

O frontend cria pedidos somente pela RPC `criar_pedido_transacional`. Não há
alternância para gravação direta. Em uma instalação nova, aplicar
`migration_pedido_transacional.sql` e depois as migrações versionadas
`20261008010733_frete_no_pedido.sql` e
`20261008012909_restringir_escrita_pedidos.sql`, além das migrações de
configuração de entrega. Publicar a Edge Function `calcular-entrega` com a
chave gratuita ORS somente no Supabase.

O delivery próprio exige cotação de rota válida por 15 minutos, vinculada ao
mesmo usuário, cliente e loja. O banco usa a taxa da cotação, não um valor
enviado pelo navegador. Atendimento presencial e marketplaces não recebem
esse frete. Pedido, itens e baixas de estoque são atômicos.

## Alterações no banco

- Tabela privada `requisicoes_pedido`: chave por usuário/requisição, conteúdo original e pedido resultante.
- Tabela privada `cotacoes_entrega`: valor e rota calculados pela Edge Function,
  consumidos uma única vez pelo pedido.
- Função `criar_pedido_transacional`: valida usuário ativo, permissão de vendas e unidade; confere disponibilidade e preços pelo catálogo; cria pedido, itens e adicionais juntos.
- Os triggers atuais de estoque executam na mesma transação. Qualquer exceção desfaz também as baixas.
- Cada adicional é gravado com a quantidade total da linha (ex.: três burgers com bacon geram três adicionais).
- O estoque da ficha e dos adicionais precisa estar vinculado à loja. Insumos sem saldo cadastrado causam rejeição do pedido.
- Reenvios com a mesma chave retornam o pedido original, sem novas baixas. O frontend mantém a chave durante a confirmação de uma resposta perdida; não fechar/recarregar a página até a confirmação.

## Limites e validação

As duas migrações versionadas foram aplicadas ao Supabase. Um pedido real foi
conferido em 07/10/2026: R$ 86,60 em itens, R$ 7,95 de frete, total R$ 94,55
e cotação consumida. O teste SQL reversível
`sql/validacao_frete_pedido_rollback.sql` conferiu total e idempotência. Ao
rodá-lo, use uma conexão única que respeite `BEGIN`/`ROLLBACK` e confirme a
ausência de registros com a marca `{"teste":true}`.

Ainda validar com perfis/unidades diferentes e falhas reais de rede:

1. Criar pedido de teste com dois produtos iguais e um adicional por produto; conferir o total e a baixa de duas porções do adicional.
2. Enviar a mesma requisição duas vezes: mesmo UUID de pedido, mesmas quantidades em estoque.
3. Enviar requisição com segundo item inválido: nenhum pedido, item ou baixa da primeira linha deve persistir.
4. Conferir rejeição de usuário inativo/sem permissão, loja alheia, preço adulterado e variação indisponível.
5. Conferir troco insuficiente: nenhum registro ou baixa deve persistir.

O cancelamento e a restituição de estoque ainda exigem revisão específica.
Não há garantia de estoque não negativo nem exigência de ficha técnica para
todos os produtos. A escrita direta de pedidos e itens foi revogada para
usuários autenticados; leitura e atualização de status continuam sujeitas a RLS.
