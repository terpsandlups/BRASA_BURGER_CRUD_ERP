-- CONVIVIUM: instalacao integral em projeto Supabase NOVO.
-- Nao reaplicar em banco operacional. Auth/roles pertencem ao Supabase.

DO $$ BEGIN IF to_regclass('public.lojas') IS NOT NULL OR to_regclass('public.empresas') IS NOT NULL THEN RAISE EXCEPTION 'Instalacao permitida somente em projeto novo, sem tabelas do ERP.'; END IF; END $$;

-- FONTE: sql/instalacao/base.sql
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
-- ============================================================
-- 9. HISTÓRICO DE MOVIMENTAÇÃO DE ESTOQUE (Auditoria)
-- ============================================================
create table historico_estoque (
    id              uuid primary key default uuid_generate_v4(),
    loja_id         uuid not null references lojas(id),
    ingrediente_id  uuid not null references ingredientes(id),
    quantidade      numeric(12,3) not null,                  -- positivo para entrada, negativo para saída
    tipo_movimento  text not null check (tipo_movimento in ('entrada_fornecedor', 'venda_pedido', 'perda_avaria', 'ajuste_inventario')),
    criado_em       timestamptz default now()
);

create index idx_historico_estoque_loja on historico_estoque(loja_id);
create index idx_historico_estoque_ingrediente on historico_estoque(ingrediente_id);

comment on table historico_estoque is 'Registra toda entrada e saída de insumos por unidade para fins de auditoria e cálculo de quebras.';



-- FONTE: sql/migration_fase1.sql
-- ============================================================
-- MIGRATION — FASE 1 (conclusão): Core ERP
-- Categorias, Usuários, Perfis, Permissões (RBAC) e RLS por loja
-- Rodar DEPOIS de schema.sql
-- ============================================================

-- ============================================================
-- 1. CATEGORIAS (antes era texto solto em produtos.categoria)
-- ============================================================
create table categorias (
    id          uuid primary key default uuid_generate_v4(),
    nome        text not null unique,             -- ex: 'Lanches', 'Bebidas', 'Sobremesas', 'Combos'
    descricao   text,
    ordem       integer default 0,
    ativo       boolean default true
);

insert into categorias (nome, ordem) values
    ('Lanches', 1), ('Bebidas', 2), ('Sobremesas', 3), ('Combos', 4);

alter table produtos add column categoria_id uuid references categorias(id);

-- migra o texto existente para a FK (assume produtos já com categoria = 'lanche' etc.)
update produtos set categoria_id = (select id from categorias where nome = 'Lanches')
    where categoria_id is null;

alter table produtos alter column categoria_id set not null;
alter table produtos drop column categoria;

-- ============================================================
-- 2. PERFIS (RBAC)
-- ============================================================
create table perfis (
    id          uuid primary key default uuid_generate_v4(),
    nome        text not null unique,              -- Administrador, Gerente, Estoque, Compras, Financeiro, Operador, Visualização
    descricao   text
);

insert into perfis (nome, descricao) values
    ('Administrador', 'Acesso total ao sistema'),
    ('Gerente',        'Acesso aos módulos operacionais e indicadores'),
    ('Estoque',        'Estoque, inventário, transferências e recebimento'),
    ('Compras',        'Compras e fornecedores'),
    ('Financeiro',     'Financeiro e relatórios financeiros'),
    ('Operador',       'PDV e pedidos'),
    ('Visualização',   'Somente dashboards e relatórios');

-- ============================================================
-- 3. PERMISSÕES POR MÓDULO
-- ============================================================
create table permissoes (
    id              uuid primary key default uuid_generate_v4(),
    perfil_id       uuid not null references perfis(id) on delete cascade,
    modulo          text not null,                  -- 'vendas','clientes','produtos','estoque','financeiro', etc.
    pode_visualizar boolean default false,
    pode_criar      boolean default false,
    pode_editar     boolean default false,
    pode_excluir    boolean default false,
    unique (perfil_id, modulo)
);

-- Administrador: acesso total em todos os módulos já implementados
insert into permissoes (perfil_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
select id, modulo, true, true, true, true
from perfis, unnest(array['vendas','clientes','produtos','estoque','financeiro','usuarios']) as modulo
where nome = 'Administrador';

-- Operador: só vendas/clientes, sem exclusão
insert into permissoes (perfil_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
select id, modulo, true, true, false, false
from perfis, unnest(array['vendas','clientes']) as modulo
where nome = 'Operador';

-- Visualização: somente leitura em tudo
insert into permissoes (perfil_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
select id, modulo, true, false, false, false
from perfis, unnest(array['vendas','clientes','produtos','estoque','financeiro']) as modulo
where nome = 'Visualização';

-- ============================================================
-- 4. USUÁRIOS (vinculados ao Supabase Auth)
-- ============================================================
create table usuarios (
    id          uuid primary key references auth.users(id) on delete cascade,
    nome        text not null,
    email       text not null,
    perfil_id   uuid not null references perfis(id),
    loja_id     uuid references lojas(id),          -- null = acesso a todas as unidades
    ativo       boolean default true,
    criado_em   timestamptz default now()
);

comment on column usuarios.loja_id is 'Null = usuário com acesso a todas as unidades (ex: Administrador, Gerente geral).';

-- Cria o registro em "usuarios" automaticamente quando alguém se cadastra no Supabase Auth
create or replace function handle_novo_usuario() returns trigger as $$
begin
    insert into public.usuarios (id, nome, email, perfil_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nome', new.email),
        new.email,
        (select id from perfis where nome = 'Visualização')   -- perfil padrão mais restritivo
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger trg_novo_usuario
    after insert on auth.users
    for each row execute function handle_novo_usuario();

-- ============================================================
-- 5. FUNÇÃO AUXILIAR — perfil e loja do usuário logado
-- ============================================================
create or replace function meu_perfil() returns text as $$
    select p.nome from usuarios u join perfis p on p.id = u.perfil_id where u.id = auth.uid();
$$ language sql stable security definer;

create or replace function minha_loja() returns uuid as $$
    select loja_id from usuarios where id = auth.uid();
$$ language sql stable security definer;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- Padrão: Administrador/Gerente veem tudo; demais perfis são
-- restritos à própria unidade (loja_id null = todas as unidades).
-- ============================================================
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;
alter table estoque_lojas enable row level security;
alter table usuarios enable row level security;

create policy "pedidos_por_unidade" on pedidos
    for select using (
        minha_loja() is null or loja_id = minha_loja()
    );

create policy "pedidos_insert_por_unidade" on pedidos
    for insert with check (
        minha_loja() is null or loja_id = minha_loja()
    );

create policy "estoque_por_unidade" on estoque_lojas
    for select using (
        minha_loja() is null or loja_id = minha_loja()
    );

create policy "usuarios_ve_proprio_registro" on usuarios
    for select using (
        id = auth.uid() or meu_perfil() in ('Administrador','Gerente')
    );

comment on policy "pedidos_por_unidade" on pedidos is
    'Usuário de uma unidade específica só vê pedidos da própria unidade. loja_id null = todas.';



-- FONTE: sql/migration_fase1b_cardapio.sql
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



-- FONTE: sql/migration_fase1d_endereco_cliente.sql
-- ============================================================
-- MIGRATION — Endereço estruturado no cadastro de clientes
-- (padrão CEP-first, como apps de delivery)
-- ============================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero VARCHAR(10);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado CHAR(2);

-- A coluna "endereco" que já existia passa a guardar só o logradouro
-- (rua/avenida), preenchido automaticamente a partir do CEP.
COMMENT ON COLUMN clientes.endereco IS 'Logradouro (rua/avenida) — preenchido via busca de CEP.';



-- FONTE: sql/migration_fase2_estoque.sql
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



-- FONTE: sql/migration_cadastro_insumos.sql
-- Pré-requisitos: schema.sql e migration_fase1.sql.
-- Aplicar no SQL Editor do Supabase após revisar as políticas já existentes.
-- Não recria tabelas nem altera saldos. Políticas existentes continuam valendo.
BEGIN;

GRANT SELECT, INSERT ON public.ingredientes TO authenticated;
GRANT SELECT, INSERT ON public.estoque_lojas TO authenticated;

-- Se ingredientes já usa RLS, permite cadastro por perfis operacionais.
-- Esta migração não muda a configuração RLS pré-existente dessa tabela.
DROP POLICY IF EXISTS insumos_cadastro_operacional ON public.ingredientes;
CREATE POLICY insumos_cadastro_operacional ON public.ingredientes
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo
      AND p.nome IN ('Administrador', 'Gerente', 'Estoque'))
);

DROP POLICY IF EXISTS estoque_cadastro_por_unidade ON public.estoque_lojas;
CREATE POLICY estoque_cadastro_por_unidade ON public.estoque_lojas
FOR INSERT TO authenticated WITH CHECK (
  quantidade_disponivel >= 0 AND quantidade_minima >= 0
  AND EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo
      AND p.nome IN ('Administrador', 'Gerente', 'Estoque')
      AND (u.loja_id IS NULL OR u.loja_id = estoque_lojas.loja_id))
);
COMMIT;



-- FONTE: sql/migration_fase4_5_fundacao_analitica.sql
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



-- FONTE: sql/migration_pedido_transacional.sql
-- Pré-requisitos: schema, fase1, fase1b, fase2_estoque e fase4_5_fundacao_analitica.
-- Instalar ANTES de ativar VITE_PEDIDO_TRANSACIONAL=true no frontend.
-- Nenhum pedido existente é regravado. A função executa tudo numa transação.
BEGIN;

CREATE TABLE IF NOT EXISTS public.requisicoes_pedido (
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  requisicao_id uuid NOT NULL,
  conteudo jsonb NOT NULL,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id),
  PRIMARY KEY (usuario_id, requisicao_id)
);
ALTER TABLE public.requisicoes_pedido ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.requisicoes_pedido FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_pedido_transacional(p_requisicao uuid, p_dados jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_loja uuid := (p_dados->>'loja_id')::uuid;
  v_pedido uuid;
  v_anterior public.requisicoes_pedido%ROWTYPE;
  v_item jsonb;
  v_adicional jsonb;
  v_variacao record;
  v_extra record;
  v_item_id uuid;
  v_quantidade integer;
  v_preco numeric;
  v_total numeric := 0;
  v_markup numeric;
  v_canal text := p_dados->>'canal_venda';
  v_tipo text := p_dados->>'tipo_atendimento';
  v_pagamento text := p_dados->>'forma_pagamento';
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN
    RAISE EXCEPTION 'Sessão e identificador da requisição são obrigatórios.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = v_usuario AND u.ativo
      AND (u.loja_id IS NULL OR u.loja_id = v_loja)
      AND (p.nome IN ('Administrador', 'Gerente') OR EXISTS (
        SELECT 1 FROM permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_criar
      ))
  ) THEN RAISE EXCEPTION 'Usuário sem permissão para criar pedidos nesta unidade.'; END IF;

  -- Serializa reenvios simultâneos; a segunda chamada recupera o mesmo pedido.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text || p_requisicao::text, 0));
  SELECT * INTO v_anterior FROM requisicoes_pedido
    WHERE usuario_id = v_usuario AND requisicao_id = p_requisicao;
  IF FOUND THEN
    IF v_anterior.conteudo IS DISTINCT FROM p_dados THEN
      RAISE EXCEPTION 'Reenvio com conteúdo diferente. Recupere o pedido original.';
    END IF;
    RETURN v_anterior.pedido_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lojas WHERE id = v_loja AND ativo) THEN
    RAISE EXCEPTION 'Unidade inválida ou inativa.';
  END IF;
  IF v_tipo IS NULL OR v_tipo NOT IN ('presencial', 'delivery') OR
     v_pagamento IS NULL OR v_pagamento NOT IN ('pix', 'credito', 'debito', 'dinheiro') THEN
    RAISE EXCEPTION 'Atendimento ou pagamento inválido.';
  END IF;
  IF jsonb_typeof(p_dados->'itens') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Informe os itens do pedido.';
  END IF;
  IF jsonb_array_length(p_dados->'itens') NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'O pedido deve conter entre 1 e 100 itens.';
  END IF;
  SELECT markup_preco_percentual INTO v_markup FROM configuracoes_canal WHERE canal_venda = v_canal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canal de venda inválido.'; END IF;

  INSERT INTO pedidos(loja_id, cliente_cpf, tipo_atendimento, forma_pagamento,
    canal_venda, observacoes, troco_para, status, valor_total)
  VALUES(v_loja, p_dados->>'cliente_cpf', v_tipo, v_pagamento, v_canal,
    NULLIF(btrim(p_dados->>'observacoes'), ''),
    CASE WHEN v_pagamento = 'dinheiro' THEN (p_dados->>'troco_para')::numeric ELSE NULL END,
    'recebido', 0) RETURNING id INTO v_pedido;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_dados->'itens') LOOP
    IF COALESCE(v_item->>'quantidade', '') !~ '^[1-9][0-9]{0,3}$' THEN
      RAISE EXCEPTION 'Quantidade de item inválida.';
    END IF;
    v_quantidade := (v_item->>'quantidade')::integer;
    SELECT pv.*, p.permite_adicionais INTO v_variacao
      FROM produto_variacoes pv JOIN produtos p ON p.sku = pv.produto_sku
      WHERE pv.id = (v_item->>'variacao_id')::uuid AND p.ativo
        AND ((v_tipo = 'delivery' AND p.disponivel_delivery) OR
             (v_tipo = 'presencial' AND p.disponivel_presencial));
    IF NOT FOUND THEN RAISE EXCEPTION 'Variação indisponível para este atendimento.'; END IF;
    v_preco := round(v_variacao.preco_venda * (1 + v_markup / 100), 2);
    IF v_preco < 0 OR v_preco IS DISTINCT FROM (v_item->>'preco_unitario')::numeric THEN
      RAISE EXCEPTION 'Preço alterado. Atualize o catálogo e confira o pedido.';
    END IF;
    IF EXISTS (SELECT 1 FROM fichas_tecnicas ft WHERE ft.variacao_id = v_variacao.id
      AND NOT EXISTS (SELECT 1 FROM estoque_lojas es WHERE es.loja_id = v_loja AND es.ingrediente_id = ft.ingrediente_id)) THEN
      RAISE EXCEPTION 'Um ingrediente da ficha não está vinculado ao estoque desta unidade.';
    END IF;
    INSERT INTO itens_pedido(pedido_id, produto_sku, variacao_id, quantidade, preco_unitario)
      VALUES(v_pedido, v_variacao.produto_sku, v_variacao.id, v_quantidade, v_preco)
      RETURNING id INTO v_item_id;
    v_total := v_total + v_preco * v_quantidade;

    IF jsonb_typeof(v_item->'adicionais') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Lista de adicionais inválida.';
    END IF;
    IF jsonb_array_length(v_item->'adicionais') > 100 THEN RAISE EXCEPTION 'Limite de adicionais excedido.'; END IF;
    IF (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(v_item->'adicionais')) THEN
      RAISE EXCEPTION 'Adicional repetido no mesmo item.';
    END IF;
    FOR v_adicional IN SELECT value FROM jsonb_array_elements(v_item->'adicionais') LOOP
      SELECT a.* INTO v_extra FROM adicionais a
        JOIN produto_adicionais_disponiveis pa ON pa.adicional_id = a.id
        WHERE a.id = (v_adicional->>'id')::uuid AND pa.produto_sku = v_variacao.produto_sku AND a.ativo;
      IF NOT FOUND OR NOT v_variacao.permite_adicionais THEN RAISE EXCEPTION 'Adicional não permitido para este produto.'; END IF;
      IF v_extra.preco_adicional < 0 OR v_extra.preco_adicional IS DISTINCT FROM (v_adicional->>'preco_unitario')::numeric THEN
        RAISE EXCEPTION 'Preço do adicional alterado. Atualize o catálogo.';
      END IF;
      IF v_extra.ingrediente_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM estoque_lojas WHERE loja_id = v_loja AND ingrediente_id = v_extra.ingrediente_id
      ) THEN RAISE EXCEPTION 'Insumo do adicional não vinculado à unidade.'; END IF;
      -- Quantidade representa o total de adicionais nesta linha de venda.
      -- O trigger existente já multiplica por esta quantidade.
      INSERT INTO itens_pedido_adicionais(item_pedido_id, adicional_id, quantidade, preco_unitario)
        VALUES(v_item_id, v_extra.id, v_quantidade, v_extra.preco_adicional);
      v_total := v_total + v_extra.preco_adicional * v_quantidade;
    END LOOP;
  END LOOP;
  IF v_pagamento = 'dinheiro' AND ((p_dados->>'troco_para') IS NULL OR (p_dados->>'troco_para')::numeric < v_total) THEN
    RAISE EXCEPTION 'Valor para troco inferior ao total do pedido.';
  END IF;
  UPDATE pedidos SET valor_total = v_total WHERE id = v_pedido;
  INSERT INTO requisicoes_pedido VALUES(v_usuario, p_requisicao, p_dados, v_pedido);
  RETURN v_pedido;
