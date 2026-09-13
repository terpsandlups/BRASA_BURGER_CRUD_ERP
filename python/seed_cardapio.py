"""
Seed do cardápio completo do Point do Lanche.
Rodar DEPOIS de seed_data.py (assume lojas, categorias base e estoque já existentes).

Uso:
    export SUPABASE_URL="https://xxxx.supabase.co"
    export SUPABASE_KEY="sua-service-role-key"
    python seed_cardapio.py
"""
import os
from supabase import create_client

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_KEY"]
supabase = create_client(url, key)


# ------------------------------------------------------------------
# 1. CATEGORIAS (complementa as 4 já criadas em seed_data.py)
# ------------------------------------------------------------------
NOVAS_CATEGORIAS = [
    {"nome": "Smash Burgers", "ordem": 5},
    {"nome": "Burgers Artesanais", "ordem": 6},
    {"nome": "Monte Seu Burger", "ordem": 7},
    {"nome": "Burgers Especiais", "ordem": 8},
    {"nome": "Acompanhamentos", "ordem": 9},
    {"nome": "Croquetas", "ordem": 10},
    {"nome": "Porções", "ordem": 11},
    {"nome": "Sanduíches", "ordem": 12},
    {"nome": "Cervejas Artesanais", "ordem": 13},
    {"nome": "Chopp", "ordem": 14},
]

# ------------------------------------------------------------------
# 2. FORNECEDORES
# ------------------------------------------------------------------
FORNECEDORES = [
    {"nome": "Distribuidora Carnes Premium", "categoria_fornecimento": "proteinas"},
    {"nome": "Laticínios Serra Fina",         "categoria_fornecimento": "laticinios"},
    {"nome": "Cervejaria Regional Distribuidora", "categoria_fornecimento": "cervejaria"},
    {"nome": "Hortifruti Bom Sabor",          "categoria_fornecimento": "hortifruti"},
    {"nome": "Padaria Artesanal do Bairro",   "categoria_fornecimento": "panificacao"},
]

# ------------------------------------------------------------------
# 3. NOVOS INGREDIENTES
# ------------------------------------------------------------------
NOVOS_INGREDIENTES = [
    {"nome": "Pastrami Fatiado",         "unidade_medida": "g",  "custo_unitario": 0.095, "categoria": "proteina"},
    {"nome": "Mussarela Empanada (un)",  "unidade_medida": "un", "custo_unitario": 3.20,  "categoria": "laticinio"},
    {"nome": "Hambúrguer Vegano (un)",   "unidade_medida": "un", "custo_unitario": 4.50,  "categoria": "proteina_vegetal"},
    {"nome": "Pão Ciabatta",             "unidade_medida": "un", "custo_unitario": 2.10,  "categoria": "pao"},
    {"nome": "Pão Alemão (Pretzel)",     "unidade_medida": "un", "custo_unitario": 2.60,  "categoria": "pao"},
    {"nome": "Stracciatella",            "unidade_medida": "g",  "custo_unitario": 0.070, "categoria": "laticinio"},
    {"nome": "Molho Pesto",              "unidade_medida": "g",  "custo_unitario": 0.045, "categoria": "molho"},
    {"nome": "Mortadela Fatiada",        "unidade_medida": "g",  "custo_unitario": 0.032, "categoria": "proteina"},
    {"nome": "Presunto Alemão",          "unidade_medida": "g",  "custo_unitario": 0.068, "categoria": "proteina"},
    {"nome": "Mostarda Alemã",           "unidade_medida": "g",  "custo_unitario": 0.028, "categoria": "molho"},
    {"nome": "Chucrute",                 "unidade_medida": "g",  "custo_unitario": 0.020, "categoria": "hortifruti"},
    {"nome": "Batata Congelada Palito",  "unidade_medida": "g",  "custo_unitario": 0.012, "categoria": "acompanhamento"},
    {"nome": "Páprica Defumada",         "unidade_medida": "g",  "custo_unitario": 0.060, "categoria": "tempero"},
    {"nome": "Massa de Croqueta Base",   "unidade_medida": "g",  "custo_unitario": 0.018, "categoria": "acompanhamento"},
    {"nome": "Gorgonzola",               "unidade_medida": "g",  "custo_unitario": 0.085, "categoria": "laticinio"},
    {"nome": "Milho Verde",              "unidade_medida": "g",  "custo_unitario": 0.015, "categoria": "hortifruti"},
    {"nome": "Pepper Jack Fatia",        "unidade_medida": "g",  "custo_unitario": 0.042, "categoria": "laticinio"},
    {"nome": "Jalapeño Fatiado",         "unidade_medida": "g",  "custo_unitario": 0.030, "categoria": "hortifruti"},
    {"nome": "Molho Barbecue",           "unidade_medida": "g",  "custo_unitario": 0.025, "categoria": "molho"},
    {"nome": "Maionese Picante",         "unidade_medida": "g",  "custo_unitario": 0.026, "categoria": "molho"},
    {"nome": "Cebola Crispy",            "unidade_medida": "g",  "custo_unitario": 0.048, "categoria": "hortifruti"},
    # Insumos de revenda direta (cerveja/bebida/sobremesa) — 1 unidade = o próprio item
    {"nome": "Insumo Revenda - Cerveja Garrafa",  "unidade_medida": "un", "custo_unitario": 9.50,  "categoria": "revenda"},
    {"nome": "Insumo Revenda - Refrigerante Lata","unidade_medida": "un", "custo_unitario": 3.20,  "categoria": "revenda"},
    {"nome": "Insumo Revenda - Água",             "unidade_medida": "un", "custo_unitario": 1.80,  "categoria": "revenda"},
    {"nome": "Insumo Revenda - Água Tônica",      "unidade_medida": "un", "custo_unitario": 4.10,  "categoria": "revenda"},
    {"nome": "Insumo Revenda - Chá Gelado",       "unidade_medida": "un", "custo_unitario": 4.50,  "categoria": "revenda"},
    {"nome": "Insumo Revenda - Sorvete Pote",     "unidade_medida": "un", "custo_unitario": 12.00, "categoria": "revenda"},
    {"nome": "Insumo Revenda - Chopp Litro",      "unidade_medida": "ml", "custo_unitario": 0.018, "categoria": "revenda"},
]

