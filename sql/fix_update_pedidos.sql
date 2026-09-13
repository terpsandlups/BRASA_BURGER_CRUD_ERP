-- ============================================================
-- CORREÇÃO — faltava política de UPDATE em "pedidos"
-- Isso é o que travava o botão "Aceitar pedido" (e qualquer troca
-- de status): a política de SELECT/INSERT existia, mas UPDATE não
-- tinha nenhuma política, e RLS bloqueia por padrão o que não tem
-- política explícita.
-- ============================================================

CREATE POLICY "pedidos_update_por_unidade" ON pedidos
    FOR UPDATE TO authenticated
    USING (minha_loja() IS NULL OR loja_id = minha_loja())
    WITH CHECK (minha_loja() IS NULL OR loja_id = minha_loja());
