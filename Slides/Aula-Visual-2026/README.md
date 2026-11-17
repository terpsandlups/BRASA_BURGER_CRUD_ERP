# Apresentações — revisão visual para a aula

O formato e as três trilhas da apresentação entregue foram mantidos. O texto visível foi reduzido; o detalhamento e as fontes permanecem nas notas do apresentador. Imagens ilustrativas não representam a operação ou os produtos reais do Brasa Burger.

| Arquivo editável | Páginas | PDF de apoio |
| --- | --- | --- |
| Convivium-Entrega-2-Visual.pptx | 12 | output/pdf/aula-apresentacao-visual.pdf |
| Fundamentos-Tecnicos-Convivium-Visual.pptx | 9 | output/pdf/aula-fundamentos-tecnicos-visual.pdf |
| Convivium-Modelo-de-Negocio-Visual.pptx | 10 | output/pdf/aula-modelo-de-negocio-visual.pdf |

A versão interativa fica em `/apresentacao/index.html`: navegação entre as três trilhas, notas, tela cheia, etapas clicáveis e acesso às aplicações reais. As telas privadas do ERP exigem a conta autorizada da equipe. O QR dos alunos está apenas nos cartazes de `output/aula/`.

Fonte única de conteúdo: `docs/entrega-02/SLIDES_CONTEUDO.json`. A versão web é preparada por `node scripts/preparar-apresentacao-interativa.mjs`. A exportação editável usa `scripts/gerar-slides-aula.mjs` com o runtime de apresentações do Codex configurado nesse script; não faz parte do build do aplicativo.

Validação desta revisão: integridade dos três PPTXs, geometria, fontes, tabelas editáveis e importação pelo runtime. As 31 páginas foram renderizadas e revisadas visualmente. Os PDFs são cópias visuais para apresentação; o conteúdo editável está nos PPTXs.

Créditos e prompts: `Slides/Entrega-2/assets/CREDITOS-AULA-VISUAL.md` e `frontend/public/imagens/cardapio/CREDITOS.md`. Os PowerPoints da release anterior permanecem em `Slides/Entrega-2/`.
