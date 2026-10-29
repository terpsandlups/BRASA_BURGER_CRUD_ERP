# Convívium Management System

## Aplicação integrada para gestão de operações de alimentação — caso Brasa Burger

**Texto-base da Entrega 2 — 2026/2.** Revisão de 29/10/2026, baseada no código funcional `6c83548`. Fonte editável; revisão final, homologações e exportação de `trabalho-escrito.pdf` dependem do [plano de fechamento](README.md).

## 1. Identificação e resumo

| Campo | Identificação |
|---|---|
| Instituição | Faculdade Anhanguera |
| Curso | Tecnologia em Análise e Desenvolvimento de Sistemas |
| Disciplina e turma | Projeto Integrado I, II e III |
| Período | 2026/2 |
| Docente | Prof. Gilberto Falco Netto |
| Integrantes | Gabriel Rodrigues do Prado — 3º semestre; Rafaela Rodrigues Oliveira — 1º semestre |
| Local | Jundiaí/SP |
| Modalidade | Continuidade de protótipo acadêmico |
| Título atual | Convívium Management System — aplicação integrada para gestão de operações de alimentação |

**Resumo.** O projeto integra atendimento, clientes, catálogo, pedidos, estoque, entrega e indicadores em uma aplicação web. Convívium identifica a plataforma e Brasa Burger, a empresa do caso de aplicação. A solução separa consumidor e operação do ERP, com acesso por empresa, perfil e unidade. JavaScript/React implementa interface e funções de apoio; Supabase fornece autenticação e acesso aos dados; PostgreSQL concentra integridade, autorização e transações. As disciplinas aparecem no processamento modular dos pedidos, nas estruturas de controle e nos cálculos monetários e gerenciais. A referência possui 100 testes automatizados aprovados, incluindo 32 cenários PostgreSQL isolados, e validação remota no GitHub Actions. Permanecem pendentes a instalação integral em banco vazio, homologações conectadas e os artefatos finais da submissão. O resultado atual é um piloto funcional com limites explícitos.

Palavras-chave: aplicação integrada; JavaScript; algoritmos; matemática computacional; gestão multiunidade.

## 2. Introdução

O problema é a fragmentação das informações de atendimento e gestão em operações de alimentação. Cadastros repetidos, pedidos sem rastreabilidade e indicadores com critérios diferentes dificultam comparar unidades e conferir custos. Os interessados são operadores, gerentes, responsáveis pelo estoque, proprietários e consumidores.

A solução reúne o fluxo comercial e a operação em uma base comum. A equipe consulta pedidos, catálogo, estoque e indicadores; consumidores usam o portal da marca e escolhem a unidade responsável. No caso Brasa Burger, Japy e Retiro atendem presencial e delivery; Eloy opera somente delivery.

A plataforma Convívium permite configurar outras empresas, mantendo identidade e isolamento de dados. A justificativa acadêmica é aplicar programação, decomposição de algoritmos e matemática a um processo que produz resultados verificáveis.

## 3. Objetivos e escopo final

**Objetivo geral:** implementar e documentar uma aplicação integrada para gerir pedidos e informações de operações de alimentação, do consumidor à loja, com regras de acesso, persistência, estoque e cálculo.

Objetivos específicos:

- Separar plataforma, empresa e unidades, com identidade configurável e perfis.
- Permitir cadastro e envio de solicitação pelo consumidor, com itens, adicionais e frete válido.
- Receber a solicitação na unidade correta e gerar venda/baixa pelo aceite transacional.
- Consultar histórico e indicadores coerentes com o recorte aplicado.
- Demonstrar funções, estruturas de controle e cálculos por código e testes localizáveis.
- Disponibilizar instruções e evidências compatíveis com a versão apresentada.

**Implementado na referência:** portal por marca, conta de consumidor, catálogo/carrinho/adicionais, cotação com confirmação de ponto quando necessária, fila, aceite/recusa, pedidos, histórico, clientes, fichas, reposição, dashboard/Analytics e administração de empresas/unidades/equipe. A personalização abrange nome, logo e cor de destaque.

