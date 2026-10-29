# Convívium Management System

ERP para operações de alimentação. **Convívium é a plataforma; Brasa Burger é a primeira empresa cliente.** Operação e portal usam a identidade da empresa, com identificação do Convívium no rodapé.

## Entrega 2 — aplicação integrada — 2026/2

O foco acadêmico atual é a **Entrega 2**. O [plano completo](docs/entrega-02/README.md) reúne requisitos, evidências, pendências e critérios de conclusão. A Entrega 1 permanece como linha de base documental e histórica.

- **Prazo:** 27/11/2026, no horário institucional; semana de entrega de 23 a 27/11.
- **Valor:** 7.000 pontos.
- **Submissão:** formulário oficial com título, URL completa do repositório e um ZIP de até 100 MB.
- **Pacote final:** `PI-2026-2-CONVIVIUM-MANAGEMENT-SYSTEM-ENTREGA-2.zip`, contendo `trabalho-escrito.pdf`, `apresentacao.pdf` e `anexos/`.
- **Versão final:** tag ou release `entrega-2-2026-2`, a criar após o fechamento e a conferência dos PDFs.
- **Estado:** piloto funcional; documentação da Entrega 2 em consolidação. Os PDFs e o ZIP finais ainda precisam ser produzidos e conferidos.

## Identificação acadêmica

| Campo | Informação |
|---|---|
| Instituição | Faculdade Anhanguera |
| Curso | Tecnologia em Análise e Desenvolvimento de Sistemas |
| Disciplina e turma | Projeto Integrado I, II e III |
| Período e local | 2026/2 — Jundiaí/SP |
| Docente | Prof. Gilberto Falco Netto |
| Integrantes | Gabriel Rodrigues do Prado, 3º semestre; Rafaela Rodrigues Oliveira, 1º semestre |
| Modalidade | Continuidade de protótipo acadêmico |
| Linguagem | JavaScript, com regras SQL/PL/pgSQL; aceite do docente confirmado pelo responsável em 29/10/2026 |

A identificação e a organização inicial do grupo vêm da Entrega 1. Gabriel tem atribuições de arquitetura, JavaScript, modelagem e integração; Rafaela, de levantamento, fluxo, validação, testes e documentação. A Entrega 2 deve relacionar as contribuições efetivas a artefatos e registros, conforme seu plano.

## Problema, público e objetivo

Controles separados dificultam recuperar pedidos, conferir custos, acompanhar estoque e comparar unidades. O sistema integra atendimento, clientes, cardápio, fichas técnicas, pedidos, entregas e indicadores para operadores, gerentes e proprietários.

O caso Brasa Burger considera Japy e Retiro com presencial e delivery, e Eloy exclusivamente delivery. A plataforma administra outras empresas sem duplicar o código da interface.

## Funcionalidades e limites atuais

| Área | Implementação | Limite relevante |
|---|---|---|
| Plataforma e marca | Master cadastra empresas; administrador configura nome, logo, cor, unidades e equipe | Vínculo exige conta Auth existente; convite por e-mail e edição integral do tema são futuros |
| Acesso | Autenticação e autorização por empresa, perfil e unidade, com RLS e validação no banco | Homologação com duas sessões reais pendente |
| Portal do consumidor | Catálogo, conta, carrinho, adicionais, unidade, frete e acompanhamento próprio | HTTPS e confirmação de e-mail na origem externa ainda não homologados |
| Recebimento pela loja | Fila por unidade; aceite cria venda e baixa estoque em transação | Solicitação aguardando não reserva estoque |
| Pedidos e histórico | Compositor, preço por canal, busca, status, recuperação de envio e cancelamento | Reaproveitamento exige pedido integral de composição idêntica |
| Produtos e estoque | Catálogo, fichas, edição de preço/quantidade, insumos e reposição atômica | Compras e inventário avançado fora do escopo atual |
| Entrega própria | openrouteservice/HeiGIT e mapa OpenStreetMap/Leaflet; cotação pelo servidor | Cobertura pode exigir ponto confirmado; comparação de trajetos reais pendente |
| Indicadores | Filtros, faturamento, frete separado, ticket, CMV, cobertura de custo, rankings e CSV | CMV gerencial usa ficha atual; não equivale a lucro líquido |
| Canais | Venda própria e lançamento manual dos demais canais previstos | APIs iFood/Goomer/Rappi e pagamento online são futuros |

## Arquitetura

| Camada ou pasta | Responsabilidade |
|---|---|
| `frontend/src/pages/` e `components/` | React/JSX, navegação, formulários e interface |
| `frontend/src/lib/` | Cálculos, validação, autorização visual e envio |
| Supabase Auth e PostgREST | Autenticação e acesso aos dados/RPCs |
| `sql/` e `supabase/migrations/` | PostgreSQL, PL/pgSQL, integridade, transações e RLS |
| `supabase/functions/calcular-entrega/` | Sessão, provedor de rotas e cotação no servidor |
| `frontend/test/` | Testes Node.js e PostgreSQL isolado com PGlite |
| `python/` | Scripts legados independentes de carga |
| `mysql/` | Estudo analítico separado do banco transacional |
| `docs/entrega-02/` | Requisitos, texto-base, matriz, cálculos e evidências da Entrega 2 |

