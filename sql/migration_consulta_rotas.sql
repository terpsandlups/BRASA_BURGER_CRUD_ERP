-- Após migration_configuracao_entrega.sql. Não altera pedidos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.limites_consulta_rotas (
  chave text PRIMARY KEY,
  janela timestamptz NOT NULL,
  quantidade integer NOT NULL
);
ALTER TABLE public.limites_consulta_rotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.limites_consulta_rotas FROM PUBLIC, anon, authenticated;

-- Autoriza, reserva uma consulta e devolve SOMENTE a configuração salva da loja.
-- Contadores limitados a duas linhas por usuário e uma global; sem endereços.
CREATE OR REPLACE FUNCTION public.preparar_consulta_rota(p_loja uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_config jsonb;
  v_limite record;
  v_contagem integer;
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS (
    SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = v_usuario AND u.ativo
      AND (u.loja_id IS NULL OR u.loja_id = p_loja)
      AND (p.nome IN ('Administrador','Gerente') OR EXISTS (
        SELECT 1 FROM permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_criar
      ))
  ) THEN RAISE EXCEPTION 'Sem permissão para consultar rotas nesta unidade.' USING ERRCODE = '42501'; END IF;

  SELECT to_jsonb(c) INTO v_config FROM configuracoes_entrega c
    JOIN lojas l ON l.id = c.loja_id WHERE c.loja_id = p_loja AND l.ativo;
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'Salve o endereço e a tarifa de uma loja ativa antes de consultar.' USING ERRCODE = '22023';
  END IF;

  FOR v_limite IN SELECT * FROM (VALUES
    ('global:dia', date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', 500),
    (v_usuario::text || ':dia', date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', 100),
    (v_usuario::text || ':minuto', date_trunc('minute', now()), 5)
  ) AS limites(chave, janela, maximo) LOOP
    INSERT INTO limites_consulta_rotas AS c(chave, janela, quantidade)
      VALUES(v_limite.chave, v_limite.janela, 1)
      ON CONFLICT(chave) DO UPDATE SET janela = EXCLUDED.janela,
        quantidade = CASE WHEN c.janela = EXCLUDED.janela THEN c.quantidade + 1 ELSE 1 END
      RETURNING quantidade INTO v_contagem;
    IF v_contagem > v_limite.maximo THEN
      RAISE EXCEPTION 'Limite de consultas de mapas atingido. Aguarde antes de tentar novamente.' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  RETURN v_config;
END;
$$;
REVOKE ALL ON FUNCTION public.preparar_consulta_rota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preparar_consulta_rota(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
