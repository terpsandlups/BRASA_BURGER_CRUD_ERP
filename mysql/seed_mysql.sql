-- ============================================================
-- POINT DO LANCHE — SEED MYSQL (catálogo + histórico de vendas)
-- Rodar DEPOIS de schema_mysql.sql
-- ============================================================
USE point_do_lanche;

-- ============================================================
-- 1. LOJAS
-- ============================================================
INSERT INTO lojas (nome, slug, tipo_operacao, endereco) VALUES
('Point do Lanche - Centro', 'centro', 'presencial_delivery', 'Rua das Flores, 120 - Centro'),
('Point do Lanche - Zona Norte', 'zona-norte', 'delivery_only', 'Cozinha fantasma - Zona Norte'),
('Point do Lanche - Zona Sul', 'zona-sul', 'delivery_only', 'Cozinha fantasma - Zona Sul');

-- ============================================================
-- 2. FORNECEDORES
-- ============================================================
INSERT INTO fornecedores (nome, categoria_fornecimento) VALUES
('Distribuidora Carnes Premium', 'proteinas'),
('Laticínios Serra Fina', 'laticinios'),
('Cervejaria Regional Distribuidora', 'cervejaria'),
('Hortifruti Bom Sabor', 'hortifruti'),
('Padaria Artesanal do Bairro', 'panificacao');

-- ============================================================
-- 3. CATEGORIAS
-- ============================================================
INSERT INTO categorias (nome, ordem) VALUES
('Smash Burgers', 1), ('Burgers Artesanais', 2), ('Monte Seu Burger', 3),
('Burgers Especiais', 4), ('Acompanhamentos', 5), ('Croquetas', 6),
('Porções', 7), ('Sanduíches', 8), ('Cervejas Artesanais', 9),
('Chopp', 10), ('Bebidas', 11), ('Sobremesas', 12);

-- ============================================================
-- 4. INGREDIENTES
-- ============================================================
INSERT INTO ingredientes (nome, unidade_medida, custo_unitario, categoria) VALUES
('Carne Smash', 'g', 0.045, 'proteina'),
('Carne Artesanal', 'g', 0.052, 'proteina'),
('Queijo Cheddar Fatia', 'g', 0.038, 'laticinio'),
('Bacon em Cubos', 'g', 0.061, 'proteina'),
('Pão Brioche', 'un', 1.80, 'pao'),
('Molho Especial da Casa', 'g', 0.022, 'molho'),
('Alface Americana', 'g', 0.008, 'hortifruti'),
('Tomate', 'g', 0.010, 'hortifruti'),
('Cebola Caramelizada', 'g', 0.015, 'hortifruti'),
('Pastrami Fatiado', 'g', 0.095, 'proteina'),
('Mussarela Empanada (un)', 'un', 3.20, 'laticinio'),
('Hambúrguer Vegano (un)', 'un', 4.50, 'proteina_vegetal'),
('Pão Ciabatta', 'un', 2.10, 'pao'),
('Pão Alemão (Pretzel)', 'un', 2.60, 'pao'),
('Stracciatella', 'g', 0.070, 'laticinio'),
('Molho Pesto', 'g', 0.045, 'molho'),
('Mortadela Fatiada', 'g', 0.032, 'proteina'),
('Presunto Alemão', 'g', 0.068, 'proteina'),
('Mostarda Alemã', 'g', 0.028, 'molho'),
('Chucrute', 'g', 0.020, 'hortifruti'),
('Batata Congelada Palito', 'g', 0.012, 'acompanhamento'),
('Páprica Defumada', 'g', 0.060, 'tempero'),
('Massa de Croqueta Base', 'g', 0.018, 'acompanhamento'),
('Gorgonzola', 'g', 0.085, 'laticinio'),
('Milho Verde', 'g', 0.015, 'hortifruti'),
('Pepper Jack Fatia', 'g', 0.042, 'laticinio'),
('Jalapeño Fatiado', 'g', 0.030, 'hortifruti'),
('Molho Barbecue', 'g', 0.025, 'molho'),
('Maionese Picante', 'g', 0.026, 'molho'),
('Insumo Revenda - Cerveja Garrafa', 'un', 9.50, 'revenda'),
('Insumo Revenda - Refrigerante Lata', 'un', 3.20, 'revenda'),
('Insumo Revenda - Água', 'un', 1.80, 'revenda'),
('Insumo Revenda - Água Tônica', 'un', 4.10, 'revenda'),
('Insumo Revenda - Chá Gelado', 'un', 4.50, 'revenda'),
('Insumo Revenda - Sorvete Pote', 'un', 12.00, 'revenda'),
('Insumo Revenda - Chopp Litro', 'ml', 0.018, 'revenda');

