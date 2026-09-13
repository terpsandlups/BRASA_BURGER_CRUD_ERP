-- ============================================================
-- MIGRATION — FASE 2 (início): BAIXA AUTOMÁTICA DE ESTOQUE
--
-- Toda vez que um item entra num pedido, o estoque da LOJA daquele
-- pedido é reduzido automaticamente com base na ficha técnica da
-- variação vendida (e dos adicionais escolhidos, se houver).
--
-- As funções usam SECURITY DEFINER de propósito: a baixa de estoque
-- é uma ação de sistema, não uma consulta do usuário — isso evita
-- que a política de RLS de "estoque_lojas" (que hoje só libera
-- leitura) bloqueie a escrita automática.
-- ============================================================

-- Adiciona o "tamanho" de cada adicional em termos do ingrediente
-- vinculado (quantos gramas/ml/unidades um adicional representa)
ALTER TABLE adicionais ADD COLUMN IF NOT EXISTS peso_quantidade DECIMAL(10,3) DEFAULT 30;

UPDATE adicionais SET peso_quantidade = 20 WHERE nome = 'Cheddar';
UPDATE adicionais SET peso_quantidade = 1  WHERE nome = 'Mussarela';
UPDATE adicionais SET peso_quantidade = 40 WHERE nome = 'Bacon extra';
UPDATE adicionais SET peso_quantidade = 50 WHERE nome = 'Pastrami';
UPDATE adicionais SET peso_quantidade = 25 WHERE nome = 'Cebola caramelizada';
UPDATE adicionais SET peso_quantidade = 20 WHERE nome = 'Picles';
UPDATE adicionais SET peso_quantidade = 15 WHERE nome = 'Molho da casa extra';
UPDATE adicionais SET peso_quantidade = 15 WHERE nome = 'Maionese picante';

-- ============================================================
-- Baixa por item de pedido (ficha técnica da variação vendida)
-- ============================================================
CREATE OR REPLACE FUNCTION baixar_estoque_item_pedido()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_loja_id uuid;
BEGIN
    SELECT loja_id INTO v_loja_id FROM pedidos WHERE id = NEW.pedido_id;

    UPDATE estoque_lojas es
    SET quantidade_disponivel = es.quantidade_disponivel - (ft.peso_quantidade * NEW.quantidade),
        atualizado_em = now()
    FROM fichas_tecnicas ft
    WHERE ft.variacao_id = NEW.variacao_id
      AND es.loja_id = v_loja_id
      AND es.ingrediente_id = ft.ingrediente_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_baixar_estoque_item_pedido ON itens_pedido;
CREATE TRIGGER trg_baixar_estoque_item_pedido
    AFTER INSERT ON itens_pedido
    FOR EACH ROW EXECUTE FUNCTION baixar_estoque_item_pedido();

-- ============================================================
-- Baixa por adicional escolhido no pedido
-- ============================================================
CREATE OR REPLACE FUNCTION baixar_estoque_adicional()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_loja_id uuid;
    v_ingrediente_id uuid;
    v_peso_unitario numeric;
BEGIN
    SELECT p.loja_id INTO v_loja_id
    FROM itens_pedido ip JOIN pedidos p ON p.id = ip.pedido_id
    WHERE ip.id = NEW.item_pedido_id;

    SELECT ingrediente_id, peso_quantidade INTO v_ingrediente_id, v_peso_unitario
    FROM adicionais WHERE id = NEW.adicional_id;

    IF v_ingrediente_id IS NOT NULL THEN
        UPDATE estoque_lojas
        SET quantidade_disponivel = quantidade_disponivel - (v_peso_unitario * NEW.quantidade),
            atualizado_em = now()
        WHERE loja_id = v_loja_id AND ingrediente_id = v_ingrediente_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_baixar_estoque_adicional ON itens_pedido_adicionais;
CREATE TRIGGER trg_baixar_estoque_adicional
    AFTER INSERT ON itens_pedido_adicionais
    FOR EACH ROW EXECUTE FUNCTION baixar_estoque_adicional();

-- ============================================================
-- Permite reposição manual de estoque pela tela (além da leitura
-- que já existia)
-- ============================================================
CREATE POLICY "estoque_update_por_unidade" ON estoque_lojas
    FOR UPDATE TO authenticated
    USING (minha_loja() IS NULL OR loja_id = minha_loja())
    WITH CHECK (minha_loja() IS NULL OR loja_id = minha_loja());
