BEGIN;
CREATE TABLE public.empresas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL CHECK(length(btrim(nome)) BETWEEN 2 AND 120),
 slug text UNIQUE NOT NULL CHECK(slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
 cor text NOT NULL DEFAULT '#e4ae65' CHECK(cor ~ '^#[0-9a-fA-F]{6}$'),
 logo_url text CHECK(logo_url IS NULL OR logo_url ~ '^https://'), ativo boolean NOT NULL DEFAULT true
);
INSERT INTO public.empresas(id,nome,slug) VALUES('a0000000-0000-0000-0000-000000000001','Brasa Burger','brasa-burger');
ALTER TABLE public.usuarios ADD COLUMN empresa_id uuid REFERENCES public.empresas(id), ADD COLUMN master boolean NOT NULL DEFAULT false;
UPDATE public.usuarios SET empresa_id='a0000000-0000-0000-0000-000000000001';
UPDATE public.usuarios SET master=true WHERE ativo AND loja_id IS NULL AND perfil_id IN (SELECT id FROM public.perfis WHERE nome='Administrador');
ALTER TABLE public.usuarios ALTER COLUMN empresa_id SET NOT NULL;
CREATE FUNCTION erp_privado.empresa_atual() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT u.empresa_id FROM public.usuarios u JOIN public.empresas e ON e.id=u.empresa_id WHERE u.id=auth.uid() AND u.ativo AND e.ativo;
$$;
CREATE FUNCTION erp_privado.master() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id=auth.uid() AND ativo AND master);
$$;
CREATE FUNCTION erp_privado.admin_empresa() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id=u.perfil_id WHERE u.id=auth.uid() AND u.ativo AND p.nome='Administrador');
$$;
REVOKE ALL ON FUNCTION erp_privado.empresa_atual(),erp_privado.master(),erp_privado.admin_empresa() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.empresa_atual(),erp_privado.master(),erp_privado.admin_empresa() TO authenticated;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.empresas FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.empresas TO authenticated;
CREATE POLICY empresas_leitura ON public.empresas FOR SELECT TO authenticated USING (id=(SELECT erp_privado.empresa_atual()) OR (SELECT erp_privado.master()));

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['lojas','clientes','produtos','ingredientes','categorias','adicionais','pedidos','cotacoes_entrega'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id)',t);
  EXECUTE format('UPDATE public.%I SET empresa_id=''a0000000-0000-0000-0000-000000000001''',t);
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL, ALTER COLUMN empresa_id SET DEFAULT erp_privado.empresa_atual()',t);
  EXECUTE format('CREATE INDEX ON public.%I(empresa_id)',t);
  EXECUTE format('CREATE POLICY empresa_isolamento ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(empresa_id=(SELECT erp_privado.empresa_atual())) WITH CHECK(empresa_id=(SELECT erp_privado.empresa_atual()))',t);
 END LOOP;
END; $$;
-- CPF identifica o consumidor dentro da empresa, sem misturar cadastros de marcas.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conrelid::regclass AS tabela,conname FROM pg_constraint WHERE confrelid='public.clientes'::regclass AND contype='f' LOOP
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.tabela,c.conname);
 END LOOP;
END; $$;
ALTER TABLE public.clientes DROP CONSTRAINT clientes_pkey;
ALTER TABLE public.clientes ADD PRIMARY KEY(empresa_id,cpf);
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_cliente_cpf_fkey FOREIGN KEY(empresa_id,cliente_cpf) REFERENCES public.clientes(empresa_id,cpf);
ALTER TABLE public.cotacoes_entrega ADD CONSTRAINT cotacoes_entrega_cliente_cpf_fkey FOREIGN KEY(empresa_id,cliente_cpf) REFERENCES public.clientes(empresa_id,cpf);
ALTER TABLE public.cotacoes_entrega ALTER COLUMN empresa_id DROP DEFAULT;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.categorias'::regclass AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (nome)' LOOP
  EXECUTE format('ALTER TABLE public.categorias DROP CONSTRAINT %I',c.conname);
 END LOOP;
END; $$;
ALTER TABLE public.categorias ADD UNIQUE(empresa_id,nome);

CREATE OR REPLACE FUNCTION erp_privado.tem_permissao(p_modulo text,p_acao text,p_loja uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id=u.perfil_id JOIN public.empresas e ON e.id=u.empresa_id
 WHERE u.id=auth.uid() AND u.ativo AND e.ativo
 AND (p_loja IS NULL OR EXISTS(SELECT 1 FROM public.lojas l WHERE l.id=p_loja AND l.empresa_id=u.empresa_id))
 AND (p_loja IS NULL OR u.loja_id IS NULL OR u.loja_id=p_loja)
 AND (pf.nome IN ('Administrador','Gerente') OR (pf.nome='Estoque' AND p_modulo='estoque') OR EXISTS
 (SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id=u.perfil_id AND pe.modulo=p_modulo AND CASE p_acao WHEN 'visualizar' THEN pe.pode_visualizar WHEN 'criar' THEN pe.pode_criar WHEN 'editar' THEN pe.pode_editar ELSE false END)));