# ------------------------------------------------------------------
# 4. PRODUTOS (sku, nome, categoria_nome, subcategoria, descricao, flags)
# ------------------------------------------------------------------
PRODUTOS = [
    # -------- SMASH BURGERS --------
    {"sku": "SM001", "nome": "Smash Clássico", "categoria_nome": "Smash Burgers", "subcategoria": "Smash",
     "descricao": "Smash simples, cheddar, molho da casa e picles no pão brioche."},
    {"sku": "SM002", "nome": "Smash BBQ Bacon", "categoria_nome": "Smash Burgers", "subcategoria": "Smash",
     "descricao": "Smash com bacon crocante, cheddar duplo e molho barbecue defumado."},
    {"sku": "SM003", "nome": "Smash Pepper Jack", "categoria_nome": "Smash Burgers", "subcategoria": "Smash",
     "descricao": "Smash com pepper jack, jalapeño e maionese picante."},
    {"sku": "LAN002", "nome": "Smash Duplo", "categoria_nome": "Smash Burgers", "subcategoria": "Smash",
     "descricao": "Duas carnes smash, queijo cheddar e cebola caramelizada.", "existente": True},

    # -------- BURGERS ARTESANAIS 150g --------
    {"sku": "ART001", "nome": "Artesanal Serra Fina", "categoria_nome": "Burgers Artesanais", "subcategoria": "Artesanal",
     "descricao": "150g de blend artesanal, queijo serra fina e cebola caramelizada."},
    {"sku": "ART002", "nome": "Artesanal Trufado", "categoria_nome": "Burgers Artesanais", "subcategoria": "Artesanal",
     "descricao": "150g artesanal com maionese trufada e queijo gruyère."},
    {"sku": "ART003", "nome": "Artesanal do Bairro", "categoria_nome": "Burgers Artesanais", "subcategoria": "Artesanal",
     "descricao": "150g artesanal, bacon, cheddar e molho da casa."},
    {"sku": "LAN001", "nome": "Hambúrguer Artesanal", "categoria_nome": "Burgers Artesanais", "subcategoria": "Artesanal",
     "descricao": "Blend artesanal, queijo cheddar e molho da casa no brioche.", "existente": True},

    # -------- MONTE SEU BURGER (base 200g, personalizável) --------
    {"sku": "MSB001", "nome": "Monte Seu Burger — Base 200g", "categoria_nome": "Monte Seu Burger",
     "subcategoria": "Monte Seu Burger", "permite_adicionais": True,
     "descricao": "Hambúrguer artesanal 200g no pão brioche. Monte do seu jeito com os adicionais."},

    # -------- ESPECIAIS --------
    {"sku": "ESP001", "nome": "Green Smash Vegano", "categoria_nome": "Burgers Especiais", "subcategoria": "Vegano",
     "descricao": "Hambúrguer vegano, queijo vegano, molho da casa vegano.", "vegano": True, "vegetariano": True,
     "contem_lactose": False},
    {"sku": "ESP002", "nome": "Mozzarella Crocante", "categoria_nome": "Burgers Especiais", "subcategoria": "Mussarela Empanada",
     "descricao": "Mussarela empanada crocante como protagonista, rúcula e molho especial."},

    # -------- ACOMPANHAMENTOS --------
    {"sku": "BAT001", "nome": "Batata Frita da Casa", "categoria_nome": "Acompanhamentos", "subcategoria": "Batata",
     "descricao": "Batata frita da casa com páprica defumada."},

    # -------- CROQUETAS --------
    {"sku": "CRO001", "nome": "Croqueta de Pastrami", "categoria_nome": "Croquetas", "subcategoria": "Croqueta"},
    {"sku": "CRO002", "nome": "Croqueta Milho com Gorgonzola", "categoria_nome": "Croquetas", "subcategoria": "Croqueta",
     "vegetariano": True},
    {"sku": "CRO003", "nome": "Croqueta de Bacon", "categoria_nome": "Croquetas", "subcategoria": "Croqueta"},
    {"sku": "CRO004", "nome": "Croqueta de Pesto", "categoria_nome": "Croquetas", "subcategoria": "Croqueta",
     "vegetariano": True},

    # -------- PORÇÕES --------
    {"sku": "POR001", "nome": "Onion Rings da Casa", "categoria_nome": "Porções", "subcategoria": "Porção",
     "descricao": "Anéis de cebola empanados, molho barbecue.", "vegetariano": True},
    {"sku": "POR002", "nome": "Tábua de Frios & Queijos", "categoria_nome": "Porções", "subcategoria": "Porção",
     "descricao": "Seleção de frios e queijos artesanais para compartilhar."},
    {"sku": "POR003", "nome": "Batata Rústica com Bacon e Cheddar", "categoria_nome": "Porções", "subcategoria": "Porção"},

    # -------- SANDUÍCHES --------
    {"sku": "SAND001", "nome": "Sandwich de Pastrami", "categoria_nome": "Sanduíches", "subcategoria": "Sandwich",
     "descricao": "Pastrami fatiado no pão ciabatta. Queijo disponível como adicional.", "permite_adicionais": True},
    {"sku": "SAND002", "nome": "Mortadella Burrata", "categoria_nome": "Sanduíches", "subcategoria": "Sandwich",
     "descricao": "Mortadela, stracciatella e pesto no pão ciabatta — apresentação premium."},
    {"sku": "SAND003", "nome": "Frankfurt Alemão", "categoria_nome": "Sanduíches", "subcategoria": "Sandwich",
     "descricao": "Presunto alemão, mostarda alemã e chucrute no pão pretzel."},
]