-- ============================================================
-- 5. PRODUTOS
-- ============================================================
INSERT INTO produtos (sku, nome, categoria_id, subcategoria, permite_adicionais, vegano, vegetariano, contem_lactose) VALUES
('SM001', 'Smash Clássico', 1, 'Smash', FALSE, FALSE, FALSE, TRUE),
('SM002', 'Smash BBQ Bacon', 1, 'Smash', FALSE, FALSE, FALSE, TRUE),
('SM003', 'Smash Pepper Jack', 1, 'Smash', FALSE, FALSE, FALSE, TRUE),
('SM004', 'Smash Duplo', 1, 'Smash', FALSE, FALSE, FALSE, TRUE),
('ART001', 'Artesanal Serra Fina', 2, 'Artesanal', FALSE, FALSE, FALSE, TRUE),
('ART002', 'Artesanal Trufado', 2, 'Artesanal', FALSE, FALSE, FALSE, TRUE),
('ART003', 'Artesanal do Bairro', 2, 'Artesanal', FALSE, FALSE, FALSE, TRUE),
('ART004', 'Hambúrguer Artesanal', 2, 'Artesanal', FALSE, FALSE, FALSE, TRUE),
('MSB001', 'Monte Seu Burger - Base 200g', 3, 'Monte Seu Burger', TRUE, FALSE, FALSE, TRUE),
('ESP001', 'Green Smash Vegano', 4, 'Vegano', FALSE, TRUE, TRUE, FALSE),
('ESP002', 'Mozzarella Crocante', 4, 'Mussarela Empanada', FALSE, FALSE, TRUE, TRUE),
('BAT001', 'Batata Frita da Casa', 5, 'Batata', FALSE, FALSE, TRUE, TRUE),
('CRO001', 'Croqueta de Pastrami', 6, 'Croqueta', FALSE, FALSE, FALSE, TRUE),
('CRO002', 'Croqueta Milho com Gorgonzola', 6, 'Croqueta', FALSE, FALSE, TRUE, TRUE),
('CRO003', 'Croqueta de Bacon', 6, 'Croqueta', FALSE, FALSE, FALSE, TRUE),
('CRO004', 'Croqueta de Pesto', 6, 'Croqueta', FALSE, FALSE, TRUE, TRUE),
('POR001', 'Onion Rings da Casa', 7, 'Porção', FALSE, FALSE, TRUE, TRUE),
('POR002', 'Tábua de Frios & Queijos', 7, 'Porção', FALSE, FALSE, FALSE, TRUE),
('POR003', 'Batata Rústica com Bacon e Cheddar', 7, 'Porção', FALSE, FALSE, FALSE, TRUE),
('SAND001', 'Sandwich de Pastrami', 8, 'Sandwich', TRUE, FALSE, FALSE, TRUE),
('SAND002', 'Mortadella Burrata', 8, 'Sandwich', FALSE, FALSE, FALSE, TRUE),
('SAND003', 'Frankfurt Alemão', 8, 'Sandwich', FALSE, FALSE, FALSE, TRUE),
('CERV001', 'IPA Serra Dourada 500ml', 9, 'IPA', FALSE, FALSE, TRUE, TRUE),
('CERV002', 'Pilsen Vale Verde 355ml', 9, 'Pilsen', FALSE, FALSE, TRUE, TRUE),
('CERV003', 'Weiss Bosque Alto 500ml', 9, 'Weissbier', FALSE, FALSE, TRUE, TRUE),
('CHOPP01', 'Chopp Pilsen Vale Verde', 10, 'Pilsen', FALSE, FALSE, TRUE, TRUE),
('CHOPP02', 'Chopp IPA Serra Dourada', 10, 'IPA', FALSE, FALSE, TRUE, TRUE),
('CHOPP03', 'Chopp Weiss Bosque Alto', 10, 'Weissbier', FALSE, FALSE, TRUE, TRUE),
('CHOPP04', 'Chopp Vinho Rústico', 10, 'Red Ale', FALSE, FALSE, TRUE, TRUE),
('BEB001', 'Refrigerante Lata', 11, NULL, FALSE, TRUE, TRUE, TRUE),
('BEB002', 'Água sem Gás', 11, NULL, FALSE, TRUE, TRUE, TRUE),
('BEB003', 'Água com Gás', 11, NULL, FALSE, TRUE, TRUE, TRUE),
('BEB004', 'Água Tônica', 11, NULL, FALSE, TRUE, TRUE, TRUE),
('BEB005', 'Chá Gelado', 11, NULL, FALSE, TRUE, TRUE, TRUE),
('SOB001', 'Sorvete Artesanal (pote)', 12, NULL, FALSE, FALSE, TRUE, TRUE);