END;
$$;
REVOKE ALL ON FUNCTION public.criar_pedido_transacional(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_pedido_transacional(uuid, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: sql/migration_configuracao_entrega.sql
-- Cadastro de origem e tarifa: não altera pedidos, saldos nem tipo de operação.
-- Pré-requisitos: schema.sql e migration_fase1.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.configuracoes_entrega (
  loja_id uuid PRIMARY KEY REFERENCES public.lojas(id),
  cep text NOT NULL CHECK (cep ~ '^[0-9]{8}$'),
  endereco text NOT NULL CHECK (length(btrim(endereco)) BETWEEN 1 AND 250),
  numero text NOT NULL CHECK (length(btrim(numero)) BETWEEN 1 AND 30),
  complemento text NOT NULL DEFAULT '' CHECK (length(complemento) <= 250),
  bairro text NOT NULL CHECK (length(btrim(bairro)) BETWEEN 1 AND 150),
  cidade text NOT NULL CHECK (length(btrim(cidade)) BETWEEN 1 AND 150),
  estado text NOT NULL CHECK (estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  valor_km numeric(8,2) NOT NULL CHECK (valor_km > 0 AND valor_km <= 1000)
);
ALTER TABLE public.configuracoes_entrega ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.configuracoes_entrega FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.configuracoes_entrega TO authenticated;

DROP POLICY IF EXISTS entrega_leitura ON public.configuracoes_entrega;
CREATE POLICY entrega_leitura ON public.configuracoes_entrega FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid()
  AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)));

DROP POLICY IF EXISTS entrega_cadastro ON public.configuracoes_entrega;
CREATE POLICY entrega_cadastro ON public.configuracoes_entrega FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
  WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')
  AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)));

DROP POLICY IF EXISTS entrega_edicao ON public.configuracoes_entrega;
CREATE POLICY entrega_edicao ON public.configuracoes_entrega FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
  WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')
  AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id = u.perfil_id
  WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')
  AND (u.loja_id IS NULL OR u.loja_id = configuracoes_entrega.loja_id)));
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: sql/migration_consulta_rotas.sql
-- Após migration_configuracao_entrega.sql. Não altera pedidos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.limites_consulta_rotas (
  chave text PRIMARY KEY,
  janela timestamptz NOT NULL,
  quantidade integer NOT NULL
);
ALTER TABLE public.limites_consulta_rotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.limites_consulta_rotas FROM PUBLIC, anon, authenticated;

-- Autoriza, reserva uma consulta e devolve SOMENTE a configuração salva da loja.
-- Contadores limitados a duas linhas por usuário e uma global; sem endereços.
CREATE OR REPLACE FUNCTION public.preparar_consulta_rota(p_loja uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_config jsonb;
  v_limite record;
  v_contagem integer;
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS (
    SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = v_usuario AND u.ativo
      AND (u.loja_id IS NULL OR u.loja_id = p_loja)
      AND (p.nome IN ('Administrador','Gerente') OR EXISTS (
        SELECT 1 FROM permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_criar
      ))
  ) THEN RAISE EXCEPTION 'Sem permissão para consultar rotas nesta unidade.' USING ERRCODE = '42501'; END IF;

  SELECT to_jsonb(c) INTO v_config FROM configuracoes_entrega c
    JOIN lojas l ON l.id = c.loja_id WHERE c.loja_id = p_loja AND l.ativo;
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'Salve o endereço e a tarifa de uma loja ativa antes de consultar.' USING ERRCODE = '22023';
  END IF;

  FOR v_limite IN SELECT * FROM (VALUES
    ('global:dia', date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', 500),
    (v_usuario::text || ':dia', date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', 100),
    (v_usuario::text || ':minuto', date_trunc('minute', now()), 5)
  ) AS limites(chave, janela, maximo) LOOP
    INSERT INTO limites_consulta_rotas AS c(chave, janela, quantidade)
      VALUES(v_limite.chave, v_limite.janela, 1)
      ON CONFLICT(chave) DO UPDATE SET janela = EXCLUDED.janela,
        quantidade = CASE WHEN c.janela = EXCLUDED.janela THEN c.quantidade + 1 ELSE 1 END
      RETURNING quantidade INTO v_contagem;
    IF v_contagem > v_limite.maximo THEN
      RAISE EXCEPTION 'Limite de consultas de mapas atingido. Aguarde antes de tentar novamente.' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  RETURN v_config;
END;
$$;
REVOKE ALL ON FUNCTION public.preparar_consulta_rota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preparar_consulta_rota(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261005220617_origem_mapa.sql
-- Ponto escolhido pelo gerente para lojas sem imóvel numerado na base gratuita.
-- A política de edição existente continua limitando a Administrador/Gerente da unidade.
ALTER TABLE public.configuracoes_entrega
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_entrega_ponto_valido'
    AND conrelid = 'public.configuracoes_entrega'::regclass) THEN
    ALTER TABLE public.configuracoes_entrega
      ADD CONSTRAINT configuracoes_entrega_ponto_valido CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude IS NOT NULL AND longitude IS NOT NULL AND
          latitude BETWEEN -34 AND 6 AND longitude BETWEEN -74 AND -34)
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';



-- FONTE: supabase/migrations/20261005222321_proteger_views_dashboard.sql
-- As views antigas foram criadas com leitura para PUBLIC por padrão.
-- O dashboard usa somente sessão autenticada; custos e vendas não são públicos.
REVOKE ALL ON public.vw_custo_variacao, public.vw_vendas_por_loja FROM PUBLIC, anon;
GRANT SELECT ON public.vw_custo_variacao, public.vw_vendas_por_loja TO authenticated;
-- Usa as políticas RLS das tabelas de origem para cada usuário autenticado.
ALTER VIEW public.vw_custo_variacao SET (security_invoker = true);
ALTER VIEW public.vw_vendas_por_loja SET (security_invoker = true);



-- FONTE: supabase/migrations/20261008010733_frete_no_pedido.sql
-- Cotação emitida pela Edge Function depois da rota real. O navegador só recebe
-- o identificador; não pode criar/alterar o valor usado pelo pedido.
BEGIN;

CREATE TABLE public.cotacoes_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cliente_cpf char(11) NOT NULL REFERENCES public.clientes(cpf),
  origem jsonb NOT NULL,
  destino jsonb NOT NULL,
  distancia_metros integer NOT NULL CHECK (distancia_metros BETWEEN 1 AND 1000000),
  valor_km numeric(10,2) NOT NULL CHECK (valor_km > 0 AND valor_km <= 1000),
  taxa numeric(10,2) NOT NULL CHECK (taxa >= 0 AND taxa = round(distancia_metros::numeric * valor_km / 1000, 2)),
  provedor text NOT NULL CHECK (provedor = 'openrouteservice'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  usada_em timestamptz,
  CHECK (expira_em > criado_em)
);
CREATE INDEX cotacoes_entrega_usuario_idx ON public.cotacoes_entrega(usuario_id);
CREATE INDEX cotacoes_entrega_loja_idx ON public.cotacoes_entrega(loja_id);
CREATE INDEX cotacoes_entrega_cliente_idx ON public.cotacoes_entrega(cliente_cpf);
CREATE INDEX cotacoes_entrega_expira_idx ON public.cotacoes_entrega(expira_em);
ALTER TABLE public.cotacoes_entrega ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cotacoes_entrega FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cotacoes_entrega TO service_role;

ALTER TABLE public.pedidos
  ADD COLUMN taxa_entrega numeric(10,2) NOT NULL DEFAULT 0 CHECK (taxa_entrega >= 0),
  ADD COLUMN distancia_entrega_metros integer CHECK (distancia_entrega_metros > 0),
  ADD COLUMN tarifa_entrega_km numeric(10,2),
  ADD COLUMN endereco_entrega jsonb,
  ADD COLUMN origem_entrega jsonb,
  ADD COLUMN provedor_entrega text,
  ADD COLUMN cotacao_entrega_id uuid UNIQUE REFERENCES public.cotacoes_entrega(id);
ALTER TABLE public.pedidos
  ADD COLUMN subtotal_itens numeric(10,2) GENERATED ALWAYS AS (valor_total - taxa_entrega) STORED;

CREATE OR REPLACE FUNCTION public.criar_pedido_transacional(p_requisicao uuid, p_dados jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_loja uuid := (p_dados->>'loja_id')::uuid;
  v_pedido uuid;
  v_anterior public.requisicoes_pedido%ROWTYPE;
  v_cotacao public.cotacoes_entrega%ROWTYPE;
  v_cotacao_id uuid;
  v_item jsonb;
  v_adicional jsonb;
  v_variacao record;
  v_extra record;
  v_item_id uuid;
  v_quantidade integer;
  v_preco numeric;
  v_total numeric := 0;
  v_frete numeric := 0;
  v_markup numeric;
  v_canal text := p_dados->>'canal_venda';
  v_tipo text := p_dados->>'tipo_atendimento';
  v_pagamento text := p_dados->>'forma_pagamento';
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN
    RAISE EXCEPTION 'Sessão e identificador da requisição são obrigatórios.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = v_usuario AND u.ativo
      AND (u.loja_id IS NULL OR u.loja_id = v_loja)
      AND (p.nome IN ('Administrador', 'Gerente') OR EXISTS (
        SELECT 1 FROM permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_criar
      ))
  ) THEN RAISE EXCEPTION 'Usuário sem permissão para criar pedidos nesta unidade.'; END IF;

  -- Reenvio após perda de resposta recupera o pedido sem reutilizar cotação/estoque.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text || p_requisicao::text, 0));
  SELECT * INTO v_anterior FROM requisicoes_pedido
    WHERE usuario_id = v_usuario AND requisicao_id = p_requisicao;
  IF FOUND THEN
    IF v_anterior.conteudo IS DISTINCT FROM p_dados THEN
      RAISE EXCEPTION 'Reenvio com conteúdo diferente. Recupere o pedido original.';
    END IF;
    RETURN v_anterior.pedido_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lojas WHERE id = v_loja AND ativo) THEN
    RAISE EXCEPTION 'Unidade inválida ou inativa.';
  END IF;
  IF v_tipo IS NULL OR v_tipo NOT IN ('presencial', 'delivery') OR
     v_pagamento IS NULL OR v_pagamento NOT IN ('pix', 'credito', 'debito', 'dinheiro') THEN
    RAISE EXCEPTION 'Atendimento ou pagamento inválido.';
  END IF;
  IF COALESCE(p_dados->>'cliente_cpf', '') !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'Cliente inválido.';
  END IF;
  IF jsonb_typeof(p_dados->'itens') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Informe os itens do pedido.';
  END IF;
  IF jsonb_array_length(p_dados->'itens') NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'O pedido deve conter entre 1 e 100 itens.';
  END IF;
  SELECT markup_preco_percentual INTO v_markup FROM configuracoes_canal WHERE canal_venda = v_canal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canal de venda inválido.'; END IF;

  IF v_tipo = 'delivery' AND v_canal = 'proprio' THEN
    IF COALESCE(p_dados->>'cotacao_entrega_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RAISE EXCEPTION 'Calcule o frete da entrega antes de finalizar o pedido.';
    END IF;
    v_cotacao_id := (p_dados->>'cotacao_entrega_id')::uuid;
    SELECT * INTO v_cotacao FROM cotacoes_entrega
      WHERE id = v_cotacao_id FOR UPDATE;
    IF NOT FOUND OR v_cotacao.usuario_id IS DISTINCT FROM v_usuario OR
       v_cotacao.loja_id IS DISTINCT FROM v_loja OR
       btrim(v_cotacao.cliente_cpf::text) IS DISTINCT FROM p_dados->>'cliente_cpf' OR
       v_cotacao.expira_em <= now() OR v_cotacao.usada_em IS NOT NULL THEN
      RAISE EXCEPTION 'Cotação expirada, já usada ou de outro cliente/unidade. Calcule o frete novamente.';
    END IF;
    v_frete := v_cotacao.taxa;
  ELSIF p_dados->>'cotacao_entrega_id' IS NOT NULL THEN
    RAISE EXCEPTION 'Frete próprio não se aplica a atendimento presencial ou marketplaces.';
  END IF;

  INSERT INTO pedidos(loja_id, cliente_cpf, tipo_atendimento, forma_pagamento,
    canal_venda, observacoes, troco_para, status, valor_total, taxa_entrega,
    distancia_entrega_metros, tarifa_entrega_km, endereco_entrega, origem_entrega,
    provedor_entrega, cotacao_entrega_id)
  VALUES(v_loja, p_dados->>'cliente_cpf', v_tipo, v_pagamento, v_canal,
    NULLIF(btrim(p_dados->>'observacoes'), ''),
    CASE WHEN v_pagamento = 'dinheiro' THEN (p_dados->>'troco_para')::numeric ELSE NULL END,
    'recebido', v_frete, v_frete,
    v_cotacao.distancia_metros, v_cotacao.valor_km, v_cotacao.destino, v_cotacao.origem,
    v_cotacao.provedor, v_cotacao_id) RETURNING id INTO v_pedido;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_dados->'itens') LOOP
    IF COALESCE(v_item->>'quantidade', '') !~ '^[1-9][0-9]{0,3}$' THEN
      RAISE EXCEPTION 'Quantidade de item inválida.';
    END IF;
    v_quantidade := (v_item->>'quantidade')::integer;
    SELECT pv.*, p.permite_adicionais INTO v_variacao
      FROM produto_variacoes pv JOIN produtos p ON p.sku = pv.produto_sku
      WHERE pv.id = (v_item->>'variacao_id')::uuid AND p.ativo
        AND ((v_tipo = 'delivery' AND p.disponivel_delivery) OR
             (v_tipo = 'presencial' AND p.disponivel_presencial));
    IF NOT FOUND THEN RAISE EXCEPTION 'Variação indisponível para este atendimento.'; END IF;
    v_preco := round(v_variacao.preco_venda * (1 + v_markup / 100), 2);
    IF v_preco < 0 OR v_preco IS DISTINCT FROM (v_item->>'preco_unitario')::numeric THEN
      RAISE EXCEPTION 'Preço alterado. Atualize o catálogo e confira o pedido.';
    END IF;
    IF EXISTS (SELECT 1 FROM fichas_tecnicas ft WHERE ft.variacao_id = v_variacao.id
      AND NOT EXISTS (SELECT 1 FROM estoque_lojas es WHERE es.loja_id = v_loja AND es.ingrediente_id = ft.ingrediente_id)) THEN
      RAISE EXCEPTION 'Um ingrediente da ficha não está vinculado ao estoque desta unidade.';
    END IF;
    INSERT INTO itens_pedido(pedido_id, produto_sku, variacao_id, quantidade, preco_unitario)
      VALUES(v_pedido, v_variacao.produto_sku, v_variacao.id, v_quantidade, v_preco)
      RETURNING id INTO v_item_id;
    v_total := v_total + v_preco * v_quantidade;

    IF jsonb_typeof(v_item->'adicionais') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Lista de adicionais inválida.';
    END IF;
    IF jsonb_array_length(v_item->'adicionais') > 100 THEN RAISE EXCEPTION 'Limite de adicionais excedido.'; END IF;
    IF (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(v_item->'adicionais')) THEN
      RAISE EXCEPTION 'Adicional repetido no mesmo item.';
    END IF;
    FOR v_adicional IN SELECT value FROM jsonb_array_elements(v_item->'adicionais') LOOP
      SELECT a.* INTO v_extra FROM adicionais a
        JOIN produto_adicionais_disponiveis pa ON pa.adicional_id = a.id
        WHERE a.id = (v_adicional->>'id')::uuid AND pa.produto_sku = v_variacao.produto_sku AND a.ativo;
      IF NOT FOUND OR NOT v_variacao.permite_adicionais THEN RAISE EXCEPTION 'Adicional não permitido para este produto.'; END IF;
      IF v_extra.preco_adicional < 0 OR v_extra.preco_adicional IS DISTINCT FROM (v_adicional->>'preco_unitario')::numeric THEN
        RAISE EXCEPTION 'Preço do adicional alterado. Atualize o catálogo.';
      END IF;
      IF v_extra.ingrediente_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM estoque_lojas WHERE loja_id = v_loja AND ingrediente_id = v_extra.ingrediente_id
      ) THEN RAISE EXCEPTION 'Insumo do adicional não vinculado à unidade.'; END IF;
      INSERT INTO itens_pedido_adicionais(item_pedido_id, adicional_id, quantidade, preco_unitario)
        VALUES(v_item_id, v_extra.id, v_quantidade, v_extra.preco_adicional);
      v_total := v_total + v_extra.preco_adicional * v_quantidade;
    END LOOP;
  END LOOP;
  IF v_pagamento = 'dinheiro' AND ((p_dados->>'troco_para') IS NULL OR (p_dados->>'troco_para')::numeric < v_total + v_frete) THEN
    RAISE EXCEPTION 'Valor para troco inferior ao total com frete.';
  END IF;
  UPDATE pedidos SET valor_total = v_total + v_frete WHERE id = v_pedido;
  IF v_cotacao_id IS NOT NULL THEN
    UPDATE cotacoes_entrega SET usada_em = now() WHERE id = v_cotacao_id;
  END IF;
  INSERT INTO requisicoes_pedido VALUES(v_usuario, p_requisicao, p_dados, v_pedido);
  RETURN v_pedido;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_pedido_transacional(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_pedido_transacional(uuid, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261008012909_restringir_escrita_pedidos.sql
-- Pedidos e itens são criados exclusivamente pela RPC transacional, que valida
-- catálogo, estoque e cotação de entrega. O navegador só consulta e altera
-- status/motivo; não pode forjar total, frete ou linhas via Data API.
BEGIN;

REVOKE ALL ON public.pedidos, public.itens_pedido,
  public.itens_pedido_adicionais FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pedidos, public.itens_pedido,
  public.itens_pedido_adicionais TO authenticated;
GRANT UPDATE (status, motivo_cancelamento) ON public.pedidos TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261009000030_cancelamento_estorno_estoque.sql
BEGIN;

-- O preço original permanece no pedido para auditoria. O estorno no ERP é
-- representado pelo status cancelado + lançamento imutável abaixo.
CREATE TABLE public.cancelamentos_pedido (
  pedido_id uuid PRIMARY KEY REFERENCES public.pedidos(id),
  motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 3 AND 500),
  destino text NOT NULL CHECK (destino IN ('devolver_estoque', 'perda_operacional', 'reaproveitar')),
  pedido_destino_id uuid UNIQUE REFERENCES public.pedidos(id),
  valor_estornado numeric(10,2) NOT NULL CHECK (valor_estornado >= 0),
  custo_operacional numeric(14,4) CHECK (custo_operacional >= 0),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK ((destino = 'reaproveitar') = (pedido_destino_id IS NOT NULL)),
  CHECK (pedido_destino_id IS DISTINCT FROM pedido_id)
);
CREATE INDEX cancelamentos_pedido_usuario_idx ON public.cancelamentos_pedido(usuario_id);
ALTER TABLE public.cancelamentos_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY cancelamentos_pedido_por_unidade ON public.cancelamentos_pedido
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id
      AND (public.minha_loja() IS NULL OR p.loja_id = public.minha_loja()))
  );