# ------------------------------------------------------------------
# 5. VARIAÇÕES (sku -> lista de variações)
# ------------------------------------------------------------------
VARIACOES = {
    "SM001": [{"nome_variacao": "Único", "preco_venda": 19.90, "padrao": True}],
    "SM002": [{"nome_variacao": "Único", "preco_venda": 24.90, "padrao": True}],
    "SM003": [{"nome_variacao": "Único", "preco_venda": 23.90, "padrao": True}],
    "ART001": [{"nome_variacao": "150g", "preco_venda": 27.90, "padrao": True}],
    "ART002": [{"nome_variacao": "150g", "preco_venda": 31.90, "padrao": True}],
    "ART003": [{"nome_variacao": "150g", "preco_venda": 28.90, "padrao": True}],
    "MSB001": [{"nome_variacao": "200g", "preco_venda": 26.90, "padrao": True}],
    "ESP001": [{"nome_variacao": "Único", "preco_venda": 25.90, "padrao": True}],
    "ESP002": [{"nome_variacao": "Único", "preco_venda": 24.90, "padrao": True}],
    "BAT001": [
        {"nome_variacao": "Individual", "preco_venda": 16.90, "padrao": True},
        {"nome_variacao": "Para compartilhar", "preco_venda": 26.90, "padrao": False},
    ],
    "CRO001": [{"nome_variacao": "Porção (6 un)", "preco_venda": 22.90, "padrao": True}],
    "CRO002": [{"nome_variacao": "Porção (6 un)", "preco_venda": 20.90, "padrao": True}],
    "CRO003": [{"nome_variacao": "Porção (6 un)", "preco_venda": 21.90, "padrao": True}],
    "CRO004": [{"nome_variacao": "Porção (6 un)", "preco_venda": 20.90, "padrao": True}],
    "POR001": [{"nome_variacao": "Único", "preco_venda": 24.90, "padrao": True}],
    "POR002": [{"nome_variacao": "Único", "preco_venda": 39.90, "padrao": True}],
    "POR003": [{"nome_variacao": "Único", "preco_venda": 29.90, "padrao": True}],
    "SAND001": [{"nome_variacao": "Único", "preco_venda": 26.90, "padrao": True}],
    "SAND002": [{"nome_variacao": "Único", "preco_venda": 29.90, "padrao": True}],
    "SAND003": [{"nome_variacao": "Único", "preco_venda": 27.90, "padrao": True}],
}