-- ============================================================
-- 6. VARIAÇÕES
-- ============================================================
INSERT INTO produto_variacoes (produto_sku, nome_variacao, preco_venda, padrao) VALUES
('SM001','Único',19.90,TRUE), ('SM002','Único',24.90,TRUE), ('SM003','Único',23.90,TRUE),
('SM004','Smash 56g',22.90,TRUE), ('SM004','Smash 90g',27.90,FALSE),
('ART001','150g',27.90,TRUE), ('ART002','150g',31.90,TRUE), ('ART003','150g',28.90,TRUE),
('ART004','150g',24.90,TRUE), ('ART004','200g',29.90,FALSE),
('MSB001','200g',26.90,TRUE),
('ESP001','Único',25.90,TRUE), ('ESP002','Único',24.90,TRUE),
('BAT001','Individual',16.90,TRUE), ('BAT001','Para compartilhar',26.90,FALSE),
('CRO001','Porção (6 un)',22.90,TRUE), ('CRO002','Porção (6 un)',20.90,TRUE),
('CRO003','Porção (6 un)',21.90,TRUE), ('CRO004','Porção (6 un)',20.90,TRUE),
('POR001','Único',24.90,TRUE), ('POR002','Único',39.90,TRUE), ('POR003','Único',29.90,TRUE),
('SAND001','Único',26.90,TRUE), ('SAND002','Único',29.90,TRUE), ('SAND003','Único',27.90,TRUE),
('CERV001','Único',22.90,TRUE), ('CERV002','Único',14.90,TRUE), ('CERV003','Único',19.90,TRUE),
('CHOPP01','300ml',9.90,TRUE), ('CHOPP01','500ml',15.90,FALSE),
('CHOPP02','300ml',12.90,TRUE), ('CHOPP02','500ml',19.90,FALSE),
('CHOPP03','300ml',11.90,TRUE), ('CHOPP03','500ml',18.90,FALSE),
('CHOPP04','300ml',11.90,TRUE), ('CHOPP04','500ml',18.90,FALSE),
('BEB001','Único',7.90,TRUE), ('BEB002','Único',5.50,TRUE), ('BEB003','Único',6.50,TRUE),
('BEB004','Único',9.90,TRUE), ('BEB005','Único',8.90,TRUE), ('SOB001','Único',18.90,TRUE);

