# Continuidade de execução

## Situação do MVP Brasa Burguer — 08/10/2026 (horário de Brasília)

O produto está em **piloto funcional**, não homologado como MVP final. A base de
cadastros, pedido transacional, frete próprio por rota gratuita, Histórico,
Dashboard e portal Analytics existe e passou nos cenários registrados em
`VALIDACAO.md`. Não existe ainda um ERP multi-marca configurável pelo usuário;
essa evolução vem depois de estabilizar a operação Brasa Burguer.

| Bloco | Situação verificada | Próximo fechamento |
|---|---|---|
| 4.1 Dashboard | Filtro Hoje/7/15/30/90 dias e separação do frete validados no cenário real | Testes de reconciliação, cancelados e perfis/unidades |
| 4.2 Pedidos e entregas | Pedido transacional, frete openrouteservice e cancelamento/estorno com três destinos implantados | Homologar cancelamento e estoque com pedidos de teste autorizados, duas sessões e perfis/unidades |
| 4.3 Clientes/CRM | Cadastro, CEP, busca e histórico implementados | Testes conectados de permissão, edição e múltiplas sessões |
| 4.4 Produtos e estoque | Catálogo/fichas, baixa por venda e telas de insumos/estoque existentes | Validar cadastro, vínculo por loja, saldo, ficha e movimentações |
| 4.5 Analytics | Portal, filtros, ranking e exportação CSV implementados; frete separado; fatos de venda corrigidos para cancelamentos | Conciliar taxas/CMV e proteger oito views antigas |
| 4.6 Promoções | Planejado, não implementado | Cupons de influenciadores e frete grátis com regras no servidor |
| Fechamento do MVP | Ainda pendente | Testes ponta a ponta, segurança, instalação reproduzível e publicação |

### Regra de cancelamento confirmada pelo usuário

Todo cancelamento deve exigir **motivo** e uma das três destinações, registrada
com usuário e data:

1. **Voltar ao estoque:** reverter exatamente uma vez os insumos baixados pelo
   pedido, com movimentação auditável.
2. **Custo operacional:** o lanche já foi preparado; manter a baixa original e
   classificar o consumo como perda/custo operacional. Não fazer segunda baixa.
3. **Encaixar em outro pedido:** reaproveitar somente um item **idêntico**
   (mesma variação e adicionais) de um pedido existente. Vincular origem e
   destino, compensando a baixa duplicada do pedido de destino exatamente uma
   vez. Não reutilizar o mesmo item em dois destinos.

Fluxo implantado em `20261009000030_cancelamento_estorno_estoque.sql`:
cancelamento e estorno contábil ocorrem em uma RPC atômica, com usuário, motivo,
data, valor original e destino registrados. O pedido permanece no histórico,
mas seu faturamento passa a zero nos indicadores. Não há devolução automática
do dinheiro no Pix/cartão; isso depende de integração futura com um meio de
pagamento. A perda operacional guarda o custo dos insumos registrado na venda,
sem nova baixa. O reaproveitamento exige pedido ativo da mesma loja com o
**pedido inteiro idêntico** (itens, variações, adicionais e quantidades), sem
aproveitamento parcial; desfaz somente a baixa duplicada do destino. Pedidos
anteriores à implantação não têm fotografia do consumo e só podem ser
cancelados como perda operacional para evitar reposição estimada.

Migração aplicada no Supabase e inspecionada sem cancelar pedidos reais; 47
testes de frontend e build passaram. Falta validar um ciclo ponta a ponta em
ambiente de teste com estoque, dois pedidos idênticos, concorrência e permissões
de perfis/unidades. Não considerar o fluxo homologado para produção até isso.
As views `fato_vendas` e `fato_itens_venda` também foram corrigidas: cancelados
ficam com receita e encargos zerados no fato de vendas, têm o valor original em
coluna separada e não aparecem no fato de itens vendidos. Ambas agora usam
permissões do usuário (`security_invoker`). A auditoria ainda aponta oito
views antigas com `SECURITY DEFINER`, fora deste incremento.

