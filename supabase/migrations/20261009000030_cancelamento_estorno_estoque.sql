BEGIN;

-- O preço original permanece no pedido para auditoria. O estorno no ERP é
-- representado pelo status cancelado + lançamento imutável abaixo.
CREATE TABLE public.cancelamentos_pedido (
  pedido_id uuid PRIMARY KEY REFERENCES public.pedidos(id),
  motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 3 AND 500),
  destino text NOT NULL CHECK (destino IN ('devolver_estoque', 'perda_operacional', 'reaproveitar')),
  pedido_destino_id uuid UNIQUE REFERENCES public.pedidos(id),
  valor_estornado numeric(10,2) NOT NULL CHECK (valor_estornado >= 0),
  custo_operacional numeric(14,4) CHECK (custo_operacional >= 0),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK ((destino = 'reaproveitar') = (pedido_destino_id IS NOT NULL)),
  CHECK (pedido_destino_id IS DISTINCT FROM pedido_id)
);
CREATE INDEX cancelamentos_pedido_usuario_idx ON public.cancelamentos_pedido(usuario_id);
ALTER TABLE public.cancelamentos_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY cancelamentos_pedido_por_unidade ON public.cancelamentos_pedido
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id
      AND (public.minha_loja() IS NULL OR p.loja_id = public.minha_loja()))
  );
REVOKE ALL ON public.cancelamentos_pedido FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cancelamentos_pedido TO authenticated;

-- Pedidos antigos não têm fotografia do consumo e não podem receber uma
-- reposição aproximada após eventual edição da ficha técnica.
ALTER TABLE public.pedidos ADD COLUMN estoque_rastreado boolean NOT NULL DEFAULT false;
ALTER TABLE public.pedidos ALTER COLUMN estoque_rastreado SET DEFAULT true;

CREATE TABLE public.consumos_itens_pedido (
  item_pedido_id uuid NOT NULL REFERENCES public.itens_pedido(id),
  ingrediente_id uuid NOT NULL REFERENCES public.ingredientes(id),
  quantidade numeric(12,3) NOT NULL CHECK (quantidade > 0),
  custo_snapshot numeric(14,4) NOT NULL CHECK (custo_snapshot >= 0),
  revertido_em timestamptz,
  revertido_por_pedido_id uuid REFERENCES public.pedidos(id),
  PRIMARY KEY (item_pedido_id, ingrediente_id),
  CHECK ((revertido_em IS NULL) = (revertido_por_pedido_id IS NULL))
);
CREATE INDEX consumos_itens_pedido_ingrediente_idx ON public.consumos_itens_pedido(ingrediente_id);
ALTER TABLE public.consumos_itens_pedido ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consumos_itens_pedido FROM PUBLIC, anon, authenticated;

-- Substitui os triggers existentes: a baixa e sua fotografia ocorrem na mesma
-- transação. Se não houver estoque vinculado, a venda falha em vez de gerar
-- um registro de consumo fictício.
CREATE OR REPLACE FUNCTION public.baixar_estoque_item_pedido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_loja uuid;
  v_ficha record;
  v_quantidade numeric(12,3);
BEGIN
  SELECT loja_id INTO STRICT v_loja FROM public.pedidos WHERE id = NEW.pedido_id;
  FOR v_ficha IN
    SELECT ft.ingrediente_id, ft.peso_quantidade, i.custo_unitario
    FROM public.fichas_tecnicas ft JOIN public.ingredientes i ON i.id = ft.ingrediente_id
    WHERE ft.variacao_id = NEW.variacao_id
  LOOP
    v_quantidade := v_ficha.peso_quantidade * NEW.quantidade;
    IF v_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida na ficha técnica.'; END IF;
    UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel - v_quantidade,
      atualizado_em = now() WHERE loja_id = v_loja AND ingrediente_id = v_ficha.ingrediente_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ingrediente da ficha sem estoque na unidade.'; END IF;
    INSERT INTO public.consumos_itens_pedido(item_pedido_id, ingrediente_id, quantidade, custo_snapshot)
      VALUES (NEW.id, v_ficha.ingrediente_id, v_quantidade, v_quantidade * v_ficha.custo_unitario)
      ON CONFLICT (item_pedido_id, ingrediente_id) DO UPDATE SET
        quantidade = public.consumos_itens_pedido.quantidade + EXCLUDED.quantidade,
        custo_snapshot = public.consumos_itens_pedido.custo_snapshot + EXCLUDED.custo_snapshot;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.baixar_estoque_adicional()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_loja uuid;
  v_ingrediente uuid;
  v_peso numeric;
  v_custo numeric;
  v_quantidade numeric(12,3);
