-- ============================================================
-- MIGRATION — FASES 4.2.2, 4.4 e 4.5
-- ============================================================

-- ============================================================
-- 4.2.2 — FECHAMENTO DE PEDIDOS
-- ============================================================
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;
-- (a coluna "observacoes" já existe em pedidos desde o schema.sql — só
-- não estava exposta na UI; corrigido no front-end)

-- ============================================================
-- REALISMO DE PAGAMENTO — canal de venda, troco e taxas
--
-- Analogia: "canal próprio" = modelo Goomer (loja controla o preço,
-- sem comissão de terceiro). "ifood"/"rappi" = marketplace, cobra
-- comissão da loja e por isso o preço praticado costuma ser mais alto
-- nesses canais pra compensar a taxa.
-- ============================================================
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS canal_venda TEXT DEFAULT 'proprio'
    CHECK (canal_venda IN ('proprio', 'ifood', 'rappi'));
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS troco_para NUMERIC(10,2);

CREATE TABLE IF NOT EXISTS configuracoes_canal (
    canal_venda TEXT PRIMARY KEY,
    nome_exibicao TEXT NOT NULL,
    taxa_plataforma_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,  -- comissão cobrada da loja
    markup_preco_percentual NUMERIC(5,2) NOT NULL DEFAULT 0      -- quanto o preço sobe nesse canal
);

INSERT INTO configuracoes_canal (canal_venda, nome_exibicao, taxa_plataforma_percentual, markup_preco_percentual)
VALUES
    ('proprio', 'Canal Próprio (Goomer)', 0,    0),
    ('ifood',   'iFood',                 23,   15),
    ('rappi',   'Rappi',                 20,   12)
ON CONFLICT (canal_venda) DO NOTHING;

CREATE TABLE IF NOT EXISTS configuracoes_pagamento (
    forma_pagamento TEXT PRIMARY KEY,
    nome_exibicao TEXT NOT NULL,
    taxa_percentual NUMERIC(5,2) NOT NULL DEFAULT 0   -- taxa de maquininha/gateway
);

INSERT INTO configuracoes_pagamento (forma_pagamento, nome_exibicao, taxa_percentual)
VALUES
    ('pix',      'Pix',                0),
    ('dinheiro', 'Dinheiro',           0),
    ('debito',   'Cartão de Débito',   1.5),
    ('credito',  'Cartão de Crédito',  2.99)
ON CONFLICT (forma_pagamento) DO NOTHING;

alter table configuracoes_canal enable row level security;
alter table configuracoes_pagamento enable row level security;
create policy "leitura_autenticados" on configuracoes_canal for select to authenticated using (true);
create policy "leitura_autenticados" on configuracoes_pagamento for select to authenticated using (true);

-- ============================================================
-- 4.4 — PRODUTOS: NOME COMERCIAL, LINHA E MARCA
-- ============================================================
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS nome_comercial TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS linha TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS marca TEXT DEFAULT 'Brasa Burguer';

-- Preenche nome_comercial com o nome atual pros produtos já existentes
-- (assim nada quebra visualmente até você personalizar cada um)
UPDATE produtos SET nome_comercial = nome WHERE nome_comercial IS NULL;

-- ============================================================
-- 4.5 — FUNDAÇÃO ANALÍTICA (DIMENSÕES E FATOS)
--
-- Implementadas como VIEWS (não tabelas duplicadas) — refletem sempre
-- o estado atual das tabelas operacionais. É essa camada que uma
-- ferramenta como Power BI deve consumir, não as tabelas operacionais
-- diretamente (evita acoplar o relatório aos detalhes internos do ERP).
-- ============================================================

-- ---------- dim_loja ----------
CREATE OR REPLACE VIEW dim_loja AS
SELECT id AS loja_id, nome AS loja_nome, slug, tipo_operacao, endereco
FROM lojas;

-- ---------- dim_categoria ----------
CREATE OR REPLACE VIEW dim_categoria AS
SELECT id AS categoria_id, nome AS categoria_nome, ordem
FROM categorias;

-- ---------- dim_produto ----------
CREATE OR REPLACE VIEW dim_produto AS
SELECT
    p.sku AS produto_sku,
    p.nome AS produto_nome_tecnico,
    COALESCE(p.nome_comercial, p.nome) AS produto_nome_comercial,
    p.linha,
    p.marca,
    p.subcategoria,
    c.nome AS categoria_nome,
    p.vegano,
    p.vegetariano,
    p.contem_lactose,
    p.ativo
FROM produtos p
JOIN categorias c ON c.id = p.categoria_id;