**Limites:** pagamento presencial; canais de marketplace lançados manualmente; financeiro/fiscal completo, aplicativo nativo, convites e tema integral são evoluções. A solicitação aguardando não reserva estoque. Instalação integral vazia, duas sessões reais e conciliação conectada precisam de homologação. HTTPS externo e confirmação de e-mail não foram comprovados. Cobertura cartográfica pode exigir confirmação do imóvel. Atualizar esses limites segundo o resultado real das atividades finais.

## 4. Histórico do projeto

A linha de base anterior possuía telas de painel, pedidos, clientes e produtos/fichas. A Entrega 1, “Brasa Burguer Management”, documentou problema, escopo, modelos e uma unidade inicial JavaScript com seus próprios exemplos e resultados. O pacote permanece histórico e não representa a arquitetura completa atual.

| Marco | Registro | Incremento ou função |
|---|---|---|
| Primeiro registro Git | `e20ed1b`, 13/09/2026 | Organização e documentação inicial; não é prova da data de criação do protótipo |
| Evolução do MVP | `b616dc7`, 05/10/2026 | Operação, análises e entregas por mapa |
| Frete no pedido | `cd50e13`, 07/10/2026 | Cotação integrada ao pedido transacional |
| Cancelamento | `1728475`, 08/10/2026 | Estorno e destinações de estoque |
| Operação e segurança | `ee20fcf`, 17/10/2026 | Regras, permissões e testes de banco |
| Interface | `f8ff1d2` e `2b709c3`, 17/10/2026 | Compositor e tema compartilhado |
| Portal | `28a283b`, 24/10/2026 | Consumidor separado do ERP e aceite transacional |
| Empresas | `6c83548`, 26/10/2026 | Contextos de empresa, escopos e frete pelo consumidor |

Repositório: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP. Na revisão, havia 22 commits de setembro/outubro. A comparação dos diffs distingue o trabalho anterior e os incrementos de 2026/2. A tag final `entrega-2-2026-2` deve ser criada após a conferência da versão final.

## 5. Método de desenvolvimento

O desenvolvimento utiliza módulos JavaScript, componentes React, funções SQL/PL/pgSQL, migrações, controle de versões e testes automatizados. Node.js 24 executa Vite e Node Test Runner. PGlite executa cenários PostgreSQL em memória, com dados sintéticos e rollback. O workflow instala dependências pelo lockfile, testa, compila e audita dependências.

O docente aceitou JavaScript, conforme confirmação do responsável em 29/10/2026. A implementação associa esse trabalho às regras SQL e aos três eixos obrigatórios do enunciado.

**Organização do grupo:** conforme a Entrega 1, Gabriel Rodrigues do Prado assume arquitetura, módulos JavaScript, modelagem OO, integração e revisão técnica; Rafaela Rodrigues Oliveira assume levantamento do fluxo, problema, entradas/saídas, casos de teste e revisão documental. Essa divisão organiza o trabalho; as atividades efetivamente realizadas na Entrega 2 precisam ser relacionadas aos artefatos e registros reais em E2-AUT-01.

O histórico observado concentra commits em uma conta. Não atribuir autoria individual a um commit compartilhado sem evidência. Ambos devem explicar implementação, cálculos e resultados na apresentação.

**Arquitetura:** React acessa Supabase Auth e PostgREST/RPC no navegador. PostgreSQL verifica autorização, preços, cotação e estoque. A Edge Function consulta openrouteservice/HeiGIT com segredo no servidor; OpenStreetMap/Leaflet fornece o mapa. Node.js não é uma API intermediária; seeds Python são legados independentes e MySQL é estudo separado.

A [Figura 1](anexos/ARQUITETURA_E_FLUXO.md) representa a arquitetura atual. O [guia](../../GUIA_PASSO_A_PASSO.md) distingue execução isolada, frontend com backend preparado e instalação integral ainda pendente. E2-REP-01 deve comprovar a reprodução em banco vazio.

