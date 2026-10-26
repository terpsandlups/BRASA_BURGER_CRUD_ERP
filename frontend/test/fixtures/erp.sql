-- Banco efêmero: contratos mínimos das tabelas legadas. As funções, triggers
-- e grants testados são carregados dos arquivos SQL de produção.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TABLE lojas (id uuid PRIMARY KEY, nome text, ativo boolean DEFAULT true, tipo_operacao text DEFAULT 'presencial_delivery');
CREATE TABLE clientes (cpf char(11) PRIMARY KEY, nome text, telefone text);
CREATE TABLE perfis (id uuid PRIMARY KEY, nome text UNIQUE);
CREATE TABLE usuarios (id uuid PRIMARY KEY REFERENCES auth.users(id), perfil_id uuid REFERENCES perfis(id), loja_id uuid REFERENCES lojas(id), ativo boolean DEFAULT true);
CREATE TABLE permissoes (perfil_id uuid REFERENCES perfis(id), modulo text, pode_criar boolean DEFAULT false, pode_editar boolean DEFAULT false, pode_visualizar boolean DEFAULT true);
CREATE FUNCTION minha_loja() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT loja_id FROM usuarios WHERE id = auth.uid(); $$;
CREATE TABLE ingredientes (id uuid PRIMARY KEY, nome text, custo_unitario numeric(10,4) NOT NULL);
CREATE TABLE produtos (sku text PRIMARY KEY, nome text, ativo boolean DEFAULT true, permite_adicionais boolean DEFAULT true, disponivel_delivery boolean DEFAULT true, disponivel_presencial boolean DEFAULT true);
CREATE TABLE produto_variacoes (id uuid PRIMARY KEY, produto_sku text REFERENCES produtos(sku), preco_venda numeric(10,2), nome_variacao text);
CREATE TABLE fichas_tecnicas (variacao_id uuid REFERENCES produto_variacoes(id), ingrediente_id uuid REFERENCES ingredientes(id), peso_quantidade numeric(10,3), id uuid UNIQUE DEFAULT gen_random_uuid(), PRIMARY KEY (variacao_id, ingrediente_id));
CREATE TABLE adicionais (id uuid PRIMARY KEY, nome text, ingrediente_id uuid REFERENCES ingredientes(id), peso_quantidade numeric(10,3), preco_adicional numeric(10,2), ativo boolean DEFAULT true);
CREATE TABLE produto_adicionais_disponiveis (produto_sku text REFERENCES produtos(sku), adicional_id uuid REFERENCES adicionais(id));
CREATE TABLE estoque_lojas (loja_id uuid REFERENCES lojas(id), ingrediente_id uuid REFERENCES ingredientes(id), quantidade_disponivel numeric(12,3) NOT NULL DEFAULT 0, quantidade_minima numeric(12,3) DEFAULT 0, atualizado_em timestamptz DEFAULT now(), PRIMARY KEY(loja_id, ingrediente_id));
CREATE TABLE configuracoes_canal (canal_venda text PRIMARY KEY, markup_preco_percentual numeric DEFAULT 0, taxa_plataforma_percentual numeric DEFAULT 0);
CREATE TABLE configuracoes_pagamento (forma_pagamento text PRIMARY KEY, taxa_percentual numeric DEFAULT 0);
CREATE TABLE categorias (id uuid PRIMARY KEY, nome text);
CREATE TABLE pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loja_id uuid NOT NULL REFERENCES lojas(id), cliente_cpf char(11) REFERENCES clientes(cpf),
  tipo_atendimento text, forma_pagamento text, canal_venda text, observacoes text, troco_para numeric(10,2),
  status text NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido','em_preparo','pronto','saiu_entrega','entregue','cancelado')),
  motivo_cancelamento text, valor_total numeric(10,2) NOT NULL DEFAULT 0, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now()
);
CREATE TABLE itens_pedido (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pedido_id uuid REFERENCES pedidos(id), produto_sku text REFERENCES produtos(sku), variacao_id uuid REFERENCES produto_variacoes(id), quantidade integer NOT NULL CHECK(quantidade > 0), preco_unitario numeric(10,2));
CREATE TABLE itens_pedido_adicionais (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_pedido_id uuid REFERENCES itens_pedido(id), adicional_id uuid REFERENCES adicionais(id), quantidade integer NOT NULL CHECK(quantidade > 0), preco_unitario numeric(10,2));
CREATE TABLE requisicoes_pedido (usuario_id uuid REFERENCES auth.users(id), requisicao_id uuid, conteudo jsonb, pedido_id uuid REFERENCES pedidos(id), PRIMARY KEY(usuario_id, requisicao_id));
CREATE VIEW vw_custo_variacao AS SELECT ft.variacao_id, sum(ft.peso_quantidade * i.custo_unitario) AS custo_ficha_tecnica FROM fichas_tecnicas ft JOIN ingredientes i ON i.id=ft.ingrediente_id GROUP BY ft.variacao_id;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY pedidos_por_unidade ON pedidos FOR SELECT TO authenticated USING (minha_loja() IS NULL OR loja_id=minha_loja());
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY itens_por_unidade ON itens_pedido FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM pedidos p WHERE p.id=pedido_id));
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE ON estoque_lojas TO authenticated;
GRANT INSERT,UPDATE,DELETE ON perfis,permissoes,clientes,produtos,produto_variacoes,fichas_tecnicas,ingredientes TO authenticated;