REVOKE ALL ON public.cancelamentos_pedido FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cancelamentos_pedido TO authenticated;

-- Pedidos antigos não têm fotografia do consumo e não podem receber uma
-- reposição aproximada após eventual edição da ficha técnica.
ALTER TABLE public.pedidos ADD COLUMN estoque_rastreado boolean NOT NULL DEFAULT false;
ALTER TABLE public.pedidos ALTER COLUMN estoque_rastreado SET DEFAULT true;

CREATE TABLE public.consumos_itens_pedido (
  item_pedido_id uuid NOT NULL REFERENCES public.itens_pedido(id),
  ingrediente_id uuid NOT NULL REFERENCES public.ingredientes(id),
  quantidade numeric(12,3) NOT NULL CHECK (quantidade > 0),
  custo_snapshot numeric(14,4) NOT NULL CHECK (custo_snapshot >= 0),
  revertido_em timestamptz,
  revertido_por_pedido_id uuid REFERENCES public.pedidos(id),
  PRIMARY KEY (item_pedido_id, ingrediente_id),
  CHECK ((revertido_em IS NULL) = (revertido_por_pedido_id IS NULL))
);
CREATE INDEX consumos_itens_pedido_ingrediente_idx ON public.consumos_itens_pedido(ingrediente_id);
ALTER TABLE public.consumos_itens_pedido ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consumos_itens_pedido FROM PUBLIC, anon, authenticated;

-- Substitui os triggers existentes: a baixa e sua fotografia ocorrem na mesma
-- transação. Se não houver estoque vinculado, a venda falha em vez de gerar
-- um registro de consumo fictício.
CREATE OR REPLACE FUNCTION public.baixar_estoque_item_pedido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_loja uuid;
  v_ficha record;
  v_quantidade numeric(12,3);
BEGIN
  SELECT loja_id INTO STRICT v_loja FROM public.pedidos WHERE id = NEW.pedido_id;
  FOR v_ficha IN
    SELECT ft.ingrediente_id, ft.peso_quantidade, i.custo_unitario
    FROM public.fichas_tecnicas ft JOIN public.ingredientes i ON i.id = ft.ingrediente_id
    WHERE ft.variacao_id = NEW.variacao_id
  LOOP
    v_quantidade := v_ficha.peso_quantidade * NEW.quantidade;
    IF v_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida na ficha técnica.'; END IF;
    UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel - v_quantidade,
      atualizado_em = now() WHERE loja_id = v_loja AND ingrediente_id = v_ficha.ingrediente_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ingrediente da ficha sem estoque na unidade.'; END IF;
    INSERT INTO public.consumos_itens_pedido(item_pedido_id, ingrediente_id, quantidade, custo_snapshot)
      VALUES (NEW.id, v_ficha.ingrediente_id, v_quantidade, v_quantidade * v_ficha.custo_unitario)
      ON CONFLICT (item_pedido_id, ingrediente_id) DO UPDATE SET
        quantidade = public.consumos_itens_pedido.quantidade + EXCLUDED.quantidade,
        custo_snapshot = public.consumos_itens_pedido.custo_snapshot + EXCLUDED.custo_snapshot;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.baixar_estoque_adicional()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_loja uuid;
  v_ingrediente uuid;
  v_peso numeric;
  v_custo numeric;
  v_quantidade numeric(12,3);
BEGIN
  SELECT p.loja_id INTO STRICT v_loja FROM public.itens_pedido ip
    JOIN public.pedidos p ON p.id = ip.pedido_id WHERE ip.id = NEW.item_pedido_id;
  SELECT a.ingrediente_id, a.peso_quantidade, i.custo_unitario
    INTO v_ingrediente, v_peso, v_custo FROM public.adicionais a
    LEFT JOIN public.ingredientes i ON i.id = a.ingrediente_id WHERE a.id = NEW.adicional_id;
  IF v_ingrediente IS NOT NULL THEN
    v_quantidade := v_peso * NEW.quantidade;
    IF v_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida no adicional.'; END IF;
    UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel - v_quantidade,
      atualizado_em = now() WHERE loja_id = v_loja AND ingrediente_id = v_ingrediente;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ingrediente do adicional sem estoque na unidade.'; END IF;
    INSERT INTO public.consumos_itens_pedido(item_pedido_id, ingrediente_id, quantidade, custo_snapshot)
      VALUES (NEW.item_pedido_id, v_ingrediente, v_quantidade, v_quantidade * v_custo)
      ON CONFLICT (item_pedido_id, ingrediente_id) DO UPDATE SET
        quantidade = public.consumos_itens_pedido.quantidade + EXCLUDED.quantidade,
        custo_snapshot = public.consumos_itens_pedido.custo_snapshot + EXCLUDED.custo_snapshot;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.proteger_cancelamento_pedido()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status = 'cancelado' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Pedido cancelado não pode ser reaberto.';
  END IF;
  IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM NEW.status
    AND current_setting('app.cancelamento_pedido_autorizado', true) IS DISTINCT FROM 'sim' THEN
    RAISE EXCEPTION 'Use o cancelamento transacional para estornar o pedido.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_proteger_cancelamento_pedido BEFORE UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.proteger_cancelamento_pedido();

CREATE OR REPLACE FUNCTION public.avancar_pedido_transacional(p_pedido uuid, p_status_esperado text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_novo text;
BEGIN
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado ou sessão inválida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = v_pedido.loja_id)
      AND (pf.nome IN ('Administrador','Gerente') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND (pe.pode_criar OR pe.pode_editar)))) THEN
    RAISE EXCEPTION 'Sem permissão para avançar este pedido.';
  END IF;
  IF v_pedido.status IS DISTINCT FROM p_status_esperado THEN
    RAISE EXCEPTION 'O pedido mudou em outra sessão. Atualize a lista.';
  END IF;
  v_novo := CASE v_pedido.status
    WHEN 'recebido' THEN 'em_preparo'
    WHEN 'em_preparo' THEN 'pronto'
    WHEN 'pronto' THEN CASE WHEN v_pedido.tipo_atendimento = 'delivery' THEN 'saiu_entrega' ELSE 'entregue' END
    WHEN 'saiu_entrega' THEN 'entregue'
    ELSE NULL END;
  IF v_novo IS NULL THEN RAISE EXCEPTION 'Pedido não pode avançar.'; END IF;
  UPDATE public.pedidos SET status = v_novo, atualizado_em = now() WHERE id = p_pedido;
  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_pedido_transacional(
  p_pedido uuid, p_status_esperado text, p_motivo text, p_destino text,
  p_pedido_destino uuid DEFAULT NULL
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_origem public.pedidos%ROWTYPE;
  v_destino public.pedidos%ROWTYPE;
  v_raiz uuid;
  v_anterior uuid;
  v_assinatura_origem jsonb;
  v_assinatura_destino jsonb;
  v_consumo record;
  v_custo_operacional numeric(14,4);
BEGIN
  SELECT * INTO v_origem FROM public.pedidos WHERE id = p_pedido FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado ou sessão inválida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = v_origem.loja_id)
      AND (pf.nome IN ('Administrador','Gerente') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'vendas' AND pe.pode_editar))) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar este pedido.';
  END IF;
  IF v_origem.status IS DISTINCT FROM p_status_esperado OR v_origem.status = 'cancelado' THEN
    RAISE EXCEPTION 'O pedido mudou em outra sessão. Atualize a lista.';
  END IF;
  IF length(btrim(coalesce(p_motivo, ''))) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Informe um motivo entre 3 e 500 caracteres.';
  END IF;
  IF p_destino NOT IN ('devolver_estoque', 'perda_operacional', 'reaproveitar') OR p_destino IS NULL THEN
    RAISE EXCEPTION 'Selecione o destino dos itens cancelados.';
  END IF;
  IF (p_destino = 'reaproveitar') IS DISTINCT FROM (p_pedido_destino IS NOT NULL) THEN
    RAISE EXCEPTION 'Selecione um pedido de destino apenas para reaproveitamento.';
  END IF;

  IF p_destino <> 'perda_operacional' AND NOT v_origem.estoque_rastreado THEN
    RAISE EXCEPTION 'Pedido anterior ao rastreamento de estoque: só é possível lançar perda operacional sem repor quantidades estimadas.';
  END IF;

  -- Se este pedido já recebeu alimento de outro cancelamento, o custo físico
  -- pertence à primeira produção da cadeia, não à baixa revertida no destino.
  v_raiz := v_origem.id;
  LOOP
    SELECT c.pedido_id INTO v_anterior FROM public.cancelamentos_pedido c
      WHERE c.pedido_destino_id = v_raiz AND c.destino = 'reaproveitar';
    EXIT WHEN NOT FOUND;
    v_raiz := v_anterior;
  END LOOP;
  IF p_destino = 'perda_operacional' AND v_origem.estoque_rastreado THEN
    SELECT coalesce(sum(c.custo_snapshot), 0) INTO v_custo_operacional
      FROM public.consumos_itens_pedido c JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
      WHERE ip.pedido_id = v_raiz;
  END IF;

  IF p_destino = 'reaproveitar' THEN
    SELECT * INTO v_destino FROM public.pedidos WHERE id = p_pedido_destino FOR UPDATE;
    IF NOT FOUND OR v_destino.id = v_origem.id OR v_destino.loja_id <> v_origem.loja_id
      OR v_destino.status NOT IN ('recebido','em_preparo','pronto','saiu_entrega')
      OR NOT v_destino.estoque_rastreado THEN
      RAISE EXCEPTION 'Destino inválido: use outro pedido ativo e rastreado da mesma unidade.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.cancelamentos_pedido c WHERE c.pedido_destino_id = v_destino.id) THEN
      RAISE EXCEPTION 'Esse pedido já recebeu itens reaproveitados.';
    END IF;
    -- Multiconjunto exato de variação, quantidade e adicionais. Não permite
    -- aproveitar parcialmente um pedido nem substituir outro produto.
    SELECT coalesce(jsonb_agg(s.assinatura ORDER BY s.assinatura::text), '[]'::jsonb)
      INTO v_assinatura_origem FROM (
      SELECT jsonb_build_object('sku', ip.produto_sku, 'variacao', ip.variacao_id,
        'quantidade', ip.quantidade, 'adicionais',
        coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.adicional_id, 'quantidade', a.quantidade)
          ORDER BY a.adicional_id) FROM public.itens_pedido_adicionais a WHERE a.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = v_origem.id
    ) s;
    SELECT coalesce(jsonb_agg(s.assinatura ORDER BY s.assinatura::text), '[]'::jsonb)
      INTO v_assinatura_destino FROM (
      SELECT jsonb_build_object('sku', ip.produto_sku, 'variacao', ip.variacao_id,
        'quantidade', ip.quantidade, 'adicionais',
        coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.adicional_id, 'quantidade', a.quantidade)
          ORDER BY a.adicional_id) FROM public.itens_pedido_adicionais a WHERE a.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = v_destino.id
    ) s;
    IF v_assinatura_origem IS DISTINCT FROM v_assinatura_destino OR v_assinatura_origem = '[]'::jsonb THEN
      RAISE EXCEPTION 'O pedido de destino precisa ter exatamente os mesmos itens, quantidades, variações e adicionais.';
    END IF;
    -- A produção da origem é aproveitada; desfaz somente a baixa duplicada
    -- realizada ao criar o pedido de destino.
    FOR v_consumo IN SELECT c.*, p.loja_id FROM public.consumos_itens_pedido c
      JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
      JOIN public.pedidos p ON p.id = ip.pedido_id
      WHERE p.id = v_destino.id FOR UPDATE OF c
    LOOP
      IF v_consumo.revertido_em IS NOT NULL THEN RAISE EXCEPTION 'Consumo do destino já revertido.'; END IF;
      UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel + v_consumo.quantidade,
        atualizado_em = now() WHERE loja_id = v_consumo.loja_id AND ingrediente_id = v_consumo.ingrediente_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque da unidade não encontrado.'; END IF;
      UPDATE public.consumos_itens_pedido SET revertido_em = now(), revertido_por_pedido_id = v_origem.id
        WHERE item_pedido_id = v_consumo.item_pedido_id AND ingrediente_id = v_consumo.ingrediente_id;
    END LOOP;
  ELSIF p_destino = 'devolver_estoque' THEN
    FOR v_consumo IN SELECT c.*, p.loja_id FROM public.consumos_itens_pedido c
      JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
      JOIN public.pedidos p ON p.id = ip.pedido_id
      WHERE p.id = v_raiz FOR UPDATE OF c
    LOOP
      IF v_consumo.revertido_em IS NOT NULL THEN RAISE EXCEPTION 'Consumo já revertido.'; END IF;
      UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel + v_consumo.quantidade,
        atualizado_em = now() WHERE loja_id = v_consumo.loja_id AND ingrediente_id = v_consumo.ingrediente_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque da unidade não encontrado.'; END IF;
      UPDATE public.consumos_itens_pedido SET revertido_em = now(), revertido_por_pedido_id = v_origem.id
        WHERE item_pedido_id = v_consumo.item_pedido_id AND ingrediente_id = v_consumo.ingrediente_id;
    END LOOP;
  END IF;

  PERFORM set_config('app.cancelamento_pedido_autorizado', 'sim', true);
  UPDATE public.pedidos SET status = 'cancelado', motivo_cancelamento = btrim(p_motivo),
    atualizado_em = now() WHERE id = v_origem.id;
  PERFORM set_config('app.cancelamento_pedido_autorizado', '', true);
  INSERT INTO public.cancelamentos_pedido(pedido_id, motivo, destino, pedido_destino_id,
    valor_estornado, custo_operacional, usuario_id)
    VALUES (v_origem.id, btrim(p_motivo), p_destino, p_pedido_destino,
      v_origem.valor_total, v_custo_operacional, auth.uid());
  RETURN v_origem.valor_total;
END;
$$;