-- ---------- dim_cliente ----------
CREATE OR REPLACE VIEW dim_cliente AS
SELECT
    cpf AS cliente_cpf,
    nome AS cliente_nome,
    cidade,
    estado,
    bairro,
    data_cadastro
FROM clientes;

-- ---------- dim_canal (tipo de atendimento) ----------
CREATE OR REPLACE VIEW dim_canal AS
SELECT canal_venda AS canal_id, nome_exibicao AS canal_nome,
       taxa_plataforma_percentual, markup_preco_percentual
FROM configuracoes_canal;

-- ---------- dim_pagamento ----------
CREATE OR REPLACE VIEW dim_pagamento AS
SELECT forma_pagamento AS pagamento_id, nome_exibicao AS pagamento_nome, taxa_percentual
FROM configuracoes_pagamento;

-- ---------- dim_data ----------
-- Spine de datas (últimos 2 anos até 1 ano à frente) — suficiente pra
-- cobrir qualquer pedido gerado nos testes e no uso real do projeto.
CREATE OR REPLACE VIEW dim_data AS
SELECT
    d::date AS data_id,
    EXTRACT(YEAR FROM d)::int AS ano,
    EXTRACT(MONTH FROM d)::int AS mes,
    TO_CHAR(d, 'TMMonth') AS nome_mes,
    EXTRACT(DAY FROM d)::int AS dia,
    EXTRACT(DOW FROM d)::int AS dia_semana_num,
    TO_CHAR(d, 'TMDay') AS dia_semana_nome,
    CASE WHEN EXTRACT(DOW FROM d) IN (0,6) THEN true ELSE false END AS fim_de_semana
FROM generate_series(
    (CURRENT_DATE - INTERVAL '2 years')::date,
    (CURRENT_DATE + INTERVAL '1 year')::date,
    INTERVAL '1 day'
) AS d;

-- ---------- fato_vendas (1 linha por pedido) ----------
CREATE OR REPLACE VIEW fato_vendas AS
SELECT
    p.id AS pedido_id,
    p.loja_id,
    p.cliente_cpf,
    p.tipo_atendimento,
    p.canal_venda AS canal_id,
    p.forma_pagamento AS pagamento_id,
    p.criado_em::date AS data_id,
    p.status,
    p.valor_total,
    p.troco_para,
    p.motivo_cancelamento,
    ROUND(p.valor_total * COALESCE(cc.taxa_plataforma_percentual, 0) / 100, 2) AS taxa_plataforma_valor,
    ROUND(p.valor_total * COALESCE(cp.taxa_percentual, 0) / 100, 2) AS taxa_pagamento_valor,
    p.valor_total
        - ROUND(p.valor_total * COALESCE(cc.taxa_plataforma_percentual, 0) / 100, 2)
        - ROUND(p.valor_total * COALESCE(cp.taxa_percentual, 0) / 100, 2) AS valor_liquido
FROM pedidos p
LEFT JOIN configuracoes_canal cc ON cc.canal_venda = p.canal_venda
LEFT JOIN configuracoes_pagamento cp ON cp.forma_pagamento = p.forma_pagamento;

-- ---------- fato_itens_venda (1 linha por item vendido, com custo/margem) ----------
CREATE OR REPLACE VIEW fato_itens_venda AS
SELECT
    ip.id AS item_id,
    ip.pedido_id,
    p.loja_id,
    p.cliente_cpf,
    p.criado_em::date AS data_id,
    ip.produto_sku,
    ip.variacao_id,
    ip.quantidade,
    ip.preco_unitario,
    ip.quantidade * ip.preco_unitario AS receita,
    COALESCE(ft.custo_unitario, 0) AS custo_unitario,
    ip.quantidade * COALESCE(ft.custo_unitario, 0) AS custo_total,
    (ip.quantidade * ip.preco_unitario) - (ip.quantidade * COALESCE(ft.custo_unitario, 0)) AS margem_valor
FROM itens_pedido ip
JOIN pedidos p ON p.id = ip.pedido_id
LEFT JOIN (
    SELECT variacao_id, custo_ficha_tecnica AS custo_unitario FROM vw_custo_variacao
) ft ON ft.variacao_id = ip.variacao_id;

COMMENT ON VIEW fato_vendas IS 'Fato analítico — 1 linha por pedido. Fonte para Power BI/relatórios de faturamento e ticket médio.';
COMMENT ON VIEW fato_itens_venda IS 'Fato analítico — 1 linha por item vendido, já com custo e margem calculados. Fonte para CMV, margem e ranking de produtos.';