## 6. Integração disciplinar

| Disciplina | Aplicação | Evidência central |
|---|---|---|
| Linguagem de Programação | Tipos, módulos, funções, eventos, entrada/saída e erros | `montarSolicitacao`, componentes do portal e envio assíncrono |
| Algoritmos e Programação Estruturada | Sequência, seleção, repetição e decomposição | Validação de itens, fila, aceite e transação de venda |
| Matemática Computacional | Somatórios, percentuais, médias e proporcionalidade | Subtotal, markup, frete, CMV, margem, ticket e testes |

A [matriz disciplinar](anexos/MATRIZ_DISCIPLINAR.md) localiza conceito, função/arquivo e teste. Desenvolvimento em JavaScript, Computação em Nuvem e Análise Orientada a Objetos complementam os três eixos, conforme a organização da Entrega 1.

## 7. Algoritmos e implementação

```text
abrir portal da empresa e escolher unidade/modalidade
montar carrinho e autenticar consumidor
se delivery: obter cotação válida para unidade e endereço
validar contato, itens e total
enviar solicitação com chave de requisição
no servidor:
    conferir conta, unidade, modalidade e limites
    para cada item e adicional:
        conferir disponibilidade, quantidade e preço
    se delivery: conferir titular, endereço, validade e reserva
    persistir solicitação aguardando, sem baixar estoque
quando equipe autorizada aceitar:
    se já houver venda vinculada: retornar a mesma venda
    em transação: conferir preços, cotação e estoque
    criar pedido, itens e consumo; vincular solicitação
    se ocorrer erro: reverter alterações
acompanhar status, histórico e indicadores
```

O [fluxograma](anexos/ARQUITETURA_E_FLUXO.md) representa sequência e condições. Repetição aparece na conferência/soma de itens e adicionais; a decomposição separa montagem, cálculo, transporte, validação e persistência.

Trechos essenciais a interpretar na versão diagramada:

- `portalCliente.js/totalCarrinho`: soma preços/adicionais em centavos, multiplica pela quantidade e converte o resultado para reais.
- `pedidoTransacional.js/criarEnvioTransacional`: conserva chave/conteúdo quando o resultado de rede é incerto e evita envio simultâneo; o servidor também valida idempotência.
- RPCs móveis e de pedido: recusam preço adulterado, cotação inválida e escopo alheio; erro em um item reverte a transação.
- `dashboard.js/calcularDashboard`: exclui cancelados, percorre pedidos/itens e calcula indicadores na base definida.

Inserir trechos curtos da versão final, com arquivo/função e explicação. A classe `Pedido` do código inicial no ZIP da Entrega 1 pertence à etapa anterior.

## 8. Matemática computacional

A [memória de cálculo](anexos/MEMORIA_CALCULO.md) define variáveis, unidades, arredondamento e limites. Subtotal soma quantidade × preço com adicionais; total acrescenta o frete validado. O modelo atual não aplica o desconto ilustrativo do exemplo inicial.

No frete, metros e centavos/km permitem arredondar somente a taxa final: 3,5 km × R$ 1,50/km = R$ 5,25. Markup de R$ 24,90 com 15% resulta em R$ 28,64, alinhando JavaScript e PostgreSQL.

CMV é custo conhecido ÷ receita dos itens com ficha × 100. Custo R$ 8,90 e receita elegível R$ 27,90 geram CMV 31,90% e margem simplificada 68,10%. Outro item de R$ 27,90 sem ficha reduz a cobertura para 50%. Frete não entra na base de CMV.

Ticket médio usa total pago dos pedidos não cancelados dividido pela quantidade desses pedidos. Denominadores inválidos geram indicador indisponível. Custo gerencial usa ficha atual e não equivale a lucro líquido. Preservar essa distinção em relação ao exemplo isolado da Entrega 1.

## 9. Testes e resultados