-- ============================================================
-- 7. FICHAS TÉCNICAS (usando subquery pelo nome, evita depender de IDs fixos)
-- ============================================================
INSERT INTO fichas_tecnicas (variacao_id, ingrediente_id, peso_quantidade)
SELECT pv.id, i.id, dados.peso FROM (
    SELECT 'SM001' sku,'Único' var,'Carne Smash' ing, 90 peso UNION ALL
    SELECT 'SM001','Único','Queijo Cheddar Fatia',20 UNION ALL
    SELECT 'SM001','Único','Pão Brioche',1 UNION ALL
    SELECT 'SM001','Único','Molho Especial da Casa',15 UNION ALL
    SELECT 'SM002','Único','Carne Smash',90 UNION ALL
    SELECT 'SM002','Único','Bacon em Cubos',40 UNION ALL
    SELECT 'SM002','Único','Queijo Cheddar Fatia',40 UNION ALL
    SELECT 'SM002','Único','Pão Brioche',1 UNION ALL
    SELECT 'SM002','Único','Molho Barbecue',20 UNION ALL
    SELECT 'SM003','Único','Carne Smash',90 UNION ALL
    SELECT 'SM003','Único','Pepper Jack Fatia',20 UNION ALL
    SELECT 'SM003','Único','Jalapeño Fatiado',15 UNION ALL
    SELECT 'SM003','Único','Pão Brioche',1 UNION ALL
    SELECT 'SM003','Único','Maionese Picante',15 UNION ALL
    SELECT 'SM004','Smash 56g','Carne Smash',56 UNION ALL
    SELECT 'SM004','Smash 56g','Queijo Cheddar Fatia',20 UNION ALL
    SELECT 'SM004','Smash 56g','Pão Brioche',1 UNION ALL
    SELECT 'SM004','Smash 56g','Cebola Caramelizada',25 UNION ALL
    SELECT 'SM004','Smash 90g','Carne Smash',90 UNION ALL
    SELECT 'SM004','Smash 90g','Queijo Cheddar Fatia',20 UNION ALL
    SELECT 'SM004','Smash 90g','Pão Brioche',1 UNION ALL
    SELECT 'SM004','Smash 90g','Cebola Caramelizada',25 UNION ALL
    SELECT 'ART001','150g','Carne Artesanal',150 UNION ALL
    SELECT 'ART001','150g','Queijo Cheddar Fatia',20 UNION ALL
    SELECT 'ART001','150g','Pão Brioche',1 UNION ALL
    SELECT 'ART001','150g','Cebola Caramelizada',25 UNION ALL
    SELECT 'ART002','150g','Carne Artesanal',150 UNION ALL
    SELECT 'ART002','150g','Stracciatella',30 UNION ALL
    SELECT 'ART002','150g','Pão Ciabatta',1 UNION ALL
    SELECT 'ART002','150g','Molho Especial da Casa',15 UNION ALL
    SELECT 'ART003','150g','Carne Artesanal',150 UNION ALL
    SELECT 'ART003','150g','Bacon em Cubos',40 UNION ALL
    SELECT 'ART003','150g','Queijo Cheddar Fatia',20 UNION ALL
    SELECT 'ART003','150g','Pão Brioche',1 UNION ALL
    SELECT 'ART004','150g','Carne Artesanal',150 UNION ALL
    SELECT 'ART004','150g','Queijo Cheddar Fatia',20 UNION ALL
    SELECT 'ART004','150g','Pão Brioche',1 UNION ALL
    SELECT 'ART004','200g','Carne Artesanal',200 UNION ALL
    SELECT 'ART004','200g','Queijo Cheddar Fatia',20 UNION ALL
    SELECT 'ART004','200g','Pão Brioche',1 UNION ALL
    SELECT 'MSB001','200g','Carne Artesanal',200 UNION ALL
    SELECT 'MSB001','200g','Pão Brioche',1 UNION ALL
    SELECT 'ESP001','Único','Hambúrguer Vegano (un)',1 UNION ALL
    SELECT 'ESP001','Único','Pão Brioche',1 UNION ALL
    SELECT 'ESP001','Único','Alface Americana',10 UNION ALL
    SELECT 'ESP002','Único','Mussarela Empanada (un)',2 UNION ALL
    SELECT 'ESP002','Único','Pão Ciabatta',1 UNION ALL
    SELECT 'BAT001','Individual','Batata Congelada Palito',200 UNION ALL
    SELECT 'BAT001','Individual','Páprica Defumada',3 UNION ALL
    SELECT 'BAT001','Para compartilhar','Batata Congelada Palito',400 UNION ALL
    SELECT 'BAT001','Para compartilhar','Páprica Defumada',6 UNION ALL
    SELECT 'CRO001','Porção (6 un)','Massa de Croqueta Base',240 UNION ALL
    SELECT 'CRO001','Porção (6 un)','Pastrami Fatiado',60 UNION ALL
    SELECT 'CRO002','Porção (6 un)','Massa de Croqueta Base',240 UNION ALL
    SELECT 'CRO002','Porção (6 un)','Milho Verde',60 UNION ALL
    SELECT 'CRO002','Porção (6 un)','Gorgonzola',40 UNION ALL
    SELECT 'CRO003','Porção (6 un)','Massa de Croqueta Base',240 UNION ALL
    SELECT 'CRO003','Porção (6 un)','Bacon em Cubos',60 UNION ALL
    SELECT 'CRO004','Porção (6 un)','Massa de Croqueta Base',240 UNION ALL
    SELECT 'CRO004','Porção (6 un)','Molho Pesto',40 UNION ALL
    SELECT 'POR001','Único','Batata Congelada Palito',250 UNION ALL
    SELECT 'POR001','Único','Molho Barbecue',30 UNION ALL
    SELECT 'POR002','Único','Mortadela Fatiada',100 UNION ALL
    SELECT 'POR002','Único','Presunto Alemão',100 UNION ALL
    SELECT 'POR002','Único','Queijo Cheddar Fatia',100 UNION ALL
    SELECT 'POR002','Único','Gorgonzola',80 UNION ALL
    SELECT 'POR003','Único','Batata Congelada Palito',300 UNION ALL
    SELECT 'POR003','Único','Bacon em Cubos',60 UNION ALL
    SELECT 'POR003','Único','Queijo Cheddar Fatia',60 UNION ALL
    SELECT 'SAND001','Único','Pastrami Fatiado',120 UNION ALL
    SELECT 'SAND001','Único','Pão Ciabatta',1 UNION ALL
    SELECT 'SAND001','Único','Mostarda Alemã',10 UNION ALL
    SELECT 'SAND002','Único','Mortadela Fatiada',100 UNION ALL
    SELECT 'SAND002','Único','Stracciatella',50 UNION ALL
    SELECT 'SAND002','Único','Molho Pesto',20 UNION ALL
    SELECT 'SAND002','Único','Pão Ciabatta',1 UNION ALL
    SELECT 'SAND003','Único','Presunto Alemão',100 UNION ALL
    SELECT 'SAND003','Único','Mostarda Alemã',15 UNION ALL
    SELECT 'SAND003','Único','Chucrute',60 UNION ALL
    SELECT 'SAND003','Único','Pão Alemão (Pretzel)',1 UNION ALL
    SELECT 'CERV001','Único','Insumo Revenda - Cerveja Garrafa',1 UNION ALL
    SELECT 'CERV002','Único','Insumo Revenda - Cerveja Garrafa',1 UNION ALL
    SELECT 'CERV003','Único','Insumo Revenda - Cerveja Garrafa',1 UNION ALL
    SELECT 'CHOPP01','300ml','Insumo Revenda - Chopp Litro',300 UNION ALL
    SELECT 'CHOPP01','500ml','Insumo Revenda - Chopp Litro',500 UNION ALL
    SELECT 'CHOPP02','300ml','Insumo Revenda - Chopp Litro',300 UNION ALL
    SELECT 'CHOPP02','500ml','Insumo Revenda - Chopp Litro',500 UNION ALL
    SELECT 'CHOPP03','300ml','Insumo Revenda - Chopp Litro',300 UNION ALL
    SELECT 'CHOPP03','500ml','Insumo Revenda - Chopp Litro',500 UNION ALL
    SELECT 'CHOPP04','300ml','Insumo Revenda - Chopp Litro',300 UNION ALL
    SELECT 'CHOPP04','500ml','Insumo Revenda - Chopp Litro',500 UNION ALL
    SELECT 'BEB001','Único','Insumo Revenda - Refrigerante Lata',1 UNION ALL
    SELECT 'BEB002','Único','Insumo Revenda - Água',1 UNION ALL
    SELECT 'BEB003','Único','Insumo Revenda - Água',1 UNION ALL
    SELECT 'BEB004','Único','Insumo Revenda - Água Tônica',1 UNION ALL
    SELECT 'BEB005','Único','Insumo Revenda - Chá Gelado',1 UNION ALL
    SELECT 'SOB001','Único','Insumo Revenda - Sorvete Pote',1
) AS dados
JOIN produto_variacoes pv ON pv.produto_sku = dados.sku AND pv.nome_variacao = dados.var
JOIN ingredientes i ON i.nome = dados.ing;

