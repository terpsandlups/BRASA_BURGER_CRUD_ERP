"""
Seed de dados realistas para o Sistema de Gestão - Rede de Lanchonetes.
Popula: lojas, categorias, ingredientes, produtos, variações e fichas técnicas.
Pré-requisito: rodar sql/schema.sql e sql/migration_fase1.sql antes deste script.

Uso:
    export SUPABASE_URL="https://xxxx.supabase.co"
    export SUPABASE_KEY="sua-service-role-key"
    python seed_data.py
"""
import os
from supabase import create_client

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_KEY"]
supabase = create_client(url, key)


# ------------------------------------------------------------------
# 1. LOJAS — 1 presencial+delivery, 2 delivery-only
# ------------------------------------------------------------------
LOJAS = [
    {"nome": "Point do Lanche - Centro",   "slug": "centro",      "tipo_operacao": "presencial_delivery",
     "endereco": "Rua das Flores, 120 - Centro"},
    {"nome": "Point do Lanche - Zona Norte", "slug": "zona-norte", "tipo_operacao": "delivery_only",
     "endereco": "Cozinha fantasma - Zona Norte"},
    {"nome": "Point do Lanche - Zona Sul",   "slug": "zona-sul",   "tipo_operacao": "delivery_only",
     "endereco": "Cozinha fantasma - Zona Sul"},
]

# ------------------------------------------------------------------
# 2. INGREDIENTES — custo unitário por grama/ml/unidade
# ------------------------------------------------------------------
INGREDIENTES = [
    {"nome": "Carne Smash",            "unidade_medida": "g",  "custo_unitario": 0.045, "categoria": "proteina"},
    {"nome": "Carne Artesanal",        "unidade_medida": "g",  "custo_unitario": 0.052, "categoria": "proteina"},
    {"nome": "Queijo Cheddar Fatia",   "unidade_medida": "g",  "custo_unitario": 0.038, "categoria": "laticinio"},
    {"nome": "Bacon em Cubos",         "unidade_medida": "g",  "custo_unitario": 0.061, "categoria": "proteina"},
    {"nome": "Pão Brioche",            "unidade_medida": "un", "custo_unitario": 1.80,  "categoria": "pao"},
    {"nome": "Molho Especial da Casa", "unidade_medida": "g",  "custo_unitario": 0.022, "categoria": "molho"},
    {"nome": "Alface Americana",       "unidade_medida": "g",  "custo_unitario": 0.008, "categoria": "hortifruti"},
    {"nome": "Tomate",                 "unidade_medida": "g",  "custo_unitario": 0.010, "categoria": "hortifruti"},
    {"nome": "Cebola Caramelizada",    "unidade_medida": "g",  "custo_unitario": 0.015, "categoria": "hortifruti"},
    {"nome": "Embalagem Delivery",     "unidade_medida": "un", "custo_unitario": 1.20,  "categoria": "embalagem"},
]

# ------------------------------------------------------------------
# 3. PRODUTOS (categoria resolvida em runtime a partir da tabela categorias)
# ------------------------------------------------------------------
PRODUTOS = [
    {"sku": "LAN001", "nome": "Hambúrguer Artesanal", "categoria_nome": "Lanches",
     "descricao": "Blend artesanal, queijo cheddar e molho da casa no brioche."},
    {"sku": "LAN002", "nome": "Smash Duplo",          "categoria_nome": "Lanches",
     "descricao": "Duas carnes smash, queijo cheddar e cebola caramelizada."},
    {"sku": "LAN003", "nome": "Bacon Cheese",         "categoria_nome": "Lanches",
     "descricao": "Carne artesanal, bacon crocante e dobro de queijo."},
]

# ------------------------------------------------------------------
# 4. VARIAÇÕES (pesos pré-definidos, conforme padrão informado)
# ------------------------------------------------------------------
VARIACOES = {
    "LAN001": [
        {"nome_variacao": "150g", "preco_venda": 24.90, "padrao": True},
        {"nome_variacao": "200g", "preco_venda": 29.90, "padrao": False},
    ],
    "LAN002": [
        {"nome_variacao": "Smash 56g", "preco_venda": 22.90, "padrao": True},
        {"nome_variacao": "Smash 90g", "preco_venda": 27.90, "padrao": False},
    ],
    "LAN003": [
        {"nome_variacao": "Único", "preco_venda": 26.90, "padrao": True},
    ],
}

