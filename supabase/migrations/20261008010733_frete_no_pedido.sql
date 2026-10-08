-- Cotação emitida pela Edge Function depois da rota real. O navegador só recebe
-- o identificador; não pode criar/alterar o valor usado pelo pedido.
BEGIN;

CREATE TABLE public.cotacoes_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cliente_cpf char(11) NOT NULL REFERENCES public.clientes(cpf),
  origem jsonb NOT NULL,
  destino jsonb NOT NULL,
  distancia_metros integer NOT NULL CHECK (distancia_metros BETWEEN 1 AND 1000000),
  valor_km numeric(10,2) NOT NULL CHECK (valor_km > 0 AND valor_km <= 1000),
  taxa numeric(10,2) NOT NULL CHECK (taxa >= 0 AND taxa = round(distancia_metros::numeric * valor_km / 1000, 2)),
  provedor text NOT NULL CHECK (provedor = 'openrouteservice'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  usada_em timestamptz,
  CHECK (expira_em > criado_em)
);
CREATE INDEX cotacoes_entrega_usuario_idx ON public.cotacoes_entrega(usuario_id);
CREATE INDEX cotacoes_entrega_loja_idx ON public.cotacoes_entrega(loja_id);
CREATE INDEX cotacoes_entrega_cliente_idx ON public.cotacoes_entrega(cliente_cpf);
CREATE INDEX cotacoes_entrega_expira_idx ON public.cotacoes_entrega(expira_em);
ALTER TABLE public.cotacoes_entrega ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cotacoes_entrega FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cotacoes_entrega TO service_role;

ALTER TABLE public.pedidos
  ADD COLUMN taxa_entrega numeric(10,2) NOT NULL DEFAULT 0 CHECK (taxa_entrega >= 0),
  ADD COLUMN distancia_entrega_metros integer CHECK (distancia_entrega_metros > 0),
  ADD COLUMN tarifa_entrega_km numeric(10,2),
  ADD COLUMN endereco_entrega jsonb,
  ADD COLUMN origem_entrega jsonb,
  ADD COLUMN provedor_entrega text,
  ADD COLUMN cotacao_entrega_id uuid UNIQUE REFERENCES public.cotacoes_entrega(id);
ALTER TABLE public.pedidos
  ADD COLUMN subtotal_itens numeric(10,2) GENERATED ALWAYS AS (valor_total - taxa_entrega) STORED;

