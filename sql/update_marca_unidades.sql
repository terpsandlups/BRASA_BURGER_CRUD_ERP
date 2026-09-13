-- ============================================================
-- ATUALIZAÇÃO DE MARCA — Point do Lanche → Brasa Burguer
-- Roda direto no seu banco Supabase JÁ POPULADO (não precisa
-- recriar nada, só atualiza os nomes das 3 unidades existentes).
-- ============================================================

UPDATE lojas SET
    nome = 'Brasa Burguer - Unidade Japy',
    slug = 'japy',
    endereco = 'Rua José Amaro Pereira, 340 - Jardim Japy, Jundiaí - SP'
WHERE slug = 'centro';

UPDATE lojas SET
    nome = 'Brasa Burguer - Unidade Retiro',
    slug = 'retiro',
    endereco = 'Cozinha delivery - Bairro Retiro, Jundiaí - SP'
WHERE slug = 'zona-norte';

UPDATE lojas SET
    nome = 'Brasa Burguer - Unidade Eloy',
    slug = 'eloy',
    endereco = 'Cozinha delivery - Jardim Eloy, Jundiaí - SP'
WHERE slug = 'zona-sul';

-- Confere o resultado:
SELECT id, nome, slug, tipo_operacao, endereco FROM lojas;
