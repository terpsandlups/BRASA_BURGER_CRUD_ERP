-- Metadados do cardápio pertencem ao produto da empresa, com a mesma RLS.
-- Não altera preços, pedidos, estoque, contas ou permissões existentes.
ALTER TABLE public.produtos
 ADD COLUMN imagem_url text CHECK (imagem_url IS NULL OR (length(imagem_url) <= 2000 AND imagem_url ~ '^https://[^[:space:]]+$')),
 ADD COLUMN destaque boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION erp_privado.cardapio_mobile(p_slug text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object(
  'empresa',(SELECT jsonb_build_object('nome',nome,'slug',slug,'cor',cor,'logo_url',logo_url)
    FROM public.empresas WHERE slug=p_slug AND ativo),
  'lojas',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'nome',l.nome,'tipo_operacao',l.tipo_operacao) ORDER BY l.nome)
    FROM public.lojas l JOIN public.empresas e ON e.id=l.empresa_id WHERE e.slug=p_slug AND e.ativo AND l.ativo),'[]'::jsonb),
  'itens',COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id',v.id,'sku',p.sku,'nome',COALESCE(NULLIF(to_jsonb(p)->>'nome_comercial',''),p.nome),
    'descricao',to_jsonb(p)->>'descricao','imagem_url',p.imagem_url,'destaque',p.destaque,
    'categoria',COALESCE(cat.nome,'Outros'),'categoria_ordem',COALESCE((to_jsonb(cat)->>'ordem')::integer,0),
    'variacao',v.nome_variacao,'preco',round(v.preco_venda*(1+c.markup_preco_percentual/100),2),
    'delivery',p.disponivel_delivery,'presencial',p.disponivel_presencial,
    'adicionais',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nome',a.nome,'preco',a.preco_adicional) ORDER BY a.nome)
      FROM public.adicionais a JOIN public.produto_adicionais_disponiveis pa ON pa.adicional_id=a.id
      WHERE pa.produto_sku=p.sku AND a.empresa_id=p.empresa_id AND a.ativo AND p.permite_adicionais),'[]'::jsonb))
    ORDER BY p.destaque DESC,COALESCE((to_jsonb(cat)->>'ordem')::integer,0),p.nome,v.nome_variacao)
    FROM public.produtos p JOIN public.produto_variacoes v ON v.produto_sku=p.sku
    JOIN public.empresas e ON e.id=p.empresa_id
    JOIN public.configuracoes_canal c ON c.canal_venda='proprio'
    LEFT JOIN public.categorias cat ON cat.id=(to_jsonb(p)->>'categoria_id')::uuid AND cat.empresa_id=p.empresa_id
    WHERE e.slug=p_slug AND e.ativo AND p.ativo AND v.preco_venda>=0),'[]'::jsonb)
 );
$$;
REVOKE ALL ON FUNCTION erp_privado.cardapio_mobile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION erp_privado.cardapio_mobile(text) TO anon,authenticated;
