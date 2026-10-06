-- As views antigas foram criadas com leitura para PUBLIC por padrão.
-- O dashboard usa somente sessão autenticada; custos e vendas não são públicos.
REVOKE ALL ON public.vw_custo_variacao, public.vw_vendas_por_loja FROM PUBLIC, anon;
GRANT SELECT ON public.vw_custo_variacao, public.vw_vendas_por_loja TO authenticated;
-- Usa as políticas RLS das tabelas de origem para cada usuário autenticado.
ALTER VIEW public.vw_custo_variacao SET (security_invoker = true);
ALTER VIEW public.vw_vendas_por_loja SET (security_invoker = true);