REVOKE ALL ON FUNCTION public.baixar_estoque_item_pedido(), public.baixar_estoque_adicional(),
  public.proteger_cancelamento_pedido() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.avancar_pedido_transacional(uuid, text),
  public.cancelar_pedido_transacional(uuid, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avancar_pedido_transacional(uuid, text),
  public.cancelar_pedido_transacional(uuid, text, text, text, uuid) TO authenticated;
REVOKE UPDATE (status, motivo_cancelamento) ON public.pedidos FROM authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261009001643_corrigir_fatos_cancelados.sql
BEGIN;

-- Mantém o pedido cancelado para auditoria, mas não o contabiliza como venda.
-- As colunas antigas preservam nomes e tipos para consumidores existentes.
CREATE OR REPLACE VIEW public.fato_vendas AS
SELECT
  p.id AS pedido_id,
  p.loja_id,
  p.cliente_cpf,
  p.tipo_atendimento,
  p.canal_venda AS canal_id,
  p.forma_pagamento AS pagamento_id,
  p.criado_em::date AS data_id,
  p.status,
  (CASE WHEN p.status = 'cancelado' THEN 0 ELSE p.valor_total END)::numeric(10,2) AS valor_total,
  p.troco_para,
  p.motivo_cancelamento,
  CASE WHEN p.status = 'cancelado' THEN 0 ELSE
    round(p.valor_total * coalesce(cc.taxa_plataforma_percentual, 0) / 100, 2) END AS taxa_plataforma_valor,
  CASE WHEN p.status = 'cancelado' THEN 0 ELSE
    round(p.valor_total * coalesce(cp.taxa_percentual, 0) / 100, 2) END AS taxa_pagamento_valor,
  CASE WHEN p.status = 'cancelado' THEN 0 ELSE
    p.valor_total
      - round(p.valor_total * coalesce(cc.taxa_plataforma_percentual, 0) / 100, 2)
      - round(p.valor_total * coalesce(cp.taxa_percentual, 0) / 100, 2) END AS valor_liquido,
  p.valor_total AS valor_original,
  c.valor_estornado,
  c.custo_operacional,
  c.destino AS destino_cancelamento
FROM public.pedidos p
LEFT JOIN public.configuracoes_canal cc ON cc.canal_venda = p.canal_venda
LEFT JOIN public.configuracoes_pagamento cp ON cp.forma_pagamento = p.forma_pagamento
LEFT JOIN public.cancelamentos_pedido c ON c.pedido_id = p.id;

-- Cancelados não têm receita de item nem CMV de venda. O custo do alimento
-- preparado fica identificado separadamente em cancelamentos_pedido.
CREATE OR REPLACE VIEW public.fato_itens_venda AS
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
  coalesce(ft.custo_unitario, 0) AS custo_unitario,
  ip.quantidade * coalesce(ft.custo_unitario, 0) AS custo_total,
  (ip.quantidade * ip.preco_unitario) - (ip.quantidade * coalesce(ft.custo_unitario, 0)) AS margem_valor
FROM public.itens_pedido ip
JOIN public.pedidos p ON p.id = ip.pedido_id
LEFT JOIN (SELECT variacao_id, custo_ficha_tecnica AS custo_unitario FROM public.vw_custo_variacao) ft
  ON ft.variacao_id = ip.variacao_id
WHERE p.status <> 'cancelado';

ALTER VIEW public.fato_vendas SET (security_invoker = true);
ALTER VIEW public.fato_itens_venda SET (security_invoker = true);
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261017173447_operacao_estoque_segura.sql
BEGIN;

-- Um UPDATE relativo usa o saldo bloqueado no servidor, evitando sobrescrever
-- baixas de venda ocorridas desde a última leitura do navegador.
CREATE TABLE public.reposicoes_estoque (
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  requisicao_id uuid NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  ingrediente_id uuid NOT NULL REFERENCES public.ingredientes(id),
  quantidade numeric(12,3) NOT NULL CHECK (quantidade > 0),
  saldo_resultante numeric(12,3) NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, requisicao_id)
);
CREATE INDEX reposicoes_estoque_loja_ingrediente_idx ON public.reposicoes_estoque(loja_id, ingrediente_id);
CREATE INDEX reposicoes_estoque_ingrediente_idx ON public.reposicoes_estoque(ingrediente_id);
ALTER TABLE public.reposicoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY reposicoes_estoque_leitura ON public.reposicoes_estoque FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = (SELECT auth.uid()) AND u.ativo
      AND (u.loja_id IS NULL OR u.loja_id = reposicoes_estoque.loja_id)
      AND (pf.nome IN ('Administrador','Gerente','Estoque') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'estoque' AND pe.pode_visualizar)))
);
REVOKE ALL ON public.reposicoes_estoque FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.reposicoes_estoque TO authenticated;

CREATE OR REPLACE FUNCTION public.repor_estoque_transacional(
  p_requisicao uuid, p_loja uuid, p_ingrediente uuid, p_quantidade numeric
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_anterior public.reposicoes_estoque%ROWTYPE;
  v_saldo numeric(12,3);
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN RAISE EXCEPTION 'Sessão e requisição são obrigatórias.'; END IF;
  IF p_quantidade IS NULL OR NOT (p_quantidade > 0 AND p_quantidade <= 999999999.999)
    OR p_quantidade <> round(p_quantidade, 3) THEN
    RAISE EXCEPTION 'Informe quantidade positiva com até três casas decimais.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = v_usuario AND u.ativo AND (u.loja_id IS NULL OR u.loja_id = p_loja)
      AND (pf.nome IN ('Administrador','Gerente','Estoque') OR EXISTS (
        SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = 'estoque' AND pe.pode_editar))) THEN
    RAISE EXCEPTION 'Sem permissão para repor estoque nesta unidade.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text || p_requisicao::text, 0));
  SELECT * INTO v_anterior FROM public.reposicoes_estoque
    WHERE usuario_id = v_usuario AND requisicao_id = p_requisicao;
  IF FOUND THEN
    IF v_anterior.loja_id IS DISTINCT FROM p_loja OR v_anterior.ingrediente_id IS DISTINCT FROM p_ingrediente
      OR v_anterior.quantidade IS DISTINCT FROM p_quantidade THEN
      RAISE EXCEPTION 'Requisição já utilizada com outro conteúdo.';
    END IF;
    RETURN v_anterior.saldo_resultante;
  END IF;
  UPDATE public.estoque_lojas SET quantidade_disponivel = quantidade_disponivel + p_quantidade,
    atualizado_em = now() WHERE loja_id = p_loja AND ingrediente_id = p_ingrediente
    RETURNING quantidade_disponivel INTO v_saldo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo não vinculado ao estoque desta unidade.'; END IF;
  INSERT INTO public.reposicoes_estoque(usuario_id, requisicao_id, loja_id, ingrediente_id, quantidade, saldo_resultante)
    VALUES (v_usuario, p_requisicao, p_loja, p_ingrediente, p_quantidade, v_saldo);
  RETURN v_saldo;
END;
$$;
REVOKE ALL ON FUNCTION public.repor_estoque_transacional(uuid, uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repor_estoque_transacional(uuid, uuid, uuid, numeric) TO authenticated;
REVOKE UPDATE ON public.estoque_lojas FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (loja_id, ingrediente_id, quantidade_disponivel, quantidade_minima, atualizado_em)
  ON public.estoque_lojas FROM PUBLIC, anon, authenticated;

-- Saldos negativos legados podem ser recuperados por reposição, mas nenhuma
-- operação nova pode consumir além do disponível. O bloqueio é transacional.
CREATE OR REPLACE FUNCTION public.validar_saldo_estoque()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.quantidade_disponivel = 'NaN'::numeric THEN RAISE EXCEPTION 'Saldo de estoque inválido.'; END IF;
  IF NEW.quantidade_disponivel < 0 THEN
    IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Saldo inicial não pode ser negativo.'; END IF;
    IF NEW.quantidade_disponivel < OLD.quantidade_disponivel THEN
      RAISE EXCEPTION 'Estoque insuficiente de insumos na unidade. Confira os saldos antes de vender.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validar_saldo_estoque BEFORE INSERT OR UPDATE OF quantidade_disponivel
  ON public.estoque_lojas FOR EACH ROW EXECUTE FUNCTION public.validar_saldo_estoque();
REVOKE ALL ON FUNCTION public.validar_saldo_estoque() FROM PUBLIC, anon, authenticated;

-- Mesmo SKU não garante o mesmo alimento se a ficha mudou entre as vendas.
-- Compara a fotografia física da primeira produção com a do destino.
CREATE OR REPLACE FUNCTION public.validar_custo_cancelamento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_raiz uuid := NEW.pedido_id;
  v_anterior uuid;
  v_origem jsonb;
  v_destino jsonb;
BEGIN
  LOOP
    SELECT c.pedido_id INTO v_anterior FROM public.cancelamentos_pedido c
      WHERE c.pedido_destino_id = v_raiz AND c.destino = 'reaproveitar';
    EXIT WHEN NOT FOUND;
    v_raiz := v_anterior;
  END LOOP;
  IF NEW.destino = 'perda_operacional' THEN
    IF NOT EXISTS (SELECT 1 FROM public.pedidos WHERE id = v_raiz AND estoque_rastreado)
      OR EXISTS (SELECT 1 FROM public.itens_pedido ip WHERE ip.pedido_id = v_raiz
        AND NOT EXISTS (SELECT 1 FROM public.consumos_itens_pedido c WHERE c.item_pedido_id = ip.id)) THEN
      NEW.custo_operacional := NULL;
    ELSE
      SELECT sum(c.custo_snapshot) INTO NEW.custo_operacional
        FROM public.consumos_itens_pedido c JOIN public.itens_pedido ip ON ip.id = c.item_pedido_id
        WHERE ip.pedido_id = v_raiz;
    END IF;
  ELSIF NEW.destino = 'reaproveitar' THEN
    SELECT jsonb_agg(s.assinatura ORDER BY s.assinatura::text) INTO v_origem FROM (
      SELECT jsonb_build_object('variacao', ip.variacao_id, 'quantidade', ip.quantidade, 'consumo',
        coalesce((SELECT jsonb_agg(jsonb_build_object('ingrediente', c.ingrediente_id, 'quantidade', c.quantidade)
          ORDER BY c.ingrediente_id) FROM public.consumos_itens_pedido c WHERE c.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = v_raiz
    ) s;
    SELECT jsonb_agg(s.assinatura ORDER BY s.assinatura::text) INTO v_destino FROM (
      SELECT jsonb_build_object('variacao', ip.variacao_id, 'quantidade', ip.quantidade, 'consumo',
        coalesce((SELECT jsonb_agg(jsonb_build_object('ingrediente', c.ingrediente_id, 'quantidade', c.quantidade)
          ORDER BY c.ingrediente_id) FROM public.consumos_itens_pedido c WHERE c.item_pedido_id = ip.id), '[]'::jsonb)) assinatura
      FROM public.itens_pedido ip WHERE ip.pedido_id = NEW.pedido_destino_id
    ) s;
    IF v_origem IS DISTINCT FROM v_destino THEN
      RAISE EXCEPTION 'A ficha técnica mudou entre os pedidos. Os alimentos não têm composição idêntica para reaproveitamento.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validar_custo_cancelamento BEFORE INSERT ON public.cancelamentos_pedido
  FOR EACH ROW EXECUTE FUNCTION public.validar_custo_cancelamento();
REVOKE ALL ON FUNCTION public.validar_custo_cancelamento() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS consumos_itens_pedido_reversao_idx ON public.consumos_itens_pedido(revertido_por_pedido_id);
CREATE INDEX IF NOT EXISTS pedidos_operacao_loja_criacao_idx ON public.pedidos(loja_id, criado_em, id)
  WHERE status IN ('recebido','em_preparo','pronto','saiu_entrega');
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261017174630_proteger_acessos_operacionais.sql
BEGIN;

-- O ERP não possui catálogo público. As políticas legadas FOR PUBLIC não
-- devem tornar tabelas operacionais acessíveis sem login.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
CREATE SCHEMA IF NOT EXISTS erp_privado;
REVOKE ALL ON SCHEMA erp_privado FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA erp_privado TO authenticated;

CREATE OR REPLACE FUNCTION erp_privado.usuario_ativo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.ativo);
$$;
CREATE OR REPLACE FUNCTION erp_privado.tem_permissao(p_modulo text, p_acao text, p_loja uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo
      AND (p_loja IS NULL OR u.loja_id IS NULL OR u.loja_id = p_loja)
      AND (pf.nome IN ('Administrador','Gerente')
        OR (pf.nome = 'Estoque' AND p_modulo = 'estoque')
        OR EXISTS (SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id = u.perfil_id
          AND pe.modulo = p_modulo AND CASE p_acao
            WHEN 'visualizar' THEN pe.pode_visualizar
            WHEN 'criar' THEN pe.pode_criar
            WHEN 'editar' THEN pe.pode_editar ELSE false END))
  );
$$;
REVOKE ALL ON FUNCTION erp_privado.usuario_ativo(), erp_privado.tem_permissao(text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION erp_privado.usuario_ativo(), erp_privado.tem_permissao(text,text,uuid) TO authenticated;

-- Troca as permissivas políticas ALL por regras específicas. Funções de
-- escrita transacional continuam a validar o usuário e a executar como dono.
DO $$
DECLARE v_tabela text; v_politica record;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['usuarios','perfis','permissoes','pedidos','itens_pedido',
    'itens_pedido_adicionais','estoque_lojas','clientes','ingredientes','produtos',
    'produto_variacoes','fichas_tecnicas','categorias','adicionais',
    'produto_adicionais_disponiveis','lojas','configuracoes_canal','configuracoes_pagamento']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabela);
    FOR v_politica IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=v_tabela LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', v_politica.policyname, v_tabela);
    END LOOP;
  END LOOP;
END;
$$;

-- Alterar RBAC exige futura função administrativa; nenhuma tela existente
-- precisa escrever diretamente nestas três tabelas.
REVOKE ALL ON public.usuarios, public.perfis, public.permissoes FROM authenticated;
GRANT SELECT ON public.usuarios, public.perfis, public.permissoes TO authenticated;
CREATE POLICY usuarios_leitura ON public.usuarios FOR SELECT TO authenticated
  USING ((SELECT erp_privado.usuario_ativo()) AND (id = (SELECT auth.uid()) OR (SELECT erp_privado.tem_permissao('usuarios','visualizar'))));
CREATE POLICY perfis_leitura ON public.perfis FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));
CREATE POLICY permissoes_leitura ON public.permissoes FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));

CREATE POLICY pedidos_leitura ON public.pedidos FOR SELECT TO authenticated
  USING (erp_privado.tem_permissao('vendas','visualizar',loja_id));
CREATE POLICY itens_pedido_leitura ON public.itens_pedido FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id));
CREATE POLICY itens_adicionais_leitura ON public.itens_pedido_adicionais FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.itens_pedido ip WHERE ip.id = item_pedido_id));

REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.estoque_lojas FROM authenticated;
CREATE POLICY estoque_leitura ON public.estoque_lojas FOR SELECT TO authenticated
  USING (erp_privado.tem_permissao('estoque','visualizar',loja_id));
CREATE POLICY estoque_cadastro ON public.estoque_lojas FOR INSERT TO authenticated
  WITH CHECK (erp_privado.tem_permissao('estoque','criar',loja_id) AND quantidade_disponivel >= 0 AND quantidade_minima >= 0);

REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.clientes FROM authenticated;
CREATE POLICY clientes_leitura ON public.clientes FOR SELECT TO authenticated
  USING ((SELECT erp_privado.tem_permissao('clientes','visualizar')) OR (SELECT erp_privado.tem_permissao('vendas','visualizar')));
CREATE POLICY clientes_cadastro ON public.clientes FOR INSERT TO authenticated
  WITH CHECK ((SELECT erp_privado.tem_permissao('clientes','criar')) OR (SELECT erp_privado.tem_permissao('vendas','criar')));
CREATE POLICY clientes_edicao ON public.clientes FOR UPDATE TO authenticated
  USING ((SELECT erp_privado.tem_permissao('clientes','editar')))
  WITH CHECK ((SELECT erp_privado.tem_permissao('clientes','editar')));

CREATE POLICY ingredientes_leitura ON public.ingredientes FOR SELECT TO authenticated
  USING ((SELECT erp_privado.tem_permissao('estoque','visualizar')) OR (SELECT erp_privado.tem_permissao('produtos','visualizar')));
CREATE POLICY ingredientes_cadastro ON public.ingredientes FOR INSERT TO authenticated
  WITH CHECK ((SELECT erp_privado.tem_permissao('estoque','criar')) OR (SELECT erp_privado.tem_permissao('produtos','criar')));
CREATE POLICY ingredientes_edicao ON public.ingredientes FOR UPDATE TO authenticated
  USING ((SELECT erp_privado.tem_permissao('estoque','editar')) OR (SELECT erp_privado.tem_permissao('produtos','editar')))
  WITH CHECK ((SELECT erp_privado.tem_permissao('estoque','editar')) OR (SELECT erp_privado.tem_permissao('produtos','editar')));
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.ingredientes FROM authenticated;

