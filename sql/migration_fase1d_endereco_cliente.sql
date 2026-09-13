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