# ------------------------------------------------------------------
# 6. FICHAS TÉCNICAS — (sku, nome_variacao) -> [(ingrediente, qtd)]
# ------------------------------------------------------------------
FICHAS_TECNICAS = {
    ("SM001", "Único"): [("Carne Smash", 90), ("Queijo Cheddar Fatia", 20), ("Pão Brioche", 1),
                          ("Molho Especial da Casa", 15)],
    ("SM002", "Único"): [("Carne Smash", 90), ("Bacon em Cubos", 40), ("Queijo Cheddar Fatia", 40),
                          ("Pão Brioche", 1), ("Molho Barbecue", 20)],
    ("SM003", "Único"): [("Carne Smash", 90), ("Pepper Jack Fatia", 20), ("Jalapeño Fatiado", 15),
                          ("Pão Brioche", 1), ("Maionese Picante", 15)],
    ("ART001", "150g"): [("Carne Artesanal", 150), ("Queijo Cheddar Fatia", 20), ("Pão Brioche", 1),
                          ("Cebola Caramelizada", 25)],
    ("ART002", "150g"): [("Carne Artesanal", 150), ("Stracciatella", 30), ("Pão Ciabatta", 1),
                          ("Molho Especial da Casa", 15)],
    ("ART003", "150g"): [("Carne Artesanal", 150), ("Bacon em Cubos", 40), ("Queijo Cheddar Fatia", 20),
                          ("Pão Brioche", 1), ("Molho Especial da Casa", 15)],
    ("MSB001", "200g"): [("Carne Artesanal", 200), ("Pão Brioche", 1)],   # base — adicionais entram à parte
    ("ESP001", "Único"): [("Hambúrguer Vegano (un)", 1), ("Pão Brioche", 1), ("Alface Americana", 10),
                           ("Tomate", 15)],
    ("ESP002", "Único"): [("Mussarela Empanada (un)", 2), ("Pão Ciabatta", 1), ("Molho Especial da Casa", 15)],
    ("BAT001", "Individual"): [("Batata Congelada Palito", 200), ("Páprica Defumada", 3)],
    ("BAT001", "Para compartilhar"): [("Batata Congelada Palito", 400), ("Páprica Defumada", 6)],
    ("CRO001", "Porção (6 un)"): [("Massa de Croqueta Base", 240), ("Pastrami Fatiado", 60)],
    ("CRO002", "Porção (6 un)"): [("Massa de Croqueta Base", 240), ("Milho Verde", 60), ("Gorgonzola", 40)],
    ("CRO003", "Porção (6 un)"): [("Massa de Croqueta Base", 240), ("Bacon em Cubos", 60)],
    ("CRO004", "Porção (6 un)"): [("Massa de Croqueta Base", 240), ("Molho Pesto", 40)],
    ("POR001", "Único"): [("Batata Congelada Palito", 250), ("Molho Barbecue", 30)],
    ("POR002", "Único"): [("Mortadela Fatiada", 100), ("Presunto Alemão", 100), ("Queijo Cheddar Fatia", 100),
                           ("Gorgonzola", 80)],
    ("POR003", "Único"): [("Batata Congelada Palito", 300), ("Bacon em Cubos", 60), ("Queijo Cheddar Fatia", 60)],
    ("SAND001", "Único"): [("Pastrami Fatiado", 120), ("Pão Ciabatta", 1), ("Mostarda Alemã", 10)],
    ("SAND002", "Único"): [("Mortadela Fatiada", 100), ("Stracciatella", 50), ("Molho Pesto", 20),
                            ("Pão Ciabatta", 1)],
    ("SAND003", "Único"): [("Presunto Alemão", 100), ("Mostarda Alemã", 15), ("Chucrute", 60),
                            ("Pão Alemão (Pretzel)", 1)],
}

