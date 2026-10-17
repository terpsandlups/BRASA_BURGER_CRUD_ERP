# Registro de validação — Brasa Burguer

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
