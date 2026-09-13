-- ============================================================
-- POINT DO LANCHE — SCHEMA MYSQL (versão para estudo/análise)
-- Adaptado do schema original (Supabase/PostgreSQL) para MySQL.
-- IDs numéricos (AUTO_INCREMENT) em vez de UUID, para facilitar
-- leitura de resultados e joins durante os estudos.
-- ============================================================

CREATE DATABASE IF NOT EXISTS point_do_lanche
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE point_do_lanche;

-- ============================================================
-- 1. LOJAS
-- ============================================================
CREATE TABLE lojas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    tipo_operacao   ENUM('presencial_delivery', 'delivery_only') NOT NULL,
    endereco        VARCHAR(200),
    ativo           BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- ============================================================
-- 2. FORNECEDORES
-- ============================================================
CREATE TABLE fornecedores (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    nome                    VARCHAR(150) NOT NULL,
    categoria_fornecimento  VARCHAR(50),
    ativo                   BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- ============================================================
-- 3. CATEGORIAS
-- ============================================================
CREATE TABLE categorias (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(60) NOT NULL UNIQUE,
    ordem       INT DEFAULT 0,
    ativo       BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- ============================================================
-- 4. CLIENTES (CPF como identificador)
-- ============================================================
CREATE TABLE clientes (
    cpf             CHAR(11) PRIMARY KEY,
    nome            VARCHAR(120) NOT NULL,
    telefone        VARCHAR(20) NOT NULL,
    email           VARCHAR(120),
    data_cadastro   DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 5. INGREDIENTES
-- ============================================================
CREATE TABLE ingredientes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    unidade_medida  ENUM('g','ml','un') NOT NULL,
    custo_unitario  DECIMAL(10,4) NOT NULL,
    categoria       VARCHAR(50),
    fornecedor_id   INT,
    ativo           BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
) ENGINE=InnoDB;

-- ============================================================
-- 6. PRODUTOS
-- ============================================================
CREATE TABLE produtos (
    sku                     VARCHAR(10) PRIMARY KEY,
    nome                    VARCHAR(120) NOT NULL,
    categoria_id            INT NOT NULL,
    subcategoria            VARCHAR(60),
    descricao               VARCHAR(300),
    permite_adicionais      BOOLEAN DEFAULT FALSE,
    vegano                  BOOLEAN DEFAULT FALSE,
    vegetariano             BOOLEAN DEFAULT FALSE,
    contem_lactose          BOOLEAN DEFAULT TRUE,
    ativo                   BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. VARIAÇÕES DE PRODUTO
-- ============================================================
CREATE TABLE produto_variacoes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    produto_sku     VARCHAR(10) NOT NULL,
    nome_variacao   VARCHAR(40) NOT NULL,
    preco_venda     DECIMAL(10,2) NOT NULL,
    padrao          BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (produto_sku) REFERENCES produtos(sku) ON DELETE CASCADE,
    UNIQUE (produto_sku, nome_variacao)
) ENGINE=InnoDB;

-- ============================================================
-- 8. FICHAS TÉCNICAS
-- ============================================================
CREATE TABLE fichas_tecnicas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    variacao_id     INT NOT NULL,
    ingrediente_id  INT NOT NULL,
    peso_quantidade DECIMAL(10,3) NOT NULL,
    FOREIGN KEY (variacao_id) REFERENCES produto_variacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id),
    UNIQUE (variacao_id, ingrediente_id)
) ENGINE=InnoDB;

-- ============================================================
-- 9. ADICIONAIS (Monte Seu Burger e afins)
-- ============================================================
CREATE TABLE adicionais (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(60) NOT NULL,
    categoria       ENUM('queijo','proteina','complemento','molho') NOT NULL,
    ingrediente_id  INT,
    preco_adicional DECIMAL(10,2) NOT NULL,
    ativo           BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
) ENGINE=InnoDB;