# ------------------------------------------------------------------
# 7. ADICIONAIS (Monte Seu Burger e afins)
# ------------------------------------------------------------------
ADICIONAIS = [
    {"nome": "Cheddar", "categoria": "queijo", "ingrediente_nome": "Queijo Cheddar Fatia", "preco_adicional": 4.00},
    {"nome": "Mussarela", "categoria": "queijo", "ingrediente_nome": "Mussarela Empanada (un)", "preco_adicional": 4.50},
    {"nome": "Bacon extra", "categoria": "proteina", "ingrediente_nome": "Bacon em Cubos", "preco_adicional": 6.00},
    {"nome": "Pastrami", "categoria": "proteina", "ingrediente_nome": "Pastrami Fatiado", "preco_adicional": 8.00},
    {"nome": "Cebola caramelizada", "categoria": "complemento", "ingrediente_nome": "Cebola Caramelizada", "preco_adicional": 3.00},
    {"nome": "Picles", "categoria": "complemento", "ingrediente_nome": "Chucrute", "preco_adicional": 2.50},
    {"nome": "Molho da casa extra", "categoria": "molho", "ingrediente_nome": "Molho Especial da Casa", "preco_adicional": 2.00},
    {"nome": "Maionese picante", "categoria": "molho", "ingrediente_nome": "Maionese Picante", "preco_adicional": 2.00},
]

# Produtos que aceitam adicionais (além do Monte Seu Burger)
PRODUTO_ADICIONAIS = {
    "MSB001": ["Cheddar", "Mussarela", "Bacon extra", "Pastrami", "Cebola caramelizada", "Picles",
               "Molho da casa extra", "Maionese picante"],
    "SAND001": ["Cheddar"],
}

# ------------------------------------------------------------------
# 8. CERVEJAS ARTESANAIS (garrafa — produtos de revenda)
# ------------------------------------------------------------------
CERVEJAS = [
    {"sku": "CERV001", "nome": "IPA Serra Dourada 500ml", "cervejaria": "Cervejaria Serra Dourada",
     "estilo": "IPA", "abv": 6.2, "ibu": 55, "volume_ml": 500, "preco_venda": 22.90},
    {"sku": "CERV002", "nome": "Pilsen Vale Verde 355ml", "cervejaria": "Cervejaria Vale Verde",
     "estilo": "Pilsen", "abv": 4.8, "ibu": 18, "volume_ml": 355, "preco_venda": 14.90},
    {"sku": "CERV003", "nome": "Weiss Bosque Alto 500ml", "cervejaria": "Cervejaria Bosque Alto",
     "estilo": "Weissbier", "abv": 5.4, "ibu": 12, "volume_ml": 500, "preco_venda": 19.90},
]

# ------------------------------------------------------------------
# 9. CHOPP (torneiras)
# ------------------------------------------------------------------
CHOPP = [
    {"sku": "CHOPP01", "nome": "Chopp Pilsen Vale Verde", "numero_torneira": 1,
     "cervejaria": "Cervejaria Vale Verde", "estilo": "Pilsen", "preco_300": 9.90, "preco_500": 15.90},
    {"sku": "CHOPP02", "nome": "Chopp IPA Serra Dourada", "numero_torneira": 2,
     "cervejaria": "Cervejaria Serra Dourada", "estilo": "IPA", "preco_300": 12.90, "preco_500": 19.90},
    {"sku": "CHOPP03", "nome": "Chopp Weiss Bosque Alto", "numero_torneira": 3,
     "cervejaria": "Cervejaria Bosque Alto", "estilo": "Weissbier", "preco_300": 11.90, "preco_500": 18.90},
    {"sku": "CHOPP04", "nome": "Chopp Vinho Rústico", "numero_torneira": 4,
     "cervejaria": "Cervejaria Regional", "estilo": "Red Ale", "preco_300": 11.90, "preco_500": 18.90},
]

