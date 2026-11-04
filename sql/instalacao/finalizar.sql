-- Somente instalação nova: aplicar após todos os arquivos do manifesto.
-- Não afrouxa as RLS nem reabre gravação direta de pedido/estoque.
BEGIN;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.lojas, public.clientes, public.ingredientes,
 public.produtos, public.produto_variacoes, public.fichas_tecnicas,
 public.estoque_lojas, public.pedidos, public.itens_pedido,
 public.itens_pedido_adicionais, public.adicionais,
 public.produto_adicionais_disponiveis, public.categorias,
 public.configuracoes_canal, public.configuracoes_pagamento TO authenticated;
GRANT INSERT, UPDATE ON public.clientes, public.ingredientes,
 public.produtos, public.produto_variacoes, public.fichas_tecnicas,
 public.adicionais, public.produto_adicionais_disponiveis, public.categorias TO authenticated;
GRANT INSERT ON public.estoque_lojas TO authenticated;
-- Estruturas legadas sem módulo/isolamento próprio ficam fechadas.
REVOKE ALL ON public.fornecedores, public.cervejas_detalhes,
 public.torneiras_chopp FROM PUBLIC,anon,authenticated;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cervejas_detalhes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneiras_chopp ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF to_regclass('public.historico_estoque') IS NOT NULL THEN
  REVOKE ALL ON public.historico_estoque FROM PUBLIC,anon,authenticated;
  ALTER TABLE public.historico_estoque ENABLE ROW LEVEL SECURITY;
 END IF;
END; $$;

-- Operação de implantação pelo dono do banco, nunca por RPC pública.
CREATE FUNCTION erp_privado.provisionar_primeiro_master(p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_perfil uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM public.usuarios WHERE master) THEN
  RAISE EXCEPTION 'Já existe master. Utilize a administração existente.';
 END IF;
 SELECT id INTO v_id FROM auth.users WHERE lower(email)=lower(btrim(p_email));
 IF v_id IS NULL THEN RAISE EXCEPTION 'Crie primeiro a conta no Supabase Auth.'; END IF;
 SELECT id INTO v_perfil FROM public.perfis WHERE nome='Administrador';
 INSERT INTO public.usuarios(id,nome,email,perfil_id,empresa_id,loja_id,ativo,master)
 VALUES(v_id,'Administrador da plataforma',btrim(p_email),v_perfil,
  'a0000000-0000-0000-0000-000000000001',NULL,true,true);
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.provisionar_primeiro_master(text) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
