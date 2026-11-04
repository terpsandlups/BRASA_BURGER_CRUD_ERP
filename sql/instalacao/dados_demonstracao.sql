-- Dados SINTÉTICOS para banco NOVO de demonstração. Nunca aplicar sobre a operação.
BEGIN;
DO $$
DECLARE e uuid:='a0000000-0000-0000-0000-000000000001'; c uuid; i uuid; v uuid; l uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM public.lojas) OR EXISTS(SELECT 1 FROM public.pedidos) OR
    (SELECT count(*) FROM public.empresas)<>1 THEN
  RAISE EXCEPTION 'A carga demonstrativa exige banco novo, sem lojas nem pedidos.';
 END IF;
 SELECT id INTO c FROM public.categorias WHERE empresa_id=e AND nome='Lanches';
 INSERT INTO public.ingredientes(empresa_id,nome,unidade_medida,custo_unitario)
 VALUES(e,'Unidade de burger para demonstração','un',8.90) RETURNING id INTO i;
 INSERT INTO public.produtos(sku,empresa_id,nome,nome_comercial,categoria_id)
 VALUES('DEMO-BURGER',e,'Burger da Casa','Burger da Casa',c);
 INSERT INTO public.produto_variacoes(produto_sku,nome_variacao,preco_venda,padrao)
 VALUES('DEMO-BURGER','Clássico',27.90,true) RETURNING id INTO v;
 INSERT INTO public.fichas_tecnicas(variacao_id,ingrediente_id,peso_quantidade) VALUES(v,i,1);
 INSERT INTO public.lojas(empresa_id,nome,slug,tipo_operacao) VALUES
  (e,'Japy — Demonstração','demo-japy','presencial_delivery'),
  (e,'Retiro — Demonstração','demo-retiro','presencial_delivery'),
  (e,'Eloy — Demonstração','demo-eloy','delivery_only');
 FOR l IN SELECT id FROM public.lojas WHERE empresa_id=e LOOP
  INSERT INTO public.estoque_lojas(loja_id,ingrediente_id,quantidade_disponivel,quantidade_minima)
   VALUES(l,i,100,10);
 END LOOP;
END; $$;
COMMIT;
