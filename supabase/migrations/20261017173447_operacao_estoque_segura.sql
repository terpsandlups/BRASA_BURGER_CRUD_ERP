BEGIN;

-- Um UPDATE relativo usa o saldo bloqueado no servidor, evitando sobrescrever
-- baixas de venda ocorridas desde a última leitura do navegador.
CREATE TABLE public.reposicoes_estoque (
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  requisicao_id uuid NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  ingrediente_id uuid NOT NULL REFERENCES public.ingredientes(id),
  quantidade numeric(12,3) NOT NULL CHECK (quantidade > 0),
  saldo_resultante numeric(12,3) NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, requisicao_id)
);
CREATE INDEX reposicoes_estoque_loja_ingrediente_idx ON public.reposicoes_estoque(loja_id, ingrediente_id);
CREATE INDEX reposicoes_estoque_ingrediente_idx ON public.reposicoes_estoque(ingrediente_id);
ALTER TABLE public.reposicoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY reposicoes_estoque_leitura ON public.reposicoes_estoque FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = (SELECT auth.uid()) AND u.ativo
      AND (u.loja_id IS NULL OR u.loja_id = reposicoes_estoque.loja_id)
      AND (pf.nome IN ('Administrador','Gerente','Estoque') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'estoque' AND pe.pode_visualizar)))
);
REVOKE ALL ON public.reposicoes_estoque FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.reposicoes_estoque TO authenticated;

CREATE OR REPLACE FUNCTION public.repor_estoque_transacional(
  p_requisicao uuid, p_loja uuid, p_ingrediente uuid, p_quantidade numeric
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_anterior public.reposicoes_estoque%ROWTYPE;
  v_saldo numeric(12,3);
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN RAISE EXCEPTION 'Sessão e requisição são obrigatórias.'; END IF;
  IF p_quantidade IS NULL OR NOT (p_quantidade > 0 AND p_quantidade <= 999999999.999)
    OR p_quantidade <> round(p_quantidade, 3) THEN
    RAISE EXCEPTION 'Informe quantidade positiva com até três casas decimais.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = v_usuario AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = p_loja)
      AND (pf.nome IN ('Administrador','Gerente','Estoque') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'estoque' AND pe.pode_editar))) THEN
    RAISE EXCEPTION 'Sem permissão para repor estoque nesta unidade.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text || p_requisicao::text, 0));
  SELECT * INTO v_anterior FROM public.reposicoes_estoque
    WHERE usuario_id = v_usuario AND requisicao_id = p_requisicao;
  IF FOUND THEN
    IF v_anterior.loja_id IS DISTINCT FROM p_loja OR v_anterior.ingrediente_id IS DISTINCT FROM p_ingrediente
      OR v_anterior.quantidade IS DISTINCT FROM p_quantidade THEN
      RAISE EXCEPTION 'Requisição já utilizada com outro conteúdo.';
    END IF;
    RETURN v_anterior.saldo_resultante;
  END IF;
  UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel + p_quantidade,
    atualizado_em = now() WHERE loja_id = p_loja AND ingrediente_id = p_ingrediente
    RETURNING quantidade_disponivel INTO v_saldo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo não vinculado ao estoque desta unidade.'; END IF;
  INSERT INTO public.reposicoes_estoque(usuario_id, requisicao_id, loja_id, ingrediente_id, quantidade, saldo_resultante)
    VALUES (v_usuario, p_requisicao, p_loja, p_ingrediente, p_quantidade, v_saldo);
  RETURN v_saldo;
