import copy
from collections import Counter
from datetime import date
from decimal import Decimal
import os
import unittest
from uuid import uuid4

from simular_vendas_2026 import Banco, consulta_catalogo, gerar_plano, peso_dia, resumo, sql_carga


def catalogo_teste():
    return {'empresa':{'id':str(uuid4()),'slug':'brasa-burger'},
        'lojas':[{'id':str(uuid4()),'nome':n,'slug':n.lower(),'tipo_operacao':t} for n,t in
                 [('Retiro','delivery_only'),('Japy','presencial_delivery'),('Eloy','delivery_only')]],
        'produtos':[{'id':str(uuid4()),'sku':f'{g}-{i}','nome':f'{g} {i}','categoria':c,
                     'preco_venda':20+i,'disponivel_delivery':True,'disponivel_presencial':True}
                    for g,c in [('burger','Lanches'),('bebida','Bebidas'),('batata','Acompanhamentos'),('doce','Sobremesas')] for i in range(10)],
        'canais':{'proprio':0,'ifood':15,'rappi':12},'pagamentos':['pix','credito','debito','dinheiro']}


class Planejamento(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogo=catalogo_teste()
        cls.plano=gerar_plano(copy.deepcopy(cls.catalogo))

    def test_distribuicao_historica_combos_abc_e_identidades(self):
        plano=self.plano
        self.assertEqual(len(plano['clientes']),600)
        self.assertEqual(len({c['cpf'] for c in plano['clientes']}),600)
        self.assertEqual(len(plano['pedidos']),9000)
        self.assertEqual(len({p['id'] for p in plano['pedidos']}),9000)
        lojas=Counter(p['loja_id'] for p in plano['pedidos'])
        presencial=next(l for l in plano['lojas'] if l['tipo_operacao']=='presencial_delivery')
        self.assertEqual(lojas[presencial['id']],3600)
        self.assertGreater(sum(p['tipo_atendimento']=='presencial' for p in plano['pedidos'] if p['loja_id']==presencial['id']),2500)
        self.assertTrue(all(p['canal_venda']=='proprio' for p in plano['pedidos'] if p['tipo_atendimento']=='presencial'))
        self.assertTrue(all('2026-01-01'<=p['criado_em'][:10]<='2026-11-22' for p in plano['pedidos']))
        self.assertTrue(all(c['email'].endswith('.invalid') and c['nome'].startswith('[SIM]') for c in plano['clientes']))
        cestas={p['id']:[] for p in plano['pedidos']}
        for item in plano['itens']: cestas[item['pedido_id']].append(item)
        self.assertTrue(all(any(i['produto_sku'].startswith('burger') for i in cesta) for cesta in cestas.values()))
        self.assertGreater(sum(len(c)>2 for c in cestas.values()),4500)
        abc=resumo(plano)['unidades_por_classe_abc']
        self.assertGreater(abc['A']/sum(abc.values()),.72)
        self.assertLess(abc['A']/sum(abc.values()),.84)
        dias=Counter(date.fromisoformat(p['criado_em'][:10]).weekday() for p in plano['pedidos'])
        self.assertGreater(dias[5],dias[1]*2)
        self.assertGreater(peso_dia(date(2026,11,10)),peso_dia(date(2026,1,6)))
        for pedido in plano['pedidos']:
            self.assertEqual(Decimal(pedido['valor_total']),sum(Decimal(i['preco_unitario'])*i['quantidade'] for i in cestas[pedido['id']])+Decimal(pedido['taxa_entrega']))

    def test_reproducao_e_parametros(self):
        repetido=gerar_plano(copy.deepcopy(self.catalogo))
        self.assertEqual(self.plano['pedidos'],repetido['pedidos'])
        with self.assertRaises(ValueError): gerar_plano(copy.deepcopy(self.catalogo),vendas=1,clientes=600)
        with self.assertRaises(ValueError): gerar_plano(copy.deepcopy(self.catalogo),execucao="x';DROP")


@unittest.skipUnless(os.environ.get('SIMULADOR_TEST_URL'),'Exige PostgreSQL descartável do runner local/CI')
class IntegracaoPostgres(unittest.TestCase):
    def test_lote_real_idempotencia_estoque_e_rollback(self):
        import psycopg
        url=os.environ['SIMULADOR_TEST_URL']
        with psycopg.connect(url,autocommit=True,client_encoding='UTF8') as c:
            self.assertIn(c.info.host,('127.0.0.1','localhost','::1'))
            estoque=c.execute('SELECT * FROM estoque_lojas ORDER BY loja_id,ingrediente_id').fetchall()
            antes=c.execute('SELECT * FROM pedidos ORDER BY id').fetchall()
            contas=c.execute('SELECT * FROM clientes ORDER BY empresa_id,cpf').fetchall()
            banco=Banco(url)
            try:
                catalogo=banco.executar(consulta_catalogo('brasa-burger'))
                plano=gerar_plano(catalogo)
                # Gerar/consultar a prévia não grava nada.
                self.assertEqual(c.execute('SELECT * FROM clientes ORDER BY empresa_id,cpf').fetchall(),contas)
                resultado=banco.executar(sql_carga(plano))
                self.assertEqual(resultado['pedidos'],9000)
                self.assertEqual(c.execute('SELECT count(*) FROM clientes').fetchone()[0],len(contas)+600)
                self.assertEqual(c.execute('SELECT * FROM estoque_lojas ORDER BY loja_id,ingrediente_id').fetchall(),estoque)
                self.assertEqual(c.execute("SELECT count(*) FROM pedidos WHERE observacoes NOT LIKE '[SIMULACAO:%' OR observacoes IS NULL").fetchone()[0],len(antes))
                self.assertEqual(c.execute('SELECT count(*) FROM consumos_itens_pedido').fetchone()[0],len(plano['itens']))
                banco.executar(sql_carga(plano))
                self.assertEqual(c.execute('SELECT count(*) FROM pedidos').fetchone()[0],len(antes)+9000)
                self.assertEqual(c.execute('SELECT * FROM estoque_lojas ORDER BY loja_id,ingrediente_id').fetchall(),estoque)
                ruim=gerar_plano(catalogo,vendas=60,clientes=10,execucao='erro-fk')
                ruim['itens'][-1]['variacao_id']=str(uuid4())
                with self.assertRaises(Exception): banco.executar(sql_carga(ruim))
                banco.conexao.execute('ROLLBACK')
                self.assertEqual(c.execute('SELECT count(*) FROM pedidos').fetchone()[0],len(antes)+9000)
                self.assertEqual(c.execute('SELECT count(*) FROM clientes').fetchone()[0],len(contas)+600)
                self.assertEqual(c.execute('SELECT * FROM estoque_lojas ORDER BY loja_id,ingrediente_id').fetchall(),estoque)
            finally: banco.fechar()


if __name__=='__main__': unittest.main(verbosity=2)