DO $$
DECLARE v_tabela text;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['produtos','produto_variacoes','fichas_tecnicas','categorias','adicionais','produto_adicionais_disponiveis'] LOOP
    EXECUTE format('REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated', v_tabela);
    EXECUTE format('CREATE POLICY catalogo_leitura ON public.%I FOR SELECT TO authenticated USING (
      (SELECT erp_privado.tem_permissao(''vendas'',''visualizar'')) OR
      (SELECT erp_privado.tem_permissao(''produtos'',''visualizar'')) OR
      (SELECT erp_privado.tem_permissao(''estoque'',''visualizar'')))', v_tabela);
    EXECUTE format('CREATE POLICY catalogo_cadastro ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT erp_privado.tem_permissao(''produtos'',''criar'')))', v_tabela);
    EXECUTE format('CREATE POLICY catalogo_edicao ON public.%I FOR UPDATE TO authenticated
      USING ((SELECT erp_privado.tem_permissao(''produtos'',''editar'')))
      WITH CHECK ((SELECT erp_privado.tem_permissao(''produtos'',''editar'')))', v_tabela);
  END LOOP;
END;
$$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.lojas, public.configuracoes_canal, public.configuracoes_pagamento FROM authenticated;
CREATE POLICY lojas_leitura ON public.lojas FOR SELECT TO authenticated
  USING ((SELECT erp_privado.usuario_ativo()) AND ((SELECT public.minha_loja()) IS NULL OR id = (SELECT public.minha_loja())));
CREATE POLICY canais_leitura ON public.configuracoes_canal FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));
CREATE POLICY pagamentos_leitura ON public.configuracoes_pagamento FOR SELECT TO authenticated USING ((SELECT erp_privado.usuario_ativo()));

DO $$
DECLARE v_view text;
BEGIN
  FOREACH v_view IN ARRAY ARRAY['dim_produto','vw_engenharia_cardapio','dim_loja','dim_categoria','dim_cliente','dim_canal','dim_pagamento','dim_data'] LOOP
    IF to_regclass('public.' || v_view) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_view);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_view);
    END IF;
  END LOOP;
END;
$$;
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: sql/edicao_fichas_vigente.sql
-- Definições conferidas no Supabase em 24/10/2026. Após migration_fase1.sql e adicionais.
BEGIN;
CREATE OR REPLACE FUNCTION public.editar_quantidade_ficha(p_id uuid, p_anterior numeric, p_quantidade numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')) THEN
    RAISE EXCEPTION 'Sem permissão para editar fichas técnicas.' USING ERRCODE = '42501';
  END IF;
  IF p_quantidade IS NULL OR NOT (p_quantidade > 0 AND p_quantidade <= 9999999.999)
    OR p_quantidade <> round(p_quantidade, 3) THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
  UPDATE fichas_tecnicas SET peso_quantidade = p_quantidade
    WHERE id = p_id AND peso_quantidade = p_anterior RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Ficha alterada em outra sessão ou não encontrada. Recarregue antes de editar.'; END IF;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.editar_variacao(p_id uuid, p_nome_anterior text, p_preco_anterior numeric, p_nome text, p_preco numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.id = auth.uid() AND u.ativo AND p.nome IN ('Administrador','Gerente')) THEN
    RAISE EXCEPTION 'Sem permissão para editar o catálogo.' USING ERRCODE = '42501';
  END IF;
  IF p_nome IS NULL OR length(btrim(p_nome)) NOT BETWEEN 1 AND 100 OR p_preco IS NULL
    OR NOT (p_preco > 0 AND p_preco <= 99999999.99) OR p_preco <> round(p_preco, 2) THEN
    RAISE EXCEPTION 'Nome ou preço inválido.';
  END IF;
  UPDATE produto_variacoes SET nome_variacao = btrim(p_nome), preco_venda = p_preco
    WHERE id = p_id AND nome_variacao = p_nome_anterior AND preco_venda = p_preco_anterior RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Variação alterada em outra sessão ou não encontrada. Recarregue antes de editar.'; END IF;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.editar_quantidade_ficha(uuid,numeric,numeric), public.editar_variacao(uuid,text,numeric,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_quantidade_ficha(uuid,numeric,numeric), public.editar_variacao(uuid,text,numeric,text,numeric) TO authenticated;
COMMIT;



-- FONTE: supabase/migrations/20261025000912_portal_clientes_convivium.sql
BEGIN;

-- Auxiliares legadas não são endpoints públicos. Fixar resolução de tabelas.
DO $$
DECLARE v_assinatura text;
BEGIN
  FOREACH v_assinatura IN ARRAY ARRAY['public.valida_tipo_atendimento()','public.meu_perfil()','public.minha_loja()'] LOOP
    IF to_regprocedure(v_assinatura) IS NOT NULL THEN
      EXECUTE 'ALTER FUNCTION ' || v_assinatura || ' SET search_path = public, pg_temp';
      EXECUTE 'REVOKE ALL ON FUNCTION ' || v_assinatura || ' FROM PUBLIC, anon';
      EXECUTE 'GRANT EXECUTE ON FUNCTION ' || v_assinatura || ' TO authenticated';
    END IF;
  END LOOP;
END;
$$;

-- Cadastro público nunca provisiona colaboradores ou permissões do ERP.
CREATE OR REPLACE FUNCTION public.handle_novo_usuario() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_novo_usuario() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_novo_usuario ON auth.users;
CREATE TRIGGER trg_novo_usuario AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_novo_usuario();

CREATE TABLE public.solicitacoes_mobile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  requisicao_id uuid NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  dados jsonb NOT NULL,
  resumo_itens jsonb NOT NULL,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','aceita','recusada','cancelada')),
  pedido_id uuid UNIQUE REFERENCES public.pedidos(id),
  motivo text,
  decidido_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz,
  UNIQUE (usuario_id, requisicao_id),
  CHECK ((status = 'aceita') = (pedido_id IS NOT NULL))
);
CREATE INDEX solicitacoes_mobile_usuario_idx ON public.solicitacoes_mobile(usuario_id, criado_em DESC);
CREATE INDEX solicitacoes_mobile_fila_idx ON public.solicitacoes_mobile(loja_id, criado_em) WHERE status = 'aguardando';
ALTER TABLE public.solicitacoes_mobile ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitacoes_mobile FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.solicitacoes_mobile TO authenticated;
CREATE POLICY mobile_leitura ON public.solicitacoes_mobile FOR SELECT TO authenticated
  USING (usuario_id = (SELECT auth.uid()) OR erp_privado.tem_permissao('vendas','visualizar',loja_id));

-- Somente dados comerciais do cardápio; não expõe custos, fichas ou clientes.
CREATE FUNCTION erp_privado.cardapio_mobile() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'lojas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'nome',l.nome,'tipo_operacao',l.tipo_operacao) ORDER BY l.nome)
      FROM public.lojas l WHERE l.ativo), '[]'::jsonb),
    'itens', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'sku',p.sku,'nome',p.nome,
      'variacao',v.nome_variacao,'preco',round(v.preco_venda * (1 + c.markup_preco_percentual / 100),2),
      'delivery',p.disponivel_delivery,'presencial',p.disponivel_presencial,
      'adicionais',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nome',a.nome,'preco',a.preco_adicional) ORDER BY a.nome)
        FROM public.adicionais a JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
        WHERE pa.produto_sku=p.sku AND a.ativo AND p.permite_adicionais),'[]'::jsonb)) ORDER BY p.nome,v.nome_variacao)
      FROM public.produtos p JOIN public.produto_variacoes v ON v.produto_sku=p.sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE p.ativo AND v.preco_venda >= 0), '[]'::jsonb)
  );
$$;
CREATE FUNCTION public.cardapio_mobile() RETURNS jsonb LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT erp_privado.cardapio_mobile(); $$;
REVOKE ALL ON FUNCTION erp_privado.cardapio_mobile(), public.cardapio_mobile() FROM PUBLIC;
GRANT USAGE ON SCHEMA erp_privado TO anon;
GRANT EXECUTE ON FUNCTION erp_privado.cardapio_mobile(), public.cardapio_mobile() TO anon, authenticated;

CREATE FUNCTION erp_privado.enviar_mobile(p_requisicao uuid, p_dados jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_usuario uuid := auth.uid(); v_anterior public.solicitacoes_mobile%ROWTYPE;
  v_loja uuid := (p_dados->>'loja_id')::uuid; v_item jsonb; v_extra jsonb;
  v_preco numeric; v_preco_extra numeric; v_total numeric := 0; v_id uuid; v_sku text; v_nome text;
  v_resumo jsonb := '[]';
  v_cpf text := p_dados->>'cpf'; v_soma integer; v_digito integer; v_i integer; v_j integer;
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para enviar o pedido.'; END IF;
  IF p_dados IS NULL OR octet_length(p_dados::text) > 32000 THEN RAISE EXCEPTION 'Pedido excede o limite permitido.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text, 1));
  SELECT * INTO v_anterior FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND requisicao_id=p_requisicao;
  IF FOUND THEN
    IF v_anterior.dados IS DISTINCT FROM p_dados THEN RAISE EXCEPTION 'Reenvio com conteúdo diferente.'; END IF;
    RETURN v_anterior.id;
  END IF;
  IF (SELECT count(*) FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND criado_em > now()-interval '15 minutes') >= 5
    OR (SELECT count(*) FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND status='aguardando') >= 10
    THEN RAISE EXCEPTION 'Limite de solicitações atingido. Aguarde o atendimento da loja.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id=v_loja AND ativo
    AND (p_dados->>'tipo_atendimento'='delivery' OR (p_dados->>'tipo_atendimento'='presencial' AND tipo_operacao='presencial_delivery')))
    THEN RAISE EXCEPTION 'Unidade indisponível para este atendimento.'; END IF;
  IF COALESCE(p_dados->>'forma_pagamento','') NOT IN ('pix','credito','debito','dinheiro')
    OR length(btrim(COALESCE(p_dados->>'nome',''))) NOT BETWEEN 2 AND 120
    OR COALESCE(p_dados->>'telefone','') !~ '^[0-9]{10,11}$'
    OR length(COALESCE(p_dados->>'observacoes','')) > 500 THEN RAISE EXCEPTION 'Confira nome, telefone e pagamento.'; END IF;
  IF COALESCE(v_cpf,'') !~ '^[0-9]{11}$' OR v_cpf ~ '^([0-9])\1{10}$' THEN RAISE EXCEPTION 'CPF inválido.'; END IF;
  FOR v_j IN 9..10 LOOP
    v_soma := 0;
    FOR v_i IN 1..v_j LOOP v_soma := v_soma + substring(v_cpf,v_i,1)::integer * (v_j+2-v_i); END LOOP;
    v_digito := (v_soma*10)%11;
    IF v_digito=10 THEN v_digito:=0; END IF;
    IF v_digito <> substring(v_cpf,v_j+1,1)::integer THEN RAISE EXCEPTION 'CPF inválido.'; END IF;
  END LOOP;
  IF p_dados->>'tipo_atendimento'='delivery' THEN
    IF COALESCE(p_dados->'endereco'->>'cep','') !~ '^[0-9]{8}$'
      OR COALESCE(p_dados->'endereco'->>'estado','') !~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
      OR EXISTS (SELECT 1 FROM unnest(ARRAY['endereco','numero','bairro','cidade']) c
        WHERE length(btrim(COALESCE(p_dados->'endereco'->>c,''))) NOT BETWEEN 1 AND 150)
      THEN RAISE EXCEPTION 'Preencha o endereço completo da entrega.'; END IF;
  END IF;
  IF jsonb_typeof(p_dados->'itens') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Carrinho inválido.'; END IF;
  IF jsonb_array_length(p_dados->'itens') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Informe entre 1 e 50 itens.'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_dados->'itens') LOOP
    IF COALESCE(v_item->>'quantidade','') !~ '^([1-9]|[1-9][0-9])$' THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    SELECT round(v.preco_venda*(1+c.markup_preco_percentual/100),2),p.sku,p.nome || ' · ' || v.nome_variacao INTO v_preco,v_sku,v_nome
      FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE v.id=(v_item->>'variacao_id')::uuid AND p.ativo
        AND ((p_dados->>'tipo_atendimento'='delivery' AND p.disponivel_delivery) OR
             (p_dados->>'tipo_atendimento'='presencial' AND p.disponivel_presencial));
    IF NOT FOUND OR v_preco < 0 OR (v_item->>'preco_unitario')::numeric IS DISTINCT FROM v_preco THEN
      RAISE EXCEPTION 'Preço ou produto alterado. Atualize o cardápio.'; END IF;
    IF jsonb_typeof(v_item->'adicionais') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Adicionais inválidos.'; END IF;
    IF jsonb_array_length(v_item->'adicionais') > 20 OR
      (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(v_item->'adicionais'))
      THEN RAISE EXCEPTION 'Adicionais inválidos ou repetidos.'; END IF;
    FOR v_extra IN SELECT value FROM jsonb_array_elements(v_item->'adicionais') LOOP
      SELECT a.preco_adicional INTO v_preco_extra FROM public.adicionais a
        JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
        JOIN public.produtos p ON p.sku=pa.produto_sku
        WHERE a.id=(v_extra->>'id')::uuid AND pa.produto_sku=v_sku AND a.ativo AND p.permite_adicionais;
      IF NOT FOUND OR v_preco_extra < 0 OR (v_extra->>'preco_unitario')::numeric IS DISTINCT FROM v_preco_extra THEN
        RAISE EXCEPTION 'Adicional ou preço alterado. Atualize o cardápio.'; END IF;
      v_preco := v_preco + v_preco_extra;
    END LOOP;
    v_total := v_total + v_preco * (v_item->>'quantidade')::integer;
    v_resumo := v_resumo || jsonb_build_array(jsonb_build_object('nome',v_nome,'quantidade',v_item->'quantidade','total',v_preco*(v_item->>'quantidade')::integer,
      'adicionais',(SELECT COALESCE(jsonb_agg(a.nome),'[]'::jsonb) FROM public.adicionais a WHERE a.id IN
        (SELECT (value->>'id')::uuid FROM jsonb_array_elements(v_item->'adicionais')))));
  END LOOP;
  IF p_dados->>'forma_pagamento'='dinheiro' AND NULLIF(p_dados->>'troco_para','') IS NOT NULL
    AND (p_dados->>'troco_para')::numeric < v_total THEN RAISE EXCEPTION 'Troco inferior ao subtotal.'; END IF;
  INSERT INTO public.solicitacoes_mobile(usuario_id,requisicao_id,loja_id,dados,resumo_itens,subtotal)
    VALUES(v_usuario,p_requisicao,v_loja,p_dados,v_resumo,v_total) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
CREATE FUNCTION public.enviar_solicitacao_mobile(p_requisicao uuid,p_dados jsonb) RETURNS uuid
LANGUAGE sql SET search_path = '' AS $$ SELECT erp_privado.enviar_mobile(p_requisicao,p_dados); $$;