BEGIN
  SELECT p.loja_id INTO STRICT v_loja FROM public.itens_pedido ip
    JOIN public.pedidos p ON p.id = ip.pedido_id WHERE ip.id = NEW.item_pedido_id;
  SELECT a.ingrediente_id, a.peso_quantidade, i.custo_unitario
    INTO v_ingrediente, v_peso, v_custo FROM public.adicionais a
    LEFT JOIN public.ingredientes i ON i.id = a.ingrediente_id WHERE a.id = NEW.adicional_id;
  IF v_ingrediente IS NOT NULL THEN
    v_quantidade := v_peso * NEW.quantidade;
    IF v_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida no adicional.'; END IF;
    UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel - v_quantidade,
      atualizado_em = now() WHERE loja_id = v_loja AND ingrediente_id = v_ingrediente;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ingrediente do adicional sem estoque na unidade.'; END IF;
    INSERT INTO public.consumos_itens_pedido(item_pedido_id, ingrediente_id, quantidade, custo_snapshot)
      VALUES (NEW.item_pedido_id, v_ingrediente, v_quantidade, v_quantidade * v_custo)
      ON CONFLICT (item_pedido_id, ingrediente_id) DO UPDATE SET
        quantidade = public.consumos_itens_pedido.quantidade + EXCLUDED.quantidade,
        custo_snapshot = public.consumos_itens_pedido.custo_snapshot + EXCLUDED.custo_snapshot;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.proteger_cancelamento_pedido()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status = 'cancelado' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Pedido cancelado não pode ser reaberto.';
  END IF;
  IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM NEW.status
    AND current_setting('app.cancelamento_pedido_autorizado', true) IS DISTINCT FROM 'sim' THEN
    RAISE EXCEPTION 'Use o cancelamento transacional para estornar o pedido.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_proteger_cancelamento_pedido BEFORE UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.proteger_cancelamento_pedido();

