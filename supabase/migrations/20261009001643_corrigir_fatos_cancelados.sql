BEGIN;

-- Mantém o pedido cancelado para auditoria, mas não o contabiliza como venda.
-- As colunas antigas preservam nomes e tipos para consumidores existentes.
CREATE OR REPLACE VIEW public.fato_vendas AS
SELECT
  p.id AS pedido_id,
  p.loja_id,
  p.cliente_cpf,
  p.tipo_atendimento,
  p.canal_venda AS canal_id,
  p.forma_pagamento AS pagamento_id,
  p.criado_em::date AS data_id,
  p.status,
  (CASE WHEN p.status = 'cancelado' THEN 0 ELSE p.valor_total END)::numeric(10,2) AS valor_total,
  p.troco_para,
  p.motivo_cancelamento,
  CASE WHEN p.status = 'cancelado' THEN 0 ELSE
    round(p.valor_total * coalesce(cc.taxa_plataforma_percentual, 0) / 100, 2) END AS taxa_plataforma_valor,
  CASE WHEN p.status = 'cancelado' THEN 0 ELSE
    round(p.valor_total * coalesce(cp.taxa_percentual, 0) / 100, 2) END AS taxa_pagamento_valor,
  CASE WHEN p.status = 'cancelado' THEN 0 ELSE
    p.valor_total
      - round(p.valor_total * coalesce(cc.taxa_plataforma_percentual, 0) / 100, 2)
      - round(p.valor_total * coalesce(cp.taxa_percentual, 0) / 100, 2) END AS valor_liquido,
  p.valor_total AS valor_original,
  c.valor_estornado,
  c.custo_operacional,
  c.destino AS destino_cancelamento
FROM public.pedidos p
LEFT JOIN public.configuracoes_canal cc ON cc.canal_venda = p.canal_venda
LEFT JOIN public.configuracoes_pagamento cp ON cp.forma_pagamento = p.forma_pagamento
LEFT JOIN public.cancelamentos_pedido c ON c.pedido_id = p.id;

-- Cancelados não têm receita de item nem CMV de venda. O custo do alimento
-- preparado fica identificado separadamente em cancelamentos_pedido.
CREATE OR REPLACE VIEW public.fato_itens_venda AS
SELECT
  ip.id AS item_id,
  ip.pedido_id,
  p.loja_id,
  p.cliente_cpf,
  p.criado_em::date AS data_id,
  ip.produto_sku,
  ip.variacao_id,
  ip.quantidade,
  ip.preco_unitario,
  ip.quantidade * ip.preco_unitario AS receita,
  coalesce(ft.custo_unitario, 0) AS custo_unitario,
  ip.quantidade * coalesce(ft.custo_unitario, 0) AS custo_total,
  (ip.quantidade * ip.preco_unitario) - (ip.quantidade * coalesce(ft.custo_unitario, 0)) AS margem_valor
FROM public.itens_pedido ip
JOIN public.pedidos p ON p.id = ip.pedido_id
LEFT JOIN (SELECT variacao_id, custo_ficha_tecnica AS custo_unitario FROM public.vw_custo_variacao) ft
  ON ft.variacao_id = ip.variacao_id
WHERE p.status <> 'cancelado';

ALTER VIEW public.fato_vendas SET (security_invoker = true);
ALTER VIEW public.fato_itens_venda SET (security_invoker = true);
NOTIFY pgrst, 'reload schema';
COMMIT;