CREATE TABLE produto_adicionais_disponiveis (
    produto_sku     VARCHAR(10) NOT NULL,
    adicional_id    INT NOT NULL,
    PRIMARY KEY (produto_sku, adicional_id),
    FOREIGN KEY (produto_sku) REFERENCES produtos(sku) ON DELETE CASCADE,
    FOREIGN KEY (adicional_id) REFERENCES adicionais(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 10. ESTOQUE POR LOJA
-- ============================================================
CREATE TABLE estoque_lojas (
    loja_id                 INT NOT NULL,
    ingrediente_id          INT NOT NULL,
    quantidade_disponivel   DECIMAL(12,3) NOT NULL DEFAULT 0,
    quantidade_minima       DECIMAL(12,3) NOT NULL DEFAULT 0,
    atualizado_em           DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (loja_id, ingrediente_id),
    FOREIGN KEY (loja_id) REFERENCES lojas(id),
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
) ENGINE=InnoDB;

-- ============================================================
-- 11. CERVEJAS ARTESANAIS (atributos extras de produtos de garrafa)
-- ============================================================
CREATE TABLE cervejas_detalhes (
    produto_sku VARCHAR(10) PRIMARY KEY,
    cervejaria  VARCHAR(100) NOT NULL,
    estilo      VARCHAR(50) NOT NULL,
    abv         DECIMAL(4,2),
    ibu         INT,
    volume_ml   INT NOT NULL,
    FOREIGN KEY (produto_sku) REFERENCES produtos(sku) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 12. CHOPP — TORNEIRAS
-- ============================================================
CREATE TABLE torneiras_chopp (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    numero_torneira         INT NOT NULL UNIQUE,
    produto_sku             VARCHAR(10) NOT NULL,
    cervejaria              VARCHAR(100) NOT NULL,
    estilo                  VARCHAR(50) NOT NULL,
    volume_barril_litros    DECIMAL(6,2) NOT NULL DEFAULT 50,
    ativo                   BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (produto_sku) REFERENCES produtos(sku)
) ENGINE=InnoDB;

-- ============================================================
-- 13. PEDIDOS
-- ============================================================
CREATE TABLE pedidos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    loja_id             INT NOT NULL,
    cliente_cpf         CHAR(11) NOT NULL,
    tipo_atendimento    ENUM('presencial','delivery') NOT NULL,
    status              ENUM('recebido','em_preparo','pronto','saiu_entrega','entregue','cancelado')
                            NOT NULL DEFAULT 'entregue',
    forma_pagamento     ENUM('pix','credito','debito','dinheiro'),
    valor_total         DECIMAL(10,2) NOT NULL DEFAULT 0,
    criado_em           DATETIME NOT NULL,
    FOREIGN KEY (loja_id) REFERENCES lojas(id),
    FOREIGN KEY (cliente_cpf) REFERENCES clientes(cpf)
) ENGINE=InnoDB;

-- ============================================================
-- 14. ITENS DO PEDIDO
-- ============================================================
CREATE TABLE itens_pedido (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       INT NOT NULL,
    produto_sku     VARCHAR(10) NOT NULL,
    variacao_id     INT NOT NULL,
    quantidade      INT NOT NULL,
    preco_unitario  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_sku) REFERENCES produtos(sku),
    FOREIGN KEY (variacao_id) REFERENCES produto_variacoes(id)
) ENGINE=InnoDB;

CREATE TABLE itens_pedido_adicionais (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    item_pedido_id  INT NOT NULL,
    adicional_id    INT NOT NULL,
    quantidade      INT NOT NULL DEFAULT 1,
    preco_unitario  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (item_pedido_id) REFERENCES itens_pedido(id) ON DELETE CASCADE,
    FOREIGN KEY (adicional_id) REFERENCES adicionais(id)
) ENGINE=InnoDB;

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX idx_pedidos_loja ON pedidos(loja_id);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_cpf);
CREATE INDEX idx_pedidos_data ON pedidos(criado_em);
CREATE INDEX idx_itens_pedido_pedido ON itens_pedido(pedido_id);
CREATE INDEX idx_itens_pedido_produto ON itens_pedido(produto_sku);

-- ============================================================
-- VIEWS ANALÍTICAS
-- ============================================================

-- Custo (CMV) por variação de produto
CREATE VIEW vw_custo_variacao AS
SELECT
    pv.id AS variacao_id,
    pv.produto_sku,
    pv.nome_variacao,
    pv.preco_venda,
    SUM(ft.peso_quantidade * ing.custo_unitario) AS custo_ficha_tecnica,
    ROUND((SUM(ft.peso_quantidade * ing.custo_unitario) / NULLIF(pv.preco_venda,0)) * 100, 2) AS cmv_percentual
FROM produto_variacoes pv
JOIN fichas_tecnicas ft ON ft.variacao_id = pv.id
JOIN ingredientes ing ON ing.id = ft.ingrediente_id
GROUP BY pv.id, pv.produto_sku, pv.nome_variacao, pv.preco_venda;

-- Vendas por loja
CREATE VIEW vw_vendas_por_loja AS
SELECT
    l.id AS loja_id,
    l.nome AS loja_nome,
    l.tipo_operacao,
    COUNT(DISTINCT p.id) AS total_pedidos,
    SUM(p.valor_total) AS faturamento,
    ROUND(AVG(p.valor_total), 2) AS ticket_medio
FROM lojas l
LEFT JOIN pedidos p ON p.loja_id = l.id AND p.status <> 'cancelado'
GROUP BY l.id, l.nome, l.tipo_operacao;

-- Ranking de produtos vendidos
CREATE VIEW vw_ranking_produtos AS
SELECT
    p.sku,
    p.nome,
    c.nome AS categoria,
    SUM(ip.quantidade) AS quantidade_vendida,
    SUM(ip.quantidade * ip.preco_unitario) AS receita_gerada
FROM itens_pedido ip
JOIN produtos p ON p.sku = ip.produto_sku
JOIN categorias c ON c.id = p.categoria_id
JOIN pedidos ped ON ped.id = ip.pedido_id AND ped.status <> 'cancelado'
GROUP BY p.sku, p.nome, c.nome
ORDER BY quantidade_vendida DESC;