**Ordem de execução recomendada:** (1) cancelamento e razão de estoque;
(2) validação de insumos/fichas e perfis; (3) conciliação analítica e segurança
das views; (4) cupons; (5) regressão completa e checklist de release gratuito.

## Etapa atual do MVP — frete no pedido e próximas validações (07/10/2026)

- **Concluído no cenário testado:** cotação openrouteservice vinculada ao
  delivery próprio, consumida pela RPC transacional; itens e frete aparecem
  separados no pedido, histórico, dashboard e Analytics. Pedido real conferido:
  R$ 86,60 + R$ 7,95 = R$ 94,55. Marketplaces não recebem taxa própria extra.
  As tabelas de pedido/itens não aceitam escrita direta do usuário autenticado;
  atualização de status continua permitida. 45 testes locais e build passaram.
- **Validação ainda necessária:** fluxo em duas sessões; perfis e lojas
  diferentes; expiração, falta de cobertura e cota do provedor; perda da
  resposta de rede; cancelamento/estorno e conciliação de estoque. Comparar
  amostra de rotas com trajetos reais. Não tratar um único pedido como
  homologação do produto.
- **Próxima revisão técnica prioritária:** regras de transição/cancelamento no
  servidor, permissões por perfil/unidade, views analíticas antigas apontadas
  pelo Advisor (dez alertas `SECURITY DEFINER`), cobertura das fichas e estoque. Depois, fechar testes de
  regressão, instruções de instalação e checklist de publicação do MVP gratuito.
- **Cupons planejados:** códigos de influenciadores para atribuição e desconto;
  cupom de frete grátis para delivery próprio. Ambos devem ser validados no
  servidor, com período, limite de uso, elegibilidade e registro no pedido.
  Frete grátis não dispensa calcular a rota: a cotação registra o custo bruto e
  o cupom zera apenas a cobrança ao cliente. Antes de implementar, definir
  porcentagem/valor do desconto, cumulatividade, elegibilidade por canal e
  quem absorve o custo do frete. Não ativar cupons no navegador isoladamente.

## Validação do usuário e próximos limites — 07/10/2026

- O usuário confirmou que o fluxo de simulação de entrega está funcionando com mapa OpenStreetMap e rotas openrouteservice. Registro baseado no teste relatado pelo usuário; cobertura de outros endereços e comparação sistemática com trajetos reais ainda precisam de validação.
- README atualizado para explicitar a proposta de ERP de varejo alimentar com identidade e operação configuráveis por estabelecimento. Essa personalização completa continua no roadmap; não está pronta para outras marcas.
- A aplicação transacional do frete ao pedido foi concluída na etapa atual acima. Permanecem pendentes testes de cobertura e dos limites do plano gratuito antes de uso operacional amplo. Google Maps não integra o MVP atual.

## Base cartográfica vigente no MVP

- O projeto está em testes com mapa Leaflet/OpenStreetMap e geocodificação/rotas openrouteservice/HeiGIT no plano gratuito. Google Maps API não está ativo; o guia Google é histórico e uma eventual migração exigirá decisão posterior sobre custos, cobertura e implementação.
- Endereço postal e ponto geográfico têm funções diferentes: o endereço identifica a entrega, enquanto um ponto confirmado complementa a geocodificação quando a base gratuita não encontra o imóvel. A busca aproximada no mapa não gera taxa sozinha.

## Busca assistida no mapa e posicionamento do produto — 05/10/2026

- Adicionada busca autenticada por endereço que centraliza o mapa do destino na região encontrada pelo openrouteservice/Pelias. O resultado informa se é imóvel, rua ou CEP; somente um imóvel exato pode ser usado sem marcação manual. Rua/CEP aproximados nunca viram coordenadas de cobrança automaticamente.
- Teste real com CEP 13211-772 e número 165 centralizou o mapa na Avenida Reserva do Japy e indicou corretamente precisão de rua, sem selecionar pino nem gerar taxa. 40 testes automatizados e build aprovados. O ponto da loja Eloy foi marcado e salvo pelo usuário; ele confirmou que corresponde ao imóvel real.
- Visão de produto registrada no README: ERP de varejo alimentar com identidade própria da marca. Personalização integral por estabelecimento segue como evolução, não como recurso pronto. Cobrança de frete no pedido ainda não foi implementada.

