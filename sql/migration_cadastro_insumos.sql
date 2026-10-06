-- Pré-requisitos: schema.sql e migration_fase1.sql.
-- Aplicar no SQL Editor do Supabase após revisar as políticas já existentes.
-- Não recria tabelas nem altera saldos. Políticas existentes continuam valendo.
BEGIN;

GRANT SELECT, INSERT ON public.ingredientes TO authenticated;
GRANT SELECT, INSERT ON public.estoque_lojas TO authenticated;

-- Se ingredientes já usa RLS, permite cadastro por perfis operacionais.
-- Esta migração não muda a configuração RLS pré-existente dessa tabela.
DROP POLICY IF EXISTS insumos_cadastro_operacional ON public.ingredientes;
CREATE POLICY insumos_cadastro_operacional ON public.ingredientes
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo
      AND p.nome IN ('Administrador', 'Gerente', 'Estoque'))
);

DROP POLICY IF EXISTS estoque_cadastro_por_unidade ON public.estoque_lojas;
CREATE POLICY estoque_cadastro_por_unidade ON public.estoque_lojas
FOR INSERT TO authenticated WITH CHECK (
  quantidade_disponivel >= 0 AND quantidade_minima >= 0
  AND EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo
      AND p.nome IN ('Administrador', 'Gerente', 'Estoque')
      AND (u.loja_id IS NULL OR u.loja_id = estoque_lojas.loja_id))
);
COMMIT;
