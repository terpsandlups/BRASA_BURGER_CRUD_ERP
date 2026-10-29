# Registro de validação — Convivium / Brasa Burguer

## Referência acadêmica da Entrega 2 — 29/10/2026

- Código funcional conferido no GitHub: `6c83548fd19d31ad71f0f0641754597664c60eb5`, de 26/10/2026; repositório público.
- Execução local de `npm test`, em `frontend/`, em 29/10/2026: 100 testes, 100 aprovados, zero falhas/cancelados/ignorados. Inclui 32 cenários PostgreSQL/PGlite isolados; não acessa o banco operacional.
- [CI 40368508146](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/40368508146), de 26/10/2026: sucesso no mesmo commit; instalação, testes, build e auditoria configurados no workflow.
- [Casos e resultados](docs/entrega-02/anexos/CASOS_E_RESULTADOS.md): entradas, esperado, obtido, interpretação e cenários de homologação pendentes. [Matriz](docs/entrega-02/anexos/MATRIZ_DISCIPLINAR.md) e [memória de cálculo](docs/entrega-02/anexos/MEMORIA_CALCULO.md) localizam evidências das disciplinas.
- A atualização é documental. A suíte isolada e o CI não comprovam bootstrap vazio, concorrência com duas conexões remotas, confirmação de e-mail externo ou precisão de trajetos reais. O [plano da Entrega 2](docs/entrega-02/README.md) mantém esses limites e o fechamento acadêmico.
- A tag/release `entrega-2-2026-2`, os dois PDFs finais e o ZIP ainda dependem da conferência da versão de submissão.

## Fechamento 1, 2 e 3: empresas e frete do cliente — 24/10/2026

- 100 testes aprovados, incluindo 32 de PostgreSQL efêmero; build aprovado e dependências inalteradas desde a auditoria sem vulnerabilidades.
- Master cadastra empresa/unidade e troca contexto; administrador comum não cadastra outras empresas; gerente só lê sua unidade e não provisiona usuários. Mesmo CPF tem cadastros independentes em duas empresas. Relações cruzadas de estoque/ficha e edição de produto de outra marca são recusadas.
- Consumidor sem perfil ERP consulta cotação com orçamento próprio; não lê configurações internas. Cotação vencida, de outro titular, endereço divergente e reutilização em outra solicitação são recusados. Reenvio recupera a mesma solicitação. Reserva enviada conserva o frete no aceite, mesmo após os 15 minutos iniciais.
- Migração `20261025004910` aplicada e função `calcular-entrega` republicada. Banco real permaneceu com uma empresa, três unidades e sete cadastros de consumidores; a conta administrativa existente é master. Advisor remoto: zero erros de segurança.
- Navegador conectado: conta master exibiu identidade Brasa Burger, três unidades e formulários de marca, unidade, vínculo de equipe e empresa; portal exibiu a marca, impediu retirada na Eloy e iniciou cotação automaticamente ao completar CEP/número.
- Responsividade da Administração: viewport 1440 × 1000 com sidebar e duas colunas; 390 × 844 com menu recolhido e formulários empilhados. Larguras úteis/rolagem iguais (1432 px e 382 px), sem transbordamento horizontal. Selecionar Administrador no vínculo esconde unidade; Gerente mantém a seleção de unidade. Nenhum formulário administrativo foi enviado no banco real durante a conferência.
- Corrigidos CEP/bairro do Retiro por evidência do ViaCEP: `15992-503` era Rua do Retiro de Matão; número 1354 em Jundiaí está na faixa do `13209-201`, Jardim Paris. Não foram inventadas coordenadas.
- Consulta real Eloy → endereço comercial do Retiro: geocodificador não encontrou o imóvel. Resultado observado: erro de cobertura, mapa de confirmação oferecido, botão de envio desabilitado e nenhuma taxa gerada. O início automático foi verificado; sucesso de geocodificação desse imóvel não foi alegado.
- Cadastro/recebimento de e-mail em domínio HTTPS externo não foi testado, pois não existe domínio publicado nesta revisão. Cadastro usa Auth existente e retorna para `/pedir/:marca`.
- Não foram criadas empresas, contas ou vendas sintéticas persistentes em produção. Os cenários de escrita foram executados no PostgreSQL efêmero.

