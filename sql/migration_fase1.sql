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