## Decisão atual: mapa opcional para complementar endereços — 05/10/2026

- A pedido do usuário, restaurados mapas OpenStreetMap/Leaflet para marcar origem persistente por loja e destino temporário por consulta. Quando há ponto, o openrouteservice roteia por essas coordenadas; se não há, tenta geocodificar o endereço completo. CEP sozinho não produz coordenada do imóvel.
- A interface exige confirmação de que cada novo ponto representa o imóvel e identifica no resultado qual lado veio de ponto ou de endereço. Alterações dos campos de localização removem o ponto ainda não salvo; alterações pendentes na origem bloqueiam a consulta até salvar. Nenhum ponto aleatório deve ser tratado como validação do CEP.
- Função `calcular-entrega` publicada no Supabase; 38 testes automatizados e build aprovados. Falta validação operacional com pontos reais de origem e destino e comparação do trajeto. Cobrança no pedido ainda não está ativada.

## Decisão anterior, substituída: frete somente por endereço — 05/10/2026

- A pedido do usuário, removidos os mapas/pinos da interface e a leitura de coordenadas manuais na função `calcular-entrega`. Origem e destino agora exigem geocodificação dos endereços completos; CEP apenas preenche campos postais.
- A função foi republicada no Supabase. O único ponto salvo, de teste da unidade Eloy, foi apagado; endereço e tarifa foram preservados. A migração histórica de colunas de coordenadas permanece no repositório, mas esses campos não são usados no cálculo.
- 37 testes passaram e o build do frontend concluiu. Teste autenticado na interface com origem Eloy (CEP 13212-070, número 977) e destino Rua Chiara Lubich, 371 (CEP 13212-117) recusou a origem: o imóvel não está na base gratuita consultada. Nenhuma taxa automática foi gerada. Os resultados anteriores com pinos não comprovavam cálculo por endereço.
- Próxima decisão técnica: verificar cobertura de outro geocodificador gratuito para o endereço real da loja, mantendo a validação de rua/número/CEP; sem correspondência confiável, não cobrar automaticamente. Frete no pedido permanece pendente.

## Histórico substituído: teste de mapa gratuito — 05/10/2026

- Interface de Entregas esclarece que CEP completa dados postais, enquanto a rota exige localização de imóvel. Exibe estado do pino salvo da loja e ação direta para marcar origem/destino quando a base não localizar o número. Build aprovado. Consulta ao banco confirma que nenhuma das três lojas ainda tem ponto salvo.
- Projeto `aglrevynnumzokvwutok` restaurado pelo usuário; estado `ACTIVE_HEALTHY` confirmado. `calcular-entrega` republicada com sucesso.
- Consulta autenticada real do CEP 13211-772, número 550, mostrou que a origem da loja Eloy (número 1007) falha primeiro. Busca estruturada adicional também não encontrou esse imóvel no provedor. O destino não chegou a ser geocodificado nessa consulta.
- Adicionado mapa OpenStreetMap/Leaflet para marcar origem persistente por loja e destino temporário da simulação. Somente Administrador/Gerente pode salvar a origem; o destino não é persistido. Pontos no mapa dispensam geocodificação daquele lado, sem taxa automática quando não há rota válida.
- Migração `supabase/migrations/20261005220617_origem_mapa.sql` aplicada no projeto e restrição de coordenadas confirmada. Três lojas preservadas; nenhuma recebeu ponto automaticamente. Função com suporte a pontos publicada. 38 testes locais e build aprovados.
- Naquele momento, estava pendente marcar origem e destino no mapa. Esta abordagem foi abandonada na decisão atual acima; nenhum pino deve ser necessário ou usado para cotar frete. Cobrança no pedido permanece futura.
- Auditoria de segurança do Supabase apontou duas views antigas de custos/vendas com leitura anônima e privilégios do criador. Migração `supabase/migrations/20261005222321_proteger_views_dashboard.sql` aplicada: `anon_select=false`, `authenticated_select=true` e `security_invoker=true` confirmados nas duas views. Outros avisos da auditoria exigem revisão separada; não foram eliminados neste incremento.

