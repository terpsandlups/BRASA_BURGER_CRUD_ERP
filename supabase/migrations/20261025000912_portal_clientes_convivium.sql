BEGIN;

-- Auxiliares legadas não são endpoints públicos. Fixar resolução de tabelas.
DO $$
DECLARE v_assinatura text;
BEGIN
  FOREACH v_assinatura IN ARRAY ARRAY['public.valida_tipo_atendimento()','public.meu_perfil()','public.minha_loja()'] LOOP
    IF to_regprocedure(v_assinatura) IS NOT NULL THEN
      EXECUTE 'ALTER FUNCTION ' || v_assinatura || ' SET search_path = public, pg_temp';
      EXECUTE 'REVOKE ALL ON FUNCTION ' || v_assinatura || ' FROM PUBLIC, anon';
      EXECUTE 'GRANT EXECUTE ON FUNCTION ' || v_assinatura || ' TO authenticated';
    END IF;
  END LOOP;
END;
$$;

-- Cadastro público nunca provisiona colaboradores ou permissões do ERP.
CREATE OR REPLACE FUNCTION public.handle_novo_usuario() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_novo_usuario() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_novo_usuario ON auth.users;
CREATE TRIGGER trg_novo_usuario AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_novo_usuario();

CREATE TABLE public.solicitacoes_mobile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  requisicao_id uuid NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  dados jsonb NOT NULL,
  resumo_itens jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','aceita','recusada','cancelada')),
  pedido_id uuid UNIQUE REFERENCES public.pedidos(id),
  motivo text,
  decidido_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz,
  UNIQUE (usuario_id, requisicao_id),
  CHECK ((status = 'aceita') = (pedido_id IS NOT NULL))
);
CREATE INDEX solicitacoes_mobile_usuario_idx ON public.solicitacoes_mobile(usuario_id, criado_em DESC);
CREATE INDEX solicitacoes_mobile_fila_idx ON public.solicitacoes_mobile(loja_id, criado_em) WHERE status = 'aguardando';
ALTER TABLE public.solicitacoes_mobile ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitacoes_mobile FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.solicitacoes_mobile TO authenticated;
CREATE POLICY mobile_leitura ON public.solicitacoes_mobile FOR SELECT TO authenticated
  USING (usuario_id = (SELECT auth.uid()) OR erp_privado.tem_permissao('vendas','visualizar',loja_id));

-- Somente dados comerciais do cardápio; não expõe custos, fichas ou clientes.
CREATE FUNCTION erp_privado.cardapio_mobile() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'lojas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'nome',l.nome,'tipo_operacao',l.tipo_operacao) ORDER BY l.nome)
      FROM public.lojas l WHERE l.ativo), '[]'::jsonb),
    'itens', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'sku',p.sku,'nome',p.nome,
      'variacao',v.nome_variacao,'preco',round(v.preco_venda * (1 + c.markup_preco_percentual / 100),2),
      'delivery',p.disponivel_delivery,'presencial',p.disponivel_presencial,
      'adicionais',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nome',a.nome,'preco',a.preco_adicional) ORDER BY a.nome)
        FROM public.adicionais a JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
        WHERE pa.produto_sku=p.sku AND a.ativo AND p.permite_adicionais),'[]'::jsonb)) ORDER BY p.nome,v.nome_variacao)
      FROM public.produtos p JOIN public.produto_variacoes v ON v.produto_sku=p.sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE p.ativo AND v.preco_venda >= 0), '[]'::jsonb)
  );
$$;
CREATE FUNCTION public.cardapio_mobile() RETURNS jsonb LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT erp_privado.cardapio_mobile(); $$;
REVOKE ALL ON FUNCTION erp_privado.cardapio_mobile(), public.cardapio_mobile() FROM PUBLIC;
GRANT USAGE ON SCHEMA erp_privado TO anon;
GRANT EXECUTE ON FUNCTION erp_privado.cardapio_mobile(), public.cardapio_mobile() TO anon, authenticated;