CREATE FUNCTION erp_privado.decidir_mobile(p_id uuid,p_acao text,p_motivo text,p_cotacao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_s public.solicitacoes_mobile%ROWTYPE; v_pedido uuid; v_dados jsonb; v_cotacao public.cotacoes_entrega%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão obrigatória.'; END IF;
  SELECT * INTO v_s FROM public.solicitacoes_mobile WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação indisponível.'; END IF;
  IF p_acao='cancelar' THEN
    IF v_s.usuario_id <> auth.uid() THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
    IF v_s.status='cancelada' THEN RETURN NULL; END IF;
  ELSIF p_acao IN ('aceitar','recusar') THEN
    IF NOT erp_privado.tem_permissao('vendas','criar',v_s.loja_id) THEN RAISE EXCEPTION 'Sem permissão nesta unidade.'; END IF;
    IF p_acao='aceitar' AND v_s.status='aceita' THEN RETURN v_s.pedido_id; END IF;
    IF p_acao='recusar' AND v_s.status='recusada' THEN RETURN NULL; END IF;
  ELSE RAISE EXCEPTION 'Ação inválida.';
  END IF;
  IF v_s.status <> 'aguardando' THEN RAISE EXCEPTION 'Solicitação já decidida em outra sessão.'; END IF;
  IF p_acao='recusar' AND length(btrim(COALESCE(p_motivo,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Informe o motivo da recusa.'; END IF;
  IF p_acao='aceitar' THEN
    IF v_s.dados->>'tipo_atendimento'='delivery' THEN
      SELECT * INTO v_cotacao FROM public.cotacoes_entrega WHERE id=p_cotacao;
      IF NOT FOUND OR EXISTS (SELECT 1 FROM unnest(ARRAY['cep','estado','endereco','numero','bairro','cidade','complemento']) c
        WHERE btrim(COALESCE(v_cotacao.destino->>c,'')) IS DISTINCT FROM btrim(COALESCE(v_s.dados->'endereco'->>c,'')))
        THEN RAISE EXCEPTION 'Calcule o frete para o endereço desta solicitação.'; END IF;
    END IF;
    -- CPF informado pelo cliente não dá direito de ler ou sobrescrever um cadastro existente.
    INSERT INTO public.clientes(cpf,nome,telefone) VALUES(v_s.dados->>'cpf',v_s.dados->>'nome',v_s.dados->>'telefone') ON CONFLICT(cpf) DO NOTHING;
    v_dados := jsonb_build_object('loja_id',v_s.loja_id,'cliente_cpf',v_s.dados->>'cpf',
      'tipo_atendimento',v_s.dados->>'tipo_atendimento','forma_pagamento',v_s.dados->>'forma_pagamento',
      'canal_venda','proprio','cotacao_entrega_id',p_cotacao,
      'observacoes',v_s.dados->>'observacoes','troco_para',COALESCE(NULLIF(v_s.dados->>'troco_para','')::numeric,v_s.subtotal + COALESCE(v_cotacao.taxa,0)),
      'itens',v_s.dados->'itens');
    v_pedido := public.criar_pedido_transacional(v_s.id,v_dados);
  END IF;
  UPDATE public.solicitacoes_mobile SET status=CASE p_acao WHEN 'aceitar' THEN 'aceita' WHEN 'recusar' THEN 'recusada' ELSE 'cancelada' END,
    pedido_id=v_pedido,motivo=NULLIF(btrim(p_motivo),''),decidido_em=now(),decidido_por=auth.uid() WHERE id=p_id;
  RETURN v_pedido;
END;
$$;
CREATE FUNCTION public.decidir_solicitacao_mobile(p_id uuid,p_acao text,p_motivo text DEFAULT NULL,p_cotacao uuid DEFAULT NULL) RETURNS uuid
LANGUAGE sql SET search_path = '' AS $$ SELECT erp_privado.decidir_mobile(p_id,p_acao,p_motivo,p_cotacao); $$;
REVOKE ALL ON FUNCTION erp_privado.enviar_mobile(uuid,jsonb),public.enviar_solicitacao_mobile(uuid,jsonb),
  erp_privado.decidir_mobile(uuid,text,text,uuid),public.decidir_solicitacao_mobile(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.enviar_mobile(uuid,jsonb),public.enviar_solicitacao_mobile(uuid,jsonb),
  erp_privado.decidir_mobile(uuid,text,text,uuid),public.decidir_solicitacao_mobile(uuid,text,text,uuid) TO authenticated;
CREATE FUNCTION erp_privado.acompanhar_mobile(p_pagina integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.criado_em DESC,t.id),'[]'::jsonb) FROM (
    SELECT s.id,s.status,s.subtotal,s.motivo,s.criado_em,l.nome AS loja,p.status AS etapa,p.valor_total AS total,p.taxa_entrega AS frete
    FROM public.solicitacoes_mobile s JOIN public.lojas l ON l.id=s.loja_id LEFT JOIN public.pedidos p ON p.id=s.pedido_id
    WHERE s.usuario_id=auth.uid() ORDER BY s.criado_em DESC,s.id LIMIT 20 OFFSET least(greatest(COALESCE(p_pagina,0),0),10000)*20
  ) t;
$$;
CREATE FUNCTION public.acompanhar_solicitacoes_mobile(p_pagina integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT erp_privado.acompanhar_mobile(p_pagina); $$;
REVOKE ALL ON FUNCTION erp_privado.acompanhar_mobile(integer),public.acompanhar_solicitacoes_mobile(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.acompanhar_mobile(integer),public.acompanhar_solicitacoes_mobile(integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261025004910_empresas_acesso_frete_cliente.sql
BEGIN;
CREATE TABLE public.empresas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL CHECK(length(btrim(nome)) BETWEEN 2 AND 120),
 slug text UNIQUE NOT NULL CHECK(slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
 cor text NOT NULL DEFAULT '#e4ae65' CHECK(cor ~ '^#[0-9a-fA-F]{6}$'),
 logo_url text CHECK(logo_url IS NULL OR logo_url ~ '^https://'), ativo boolean NOT NULL DEFAULT true
);
INSERT INTO public.empresas(id,nome,slug) VALUES('a0000000-0000-0000-0000-000000000001','Brasa Burger','brasa-burger');
ALTER TABLE public.usuarios ADD COLUMN empresa_id uuid REFERENCES public.empresas(id), ADD COLUMN master boolean NOT NULL DEFAULT false;
UPDATE public.usuarios SET empresa_id='a0000000-0000-0000-0000-000000000001';
UPDATE public.usuarios SET master=true WHERE ativo AND loja_id IS NULL AND perfil_id IN (SELECT id FROM public.perfis WHERE nome='Administrador');
ALTER TABLE public.usuarios ALTER COLUMN empresa_id SET NOT NULL;
CREATE FUNCTION erp_privado.empresa_atual() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT u.empresa_id FROM public.usuarios u JOIN public.empresas e ON e.id=u.empresa_id WHERE u.id=auth.uid() AND u.ativo AND e.ativo;
$$;
CREATE FUNCTION erp_privado.master() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id=auth.uid() AND ativo AND master);
$$;
CREATE FUNCTION erp_privado.admin_empresa() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios u JOIN public.perfis p ON p.id=u.perfil_id WHERE u.id=auth.uid() AND u.ativo AND p.nome='Administrador');
$$;
REVOKE ALL ON FUNCTION erp_privado.empresa_atual(),erp_privado.master(),erp_privado.admin_empresa() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.empresa_atual(),erp_privado.master(),erp_privado.admin_empresa() TO authenticated;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.empresas FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.empresas TO authenticated;
CREATE POLICY empresas_leitura ON public.empresas FOR SELECT TO authenticated USING (id=(SELECT erp_privado.empresa_atual()) OR (SELECT erp_privado.master()));

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['lojas','clientes','produtos','ingredientes','categorias','adicionais','pedidos','cotacoes_entrega'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id)',t);
  EXECUTE format('UPDATE public.%I SET empresa_id=''a0000000-0000-0000-0000-000000000001''',t);
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL, ALTER COLUMN empresa_id SET DEFAULT erp_privado.empresa_atual()',t);
  EXECUTE format('CREATE INDEX ON public.%I(empresa_id)',t);
  EXECUTE format('CREATE POLICY empresa_isolamento ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(empresa_id=(SELECT erp_privado.empresa_atual())) WITH CHECK(empresa_id=(SELECT erp_privado.empresa_atual()))',t);
 END LOOP;
END; $$;
-- CPF identifica o consumidor dentro da empresa, sem misturar cadastros de marcas.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conrelid::regclass AS tabela,conname FROM pg_constraint WHERE confrelid='public.clientes'::regclass AND contype='f' LOOP
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.tabela,c.conname);
 END LOOP;
END; $$;
ALTER TABLE public.clientes DROP CONSTRAINT clientes_pkey;
ALTER TABLE public.clientes ADD PRIMARY KEY(empresa_id,cpf);
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_cliente_cpf_fkey FOREIGN KEY(empresa_id,cliente_cpf) REFERENCES public.clientes(empresa_id,cpf);
ALTER TABLE public.cotacoes_entrega ADD CONSTRAINT cotacoes_entrega_cliente_cpf_fkey FOREIGN KEY(empresa_id,cliente_cpf) REFERENCES public.clientes(empresa_id,cpf);
ALTER TABLE public.cotacoes_entrega ALTER COLUMN empresa_id DROP DEFAULT;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.categorias'::regclass AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (nome)' LOOP
  EXECUTE format('ALTER TABLE public.categorias DROP CONSTRAINT %I',c.conname);
 END LOOP;
END; $$;
ALTER TABLE public.categorias ADD UNIQUE(empresa_id,nome);

CREATE OR REPLACE FUNCTION erp_privado.tem_permissao(p_modulo text,p_acao text,p_loja uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios u JOIN public.perfis pf ON pf.id=u.perfil_id JOIN public.empresas e ON e.id=u.empresa_id
 WHERE u.id=auth.uid() AND u.ativo AND e.ativo
 AND (p_loja IS NULL OR EXISTS(SELECT 1 FROM public.lojas l WHERE l.id=p_loja AND l.empresa_id=u.empresa_id))
 AND (p_loja IS NULL OR u.loja_id IS NULL OR u.loja_id=p_loja)
 AND (pf.nome IN ('Administrador','Gerente') OR (pf.nome='Estoque' AND p_modulo='estoque') OR EXISTS
 (SELECT 1 FROM public.permissoes pe WHERE pe.perfil_id=u.perfil_id AND pe.modulo=p_modulo AND CASE p_acao WHEN 'visualizar' THEN pe.pode_visualizar WHEN 'criar' THEN pe.pode_criar WHEN 'editar' THEN pe.pode_editar ELSE false END)));
$$;
-- Tabelas filhas só podem se relacionar a dados da mesma empresa.
CREATE FUNCTION erp_privado.validar_vinculo_empresa() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_empresa uuid; v_outra uuid;
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'produtos' THEN v_empresa:=NEW.empresa_id; v_outra:=v_empresa;
  IF to_jsonb(NEW)->>'categoria_id' IS NOT NULL THEN SELECT empresa_id INTO v_outra FROM public.categorias WHERE id=(to_jsonb(NEW)->>'categoria_id')::uuid; END IF;
 WHEN 'adicionais' THEN v_empresa:=NEW.empresa_id; v_outra:=v_empresa;
  IF NEW.ingrediente_id IS NOT NULL THEN SELECT empresa_id INTO v_outra FROM public.ingredientes WHERE id=NEW.ingrediente_id; END IF;
 WHEN 'estoque_lojas' THEN SELECT empresa_id INTO v_empresa FROM public.lojas WHERE id=NEW.loja_id; SELECT empresa_id INTO v_outra FROM public.ingredientes WHERE id=NEW.ingrediente_id;
 WHEN 'produto_variacoes' THEN SELECT empresa_id INTO v_empresa FROM public.produtos WHERE sku=NEW.produto_sku; v_outra:=v_empresa;
 WHEN 'fichas_tecnicas' THEN SELECT p.empresa_id INTO v_empresa FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku WHERE v.id=NEW.variacao_id; SELECT empresa_id INTO v_outra FROM public.ingredientes WHERE id=NEW.ingrediente_id;
 WHEN 'produto_adicionais_disponiveis' THEN SELECT empresa_id INTO v_empresa FROM public.produtos WHERE sku=NEW.produto_sku; SELECT empresa_id INTO v_outra FROM public.adicionais WHERE id=NEW.adicional_id;
 WHEN 'itens_pedido' THEN SELECT empresa_id INTO v_empresa FROM public.pedidos WHERE id=NEW.pedido_id; SELECT p.empresa_id INTO v_outra FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku WHERE v.id=NEW.variacao_id AND p.sku=NEW.produto_sku;
 WHEN 'itens_pedido_adicionais' THEN SELECT p.empresa_id INTO v_empresa FROM public.itens_pedido i JOIN public.pedidos p ON p.id=i.pedido_id WHERE i.id=NEW.item_pedido_id; SELECT empresa_id INTO v_outra FROM public.adicionais WHERE id=NEW.adicional_id;
 WHEN 'pedidos','cotacoes_entrega' THEN SELECT empresa_id INTO v_empresa FROM public.lojas WHERE id=NEW.loja_id; NEW.empresa_id:=v_empresa; v_outra:=v_empresa;
 END CASE;
 IF v_empresa IS NULL OR v_empresa IS DISTINCT FROM v_outra THEN RAISE EXCEPTION 'Vínculo entre empresas diferentes não permitido.' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND v_empresa IS DISTINCT FROM erp_privado.empresa_atual() THEN RAISE EXCEPTION 'Sem permissão nesta empresa.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.validar_vinculo_empresa() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['produtos','adicionais','estoque_lojas','produto_variacoes','fichas_tecnicas','produto_adicionais_disponiveis','itens_pedido','itens_pedido_adicionais','pedidos','cotacoes_entrega'] LOOP
  EXECUTE format('CREATE TRIGGER empresa_vinculo BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION erp_privado.validar_vinculo_empresa()',t);
 END LOOP;
END; $$;
-- Restrição adicional em políticas legadas sem remover as regras de módulo/unidade.
CREATE POLICY empresa_variacoes ON public.produto_variacoes AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku)) WITH CHECK(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku));
CREATE POLICY empresa_fichas ON public.fichas_tecnicas AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.produto_variacoes v WHERE v.id=variacao_id)) WITH CHECK(EXISTS(SELECT 1 FROM public.produto_variacoes v WHERE v.id=variacao_id));
CREATE POLICY empresa_adicionais_vinculos ON public.produto_adicionais_disponiveis AS RESTRICTIVE FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku)) WITH CHECK(EXISTS(SELECT 1 FROM public.produtos p WHERE p.sku=produto_sku));
CREATE POLICY empresa_estoque ON public.estoque_lojas AS RESTRICTIVE FOR ALL TO authenticated USING(erp_privado.tem_permissao('estoque','visualizar',loja_id)) WITH CHECK(erp_privado.tem_permissao('estoque','criar',loja_id));
CREATE POLICY empresa_usuarios ON public.usuarios AS RESTRICTIVE FOR SELECT TO authenticated USING(id=auth.uid() OR (empresa_id=(SELECT erp_privado.empresa_atual()) AND (SELECT erp_privado.admin_empresa())));
CREATE POLICY empresa_reposicoes ON public.reposicoes_estoque AS RESTRICTIVE FOR SELECT TO authenticated USING(erp_privado.tem_permissao('estoque','visualizar',loja_id));
DO $$ BEGIN
 IF to_regclass('public.configuracoes_entrega') IS NOT NULL THEN
  EXECUTE 'CREATE POLICY empresa_entrega ON public.configuracoes_entrega AS RESTRICTIVE FOR ALL TO authenticated USING(erp_privado.tem_permissao(''vendas'',''visualizar'',loja_id)) WITH CHECK(erp_privado.tem_permissao(''vendas'',''editar'',loja_id))';
 END IF;
END; $$;
-- RPCs legadas mantêm as regras de negócio e recebem guarda de empresa antes de qualquer leitura/escrita.
DO $$ DECLARE f record; d text; guarda text; BEGIN
 FOR f IN SELECT oid,proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('criar_pedido_transacional','avancar_pedido_transacional','cancelar_pedido_transacional','repor_estoque_transacional','preparar_consulta_rota','editar_variacao','editar_quantidade_ficha') LOOP
  guarda:=CASE f.proname
   WHEN 'criar_pedido_transacional' THEN 'erp_privado.tem_permissao(''vendas'',''criar'',(p_dados->>''loja_id'')::uuid)'
   WHEN 'avancar_pedido_transacional' THEN 'erp_privado.tem_permissao(''vendas'',''editar'',(SELECT loja_id FROM public.pedidos WHERE id=p_pedido)) AND EXISTS(SELECT 1 FROM public.pedidos WHERE id=p_pedido AND empresa_id=erp_privado.empresa_atual())'
   WHEN 'cancelar_pedido_transacional' THEN 'erp_privado.tem_permissao(''vendas'',''editar'',(SELECT loja_id FROM public.pedidos WHERE id=p_pedido)) AND EXISTS(SELECT 1 FROM public.pedidos WHERE id=p_pedido AND empresa_id=erp_privado.empresa_atual())'
   WHEN 'repor_estoque_transacional' THEN 'erp_privado.tem_permissao(''estoque'',''criar'',p_loja)'
   WHEN 'preparar_consulta_rota' THEN 'erp_privado.tem_permissao(''vendas'',''criar'',p_loja)'
   WHEN 'editar_variacao' THEN 'EXISTS(SELECT 1 FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku WHERE v.id=p_id AND p.empresa_id=erp_privado.empresa_atual())'
   ELSE 'EXISTS(SELECT 1 FROM public.fichas_tecnicas ft JOIN public.produto_variacoes v ON v.id=ft.variacao_id JOIN public.produtos p ON p.sku=v.produto_sku WHERE ft.id=p_id AND p.empresa_id=erp_privado.empresa_atual())' END;
  d:=pg_get_functiondef(f.oid);
  d:=regexp_replace(d,'BEGIN\s*','BEGIN ' || 'IF NOT ('||guarda||') THEN RAISE EXCEPTION ''Sem permissão nesta empresa/unidade.'' USING ERRCODE=''42501''; END IF; ');
  EXECUTE d;
 END LOOP;
END; $$;

