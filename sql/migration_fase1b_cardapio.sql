-- ============================================================
-- MIGRATION — FASE 1b: EXPANSÃO DO CARDÁPIO
-- Fornecedores, adicionais configuráveis, atributos dietéticos,
-- cervejas artesanais e chopp
-- Rodar DEPOIS de schema.sql e migration_fase1.sql
-- ============================================================

-- ============================================================
-- 1. FORNECEDORES
-- ============================================================
create table fornecedores (
    id          uuid primary key default uuid_generate_v4(),
    nome        text not null,
    cnpj        text,
    telefone    text,
    email       text,
    categoria_fornecimento text,      -- 'proteinas','laticinios','bebidas','cervejaria', etc.
    ativo       boolean default true
);

alter table ingredientes add column fornecedor_id uuid references fornecedores(id);

-- ============================================================
-- 2. PRODUTOS — subcategoria e atributos dietéticos/operacionais
-- ============================================================
alter table produtos add column subcategoria text;              -- ex: 'Smash', 'Artesanal', 'Monte Seu Burger'
alter table produtos add column permite_adicionais boolean default false;
alter table produtos add column vegano boolean default false;
alter table produtos add column vegetariano boolean default false;
alter table produtos add column contem_lactose boolean default true;
alter table produtos add column contem_gluten boolean default true;

-- ============================================================
-- 3. ADICIONAIS (configuráveis por pedido — ex: Monte Seu Burger)
-- ============================================================
create table adicionais (
    id              uuid primary key default uuid_generate_v4(),
    nome            text not null,                     -- ex: 'Bacon extra', 'Cheddar', 'Molho da casa'
    categoria       text not null check (categoria in ('queijo','proteina','complemento','molho')),
    ingrediente_id  uuid references ingredientes(id),   -- vincula ao insumo real p/ baixa de estoque
    preco_adicional numeric(10,2) not null,
    ativo           boolean default true
);

-- Quais produtos aceitam quais adicionais (ex: Monte Seu Burger aceita todos; Pastrami só queijo)
create table produto_adicionais_disponiveis (
    produto_sku text not null references produtos(sku) on delete cascade,
    adicional_id uuid not null references adicionais(id) on delete cascade,
    primary key (produto_sku, adicional_id)
);

-- Adicionais escolhidos em cada item de pedido
create table itens_pedido_adicionais (
    id              uuid primary key default uuid_generate_v4(),
    item_pedido_id  uuid not null references itens_pedido(id) on delete cascade,
    adicional_id    uuid not null references adicionais(id),
    quantidade      integer not null default 1 check (quantidade > 0),
    preco_unitario  numeric(10,2) not null              -- snapshot no momento da venda
);

-- ============================================================
-- 4. CERVEJAS ARTESANAIS (produtos de revenda — atributos próprios)
-- ============================================================
create table cervejas_detalhes (
    produto_sku text primary key references produtos(sku) on delete cascade,
    cervejaria  text not null,
    estilo      text not null,                          -- IPA, Pilsen, Weiss, Stout...
    abv         numeric(4,2),
    ibu         integer,
    volume_ml   integer not null,
    lote        text,
    validade    date
);

-- ============================================================
-- 5. CHOPP — torneiras físicas
-- ============================================================
create table torneiras_chopp (
    id                      uuid primary key default uuid_generate_v4(),
    numero_torneira         integer not null unique,
    produto_sku             text not null references produtos(sku),
    cervejaria              text not null,
    estilo                  text not null,
    volume_barril_litros    numeric(6,2) not null default 50,
    volume_vendido_litros   numeric(8,3) not null default 0,
    ativo                   boolean default true
);

comment on table torneiras_chopp is 'Controle físico de barril por torneira — giro e perdas calculados a partir do volume vendido vs. capacidade do barril.';

-- ============================================================
-- 6. VIEW — ENGENHARIA DE CARDÁPIO (Estrelas / Cavalos / Quebra-cabeças / Abacaxis)
-- Classifica por volume de vendas x margem, comparado à mediana do cardápio.
-- Fica mais precisa conforme o histórico de pedidos cresce.
-- ============================================================
create view vw_engenharia_cardapio as
with vendas as (
    select
        ip.produto_sku,
        p.nome as produto_nome,
        sum(ip.quantidade) as volume_vendido,
        sum(ip.quantidade * (ip.preco_unitario - coalesce(c.custo_ficha_tecnica, 0))) as margem_total,
        round(avg(ip.preco_unitario - coalesce(c.custo_ficha_tecnica, 0)), 2) as margem_media_unitaria
    from itens_pedido ip
    join produtos p on p.sku = ip.produto_sku
    left join vw_custo_variacao c on c.variacao_id = ip.variacao_id
    group by ip.produto_sku, p.nome
),
medianas as (
    select
        percentile_cont(0.5) within group (order by volume_vendido) as mediana_volume,
        percentile_cont(0.5) within group (order by margem_media_unitaria) as mediana_margem
    from vendas
)
select
    v.produto_sku,
    v.produto_nome,
    v.volume_vendido,
    v.margem_media_unitaria,
    case
        when v.volume_vendido >= m.mediana_volume and v.margem_media_unitaria >= m.mediana_margem then 'Estrela'
        when v.volume_vendido >= m.mediana_volume and v.margem_media_unitaria < m.mediana_margem then 'Cavalo de Batalha'
        when v.volume_vendido < m.mediana_volume and v.margem_media_unitaria >= m.mediana_margem then 'Quebra-Cabeça'
        else 'Abacaxi'
    end as classificacao
from vendas v, medianas m;

comment on view vw_engenharia_cardapio is 'Requer histórico de pedidos para ser significativa — com poucas vendas a classificação é apenas ilustrativa.';