# ------------------------------------------------------------------
# 5. FICHAS TÉCNICAS — peso pré-pesado por variação
# chave: (sku, nome_variacao) -> lista de (ingrediente, quantidade)
# ------------------------------------------------------------------
FICHAS_TECNICAS = {
    ("LAN001", "150g"): [
        ("Carne Artesanal", 150), ("Queijo Cheddar Fatia", 20), ("Pão Brioche", 1),
        ("Molho Especial da Casa", 15), ("Alface Americana", 10), ("Tomate", 15),
    ],
    ("LAN001", "200g"): [
        ("Carne Artesanal", 200), ("Queijo Cheddar Fatia", 20), ("Pão Brioche", 1),
        ("Molho Especial da Casa", 15), ("Alface Americana", 10), ("Tomate", 15),
    ],
    ("LAN002", "Smash 56g"): [
        ("Carne Smash", 56), ("Queijo Cheddar Fatia", 20), ("Pão Brioche", 1),
        ("Cebola Caramelizada", 25), ("Molho Especial da Casa", 15),
    ],
    ("LAN002", "Smash 90g"): [
        ("Carne Smash", 90), ("Queijo Cheddar Fatia", 20), ("Pão Brioche", 1),
        ("Cebola Caramelizada", 25), ("Molho Especial da Casa", 15),
    ],
    ("LAN003", "Único"): [
        ("Carne Artesanal", 180), ("Bacon em Cubos", 50), ("Queijo Cheddar Fatia", 40),
        ("Pão Brioche", 1), ("Molho Especial da Casa", 15),
    ],
}


def seed():
    print("Inserindo lojas...")
    lojas_resp = supabase.table("lojas").insert(LOJAS).execute()
    lojas_by_slug = {l["slug"]: l["id"] for l in lojas_resp.data}

    print("Inserindo ingredientes...")
    ing_resp = supabase.table("ingredientes").insert(INGREDIENTES).execute()
    ing_by_nome = {i["nome"]: i["id"] for i in ing_resp.data}

    print("Inserindo produtos...")
    cat_resp = supabase.table("categorias").select("id, nome").execute()
    cat_by_nome = {c["nome"]: c["id"] for c in cat_resp.data}
    produtos_com_categoria = [
        {"sku": p["sku"], "nome": p["nome"], "descricao": p["descricao"],
         "categoria_id": cat_by_nome[p["categoria_nome"]]}
        for p in PRODUTOS
    ]
    supabase.table("produtos").insert(produtos_com_categoria).execute()

    print("Inserindo variações...")
    variacao_ids = {}  # (sku, nome_variacao) -> id
    for sku, variacoes in VARIACOES.items():
        for v in variacoes:
            row = {**v, "produto_sku": sku}
            resp = supabase.table("produto_variacoes").insert(row).execute()
            variacao_ids[(sku, v["nome_variacao"])] = resp.data[0]["id"]

    print("Inserindo fichas técnicas...")
    fichas = []
    for (sku, nome_var), itens in FICHAS_TECNICAS.items():
        variacao_id = variacao_ids[(sku, nome_var)]
        for ingrediente_nome, peso in itens:
            fichas.append({
                "variacao_id": variacao_id,
                "ingrediente_id": ing_by_nome[ingrediente_nome],
                "peso_quantidade": peso,
            })
    supabase.table("fichas_tecnicas").insert(fichas).execute()

    print("Inicializando estoque por loja (100 unidades/g de cada ingrediente x 1000)...")
    estoque = []
    for loja_id in lojas_by_slug.values():
        for ingrediente_id in ing_by_nome.values():
            estoque.append({
                "loja_id": loja_id,
                "ingrediente_id": ingrediente_id,
                "quantidade_disponivel": 20000,
                "quantidade_minima": 2000,
            })
    supabase.table("estoque_lojas").insert(estoque).execute()

    print("Seed concluído.")


if __name__ == "__main__":
    seed()
