# Design System Brasa Burguer — Status de implementação

## Padrão compartilhado em todas as abas — 17/10/2026

O visual aprovado de Pedidos foi propagado para Painel, Analytics, Clientes,
Produtos, Estoque, Histórico e Entregas. A base passou de tema local de rota para
`frontend/src/styles/theme.css`, carregada na entrada da aplicação, sem depender
de abrir Pedidos antes. A classe `app-shell` delimita o tema do ERP autenticado.

- Tokens próprios de fundo, superfície, campo, borda, texto, destaque e estado;
  nomes antigos de Tailwind têm uma ponte de compatibilidade documentada no CSS.
- `PageHeader`, `KPICard`, `Button`, `Card`, `EmptyState` e `StatusBadge` seguem
  a mesma hierarquia de fonte, ícones, espaçamento e cantos arredondados.
- Tabelas com cabeçalho grafite, divisórias discretas e rolagem interna;
  gráficos com eixos, grade e tooltip adaptados ao fundo escuro.
- Cadastros e filtros no mesmo padrão. Clientes começa na lista, com botão
  **Novo cliente** para expandir o cadastro; seus campos têm rótulos associados.
- Entregas separa origem e consulta de rota em cards paralelos no desktop,
  empilhados no celular. Menus e painéis laterais também usam o tema comum.
- 79 testes aprovados, incluindo seis de contraste AA (4,5:1) dos tokens de
  texto sobre fundos e da ação principal. Isso não substitui auditoria completa
  de acessibilidade de todos os estados.

Conferência conectada em oito rotas, desktop e celular, sem gravar dados de teste.
Evidências e limitações em `VALIDACAO.md`.

## Pedidos: redesenho verificado — 17/10/2026

O formulário vertical foi substituído por um compositor de pedido com duas
colunas a partir de 1.024px: cardápio pesquisável à esquerda e carrinho à direita.
O total e a conclusão ficam fora da rolagem interna do carrinho no desktop.
No celular, as seções se empilham e o atalho **Ver pedido** leva ao resumo.

- Tema grafite inicialmente local de Pedidos, depois compartilhado com todo o
  ERP; detalhes âmbar, cantos de 8–12px e Work Sans nos títulos e controles.
- Categorias horizontais, cards com adição rápida, busca por nome, SKU e variação,
  quantidades, adicionais e preços por canal preservados.
- Unidade/CPF compactos, canais e pagamentos com estado `aria-pressed`, endereço
  e observações recolhíveis. Mapa recalcula sua área ao expandir o endereço.
- Menu lateral com ícones SVG, KPIs compactos e alerta discreto de atraso.
- Conferido no navegador em 390 × 844, 1.024 × 900 e 1.440 × 1.000;
  testes e limitações registrados em `VALIDACAO.md`.

Componentes novos: `pedidos/NovoPedido.jsx`, `pedidos/novoPedido.css` e
`ui/Icon.jsx`. A inspiração é o fluxo modular documentado publicamente pelo
[iFood](https://blog-parceiros.ifood.com.br/painel-de-expedicao-gestor-de-pedidos/),
sem cópia de código, ativos ou integração comercial.

## Registro documental anterior

As seções abaixo preservam o levantamento original. Onde houver divergência,
prevalecem a revisão verificada acima e os registros de `VALIDACAO.md`.

## Identidade visual

| Token | Valor | Uso |
|---|---|---|
| Carvão | `#211E1A` | Base escura e hierarquia |
| Âmbar | `#C98A3A` | Destaques e ações |
| Osso | `#F2E8D5` | Superfícies claras |
| Sucesso, atenção e erro | Valores não fornecidos no relatório | Estados semânticos; conferir configuração real |
| Títulos | Oswald | Hierarquia tipográfica |
| Texto | Work Sans | Conteúdo e controles |

A atualização dos tokens em `tailwind.config.js` foi informada como concluída. As telas que já usam os nomes semânticos herdaram a paleta; isso não significa que toda a estrutura visual tenha sido migrada.

## Componentes informados como criados

Caminhos relativos a `frontend/src/components/`:

| Componente | Finalidade |
|---|---|
| `ui/Button.jsx` | Primary, Secondary, Ghost e Danger |
| `ui/StatusBadge.jsx` | Estados semânticos |
| `ui/Card.jsx` | Superfície padrão |
| `ui/EmptyState.jsx` | Estado sem dados |
| `ui/Skeleton.jsx` | Carregamento |
| `layout/PageHeader.jsx` | Cabeçalho de página |
| `data-display/KPICard.jsx` | Indicadores |

As propriedades públicas e exemplos de importação devem ser documentados a partir do código real.

## Dashboard: tela de referência

Informado como reconstruído com filtros de unidade e período de 7/30/90 dias; cinco KPIs (faturamento, pedidos, ticket médio, CMV e margem); evolução de faturamento, barras por unidade, ranking de produtos e composição por canal. Estados de carregamento e ausência de dados foram tratados.

O custo dos itens deriva das fichas técnicas segundo o relatório. Conferir no código denominadores, cancelamentos, descontos, custos ausentes e preservação histórica. As definições conceituais estão no [README](README.md#ficha-técnica-e-indicadores).

## Propagação pendente

| Tela | Estado informado | Próxima ação |
|---|---|---|
| Dashboard | Referência migrada | Validar comportamento, responsividade e cálculos |
| Pedidos | Paleta herdada; migração estrutural pendente | Adotar componentes, cabeçalho, KPIs e estados |
| Clientes e Histórico | Telas existentes; componentes novos ainda não propagados | Padronizar tabelas, filtros e paginação |
| Produtos e Estoque | Telas existentes; migração visual pendente | Padronizar formulários e ações |

A existência da tela de Estoque não comprova inventário, transferências ou compras completos. Cadastro de produtos pela interface, painel lateral de pedido e Realtime não têm conclusão confirmada nos materiais recebidos.

## Processo de evolução

1. Migrar uma tela por vez, começando por Pedidos.
2. Reutilizar componentes e tokens; preservar a função das ações.
3. Conferir filtros e estados com dados de teste.
4. Testar em tela larga e estreita, além de navegação por teclado.
5. Registrar capturas, resultado da revisão e commit antes de seguir.

## Critérios de aceite visual e funcional

- [ ] Filtros alteram todos os indicadores e gráficos correspondentes.
- [ ] Estado vazio é diferente de erro e de carregamento.
- [ ] Ausência de custo não aparece como margem comprovada de 100%.
- [ ] Botões, campos e tabelas seguem os mesmos padrões.
- [ ] Foco por teclado, rótulos e mensagens são visíveis.
- [ ] Cores de status vêm acompanhadas de texto ou ícone compreensível.
- [ ] Textos, números e controles não ficam cortados em telas menores.
- [ ] Contraste e legibilidade são verificados nas combinações reais.
- [ ] Ações não geram pedidos ou baixas duplicadas por cliques repetidos.
- [ ] Resultado da validação é associado a uma versão do código.

Os itens permanecem abertos até execução e registro. O relatório original cita seções de um documento externo de Design System; esta versão apresenta o conteúdo essencial sem depender dessa numeração.