$$;
-- Tabelas filhas só podem se relacionar a dados da mesma empresa.
CREATE FUNCTION erp_privado.validar_vinculo_empresa() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_empresa uuid; v_outra uuid;
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'produtos' THEN v_empresa:=NEW.empresa_id; v_outra:=v_empresa;
  IF to_jsonb(NEW)->>'categoria_id' IS NOT NULL THEN SELECT empresa_id INTO v_outra FROM public.categorias WHERE id=(to_jsonb(NEW)->>'categoria_id')::uuid; END IF;
 WHEN 'adicionais' THEN v_empresa:=NEW.empresa_id; v_outra:=v_empresa;
  IF NEW.ingrediente_id IS NOT NULL THEN SELECT empresa_id INTO v_outra FROM public.ingredientes WHERE id=NEW.ingrediente_id; END IF;
 WHEN 'estoque_lojas' THEN SELECT empresa_id INTO v_empresa FROM public.lojas WHERE id=NEW.loja_id; SELECT empresa_id INTO v_outra FROM public.ingredientes WHERE id=NEW.ingrediente_id;
 WHEN 'produto_variacoes' THEN SELECT empresa_id INTO v_empresa FROM public.produtos WHERE sku=NEW.produto_sku; v_outra:=v_empresa;
 WHEN 'fichas_tecnicas' THEN SELECT p.empresa_id INTO v_empresa FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku WHERE v.id=NEW.variacao_id; SELECT empresa_id INTO v_outra FROM public.ingredientes WHERE id=NEW.ingrediente_id;
 WHEN 'produto_adicionais_disponiveis' THEN SELECT empresa_id INTO v_empresa FROM public.produtos WHERE sku=NEW.produto_sku; SELECT empresa_id INTO v_outra FROM public.adicionais WHERE id=NEW.adicional_id;
 WHEN 'itens_pedido' THEN SELECT empresa_id INTO v_empresa FROM public.pedidos WHERE id=NEW.pedido_id; SELECT p.empresa_id INTO v_outra FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku WHERE v.id=NEW.variacao_id AND p.sku=NEW.produto_sku;
 WHEN 'itens_pedido_adicionais' THEN SELECT p.empresa_id INTO v_empresa FROM public.itens_pedido i JOIN public.pedidos p ON p.id=i.pedido_id WHERE i.id=NEW.item_pedido_id; SELECT empresa_id INTO v_outra FROM public.adicionais WHERE id=NEW.adicional_id;
 WHEN 'pedidos','cotacoes_entrega' THEN SELECT empresa_id INTO v_empresa FROM public.lojas WHERE id=NEW.loja_id; NEW.empresa_id:=v_empresa; v_outra:=v_empresa;
 END CASE;
 IF v_empresa IS NULL OR v_empresa IS DISTINCT FROM v_outra THEN RAISE EXCEPTION 'Vínculo entre empresas diferentes não permitido.' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND v_empresa IS DISTINCT FROM erp_privado.empresa_atual() THEN RAISE EXCEPTION 'Sem permissão nesta empresa.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.validar_vinculo_empresa() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['produtos','adicionais','estoque_lojas','produto_variacoes','fichas_tecnicas','produto_adicionais_disponiveis','itens_pedido','itens_pedido_adicionais','pedidos','cotacoes_entrega'] LOOP
  EXECUTE format('CREATE TRIGGER empresa_vinculo BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION erp_privado.validar_vinculo_empresa()',t);
 END LOOP;