-- ============================================================
-- 8. ADICIONAIS
-- ============================================================
INSERT INTO adicionais (nome, categoria, ingrediente_id, preco_adicional)
SELECT 'Cheddar','queijo', id, 4.00 FROM ingredientes WHERE nome='Queijo Cheddar Fatia'
UNION ALL SELECT 'Mussarela','queijo', id, 4.50 FROM ingredientes WHERE nome='Mussarela Empanada (un)'
UNION ALL SELECT 'Bacon extra','proteina', id, 6.00 FROM ingredientes WHERE nome='Bacon em Cubos'
UNION ALL SELECT 'Pastrami','proteina', id, 8.00 FROM ingredientes WHERE nome='Pastrami Fatiado'
UNION ALL SELECT 'Cebola caramelizada','complemento', id, 3.00 FROM ingredientes WHERE nome='Cebola Caramelizada'
UNION ALL SELECT 'Molho da casa extra','molho', id, 2.00 FROM ingredientes WHERE nome='Molho Especial da Casa'
UNION ALL SELECT 'Maionese picante','molho', id, 2.00 FROM ingredientes WHERE nome='Maionese Picante';

INSERT INTO produto_adicionais_disponiveis (produto_sku, adicional_id)
SELECT 'MSB001', id FROM adicionais
UNION ALL
SELECT 'SAND001', id FROM adicionais WHERE nome = 'Cheddar';

