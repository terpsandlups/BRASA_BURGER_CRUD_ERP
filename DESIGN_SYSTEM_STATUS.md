# Design System Brasa Burguer — Status de implementação

Revisão documental alinhada ao README. O estado abaixo deriva do relatório de implementação fornecido; ainda não representa inspeção dos componentes ou teste visual do código.

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