## Portal móvel e segurança — 24/10/2026

| Cenário | Evidência | Resultado |
|---|---|---|
| Regressão | `npm test`: 92 aprovados, zero falhas; 25 testes de PostgreSQL efêmero | Aprovado nos cenários automatizados |
| Build | `npm run build`, 753 módulos transformados | Aprovado |
| Dependências | `npm audit --audit-level=high` com certificados confiáveis do Windows | Zero vulnerabilidades |
| Cadastro de cliente | Teste insere usuário Auth e confere ausência em `usuarios`; catálogo público sem leitura de clientes/estoque | Aprovado em banco efêmero |
| Idempotência e venda | Solicitação não baixa estoque; aceite repetido retorna a mesma venda; erro de estoque/preço reverte aceite | Aprovado em banco efêmero |
| Isolamento | Cliente não consulta ERP, não lê solicitação alheia e não aceita sua solicitação; gerente de outra loja é recusado | Aprovado em banco efêmero |
| Frete no aceite | R$ 28,00 de itens + R$ 3,75 de cotação = R$ 31,75; endereço divergente recusado | Aprovado em banco efêmero |
| Edição de fichas | Definições recuperadas do banco, testadas com versão antiga, precisão e perfil sem permissão | Aprovado em banco efêmero |
| Migração remota | CLI confirmou aplicação de `20261025000912`; consulta verificou RLS habilitado, 3 unidades, 44 variações e ausência de leitura anônima de clientes/envio | Aprovado no Supabase configurado |
| Advisor remoto | Sem erros; sem `search_path` mutável ou função privilegiada pública executável por anônimo | 10 avisos remanescentes detalhados em `CONVIVIUM_EXECUCAO.md` |
| Interface do portal | Busca por Bacon Cheese na Japy; adicionar e aumentar quantidade; R$ 26,90 → R$ 53,80 | Aprovado no navegador, sem envio |
| Celular | Viewport 390 × 844; largura útil/rolagem 382 px; consulta ao banco real | Sem rolagem horizontal no cenário verificado |
| Equipe | Sessão Administrador existente abriu `/solicitacoes` e identificou fila vazia | Aprovado no navegador, sem escrita operacional |

Não foram criadas contas, clientes ou vendas sintéticos persistentes no banco real.
Continuam pendentes: recebimento e confirmação de e-mail no domínio publicado,
publicação de uma origem HTTPS para acesso externo, comparação de rotas reais,
carga e operação simultânea com duas sessões reais. A proteção contra senhas
vazadas está desativada na conta Supabase. A pesquisa de concorrentes depende da
conexão Exa, indisponível nesta sessão. A migração aplicada e os testes locais
não substituem essas homologações.

## Tema comum e padronização das abas — 17/10/2026

| Cenário | Evidência | Resultado |
|---|---|---|
| Rotas no desktop | Painel, Analytics, Histórico, Clientes, Produtos, Estoque, Entregas e Pedidos em 1.440 × 1.000 | Mesma base grafite `rgb(20,22,25)`; sem transbordamento da página |
| Rotas no celular | Oito rotas com dados carregados, viewport 390 × 844 | Largura do conteúdo igual à largura útil da página; tabelas com rolagem interna |
| Cadastro de clientes | Abrir **Novo cliente** sem preencher/enviar | Card e campos legíveis no desktop e celular; rótulos associados; cadastro pode ser recolhido |
| Produtos/ficha | Abrir card e painel de ficha; pressionar Escape | Painel grafite, texto claro e fechamento por teclado; nenhum preço ou ingrediente editado |
| Analytics | Canal Rappi sem vendas e retorno a Todos | Estado vazio distinto, filtros preservados e indicadores recuperados |
| Menu móvel | Abrir menu e navegar para Analytics | Ícones e item ativo no tema comum; painel fecha após navegar |
| Contraste | Seis testes calculam luminância/razão dos tokens para texto, secundário, marca, sucesso, erro e CTA | Contraste mínimo 4,5:1 nos pares testados; não é auditoria WCAG integral |
| Regressão | `npm test`: 79 testes, incluindo os 15 cenários de banco efêmero existentes | Todos aprovados; regras de negócio não alteradas |

