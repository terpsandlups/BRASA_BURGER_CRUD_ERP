BEGIN;

-- O ERP não possui catálogo público. As políticas legadas FOR PUBLIC não
-- devem tornar tabelas operacionais acessíveis sem login.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
CREATE SCHEMA IF NOT EXISTS erp_privado;
REVOKE ALL ON SCHEMA erp_privado FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA erp_privado TO authenticated;

CREATE OR REPLACE FUNCTION erp_privado.usuario_ativo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.ativo);
$$;
CREATE OR REPLACE FUNCTION erp_privado.tem_permissao(p_modulo text, p_acao text, p_loja uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo
      AND (p_loja IS NULL OR u.loja_id IS NULL OR u.loja_id = p_loja)
      AND (pf.nome IN ('Administrador','Gerente')
        OR (pf.nome = 'Estoque' AND p_modulo = 'estoque')
        OR EXISTS (SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = p_modulo AND CASE p_acao
            WHEN 'visualizar' THEN pe.pode_visualizar
            WHEN 'criar' THEN pe.pode_criar
            WHEN 'editar' THEN pe.pode_editar ELSE false END))
  );
$$;
REVOKE ALL ON FUNCTION erp_privado.usuario_ativo(), erp_privado.tem_permissao(text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION erp_privado.usuario_ativo(), erp_privado.tem_permissao(text,text,uuid) TO authenticated;

-- Troca as permissivas políticas ALL por regras específicas. Funções de
-- escrita transacional continuam a validar o usuário e a executar como dono.
DO $$
DECLARE v_tabela text; v_politica record;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['usuarios','perfis','permissoes','pedidos','itens_pedido',
    'itens_pedido_adicionais','estoque_lojas','clientes','ingredientes','produtos',
    'produto_variacoes','fichas_tecnicas','categorias','adicionais',
    'produto_adicionais_disponiveis','lojas','configuracoes_canal','configuracoes_pagamento']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabela);
    FOR v_politica IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=v_tabela LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', v_politica.policyname, v_tabela);
    END LOOP;
  END LOOP;
END;
$$;

-- Alterar RBAC exige futura função administrativa; nenhuma tela existente
-- precisa escrever diretamente nestas três tabelas.
REVOKE ALL ON public.usuarios, public.perfis, public.permissoes FROM authenticated;
GRANT SELECT ON public.usuarios, public.perfis, public.permissoes TO authenticated;
CREATE POLICY usuarios_leitura ON public.usuarios FOR SELECT TO authenticated
  USING ((SELECT erp_privado.usuario_ativo()) AND (id = (SELECT auth.uid()) OR (SELECT erp_privado.tem_permissao('usuarios','visualizar'))));
CREATE POLICY perfis_leitura ON public.perfis FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));
CREATE POLICY permissoes_leitura ON public.permissoes FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));

CREATE POLICY pedidos_leitura ON public.pedidos FOR SELECT TO authenticated
  USING (erp_privado.tem_permissao('vendas','visualizar',loja_id));
CREATE POLICY itens_pedido_leitura ON public.itens_pedido FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));
CREATE POLICY itens_adicionais_leitura ON public.itens_pedido_adicionais FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.itens_pedido ip WHERE ip.id = item_pedido_id));

REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.estoque_lojas FROM authenticated;
CREATE POLICY estoque_leitura ON public.estoque_lojas FOR SELECT TO authenticated
  USING (erp_privado.tem_permissao('estoque','visualizar',loja_id));
CREATE POLICY estoque_cadastro ON public.estoque_lojas FOR INSERT TO authenticated
  WITH CHECK (erp_privado.tem_permissao('estoque','criar',loja_id) AND quantidade_disponivel >= 0 AND quantidade_minima >= 0);

REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.clientes FROM authenticated;
CREATE POLICY clientes_leitura ON public.clientes FOR SELECT TO authenticated
  USING ((SELECT erp_privado.tem_permissao('clientes','visualizar')) OR (SELECT erp_privado.tem_permissao('vendas','visualizar')));
CREATE POLICY clientes_cadastro ON public.clientes FOR INSERT TO authenticated
  WITH CHECK ((SELECT erp_privado.tem_permissao('clientes','criar')) OR (SELECT erp_privado.tem_permissao('vendas','criar')));
CREATE POLICY clientes_edicao ON public.clientes FOR UPDATE TO authenticated
  USING ((SELECT erp_privado.tem_permissao('clientes','editar')))
  WITH CHECK ((SELECT erp_privado.tem_permissao('clientes','editar')));

CREATE POLICY ingredientes_leitura ON public.ingredientes FOR SELECT TO authenticated
  USING ((SELECT erp_privado.tem_permissao('estoque','visualizar')) OR (SELECT erp_privado.tem_permissao('produtos','visualizar')));
CREATE POLICY ingredientes_cadastro ON public.ingredientes FOR INSERT TO authenticated
  WITH CHECK ((SELECT erp_privado.tem_permissao('estoque','criar')) OR (SELECT erp_privado.tem_permissao('produtos','criar')));
CREATE POLICY ingredientes_edicao ON public.ingredientes FOR UPDATE TO authenticated
  USING ((SELECT erp_privado.tem_permissao('estoque','editar')) OR (SELECT erp_privado.tem_permissao('produtos','editar')))
  WITH CHECK ((SELECT erp_privado.tem_permissao('estoque','editar')) OR (SELECT erp_privado.tem_permissao('produtos','editar')));
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.ingredientes FROM authenticated;

DO $$
DECLARE v_tabela text;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['produtos','produto_variacoes','fichas_tecnicas','categorias','adicionais','produto_adicionais_disponiveis'] LOOP
    EXECUTE format('REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated', v_tabela);
    EXECUTE format('CREATE POLICY catalogo_leitura ON public.%I FOR SELECT TO authenticated USING (
      (SELECT erp_privado.tem_permissao(''vendas'',''visualizar'')) OR
      (SELECT erp_privado.tem_permissao(''produtos'',''visualizar'')) OR
      (SELECT erp_privado.tem_permissao(''estoque'',''visualizar'')))', v_tabela);
    EXECUTE format('CREATE POLICY catalogo_cadastro ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT erp_privado.tem_permissao(''produtos'',''criar'')))', v_tabela);
    EXECUTE format('CREATE POLICY catalogo_edicao ON public.%I FOR UPDATE TO authenticated
      USING ((SELECT erp_privado.tem_permissao(''produtos'',''editar'')))
      WITH CHECK ((SELECT erp_privado.tem_permissao(''produtos'',''editar'')))', v_tabela);
  END LOOP;
END;
$$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.lojas, public.configuracoes_canal, public.configuracoes_pagamento FROM authenticated;
CREATE POLICY lojas_leitura ON public.lojas FOR SELECT TO authenticated
  USING ((SELECT erp_privado.usuario_ativo()) AND ((SELECT public.minha_loja()) IS NULL OR id = (SELECT public.minha_loja())));
CREATE POLICY canais_leitura ON public.configuracoes_canal FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));
CREATE POLICY pagamentos_leitura ON public.configuracoes_pagamento FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));

DO $$
DECLARE v_view text;
BEGIN
  FOREACH v_view IN ARRAY ARRAY['dim_produto','vw_engenharia_cardapio','dim_loja','dim_categoria','dim_cliente','dim_canal','dim_pagamento','dim_data'] LOOP
    IF to_regclass('public.' || v_view) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_view);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_view);
    END IF;
  END LOOP;
END;
$$;
NOTIFY pgrst, 'reload schema';
COMMIT;
