# Casos de uso operacionais — 17/10/2026

## Referências públicas e adaptação ao Brasa

A [Goomer descreve seu gestor](https://ajuda.goomer.com.br/goomergo/painel/pedidos/gestor-de-pedidos)
como uma área para organizar pedidos de diferentes atendimentos e acompanhar
suas mudanças de status. Essa referência orientou o quadro por etapas, a
identificação curta, a busca e os detalhes completos do pedido.

A [documentação técnica do iFood](https://developer.ifood.com.br/pt-BR/docs/guides/order/)
separa confirmação, preparo, despacho, conclusão e cancelamento. O tratamento
de eventos duplicados descrito na [referência de eventos](https://developer.ifood.com.br/es-CO/docs/food/guides/modules/events/polling-overview)
reforça a necessidade de idempotência. Adaptamos essas ideias à operação local:
transições verificadas pelo servidor, chave de reenvio e cancelamento auditável.

Este levantamento parte de comportamento e documentação públicos. Não foi
usado código proprietário nem acessada API privada. Os canais no cadastro do
Brasa continuam sendo lançamentos manuais; integração comercial com Goomer ou
iFood não foi implementada nesta etapa.

## Cenários derivados

| Caso | Comportamento esperado | Verificação |
|---|---|---|
| Operador lança vários lanches iguais | Quantidade editável; itens sem adicionais agrupados; preço por canal visível | Carrinho no navegador |
| Preço termina em meio centavo após markup | Navegador coincide com arredondamento decimal do banco | PostgreSQL isolado: R$ 24,90 + 15% = R$ 28,64 |
| Resposta do pedido se perde | Reenvio usa mesma chave; recarga recupera pendência da sessão | Testes do envio e do banco |
| Venda consome mais que o estoque | Rejeitar e desfazer pedido, itens e todas as baixas | Teste de falta de adicional após baixa do ingrediente-base |
| Reposição ocorre depois de uma venda | Somar ao saldo atual, sem sobrescrever a venda | RPC de reposição com entrada idempotente |
| Cancelamento antes do consumo físico | Devolver a quantidade fotografada na venda uma única vez | Alteração da ficha entre venda e cancelamento |
| Lanche já preparado é perdido | Manter baixa; estornar receita; registrar custo histórico | Teste de perda operacional e ausência de ficha |
| Lanche idêntico atende outro pedido | Compensar a baixa duplicada e vincular origem/destino | Reaproveitamento em cadeia e devolução final |
| Ficha mudou entre pedidos idênticos no cadastro | Recusar reaproveitamento com composição física diferente | Teste com mudança de 100g para 150g |
| Dois operadores usam status antigo | Recusar transição obsoleta e atualizar a lista | Comparação de status no servidor |
| Visualizador tenta editar cadastro ou permissões | Bloquear no banco e restringir ações na interface | RLS, grants e testes de perfil |
| Gerente de uma loja consulta outra | Filtrar os registros e bloquear mutações | Testes de unidade no banco isolado |
| Usuário inativo mantém token | Recusar operações e leitura dos módulos protegidos | Testes de usuário inativo; bloqueio de perfil na interface |
| Operação em celular | Menu modal, campos utilizáveis, tabela com rolagem interna | Conferência a 390 × 844; sem transbordamento da página |

## Limites e próximos testes

`frontend/test/operacaoBanco.test.js` executa os SQLs reais de produção em um
PostgreSQL em memória (PGlite), usando um contrato mínimo das tabelas legadas.
Isso valida cálculos, funções, triggers, rollback e permissões sem escrever no
Supabase real. Não substitui teste de carga ou duas conexões PostgreSQL
simultâneas; esses cenários precisam de ambiente de homologação com usuários e
pedidos descartáveis.

Antes de operação comercial: testar concorrência de vendas no último saldo,
restauração de backup, impressão de cozinha e fechamento de caixa conforme a
operação pretendida; homologar rotas e limites do provedor gratuito. Cupons de
influenciadores/frete grátis e personalização multi-marca seguem no roadmap.