Limites: validação visual e de navegação, sem gravações reais nem nova consulta
de rota cobrada por cota. Cadastros, reposições e configurações de loja não foram
salvos. A recarga de desenvolvimento fechou o compositor da aba original; o
rascunho observado (um Bacon Cheese, unidade Japy) é recomposto sem envio ao
encerrar a revisão. Concorrência, carga e homologação com perfis restritos
continuam nas pendências do MVP.

## Compositor de pedido em duas colunas — 17/10/2026

| Cenário | Evidência | Resultado |
|---|---|---|
| Cardápio | Busca por `SM001`, busca inexistente e limpeza; busca de acentos, nome comercial e variação nos testes locais | SKU encontra o produto; vazio tem mensagem e ação de limpar |
| Carrinho | Dois cliques no Smash Clássico geram uma linha com quantidade 2; incremento para 3 | Subtotal R$ 59,70 no canal próprio |
| Canal | Troca para iFood com 3 unidades | Subtotal atualizado para R$ 68,67, sem frete próprio duplicado |
| Adicionais | Monte Seu Burger adicionado com Cheddar | Linha R$ 30,90 no canal próprio; total dos quatro itens R$ 90,60 |
| Identificação/pagamento | CPF sintético inválido, seleção de unidade e dinheiro sem valor recebido | Erro de CPF visível; vazio explicado como valor exato; nenhuma escrita de cliente/pedido |
| Conclusão | Cinco novos testes de filtro e pendências, incluindo quantidade inválida, frete ausente e troco insuficiente | Botão não libera pedido incompleto; dinheiro exato vazio aceito |
| Layout | Navegador em 390 × 844, 1.024 × 900 e 1.440 × 1.000; celular com 382px úteis e conteúdo de 382px | Sem estouro horizontal; carrinho/CTA visíveis em notebook; atalho móvel ao resumo |
| Acessibilidade | Rótulos de campos, botões de quantidade/remover, canais pressionados, estado vazio, observações e entrega expansíveis | Estados apresentados na árvore de acessibilidade; console sem erros/avisos durante a conferência |
| Regressão | `npm test`: 73 aprovados, incluindo 15 cenários de PostgreSQL isolado; `npm run build` aprovado | Sem novos pacotes ou migrações |

Limites desta revisão: não foi enviado, cancelado ou alterado um pedido real;
não houve nova consulta de rota real ou homologação do cadastro rápido no
Supabase. A integração existente foi preservada. O mapa ganhou observação de
redimensionamento para acompanhar a expansão da seção de endereço. Testes com
duas sessões, carga e perfis distintos continuam pendentes de homologação.

## Revisão operacional, interface e segurança — 17/10/2026

História validada: operador monta um pedido com preço por canal e adicionais;
o servidor confirma total, estoque e entrega; avanço e cancelamento preservam
estado e auditoria; a interface apresenta o resultado e permite recuperação.
Referências e casos derivados em `CASOS_USO_VAREJO.md`.

