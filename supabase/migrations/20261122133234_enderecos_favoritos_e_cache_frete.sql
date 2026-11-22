BEGIN;

-- Agenda pessoal: equipe e outros consumidores não recebem acesso.
CREATE TABLE public.enderecos_consumidor (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 apelido text NOT NULL CHECK (length(btrim(apelido)) BETWEEN 1 AND 40),
 cep text NOT NULL CHECK (cep ~ '^[0-9]{8}$'),
 endereco text NOT NULL CHECK (length(btrim(endereco)) BETWEEN 1 AND 250),
 numero text NOT NULL CHECK (length(btrim(numero)) BETWEEN 1 AND 30),
 complemento text NOT NULL DEFAULT '' CHECK (length(complemento)<=250),
 bairro text NOT NULL CHECK (length(btrim(bairro)) BETWEEN 1 AND 150),
 cidade text NOT NULL CHECK (length(btrim(cidade)) BETWEEN 1 AND 150),
 estado text NOT NULL CHECK (estado ~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'),
 latitude numeric, longitude numeric,
 criado_em timestamptz NOT NULL DEFAULT now(),
 CHECK ((latitude IS NULL AND longitude IS NULL) OR
  (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -34 AND 6 AND longitude BETWEEN -74 AND -34))
);
CREATE INDEX enderecos_consumidor_titular ON public.enderecos_consumidor(usuario_id,criado_em DESC);
ALTER TABLE public.enderecos_consumidor ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enderecos_consumidor FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.enderecos_consumidor TO authenticated;
CREATE POLICY endereco_ler ON public.enderecos_consumidor FOR SELECT TO authenticated USING(usuario_id=(SELECT auth.uid()));
CREATE POLICY endereco_criar ON public.enderecos_consumidor FOR INSERT TO authenticated WITH CHECK(usuario_id=(SELECT auth.uid()));
CREATE POLICY endereco_editar ON public.enderecos_consumidor FOR UPDATE TO authenticated USING(usuario_id=(SELECT auth.uid())) WITH CHECK(usuario_id=(SELECT auth.uid()));
CREATE POLICY endereco_remover ON public.enderecos_consumidor FOR DELETE TO authenticated USING(usuario_id=(SELECT auth.uid()));

-- Só a Edge Function lê e escreve. Guarda localização confirmada por sete dias
-- e distância de rota por um dia; preço e permissões sempre são consultados de novo.
CREATE TABLE public.cache_rotas_entrega (
 chave text PRIMARY KEY CHECK(chave ~ '^[a-f0-9]{64}$'),
 tipo text NOT NULL CHECK(tipo IN ('geocodigo','rota')),
 valor jsonb NOT NULL CHECK(octet_length(valor::text)<=8192),
 expira_em timestamptz NOT NULL
);
CREATE INDEX cache_rotas_entrega_expiracao ON public.cache_rotas_entrega(expira_em);
ALTER TABLE public.cache_rotas_entrega ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cache_rotas_entrega FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.cache_rotas_entrega TO service_role;
CREATE POLICY cache_apenas_servidor ON public.cache_rotas_entrega TO service_role USING(true) WITH CHECK(true);

-- Recupera registros legados apenas dos dados da própria conta e de pedidos
-- feitos por ela. Metadados pessoais nunca concedem permissão no ERP.
CREATE FUNCTION erp_privado.recuperar_cadastro_consumidor() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE titular uuid:=auth.uid(); cadastro jsonb; candidato jsonb; meta jsonb;
BEGIN
 IF titular IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('cpf',cpf,'nome',nome,'telefone',telefone) INTO cadastro
 FROM erp_privado.contas_consumidor WHERE usuario_id=titular;
 IF cadastro IS NOT NULL THEN RETURN cadastro; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(titular::text,713));
 SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id=titular;
 FOR candidato IN
  SELECT dados FROM (
   SELECT 0 AS prioridade,now() AS data,meta AS dados
   UNION ALL SELECT 1,s.criado_em,s.dados FROM public.solicitacoes_mobile s WHERE s.usuario_id=titular
  ) origem WHERE dados IS NOT NULL ORDER BY prioridade,data DESC
 LOOP
  candidato:=jsonb_build_object('cpf',regexp_replace(COALESCE(candidato->>'cpf',''),'[^0-9]','','g'),
   'nome',btrim(COALESCE(candidato->>'nome',candidato->>'full_name','')),
   'telefone',regexp_replace(COALESCE(candidato->>'telefone',candidato->>'phone',''),'[^0-9]','','g'));
  BEGIN
   PERFORM erp_privado.validar_cadastro_consumidor(candidato->>'cpf',candidato->>'nome',candidato->>'telefone');
   INSERT INTO erp_privado.contas_consumidor(usuario_id,cpf,nome,telefone)
   VALUES(titular,candidato->>'cpf',candidato->>'nome',candidato->>'telefone') ON CONFLICT(usuario_id) DO NOTHING;
   EXIT;
  EXCEPTION WHEN raise_exception OR unique_violation THEN
   -- Cadastro ausente ou CPF já vinculado: não expor dados da outra conta.
   CONTINUE;
  END;
 END LOOP;
 SELECT jsonb_build_object('cpf',cpf,'nome',nome,'telefone',telefone) INTO cadastro
 FROM erp_privado.contas_consumidor WHERE usuario_id=titular;
 RETURN cadastro;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.recuperar_cadastro_consumidor() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION erp_privado.recuperar_cadastro_consumidor() TO authenticated;
CREATE OR REPLACE FUNCTION public.meu_cadastro_cliente() RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $$ SELECT erp_privado.recuperar_cadastro_consumidor(); $$;
REVOKE ALL ON FUNCTION public.meu_cadastro_cliente() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.meu_cadastro_cliente() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
