# Brasa Burguer — Gestão Multiunidade

Projeto acadêmico e de portfólio de um sistema web para uma rede fictícia de hamburguerias em Jundiaí/SP. Integra atendimento, clientes, pedidos, cardápio, fichas técnicas e indicadores gerenciais, com evolução gradual para ERP.

## Identificação acadêmica

- **Instituição:** Faculdade Anhanguera.
- **Curso:** Análise e Desenvolvimento de Sistemas.
- **Disciplina integradora:** Projeto Integrado I, II e III — 2026/2.
- **Docente:** Prof. Gilberto Falco Netto.
- **Gabriel Rodrigues do Prado:** 3º semestre.
- **Rafaela Rodrigues Oliveira:** 1º semestre.
- **Modalidade:** continuidade de um protótipo existente.

A linha de base deve ser identificada no primeiro registro do repositório. Os incrementos de 2026/2 devem ser associados aos commits e às contribuições efetivas dos integrantes.

## Problema e objetivo

Cadastros e controles isolados dificultam recuperar pedidos, acompanhar custos e comparar unidades. O Brasa Burguer reúne essas informações para apoiar a operação e a análise de desempenho.

O cenário considera Japy e Retiro com atendimento presencial e delivery, e Eloy exclusivamente delivery. O CPF permite consultar o cliente e relacionar seu histórico. Cada variação de produto possui ficha técnica própria, como artesanal de 150/200 g e smash de 56/90 g.

## Arquitetura

| Camada | Tecnologia e função |
|---|---|
| Interface | React, JavaScript/JSX e Tailwind CSS |
| Desenvolvimento e build | Vite, Node.js e npm |
| Navegação e gráficos | React Router e Recharts, conforme ficha técnica |
| API e autenticação | Supabase PostgREST e Supabase Auth |
| Dados e regras | PostgreSQL, SQL, funções e triggers em PL/pgSQL |
| Scripts independentes | Python: carga inicial e simulações descritas nos materiais |
| Estudo analítico separado | MySQL standalone; não é o banco transacional da aplicação |
| Hospedagem prevista | Netlify; publicação não comprovada nesta revisão |

React executa a interface no navegador. Node.js sustenta as ferramentas de desenvolvimento. A interface acessa o Supabase; Python executa tarefas independentes e não é uma API intermediária obrigatória.

## Estado de desenvolvimento

Esta revisão consolida o README anterior, a ficha técnica e o relatório de Design System. Os estados abaixo são **informados na documentação**; o código e os testes não acompanharam esta revisão. Uma tela existente não implica que todas as operações do módulo estejam completas.

| Área | Estado documentado | Limite ou próximo passo |
|---|---|---|
| Login e permissões | Supabase Auth e sete perfis RBAC | Validar permissões efetivas por ação e unidade |
| Dashboard | Filtros por unidade e 7/30/90 dias; faturamento, pedidos, ticket, CMV e margem | Conferir fórmulas, filtros e conciliação no código |
| Análises visuais | Evolução das vendas, vendas por unidade, top produtos e composição por canal | Verificar consistência dos dados e estados vazios |
| Pedidos | Kanban com indicadores, busca, avanço de status e adicionais | Detalhamento lateral e Realtime não confirmados |
| Histórico e clientes | Telas mencionadas no status recente; ficha técnica descreve histórico e cadastro durante o pedido | Confirmar filtros, retorno ao pedido e persistência |
| Produtos | Catálogo, variações, adicionais e consulta de ficha técnica/CMV | Cadastro completo pela interface não confirmado |
| Estoque | Tela mencionada no status recente; ficha técnica descreve baixas por triggers | Inventário, transferências, perdas e reposição ainda não comprovados |
| Design System | Tokens e componentes reutilizáveis; Dashboard como tela de referência | Propagar os componentes às demais telas |
| Camada analítica | Views e estruturas analíticas descritas na ficha técnica | Integração efetiva com Power BI permanece futura |
| Testes e publicação | Plano de validação e Netlify previstos | Sem evidência de suíte automatizada, CI/CD ou deploy nesta revisão |

O README anterior colocava Histórico/Estoque e parte do dashboard em estágios anteriores. O status recente atualiza a existência dessas telas e o dashboard, sem comprovar todo o módulo de estoque. Canais são citados na ficha técnica e no gráfico recente; entregadores e timeline precisam ter seu nível de implementação conferido no código.

## Estrutura documentada

| Caminho | Conteúdo |
|---|---|
| `frontend/` | Aplicação React/Vite, dependências e configurações |
| `frontend/src/components/` | Componentes de interface, layout e indicadores |
| `sql/schema.sql` | Estrutura inicial de dados e views |
| `sql/migration_fase1.sql` | Categorias, usuários, perfis, permissões e RLS |
| `sql/migration_fase1b_cardapio.sql` | Ampliação do cardápio e fornecedores |
| `sql/migration_fase1c_rls_geral.sql` | Alteração de políticas descrita no README anterior; exige revisão |
| `sql/update_marca_unidades.sql` | Atualização de marca e unidades |
| `python/seed_data.py` | Carga inicial |
| `python/seed_cardapio.py` | Carga do cardápio |
| `mysql/` | Ambiente independente para estudo SQL |

Esta relação reproduz os caminhos informados. Migrações posteriores devem ser documentadas conforme os arquivos reais; os scripts acima não constituem uma lista comprovadamente completa da versão atual.

## Executar localmente