CREATE FUNCTION erp_privado.administrar(p_acao text,p_dados jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_empresa uuid:=erp_privado.empresa_atual(); v_usuario uuid; v_perfil uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT erp_privado.admin_empresa() THEN RAISE EXCEPTION 'Acesso exclusivo do administrador.' USING ERRCODE='42501'; END IF;
 CASE p_acao
 WHEN 'selecionar_empresa' THEN
  IF NOT erp_privado.master() THEN RAISE EXCEPTION 'Acesso exclusivo da conta master.'; END IF;
  v_id:=(p_dados->>'id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.empresas WHERE id=v_id AND ativo) THEN RAISE EXCEPTION 'Empresa indisponível.'; END IF;
  UPDATE public.usuarios SET empresa_id=v_id,loja_id=NULL WHERE id=auth.uid();
 WHEN 'empresa' THEN
  v_id:=NULLIF(p_dados->>'id','')::uuid;
  IF v_id IS NULL THEN
   IF NOT erp_privado.master() THEN RAISE EXCEPTION 'Acesso exclusivo da conta master.'; END IF;
   INSERT INTO public.empresas(nome,slug,cor,logo_url) VALUES(btrim(p_dados->>'nome'),p_dados->>'slug',COALESCE(p_dados->>'cor','#e4ae65'),NULLIF(p_dados->>'logo_url','')) RETURNING id INTO v_id;
   INSERT INTO public.categorias(empresa_id,nome) SELECT v_id,n FROM unnest(ARRAY['Lanches','Bebidas','Sobremesas','Combos']) n;
  ELSE
   IF v_id<>v_empresa THEN RAISE EXCEPTION 'Selecione a empresa antes de editar.'; END IF;
   UPDATE public.empresas SET nome=btrim(p_dados->>'nome'),cor=p_dados->>'cor',logo_url=NULLIF(p_dados->>'logo_url','') WHERE id=v_id;
  END IF;
 WHEN 'loja' THEN
  v_id:=COALESCE(NULLIF(p_dados->>'id','')::uuid,gen_random_uuid());
  IF length(btrim(COALESCE(p_dados->>'nome',''))) NOT BETWEEN 2 AND 120 OR p_dados->>'tipo_operacao' NOT IN ('presencial_delivery','delivery_only') THEN RAISE EXCEPTION 'Confira nome e operação da unidade.'; END IF;
  INSERT INTO public.lojas(id,empresa_id,nome,slug,tipo_operacao,ativo) VALUES(v_id,v_empresa,btrim(p_dados->>'nome'),v_id::text,p_dados->>'tipo_operacao',COALESCE((p_dados->>'ativo')::boolean,true))
  ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome,tipo_operacao=EXCLUDED.tipo_operacao,ativo=EXCLUDED.ativo WHERE lojas.empresa_id=v_empresa;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão nesta unidade.'; END IF;
 WHEN 'colaborador' THEN
  SELECT id INTO v_usuario FROM auth.users WHERE lower(email)=lower(btrim(p_dados->>'email')) FOR UPDATE;
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'A conta ainda não existe. O colaborador deve cadastrar seu e-mail antes do vínculo.'; END IF;
  IF EXISTS(SELECT 1 FROM public.usuarios WHERE id=v_usuario AND (master OR empresa_id<>v_empresa)) THEN RAISE EXCEPTION 'Conta já vinculada à plataforma ou a outra empresa.'; END IF;
  IF p_dados->>'perfil' NOT IN ('Administrador','Gerente','Operador','Estoque','Visualização') THEN RAISE EXCEPTION 'Perfil inválido.'; END IF;
  IF p_dados->>'perfil'<>'Administrador' AND (NULLIF(p_dados->>'loja_id','') IS NULL OR NOT EXISTS(SELECT 1 FROM public.lojas WHERE id=(p_dados->>'loja_id')::uuid AND empresa_id=v_empresa)) THEN RAISE EXCEPTION 'Selecione a unidade do colaborador.'; END IF;
  SELECT id INTO v_perfil FROM public.perfis WHERE nome=p_dados->>'perfil';
  INSERT INTO public.usuarios(id,nome,email,perfil_id,empresa_id,loja_id,ativo)
   VALUES(v_usuario,btrim(p_dados->>'nome'),lower(btrim(p_dados->>'email')),v_perfil,v_empresa,CASE WHEN p_dados->>'perfil'='Administrador' THEN NULL ELSE (p_dados->>'loja_id')::uuid END,true)
   ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome,perfil_id=EXCLUDED.perfil_id,loja_id=EXCLUDED.loja_id,ativo=true;
  v_id:=v_usuario;
 ELSE RAISE EXCEPTION 'Ação inválida.';
 END CASE;
 RETURN v_id;
END; $$;
CREATE FUNCTION public.administrar_plataforma(p_acao text,p_dados jsonb) RETURNS uuid LANGUAGE sql SET search_path='' AS $$ SELECT erp_privado.administrar(p_acao,p_dados); $$;
REVOKE ALL ON FUNCTION erp_privado.administrar(text,jsonb),public.administrar_plataforma(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION erp_privado.administrar(text,jsonb),public.administrar_plataforma(text,jsonb) TO authenticated;

-- Cotações do consumidor não exigem expor ou criar cadastros internos de clientes.
CREATE TABLE public.cotacoes_mobile (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),usuario_id uuid NOT NULL REFERENCES auth.users(id),loja_id uuid NOT NULL REFERENCES public.lojas(id),
 origem jsonb NOT NULL,destino jsonb NOT NULL,distancia_metros integer NOT NULL CHECK(distancia_metros BETWEEN 1 AND 1000000),
 valor_km numeric(10,2) NOT NULL CHECK(valor_km>0 AND valor_km<=1000),taxa numeric(10,2) NOT NULL CHECK(taxa=round(distancia_metros::numeric*valor_km/1000,2)),
 criado_em timestamptz NOT NULL DEFAULT now(),expira_em timestamptz NOT NULL DEFAULT(now()+interval '15 minutes'),solicitacao_id uuid UNIQUE REFERENCES public.solicitacoes_mobile(id)
);
ALTER TABLE public.cotacoes_mobile ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cotacoes_mobile FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.cotacoes_mobile TO service_role;
CREATE INDEX ON public.cotacoes_mobile(usuario_id,criado_em);
ALTER TABLE public.solicitacoes_mobile ADD COLUMN cotacao_mobile_id uuid UNIQUE REFERENCES public.cotacoes_mobile(id),ADD COLUMN taxa_entrega numeric(10,2) NOT NULL DEFAULT 0;



DROP FUNCTION public.cardapio_mobile();
DROP FUNCTION erp_privado.cardapio_mobile();
CREATE OR REPLACE FUNCTION erp_privado.cardapio_mobile(p_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('empresa',(SELECT jsonb_build_object('nome',nome,'slug',slug,'cor',cor,'logo_url',logo_url) FROM public.empresas WHERE slug=p_slug AND ativo),
    'lojas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'nome',l.nome,'tipo_operacao',l.tipo_operacao) ORDER BY l.nome)
      FROM public.lojas l WHERE l.ativo AND l.empresa_id IN (SELECT id FROM public.empresas WHERE slug=p_slug AND ativo)), '[]'::jsonb),
    'itens', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'sku',p.sku,'nome',p.nome,
      'variacao',v.nome_variacao,'preco',round(v.preco_venda * (1 + c.markup_preco_percentual / 100),2),
      'delivery',p.disponivel_delivery,'presencial',p.disponivel_presencial,
      'adicionais',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nome',a.nome,'preco',a.preco_adicional) ORDER BY a.nome)
        FROM public.adicionais a JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
        WHERE pa.produto_sku=p.sku AND a.ativo AND p.permite_adicionais),'[]'::jsonb)) ORDER BY p.nome,v.nome_variacao)
      FROM public.produtos p JOIN public.produto_variacoes v ON v.produto_sku=p.sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE p.ativo AND v.preco_venda >= 0 AND p.empresa_id IN (SELECT id FROM public.empresas WHERE slug=p_slug AND ativo)), '[]'::jsonb)
  );
$$;
CREATE FUNCTION public.cardapio_mobile(p_slug text DEFAULT 'brasa-burger') RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$ SELECT erp_privado.cardapio_mobile(p_slug); $$;
REVOKE ALL ON FUNCTION erp_privado.cardapio_mobile(text),public.cardapio_mobile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION erp_privado.cardapio_mobile(text),public.cardapio_mobile(text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION erp_privado.enviar_mobile(p_requisicao uuid, p_dados jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_usuario uuid := auth.uid(); v_anterior public.solicitacoes_mobile%ROWTYPE;
  v_loja uuid := (p_dados->>'loja_id')::uuid; v_item jsonb; v_extra jsonb;
  v_preco numeric; v_preco_extra numeric; v_total numeric := 0; v_id uuid; v_sku text; v_nome text;
  v_empresa uuid; v_cotacao public.cotacoes_mobile%ROWTYPE; v_resumo jsonb := '[]';
  v_cpf text := p_dados->>'cpf'; v_soma integer; v_digito integer; v_i integer; v_j integer;
BEGIN
  IF v_usuario IS NULL OR p_requisicao IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para enviar o pedido.'; END IF;
  IF p_dados IS NULL OR octet_length(p_dados::text) > 32000 THEN RAISE EXCEPTION 'Pedido excede o limite permitido.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_usuario::text, 1));
  SELECT * INTO v_anterior FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND requisicao_id=p_requisicao;
  IF FOUND THEN
    IF v_anterior.dados IS DISTINCT FROM p_dados THEN RAISE EXCEPTION 'Reenvio com conteúdo diferente.'; END IF;
    RETURN v_anterior.id;
  END IF;
  IF (SELECT count(*) FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND criado_em > now()-interval '15 minutes') >= 5
    OR (SELECT count(*) FROM public.solicitacoes_mobile WHERE usuario_id=v_usuario AND status='aguardando') >= 10
    THEN RAISE EXCEPTION 'Limite de solicitações atingido. Aguarde o atendimento da loja.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id=v_loja AND ativo
    AND (p_dados->>'tipo_atendimento'='delivery' OR (p_dados->>'tipo_atendimento'='presencial' AND tipo_operacao='presencial_delivery')))
    THEN RAISE EXCEPTION 'Unidade indisponível para este atendimento.'; END IF;
  IF COALESCE(p_dados->>'forma_pagamento','') NOT IN ('pix','credito','debito','dinheiro')
    OR length(btrim(COALESCE(p_dados->>'nome',''))) NOT BETWEEN 2 AND 120
    OR COALESCE(p_dados->>'telefone','') !~ '^[0-9]{10,11}$'
    OR length(COALESCE(p_dados->>'observacoes','')) > 500 THEN RAISE EXCEPTION 'Confira nome, telefone e pagamento.'; END IF;
  IF COALESCE(v_cpf,'') !~ '^[0-9]{11}$' OR v_cpf ~ '^([0-9])\1{10}$' THEN RAISE EXCEPTION 'CPF inválido.'; END IF;
  FOR v_j IN 9..10 LOOP
    v_soma := 0;
    FOR v_i IN 1..v_j LOOP v_soma := v_soma + substring(v_cpf,v_i,1)::integer * (v_j+2-v_i); END LOOP;
    v_digito := (v_soma*10)%11;
    IF v_digito=10 THEN v_digito:=0; END IF;
    IF v_digito <> substring(v_cpf,v_j+1,1)::integer THEN RAISE EXCEPTION 'CPF inválido.'; END IF;
  END LOOP;
  SELECT empresa_id INTO v_empresa FROM public.lojas WHERE id=v_loja;
  IF p_dados->>'tipo_atendimento'='delivery' THEN
    IF COALESCE(p_dados->'endereco'->>'cep','') !~ '^[0-9]{8}$'
      OR COALESCE(p_dados->'endereco'->>'estado','') !~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
      OR EXISTS (SELECT 1 FROM unnest(ARRAY['endereco','numero','bairro','cidade']) c
        WHERE length(btrim(COALESCE(p_dados->'endereco'->>c,''))) NOT BETWEEN 1 AND 150)
      THEN RAISE EXCEPTION 'Preencha o endereço completo da entrega.'; END IF;
  END IF;
  IF jsonb_typeof(p_dados->'itens') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Carrinho inválido.'; END IF;
  IF jsonb_array_length(p_dados->'itens') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Informe entre 1 e 50 itens.'; END IF;
  IF p_dados->>'tipo_atendimento'='delivery' THEN
    SELECT * INTO v_cotacao FROM public.cotacoes_mobile WHERE id=(p_dados->>'cotacao_id')::uuid FOR UPDATE;
    IF NOT FOUND OR v_cotacao.usuario_id<>v_usuario OR v_cotacao.loja_id<>v_loja OR v_cotacao.expira_em<=now() OR v_cotacao.solicitacao_id IS NOT NULL
      OR EXISTS(SELECT 1 FROM unnest(ARRAY['cep','estado','endereco','numero','bairro','cidade','complemento']) c WHERE btrim(COALESCE(v_cotacao.destino->>c,'')) IS DISTINCT FROM btrim(COALESCE(p_dados->'endereco'->>c,'')))
      THEN RAISE EXCEPTION 'Frete expirado ou endereço alterado. Calcule novamente.'; END IF;
  ELSIF p_dados->>'cotacao_id' IS NOT NULL THEN RAISE EXCEPTION 'Retirada não utiliza frete.'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_dados->'itens') LOOP
    IF COALESCE(v_item->>'quantidade','') !~ '^([1-9]|[1-9][0-9])$' THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    SELECT round(v.preco_venda*(1+c.markup_preco_percentual/100),2),p.sku,p.nome || ' · ' || v.nome_variacao INTO v_preco,v_sku,v_nome
      FROM public.produto_variacoes v JOIN public.produtos p ON p.sku=v.produto_sku
      JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
      WHERE v.id=(v_item->>'variacao_id')::uuid AND p.ativo AND p.empresa_id=v_empresa
        AND ((p_dados->>'tipo_atendimento'='delivery' AND p.disponivel_delivery) OR
             (p_dados->>'tipo_atendimento'='presencial' AND p.disponivel_presencial));
    IF NOT FOUND OR v_preco < 0 OR (v_item->>'preco_unitario')::numeric IS DISTINCT FROM v_preco THEN
      RAISE EXCEPTION 'Preço ou produto alterado. Atualize o cardápio.'; END IF;
    IF jsonb_typeof(v_item->'adicionais') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Adicionais inválidos.'; END IF;
    IF jsonb_array_length(v_item->'adicionais') > 20 OR
      (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(v_item->'adicionais'))
      THEN RAISE EXCEPTION 'Adicionais inválidos ou repetidos.'; END IF;
    FOR v_extra IN SELECT value FROM jsonb_array_elements(v_item->'adicionais') LOOP
      SELECT a.preco_adicional INTO v_preco_extra FROM public.adicionais a
        JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
        JOIN public.produtos p ON p.sku=pa.produto_sku
        WHERE a.id=(v_extra->>'id')::uuid AND pa.produto_sku=v_sku AND a.ativo AND p.permite_adicionais;
      IF NOT FOUND OR v_preco_extra < 0 OR (v_extra->>'preco_unitario')::numeric IS DISTINCT FROM v_preco_extra THEN
        RAISE EXCEPTION 'Adicional ou preço alterado. Atualize o cardápio.'; END IF;
      v_preco := v_preco + v_preco_extra;
    END LOOP;
    v_total := v_total + v_preco * (v_item->>'quantidade')::integer;
    v_resumo := v_resumo || jsonb_build_array(jsonb_build_object('nome',v_nome,'quantidade',v_item->'quantidade','total',v_preco*(v_item->>'quantidade')::integer,
      'adicionais',(SELECT COALESCE(jsonb_agg(a.nome),'[]'::jsonb) FROM public.adicionais a WHERE a.id IN
        (SELECT (value->>'id')::uuid FROM jsonb_array_elements(v_item->'adicionais')))));
  END LOOP;
  IF p_dados->>'forma_pagamento'='dinheiro' AND NULLIF(p_dados->>'troco_para','') IS NOT NULL
    AND (p_dados->>'troco_para')::numeric < v_total + COALESCE(v_cotacao.taxa,0) THEN RAISE EXCEPTION 'Troco inferior ao subtotal.'; END IF;
  INSERT INTO public.solicitacoes_mobile(usuario_id,requisicao_id,loja_id,dados,resumo_itens,subtotal,cotacao_mobile_id,taxa_entrega)
    VALUES(v_usuario,p_requisicao,v_loja,p_dados,v_resumo,v_total,v_cotacao.id,COALESCE(v_cotacao.taxa,0)) RETURNING id INTO v_id;
  IF v_cotacao.id IS NOT NULL THEN UPDATE public.cotacoes_mobile SET solicitacao_id=v_id WHERE id=v_cotacao.id; END IF;
  RETURN v_id;