Node.js 24 executa ferramentas e testes. React executa no navegador e acessa Supabase; não há API própria Node.js intermediária. O frontend ainda não possui publicação HTTPS comprovada.

## Instalação e execução

O [guia atualizado](GUIA_PASSO_A_PASSO.md) distingue testes isolados, uso com backend preparado e instalação integral. Para testes e build, não são necessárias credenciais:

```powershell
git clone https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP.git
cd BRASA_BURGER_CRUD_ERP/frontend
npm ci
npm test
npm run build
```

Com backend já preparado, copie `frontend/.env.example` para `frontend/.env`, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com URL e chave pública e execute, em `frontend/`:

```powershell
npm run dev
```

Abra a URL exibida pelo Vite. `127.0.0.1` funciona apenas no próprio computador. A **instalação integral em banco vazio permanece pendente de comprovação**: migrações dependem do bootstrap legado em `sql/`; testes com fixture não comprovam esse bootstrap.

## Uso principal

1. Consumidor abre `/pedir/brasa-burger`, seleciona unidade e modalidade, monta o carrinho e entra ou cria conta.
2. No delivery, o endereço completo inicia a cotação. Quando necessário, confirma o imóvel no mapa; vê itens, frete e total antes de enviar.
3. A solicitação chega à fila da unidade em `/solicitacoes`. A equipe aceita ou recusa; aceite cria venda e baixa estoque uma vez nos cenários testados.
4. A equipe acompanha `/pedidos` e `/historico`; o consumidor acompanha suas solicitações. Pagamento ocorre presencialmente, na retirada ou entrega.
5. Master e administrador usam `/administracao`. Gerente opera na unidade vinculada. Cadastro público não cria colaborador do ERP.

## Disciplinas e matemática

| Disciplina exigida | Evidência atual |
|---|---|
| Linguagem de Programação | JavaScript modular, tipos, funções, eventos, entrada/saída, erros e RPCs |
| Algoritmos e Programação Estruturada | Validação, seleção, repetição e decomposição do pedido e do aceite |
| Matemática Computacional | Somatórios, arredondamento, frete por distância, CMV, margem, ticket e CPF |

A [matriz disciplinar](docs/entrega-02/anexos/MATRIZ_DISCIPLINAR.md) localiza funções e testes; a [memória de cálculo](docs/entrega-02/anexos/MEMORIA_CALCULO.md) define variáveis e resultados. Custo R$ 8,90 e receita R$ 27,90 resultam em CMV 31,90% e margem simplificada 68,10%. No dashboard, a base de CMV é a receita dos itens com ficha; frete não compõe essa base. Cancelados são excluídos e cobertura incompleta é informada.

Desenvolvimento em JavaScript, Computação em Nuvem e Análise Orientada a Objetos complementam os três eixos obrigatórios, conforme a organização acadêmica da Entrega 1.

## Testes, histórico e segurança

Em 29/10/2026, a revisão de `6c83548` executou **100 testes, 100 aprovados e zero falhas**, incluindo 32 cenários PostgreSQL isolados. O [GitHub Actions de 26/10/2026](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/40368508146) aprovou testes, build e auditoria nessa versão. Consulte [casos e resultados da Entrega 2](docs/entrega-02/anexos/CASOS_E_RESULTADOS.md) e [registros anteriores](VALIDACAO.md).

O histórico possui incrementos de setembro e outubro de 2026. O [texto-base](docs/entrega-02/TRABALHO_ESCRITO.md) distingue protótipo, Entrega 1 e evolução integrada. Os commits observados estão concentrados em `terpsandlups`; a comprovação individual também depende de registros e artefatos reais.

Credenciais e dados pessoais reais devem ficar fora do Git e dos anexos. Use `.env.example`; chaves privilegiadas e `ORS_API_KEY` pertencem ao servidor. Testes isolados usam dados sintéticos. A revisão final do histórico, arquivos e capturas integra o checklist da Entrega 2.

## Documentos

- [Plano e checklist completo da Entrega 2](docs/entrega-02/README.md).
- [Texto-base do trabalho escrito](docs/entrega-02/TRABALHO_ESCRITO.md).
- [Guia de execução e demonstração](GUIA_PASSO_A_PASSO.md).
- [Roadmap de produto e histórico](ROADMAP_EXECUCAO.md).
- [Oito pedidos de melhoria](CONVIVIUM_EXECUCAO.md).
- [Mapas e função de entrega](MVP_GRATUITO_SETUP.md).
- [Integrações futuras](INTEGRACOES_FUTURAS.md).

O pacote `PI-2026-2-BRASA-BURGUER-ENTREGA-1.zip` documenta a Entrega 1. Seus PDFs e exemplos antigos não substituem os artefatos finais da Entrega 2.