# ------------------------------------------------------------------
# 10. BEBIDAS NÃO ALCOÓLICAS E SOBREMESAS (revenda simples)
# ------------------------------------------------------------------
REVENDA_SIMPLES = [
    {"sku": "BEB001", "nome": "Refrigerante Lata", "categoria_nome": "Bebidas", "preco_venda": 7.90,
     "ingrediente_nome": "Insumo Revenda - Refrigerante Lata"},
    {"sku": "BEB002", "nome": "Água sem Gás", "categoria_nome": "Bebidas", "preco_venda": 5.50,
     "ingrediente_nome": "Insumo Revenda - Água"},
    {"sku": "BEB003", "nome": "Água com Gás", "categoria_nome": "Bebidas", "preco_venda": 6.50,
     "ingrediente_nome": "Insumo Revenda - Água"},
    {"sku": "BEB004", "nome": "Água Tônica", "categoria_nome": "Bebidas", "preco_venda": 9.90,
     "ingrediente_nome": "Insumo Revenda - Água Tônica"},
    {"sku": "BEB005", "nome": "Chá Gelado", "categoria_nome": "Bebidas", "preco_venda": 8.90,
     "ingrediente_nome": "Insumo Revenda - Chá Gelado"},
    {"sku": "SOB001", "nome": "Sorvete Artesanal (pote)", "categoria_nome": "Sobremesas", "preco_venda": 18.90,
     "ingrediente_nome": "Insumo Revenda - Sorvete Pote"},
]


def buscar_mapa(tabela, campo_nome="nome"):
    resp = supabase.table(tabela).select(f"id, {campo_nome}").execute()
    return {row[campo_nome]: row["id"] for row in resp.data}


