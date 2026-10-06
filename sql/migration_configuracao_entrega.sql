-- Cadastro de origem e tarifa: não altera pedidos, saldos nem tipo de operação.
-- Pré-requisitos: schema.sql e migration_fase1.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.configuracoes_entrega (
  loja_id uuid PRIMARY KEY REFERENCES public.lojas(id),
  cep text NOT NULL CHECK (cep ~ '^[0-9]{8}$'),
  endereco text NOT NULL CHECK (length(btrim(endereco)) BETWEEN 1 AND 250),
  numero text NOT NULL CHECK (length(btrim(numero)) BETWEEN 1 AND 30),
  complemento text NOT NULL DEFAULT '' CHECK (length(complemento) <= 250),
  bairro text NOT NULL CHECK (length(btrim(bairro)) BETWEEN 1 AND 150),
  cidade text NOT NULL CHECK (length(btrim(cidade)) BETWEEN 1 AND 150),
  estado text NOT NULL CHECK (estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  valor_km numeric(8,2) NOT NULL CHECK (valor_km > 0 AND valor_km <= 1000)
);
ALTER TABLE public.configuracoes_entrega ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.configuracoes_entrega FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.configuracoes_entrega TO authenticated;

DROP POLICY IF EXISTS entrega_leitura ON public.configuracoes_entrega;
CREATE POLICY entrega_leitura ON public.configuracoes_entrega FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()
  AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)));

DROP POLICY IF EXISTS entrega_cadastro ON public.configuracoes_entrega;
CREATE POLICY entrega_cadastro ON public.configuracoes_entrega FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
  WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')
  AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)));

DROP POLICY IF EXISTS entrega_edicao ON public.configuracoes_entrega;
CREATE POLICY entrega_edicao ON public.configuracoes_entrega FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
  WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')
  AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
  WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')
  AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)));
NOTIFY pgrst, 'reload schema';
COMMIT;