## Retomada e diagnóstico de endereços — 05/10/2026

- Corrigidas equivalências seguras na geocodificação: abreviações de tipo da via (ex.: Av./Avenida) e UF por nome completo quando a sigla não é informada pelo provedor. Números e nomes diferentes continuam bloqueados; sem aproximação por similaridade.
- Falhas agora identificam loja/origem ou entrega/destino e os campos não confirmados. Falta de cobertura não é apresentada como certeza de erro no cadastro. CEP ausente, múltiplos pontos e precisão insuficiente continuam sem gerar taxa.
- 35 testes automatizados aprovados e build concluído (aviso existente de bundle grande). Nenhuma alteração de schema, dados de clientes, pedidos ou estoque.
- Publicação tentada, mas recusada pelo Supabase: projeto `aglrevynnumzokvwutok` com status `INACTIVE`. Correção apenas local até retomar o projeto e republicar `calcular-entrega`.
- Próximo passo: retomar o Supabase, publicar e repetir consulta autenticada do endereço reportado. Ainda não foi observado o retorno real do geocodificador para esse caso; não declarar a entrega ponta a ponta corrigida. Cobrança no pedido segue pendente até validar a localização.

## Publicação da integração gratuita — 22/09/2026

- Função `calcular-entrega` publicada no projeto `aglrevynnumzokvwutok` com o provedor openrouteservice nos endereços atuais api.heigit.org.
- Existência de ORS_API_KEY confirmada por metadados, sem recuperar seu valor. ALLOWED_ORIGINS configurado para localhost:5173 e 127.0.0.1:5173.
- Migração `sql/migration_consulta_rotas.sql` executada e existência da RPC confirmada. Três lojas já possuem configuração de entrega.
- Verificação remota: preflight da origem local respondeu 204; chamada sem sessão foi recusada. Consulta real autenticada ao provedor e precisão das rotas ainda não validadas.
- Falha da CLI diagnosticada como confiança TLS no certificado do Avast. Usado certificado público já confiável no Windows via NODE_EXTRA_CA_CERTS apenas no processo; nenhum antivírus/TLS desativado nem configuração global alterada.
- Nenhum pedido ou saldo de estoque alterado. Cobrança do frete no pedido continua pendente; a função publicada é de simulação.

## Decisão atual — MVP gratuito

- Usuário decidiu não fazer pré-pagamento Google; nenhuma contratação paga nesta fase.
- Função de entregas alterada para openrouteservice como único provedor ativo; Google preservado como adaptador futuro, sem fallback. Plano gratuito sujeito a cotas e cobertura.
- Guia vigente: `MVP_GRATUITO_SETUP.md`. Exige chave gratuita `ORS_API_KEY` e republicação da função. Migrações de entrega existentes continuam necessárias; nenhuma nova migração nesta troca.
- Até duas consultas de geocodificação e uma rota por cálculo; endereços genéricos/ambíguos bloqueados e cotas esgotadas não retornam frete zero.
- Testes locais simulados; ativação e consulta real ainda pendentes. Cobrança no pedido ainda não implementada.

## Continuidade CRM — validação concluída em 22/09/2026

- Busca de clientes aceita CPF com pontuação e nome sem diferenciar maiúsculas.
- Lista e histórico do perfil carregados em páginas, com ordenação estável, evitando o corte no limite padrão do banco.
- Perfil recarregado a cada abertura; respostas antigas ignoradas ao fechar ou trocar cliente. Erros de leitura são exibidos, não convertidos em ausência de pedidos.
- Cadastro protegido contra envio simultâneo; falhas liberam o formulário para nova tentativa.
- 27 testes locais e compilação aprovados. Validação integrada de cadastro/perfis continua pendente; nenhum cliente foi gravado para teste. Sem nova migração SQL e sem envio ao GitHub neste incremento.
- Migração de edição de fichas confirmada pelo usuário; conferir gravação real e permissões permanece uma etapa separada.