END; $$;
-- Restrição adicional em políticas legadas sem remover as regras de módulo/unidade.
CREATE POLICY empresa_variacoes ON public.produto_variacoes AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku)) WITH CHECK(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku));
CREATE POLICY empresa_fichas ON public.fichas_tecnicas AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.produto_variacoes v WHERE v.id=variacao_id)) WITH CHECK(EXISTS(SELECT 1 FROM public.produto_variacoes v WHERE v.id=variacao_id));
CREATE POLICY empresa_adicionais_vinculos ON public.produto_adicionais_disponiveis AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku)) WITH CHECK(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku));
CREATE POLICY empresa_estoque ON public.estoque_lojas AS RESTRICTIVE FOR ALL TO authenticated USING(erp_privado.tem_permissao('estoque','visualizar',loja_id)) WITH CHECK(erp_privado.tem_permissao('estoque','criar',loja_id));
CREATE POLICY empresa_usuarios ON public.usuarios AS RESTRICTIVE FOR SELECT TO authenticated USING(id=auth.uid() OR (empresa_id=(SELECT erp_privado.empresa_atual()) AND (SELECT erp_privado.admin_empresa())));
CREATE POLICY empresa_reposicoes ON public.reposicoes_estoque AS RESTRICTIVE FOR SELECT TO authenticated USING(erp_privado.tem_permissao('estoque','visualizar',loja_id));
DO $$ BEGIN
 IF to_regclass('public.configuracoes_entrega') IS NOT NULL THEN
  EXECUTE 'CREATE POLICY empresa_entrega ON public.configuracoes_entrega AS RESTRICTIVE FOR ALL TO authenticated USING(erp_privado.tem_permissao(''vendas'',''visualizar'',loja_id)) WITH CHECK(erp_privado.tem_permissao(''vendas'',''editar'',loja_id))';
 END IF;
END; $$;
-- RPCs legadas mantêm as regras de negócio e recebem guarda de empresa antes de qualquer leitura/escrita.
DO $$ DECLARE f record; d text; guarda text; BEGIN
 FOR f IN SELECT oid,proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('criar_pedido_transacional','avancar_pedido_transacional','cancelar_pedido_transacional','repor_estoque_transacional','preparar_consulta_rota','editar_variacao','editar_quantidade_ficha') LOOP
  guarda:=CASE f.proname
   WHEN 'criar_pedido_transacional' THEN 'erp_privado.tem_permissao(''vendas'',''criar'',(p_dados->>''loja_id'')::uuid)'
   WHEN 'avancar_pedido_transacional' THEN 'erp_privado.tem_permissao(''vendas'',''editar'',(SELECT loja_id FROM public.pedidos WHERE id=p_pedido)) AND EXISTS(SELECT 1 FROM public.pedidos WHERE id=p_pedido AND empresa_id=erp_privado.empresa_atual())'
   WHEN 'cancelar_pedido_transacional' THEN 'erp_privado.tem_permissao(''vendas'',''editar'',(SELECT loja_id FROM public.pedidos WHERE id=p_pedido)) AND EXISTS(SELECT 1 FROM public.pedidos WHERE id=p_pedido AND empresa_id=erp_privado.empresa_atual())'
   WHEN 'repor_estoque_transacional' THEN 'erp_privado.tem_permissao(''estoque'',''criar'',p_loja)'
   WHEN 'preparar_consulta_rota' THEN 'erp_privado.tem_permissao(''vendas'',''criar'',p_loja)'
   WHEN 'editar_variacao' THEN 'EXISTS(SELECT 1 FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku WHERE v.id=p_id AND p.empresa_id=erp_privado.empresa_atual())'
   ELSE 'EXISTS(SELECT 1 FROM public.fichas_tecnicas ft JOIN public.produto_variacoes v ON v.id=ft.variacao_id JOIN public.produtos p ON p.sku=v.produto_sku WHERE ft.id=p_id AND p.empresa_id=erp_privado.empresa_atual())' END;
  d:=pg_get_functiondef(f.oid);
  d:=regexp_replace(d,'BEGIN\s*','BEGIN ' || 'IF NOT ('||guarda||') THEN RAISE EXCEPTION ''Sem permissão nesta empresa/unidade.'' USING ERRCODE=''42501''; END IF; ');
  EXECUTE d;
 END LOOP;
END; $$;

