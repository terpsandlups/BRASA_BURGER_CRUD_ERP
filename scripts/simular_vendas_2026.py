"""Histórico SINTÉTICO: prévia por padrão; --aplicar grava em uma transação.

Python 3.10+. DATABASE_URL ou --supabase-cli/--project-ref. Nunca usa Auth
admin/service_role nem modifica clientes ou pedidos comerciais existentes.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import os
from pathlib import Path
import random
import re
import subprocess
import sys
import tempfile
import unicodedata
from uuid import UUID, uuid5, NAMESPACE_URL

CENT = Decimal('0.01')
FUSO = timezone(timedelta(hours=-3), 'America/Sao_Paulo')  # período 2026 sem horário de verão
VERSAO = 1


def dinheiro(valor):
    return Decimal(str(valor)).quantize(CENT, rounding=ROUND_HALF_UP)


def texto(valor):
    return ''.join(c for c in unicodedata.normalize('NFD', valor.lower()) if not unicodedata.combining(c))


def literal(valor):
    # Strings SQL escapadas explicitamente, inclusive barras. Identificadores
    # das tabelas/colunas são constantes do programa, nunca entrada do usuário.
    return "E'" + str(valor).replace('\\', '\\\\').replace("'", "''") + "'"


def json_sql(valor):
    return literal(json.dumps(valor, ensure_ascii=True, separators=(',', ':'), default=str)) + '::jsonb'


def consulta_catalogo(marca):
    return f"""SELECT jsonb_build_object(
      'empresa',(SELECT jsonb_build_object('id',id,'slug',slug) FROM public.empresas WHERE slug={literal(marca)} AND ativo),
      'lojas',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.nome) FROM
        (SELECT l.id,l.nome,l.slug,l.tipo_operacao FROM public.lojas l JOIN public.empresas e ON e.id=l.empresa_id WHERE e.slug={literal(marca)} AND l.ativo) t),
      'produtos',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.sku,t.id) FROM
        (SELECT p.sku,p.nome,c.nome AS categoria,v.id,v.nome_variacao,v.preco_venda,p.disponivel_delivery,p.disponivel_presencial
         FROM public.produtos p JOIN public.empresas e ON e.id=p.empresa_id JOIN public.produto_variacoes v ON v.produto_sku=p.sku
         LEFT JOIN public.categorias c ON c.id=p.categoria_id WHERE e.slug={literal(marca)} AND p.ativo AND v.preco_venda>0) t),
      'canais',(SELECT jsonb_object_agg(canal_venda,markup_preco_percentual) FROM public.configuracoes_canal),
      'pagamentos',(SELECT jsonb_agg(forma_pagamento ORDER BY forma_pagamento) FROM public.configuracoes_pagamento)
    ) AS catalogo;"""


class Banco:
    def __init__(self, url=None, cli=None, projeto=None):
        self.cli, self.projeto, self.conexao = cli, projeto, None
        if cli:
            if not projeto or not re.fullmatch(r'[a-z]{20}', projeto):
                raise ValueError('Informe --project-ref válido para o CLI já autenticado.')
        else:
            if not url:
                raise ValueError('Defina DATABASE_URL ou informe --supabase-cli e --project-ref.')
            import psycopg
            # Nunca exibir a URL, pois ela pode conter a senha do banco.
            self.conexao = psycopg.connect(url, autocommit=True, connect_timeout=15, client_encoding='UTF8', application_name='convivium-simulador')

    def executar(self, sql):
        if self.cli:
            with tempfile.TemporaryDirectory(prefix='convivium-sim-') as pasta:
                arquivo = Path(pasta) / 'consulta.sql'
                arquivo.write_text(sql, encoding='utf-8')
                resposta = subprocess.run([self.cli, 'db', 'query', '--linked', '--project-ref', self.projeto,
                    '--file', str(arquivo), '--output-format', 'json'], capture_output=True, text=True, encoding='utf-8', timeout=240)
                if resposta.returncode:
                    # CLI pode retornar SQL/detalhes das linhas. Não imprimir PII.
                    raise RuntimeError('Resposta do CLI inconclusiva. Consulte a execução antes de reenviar; confira permissões, constraints e logs privados do banco.')
                linhas = json.loads(resposta.stdout).get('rows', [])
                return next(iter(linhas[0].values())) if linhas else None
        with self.conexao.cursor() as cursor:
            cursor.execute(sql, prepare=False)
            ultimo = None
            while True:
                if cursor.description:
                    linhas = cursor.fetchall()
                    if linhas:
                        ultimo = linhas[0][0]
                if not cursor.nextset():
                    break
            return ultimo

    def fechar(self):
        if self.conexao:
            self.conexao.close()


def familia(produto):
    cat = texto(produto.get('categoria') or '')
    nome = texto(produto['nome'])
    if any(p in cat for p in ('bebida', 'cerveja', 'chopp')):
        return 'bebida'
    if any(p in cat for p in ('sobremesa', 'doce')):
        return 'sobremesa'
    if any(p in cat for p in ('acompanhamento', 'porco', 'croqueta')) or 'batata' in nome:
        return 'acompanhamento'
    return 'principal'


def preparar_catalogo(catalogo):
    if not catalogo.get('empresa') or not catalogo.get('produtos'):
        raise ValueError('Empresa ativa e produtos com variação/preço são obrigatórios.')
    lojas = []
    for parte in ('retiro', 'jap', 'eloy'):
        achadas = [l for l in catalogo.get('lojas', []) if parte in texto(l['nome'] + ' ' + (l.get('slug') or ''))]
        if len(achadas) != 1:
            raise ValueError(f'Identifique uma única unidade ativa para {parte}.')
        lojas.extend(achadas)
    if sum(l['tipo_operacao'] != 'delivery_only' for l in lojas) != 1:
        raise ValueError('A simulação do piloto exige exatamente uma unidade presencial; confira o cadastro.')
    produtos = sorted(catalogo['produtos'], key=lambda p: (p['sku'], str(p['id'])))
    # ABC por SKU (não por variação), aplicada dentro de cada família de cesta.
    for grupo in ('principal', 'bebida', 'acompanhamento', 'sobremesa'):
        skus = sorted({p['sku'] for p in produtos if familia(p) == grupo})
        a, b = max(1, round(len(skus) * .2)), max(1, round(len(skus) * .3))
        for p in produtos:
            if p['sku'] not in skus:
                continue
            pos = skus.index(p['sku'])
            classe = 'A' if pos < a else 'B' if pos < a+b else 'C'
            n = a if classe == 'A' else min(b, len(skus)-a) if classe == 'B' else len(skus)-a-b
            variacoes = sum(q['sku'] == p['sku'] for q in produtos)
            p['classe_abc'] = classe
            p['peso'] = {'A': .78, 'B': .17, 'C': .05}[classe] / max(n, 1) / variacoes
    return lojas, produtos


def cpf_sintetico(execucao, indice):
    # Dígitos verificadores deliberadamente inválidos: não representa documento
    # de pessoa real nem permite ativação Auth por CPF destes clientes de teste.
    base = f'{int(hashlib.sha256(f"{execucao}:{indice}".encode()).hexdigest()[:14],16) % 10**9:09d}'
    numero = base
    for tamanho in (9, 10):
        digito = (sum(int(v)*(tamanho+1-i) for i,v in enumerate(numero)) * 10) % 11
        numero += str(0 if digito == 10 else digito)
    return numero[:-1] + str((int(numero[-1])+1) % 10)


def peso_dia(dia):
    semana = [0.65, .70, .85, 1, 1.65, 1.95, 1.55][dia.weekday()]
    sazonal = .83 + .035 * dia.month
    evento = 1.30 if (dia.month, dia.day) in {(2,14),(5,10),(6,12),(8,9),(10,12),(11,20)} else 1
    return semana * sazonal * evento


def gerar_plano(catalogo, vendas=9000, clientes=600, inicio=date(2026,1,1), fim=date(2026,11,22), seed=20261122, execucao='aula-2026-9000'):
    if not 1 <= clientes <= vendas <= 100000 or clientes > 10000 or inicio > fim:
        raise ValueError('Confira volume e datas (até 100 mil vendas; pelo menos uma venda por novo cliente).')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{2,59}', execucao):
        raise ValueError('Execução deve ter 3–60 letras minúsculas, números ou hífen.')
    lojas, produtos = preparar_catalogo(catalogo)
    empresa = catalogo['empresa']['id']
    assinatura = hashlib.sha256(json.dumps({'versao':VERSAO,'empresa':empresa,'lojas':lojas,'produtos':produtos,
        'canais':catalogo['canais'],'pagamentos':catalogo['pagamentos'],'vendas':vendas,'clientes':clientes,'inicio':str(inicio),'fim':str(fim),'seed':seed},sort_keys=True,default=str).encode()).hexdigest()[:20]
    marcador = f'[SIMULACAO:{execucao}:{assinatura}]'
    namespace = uuid5(NAMESPACE_URL, 'convivium/' + empresa + '/' + execucao)
    rng = random.Random(seed)
    dias = [inicio + timedelta(days=i) for i in range((fim-inicio).days + 1)]
    pesos_dias = [peso_dia(dia) for dia in dias]
    novas_contas = []
    cpfs = set()
    for i in range(clientes):
        cpf = cpf_sintetico(execucao, i)
        if cpf in cpfs:
            raise ValueError('Colisão de CPF sintético; troque a semente/execução.')
        cpfs.add(cpf)
        novas_contas.append({'empresa_id':empresa,'cpf':cpf,'nome':f'[SIM] Cliente {i+1:04d} · {execucao}',
            'telefone':'00000000000','email':f'{uuid5(namespace,"cliente/"+str(i))}@simulacao.convivium.invalid',
            'loja_cadastro_id':lojas[i % 3]['id'], 'data_cadastro':datetime.combine(inicio,time(9),FUSO).isoformat()})
    # Presencial tem 40%; duas unidades delivery têm 30% cada.
    alvo_lojas = []
    for l in lojas:
        qtd = round(vendas * (.4 if l['tipo_operacao'] != 'delivery_only' else .3))
        alvo_lojas.extend([l] * qtd)
    alvo_lojas = (alvo_lojas + [lojas[0]] * vendas)[:vendas]
    rng.shuffle(alvo_lojas)
    canais = [c for c in ('proprio','ifood','rappi') if c in catalogo['canais']]
    pagamentos = [p for p in ('pix','credito','debito','dinheiro') if p in catalogo['pagamentos']]
    if 'proprio' not in canais or not pagamentos:
        raise ValueError('Canal próprio e forma de pagamento cadastrados são obrigatórios.')
    pesos_clientes = [1 / (i+10)**.55 for i in range(clientes)]
    pedidos, itens = [], []
    for i, loja in enumerate(alvo_lojas):
        dia = rng.choices(dias, pesos_dias)[0]
        presencial = loja['tipo_operacao'] != 'delivery_only' and rng.random() < .74
        tipo = 'presencial' if presencial else 'delivery'
        canal = 'proprio' if presencial else rng.choices(canais, [{'proprio':.59,'ifood':.32,'rappi':.09}[c] for c in canais])[0]
        hora = rng.choices([11,12,13,18,19,20,21,22],[.3,.6,.4,1,2.5,3,2,1] if presencial else [.05,.1,.05,1,2.5,3,2,1])[0]
        criado = datetime.combine(dia,time(hora,rng.randrange(60),rng.randrange(60)),FUSO)
        pedido_id = str(uuid5(namespace, f'pedido/{i}'))
        conta = novas_contas[i if i < clientes else rng.choices(range(clientes),pesos_clientes)[0]]
        habilitados = [p for p in produtos if p.get('disponivel_'+tipo, True)]
        cesta = Counter()
        pessoas = rng.choices([1,2,3,4],[.57-.008*dia.month,.30,.10,.03+.008*dia.month])[0]
        for grupo, qtd in [('principal',pessoas),('bebida',pessoas if rng.random()<.79 else 0),
                           ('acompanhamento',max(1,round(pessoas/2)) if rng.random()<.66 else 0),
                           ('sobremesa',1 if rng.random()<(.10+.01*dia.month) else 0)]:
            opcoes = [p for p in habilitados if familia(p)==grupo]
            if grupo=='principal' and not opcoes:
                raise ValueError(f'Falta produto principal disponível para {tipo}.')
            for _ in range(qtd if opcoes else 0):
                escolhido = rng.choices(opcoes,[p['peso'] for p in opcoes])[0]
                cesta[str(escolhido['id'])] += 1
        subtotal = Decimal(0)
        markup = Decimal(str(catalogo['canais'][canal])) / 100 + 1
        for j, (variacao_id, quantidade) in enumerate(sorted(cesta.items())):
            produto = next(p for p in produtos if str(p['id'])==variacao_id)
            preco = dinheiro(Decimal(str(produto['preco_venda'])) * markup)
            subtotal += preco * quantidade
            itens.append({'id':str(uuid5(namespace,f'item/{i}/{j}')),'pedido_id':pedido_id,'produto_sku':produto['sku'],
                          'variacao_id':variacao_id,'quantidade':quantidade,'preco_unitario':str(preco)})
        # Histórico sem chamadas de geocodificação: frete é hipótese sintética,
        # discriminado no pedido. Nunca fabricar uma cotação oficial de rota.
        frete = dinheiro(rng.uniform(4,15)) if tipo=='delivery' and canal=='proprio' else Decimal('0.00')
        total = dinheiro(subtotal+frete)
        pagamento = rng.choices(pagamentos,[{'pix':.48,'credito':.28,'debito':.18,'dinheiro':.06}[p] for p in pagamentos])[0]
        pedidos.append({'id':pedido_id,'empresa_id':empresa,'loja_id':loja['id'],'cliente_cpf':conta['cpf'],
            'tipo_atendimento':tipo,'canal_venda':canal,'forma_pagamento':pagamento,'status':'entregue',
            'valor_total':str(total),'taxa_entrega':str(frete),'observacoes':marcador+' Histórico didático; preços/custos atuais; frete sintético.',
            'criado_em':criado.isoformat(),'atualizado_em':(criado+timedelta(minutes=rng.randrange(18,65))).isoformat(),
            'troco_para':str((total/10).to_integral_value(rounding='ROUND_CEILING')*10) if pagamento=='dinheiro' else None,
            'estoque_rastreado':False})
    return {'execucao':execucao,'assinatura':assinatura,'marcador':marcador,'empresa':empresa,
            'inicio':str(inicio),'fim':str(fim),'seed':seed,'clientes':novas_contas,'pedidos':pedidos,'itens':itens,
            'lojas':lojas,'abc':{p['sku']:p['classe_abc'] for p in produtos}}


TIPOS = {
 'clientes':'empresa_id uuid,cpf char(11),nome text,telefone text,email text,loja_cadastro_id uuid,data_cadastro timestamptz',
 'pedidos':'id uuid,empresa_id uuid,loja_id uuid,cliente_cpf char(11),tipo_atendimento text,canal_venda text,forma_pagamento text,status text,valor_total numeric,taxa_entrega numeric,observacoes text,criado_em timestamptz,atualizado_em timestamptz,troco_para numeric,estoque_rastreado boolean',
 'itens':'id uuid,pedido_id uuid,produto_sku text,variacao_id uuid,quantidade integer,preco_unitario numeric',
}


def sql_carga(plano, lote=500):
    if not 1 <= lote <= 2000:
        raise ValueError('Lote deve ter entre 1 e 2.000 registros.')
    linhas = ["BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='120s';",
              f'SELECT pg_advisory_xact_lock(hashtextextended({literal("convivium/simulacao/"+plano["empresa"])},0));']
    for tabela, tipos in TIPOS.items():
        linhas.append(f'CREATE TEMP TABLE sim_{tabela}({tipos}) ON COMMIT DROP;')
        for pos in range(0, len(plano[tabela]), lote):
            linhas.append(f'INSERT INTO sim_{tabela} SELECT * FROM jsonb_to_recordset({json_sql(plano[tabela][pos:pos+lote])}) AS t({tipos});')
    # Mesmo run-id com conteúdo diferente, colisão ou execução parcial = rollback.
    linhas.append(f"""
    DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM public.pedidos WHERE observacoes LIKE {literal('[SIMULACAO:'+plano['execucao']+':%')}
        AND observacoes NOT LIKE {literal(plano['marcador']+'%')}) THEN RAISE EXCEPTION 'Execucao ja existe com outro plano'; END IF;
      IF EXISTS(SELECT 1 FROM public.clientes c JOIN sim_clientes s USING(empresa_id,cpf)
        WHERE (c.nome,c.telefone,c.email) IS DISTINCT FROM (s.nome,s.telefone,s.email)) THEN RAISE EXCEPTION 'Colisao de cliente: nenhum cadastro foi alterado'; END IF;
      IF EXISTS(SELECT 1 FROM public.pedidos p JOIN sim_pedidos s USING(id) WHERE to_jsonb(p)-'subtotal_itens' @> to_jsonb(s) IS NOT TRUE)
        THEN RAISE EXCEPTION 'Pedido da execucao foi modificado; carga recusada'; END IF;
      IF EXISTS(SELECT 1 FROM public.itens_pedido i JOIN sim_itens s USING(id) WHERE to_jsonb(i) @> to_jsonb(s) IS NOT TRUE)
        THEN RAISE EXCEPTION 'Item da execucao foi modificado; carga recusada'; END IF;
    END $$;
    CREATE TEMP TABLE sim_novos ON COMMIT DROP AS SELECT s.* FROM sim_pedidos s WHERE NOT EXISTS(SELECT 1 FROM public.pedidos p WHERE p.id=s.id);
    CREATE TEMP TABLE sim_necessidade ON COMMIT DROP AS
      SELECT p.loja_id,ft.ingrediente_id,sum(ft.peso_quantidade*i.quantidade)::numeric(12,3) AS quantidade
      FROM sim_itens i JOIN sim_novos p ON p.id=i.pedido_id JOIN public.fichas_tecnicas ft ON ft.variacao_id=i.variacao_id GROUP BY p.loja_id,ft.ingrediente_id;
    -- Bloqueio ordenado: nenhuma venda concorrente pode perder sua baixa.
    SELECT e.loja_id FROM public.estoque_lojas e JOIN sim_necessidade n USING(loja_id,ingrediente_id)
      ORDER BY e.loja_id,e.ingrediente_id FOR UPDATE OF e;
    CREATE TEMP TABLE sim_saldos ON COMMIT DROP AS SELECT e.* FROM public.estoque_lojas e JOIN sim_necessidade n USING(loja_id,ingrediente_id);
    DO $$ BEGIN
      IF (SELECT count(*) FROM sim_saldos)<>(SELECT count(*) FROM sim_necessidade) THEN RAISE EXCEPTION 'Ficha sem estoque vinculado: nada foi importado'; END IF;
      IF EXISTS(SELECT 1 FROM sim_saldos WHERE quantidade_disponivel<0) THEN RAISE EXCEPTION 'Regularize os saldos negativos antes de importar'; END IF;
    END $$;
    UPDATE public.estoque_lojas e SET quantidade_disponivel=e.quantidade_disponivel+n.quantidade FROM sim_necessidade n WHERE e.loja_id=n.loja_id AND e.ingrediente_id=n.ingrediente_id;
    INSERT INTO public.clientes({','.join(c.split()[0] for c in TIPOS['clientes'].split(','))}) SELECT * FROM sim_clientes ON CONFLICT(empresa_id,cpf) DO NOTHING;
    INSERT INTO public.pedidos({','.join(c.split()[0] for c in TIPOS['pedidos'].split(','))}) SELECT * FROM sim_novos;
    INSERT INTO public.itens_pedido({','.join(c.split()[0] for c in TIPOS['itens'].split(','))}) SELECT i.* FROM sim_itens i JOIN sim_novos p ON p.id=i.pedido_id;
    -- Triggers/FKs permanecem habilitados. A fotografia de custo fica no
    -- histórico; o saldo físico e sua data são restaurados antes do commit.
    UPDATE public.estoque_lojas e SET quantidade_disponivel=s.quantidade_disponivel,atualizado_em=s.atualizado_em FROM sim_saldos s WHERE e.loja_id=s.loja_id AND e.ingrediente_id=s.ingrediente_id;
    DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM public.estoque_lojas e JOIN sim_saldos s USING(loja_id,ingrediente_id) WHERE to_jsonb(e)<>to_jsonb(s)) THEN RAISE EXCEPTION 'Saldo alterado: importacao revertida'; END IF;
      IF (SELECT count(*) FROM public.pedidos p JOIN sim_pedidos s USING(id))<>{len(plano['pedidos'])} THEN RAISE EXCEPTION 'Contagem de pedidos incorreta'; END IF;
      IF (SELECT count(*) FROM public.itens_pedido i JOIN sim_itens s USING(id))<>{len(plano['itens'])} THEN RAISE EXCEPTION 'Contagem de itens incorreta'; END IF;
      IF EXISTS(SELECT 1 FROM sim_pedidos s JOIN public.pedidos p USING(id) WHERE p.valor_total<>(SELECT sum(i.quantidade*i.preco_unitario) FROM public.itens_pedido i WHERE i.pedido_id=p.id)+p.taxa_entrega) THEN RAISE EXCEPTION 'Total divergente'; END IF;
    END $$;
    SELECT jsonb_build_object('novos_pedidos',(SELECT count(*) FROM sim_novos),'pedidos',(SELECT count(*) FROM sim_pedidos),'clientes',(SELECT count(*) FROM sim_clientes),'estoque_preservado',true) AS resultado;
    COMMIT;
    """)
    # O Management API do CLI retorna apenas o último resultado. Repetir uma
    # verificação persistente após o COMMIT, sem depender de tabelas temporárias.
    linhas.append(f"SELECT jsonb_build_object('pedidos',(SELECT count(*) FROM public.pedidos WHERE observacoes LIKE {literal(plano['marcador']+'%')}),'clientes',(SELECT count(*) FROM public.clientes WHERE empresa_id={literal(plano['empresa'])}::uuid AND email LIKE {literal('%@simulacao.convivium.invalid')}),'execucao',{literal(plano['execucao'])}) AS resultado;")
    return '\n'.join(linhas)


def resumo(plano):
    unidades = {l['id']:l['nome'] for l in plano['lojas']}
    grupos = defaultdict(list)
    for p in plano['pedidos']:
        grupos[('unidade',unidades[p['loja_id']])].append(p)
        grupos[('canal',p['canal_venda']+' / '+p['tipo_atendimento'])].append(p)
    saida = {'tipo':'SIMULACAO — não representa vendas reais','execucao':plano['execucao'],'assinatura':plano['assinatura'],
             'periodo':[plano['inicio'],plano['fim']],'clientes_novos':len(plano['clientes']),'vendas':len(plano['pedidos']),
             'itens':len(plano['itens']),'grupos':[],'meses':dict(sorted(Counter(p['criado_em'][:7] for p in plano['pedidos']).items())),
             'unidades_por_classe_abc':dict(Counter({classe:sum(i['quantidade'] for i in plano['itens'] if plano['abc'][i['produto_sku']]==classe) for classe in ('A','B','C')}))}
    for (tipo,nome), pedidos in sorted(grupos.items()):
        receita = sum((Decimal(p['valor_total']) for p in pedidos),Decimal(0))
        saida['grupos'].append({'tipo':tipo,'nome':nome,'vendas':len(pedidos),'faturamento':str(dinheiro(receita)),'ticket_medio':str(dinheiro(receita/len(pedidos)))})
    saida['faturamento'] = str(sum((Decimal(p['valor_total']) for p in plano['pedidos']),Decimal(0)))
    saida['ticket_medio'] = str(dinheiro(Decimal(saida['faturamento']) / len(plano['pedidos'])))
    return saida


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--vendas',type=int,default=9000);parser.add_argument('--clientes',type=int,default=600)
    parser.add_argument('--inicio',type=date.fromisoformat,default=date(2026,1,1));parser.add_argument('--fim',type=date.fromisoformat,default=date(2026,11,22))
    parser.add_argument('--seed',type=int,default=20261122);parser.add_argument('--execucao',default='aula-2026-9000');parser.add_argument('--marca',default='brasa-burger')
    parser.add_argument('--lote',type=int,default=500);parser.add_argument('--aplicar',action='store_true')
    parser.add_argument('--supabase-cli');parser.add_argument('--project-ref');parser.add_argument('--catalogo',type=Path,help='JSON de catálogo para prévia offline; não grava')
    parser.add_argument('--resumo',type=Path,help='Salvar somente métricas, sem dados pessoais')
    args=parser.parse_args();banco=None
    try:
        if args.catalogo:
            if args.aplicar: raise ValueError('Carga exige reler o catálogo do banco; remova --catalogo.')
            catalogo=json.loads(args.catalogo.read_text(encoding='utf-8'))
        else:
            banco=Banco(os.environ.get('DATABASE_URL'),args.supabase_cli,args.project_ref)
            catalogo=banco.executar(consulta_catalogo(args.marca))
        plano=gerar_plano(catalogo,args.vendas,args.clientes,args.inicio,args.fim,args.seed,args.execucao)
        resultado=resumo(plano)
        print(f"SIMULACAO: {args.vendas:,} vendas / {args.clientes} novos clientes. Período {args.inicio} a {args.fim}.",flush=True)
        for g in resultado['grupos']:
            print(f"{g['tipo']}: {g['nome']} | {g['vendas']} vendas | R$ {g['faturamento']} | ticket R$ {g['ticket_medio']}",flush=True)
        if args.aplicar:
            print('Preparando lotes; confirmação única, sem alterar o estoque físico ou cadastros existentes.',flush=True)
            carga=sql_carga(plano,args.lote)
            print(f"{sum((len(plano[t])+args.lote-1)//args.lote for t in TIPOS)} lotes preparados. Enviando ao banco…",flush=True)
            confirmado=banco.executar(carga)
            if not confirmado or confirmado.get('pedidos') != args.vendas:
                raise RuntimeError('Resposta inconclusiva. Consulte a execução antes de reenviar; o mesmo plano é idempotente.')
            resultado['confirmacao']=confirmado
            print('Carga confirmada e contagem verificada. Repetir a mesma execução não duplica registros.',flush=True)
        else:
            print('PRÉVIA: nenhuma linha inserida. Use --aplicar para confirmar esta carga.',flush=True)
        print(f"TOTAL | {resultado['vendas']} vendas | R$ {resultado['faturamento']} | ticket R$ {resultado['ticket_medio']}")
        if args.resumo:
            args.resumo.parent.mkdir(parents=True,exist_ok=True)
            args.resumo.write_text(json.dumps(resultado,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return 0
    except (Exception,KeyboardInterrupt) as erro:
        # Não imprimir a URL ou detalhes que incluam CPF/telefone/senha.
        print(f'Falha: {erro}' if isinstance(erro,(ValueError,RuntimeError)) else 'Falha de conexão/SQL: verifique o ambiente e os logs privados. Nenhuma credencial foi exibida.',file=sys.stderr)
        return 1
    finally:
        if banco: banco.fechar()


if __name__=='__main__':
    sys.exit(main())