CREATE FUNCTION erp_privado.enviar_mobile(p_requisicao uuid, p_dados jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_usuario uuid := auth.uid(); v_anterior public.solicitacoes_mobile%ROWTYPE;
  v_loja uuid := (p_dados->>'loja_id')::uuid; v_item jsonb; v_extra jsonb;
  v_preco numeric; v_preco_extra numeric; v_total numeric := 0; v_id uuid; v_sku text; v_nome text;
  v_resumo jsonb := '[]';
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
  IF p_dados->>'tipo_atendimento'='delivery' THEN
    IF COALESCE(p_dados->'endereco'->>'cep','') !~ '^[0-9]{8}$'
      OR COALESCE(p_dados->'endereco'->>'estado','') !~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
      OR EXISTS (SELECT 1 FROM unnest(ARRAY['endereco','numero','bairro','cidade']) c
        WHERE length(btrim(COALESCE(p_dados->'endereco'->>c,''))) NOT BETWEEN 1 AND 150)
      THEN RAISE EXCEPTION 'Preencha o endereço completo da entrega.'; END IF;
  END IF;
  IF jsonb_typeof(p_dados->'itens') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Carrinho inválido.'; END IF;
  IF jsonb_array_length(p_dados->'itens') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Informe entre 1 e 50 itens.'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_dados->'itens') LOOP
    IF COALESCE(v_item->>'quantidade','') !~ '^([1-9]|[1-9][0-9])$' THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    SELECT round(v.preco_venda*(1+c.markup_preco_percentual/100),2),p.sku,p.nome || ' · ' || v.nome_variacao INTO v_preco,v_sku,v_nome
      FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE v.id=(v_item->>'variacao_id')::uuid AND p.ativo
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
    AND (p_dados->>'troco_para')::numeric < v_total THEN RAISE EXCEPTION 'Troco inferior ao subtotal.'; END IF;
  INSERT INTO public.solicitacoes_mobile(usuario_id,requisicao_id,loja_id,dados,resumo_itens,subtotal)
    VALUES(v_usuario,p_requisicao,v_loja,p_dados,v_resumo,v_total) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
CREATE FUNCTION public.enviar_solicitacao_mobile(p_requisicao uuid,p_dados jsonb) RETURNS uuid
LANGUAGE sql SET search_path = '' AS $$ SELECT erp_privado.enviar_mobile(p_requisicao,p_dados); $$;

CREATE FUNCTION erp_privado.decidir_mobile(p_id uuid,p_acao text,p_motivo text,p_cotacao uuid) RETURNS uuid
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
    IF v_s.dados->>'tipo_atendimento'='delivery' THEN
      SELECT * INTO v_cotacao FROM public.cotacoes_entrega WHERE id=p_cotacao;
      IF NOT FOUND OR EXISTS (SELECT 1 FROM unnest(ARRAY['cep','estado','endereco','numero','bairro','cidade','complemento']) c
        WHERE btrim(COALESCE(v_cotacao.destino->>c,'')) IS DISTINCT FROM btrim(COALESCE(v_s.dados->'endereco'->>c,'')))
        THEN RAISE EXCEPTION 'Calcule o frete para o endereço desta solicitação.'; END IF;
    END IF;
    -- CPF informado pelo cliente não dá direito de ler ou sobrescrever um cadastro existente.
    INSERT INTO public.clientes(cpf,nome,telefone) VALUES(v_s.dados->>'cpf',v_s.dados->>'nome',v_s.dados->>'telefone') ON CONFLICT(cpf) DO NOTHING;
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
CREATE FUNCTION public.decidir_solicitacao_mobile(p_id uuid,p_acao text,p_motivo text DEFAULT NULL,p_cotacao uuid DEFAULT NULL) RETURNS uuid
LANGUAGE sql SET search_path = '' AS $$ SELECT erp_privado.decidir_mobile(p_id,p_acao,p_motivo,p_cotacao); $$;
REVOKE ALL ON FUNCTION erp_privado.enviar_mobile(uuid,jsonb),public.enviar_solicitacao_mobile(uuid,jsonb),
  erp_privado.decidir_mobile(uuid,text,text,uuid),public.decidir_solicitacao_mobile(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.enviar_mobile(uuid,jsonb),public.enviar_solicitacao_mobile(uuid,jsonb),
  erp_privado.decidir_mobile(uuid,text,text,uuid),public.decidir_solicitacao_mobile(uuid,text,text,uuid) TO authenticated;
CREATE FUNCTION erp_privado.acompanhar_mobile(p_pagina integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.criado_em DESC,t.id),'[]'::jsonb) FROM (
    SELECT s.id,s.status,s.subtotal,s.motivo,s.criado_em,l.nome AS loja,p.status AS etapa,p.valor_total AS total,p.taxa_entrega AS frete
    FROM public.solicitacoes_mobile s JOIN public.lojas l ON l.id=s.loja_id LEFT JOIN public.pedidos p ON p.id=s.pedido_id
    WHERE s.usuario_id=auth.uid() ORDER BY s.criado_em DESC,s.id LIMIT 20 OFFSET least(greatest(COALESCE(p_pagina,0),0),10000)*20
  ) t;
$$;
CREATE FUNCTION public.acompanhar_solicitacoes_mobile(p_pagina integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT erp_privado.acompanhar_mobile(p_pagina); $$;
REVOKE ALL ON FUNCTION erp_privado.acompanhar_mobile(integer),public.acompanhar_solicitacoes_mobile(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.acompanhar_mobile(integer),public.acompanhar_solicitacoes_mobile(integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