-- ============================================================
-- 9. CERVEJAS E CHOPP — detalhes
-- ============================================================
INSERT INTO cervejas_detalhes (produto_sku, cervejaria, estilo, abv, ibu, volume_ml) VALUES
('CERV001','Cervejaria Serra Dourada','IPA',6.2,55,500),
('CERV002','Cervejaria Vale Verde','Pilsen',4.8,18,355),
('CERV003','Cervejaria Bosque Alto','Weissbier',5.4,12,500);

INSERT INTO torneiras_chopp (numero_torneira, produto_sku, cervejaria, estilo) VALUES
(1,'CHOPP01','Cervejaria Vale Verde','Pilsen'),
(2,'CHOPP02','Cervejaria Serra Dourada','IPA'),
(3,'CHOPP03','Cervejaria Bosque Alto','Weissbier'),
(4,'CHOPP04','Cervejaria Regional','Red Ale');

-- ============================================================
-- 10. CLIENTES FICTÍCIOS (apenas para demonstração/estudo)
-- ============================================================
INSERT INTO clientes (cpf, nome, telefone, email) VALUES
('11122233344','Ana Beatriz Souza','11988887777','ana.souza@teste.com'),
('22233344455','Bruno Carvalho','11977776666','bruno.carvalho@teste.com'),
('33344455566','Camila Ferreira','11966665555','camila.ferreira@teste.com'),
('44455566677','Diego Martins','11955554444','diego.martins@teste.com'),
('55566677788','Elisa Nogueira','11944443333','elisa.nogueira@teste.com'),
('66677788899','Felipe Ramos','11933332222','felipe.ramos@teste.com'),
('77788899900','Gabriela Lima','11922221111','gabriela.lima@teste.com'),
('88899900011','Henrique Alves','11911110000','henrique.alves@teste.com'),
('99900011122','Isabela Rocha','11900009999','isabela.rocha@teste.com'),
('10011122233','João Pedro Dias','11999998888','joao.dias@teste.com'),
('12312312312','Karina Mendes','11988887766','karina.mendes@teste.com'),
('32132132132','Lucas Teixeira','11977776655','lucas.teixeira@teste.com'),
('45645645645','Mariana Costa','11966665544','mariana.costa@teste.com'),
('65465465465','Nathan Oliveira','11955554433','nathan.oliveira@teste.com'),
('78978978978','Olivia Barros','11944443322','olivia.barros@teste.com');