CREATE FUNCTION erp_privado.administrar(p_acao text,p_dados jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_empresa uuid:=erp_privado.empresa_atual(); v_usuario uuid; v_perfil uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT erp_privado.admin_empresa() THEN RAISE EXCEPTION 'Acesso exclusivo do administrador.' USING ERRCODE='42501'; END IF;
 CASE p_acao
 WHEN 'selecionar_empresa' THEN
  IF NOT erp_privado.master() THEN RAISE EXCEPTION 'Acesso exclusivo da conta master.'; END IF;
  v_id:=(p_dados->>'id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.empresas WHERE id=v_id AND ativo) THEN RAISE EXCEPTION 'Empresa indisponível.'; END IF;
  UPDATE public.usuarios SET empresa_id=v_id,loja_id=NULL WHERE id=auth.uid();
 WHEN 'empresa' THEN
  v_id:=NULLIF(p_dados->>'id','')::uuid;
  IF v_id IS NULL THEN
   IF NOT erp_privado.master() THEN RAISE EXCEPTION 'Acesso exclusivo da conta master.'; END IF;
   INSERT INTO public.empresas(nome,slug,cor,logo_url) VALUES(btrim(p_dados->>'nome'),p_dados->>'slug',COALESCE(p_dados->>'cor','#e4ae65'),NULLIF(p_dados->>'logo_url','')) RETURNING id INTO v_id;
   INSERT INTO public.categorias(empresa_id,nome) SELECT v_id,n FROM unnest(ARRAY['Lanches','Bebidas','Sobremesas','Combos']) n;
  ELSE
   IF v_id<>v_empresa THEN RAISE EXCEPTION 'Selecione a empresa antes de editar.'; END IF;
   UPDATE public.empresas SET nome=btrim(p_dados->>'nome'),cor=p_dados->>'cor',logo_url=NULLIF(p_dados->>'logo_url','') WHERE id=v_id;
  END IF;
 WHEN 'loja' THEN
  v_id:=COALESCE(NULLIF(p_dados->>'id','')::uuid,gen_random_uuid());
  IF length(btrim(COALESCE(p_dados->>'nome',''))) NOT BETWEEN 2 AND 120 OR p_dados->>'tipo_operacao' NOT IN ('presencial_delivery','delivery_only') THEN RAISE EXCEPTION 'Confira nome e operação da unidade.'; END IF;
  INSERT INTO public.lojas(id,empresa_id,nome,slug,tipo_operacao,ativo) VALUES(v_id,v_empresa,btrim(p_dados->>'nome'),v_id::text,p_dados->>'tipo_operacao',COALESCE((p_dados->>'ativo')::boolean,true))
  ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome,tipo_operacao=EXCLUDED.tipo_operacao,ativo=EXCLUDED.ativo WHERE lojas.empresa_id=v_empresa;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão nesta unidade.'; END IF;
 WHEN 'colaborador' THEN
  SELECT id INTO v_usuario FROM auth.users WHERE lower(email)=lower(btrim(p_dados->>'email')) FOR UPDATE;
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'A conta ainda não existe. O colaborador deve cadastrar seu e-mail antes do vínculo.'; END IF;
  IF EXISTS(SELECT 1 FROM public.usuarios WHERE id=v_usuario AND (master OR empresa_id<>v_empresa)) THEN RAISE EXCEPTION 'Conta já vinculada à plataforma ou a outra empresa.'; END IF;
  IF p_dados->>'perfil' NOT IN ('Administrador','Gerente','Operador','Estoque','Visualização') THEN RAISE EXCEPTION 'Perfil inválido.'; END IF;
  IF p_dados->>'perfil'<>'Administrador' AND (NULLIF(p_dados->>'loja_id','') IS NULL OR NOT EXISTS(SELECT 1 FROM public.lojas WHERE id=(p_dados->>'loja_id')::uuid AND empresa_id=v_empresa)) THEN RAISE EXCEPTION 'Selecione a unidade do colaborador.'; END IF;
  SELECT id INTO v_perfil FROM public.perfis WHERE nome=p_dados->>'perfil';
  INSERT INTO public.usuarios(id,nome,email,perfil_id,empresa_id,loja_id,ativo)
   VALUES(v_usuario,btrim(p_dados->>'nome'),lower(btrim(p_dados->>'email')),v_perfil,v_empresa,CASE WHEN p_dados->>'perfil'='Administrador' THEN NULL ELSE (p_dados->>'loja_id')::uuid END,true)
   ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome,perfil_id=EXCLUDED.perfil_id,loja_id=EXCLUDED.loja_id,ativo=true;
  v_id:=v_usuario;
 ELSE RAISE EXCEPTION 'Ação inválida.';
 END CASE;
 RETURN v_id;
END; $$;
CREATE FUNCTION public.administrar_plataforma(p_acao text,p_dados jsonb) RETURNS uuid LANGUAGE sql SET search_path='' AS $$ SELECT erp_privado.administrar(p_acao,p_dados); $$;
REVOKE ALL ON FUNCTION erp_privado.administrar(text,jsonb),public.administrar_plataforma(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.administrar(text,jsonb),public.administrar_plataforma(text,jsonb) TO authenticated;

-- Cotações do consumidor não exigem expor ou criar cadastros internos de clientes.
CREATE TABLE public.cotacoes_mobile (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),usuario_id uuid NOT NULL REFERENCES auth.users(id),loja_id uuid NOT NULL REFERENCES public.lojas(id),
 origem jsonb NOT NULL,destino jsonb NOT NULL,distancia_metros integer NOT NULL CHECK(distancia_metros BETWEEN 1 AND 1000000),
 valor_km numeric(10,2) NOT NULL CHECK(valor_km>0 AND valor_km<=1000),taxa numeric(10,2) NOT NULL CHECK(taxa=round(distancia_metros::numeric*valor_km/1000,2)),
 criado_em timestamptz NOT NULL DEFAULT now(),expira_em timestamptz NOT NULL DEFAULT(now()+interval '15 minutes'),solicitacao_id uuid UNIQUE REFERENCES public.solicitacoes_mobile(id)
);
ALTER TABLE public.cotacoes_mobile ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cotacoes_mobile FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.cotacoes_mobile TO service_role;
CREATE INDEX ON public.cotacoes_mobile(usuario_id,criado_em);
ALTER TABLE public.solicitacoes_mobile ADD COLUMN cotacao_mobile_id uuid UNIQUE REFERENCES public.cotacoes_mobile(id),ADD COLUMN taxa_entrega numeric(10,2) NOT NULL DEFAULT 0;



DROP FUNCTION public.cardapio_mobile();
DROP FUNCTION erp_privado.cardapio_mobile();
CREATE OR REPLACE FUNCTION erp_privado.cardapio_mobile(p_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('empresa',(SELECT jsonb_build_object('nome',nome,'slug',slug,'cor',cor,'logo_url',logo_url) FROM public.empresas WHERE slug=p_slug AND ativo),
    'lojas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'nome',l.nome,'tipo_operacao',l.tipo_operacao) ORDER BY l.nome)
      FROM public.lojas l WHERE l.ativo AND l.empresa_id IN (SELECT id FROM public.empresas WHERE slug=p_slug AND ativo)), '[]'::jsonb),
    'itens', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'sku',p.sku,'nome',p.nome,
      'variacao',v.nome_variacao,'preco',round(v.preco_venda * (1 + c.markup_preco_percentual / 100),2),
      'delivery',p.disponivel_delivery,'presencial',p.disponivel_presencial,
      'adicionais',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nome',a.nome,'preco',a.preco_adicional) ORDER BY a.nome)
        FROM public.adicionais a JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
        WHERE pa.produto_sku=p.sku AND a.ativo AND p.permite_adicionais),'[]'::jsonb)) ORDER BY p.nome,v.nome_variacao)
      FROM public.produtos p JOIN public.produto_variacoes v ON v.produto_sku=p.sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE p.ativo AND v.preco_venda >= 0 AND p.empresa_id IN (SELECT id FROM public.empresas WHERE slug=p_slug AND ativo)), '[]'::jsonb)
  );
