-- ============================================================
-- SISTEMA DE GESTÃO — REDE DE LANCHONETES
-- Schema PostgreSQL (Supabase)
-- 3 unidades: 1 presencial+delivery, 2 delivery-only
-- ============================================================

-- ---------- EXTENSÕES ----------
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. LOJAS
-- ============================================================
create table lojas (
    id              uuid primary key default uuid_generate_v4(),
    nome            text not null,
    slug            text unique not null,                 -- ex: 'matriz-centro'
    tipo_operacao   text not null check (tipo_operacao in ('presencial_delivery', 'delivery_only')),
    endereco        text,
    telefone        text,
    ativo           boolean default true,
    criado_em       timestamptz default now()
);

comment on table lojas is 'Unidades da rede. 1 unidade presencial+delivery, 2 delivery-only.';

-- ============================================================
-- 2. CLIENTES (CPF como identificador único)
-- ============================================================
create table clientes (
    cpf             char(11) primary key,                 -- somente dígitos, validado na aplicação
    nome            text not null,
    telefone        text not null,
    email           text,
    endereco        text,                                  -- relevante p/ lojas delivery-only
    data_cadastro   timestamptz default now(),
    loja_cadastro_id uuid references lojas(id)
);

-- ============================================================
-- 3. INGREDIENTES (base da ficha técnica)
-- ============================================================
create table ingredientes (
    id              uuid primary key default uuid_generate_v4(),
    nome            text not null,                          -- ex: 'Carne Smash', 'Queijo Cheddar Fatia'
    unidade_medida  text not null check (unidade_medida in ('g', 'ml', 'un')),
    custo_unitario  numeric(10,4) not null,                  -- custo por grama/ml/unidade
    categoria       text,                                    -- 'proteina','laticinio','pao','molho','embalagem'
    ativo           boolean default true
);

-- ============================================================
-- 4. PRODUTOS E VARIAÇÕES
-- ============================================================
create table produtos (
    sku             text primary key,                        -- ex: 'LAN001'
    nome            text not null,                            -- ex: 'Hambúrguer Artesanal'
    categoria       text not null,                            -- 'lanche','bebida','sobremesa','combo'
    descricao       text,
    disponivel_delivery boolean default true,
    disponivel_presencial boolean default true,
    ativo           boolean default true,
    criado_em       timestamptz default now()
);

create table produto_variacoes (
    id              uuid primary key default uuid_generate_v4(),
    produto_sku     text not null references produtos(sku) on delete cascade,
    nome_variacao   text not null,                            -- ex: '150g', '200g', 'Único'
    preco_venda     numeric(10,2) not null,
    padrao          boolean default false,                    -- variação default exibida
    unique (produto_sku, nome_variacao)
);

-- ============================================================
-- 5. FICHA TÉCNICA (peso pré-definido por variação)
-- Ex: Hambúrguer 200g -> Smash 90g + Queijo 20g + Bacon 50g
-- ============================================================
create table fichas_tecnicas (
    id              uuid primary key default uuid_generate_v4(),
    variacao_id     uuid not null references produto_variacoes(id) on delete cascade,
    ingrediente_id  uuid not null references ingredientes(id),
    peso_quantidade numeric(10,3) not null,                   -- em g/ml/un conforme unidade do ingrediente
    unique (variacao_id, ingrediente_id)
);

comment on table fichas_tecnicas is 'Composição exata e pré-pesada de cada variação de produto — garante padronização e cálculo de CMV.';

-- ============================================================
-- 6. ESTOQUE POR LOJA
-- ============================================================
create table estoque_lojas (
    loja_id         uuid not null references lojas(id),
    ingrediente_id  uuid not null references ingredientes(id),
    quantidade_disponivel numeric(12,3) not null default 0,
    quantidade_minima      numeric(12,3) not null default 0,  -- gatilho de alerta de reposição
    atualizado_em   timestamptz default now(),
    primary key (loja_id, ingrediente_id)
);

-- ============================================================
-- 7. PEDIDOS
-- ============================================================
create table pedidos (
    id              uuid primary key default uuid_generate_v4(),
    loja_id         uuid not null references lojas(id),
    cliente_cpf     char(11) not null references clientes(cpf),
    tipo_atendimento text not null check (tipo_atendimento in ('presencial', 'delivery')),
    status          text not null default 'recebido'
                        check (status in ('recebido','em_preparo','pronto','saiu_entrega','entregue','cancelado')),
    forma_pagamento text check (forma_pagamento in ('pix','credito','debito','dinheiro')),
    valor_total     numeric(10,2) not null default 0,
    observacoes     text,
    criado_em       timestamptz default now(),
    atualizado_em   timestamptz default now()
);

-- Regra: lojas delivery_only não podem gerar pedido presencial
create or replace function valida_tipo_atendimento() returns trigger as $$
declare
    v_tipo_loja text;
begin
    select tipo_operacao into v_tipo_loja from lojas where id = new.loja_id;
    if v_tipo_loja = 'delivery_only' and new.tipo_atendimento <> 'delivery' then
        raise exception 'Esta loja opera apenas com delivery.';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_valida_tipo_atendimento
    before insert or update on pedidos
    for each row execute function valida_tipo_atendimento();

-- ============================================================
-- 8. ITENS DO PEDIDO
-- ============================================================
create table itens_pedido (
    id              uuid primary key default uuid_generate_v4(),
    pedido_id       uuid not null references pedidos(id) on delete cascade,
    produto_sku     text not null references produtos(sku),
    variacao_id     uuid not null references produto_variacoes(id),
    quantidade      integer not null check (quantidade > 0),
    preco_unitario  numeric(10,2) not null                    -- snapshot do preço no momento da venda
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
create index idx_pedidos_loja on pedidos(loja_id);
create index idx_pedidos_cliente on pedidos(cliente_cpf);
create index idx_pedidos_criado_em on pedidos(criado_em);
create index idx_itens_pedido_pedido on itens_pedido(pedido_id);
create index idx_fichas_variacao on fichas_tecnicas(variacao_id);

-- ============================================================
-- VIEW: CUSTO (CMV) POR VARIAÇÃO — calculado a partir da ficha técnica
-- ============================================================
create view vw_custo_variacao as
select
    pv.id as variacao_id,
    pv.produto_sku,
    pv.nome_variacao,
    pv.preco_venda,
    sum(ft.peso_quantidade * ing.custo_unitario) as custo_ficha_tecnica,
    round((sum(ft.peso_quantidade * ing.custo_unitario) / nullif(pv.preco_venda,0)) * 100, 2) as cmv_percentual
from produto_variacoes pv
join fichas_tecnicas ft on ft.variacao_id = pv.id
join ingredientes ing on ing.id = ft.ingrediente_id
group by pv.id, pv.produto_sku, pv.nome_variacao, pv.preco_venda;

-- ============================================================
-- VIEW: DASHBOARD — VENDAS POR LOJA
-- ============================================================
create view vw_vendas_por_loja as
select
    l.id as loja_id,
    l.nome as loja_nome,
    l.tipo_operacao,
    count(distinct p.id) as total_pedidos,
    sum(p.valor_total) as faturamento,
    round(avg(p.valor_total), 2) as ticket_medio
from lojas l
left join pedidos p on p.loja_id = l.id and p.status <> 'cancelado'
group by l.id, l.nome, l.tipo_operacao;
