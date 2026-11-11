BEGIN;
CREATE FUNCTION public.reservar_cadastro_cliente(p_chave text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE total integer;
BEGIN
 IF p_chave IS NULL OR length(p_chave)>500 THEN RETURN false; END IF;
 DELETE FROM erp_privado.tentativas_login_cliente WHERE inicio<now()-interval '1 day';
 INSERT INTO erp_privado.tentativas_login_cliente(chave,inicio,quantidade) VALUES('cadastro:'||md5(p_chave),now(),1)
 ON CONFLICT(chave) DO UPDATE SET
 quantidade=CASE WHEN tentativas_login_cliente.inicio<now()-interval '1 hour' THEN 1 ELSE tentativas_login_cliente.quantidade+1 END,
 inicio=CASE WHEN tentativas_login_cliente.inicio<now()-interval '1 hour' THEN now() ELSE tentativas_login_cliente.inicio END
 RETURNING quantidade INTO total;
 RETURN total<=60;
END; $$;
REVOKE ALL ON FUNCTION public.reservar_cadastro_cliente(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_cadastro_cliente(text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
