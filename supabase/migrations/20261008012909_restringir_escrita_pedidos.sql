-- Pedidos e itens são criados exclusivamente pela RPC transacional, que valida
-- catálogo, estoque e cotação de entrega. O navegador só consulta e altera
-- status/motivo; não pode forjar total, frete ou linhas via Data API.
BEGIN;

REVOKE ALL ON public.pedidos, public.itens_pedido,
  public.itens_pedido_adicionais FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pedidos, public.itens_pedido,
  public.itens_pedido_adicionais TO authenticated;
GRANT UPDATE (status, motivo_cancelamento) ON public.pedidos TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