Siga o [guia passo a passo](GUIA_PASSO_A_PASSO.md) para preparar o Supabase, executar os scripts e configurar o ambiente. Com banco e variáveis preparados:

```bash
cd frontend
npm install
npm run dev
```

Use a versão de Node compatível com o `package.json` e a versão instalada do Vite. Se houver `package-lock.json` válido e sincronizado, `npm ci` permite instalar as versões registradas. A URL local será exibida no terminal.

## Ficha técnica e indicadores

Um produto pode ter várias variações; cada variação relaciona ingredientes e quantidades pela ficha técnica. A view `vw_custo_variacao` é descrita como fonte de custo por variação.

| Indicador | Regra conceitual |
|---|---|
| Custo de ficha | Soma das quantidades convertidas × custo unitário de cada ingrediente |
| CMV do produto (%) | Custo ÷ preço de venda × 100 |
| Margem bruta simplificada (R$) | Preço de venda − custo de ficha |
| Margem bruta simplificada (%) | Margem em reais ÷ preço de venda × 100 |
| Ticket médio | Receita elegível ÷ quantidade de pedidos elegíveis |

Exemplo: preço **R$ 27,90** e custo **R$ 8,90** resultam em **CMV de 31,90%**, margem de **R$ 19,00** e margem percentual de **68,10%**. Essa margem não é lucro líquido.

No dashboard, CMV agregado usa custo total elegível dividido pela receita correspondente; não a média simples dos percentuais dos produtos. Taxas de entrega, descontos, cancelamentos e período devem ter tratamento explícito. Sem denominador válido, exibir indicador indisponível. Sem custo histórico preservado, a análise pela ficha atual é estimativa e pode mudar com o cadastro.

## Cardápio

Smash, artesanais, Monte Seu Burger, opções especiais, acompanhamentos, croquetas, porções, sanduíches, cervejas artesanais, chopp, bebidas e sobremesas. Variações e adicionais conectam a apresentação comercial às quantidades da ficha técnica. A view `vw_engenharia_cardapio` é descrita como base da classificação por volume e margem; sua existência não comprova dashboard analítico completo.

## Integração das disciplinas

| Disciplina/eixo | Aplicação no projeto | Evidência a vincular |
|---|---|---|
| Linguagem de Programação | JavaScript: tipos, funções, eventos, entrada e saída | Componentes e unidade funcional executável |
| Algoritmos e Programação Estruturada | Sequência, condições, repetição e decomposição | Pseudocódigo e regras implementadas em JavaScript/SQL |
| Matemática Computacional | Custos, conversões, somatórios, percentuais e indicadores | Fórmulas e casos de teste com resultados esperados |
| Desenvolvimento em JavaScript | Estado de interface, componentes e acesso à API | Fluxo do pedido e componentes React |
| Computação em Nuvem | Serviços gerenciados, autenticação e acesso aos dados | Arquitetura Supabase e configuração de implantação |
| Análise Orientada a Objetos | Entidades, responsabilidades e relações | Modelagem de Cliente, Pedido, Item, Produto, Variação e Loja |

Gabriel cursa as três últimas disciplinas e já concluiu a disciplina de algoritmos em C. A proposta preserva os eixos exigidos e contextualiza a implementação em JavaScript/SQL; a aceitação da adequação cabe ao docente. Não se presume a grade completa de Rafaela. As contribuições devem refletir o trabalho efetivamente realizado.

## Evolução em blocos

1. **4.1 — Dashboard:** validar filtros, métricas e dados da implementação informada.
2. **4.2 — Pedidos e Histórico:** consolidar fluxo, detalhes, cadastro durante a venda e rastreabilidade.
3. **4.3 — Clientes e CRM:** validar perfil/histórico e evoluir análises de relacionamento.
4. **4.4 — Produtos e fichas:** completar manutenção pela interface e padronizar custos e identidade.
5. **4.5 — Fundação analítica:** reconciliar indicadores e preparar integração com Power BI.

Inventário avançado, compras, financeiro, produção, automações e implantação evoluem conforme dependências e capacidade da equipe. Cada bloco deve ser validado antes do seguinte.

## Segurança e evidências

Não versionar senhas, `.env` real, chaves privilegiadas ou dados pessoais reais. Manter apenas exemplos fictícios de configuração. A chave pública identifica o acesso da aplicação; as permissões dependem das políticas do banco. A descrição “RLS liberado para autenticados” não comprova isolamento entre lojas. Conferir o conteúdo da migração correspondente e testar leitura e escrita por perfil/unidade.

Registrar nos testes: versão/commit, ambiente, entrada, resultado esperado e resultado observado. Casos mínimos: cálculos acima, conversão de unidades, pedido inválido, acesso a outra loja, cancelamento e reenvio sem baixa duplicada.

## Documentação e entrega acadêmica

- [Guia de instalação e validação](GUIA_PASSO_A_PASSO.md).
- [Status e plano do Design System](DESIGN_SYSTEM_STATUS.md).
- Entrega 1: ZIP com `trabalho-escrito.pdf`, `apresentacao.pdf` e `anexos/`, até 100 MB, pelo formulário oficial.
- O formulário também recebe título e URL completa do repositório, público ou compartilhado com o docente.
- Prazo informado no enunciado: **02/10/2026**, conforme horário institucional.

Este pacote de Markdown atualiza a documentação do repositório. O código, os PDFs acadêmicos e os anexos são entregáveis separados. A URL do GitHub e a síntese de commits serão vinculadas ao trabalho após a publicação real.