| Camada | Evidência | Resultado |
|---|---|---|
| Testes locais | `npm test`: 68 testes, incluindo 15 de PostgreSQL isolado | Todos passaram |
| Banco isolado | SQLs reais de criação/frete, estorno, reposição e RLS carregados no PGlite; cada cenário termina em rollback | Sem acesso ao Supabase real nos testes |
| Preço por canal | Antes: R$ 24,90 + 15% mostrava R$ 28,63; agora navegador e `round(numeric)` retornam R$ 28,64 | Corrigido e testado com venda pela RPC |
| Estoque | Falta de adicional reverte a venda inteira; reposição soma saldo atual e não duplica no reenvio | Aprovado no banco isolado |
| Cancelamento | Devolução pela ficha da venda, perda com custo, reaproveitamento em cadeia e recusa de composição diferente | Aprovado no banco isolado |
| Permissões | Leitor não edita RBAC/catálogo; gerente de outra loja e usuário inativo não leem/alteram pedidos | Aprovado no banco isolado |
| Supabase real | Duas migrações aplicadas e registradas; 12 pedidos preservados e zero reposições de teste | Nenhum pedido real cancelado para testar |
| Advisor do Supabase | `db advisors --type security --level error`: `No issues found` | Oito erros antigos de views resolvidos; isto não afirma ausência de avisos de outros níveis |
| Dependências | `npm audit`: `found 0 vulnerabilities` | Vite 6.4.4, Tailwind 4.3.3 e Router 7.18.4 com lockfile atualizado |
| Build | Produção compilada; entrada JS de aproximadamente 1.081,78 kB para 424,89 kB | Cerca de 61% menor; páginas, mapas e gráficos carregados separadamente |
| Navegador conectado | Histórico com 12 registros; catálogo com 38 produtos; estoque com 38 insumos na unidade Japy; Analytics carregado | Leituras sem alertas de erro após as políticas novas |
| Carrinho | Busca `hamburguer` encontra `Hambúrguer`; dois cliques agrupam quantidade 2; quantidade pode ser editada; canal atualiza preço | Aprovado sem enviar um pedido real |
| Operação | Busca inexistente zera cartões sem alterar KPIs; filtro Pronto isola a coluna; Escape fecha painel e devolve foco | Aprovado no navegador |
| Layout | Conferência de celular 390 × 844 e desktop 1440 × 900; no celular largura do conteúdo igual à da página (382px úteis) | Sem transbordamento horizontal da operação |
| Exportação | CSV baixado com 9 produtos e quatro colunas esperadas | Aprovado no navegador e leitura do arquivo |
| Regressão futura | Workflow `.github/workflows/validacao.yml` executa testes, build e auditoria no GitHub | Configurado; resultado do runner remoto deve ser conferido após o push |

Limites: testes de banco usam ambiente efêmero, não duas conexões remotas
concorrentes. As chamadas cartográficas continuam com testes simulados e com a
validação real anterior do usuário. Ainda é necessário homologar carga,
concorrência e operação com perfis distintos num ambiente descartável antes de
classificar o produto como MVP final de produção.

## Frete no pedido — 07/10/2026

| Cenário | Resultado observado | Estado |
|---|---|---|
| Pedido real, delivery próprio | Itens R$ 86,60 + frete R$ 7,95 = total R$ 94,55; distância 5.298 m; cotação marcada como consumida | Aprovado no cenário testado |
| Banco, teste com cotação sintética | Total, subtotal, idempotência e bloqueio de reuso conferidos; transação encerrada com `ROLLBACK` | Aprovado, sem registros de teste persistidos |
| Escrita direta autenticada | `INSERT` em pedidos/itens e `UPDATE` do total negados; `SELECT` e `UPDATE` de status preservados | Aprovado por consulta de privilégios |
| Frontend | 45 testes automatizados e build de produção | Aprovado; aviso de bundle grande permanece |
| Navegador local após recarga | Pedido aparece no Kanban com total R$ 94,55; detalhe mostra itens R$ 86,60 e frete R$ 7,95; Histórico mostra a taxa; filtro Hoje e Analytics separam frete do faturamento | Aprovado no cenário testado |