END;
$$;
CREATE OR REPLACE FUNCTION erp_privado.decidir_mobile(p_id uuid,p_acao text,p_motivo text,p_cotacao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_s public.solicitacoes_mobile%ROWTYPE; v_pedido uuid; v_dados jsonb; v_cotacao public.cotacoes_entrega%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão obrigatória.'; END IF;
  SELECT * INTO v_s FROM public.solicitacoes_mobile WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação indisponível.'; END IF;
  IF p_acao='cancelar' THEN
    IF v_s.usuario_id <> auth.uid() THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
    IF v_s.status='cancelada' THEN RETURN NULL; END IF;
  ELSIF p_acao IN ('aceitar','recusar') THEN
    IF NOT erp_privado.tem_permissao('vendas','criar',v_s.loja_id) THEN RAISE EXCEPTION 'Sem permissão nesta unidade.'; END IF;
    IF p_acao='aceitar' AND v_s.status='aceita' THEN RETURN v_s.pedido_id; END IF;
    IF p_acao='recusar' AND v_s.status='recusada' THEN RETURN NULL; END IF;
  ELSE RAISE EXCEPTION 'Ação inválida.';
  END IF;
  IF v_s.status <> 'aguardando' THEN RAISE EXCEPTION 'Solicitação já decidida em outra sessão.'; END IF;
  IF p_acao='recusar' AND length(btrim(COALESCE(p_motivo,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Informe o motivo da recusa.'; END IF;
  IF p_acao='aceitar' THEN
    INSERT INTO public.clientes(cpf,nome,telefone) VALUES(v_s.dados->>'cpf',v_s.dados->>'nome',v_s.dados->>'telefone') ON CONFLICT(empresa_id,cpf) DO NOTHING;
    IF v_s.dados->>'tipo_atendimento'='delivery' AND v_s.cotacao_mobile_id IS NOT NULL THEN
      INSERT INTO public.cotacoes_entrega(usuario_id,loja_id,cliente_cpf,origem,destino,distancia_metros,valor_km,taxa,provedor)
      SELECT auth.uid(),loja_id,v_s.dados->>'cpf',origem,destino,distancia_metros,valor_km,taxa,'openrouteservice' FROM public.cotacoes_mobile WHERE id=v_s.cotacao_mobile_id AND solicitacao_id=v_s.id
      RETURNING * INTO v_cotacao;
      IF NOT FOUND THEN RAISE EXCEPTION 'Frete não confirmado para esta solicitação.'; END IF;
      p_cotacao:=v_cotacao.id;
    END IF;
    IF v_s.dados->>'tipo_atendimento'='delivery' THEN
      SELECT * INTO v_cotacao FROM public.cotacoes_entrega WHERE id=p_cotacao;
      IF NOT FOUND OR EXISTS (SELECT 1 FROM unnest(ARRAY['cep','estado','endereco','numero','bairro','cidade','complemento']) c
        WHERE btrim(COALESCE(v_cotacao.destino->>c,'')) IS DISTINCT FROM btrim(COALESCE(v_s.dados->'endereco'->>c,'')))
        THEN RAISE EXCEPTION 'Calcule o frete para o endereço desta solicitação.'; END IF;
    END IF;
    -- CPF informado pelo cliente não dá direito de ler ou sobrescrever um cadastro existente.
    INSERT INTO public.clientes(cpf,nome,telefone) VALUES(v_s.dados->>'cpf',v_s.dados->>'nome',v_s.dados->>'telefone') ON CONFLICT(empresa_id,cpf) DO NOTHING;
    v_dados := jsonb_build_object('loja_id',v_s.loja_id,'cliente_cpf',v_s.dados->>'cpf',
      'tipo_atendimento',v_s.dados->>'tipo_atendimento','forma_pagamento',v_s.dados->>'forma_pagamento',
      'canal_venda','proprio','cotacao_entrega_id',p_cotacao,
      'observacoes',v_s.dados->>'observacoes','troco_para',COALESCE(NULLIF(v_s.dados->>'troco_para','')::numeric,v_s.subtotal + COALESCE(v_cotacao.taxa,0)),
      'itens',v_s.dados->'itens');
    v_pedido := public.criar_pedido_transacional(v_s.id,v_dados);
  END IF;
  UPDATE public.solicitacoes_mobile SET status=CASE p_acao WHEN 'aceitar' THEN 'aceita' WHEN 'recusar' THEN 'recusada' ELSE 'cancelada' END,
    pedido_id=v_pedido,motivo=NULLIF(btrim(p_motivo),''),decidido_em=now(),decidido_por=auth.uid() WHERE id=p_id;
  RETURN v_pedido;
END;
$$;
CREATE OR REPLACE FUNCTION erp_privado.acompanhar_mobile(p_pagina integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.criado_em DESC,t.id),'[]'::jsonb) FROM (
    SELECT s.id,s.status,s.subtotal,s.taxa_entrega AS frete_estimado,s.motivo,s.criado_em,l.nome AS loja,p.status AS etapa,p.valor_total AS total,p.taxa_entrega AS frete
    FROM public.solicitacoes_mobile s JOIN public.lojas l ON l.id=s.loja_id LEFT JOIN public.pedidos p ON p.id=s.pedido_id
    WHERE s.usuario_id=auth.uid() ORDER BY s.criado_em DESC,s.id LIMIT 20 OFFSET least(greatest(COALESCE(p_pagina,0),0),10000)*20
  ) t;
$$;
CREATE TABLE IF NOT EXISTS public.limites_consulta_rotas(chave text PRIMARY KEY,janela timestamptz NOT NULL,quantidade integer NOT NULL);
ALTER TABLE public.limites_consulta_rotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.limites_consulta_rotas FROM PUBLIC,anon,authenticated;
CREATE FUNCTION erp_privado.preparar_rota_mobile(p_loja uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_config jsonb; v_limite record; v_n integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para calcular o frete.' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(c) INTO v_config FROM public.configuracoes_entrega c JOIN public.lojas l ON l.id=c.loja_id JOIN public.empresas e ON e.id=l.empresa_id WHERE l.id=p_loja AND l.ativo AND e.ativo;
 IF v_config IS NULL THEN RAISE EXCEPTION 'Entrega indisponível nesta unidade.' USING ERRCODE='22023'; END IF;
 FOR v_limite IN SELECT * FROM (VALUES
 ('global:dia',date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',500),
 (auth.uid()::text||':mobile:dia',date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',30),
 (auth.uid()::text||':mobile:minuto',date_trunc('minute',now()),3)) t(chave,janela,maximo) LOOP
 INSERT INTO public.limites_consulta_rotas AS c(chave,janela,quantidade) VALUES(v_limite.chave,v_limite.janela,1)
 ON CONFLICT(chave) DO UPDATE SET janela=EXCLUDED.janela,quantidade=CASE WHEN c.janela=EXCLUDED.janela THEN c.quantidade+1 ELSE 1 END RETURNING quantidade INTO v_n;
 IF v_n>v_limite.maximo THEN RAISE EXCEPTION 'Limite de consultas atingido. Aguarde para tentar novamente.'; END IF;
 END LOOP;
 RETURN v_config;
END; $$;
CREATE FUNCTION public.preparar_consulta_rota_mobile(p_loja uuid) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT erp_privado.preparar_rota_mobile(p_loja); $$;
REVOKE ALL ON FUNCTION public.preparar_consulta_rota_mobile(uuid),erp_privado.preparar_rota_mobile(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preparar_consulta_rota_mobile(uuid),erp_privado.preparar_rota_mobile(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261106015840_cadastro_cpf_tempo_real.sql
BEGIN;

-- CPF identifica o consumidor, nunca concede perfil ou permissão de equipe.
CREATE TABLE erp_privado.contas_consumidor (
 usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 cpf text NOT NULL UNIQUE,
 nome text NOT NULL,
 telefone text NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE erp_privado.tentativas_login_cliente (
 chave text PRIMARY KEY, inicio timestamptz NOT NULL, quantidade integer NOT NULL
);
ALTER TABLE erp_privado.contas_consumidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_privado.tentativas_login_cliente ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON erp_privado.contas_consumidor,erp_privado.tentativas_login_cliente FROM PUBLIC,anon,authenticated;

CREATE FUNCTION erp_privado.validar_cadastro_consumidor(p_cpf text,p_nome text,p_telefone text)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE soma integer; digito integer; i integer; j integer;
BEGIN
 IF COALESCE(p_cpf,'') !~ '^[0-9]{11}$' OR p_cpf ~ '^([0-9])\1{10}$' THEN RAISE EXCEPTION 'Confira o CPF.'; END IF;
 FOR j IN 9..10 LOOP
  soma:=0;
  FOR i IN 1..j LOOP soma:=soma+substring(p_cpf,i,1)::integer*(j+2-i); END LOOP;
  digito:=(soma*10)%11; IF digito=10 THEN digito:=0; END IF;
  IF digito<>substring(p_cpf,j+1,1)::integer THEN RAISE EXCEPTION 'Confira o CPF.'; END IF;
 END LOOP;
 IF length(btrim(COALESCE(p_nome,''))) NOT BETWEEN 2 AND 120 OR COALESCE(p_telefone,'') !~ '^[0-9]{10,11}$' THEN RAISE EXCEPTION 'Confira nome e telefone.'; END IF;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.validar_cadastro_consumidor(text,text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION erp_privado.cadastro_consumidor_auth() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dados jsonb:=NEW.raw_user_meta_data;
BEGIN
 IF dados->>'cpf' IS NOT NULL THEN
  PERFORM erp_privado.validar_cadastro_consumidor(dados->>'cpf',dados->>'nome',dados->>'telefone');
  INSERT INTO erp_privado.contas_consumidor(usuario_id,cpf,nome,telefone)
   VALUES(NEW.id,dados->>'cpf',btrim(dados->>'nome'),dados->>'telefone');
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.cadastro_consumidor_auth() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER cadastro_consumidor_auth AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION erp_privado.cadastro_consumidor_auth();

CREATE FUNCTION public.meu_cadastro_cliente() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('cpf',cpf,'nome',nome,'telefone',telefone)
 FROM erp_privado.contas_consumidor WHERE usuario_id=(SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.meu_cadastro_cliente() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.meu_cadastro_cliente() TO authenticated;

-- Migração voluntária de contas já existentes. CPF vinculado é imutável pela API.
CREATE FUNCTION public.cadastrar_perfil_cliente(p_cpf text,p_nome text,p_telefone text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE atual text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta.'; END IF;
 PERFORM erp_privado.validar_cadastro_consumidor(p_cpf,p_nome,p_telefone);
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,713));
 SELECT cpf INTO atual FROM erp_privado.contas_consumidor WHERE usuario_id=auth.uid();
 IF atual IS NOT NULL AND atual<>p_cpf THEN RAISE EXCEPTION 'Use o CPF vinculado à sua conta.'; END IF;
 BEGIN
  INSERT INTO erp_privado.contas_consumidor(usuario_id,cpf,nome,telefone)
  VALUES(auth.uid(),p_cpf,btrim(p_nome),p_telefone)
  ON CONFLICT(usuario_id) DO UPDATE SET nome=excluded.nome,telefone=excluded.telefone;
 EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Não foi possível vincular este CPF. Confira sua conta ou contate a loja.';
 END;
 RETURN public.meu_cadastro_cliente();
END; $$;
REVOKE ALL ON FUNCTION public.cadastrar_perfil_cliente(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cadastrar_perfil_cliente(text,text,text) TO authenticated;

-- Somente o servidor resolve CPF em e-mail. Nenhum navegador recebe esta consulta.
CREATE FUNCTION public.preparar_login_cliente(p_cpf text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tentativas integer; email_login text;
BEGIN
 IF COALESCE(p_cpf,'') !~ '^[0-9]{11}$' THEN RETURN NULL; END IF;
 DELETE FROM erp_privado.tentativas_login_cliente WHERE inicio<now()-interval '1 day';
 INSERT INTO erp_privado.tentativas_login_cliente(chave,inicio,quantidade) VALUES(md5(p_cpf),now(),1)
 ON CONFLICT(chave) DO UPDATE SET
 quantidade=CASE WHEN tentativas_login_cliente.inicio<now()-interval '5 minutes' THEN 1 ELSE tentativas_login_cliente.quantidade+1 END,
 inicio=CASE WHEN tentativas_login_cliente.inicio<now()-interval '5 minutes' THEN now() ELSE tentativas_login_cliente.inicio END
 RETURNING quantidade INTO tentativas;
 IF tentativas>10 THEN RETURN '__limite__'; END IF;
 SELECT u.email INTO email_login FROM erp_privado.contas_consumidor c JOIN auth.users u ON u.id=c.usuario_id WHERE c.cpf=p_cpf;
 RETURN email_login;
END; $$;
REVOKE ALL ON FUNCTION public.preparar_login_cliente(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.preparar_login_cliente(text) TO service_role;

CREATE FUNCTION erp_privado.conferir_cpf_solicitacao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cpf_conta text;
BEGIN
 SELECT cpf INTO cpf_conta FROM erp_privado.contas_consumidor WHERE usuario_id=NEW.usuario_id;
 IF cpf_conta IS NOT NULL AND cpf_conta IS DISTINCT FROM NEW.dados->>'cpf' THEN RAISE EXCEPTION 'Use o CPF vinculado à sua conta.'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.conferir_cpf_solicitacao() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER conferir_cpf_solicitacao BEFORE INSERT ON public.solicitacoes_mobile FOR EACH ROW EXECUTE FUNCTION erp_privado.conferir_cpf_solicitacao();

-- Aviso mínimo para atualizar o acompanhamento sem abrir o pedido interno ao consumidor.
CREATE TABLE public.eventos_pedidos_cliente (
 usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos_pedidos_cliente ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventos_pedidos_cliente FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.eventos_pedidos_cliente TO authenticated;
CREATE POLICY evento_do_titular ON public.eventos_pedidos_cliente FOR SELECT TO authenticated USING(usuario_id=(SELECT auth.uid()));
CREATE FUNCTION erp_privado.notificar_status_consumidor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  INSERT INTO public.eventos_pedidos_cliente(usuario_id,atualizado_em)
   SELECT usuario_id,clock_timestamp() FROM public.solicitacoes_mobile WHERE pedido_id=NEW.id
  ON CONFLICT(usuario_id) DO UPDATE SET atualizado_em=excluded.atualizado_em;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.notificar_status_consumidor() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notificar_status_consumidor AFTER UPDATE OF status ON public.pedidos FOR EACH ROW EXECUTE FUNCTION erp_privado.notificar_status_consumidor();

-- A publicação transporta somente linhas permitidas pelas políticas já existentes.
DO $$ DECLARE tabela text;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH tabela IN ARRAY ARRAY['solicitacoes_mobile','pedidos','itens_pedido','eventos_pedidos_cliente'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=tabela) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',tabela);
   END IF;
  END LOOP;
 END IF;
END; $$;
NOTIFY pgrst,'reload schema';
COMMIT;



-- FONTE: supabase/migrations/20261111223639_cadastro_cpf_sem_email.sql
BEGIN;
CREATE FUNCTION public.reservar_cadastro_cliente(p_chave text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE total integer;
BEGIN
 IF p_chave IS NULL OR length(p_chave)>500 THEN RETURN false; END IF;
 DELETE FROM erp_privado.tentativas_login_cliente WHERE inicio<now()-interval '1 day';
 INSERT INTO erp_privado.tentativas_login_cliente(chave,inicio,quantidade) VALUES('cadastro:'||md5(p_chave),now(),1)
 ON CONFLICT(chave) DO UPDATE SET
 quantidade=CASE WHEN tentativas_login_cliente.inicio<now()-interval '1 hour' THEN 1 ELSE tentativas_login_cliente.quantidade+1 END,
 inicio=CASE WHEN tentativas_login_cliente.inicio<now()-interval '1 hour' THEN now() ELSE tentativas_login_cliente.inicio END
 RETURNING quantidade INTO total;
 RETURN total<=60;
END; $$;
REVOKE ALL ON FUNCTION public.reservar_cadastro_cliente(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_cadastro_cliente(text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;



-- FONTE: sql/instalacao/finalizar.sql
-- Somente instalação nova: aplicar após todos os arquivos do manifesto.
-- Não afrouxa as RLS nem reabre gravação direta de pedido/estoque.
BEGIN;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.lojas, public.clientes, public.ingredientes,
 public.produtos, public.produto_variacoes, public.fichas_tecnicas,
 public.estoque_lojas, public.pedidos, public.itens_pedido,
 public.itens_pedido_adicionais, public.adicionais,
 public.produto_adicionais_disponiveis, public.categorias,
 public.configuracoes_canal, public.configuracoes_pagamento TO authenticated;
GRANT INSERT, UPDATE ON public.clientes, public.ingredientes,
 public.produtos, public.produto_variacoes, public.fichas_tecnicas,
 public.adicionais, public.produto_adicionais_disponiveis, public.categorias TO authenticated;
GRANT INSERT ON public.estoque_lojas TO authenticated;
-- Estruturas legadas sem módulo/isolamento próprio ficam fechadas.
REVOKE ALL ON public.fornecedores, public.cervejas_detalhes,
 public.torneiras_chopp FROM PUBLIC,anon,authenticated;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cervejas_detalhes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneiras_chopp ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF to_regclass('public.historico_estoque') IS NOT NULL THEN
  REVOKE ALL ON public.historico_estoque FROM PUBLIC,anon,authenticated;
  ALTER TABLE public.historico_estoque ENABLE ROW LEVEL SECURITY;
 END IF;
END; $$;

-- Operação de implantação pelo dono do banco, nunca por RPC pública.
CREATE FUNCTION erp_privado.provisionar_primeiro_master(p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_perfil uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM public.usuarios WHERE master) THEN
  RAISE EXCEPTION 'Já existe master. Utilize a administração existente.';
 END IF;
 SELECT id INTO v_id FROM auth.users WHERE lower(email)=lower(btrim(p_email));
 IF v_id IS NULL THEN RAISE EXCEPTION 'Crie primeiro a conta no Supabase Auth.'; END IF;
 SELECT id INTO v_perfil FROM public.perfis WHERE nome='Administrador';
 INSERT INTO public.usuarios(id,nome,email,perfil_id,empresa_id,loja_id,ativo,master)
 VALUES(v_id,'Administrador da plataforma',btrim(p_email),v_perfil,
  'a0000000-0000-0000-0000-000000000001',NULL,true,true);
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION erp_privado.provisionar_primeiro_master(text) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