-- ============================================================
-- 11. ESTOQUE INICIAL (todas as lojas, todos os ingredientes)
-- ============================================================
INSERT INTO estoque_lojas (loja_id, ingrediente_id, quantidade_disponivel, quantidade_minima)
SELECT l.id, i.id, 20000, 2000 FROM lojas l CROSS JOIN ingredientes i;

-- ============================================================
-- 12. GERAÇÃO DE ~90 DIAS DE PEDIDOS — COM SAZONALIDADE
-- Padrões simulados:
--   - Sexta e sábado vendem ~2x mais que dias de semana
--   - Domingo é mais forte que dias úteis, mas menor que sex/sáb
--   - Pico de pedidos no almoço (12h-14h) e no jantar (19h-22h)
--   - Loja Centro concentra mais presencial à noite, delivery no almoço
--   - Cervejas/chopp vendem mais à noite e nos fins de semana
-- ============================================================
DELIMITER $$

CREATE PROCEDURE gerar_pedidos_teste(IN dias INT, IN pedidos_base_por_dia INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE d INT DEFAULT 0;
    DECLARE v_loja_id INT;
    DECLARE v_tipo_operacao VARCHAR(30);
    DECLARE v_tipo_atendimento VARCHAR(20);
    DECLARE v_cpf CHAR(11);
    DECLARE v_data DATETIME;
    DECLARE v_dia_semana INT;              -- 1=domingo ... 7=sábado (DAYOFWEEK)
    DECLARE v_fator_dia DECIMAL(4,2);
    DECLARE v_pedidos_hoje INT;
    DECLARE v_hora INT;
    DECLARE v_noite BOOLEAN;
    DECLARE v_pedido_id INT;
    DECLARE v_qtd_itens INT;
    DECLARE j INT;
    DECLARE v_variacao_id INT;
    DECLARE v_produto_sku VARCHAR(10);
    DECLARE v_preco DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);
    DECLARE v_categoria_bebida_alcoolica BOOLEAN;

    WHILE d < dias DO
        SET v_dia_semana = DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL d DAY));

        -- fator de sazonalidade por dia da semana
        SET v_fator_dia = CASE v_dia_semana
            WHEN 6 THEN 2.0   -- sexta
            WHEN 7 THEN 2.2   -- sábado
            WHEN 1 THEN 1.5   -- domingo
            ELSE 1.0          -- seg-qui
        END;

        SET v_pedidos_hoje = ROUND(pedidos_base_por_dia * v_fator_dia * (0.85 + RAND()*0.3));

        SET i = 0;
        WHILE i < v_pedidos_hoje DO
            SELECT id, tipo_operacao INTO v_loja_id, v_tipo_operacao
            FROM lojas ORDER BY RAND() LIMIT 1;

            -- horário: pico de almoço (12-14h) e jantar (19-22h), com cauda no resto do dia
            SET v_hora = CASE
                WHEN RAND() < 0.35 THEN 12 + FLOOR(RAND()*3)   -- almoço
                WHEN RAND() < 0.75 THEN 19 + FLOOR(RAND()*4)   -- jantar/noite
                ELSE 10 + FLOOR(RAND()*12)                     -- resto do dia
            END;
            SET v_noite = v_hora >= 18;

            -- loja Centro: mais presencial à noite (bar/happy hour), mais delivery no almoço
            SET v_tipo_atendimento = IF(v_tipo_operacao = 'delivery_only', 'delivery',
                                        IF(v_noite, IF(RAND() < 0.70, 'presencial','delivery'),
                                                    IF(RAND() < 0.30, 'presencial','delivery')));

            SELECT cpf INTO v_cpf FROM clientes ORDER BY RAND() LIMIT 1;

            SET v_data = DATE_SUB(CURDATE(), INTERVAL d DAY) + INTERVAL v_hora HOUR + INTERVAL FLOOR(RAND()*60) MINUTE;
            SET v_status = IF(RAND() < 0.04, 'cancelado', 'entregue');
            SET v_total = 0;

            INSERT INTO pedidos (loja_id, cliente_cpf, tipo_atendimento, status, forma_pagamento, valor_total, criado_em)
            VALUES (v_loja_id, v_cpf, v_tipo_atendimento, v_status,
                    ELT(FLOOR(1 + RAND()*4), 'pix','credito','debito','dinheiro'),
                    0, v_data);
            SET v_pedido_id = LAST_INSERT_ID();

            SET v_qtd_itens = 1 + FLOOR(RAND()*3);
            SET j = 0;
            WHILE j < v_qtd_itens DO
                -- à noite e fim de semana, aumenta a chance de puxar cerveja/chopp
                SET v_categoria_bebida_alcoolica = (v_noite OR v_dia_semana IN (1,6,7)) AND RAND() < 0.30;

                IF v_categoria_bebida_alcoolica THEN
                    SELECT pv.id, pv.produto_sku, pv.preco_venda INTO v_variacao_id, v_produto_sku, v_preco
                    FROM produto_variacoes pv
                    JOIN produtos p ON p.sku = pv.produto_sku
                    JOIN categorias c ON c.id = p.categoria_id
                    WHERE c.nome IN ('Cervejas Artesanais','Chopp')
                    ORDER BY RAND() LIMIT 1;
                ELSE
                    SELECT id, produto_sku, preco_venda INTO v_variacao_id, v_produto_sku, v_preco
                    FROM produto_variacoes ORDER BY RAND() LIMIT 1;
                END IF;

                INSERT INTO itens_pedido (pedido_id, produto_sku, variacao_id, quantidade, preco_unitario)
                VALUES (v_pedido_id, v_produto_sku, v_variacao_id, 1 + FLOOR(RAND()*2), v_preco);

                SET v_total = v_total + v_preco;
                SET j = j + 1;
            END WHILE;

            UPDATE pedidos SET valor_total = v_total WHERE id = v_pedido_id;

            SET i = i + 1;
        END WHILE;
        SET d = d + 1;
    END WHILE;
END$$

DELIMITER ;

-- Gera 90 dias de histórico com sazonalidade (~25 pedidos/dia em dia comum)
CALL gerar_pedidos_teste(90, 25);

DROP PROCEDURE gerar_pedidos_teste;
