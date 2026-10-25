-- Definições conferidas no Supabase em 24/10/2026. Após migration_fase1.sql e adicionais.
BEGIN;
CREATE OR REPLACE FUNCTION public.editar_quantidade_ficha(p_id uuid, p_anterior numeric, p_quantidade numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')) THEN
    RAISE EXCEPTION 'Sem permissão para editar fichas técnicas.' USING ERRCODE = '42501';
  END IF;
  IF p_quantidade IS NULL OR NOT (p_quantidade > 0 AND p_quantidade <= 9999999.999)
    OR p_quantidade <> round(p_quantidade, 3) THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
  UPDATE fichas_tecnicas SET peso_quantidade = p_quantidade
    WHERE id = p_id AND peso_quantidade = p_anterior RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Ficha alterada em outra sessão ou não encontrada. Recarregue antes de editar.'; END IF;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.editar_variacao(p_id uuid, p_nome_anterior text, p_preco_anterior numeric, p_nome text, p_preco numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')) THEN
    RAISE EXCEPTION 'Sem permissão para editar o catálogo.' USING ERRCODE = '42501';
  END IF;
  IF p_nome IS NULL OR length(btrim(p_nome)) NOT BETWEEN 1 AND 100 OR p_preco IS NULL
    OR NOT (p_preco > 0 AND p_preco <= 99999999.99) OR p_preco <> round(p_preco, 2) THEN
    RAISE EXCEPTION 'Nome ou preço inválido.';
  END IF;
  UPDATE produto_variacoes SET nome_variacao = btrim(p_nome), preco_venda = p_preco
    WHERE id = p_id AND nome_variacao = p_nome_anterior AND preco_venda = p_preco_anterior RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Variação alterada em outra sessão ou não encontrada. Recarregue antes de editar.'; END IF;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.editar_quantidade_ficha(uuid,numeric,numeric), public.editar_variacao(uuid,text,numeric,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_quantidade_ficha(uuid,numeric,numeric), public.editar_variacao(uuid,text,numeric,text,numeric) TO authenticated;
COMMIT;
