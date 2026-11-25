BEGIN;

-- Ficha comercial permanece em clientes, com a mesma PK e as mesmas RLS.
-- O vínculo de identidade fica privado; CPF/telefone digitados não comprovam posse.
CREATE TABLE erp_privado.vinculos_cliente_app (
 empresa_id uuid NOT NULL,
 cpf char(11) NOT NULL,
 usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 pode_atualizar boolean NOT NULL DEFAULT false,
 criado_em timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(empresa_id,cpf),
 UNIQUE(empresa_id,usuario_id),
 FOREIGN KEY(empresa_id,cpf) REFERENCES public.clientes(empresa_id,cpf) ON DELETE CASCADE
);
ALTER TABLE erp_privado.vinculos_cliente_app ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON erp_privado.vinculos_cliente_app FROM PUBLIC,anon,authenticated;
CREATE INDEX clientes_email_normalizado_idx ON public.clientes(empresa_id,lower(btrim(email))) WHERE NULLIF(btrim(email),'') IS NOT NULL;
CREATE INDEX clientes_telefone_normalizado_idx ON public.clientes(empresa_id,(regexp_replace(telefone,'[^0-9]','','g')));

CREATE FUNCTION erp_privado.integrar_cliente_app(p_usuario uuid,p_slug text,p_atualizar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 empresa uuid; conta erp_privado.contas_consumidor%ROWTYPE;
 ficha public.clientes%ROWTYPE; vinculo erp_privado.vinculos_cliente_app%ROWTYPE;
 identidade jsonb; email_confirmado text; encontrados integer; novo_cpf char(11); autorizado boolean;
BEGIN
 IF p_usuario IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.' USING ERRCODE='42501'; END IF;
 SELECT id INTO empresa FROM public.empresas WHERE slug=p_slug AND ativo;
 IF empresa IS NULL THEN RAISE EXCEPTION 'Estabelecimento indisponível.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_usuario::text,713));
 SELECT to_jsonb(a) INTO identidade FROM auth.users a WHERE a.id=p_usuario;
 IF identidade IS NULL THEN RAISE EXCEPTION 'Conta indisponível.'; END IF;
 IF identidade->>'email_confirmed_at' IS NOT NULL AND lower(COALESCE(identidade->>'email','')) NOT LIKE '%.invalid' THEN
  email_confirmado:=NULLIF(lower(btrim(identidade->>'email')),'');
 END IF;
 SELECT * INTO conta FROM erp_privado.contas_consumidor WHERE usuario_id=p_usuario;
 IF NOT FOUND AND email_confirmado IS NOT NULL THEN
  SELECT count(*) INTO encontrados FROM public.clientes WHERE empresa_id=empresa AND lower(btrim(email))=email_confirmado;
  IF encontrados=1 THEN
   SELECT * INTO ficha FROM public.clientes WHERE empresa_id=empresa AND lower(btrim(email))=email_confirmado;
   BEGIN
    PERFORM erp_privado.validar_cadastro_consumidor(btrim(ficha.cpf),ficha.nome,regexp_replace(ficha.telefone,'[^0-9]','','g'));
    INSERT INTO erp_privado.contas_consumidor(usuario_id,cpf,nome,telefone)
     VALUES(p_usuario,btrim(ficha.cpf),ficha.nome,regexp_replace(ficha.telefone,'[^0-9]','','g')) ON CONFLICT(usuario_id) DO NOTHING;
   EXCEPTION WHEN unique_violation OR raise_exception THEN
    -- Contato ambíguo, ficha legada inválida ou CPF já pertencente a outra conta:
    -- não transferir identidade/histórico nem divulgar dados do outro titular.
    RETURN NULL;
   END;
   SELECT * INTO conta FROM erp_privado.contas_consumidor WHERE usuario_id=p_usuario;
  END IF;
 END IF;
 IF conta.usuario_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO vinculo FROM erp_privado.vinculos_cliente_app WHERE empresa_id=empresa AND cpf=conta.cpf;
 novo_cpf:=NULL;
 INSERT INTO public.clientes(empresa_id,cpf,nome,telefone,email)
 VALUES(empresa,conta.cpf,conta.nome,conta.telefone,email_confirmado)
 ON CONFLICT(empresa_id,cpf) DO NOTHING RETURNING cpf INTO novo_cpf;
 SELECT * INTO STRICT ficha FROM public.clientes WHERE empresa_id=empresa AND cpf=conta.cpf;
 SELECT count(*) INTO encontrados FROM public.clientes
 WHERE empresa_id=empresa AND lower(btrim(email))=email_confirmado;
 autorizado:=novo_cpf IS NOT NULL OR (vinculo.usuario_id=p_usuario AND vinculo.pode_atualizar)
  OR (encontrados=1 AND email_confirmado=lower(btrim(ficha.email)));
 autorizado:=COALESCE(autorizado,false);
 IF vinculo.usuario_id IS NOT NULL AND vinculo.usuario_id<>p_usuario THEN RAISE EXCEPTION 'CPF já possui acesso. Entre na conta existente ou contate a loja.'; END IF;
 INSERT INTO erp_privado.vinculos_cliente_app(empresa_id,cpf,usuario_id,pode_atualizar)
 VALUES(empresa,conta.cpf,p_usuario,autorizado)
 ON CONFLICT(empresa_id,cpf) DO UPDATE SET pode_atualizar=true
 WHERE vinculos_cliente_app.usuario_id=p_usuario AND NOT vinculos_cliente_app.pode_atualizar AND autorizado;
 IF p_atualizar AND autorizado THEN
  UPDATE public.clientes SET nome=conta.nome,telefone=conta.telefone
  WHERE empresa_id=empresa AND cpf=conta.cpf AND (nome,telefone) IS DISTINCT FROM (conta.nome,conta.telefone);
  SELECT * INTO ficha FROM public.clientes WHERE empresa_id=empresa AND cpf=conta.cpf;
 END IF;
 RETURN jsonb_build_object('cpf',btrim(conta.cpf),'nome',CASE WHEN autorizado THEN ficha.nome ELSE conta.nome END,
  'telefone',CASE WHEN autorizado THEN ficha.telefone ELSE conta.telefone END,'cadastro_erp',true,'dados_confirmados',autorizado);
END; $$;
REVOKE ALL ON FUNCTION erp_privado.integrar_cliente_app(uuid,text,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION erp_privado.cadastro_cliente_empresa(p_slug text,p_atualizar boolean DEFAULT false,p_cpf text DEFAULT NULL,p_nome text DEFAULT NULL,p_telefone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.' USING ERRCODE='42501'; END IF;
 IF p_cpf IS NOT NULL THEN
  PERFORM public.cadastrar_perfil_cliente(p_cpf,p_nome,p_telefone);
 ELSE
  PERFORM erp_privado.recuperar_cadastro_consumidor();
 END IF;
 RETURN erp_privado.integrar_cliente_app(auth.uid(),p_slug,p_atualizar);
END; $$;
REVOKE ALL ON FUNCTION erp_privado.cadastro_cliente_empresa(text,boolean,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.cadastro_cliente_empresa(text,boolean,text,text,text) TO authenticated;

CREATE FUNCTION public.meu_cadastro_cliente(p_slug text) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $$ SELECT erp_privado.cadastro_cliente_empresa(p_slug); $$;
CREATE FUNCTION public.cadastrar_perfil_cliente(p_cpf text,p_nome text,p_telefone text,p_slug text) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $$ SELECT erp_privado.cadastro_cliente_empresa(p_slug,true,p_cpf,p_nome,p_telefone); $$;
REVOKE ALL ON FUNCTION public.meu_cadastro_cliente(text),public.cadastrar_perfil_cliente(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.meu_cadastro_cliente(text),public.cadastrar_perfil_cliente(text,text,text,text) TO authenticated;

CREATE FUNCTION erp_privado.sincronizar_conta_cliente() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE marca text;
BEGIN
 SELECT a.raw_user_meta_data->>'empresa_slug' INTO marca FROM auth.users a WHERE a.id=NEW.usuario_id;
 -- Compatibilidade com o cadastro anterior do piloto. Sem adivinhar a empresa
 -- se a instalação já tiver vários contratantes: a RPC autenticada a seleciona.
 IF marca IS NULL AND (SELECT count(*) FROM public.empresas WHERE ativo)=1 THEN
  SELECT slug INTO marca FROM public.empresas WHERE ativo;
 END IF;
 IF marca IS NOT NULL AND EXISTS(SELECT 1 FROM public.empresas WHERE slug=marca AND ativo) THEN
  PERFORM erp_privado.integrar_cliente_app(NEW.usuario_id,marca,false);
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.sincronizar_conta_cliente() FROM PUBLIC,anon,authenticated;
-- Alterações posteriores usam a RPC com empresa explícita, para não atualizar
-- por engano o cadastro comercial de outro contratante.
CREATE TRIGGER sincronizar_conta_cliente AFTER INSERT ON erp_privado.contas_consumidor
 FOR EACH ROW EXECUTE FUNCTION erp_privado.sincronizar_conta_cliente();

CREATE FUNCTION erp_privado.notificar_cadastro_cliente() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
 INSERT INTO public.eventos_pedidos_cliente(usuario_id,atualizado_em)
 SELECT usuario_id,clock_timestamp() FROM erp_privado.vinculos_cliente_app
 WHERE empresa_id=NEW.empresa_id AND cpf=NEW.cpf AND pode_atualizar
 ON CONFLICT(usuario_id) DO UPDATE SET atualizado_em=excluded.atualizado_em;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.notificar_cadastro_cliente() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notificar_cadastro_cliente AFTER UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION erp_privado.notificar_cadastro_cliente();

-- Completa somente associações comprovadas pelo histórico da própria conta.
-- Não reescreve as fichas comerciais existentes.
DO $$ DECLARE registro record; BEGIN
 FOR registro IN SELECT DISTINCT cc.usuario_id,e.slug FROM erp_privado.contas_consumidor cc
  JOIN public.solicitacoes_mobile s ON s.usuario_id=cc.usuario_id
  JOIN public.lojas l ON l.id=s.loja_id JOIN public.empresas e ON e.id=l.empresa_id WHERE e.ativo
 LOOP PERFORM erp_privado.integrar_cliente_app(registro.usuario_id,registro.slug); END LOOP;
END; $$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND
 NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='clientes') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
 END IF;
END; $$;
NOTIFY pgrst,'reload schema';
COMMIT;