## Manutenção de variações e fichas

- Painel lateral em Produtos: listar composição, editar nome/preço de variação e quantidade de cada ingrediente, respeitando g/ml/un e até três casas decimais.
- Gravação por RPC com autorização de Administrador/Gerente ativo e comparação do valor anterior contra edições simultâneas. Catálogo compartilhado: vale para todas as unidades.
- Executar `sql/migration_edicao_fichas.sql` após schema e fase1 para ativar. SQL ainda não executado/testado no servidor. Políticas antigas de escrita direta não são modificadas por esta migração.
- Sem alteração de preço dos itens já vendidos ou reposição de estoque. As views usam ficha atual, portanto estimativas históricas podem mudar; aviso exibido na interface.
- Validar após instalar: alterar preço, reabrir e conferir; alterar quantidade, conferir CMV; editar a mesma linha em duas sessões e confirmar recusa do valor antigo; verificar bloqueio com perfil sem permissão. Nenhum dado real foi editado nesta implementação.

## Layout 13 integrado e vínculo Git

- Aplicados barra superior com usuário/sair, conteúdo em largura completa e painéis laterais em Pedidos, Histórico e Clientes do pacote `atualizacao13_layout_full_sidepanel.zip`.
- Mantidos Analytics/Entregas, correções de CEP/busca, indicadores por unidade, tratamento de falhas e pedido transacional. O ZIP continha versões antigas dessas funções; não foi extraído sobre o projeto inteiro.
- Painel usa diálogo modal nativo: fechamento por Escape, foco contido, retorno ao elemento anterior e botão de fechar identificado.
- Git inicializado com `origin` no repositório autorizado e `main` acompanhando `origin/main`; histórico remoto preservado. Nenhum commit/push realizado neste incremento. `.env` continua ignorado.
- 22 testes e compilação aprovados. Barra superior e menus conferidos na aplicação conectada; testes completos de interação dos painéis ainda pendentes.

## Continuidade sem Maps — operação e histórico

- Corrigida a busca no Kanban: nomes não correspondem mais a todos os CPFs; CPF formatado e ID com `#` aceitos, inclusive cliente ausente.
- Indicadores da operação respeitam a unidade selecionada; busca textual afeta somente os cartões. Hoje usa São Paulo, independentemente do fuso do computador.
- Consultas de pedidos paginadas com ordenação estável, descarte de respostas antigas e erro visível preservando os últimos dados.
- Avanço/cancelamento compara status anterior no banco antes de atualizar; zero linhas não é sucesso. Trava síncrona contra cliques simultâneos. Isto não substitui regras/transições no servidor nem implementa estorno de estoque.
- Histórico separa canal de venda (Próprio/iFood/Rappi) de atendimento (Presencial/Delivery). Datas exibidas em São Paulo; busca orienta a informar UUID completo, evitando consulta numérica inválida na coluna UUID.
- 22 testes locais aprovados. Nenhum dado real foi alterado para testar; validação multiusuário conectada continua pendente. Não há migração nova para estas correções.
- Ativação do Google Maps permanece aguardando retorno do usuário. Não foram ativados serviços pagos.

## Google Maps — integração preparada, ativação pendente

- Serviço escolhido pelo usuário: Google Maps Routes API.
- Bloco de consulta em `/entregas`; função `calcular-entrega` valida sessão, unidade, limite e endereço e usa origem/tarifa do banco. Apenas simulação, sem alterar pedidos.
- Migração adicional: `sql/migration_consulta_rotas.sql`. Seguir `GOOGLE_MAPS_SETUP.md` para chave, Secrets e publicação.
- 18 testes locais aprovados com respostas simuladas. SQL/RLS, runtime Deno e consulta real ainda não validados no Supabase/Google.
- Distância de carro, somente ida; sem trânsito em tempo real e sem conversão silenciosa para rota de moto.

## Incremento — 17/09/2026: entrega por quilômetro

