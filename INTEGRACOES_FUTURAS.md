# Canais externos — contrato futuro

Convivium é a origem da operação própria. No estado atual, iFood e Rappi são lançados manualmente no PDV; Goomer é uma integração planejada. O portal próprio grava solicitações, não vendas automáticas de marketplace.

## Fronteira da futura API

Cada provedor terá um adaptador no servidor. Ele verifica assinatura/autenticação, confere loja e configuração do provedor, persiste o evento original em área privada e normaliza os dados. Nunca confiar em uma chamada do navegador para afirmar que uma venda veio de marketplace.

Contrato proposto de evento normalizado, ainda sem endpoint público implementado:

```json
{
  "versao": 1,
  "provedor": "ifood",
  "evento_externo_id": "evento-do-provedor",
  "pedido_externo_id": "pedido-do-provedor",
  "loja_id": "uuid-da-unidade-configurada-no-servidor",
  "ocorrido_em": "2026-10-24T20:00:00-03:00",
  "tipo": "pedido_criado",
  "moeda": "BRL",
  "subtotal_centavos": 2890,
  "frete_cliente_centavos": 500,
  "desconto_centavos": 0,
  "pagamento": { "responsavel": "marketplace", "estado": "confirmado" },
  "itens": [{ "sku_externo": "sku-do-provedor", "quantidade": 1, "preco_centavos": 2890 }]
}
```

Os valores são exemplos de contrato, não documentação da API de nenhum provedor.

## Regras de implementação

- Deduplicar por provedor, unidade e ID de evento; manter vínculo único entre pedido externo e venda interna. Recebimento repetido não baixa estoque novamente.
- Mapear SKUs/variações/adicionais explicitamente. Produto desconhecido vai para uma fila de conferência, nunca para um produto aproximado.
- Manter autenticação e credenciais por instalação de provedor no servidor. Conta de cliente não pode gerar eventos de integração.
- Separar preço efetivamente vendido, descontos, comissão, taxas de pagamento e frete cobrado pelo provedor. A RPC atual valida preço de catálogo e não deve ser reutilizada para preços externos sem uma regra específica no servidor.
- Não aplicar cotação de frete próprio a uma entrega do marketplace. Conciliação de repasse não equivale ao total do pedido.
- Alterações de status e cancelamentos exigem máquina de estados, histórico e compensação de estoque exatamente uma vez. Duplicatas e eventos fora de ordem devem ser recuperáveis.
- Confirmar recebimento só após armazenamento durável; processar com idempotência. Não gravar documentos, contatos, tokens ou endereços em logs abertos.
- Implantar por provedor após acesso comercial autorizado, documentação oficial atual e testes em sandbox. Não anunciar integração ativa antes disso.

A pesquisa Exa deverá confirmar quais fluxos e APIs públicas estão realmente disponíveis antes de implementar qualquer adaptador.
