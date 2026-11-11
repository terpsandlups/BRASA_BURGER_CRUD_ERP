BEGIN;

-- CPF identifica o consumidor, nunca concede perfil ou permissão de equipe.
CREATE TABLE erp_privado.contas_consumidor (
 usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 cpf text NOT NULL UNIQUE,
 nome text NOT NULL,
 telefone text NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE erp_privado.tentativas_login_cliente (
 chave text PRIMARY KEY, inicio timestamptz NOT NULL, quantidade integer NOT NULL
);
ALTER TABLE erp_privado.contas_consumidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_privado.tentativas_login_cliente ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON erp_privado.contas_consumidor,erp_privado.tentativas_login_cliente FROM PUBLIC,anon,authenticated;

CREATE FUNCTION erp_privado.validar_cadastro_consumidor(p_cpf text,p_nome text,p_telefone text)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE soma integer; digito integer; i integer; j integer;
BEGIN
 IF COALESCE(p_cpf,'') !~ '^[0-9]{11}$' OR p_cpf ~ '^([0-9])\1{10}$' THEN RAISE EXCEPTION 'Confira o CPF.'; END IF;
 FOR j IN 9..10 LOOP
  soma:=0;
  FOR i IN 1..j LOOP soma:=soma+substring(p_cpf,i,1)::integer*(j+2-i); END LOOP;
  digito:=(soma*10)%11; IF digito=10 THEN digito:=0; END IF;
  IF digito<>substring(p_cpf,j+1,1)::integer THEN RAISE EXCEPTION 'Confira o CPF.'; END IF;
 END LOOP;
 IF length(btrim(COALESCE(p_nome,''))) NOT BETWEEN 2 AND 120 OR COALESCE(p_telefone,'') !~ '^[0-9]{10,11}$' THEN RAISE EXCEPTION 'Confira nome e telefone.'; END IF;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.validar_cadastro_consumidor(text,text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION erp_privado.cadastro_consumidor_auth() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dados jsonb:=NEW.raw_user_meta_data;
BEGIN
 IF dados->>'cpf' IS NOT NULL THEN
  PERFORM erp_privado.validar_cadastro_consumidor(dados->>'cpf',dados->>'nome',dados->>'telefone');
  INSERT INTO erp_privado.contas_consumidor(usuario_id,cpf,nome,telefone)
   VALUES(NEW.id,dados->>'cpf',btrim(dados->>'nome'),dados->>'telefone');
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.cadastro_consumidor_auth() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER cadastro_consumidor_auth AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION erp_privado.cadastro_consumidor_auth();

CREATE FUNCTION public.meu_cadastro_cliente() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('cpf',cpf,'nome',nome,'telefone',telefone)
 FROM erp_privado.contas_consumidor WHERE usuario_id=(SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.meu_cadastro_cliente() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.meu_cadastro_cliente() TO authenticated;

-- Migração voluntária de contas já existentes. CPF vinculado é imutável pela API.
CREATE FUNCTION public.cadastrar_perfil_cliente(p_cpf text,p_nome text,p_telefone text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE atual text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 PERFORM erp_privado.validar_cadastro_consumidor(p_cpf,p_nome,p_telefone);
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,713));
 SELECT cpf INTO atual FROM erp_privado.contas_consumidor WHERE usuario_id=auth.uid();
 IF atual IS NOT NULL AND atual<>p_cpf THEN RAISE EXCEPTION 'Use o CPF vinculado à sua conta.'; END IF;
 BEGIN
  INSERT INTO erp_privado.contas_consumidor(usuario_id,cpf,nome,telefone)
  VALUES(auth.uid(),p_cpf,btrim(p_nome),p_telefone)
  ON CONFLICT(usuario_id) DO UPDATE SET nome=excluded.nome,telefone=excluded.telefone;
 EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Não foi possível vincular este CPF. Confira sua conta ou contate a loja.';
 END;
 RETURN public.meu_cadastro_cliente();
END; $$;
REVOKE ALL ON FUNCTION public.cadastrar_perfil_cliente(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cadastrar_perfil_cliente(text,text,text) TO authenticated;

-- Somente o servidor resolve CPF em e-mail. Nenhum navegador recebe esta consulta.
CREATE FUNCTION public.preparar_login_cliente(p_cpf text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tentativas integer; email_login text;
BEGIN
 IF COALESCE(p_cpf,'') !~ '^[0-9]{11}$' THEN RETURN NULL; END IF;
 DELETE FROM erp_privado.tentativas_login_cliente WHERE inicio<now()-interval '1 day';
 INSERT INTO erp_privado.tentativas_login_cliente(chave,inicio,quantidade) VALUES(md5(p_cpf),now(),1)
 ON CONFLICT(chave) DO UPDATE SET
 quantidade=CASE WHEN tentativas_login_cliente.inicio<now()-interval '5 minutes' THEN 1 ELSE tentativas_login_cliente.quantidade+1 END,
 inicio=CASE WHEN tentativas_login_cliente.inicio<now()-interval '5 minutes' THEN now() ELSE tentativas_login_cliente.inicio END
 RETURNING quantidade INTO tentativas;
 IF tentativas>10 THEN RETURN '__limite__'; END IF;
 SELECT u.email INTO email_login FROM erp_privado.contas_consumidor c JOIN auth.users u ON u.id=c.usuario_id WHERE c.cpf=p_cpf;
 RETURN email_login;
END; $$;
REVOKE ALL ON FUNCTION public.preparar_login_cliente(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.preparar_login_cliente(text) TO service_role;

CREATE FUNCTION erp_privado.conferir_cpf_solicitacao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cpf_conta text;
BEGIN
 SELECT cpf INTO cpf_conta FROM erp_privado.contas_consumidor WHERE usuario_id=NEW.usuario_id;
 IF cpf_conta IS NOT NULL AND cpf_conta IS DISTINCT FROM NEW.dados->>'cpf' THEN RAISE EXCEPTION 'Use o CPF vinculado à sua conta.'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.conferir_cpf_solicitacao() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER conferir_cpf_solicitacao BEFORE INSERT ON public.solicitacoes_mobile FOR EACH ROW EXECUTE FUNCTION erp_privado.conferir_cpf_solicitacao();

-- Aviso mínimo para atualizar o acompanhamento sem abrir o pedido interno ao consumidor.
CREATE TABLE public.eventos_pedidos_cliente (
 usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos_pedidos_cliente ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventos_pedidos_cliente FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.eventos_pedidos_cliente TO authenticated;
CREATE POLICY evento_do_titular ON public.eventos_pedidos_cliente FOR SELECT TO authenticated USING(usuario_id=(SELECT auth.uid()));
CREATE FUNCTION erp_privado.notificar_status_consumidor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  INSERT INTO public.eventos_pedidos_cliente(usuario_id,atualizado_em)
   SELECT usuario_id,clock_timestamp() FROM public.solicitacoes_mobile WHERE pedido_id=NEW.id
  ON CONFLICT(usuario_id) DO UPDATE SET atualizado_em=excluded.atualizado_em;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.notificar_status_consumidor() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notificar_status_consumidor AFTER UPDATE OF status ON public.pedidos FOR EACH ROW EXECUTE FUNCTION erp_privado.notificar_status_consumidor();

-- A publicação transporta somente linhas permitidas pelas políticas já existentes.
DO $$ DECLARE tabela text;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH tabela IN ARRAY ARRAY['solicitacoes_mobile','pedidos','itens_pedido','eventos_pedidos_cliente'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=tabela) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',tabela);
   END IF;
  END LOOP;
 END IF;
END; $$;
NOTIFY pgrst,'reload schema';
COMMIT;