- Nova página `/entregas`: cadastro de endereço de origem por loja e tarifa por km, com sugestão de R$ 1,50; simulação com distância manual.
- Migração pendente: `sql/migration_configuracao_entrega.sql`. Instruções e limites em `sql/ENTREGAS_POR_DISTANCIA.md`.
- Não há cobrança automática nem cálculo de rota nesta etapa. Próxima dependência: selecionar serviço de mapas e autorizar custos; depois integrar cotação validada ao pedido transacional e separar frete nas análises.
- Preservadas as regras centrais do documento enviado: CPF como identificador, ficha por variação/peso, estoque por unidade e preços/taxas por canal. Não substituir essas regras pela funcionalidade de entrega.
- Divergência documental: o documento enviado descreve Retiro como delivery-only, enquanto outro README descreve atendimento presencial também. Nenhum tipo de operação foi alterado; confirmar antes de mudar o cadastro.
- Treze testes do cliente aprovados, incluindo cálculo e validação de entrega. Persistência/RLS dependem da execução e validação no Supabase. Pedido transacional continua com ativação pendente.

## Divisão de trabalho acordada

- Claude: evolução do layout e Design System.
- Codex: funcionalidades, regras de negócio, testes e integração Supabase.
- Preservar as alterações de ambos. A navegação deve manter a rota `/analytics` e seu item no menu.

## Incremento atual — 13/09/2026

| Bloco | Entrega | Estado |
|---|---|---|
| 4.1 Dashboard | Filtro Hoje e 15 dias; Hoje considera meia-noite de São Paulo | Implementado; teste automatizado aprovado |
| Estoque / apoio a 4.4 | Cadastro de insumos com nome, categoria, g/ml/un e custo por unidade de medida | Interface implementada; gravação integrada pendente |
| Estoque / apoio a 4.4 | Vincular insumo existente à unidade com saldo inicial e mínimo | Interface implementada; revisar/aplicar migração de permissões |
| 4.5 Fundação analítica | Portal próprio em `/analytics`, período personalizado, unidade, canal e atendimento | Implementado; leitura conectada conferida |
| 4.5 Fundação analítica | Comparação entre lojas, ranking completo de produtos, busca e exportação CSV | Implementado; tabelas conferidas, download ainda não testado |

O portal é uma análise nativa do sistema, não um relatório Microsoft Power BI incorporado. Custos e margens estimados usam a ficha atual e os itens-base; as limitações aparecem na página.

## Ação no Supabase

Arquivo: `sql/migration_cadastro_insumos.sql`.

Revisar no SQL Editor as políticas existentes de `ingredientes` e `estoque_lojas` antes de aplicar. A migração concede INSERT/SELECT ao papel authenticated e cria políticas de inserção para Administrador, Gerente e Estoque ativos, com restrição de unidade em estoque. Não altera saldos nem remove registros. Não substitui uma auditoria de RLS: políticas permissivas existentes continuam valendo e a migração não ativa RLS em ingredientes caso esteja desativado.

Aplicação da migração confirmada pelo usuário. Ainda falta validar gravação e vínculo usando um insumo de teste identificado, inclusive com usuário restrito; a confirmação de execução não comprova todas as permissões efetivas.

## Continuidade — Histórico

- Busca por nome movida para o banco, antes da paginação; CPF pontuado normalizado; UUID reconhecido.
- Datas consultadas no horário de São Paulo, incluindo integralmente o dia final.
- Respostas de consultas antigas ignoradas; erros exibidos na página.
- Verificação conectada: busca por Gabriel retornou apenas o pedido do cliente correspondente.
- Seis testes automatizados aprovados. A criação transacional de pedidos permanece pendente e exigirá migração própria, que será comunicada antes de aplicação.

Hoje e Analytics usam as tabelas já consultadas pelo sistema e não precisam de migração adicional.

## Registro histórico: dependências identificadas em 13/09/2026

Naquela data, o pedido transacional ainda dependia de ativação, insumos
aguardavam validação e o histórico precisava de correções. O pedido
transacional, a idempotência, o frete e as correções do Histórico foram
implementados depois. As pendências atuais estão na tabela de 08/10/2026
acima; este registro não deve ser usado como checklist de implantação.
