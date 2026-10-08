-- Teste integrado sem persistência: usa registros existentes apenas dentro
-- desta transação e desfaz cotação, pedido, itens e baixas de estoque no final.
BEGIN;

DO $fixture$
DECLARE
  v_usuario uuid;
  v_loja uuid;
  v_cliente char(11);
  v_cotacao uuid;
BEGIN
  SELECT u.id, l.id, c.cpf INTO v_usuario, v_loja, v_cliente
    FROM public.usuarios u
    JOIN public.perfis perfil ON perfil.id = u.perfil_id
    CROSS JOIN public.lojas l
    CROSS JOIN public.clientes c
    WHERE u.ativo AND l.ativo
      AND (u.loja_id IS NULL OR u.loja_id = l.id)
      AND (perfil.nome IN ('Administrador', 'Gerente') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_criar
      ))
    LIMIT 1;
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Validação requer um operador, loja e cliente ativos.';
  END IF;

  INSERT INTO public.cotacoes_entrega(usuario_id, loja_id, cliente_cpf,
    origem, destino, distancia_metros, valor_km, taxa, provedor)
  VALUES(v_usuario, v_loja, v_cliente, '{"teste":true}'::jsonb,
    '{"teste":true}'::jsonb, 1000, 1.50, 1.50, 'openrouteservice')
  RETURNING id INTO v_cotacao;

  PERFORM set_config('request.jwt.claim.sub', v_usuario::text, true);
  PERFORM set_config('brasa.teste_loja', v_loja::text, true);
  PERFORM set_config('brasa.teste_cliente', btrim(v_cliente::text), true);
  PERFORM set_config('brasa.teste_cotacao', v_cotacao::text, true);
END;
$fixture$;

SET LOCAL ROLE authenticated;

DO $teste$
DECLARE
  v_variacao uuid;
  v_preco numeric;
  v_dados jsonb;
  v_pedido uuid;
  v_requisicao uuid := gen_random_uuid();
  v_erro text;
BEGIN
  SELECT pv.id, round(pv.preco_venda * (1 + cc.markup_preco_percentual / 100), 2)
    INTO v_variacao, v_preco
    FROM public.produto_variacoes pv
    JOIN public.produtos p ON p.sku = pv.produto_sku
    JOIN public.configuracoes_canal cc ON cc.canal_venda = 'proprio'
    WHERE p.ativo AND p.disponivel_delivery
      AND NOT EXISTS (SELECT 1 FROM public.fichas_tecnicas ft WHERE ft.variacao_id = pv.id)
    LIMIT 1;
  IF v_variacao IS NULL THEN
    RAISE EXCEPTION 'Validação requer uma variação delivery sem ficha técnica.';
  END IF;

  v_dados := jsonb_build_object(
    'loja_id', current_setting('brasa.teste_loja'),
    'cliente_cpf', current_setting('brasa.teste_cliente'),
    'tipo_atendimento', 'delivery', 'forma_pagamento', 'pix',
    'canal_venda', 'proprio', 'cotacao_entrega_id', current_setting('brasa.teste_cotacao'),
    'itens', jsonb_build_array(jsonb_build_object('variacao_id', v_variacao,
      'quantidade', 1, 'preco_unitario', v_preco, 'adicionais', '[]'::jsonb))
  );
  v_pedido := public.criar_pedido_transacional(v_requisicao, v_dados);

  IF NOT EXISTS (
    SELECT 1 FROM public.pedidos p WHERE p.id = v_pedido
      AND p.taxa_entrega = 1.50 AND p.subtotal_itens = v_preco
      AND p.valor_total = v_preco + 1.50 AND p.distancia_entrega_metros = 1000
      AND p.cotacao_entrega_id = current_setting('brasa.teste_cotacao')::uuid
  ) THEN RAISE EXCEPTION 'Total, frete ou vínculo da cotação incorreto.'; END IF;

  IF public.criar_pedido_transacional(v_requisicao, v_dados) IS DISTINCT FROM v_pedido THEN
    RAISE EXCEPTION 'Reenvio idempotente retornou outro pedido.';
  END IF;

  BEGIN
    PERFORM public.criar_pedido_transacional(gen_random_uuid(), v_dados);
    RAISE EXCEPTION 'Cotação reutilizada indevidamente.' USING ERRCODE = 'ZX001';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    IF v_erro NOT LIKE '%já usada%' THEN RAISE; END IF;
  END;

  IF has_table_privilege('authenticated', 'public.pedidos', 'INSERT') OR
     has_column_privilege('authenticated', 'public.pedidos', 'valor_total', 'UPDATE') OR
     NOT has_column_privilege('authenticated', 'public.pedidos', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'Permissões de pedido não correspondem à regra.';
  END IF;
END;
$teste$;

ROLLBACK;