CREATE OR REPLACE FUNCTION public.avancar_pedido_transacional(p_pedido uuid, p_status_esperado text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_novo text;
BEGIN
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado ou sessão inválida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = v_pedido.loja_id)
      AND (pf.nome IN ('Administrador','Gerente') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND (pe.pode_criar OR pe.pode_editar)))) THEN
    RAISE EXCEPTION 'Sem permissão para avançar este pedido.';
  END IF;
  IF v_pedido.status IS DISTINCT FROM p_status_esperado THEN
    RAISE EXCEPTION 'O pedido mudou em outra sessão. Atualize a lista.';
  END IF;
  v_novo := CASE v_pedido.status
    WHEN 'recebido' THEN 'em_preparo'
    WHEN 'em_preparo' THEN 'pronto'
    WHEN 'pronto' THEN CASE WHEN v_pedido.tipo_atendimento = 'delivery' THEN 'saiu_entrega' ELSE 'entregue' END
    WHEN 'saiu_entrega' THEN 'entregue'
    ELSE NULL END;
  IF v_novo IS NULL THEN RAISE EXCEPTION 'Pedido não pode avançar.'; END IF;
  UPDATE public.pedidos SET status = v_novo, atualizado_em = now() WHERE id = p_pedido;
  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_pedido_transacional(
  p_pedido uuid, p_status_esperado text, p_motivo text, p_destino text,
  p_pedido_destino uuid DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_origem public.pedidos%ROWTYPE;
  v_destino public.pedidos%ROWTYPE;
  v_raiz uuid;
  v_anterior uuid;
  v_assinatura_origem jsonb;
  v_assinatura_destino jsonb;
  v_consumo record;
  v_custo_operacional numeric(14,4);
BEGIN
  SELECT * INTO v_origem FROM public.pedidos WHERE id = p_pedido FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado ou sessão inválida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = v_origem.loja_id)
      AND (pf.nome IN ('Administrador','Gerente') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_editar))) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar este pedido.';
  END IF;
  IF v_origem.status IS DISTINCT FROM p_status_esperado OR v_origem.status = 'cancelado' THEN
    RAISE EXCEPTION 'O pedido mudou em outra sessão. Atualize a lista.';
  END IF;
  IF length(btrim(coalesce(p_motivo, ''))) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Informe um motivo entre 3 e 500 caracteres.';
  END IF;
  IF p_destino NOT IN ('devolver_estoque', 'perda_operacional', 'reaproveitar') OR p_destino IS NULL THEN
    RAISE EXCEPTION 'Selecione o destino dos itens cancelados.';
  END IF;
  IF (p_destino = 'reaproveitar') IS DISTINCT FROM (p_pedido_destino IS NOT NULL) THEN
    RAISE EXCEPTION 'Selecione um pedido de destino apenas para reaproveitamento.';
  END IF;

  IF p_destino <> 'perda_operacional' AND NOT v_origem.estoque_rastreado THEN
    RAISE EXCEPTION 'Pedido anterior ao rastreamento de estoque: só é possível lançar perda operacional sem repor quantidades estimadas.';
  END IF;

  -- Se este pedido já recebeu alimento de outro cancelamento, o custo físico
  -- pertence à primeira produção da cadeia, não à baixa revertida no destino.
  v_raiz := v_origem.id;
  LOOP
    SELECT c.pedido_id INTO v_anterior FROM public.cancelamentos_pedido c
      WHERE c.pedido_destino_id = v_raiz AND c.destino = 'reaproveitar';
    EXIT WHEN NOT FOUND;
    v_raiz := v_anterior;
  END LOOP;
  IF p_destino = 'perda_operacional' AND v_origem.estoque_rastreado THEN
    SELECT coalesce(sum(c.custo_snapshot), 0) INTO v_custo_operacional
      FROM public.consumos_itens_pedido c JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
      WHERE ip.pedido_id = v_raiz;
  END IF;

  IF p_destino = 'reaproveitar' THEN
    SELECT * INTO v_destino FROM public.pedidos WHERE id = p_pedido_destino FOR UPDATE;
    IF NOT FOUND OR v_destino.id = v_origem.id OR v_destino.loja_id <> v_origem.loja_id
      OR v_destino.status NOT IN ('recebido','em_preparo','pronto','saiu_entrega')
      OR NOT v_destino.estoque_rastreado THEN
      RAISE EXCEPTION 'Destino inválido: use outro pedido ativo e rastreado da mesma unidade.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.cancelamentos_pedido c WHERE c.pedido_destino_id = v_destino.id) THEN
      RAISE EXCEPTION 'Esse pedido já recebeu itens reaproveitados.';
    END IF;
    -- Multiconjunto exato de variação, quantidade e adicionais. Não permite
    -- aproveitar parcialmente um pedido nem substituir outro produto.
    SELECT coalesce(jsonb_agg(s.assinatura ORDER BY s.assinatura::text), '[]'::jsonb)
      INTO v_assinatura_origem FROM (
      SELECT jsonb_build_object('sku', ip.produto_sku, 'variacao', ip.variacao_id,
        'quantidade', ip.quantidade, 'adicionais',
        coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.adicional_id, 'quantidade', a.quantidade)
          ORDER BY a.adicional_id) FROM public.itens_pedido_adicionais a WHERE a.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = v_origem.id
    ) s;
    SELECT coalesce(jsonb_agg(s.assinatura ORDER BY s.assinatura::text), '[]'::jsonb)
      INTO v_assinatura_destino FROM (
      SELECT jsonb_build_object('sku', ip.produto_sku, 'variacao', ip.variacao_id,
        'quantidade', ip.quantidade, 'adicionais',
        coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.adicional_id, 'quantidade', a.quantidade)
          ORDER BY a.adicional_id) FROM public.itens_pedido_adicionais a WHERE a.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = v_destino.id
    ) s;
    IF v_assinatura_origem IS DISTINCT FROM v_assinatura_destino OR v_assinatura_origem = '[]'::jsonb THEN
      RAISE EXCEPTION 'O pedido de destino precisa ter exatamente os mesmos itens, quantidades, variações e adicionais.';
    END IF;
    -- A produção da origem é aproveitada; desfaz somente a baixa duplicada
    -- realizada ao criar o pedido de destino.
    FOR v_consumo IN SELECT c.*, p.loja_id FROM public.consumos_itens_pedido c
      JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
      JOIN public.pedidos p ON p.id = ip.pedido_id
      WHERE p.id = v_destino.id FOR UPDATE OF c
    LOOP
      IF v_consumo.revertido_em IS NOT NULL THEN RAISE EXCEPTION 'Consumo do destino já revertido.'; END IF;
      UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel + v_consumo.quantidade,
        atualizado_em = now() WHERE loja_id = v_consumo.loja_id AND ingrediente_id = v_consumo.ingrediente_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque da unidade não encontrado.'; END IF;
      UPDATE public.consumos_itens_pedido SET revertido_em = now(), revertido_por_pedido_id = v_origem.id
        WHERE item_pedido_id = v_consumo.item_pedido_id AND ingrediente_id = v_consumo.ingrediente_id;
    END LOOP;
  ELSIF p_destino = 'devolver_estoque' THEN
    FOR v_consumo IN SELECT c.*, p.loja_id FROM public.consumos_itens_pedido c
      JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
      JOIN public.pedidos p ON p.id = ip.pedido_id
      WHERE p.id = v_raiz FOR UPDATE OF c
    LOOP
      IF v_consumo.revertido_em IS NOT NULL THEN RAISE EXCEPTION 'Consumo já revertido.'; END IF;
      UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel + v_consumo.quantidade,
        atualizado_em = now() WHERE loja_id = v_consumo.loja_id AND ingrediente_id = v_consumo.ingrediente_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque da unidade não encontrado.'; END IF;
      UPDATE public.consumos_itens_pedido SET revertido_em = now(), revertido_por_pedido_id = v_origem.id
        WHERE item_pedido_id = v_consumo.item_pedido_id AND ingrediente_id = v_consumo.ingrediente_id;
    END LOOP;
  END IF;

  PERFORM set_config('app.cancelamento_pedido_autorizado', 'sim', true);
  UPDATE public.pedidos SET status = 'cancelado', motivo_cancelamento = btrim(p_motivo),
    atualizado_em = now() WHERE id = v_origem.id;
  PERFORM set_config('app.cancelamento_pedido_autorizado', '', true);
  INSERT INTO public.cancelamentos_pedido(pedido_id, motivo, destino, pedido_destino_id,
    valor_estornado, custo_operacional, usuario_id)
    VALUES (v_origem.id, btrim(p_motivo), p_destino, p_pedido_destino,
      v_origem.valor_total, v_custo_operacional, auth.uid());
  RETURN v_origem.valor_total;
END;
$$;

REVOKE ALL ON FUNCTION public.baixar_estoque_item_pedido(), public.baixar_estoque_adicional(),
  public.proteger_cancelamento_pedido() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.avancar_pedido_transacional(uuid, text),
  public.cancelar_pedido_transacional(uuid, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avancar_pedido_transacional(uuid, text),
  public.cancelar_pedido_transacional(uuid, text, text, text, uuid) TO authenticated;
REVOKE UPDATE (status, motivo_cancelamento) ON public.pedidos FROM authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