$$;
CREATE FUNCTION public.cardapio_mobile(p_slug text DEFAULT 'brasa-burger') RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$ SELECT erp_privado.cardapio_mobile(p_slug); $$;
REVOKE ALL ON FUNCTION erp_privado.cardapio_mobile(text),public.cardapio_mobile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION erp_privado.cardapio_mobile(text),public.cardapio_mobile(text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION erp_privado.enviar_mobile(p_requisicao uuid, p_dados jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_usuario uuid := auth.uid(); v_anterior public.solicitacoes_mobile%ROWTYPE;
  v_loja uuid := (p_dados->>'loja_id')::uuid; v_item jsonb; v_extra jsonb;
  v_preco numeric; v_preco_extra numeric; v_total numeric := 0; v_id uuid; v_sku text; v_nome text;
  v_empresa uuid; v_cotacao public.cotacoes_mobile%ROWTYPE; v_resumo jsonb := '[]';
  v_cpf text := p_dados->>'cpf'; v_soma integer; v_digito integer; v_i integer; v_j integer;
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para enviar o pedido.'; END IF;
  IF p_dados IS NULL OR octet_length(p_dados::text) > 32000 THEN RAISE EXCEPTION 'Pedido excede o limite permitido.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text, 1));
  SELECT * INTO v_anterior FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND requisicao_id=p_requisicao;
  IF FOUND THEN
    IF v_anterior.dados IS DISTINCT FROM p_dados THEN RAISE EXCEPTION 'Reenvio com conteúdo diferente.'; END IF;
    RETURN v_anterior.id;
  END IF;
  IF (SELECT count(*) FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND criado_em > now()-interval '15 minutes') >= 5
    OR (SELECT count(*) FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND status='aguardando') >= 10
    THEN RAISE EXCEPTION 'Limite de solicitações atingido. Aguarde o atendimento da loja.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id=v_loja AND ativo
    AND (p_dados->>'tipo_atendimento'='delivery' OR (p_dados->>'tipo_atendimento'='presencial' AND tipo_operacao='presencial_delivery')))
    THEN RAISE EXCEPTION 'Unidade indisponível para este atendimento.'; END IF;
  IF COALESCE(p_dados->>'forma_pagamento','') NOT IN ('pix','credito','debito','dinheiro')
    OR length(btrim(COALESCE(p_dados->>'nome',''))) NOT BETWEEN 2 AND 120
    OR COALESCE(p_dados->>'telefone','') !~ '^[0-9]{10,11}$'
    OR length(COALESCE(p_dados->>'observacoes','')) > 500 THEN RAISE EXCEPTION 'Confira nome, telefone e pagamento.'; END IF;
  IF COALESCE(v_cpf,'') !~ '^[0-9]{11}$' OR v_cpf ~ '^([0-9])\1{10}$' THEN RAISE EXCEPTION 'CPF inválido.'; END IF;
  FOR v_j IN 9..10 LOOP
    v_soma := 0;
    FOR v_i IN 1..v_j LOOP v_soma := v_soma + substring(v_cpf,v_i,1)::integer * (v_j+2-v_i); END LOOP;
    v_digito := (v_soma*10)%11;
    IF v_digito=10 THEN v_digito:=0; END IF;
    IF v_digito <> substring(v_cpf,v_j+1,1)::integer THEN RAISE EXCEPTION 'CPF inválido.'; END IF;
  END LOOP;
  SELECT empresa_id INTO v_empresa FROM public.lojas WHERE id=v_loja;
  IF p_dados->>'tipo_atendimento'='delivery' THEN
    IF COALESCE(p_dados->'endereco'->>'cep','') !~ '^[0-9]{8}$'
      OR COALESCE(p_dados->'endereco'->>'estado','') !~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
      OR EXISTS (SELECT 1 FROM unnest(ARRAY['endereco','numero','bairro','cidade']) c
        WHERE length(btrim(COALESCE(p_dados->'endereco'->>c,''))) NOT BETWEEN 1 AND 150)
      THEN RAISE EXCEPTION 'Preencha o endereço completo da entrega.'; END IF;
  END IF;
  IF jsonb_typeof(p_dados->'itens') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Carrinho inválido.'; END IF;
  IF jsonb_array_length(p_dados->'itens') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Informe entre 1 e 50 itens.'; END IF;
  IF p_dados->>'tipo_atendimento'='delivery' THEN
    SELECT * INTO v_cotacao FROM public.cotacoes_mobile WHERE id=(p_dados->>'cotacao_id')::uuid FOR UPDATE;
    IF NOT FOUND OR v_cotacao.usuario_id<>v_usuario OR v_cotacao.loja_id<>v_loja OR v_cotacao.expira_em<=now() OR v_cotacao.solicitacao_id IS NOT NULL
      OR EXISTS(SELECT 1 FROM unnest(ARRAY['cep','estado','endereco','numero','bairro','cidade','complemento']) c WHERE btrim(COALESCE(v_cotacao.destino->>c,'')) IS DISTINCT FROM btrim(COALESCE(p_dados->'endereco'->>c,'')))
      THEN RAISE EXCEPTION 'Frete expirado ou endereço alterado. Calcule novamente.'; END IF;
  ELSIF p_dados->>'cotacao_id' IS NOT NULL THEN RAISE EXCEPTION 'Retirada não utiliza frete.'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_dados->'itens') LOOP
    IF COALESCE(v_item->>'quantidade','') !~ '^([1-9]|[1-9][0-9])$' THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    SELECT round(v.preco_venda*(1+c.markup_preco_percentual/100),2),p.sku,p.nome || ' · ' || v.nome_variacao INTO v_preco,v_sku,v_nome
      FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE v.id=(v_item->>'variacao_id')::uuid AND p.ativo AND p.empresa_id=v_empresa
        AND ((p_dados->>'tipo_atendimento'='delivery' AND p.disponivel_delivery) OR
             (p_dados->>'tipo_atendimento'='presencial' AND p.disponivel_presencial));
    IF NOT FOUND OR v_preco < 0 OR (v_item->>'preco_unitario')::numeric IS DISTINCT FROM v_preco THEN
      RAISE EXCEPTION 'Preço ou produto alterado. Atualize o cardápio.'; END IF;
    IF jsonb_typeof(v_item->'adicionais') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Adicionais inválidos.'; END IF;
    IF jsonb_array_length(v_item->'adicionais') > 20 OR
      (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(v_item->'adicionais'))
      THEN RAISE EXCEPTION 'Adicionais inválidos ou repetidos.'; END IF;
    FOR v_extra IN SELECT value FROM jsonb_array_elements(v_item->'adicionais') LOOP
      SELECT a.preco_adicional INTO v_preco_extra FROM public.adicionais a
        JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
        JOIN public.produtos p ON p.sku=pa.produto_sku
        WHERE a.id=(v_extra->>'id')::uuid AND pa.produto_sku=v_sku AND a.ativo AND p.permite_adicionais;
      IF NOT FOUND OR v_preco_extra < 0 OR (v_extra->>'preco_unitario')::numeric IS DISTINCT FROM v_preco_extra THEN
        RAISE EXCEPTION 'Adicional ou preço alterado. Atualize o cardápio.'; END IF;
      v_preco := v_preco + v_preco_extra;
    END LOOP;
    v_total := v_total + v_preco * (v_item->>'quantidade')::integer;
    v_resumo := v_resumo || jsonb_build_array(jsonb_build_object('nome',v_nome,'quantidade',v_item->'quantidade','total',v_preco*(v_item->>'quantidade')::integer,
      'adicionais',(SELECT COALESCE(jsonb_agg(a.nome),'[]'::jsonb) FROM public.adicionais a WHERE a.id IN
        (SELECT (value->>'id')::uuid FROM jsonb_array_elements(v_item->'adicionais')))));
  END LOOP;
  IF p_dados->>'forma_pagamento'='dinheiro' AND NULLIF(p_dados->>'troco_para','') IS NOT NULL
    AND (p_dados->>'troco_para')::numeric < v_total + COALESCE(v_cotacao.taxa,0) THEN RAISE EXCEPTION 'Troco inferior ao subtotal.'; END IF;
  INSERT INTO public.solicitacoes_mobile(usuario_id,requisicao_id,loja_id,dados,resumo_itens,subtotal,cotacao_mobile_id,taxa_entrega)
    VALUES(v_usuario,p_requisicao,v_loja,p_dados,v_resumo,v_total,v_cotacao.id,COALESCE(v_cotacao.taxa,0)) RETURNING id INTO v_id;
  IF v_cotacao.id IS NOT NULL THEN UPDATE public.cotacoes_mobile SET solicitacao_id=v_id WHERE id=v_cotacao.id; END IF;
  RETURN v_id;