A execução local de 29/10/2026 de `6c83548` aprovou 100 testes, sem falhas, incluindo 32 cenários PostgreSQL isolados. O [CI de 26/10/2026](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/40368508146) aprovou testes, build e auditoria do mesmo commit.

O [catálogo de casos](anexos/CASOS_E_RESULTADOS.md) apresenta entrada, esperado, obtido e interpretação. Abrange cálculo e arredondamento, cobertura, cancelados, cotação, cadastro público, idempotência, estoque e acesso por empresa/unidade.

O centavo divergente no markup foi corrigido e tem regressão. No endereço comercial do Retiro, uma falha de geocodificação foi tratada com bloqueio de envio e mapa, sem taxa fictícia; isso não comprova sucesso de rota do imóvel.

As verificações não comprovam instalação integral em banco vazio, duas conexões remotas simultâneas, carga, precisão de trajetos reais ou e-mail externo. HM01 a HM08 registram as homologações pendentes. Atualizar resultados após execução, preservando versão, falhas e limites reais.

## 10. Conclusão

A referência integra consumidor e operação da loja com regras de acesso, cálculo e estoque. Programação, algoritmos e matemática participam do funcionamento e têm evidências localizáveis em código e testes.

O aprendizado integrado inclui decomposição, validação no servidor, transações, idempotência e definição correta da base dos indicadores. A separação entre plataforma e empresa permite evolução sem duplicar a aplicação.

O resultado atual é um piloto funcional com testes aprovados. O fechamento da Entrega 2 depende de reprodução integral, demonstração conectada, referências, comprovação de contribuições e conferência dos PDFs e ZIP. Evoluções de produto devem permanecer identificadas como possibilidades futuras.

## 11. Referências

### Fontes do projeto usadas nesta atualização

- FACULDADE ANHANGUERA. Projeto Integrado I, II e III 2026/2: Entrega 2 — Aplicação integrada. Enunciado de quatro páginas, Prof. Gilberto Falco Netto, fornecido ao grupo.
- PRADO, Gabriel Rodrigues do; OLIVEIRA, Rafaela Rodrigues. Brasa Burguer Management: proposta e modelagem integrada de um sistema web de gestão multiunidade para food service. Entrega 1. Jundiaí, 2026. Pacote histórico no repositório.
- CONVÍVIUM MANAGEMENT SYSTEM. Código-fonte, documentação e testes. Referência `6c83548`. Disponível em: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP. Consulta: 29 out. 2026.
- CONVÍVIUM MANAGEMENT SYSTEM. Validar ERP: execução de CI 40368508146. 26 out. 2026. Disponível em: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/40368508146. Conferência: 29 out. 2026.

### Bibliografia recuperada da Entrega 1 — conferir uso final

- CORMEN, Thomas H. et al. Introduction to Algorithms. 4. ed. Cambridge: MIT Press, 2022.
- ECMA INTERNATIONAL. ECMA-262: ECMAScript Language Specification. 16. ed. Geneva: Ecma International, 2025.
- FOWLER, Martin. UML Distilled: A Brief Guide to the Standard Object Modeling Language. 3. ed. Boston: Addison-Wesley, 2003.
- MELL, Peter; GRANCE, Timothy. The NIST Definition of Cloud Computing. Gaithersburg: NIST, 2011. Special Publication 800-145.
- ROSEN, Kenneth H. Discrete Mathematics and Its Applications. 8. ed. New York: McGraw-Hill, 2019.
- SOMMERVILLE, Ian. Software Engineering. 10. ed. Boston: Pearson, 2016.

**E2-REF-01:** selecionar obras efetivamente usadas, relacionar citações às explicações e incluir bibliografias das três disciplinas conforme o material institucional. Fontes técnicas de React, Node.js, PostgreSQL, Supabase e rotas devem ter URL/edição e acesso conferidos quando incorporadas. A lista herdada não comprova consulta nova nem correspondência automática à bibliografia institucional.