END;
$$;
REVOKE ALL ON FUNCTION public.repor_estoque_transacional(uuid, uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repor_estoque_transacional(uuid, uuid, uuid, numeric) TO authenticated;
REVOKE UPDATE ON public.estoque_lojas FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (loja_id, ingrediente_id, quantidade_disponivel, quantidade_minima, atualizado_em)
  ON public.estoque_lojas FROM PUBLIC, anon, authenticated;

-- Saldos negativos legados podem ser recuperados por reposição, mas nenhuma
-- operação nova pode consumir além do disponível. O bloqueio é transacional.
CREATE OR REPLACE FUNCTION public.validar_saldo_estoque()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.quantidade_disponivel = 'NaN'::numeric THEN RAISE EXCEPTION 'Saldo de estoque inválido.'; END IF;
  IF NEW.quantidade_disponivel < 0 THEN
    IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Saldo inicial não pode ser negativo.'; END IF;
    IF NEW.quantidade_disponivel < OLD.quantidade_disponivel THEN
      RAISE EXCEPTION 'Estoque insuficiente de insumos na unidade. Confira os saldos antes de vender.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validar_saldo_estoque BEFORE INSERT OR UPDATE OF quantidade_disponivel
  ON public.estoque_lojas FOR EACH ROW EXECUTE FUNCTION public.validar_saldo_estoque();
REVOKE ALL ON FUNCTION public.validar_saldo_estoque() FROM PUBLIC, anon, authenticated;

-- Mesmo SKU não garante o mesmo alimento se a ficha mudou entre as vendas.
-- Compara a fotografia física da primeira produção com a do destino.
CREATE OR REPLACE FUNCTION public.validar_custo_cancelamento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_raiz uuid := NEW.pedido_id;
  v_anterior uuid;
  v_origem jsonb;
  v_destino jsonb;
BEGIN
  LOOP
    SELECT c.pedido_id INTO v_anterior FROM public.cancelamentos_pedido c
      WHERE c.pedido_destino_id = v_raiz AND c.destino = 'reaproveitar';
    EXIT WHEN NOT FOUND;
    v_raiz := v_anterior;
  END LOOP;
  IF NEW.destino = 'perda_operacional' THEN
    IF NOT EXISTS (SELECT 1 FROM public.pedidos WHERE id = v_raiz AND estoque_rastreado)
      OR EXISTS (SELECT 1 FROM public.itens_pedido ip WHERE ip.pedido_id = v_raiz
        AND NOT EXISTS (SELECT 1 FROM public.consumos_itens_pedido c WHERE c.item_pedido_id = ip.id)) THEN
      NEW.custo_operacional := NULL;
    ELSE
      SELECT sum(c.custo_snapshot) INTO NEW.custo_operacional
        FROM public.consumos_itens_pedido c JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
        WHERE ip.pedido_id = v_raiz;
    END IF;
  ELSIF NEW.destino = 'reaproveitar' THEN
    SELECT jsonb_agg(s.assinatura ORDER BY s.assinatura::text) INTO v_origem FROM (
      SELECT jsonb_build_object('variacao', ip.variacao_id, 'quantidade', ip.quantidade, 'consumo',
        coalesce((SELECT jsonb_agg(jsonb_build_object('ingrediente', c.ingrediente_id, 'quantidade', c.quantidade)
          ORDER BY c.ingrediente_id) FROM public.consumos_itens_pedido c WHERE c.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = v_raiz
    ) s;
    SELECT jsonb_agg(s.assinatura ORDER BY s.assinatura::text) INTO v_destino FROM (
      SELECT jsonb_build_object('variacao', ip.variacao_id, 'quantidade', ip.quantidade, 'consumo',
        coalesce((SELECT jsonb_agg(jsonb_build_object('ingrediente', c.ingrediente_id, 'quantidade', c.quantidade)
          ORDER BY c.ingrediente_id) FROM public.consumos_itens_pedido c WHERE c.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = NEW.pedido_destino_id
    ) s;
    IF v_origem IS DISTINCT FROM v_destino THEN
      RAISE EXCEPTION 'A ficha técnica mudou entre os pedidos. Os alimentos não têm composição idêntica para reaproveitamento.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validar_custo_cancelamento BEFORE INSERT ON public.cancelamentos_pedido
  FOR EACH ROW EXECUTE FUNCTION public.validar_custo_cancelamento();
REVOKE ALL ON FUNCTION public.validar_custo_cancelamento() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS consumos_itens_pedido_reversao_idx ON public.consumos_itens_pedido(revertido_por_pedido_id);
CREATE INDEX IF NOT EXISTS pedidos_operacao_loja_criacao_idx ON public.pedidos(loja_id, criado_em, id)
  WHERE status IN ('recebido','em_preparo','pronto','saiu_entrega');
NOTIFY pgrst, 'reload schema';
COMMIT;