CREATE OR REPLACE FUNCTION public.criar_pedido_transacional(p_requisicao uuid, p_dados jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_loja uuid := (p_dados->>'loja_id')::uuid;
  v_pedido uuid;
  v_anterior public.requisicoes_pedido%ROWTYPE;
  v_cotacao public.cotacoes_entrega%ROWTYPE;
  v_cotacao_id uuid;
  v_item jsonb;
  v_adicional jsonb;
  v_variacao record;
  v_extra record;
  v_item_id uuid;
  v_quantidade integer;
  v_preco numeric;
  v_total numeric := 0;
  v_frete numeric := 0;
  v_markup numeric;
  v_canal text := p_dados->>'canal_venda';
  v_tipo text := p_dados->>'tipo_atendimento';
  v_pagamento text := p_dados->>'forma_pagamento';
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN
    RAISE EXCEPTION 'Sessão e identificador da requisição são obrigatórios.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = v_usuario AND u.ativo
      AND (u.loja_id IS NULL OR u.loja_id = v_loja)
      AND (p.nome IN ('Administrador', 'Gerente') OR EXISTS (
        SELECT 1 FROM permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_criar
      ))
  ) THEN RAISE EXCEPTION 'Usuário sem permissão para criar pedidos nesta unidade.'; END IF;

  -- Reenvio após perda de resposta recupera o pedido sem reutilizar cotação/estoque.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text || p_requisicao::text, 0));
  SELECT * INTO v_anterior FROM requisicoes_pedido
    WHERE usuario_id = v_usuario AND requisicao_id = p_requisicao;
  IF FOUND THEN
    IF v_anterior.conteudo IS DISTINCT FROM p_dados THEN
      RAISE EXCEPTION 'Reenvio com conteúdo diferente. Recupere o pedido original.';
    END IF;
    RETURN v_anterior.pedido_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lojas WHERE id = v_loja AND ativo) THEN
    RAISE EXCEPTION 'Unidade inválida ou inativa.';
  END IF;
  IF v_tipo IS NULL OR v_tipo NOT IN ('presencial', 'delivery') OR
     v_pagamento IS NULL OR v_pagamento NOT IN ('pix', 'credito', 'debito', 'dinheiro') THEN
    RAISE EXCEPTION 'Atendimento ou pagamento inválido.';
  END IF;
  IF COALESCE(p_dados->>'cliente_cpf', '') !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'Cliente inválido.';
  END IF;
  IF jsonb_typeof(p_dados->'itens') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Informe os itens do pedido.';
  END IF;
  IF jsonb_array_length(p_dados->'itens') NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'O pedido deve conter entre 1 e 100 itens.';
  END IF;
  SELECT markup_preco_percentual INTO v_markup FROM configuracoes_canal WHERE canal_venda = v_canal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canal de venda inválido.'; END IF;

  IF v_tipo = 'delivery' AND v_canal = 'proprio' THEN
    IF COALESCE(p_dados->>'cotacao_entrega_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RAISE EXCEPTION 'Calcule o frete da entrega antes de finalizar o pedido.';
    END IF;
    v_cotacao_id := (p_dados->>'cotacao_entrega_id')::uuid;
    SELECT * INTO v_cotacao FROM cotacoes_entrega
      WHERE id = v_cotacao_id FOR UPDATE;
    IF NOT FOUND OR v_cotacao.usuario_id IS DISTINCT FROM v_usuario OR
       v_cotacao.loja_id IS DISTINCT FROM v_loja OR
       btrim(v_cotacao.cliente_cpf::text) IS DISTINCT FROM p_dados->>'cliente_cpf' OR
       v_cotacao.expira_em <= now() OR v_cotacao.usada_em IS NOT NULL THEN
      RAISE EXCEPTION 'Cotação expirada, já usada ou de outro cliente/unidade. Calcule o frete novamente.';
    END IF;
    v_frete := v_cotacao.taxa;
  ELSIF p_dados->>'cotacao_entrega_id' IS NOT NULL THEN
    RAISE EXCEPTION 'Frete próprio não se aplica a atendimento presencial ou marketplaces.';
  END IF;

  INSERT INTO pedidos(loja_id, cliente_cpf, tipo_atendimento, forma_pagamento,
    canal_venda, observacoes, troco_para, status, valor_total, taxa_entrega,
    distancia_entrega_metros, tarifa_entrega_km, endereco_entrega, origem_entrega,
    provedor_entrega, cotacao_entrega_id)
  VALUES(v_loja, p_dados->>'cliente_cpf', v_tipo, v_pagamento, v_canal,
    NULLIF(btrim(p_dados->>'observacoes'), ''),
    CASE WHEN v_pagamento = 'dinheiro' THEN (p_dados->>'troco_para')::numeric ELSE NULL END,
    'recebido', v_frete, v_frete,
    v_cotacao.distancia_metros, v_cotacao.valor_km, v_cotacao.destino, v_cotacao.origem,
    v_cotacao.provedor, v_cotacao_id) RETURNING id INTO v_pedido;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_dados->'itens') LOOP
    IF COALESCE(v_item->>'quantidade', '') !~ '^[1-9][0-9]{0,3}$' THEN
      RAISE EXCEPTION 'Quantidade de item inválida.';
    END IF;
    v_quantidade := (v_item->>'quantidade')::integer;
    SELECT pv.*, p.permite_adicionais INTO v_variacao
      FROM produto_variacoes pv JOIN produtos p ON p.sku = pv.produto_sku
      WHERE pv.id = (v_item->>'variacao_id')::uuid AND p.ativo
        AND ((v_tipo = 'delivery' AND p.disponivel_delivery) OR
             (v_tipo = 'presencial' AND p.disponivel_presencial));
    IF NOT FOUND THEN RAISE EXCEPTION 'Variação indisponível para este atendimento.'; END IF;
    v_preco := round(v_variacao.preco_venda * (1 + v_markup / 100), 2);
    IF v_preco < 0 OR v_preco IS DISTINCT FROM (v_item->>'preco_unitario')::numeric THEN
      RAISE EXCEPTION 'Preço alterado. Atualize o catálogo e confira o pedido.';
    END IF;
    IF EXISTS (SELECT 1 FROM fichas_tecnicas ft WHERE ft.variacao_id = v_variacao.id
      AND NOT EXISTS (SELECT 1 FROM estoque_lojas es WHERE es.loja_id = v_loja AND es.ingrediente_id = ft.ingrediente_id)) THEN
      RAISE EXCEPTION 'Um ingrediente da ficha não está vinculado ao estoque desta unidade.';
    END IF;
    INSERT INTO itens_pedido(pedido_id, produto_sku, variacao_id, quantidade, preco_unitario)
      VALUES(v_pedido, v_variacao.produto_sku, v_variacao.id, v_quantidade, v_preco)
      RETURNING id INTO v_item_id;
    v_total := v_total + v_preco * v_quantidade;

    IF jsonb_typeof(v_item->'adicionais') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Lista de adicionais inválida.';
    END IF;
    IF jsonb_array_length(v_item->'adicionais') > 100 THEN RAISE EXCEPTION 'Limite de adicionais excedido.'; END IF;
    IF (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(v_item->'adicionais')) THEN
      RAISE EXCEPTION 'Adicional repetido no mesmo item.';
    END IF;
    FOR v_adicional IN SELECT value FROM jsonb_array_elements(v_item->'adicionais') LOOP
      SELECT a.* INTO v_extra FROM adicionais a
        JOIN produto_adicionais_disponiveis pa ON pa.adicional_id = a.id
        WHERE a.id = (v_adicional->>'id')::uuid AND pa.produto_sku = v_variacao.produto_sku AND a.ativo;
      IF NOT FOUND OR NOT v_variacao.permite_adicionais THEN RAISE EXCEPTION 'Adicional não permitido para este produto.'; END IF;
      IF v_extra.preco_adicional < 0 OR v_extra.preco_adicional IS DISTINCT FROM (v_adicional->>'preco_unitario')::numeric THEN
        RAISE EXCEPTION 'Preço do adicional alterado. Atualize o catálogo.';
      END IF;
      IF v_extra.ingrediente_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM estoque_lojas WHERE loja_id = v_loja AND ingrediente_id = v_extra.ingrediente_id
      ) THEN RAISE EXCEPTION 'Insumo do adicional não vinculado à unidade.'; END IF;
      INSERT INTO itens_pedido_adicionais(item_pedido_id, adicional_id, quantidade, preco_unitario)
        VALUES(v_item_id, v_extra.id, v_quantidade, v_extra.preco_adicional);
      v_total := v_total + v_extra.preco_adicional * v_quantidade;
    END LOOP;
  END LOOP;
  IF v_pagamento = 'dinheiro' AND ((p_dados->>'troco_para') IS NULL OR (p_dados->>'troco_para')::numeric < v_total + v_frete) THEN
    RAISE EXCEPTION 'Valor para troco inferior ao total com frete.';
  END IF;
  UPDATE pedidos SET valor_total = v_total + v_frete WHERE id = v_pedido;
  IF v_cotacao_id IS NOT NULL THEN
    UPDATE cotacoes_entrega SET usada_em = now() WHERE id = v_cotacao_id;
  END IF;
  INSERT INTO requisicoes_pedido VALUES(v_usuario, p_requisicao, p_dados, v_pedido);
  RETURN v_pedido;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_pedido_transacional(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_pedido_transacional(uuid, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