END;
$$;
CREATE OR REPLACE FUNCTION erp_privado.decidir_mobile(p_id uuid,p_acao text,p_motivo text,p_cotacao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_s public.solicitacoes_mobile%ROWTYPE; v_pedido uuid; v_dados jsonb; v_cotacao public.cotacoes_entrega%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão obrigatória.'; END IF;
  SELECT * INTO v_s FROM public.solicitacoes_mobile WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação indisponível.'; END IF;
  IF p_acao='cancelar' THEN
    IF v_s.usuario_id <> auth.uid() THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
    IF v_s.status='cancelada' THEN RETURN NULL; END IF;
  ELSIF p_acao IN ('aceitar','recusar') THEN
    IF NOT erp_privado.tem_permissao('vendas','criar',v_s.loja_id) THEN RAISE EXCEPTION 'Sem permissão nesta unidade.'; END IF;
    IF p_acao='aceitar' AND v_s.status='aceita' THEN RETURN v_s.pedido_id; END IF;
    IF p_acao='recusar' AND v_s.status='recusada' THEN RETURN NULL; END IF;
  ELSE RAISE EXCEPTION 'Ação inválida.';
  END IF;
  IF v_s.status <> 'aguardando' THEN RAISE EXCEPTION 'Solicitação já decidida em outra sessão.'; END IF;
  IF p_acao='recusar' AND length(btrim(COALESCE(p_motivo,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Informe o motivo da recusa.'; END IF;
  IF p_acao='aceitar' THEN
    INSERT INTO public.clientes(cpf,nome,telefone) VALUES(v_s.dados->>'cpf',v_s.dados->>'nome',v_s.dados->>'telefone') ON CONFLICT(empresa_id,cpf) DO NOTHING;
    IF v_s.dados->>'tipo_atendimento'='delivery' AND v_s.cotacao_mobile_id IS NOT NULL THEN
      INSERT INTO public.cotacoes_entrega(usuario_id,loja_id,cliente_cpf,origem,destino,distancia_metros,valor_km,taxa,provedor)
      SELECT auth.uid(),loja_id,v_s.dados->>'cpf',origem,destino,distancia_metros,valor_km,taxa,'openrouteservice' FROM public.cotacoes_mobile WHERE id=v_s.cotacao_mobile_id AND solicitacao_id=v_s.id
      RETURNING * INTO v_cotacao;
      IF NOT FOUND THEN RAISE EXCEPTION 'Frete não confirmado para esta solicitação.'; END IF;
      p_cotacao:=v_cotacao.id;
    END IF;
    IF v_s.dados->>'tipo_atendimento'='delivery' THEN
      SELECT * INTO v_cotacao FROM public.cotacoes_entrega WHERE id=p_cotacao;
      IF NOT FOUND OR EXISTS (SELECT 1 FROM unnest(ARRAY['cep','estado','endereco','numero','bairro','cidade','complemento']) c
        WHERE btrim(COALESCE(v_cotacao.destino->>c,'')) IS DISTINCT FROM btrim(COALESCE(v_s.dados->'endereco'->>c,'')))
        THEN RAISE EXCEPTION 'Calcule o frete para o endereço desta solicitação.'; END IF;
    END IF;
    -- CPF informado pelo cliente não dá direito de ler ou sobrescrever um cadastro existente.
    INSERT INTO public.clientes(cpf,nome,telefone) VALUES(v_s.dados->>'cpf',v_s.dados->>'nome',v_s.dados->>'telefone') ON CONFLICT(empresa_id,cpf) DO NOTHING;
    v_dados := jsonb_build_object('loja_id',v_s.loja_id,'cliente_cpf',v_s.dados->>'cpf',
      'tipo_atendimento',v_s.dados->>'tipo_atendimento','forma_pagamento',v_s.dados->>'forma_pagamento',
      'canal_venda','proprio','cotacao_entrega_id',p_cotacao,
      'observacoes',v_s.dados->>'observacoes','troco_para',COALESCE(NULLIF(v_s.dados->>'troco_para','')::numeric,v_s.subtotal + COALESCE(v_cotacao.taxa,0)),
      'itens',v_s.dados->'itens');
    v_pedido := public.criar_pedido_transacional(v_s.id,v_dados);
  END IF;
  UPDATE public.solicitacoes_mobile SET status=CASE p_acao WHEN 'aceitar' THEN 'aceita' WHEN 'recusar' THEN 'recusada' ELSE 'cancelada' END,
    pedido_id=v_pedido,motivo=NULLIF(btrim(p_motivo),''),decidido_em=now(),decidido_por=auth.uid() WHERE id=p_id;
  RETURN v_pedido;
END;
$$;
CREATE OR REPLACE FUNCTION erp_privado.acompanhar_mobile(p_pagina integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.criado_em DESC,t.id),'[]'::jsonb) FROM (
    SELECT s.id,s.status,s.subtotal,s.taxa_entrega AS frete_estimado,s.motivo,s.criado_em,l.nome AS loja,p.status AS etapa,p.valor_total AS total,p.taxa_entrega AS frete
    FROM public.solicitacoes_mobile s JOIN public.lojas l ON l.id=s.loja_id LEFT JOIN public.pedidos p ON p.id=s.pedido_id
    WHERE s.usuario_id=auth.uid() ORDER BY s.criado_em DESC,s.id LIMIT 20 OFFSET least(greatest(COALESCE(p_pagina,0),0),10000)*20
  ) t;
$$;
CREATE TABLE IF NOT EXISTS public.limites_consulta_rotas(chave text PRIMARY KEY,janela timestamptz NOT NULL,quantidade integer NOT NULL);
ALTER TABLE public.limites_consulta_rotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.limites_consulta_rotas FROM PUBLIC,anon,authenticated;
CREATE FUNCTION erp_privado.preparar_rota_mobile(p_loja uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_config jsonb; v_limite record; v_n integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para calcular o frete.' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(c) INTO v_config FROM public.configuracoes_entrega c JOIN public.lojas l ON l.id=c.loja_id JOIN public.empresas e ON e.id=l.empresa_id WHERE l.id=p_loja AND l.ativo AND e.ativo;
 IF v_config IS NULL THEN RAISE EXCEPTION 'Entrega indisponível nesta unidade.' USING ERRCODE='22023'; END IF;
 FOR v_limite IN SELECT * FROM (VALUES
 ('global:dia',date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',500),
 (auth.uid()::text||':mobile:dia',date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',30),
 (auth.uid()::text||':mobile:minuto',date_trunc('minute',now()),3)) t(chave,janela,maximo) LOOP
 INSERT INTO public.limites_consulta_rotas AS c(chave,janela,quantidade) VALUES(v_limite.chave,v_limite.janela,1)
 ON CONFLICT(chave) DO UPDATE SET janela=EXCLUDED.janela,quantidade=CASE WHEN c.janela=EXCLUDED.janela THEN c.quantidade+1 ELSE 1 END RETURNING quantidade INTO v_n;
 IF v_n>v_limite.maximo THEN RAISE EXCEPTION 'Limite de consultas atingido. Aguarde para tentar novamente.'; END IF;
 END LOOP;
 RETURN v_config;
END; $$;
CREATE FUNCTION public.preparar_consulta_rota_mobile(p_loja uuid) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT erp_privado.preparar_rota_mobile(p_loja); $$;
REVOKE ALL ON FUNCTION public.preparar_consulta_rota_mobile(uuid),erp_privado.preparar_rota_mobile(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preparar_consulta_rota_mobile(uuid),erp_privado.preparar_rota_mobile(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