Pendências: testar criação, avanço/cancelamento e histórico com perfis restritos e
duas sessões; validar erro de rede após envio e expiração da cotação na interface;
confirmar trajetos reais variados. Este registro não equivale a homologação geral.
Uma referência antiga de modo de gravação deixou a página de Pedidos vazia após
recarga; foi removida e a página foi reaberta no navegador antes da publicação
da correção. A auditoria de segurança ainda aponta dez views analíticas antigas
com `SECURITY DEFINER`; revisão de exposição e RLS fica na próxima etapa.

## Retorno de uso — 07/10/2026

**Versão:** fluxo de simulação de entregas publicado no projeto, antes da integração do frete ao pedido.

| Área | Entrada ou cenário | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|---|
| Entregas | Endereço físico e ponto confirmado no mapa OpenStreetMap | Calcular rota e taxa proporcional pelo openrouteservice | O mantenedor relatou que a simulação funcionou no aplicativo | Validado pelo usuário no cenário testado |

O relato confirma o funcionamento desse cenário, não a cobertura de todos os
endereços nem a precisão de cada trajeto. A taxa ainda não é lançada no pedido.
Na revisão técnica anterior, 40 testes automatizados e o build do frontend
passaram; a validação em campo acima foi informada pelo mantenedor.

## Execução de 13/09/2026

**Versão:** cópia local ainda sem repositório Git (`.git` ausente).

| Área | Entrada ou cenário | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|---|
| Endereço | CEP `01310-100` no cadastro de Clientes | Preencher rua, bairro, cidade e UF sem perder campos | Avenida Paulista, Bela Vista, São Paulo e SP preenchidos em conjunto | Aprovado |
| Endereço no pedido | Atualizações consecutivas de rua, bairro, cidade e UF | Preservar todos os campos no cadastro rápido | Teste automatizado do atualizador funcional aprovado | Aprovado |
| Dashboard | Período de 7 dias em 13/09/2026 | Incluir 07/09 a 13/09, com sete pontos no gráfico | Intervalo e preenchimento dos dias aprovados | Aprovado |
| Dashboard | Todas as unidades → Unidade Japy | Todos os indicadores devem acompanhar o filtro | Faturamento/pedidos mudaram de R$ 629,70/8 para R$ 376,90/5 | Aprovado |
| Dashboard | Custo R$ 8,90 e receita elegível R$ 27,90 | CMV 31,90% e margem bruta 68,10% | Teste automatizado aprovado | Aprovado |
| Dashboard | Item sem ficha técnica | Não apresentar custo ausente como margem de 100% | Indicadores usam apenas receita elegível e mostram cobertura | Aprovado |
| Dashboard | Pedido cancelado | Excluir de faturamento, ticket, produtos e canais | Teste automatizado aprovado | Aprovado |
| Pedidos | Tela conectada com sessão Administrador | Carregar lojas e indicadores operacionais | Três unidades e indicadores do dia carregados | Aprovado |
| Pedidos | Alterações externas em pedidos/itens | Atualizar o quadro sem aguardar recarga manual | Realtime implementado com atualização periódica de segurança | Implementado; validar com duas sessões |
| Pedidos | Cliques repetidos em finalizar/avançar/cancelar | Evitar duplicidade durante requisição em andamento | Travas síncronas e estados desabilitados implementados | Implementado; teste integrado pendente |

## Verificações técnicas

- `npm test`: 3 testes aprovados.
- `npm run build`: compilação de produção aprovada.
- O aviso de pacote JavaScript acima de 500 kB permanece; divisão do pacote é melhoria de desempenho futura.
- A gravação de pedido ainda ocorre em mais de uma requisição. A atomicidade completa exige uma função transacional no PostgreSQL e migração coordenada com o frontend.
- Testes de isolamento por perfil/unidade exigem usuários de teste restritos no Supabase.
