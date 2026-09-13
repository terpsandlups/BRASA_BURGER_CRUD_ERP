# Point do Lanche — Banco MySQL para Análise

Versão standalone do banco, em MySQL puro, pensada pra você rodar local
(MySQL Workbench, DBeaver, linha de comando) e brincar com queries de
análise — sem depender do Supabase.

Já vem com **~90 dias de pedidos simulados** (aleatórios, mas realistas),
então dá pra analisar direto sem precisar povoar nada na mão.

## Como rodar

**Opção 1 — MySQL Workbench**
1. Abra o Workbench, conecte no seu servidor MySQL local
2. Abra `schema_mysql.sql`, execute tudo (raio ⚡ ou `Ctrl+Shift+Enter`)
3. Abra `seed_mysql.sql`, execute tudo — isso pode levar uns 10-30 segundos
   por causa da geração dos pedidos (2250 pedidos simulados)

**Opção 2 — Linha de comando**
```bash
mysql -u root -p < schema_mysql.sql
mysql -u root -p < seed_mysql.sql
```

## Conferindo se deu certo

```sql
USE point_do_lanche;
SELECT COUNT(*) FROM pedidos;        -- deve dar por volta de 2000+
SELECT COUNT(*) FROM itens_pedido;   -- deve dar uns 4000+
```

## Queries de exemplo pra começar a analisar

**Faturamento por loja**
```sql
SELECT * FROM vw_vendas_por_loja;
```

**Produto mais vendido (ranking completo)**
```sql
SELECT * FROM vw_ranking_produtos LIMIT 10;
```

**CMV por produto (quais têm margem apertada)**
```sql
SELECT produto_sku, nome_variacao, preco_venda, custo_ficha_tecnica, cmv_percentual
FROM vw_custo_variacao
ORDER BY cmv_percentual DESC;
```

**Faturamento por dia da semana**
```sql
SELECT
    DAYNAME(criado_em) AS dia_semana,
    COUNT(*) AS pedidos,
    SUM(valor_total) AS faturamento
FROM pedidos
WHERE status <> 'cancelado'
GROUP BY DAYNAME(criado_em), DAYOFWEEK(criado_em)
ORDER BY DAYOFWEEK(criado_em);
```

**Faturamento por categoria**
```sql
SELECT
    c.nome AS categoria,
    SUM(ip.quantidade * ip.preco_unitario) AS receita
FROM itens_pedido ip
JOIN produtos p ON p.sku = ip.produto_sku
JOIN categorias c ON c.id = p.categoria_id
JOIN pedidos ped ON ped.id = ip.pedido_id AND ped.status <> 'cancelado'
GROUP BY c.nome
ORDER BY receita DESC;
```

**Clientes mais frequentes (candidatos a "VIP")**
```sql
SELECT
    cl.nome,
    COUNT(p.id) AS total_pedidos,
    SUM(p.valor_total) AS valor_gasto,
    ROUND(AVG(p.valor_total), 2) AS ticket_medio
FROM clientes cl
JOIN pedidos p ON p.cliente_cpf = cl.cpf AND p.status <> 'cancelado'
GROUP BY cl.cpf, cl.nome
ORDER BY total_pedidos DESC
LIMIT 10;
```

**Presencial x Delivery — só faz sentido na loja Centro**
```sql
SELECT
    l.nome,
    p.tipo_atendimento,
    COUNT(*) AS pedidos,
    SUM(p.valor_total) AS faturamento
FROM pedidos p
JOIN lojas l ON l.id = p.loja_id
WHERE p.status <> 'cancelado'
GROUP BY l.nome, p.tipo_atendimento;
```

**Ticket médio por forma de pagamento**
```sql
SELECT forma_pagamento, COUNT(*) AS pedidos, ROUND(AVG(valor_total),2) AS ticket_medio
FROM pedidos
WHERE status <> 'cancelado'
GROUP BY forma_pagamento;
```

## Sobre os dados

Os pedidos agora seguem **sazonalidade proposital**, não são mais 100%
aleatórios:

- **Sexta e sábado** vendem ~2x mais que dias de semana; domingo fica no meio
- **Pico de almoço** (12h-14h) e **pico de jantar** (19h-22h), com cauda
  mais fraca no resto do dia
- **Loja Centro** puxa mais delivery no almoço e mais presencial à noite
  (efeito "happy hour")
- **Cervejas e chopp** têm mais chance de aparecer no pedido à noite e nos
  fins de semana

Ainda assim é dado sintético — bom pra treinar SQL analítico e detectar
padrões, mas não é uma "verdade de negócio" real.

**Queries pra visualizar a sazonalidade:**

```sql
-- Faturamento por dia da semana (deve mostrar sex/sáb mais altos)
SELECT
    DAYNAME(criado_em) AS dia_semana,
    COUNT(*) AS pedidos,
    SUM(valor_total) AS faturamento
FROM pedidos
WHERE status <> 'cancelado'
GROUP BY DAYNAME(criado_em), DAYOFWEEK(criado_em)
ORDER BY DAYOFWEEK(criado_em);
```

```sql
-- Pedidos por hora do dia (deve mostrar picos em 12-14h e 19-22h)
SELECT HOUR(criado_em) AS hora, COUNT(*) AS pedidos
FROM pedidos
WHERE status <> 'cancelado'
GROUP BY HOUR(criado_em)
ORDER BY hora;
```

```sql
-- Cerveja/chopp: noite e fim de semana vendem mais?
SELECT
    CASE WHEN HOUR(ped.criado_em) >= 18 THEN 'Noite' ELSE 'Dia' END AS periodo,
    CASE WHEN DAYOFWEEK(ped.criado_em) IN (1,6,7) THEN 'Fim de semana' ELSE 'Dia útil' END AS tipo_dia,
    COUNT(*) AS itens_vendidos
FROM itens_pedido ip
JOIN pedidos ped ON ped.id = ip.pedido_id
JOIN produtos p ON p.sku = ip.produto_sku
JOIN categorias c ON c.id = p.categoria_id
WHERE c.nome IN ('Cervejas Artesanais','Chopp') AND ped.status <> 'cancelado'
GROUP BY periodo, tipo_dia;
```

## Se quiser mais volume
  ```sql
  CALL gerar_pedidos_teste(30, 40); -- mais 30 dias, 40 pedidos/dia
  ```
  (a procedure é removida no final do seed original — recrie-a a partir do
  bloco `DELIMITER $$ ... END$$` do arquivo `seed_mysql.sql` se quiser
  chamá-la de novo)