def seed():
    print("Inserindo novas categorias...")
    cat_existentes = buscar_mapa("categorias")
    novas = [c for c in NOVAS_CATEGORIAS if c["nome"] not in cat_existentes]
    if novas:
        supabase.table("categorias").insert(novas).execute()
    cat_por_nome = buscar_mapa("categorias")

    print("Inserindo fornecedores...")
    supabase.table("fornecedores").insert(FORNECEDORES).execute()

    print("Inserindo novos ingredientes...")
    supabase.table("ingredientes").insert(NOVOS_INGREDIENTES).execute()
    ing_por_nome = buscar_mapa("ingredientes")

    print("Inserindo produtos do cardápio...")
    produtos_para_inserir = []
    for p in PRODUTOS:
        if p.get("existente"):
            continue  # já existe desde seed_data.py — só usado para vínculo de categoria/variações
        produtos_para_inserir.append({
            "sku": p["sku"],
            "nome": p["nome"],
            "categoria_id": cat_por_nome[p["categoria_nome"]],
            "subcategoria": p.get("subcategoria"),
            "descricao": p.get("descricao"),
            "permite_adicionais": p.get("permite_adicionais", False),
            "vegano": p.get("vegano", False),
            "vegetariano": p.get("vegetariano", False),
            "contem_lactose": p.get("contem_lactose", True),
        })
    if produtos_para_inserir:
        supabase.table("produtos").insert(produtos_para_inserir).execute()

    # Atualiza categoria/subcategoria dos produtos que já existiam (LAN001, LAN002)
    for p in PRODUTOS:
        if p.get("existente"):
            supabase.table("produtos").update({
                "categoria_id": cat_por_nome[p["categoria_nome"]],
                "subcategoria": p.get("subcategoria"),
            }).eq("sku", p["sku"]).execute()

    print("Inserindo variações...")
    variacao_ids = {}
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
                "ingrediente_id": ing_por_nome[ingrediente_nome],
                "peso_quantidade": peso,
            })
    supabase.table("fichas_tecnicas").insert(fichas).execute()

    print("Inserindo adicionais...")
    adicionais_para_inserir = [
        {"nome": a["nome"], "categoria": a["categoria"],
         "ingrediente_id": ing_por_nome[a["ingrediente_nome"]], "preco_adicional": a["preco_adicional"]}
        for a in ADICIONAIS
    ]
    supabase.table("adicionais").insert(adicionais_para_inserir).execute()
    adicional_por_nome = buscar_mapa("adicionais")

    print("Vinculando adicionais disponíveis por produto...")
    vinculos = []
    for sku, nomes_adicionais in PRODUTO_ADICIONAIS.items():
        for nome in nomes_adicionais:
            vinculos.append({"produto_sku": sku, "adicional_id": adicional_por_nome[nome]})
    supabase.table("produto_adicionais_disponiveis").insert(vinculos).execute()

    print("Inserindo cervejas artesanais (garrafa)...")
    for c in CERVEJAS:
        supabase.table("produtos").insert({
            "sku": c["sku"], "nome": c["nome"],
            "categoria_id": cat_por_nome["Cervejas Artesanais"],
            "subcategoria": c["estilo"],
        }).execute()
        v = supabase.table("produto_variacoes").insert({
            "produto_sku": c["sku"], "nome_variacao": "Único", "preco_venda": c["preco_venda"], "padrao": True,
        }).execute()
        supabase.table("fichas_tecnicas").insert({
            "variacao_id": v.data[0]["id"],
            "ingrediente_id": ing_por_nome["Insumo Revenda - Cerveja Garrafa"],
            "peso_quantidade": 1,
        }).execute()
        supabase.table("cervejas_detalhes").insert({
            "produto_sku": c["sku"], "cervejaria": c["cervejaria"], "estilo": c["estilo"],
            "abv": c["abv"], "ibu": c["ibu"], "volume_ml": c["volume_ml"],
        }).execute()

    print("Inserindo chopp (produtos + torneiras)...")
    for ch in CHOPP:
        supabase.table("produtos").insert({
            "sku": ch["sku"], "nome": ch["nome"],
            "categoria_id": cat_por_nome["Chopp"], "subcategoria": ch["estilo"],
        }).execute()
        for nome_var, preco in [("300ml", ch["preco_300"]), ("500ml", ch["preco_500"])]:
            v = supabase.table("produto_variacoes").insert({
                "produto_sku": ch["sku"], "nome_variacao": nome_var, "preco_venda": preco,
                "padrao": nome_var == "300ml",
            }).execute()
            volume = 300 if nome_var == "300ml" else 500
            supabase.table("fichas_tecnicas").insert({
                "variacao_id": v.data[0]["id"],
                "ingrediente_id": ing_por_nome["Insumo Revenda - Chopp Litro"],
                "peso_quantidade": volume,
            }).execute()
        supabase.table("torneiras_chopp").insert({
            "numero_torneira": ch["numero_torneira"], "produto_sku": ch["sku"],
            "cervejaria": ch["cervejaria"], "estilo": ch["estilo"],
        }).execute()

    print("Inserindo bebidas não alcoólicas e sobremesas...")
    for r in REVENDA_SIMPLES:
        supabase.table("produtos").insert({
            "sku": r["sku"], "nome": r["nome"], "categoria_id": cat_por_nome[r["categoria_nome"]],
        }).execute()
        v = supabase.table("produto_variacoes").insert({
            "produto_sku": r["sku"], "nome_variacao": "Único", "preco_venda": r["preco_venda"], "padrao": True,
        }).execute()
        supabase.table("fichas_tecnicas").insert({
            "variacao_id": v.data[0]["id"],
            "ingrediente_id": ing_por_nome[r["ingrediente_nome"]],
            "peso_quantidade": 1,
        }).execute()

    print("Ampliando estoque das lojas para os novos insumos...")
    lojas_resp = supabase.table("lojas").select("id").execute()
    ing_novos_resp = supabase.table("ingredientes").select("id").in_(
        "nome", [i["nome"] for i in NOVOS_INGREDIENTES]
    ).execute()
    estoque = [
        {"loja_id": loja["id"], "ingrediente_id": ing["id"],
         "quantidade_disponivel": 20000, "quantidade_minima": 2000}
        for loja in lojas_resp.data for ing in ing_novos_resp.data
    ]
    supabase.table("estoque_lojas").insert(estoque).execute()

    print("Seed do cardápio concluído.")


if __name__ == "__main__":
    seed()