INSERT INTO lojas VALUES ('10000000-0000-0000-0000-000000000001','Loja A',true,'presencial_delivery'), ('10000000-0000-0000-0000-000000000002','Loja B',true,'presencial_delivery');
INSERT INTO auth.users VALUES ('20000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002'),('20000000-0000-0000-0000-000000000003'),('20000000-0000-0000-0000-000000000004');
INSERT INTO perfis VALUES ('30000000-0000-0000-0000-000000000001','Administrador'),('30000000-0000-0000-0000-000000000002','Visualização'),('30000000-0000-0000-0000-000000000003','Gerente');
INSERT INTO usuarios VALUES
 ('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',NULL,true),
 ('20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',NULL,true),
 ('20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',true),
 ('20000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001',NULL,false);
INSERT INTO permissoes(perfil_id,modulo,pode_visualizar) SELECT '30000000-0000-0000-0000-000000000002',modulo,true FROM unnest(ARRAY['vendas','clientes','produtos','estoque']) modulo;
INSERT INTO clientes(cpf,nome) VALUES ('12345678900','Cliente fictício');
INSERT INTO ingredientes VALUES ('40000000-0000-0000-0000-000000000001','Carne',0.02), ('40000000-0000-0000-0000-000000000002','Bacon',0.04);
INSERT INTO produtos(sku,nome) VALUES ('LAN001','Burger teste'),('BEB001','Produto sem ficha');
INSERT INTO produto_variacoes VALUES ('50000000-0000-0000-0000-000000000001','LAN001',25,'100g'),('50000000-0000-0000-0000-000000000002','BEB001',5,'Único');
INSERT INTO fichas_tecnicas(variacao_id,ingrediente_id,peso_quantidade) VALUES ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',100);
INSERT INTO adicionais VALUES ('60000000-0000-0000-0000-000000000001','Bacon teste','40000000-0000-0000-0000-000000000002',20,3,true);
INSERT INTO produto_adicionais_disponiveis VALUES ('LAN001','60000000-0000-0000-0000-000000000001');
INSERT INTO estoque_lojas(loja_id,ingrediente_id,quantidade_disponivel) SELECT l.id,i.id,1000 FROM lojas l CROSS JOIN ingredientes i;
INSERT INTO configuracoes_canal VALUES ('proprio',0,0),('ifood',10,12);
INSERT INTO configuracoes_pagamento VALUES ('pix',0),('dinheiro',0),('credito',3);
ALTER TABLE auth.users ADD COLUMN email text;
ALTER TABLE usuarios ADD COLUMN nome text, ADD COLUMN email text;
ALTER TABLE lojas ADD COLUMN slug text;
ALTER TABLE categorias ALTER COLUMN id SET DEFAULT gen_random_uuid();
