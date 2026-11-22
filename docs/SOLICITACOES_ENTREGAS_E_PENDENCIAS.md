# Solicitações, entregas e pendências do Convívium

Consolidação da conversa e do código, atualizada em 22/11/2026. As solicitações foram agrupadas em oito frentes. “Implementado e testado” identifica código e verificações; a publicação é uma etapa própria e não deve ser confundida com um commit no GitHub.

## Publicação autorizada em 22/11/2026

PR #1 integrado em `main`, seguido da correção de agrupamento do PR #2, commit `c61d763`. Publicações `45029614820` e `45031021085` concluídas com sucesso. Frontend novo já responde no endereço do QR, com etapas e sem atalho de equipe. As duas migrações abaixo foram aplicadas e registradas no histórico do Supabase; a função `calcular-entrega` foi publicada. As verificações preservaram os 14 pedidos e a solicitação já existentes, sem criar contas ou pedidos sintéticos no ambiente operacional. A revisão final reúne no portal as subcategorias históricas do piloto nos quatro grupos aprovados, mantendo o cadastro interno.

Endereço Retiro atualizado por instrução do responsável: Rua do Retiro, 1454, Jardim Paris, CEP 13209-201, Jundiaí/SP; tarifa existente R$ 1,85/km preservada. O CEP/bairro foi conferido na faixa numérica retornada pelo ViaCEP. Como a geocodificação não encontrou o imóvel, o responsável enviou o [ponto no Google Maps](https://maps.app.goo.gl/DWnfufuPJMW6uWoc9), que abriu exatamente esse endereço. Origem gravada e recarregada no ERP: latitude `-23.182998`, longitude `-46.900317`. A consulta real Retiro → ponto já cadastrado da unidade Eloy retornou 9.602 metros e R$ 17,76, pela tarifa de R$ 1,85/km, usando openrouteservice. A conferência não criou pedido, consumidor ou reserva de cotação. O ponto de origem do Retiro deixou de ser pendência.

## Situação encontrada antes desta revisão

O site publicado usava o commit `e8789b3`. A revisão visual `d56d4df` estava apenas na branch `codex/aplicacoes-paralelas-visual`, no PR #1. Por isso a página pública ainda exibia o layout antigo e o acesso da equipe. O catálogo público retornava 44 variações, nas unidades Eloy, Japy e Retiro, sem o campo de categoria. A interface da revisão dependia desse campo e, no servidor anterior, agrupava tudo em “Outros”. Além disso, login, carrinho e finalização ainda estavam reunidos na mesma tela. Esses pontos não estavam finalizados do ponto de vista da experiência do consumidor.

## 1. Plataforma, marca e modelo de negócio

**Pedido:** Convívium como plataforma; Brasa Burger como empresa piloto; ERP personalizável para outras empresas; distinguir contratante e consumidor.

**Entregue:** identidade do Convívium, empresa com nome/cor/logo próprios, marca da loja no portal e no ERP, identificação da tecnologia no rodapé. A apresentação explica que o restaurante contrata o ERP e seus consumidores usam o canal de pedidos. Existe trilha própria sobre modelo de negócio, com assinatura por empresa como proposta em validação.

**Falta/evolução:** validar preços comerciais, contratação, suporte e operação com empresas. Japi Lanches e Dona Amélia são exemplos futuros, não novos clientes cadastrados ou contratos fechados. A proposta não foi apresentada como receita já comprovada.

## 2. Públicos, perfis, contas e acessos

**Pedido:** master administra a plataforma e os contratantes; administrador da empresa acompanha suas unidades; gerente acessa sua unidade; consumidor não recebe acesso administrativo. Cadastro/login do consumidor por CPF e senha.

**Entregue:** perfis e vínculos com autorização no banco, empresa/unidade e RLS; cadastro e login por CPF, nome, telefone e senha; acesso por e-mail continua compatível. Cadastro público não cria colaborador. Sessões do consumidor e da equipe usam armazenamentos independentes. Sair de uma não encerra a outra. Retornos de autenticação por URL são processados pela aplicação correspondente. O portal do consumidor não contém atalho para a equipe.

**Falta/evolução:** recuperação automática de senha das contas baseadas apenas em CPF; convites e gestão comercial mais ampla. A separação em aplicações/publicações independentes foi adiada por solicitação do responsável. Nesta entrega, apresentação, consumidor e ERP continuam reunidos para a aula; autorização de dados permanece no servidor.

**Revisão de conta (22/11):** nome e telefone carregados da conta e apresentados em resumo, com edição opcional. Pedido com dados inalterados não executa novo cadastro. “Meus pedidos” exibe o nome salvo. Cadastro legado pode ser recuperado dos metadados completos ou de pedidos do próprio usuário; CPF ocupado por outra conta não revela nem importa dados. Se nunca houve registro completo, o vínculo é solicitado uma única vez. CPF é identificador da aplicação com validação de dígitos; não existe consulta de identidade à Receita Federal. A migração de recuperação legada está ativa.

**Recuperação do acesso da equipe (22/11):** login passa a oferecer “Esqueci minha senha”, solicitação pelo e-mail e formulário de nova senha após validação da sessão pelo Auth. A confirmação da senha é obrigatória e a troca não altera perfil, empresa ou unidade. E-mail de entrada é normalizado; mensagens distinguem limite de tentativas e confirmação pendente. Links expirados oferecem novo envio. O retorno usa a raiz pública do ERP com `?acesso=recuperar`, inclusive na subpasta do GitHub Pages. A configuração remota encontrada ainda usava `localhost:3000`, sem URLs adicionais; foram corrigidos somente a URL pública e os retornos exatos, preservando confirmação de e-mail e MFA. Nenhuma senha operacional é lida ou definida pelo agente. O responsável define a nova senha na aplicação, após autenticação ou pelo link recebido. Envio de e-mails depende do serviço SMTP e de suas cotas.

## 3. Experiência de pedido do consumidor — prioridade desta revisão

**Pedido:** melhorar layout, espaçamento, didática, mobile, categorias, ícones, detalhes, carrinho e separar login da escolha dos produtos; manter o formato integrado da apresentação.

**Entregue nesta revisão:**

- Cardápio, carrinho, identificação e confirmação em telas próprias, com indicador de etapas. “Meus pedidos” é uma tela própria da conta.
- O consumidor pode explorar o cardápio antes de entrar. Na continuação do carrinho, entra ou cria a conta. O carrinho permanece durante essa navegação. Também há acesso direto à conta no cabeçalho.
- Catálogo agrupado em seções, com filtro real e busca por nome/variação/descrição. Bebidas aparecem com bebidas; acompanhamentos com acompanhamentos.
- Os 44 itens/variações do piloto são organizados em Lanches (17), Acompanhamentos (9), Bebidas (16) e Sobremesas (2). As subcategorias históricas (Smash, Artesanais, Croquetas, Cervejas, Chopp etc.) se reúnem nesses grupos no portal. Categorias personalizadas fora desse conjunto preservam sua configuração; outras empresas não recebem o mapeamento. Servidor anterior continua compatível pelo SKU.
- Ícones de hambúrguer, batata, copo e sobremesa nas categorias, nos produtos e no resumo do carrinho; cores por família e ilustração de apoio na abertura.
- Cards com nome, variação, preço real, botão de adicionar e detalhe com adicionais. Fotos configuradas pela empresa têm prioridade sobre o ícone.
- Resumo com quantidades, adicionais, subtotal, frete e total; navegação de volta ao cardápio e edição de quantidades.
- Layout responsivo, títulos e espaços reorganizados, botões identificados para acessibilidade e suporte a movimento reduzido.

**Limites:** o carrinho é mantido no estado da aplicação durante a navegação entre as etapas, sem promessa de recuperação após fechar ou recarregar a página. As imagens de apoio são identificadas como ilustrações. Novos produtos comerciais dependem de nome, preço, disponibilidade e ficha definidos pela empresa; não foram inventados itens de venda.

## 4. Pedido real, unidade, acompanhamento e aula

**Pedido:** pedido do consumidor chega à unidade escolhida, em tempo real; turma testa pelo link/QR; confirmação pela equipe e acompanhamento do preparo.

**Entregue:** fluxo real de solicitação, aceite transacional, criação única da venda e baixa dos insumos no aceite. Atualização da fila e do consumidor por Realtime, com recuperação periódica. Histórico e cancelamento preservam rastreabilidade. O envio do navegador usa chave transacional para evitar repetição em falhas de conexão.

**Verificado:** ensaio automatizado de 30 consumidores concorrentes em Supabase descartável, com Auth, API, Realtime, aceite e devolução de estoque. A verificação visual desta revisão montou refrigerante (R$ 7,90), batata (R$ 16,90) e Bacon Cheese (R$ 26,90), total R$ 51,70, e avançou/voltou entre carrinho e identificação. Não foram criados consumidores ou pedidos sintéticos no banco operacional.

**Falta:** o ensaio humano no endereço publicado, com a conta autorizada da equipe e uma unidade indicada aos alunos. O ensaio isolado não comprova capacidade ilimitada nem substitui a conferência do ambiente real. O pagamento é diretamente à loja; não há cobrança online ou contratação automática de entregador.

## 5. ERP personalizado e operação da loja

**Pedido:** dashboard, gestão dos pedidos, produtos, clientes, insumos, fichas e custos; operação presencial/WhatsApp e canal próprio; administração das lojas/empresas.

**Entregue:** módulos existentes de produtos/variações/adicionais, clientes, estoque, pedidos, fila do portal, preparo, entrega, cancelamento, histórico e indicadores; cadastro/administração de empresas, unidades e equipe conforme permissões. O dashboard relê dados autorizados após avisos Realtime. Foi corrigida uma referência ausente ao usuário em Pedidos. A ficha mostra custo por insumo, custo total, CMV e margem sobre insumos, com indicação de custo ausente. Essa margem não é lucro líquido.

**Ativado no banco em 22/11:** editor de foto HTTPS, destaque e metadados públicos do cardápio pela migração `20261116000100_cardapio_visual.sql`. Fotos comerciais reais ainda dependem de configuração pela empresa; a ilustração e os ícones já fazem parte do portal.

**Conferência de 22/11:** painel e catálogo/ficha carregaram no navegador com a sessão autorizada, sem gravações. Corrigida a moeda para pt-BR no painel e nos resumos de produto; eliminado o arredondamento de exibição que mostrava R$ 10,73 no resumo versus R$ 10,74 no detalhe. O teste transacional em PostgreSQL nativo confirmou aceite simultâneo único e rollback por falta de estoque.

**Fora do MVP:** integração automática com WhatsApp (registro segue manual pela equipe), sistema fiscal, financeiro completo e cobrança online.

## 6. CEP, endereço, frete e serviços externos

**Pedido:** simplificar endereço e recalcular frete automaticamente; avaliar ViaCEP em relação à solução existente.

**Entregue no código:** ViaCEP preenche o endereço; openrouteservice calcula rota/distância. Servidor confere origem, tarifa e validade da cotação. Cálculo automático aguarda endereço completo e saída dos campos, não consulta durante a edição nem repete sozinho após erro. Cotação válida é preservada ao voltar à confirmação; a expiração pede atualização explícita.

Mapa opcional, carregado sob demanda. Localização do dispositivo exige ação do consumidor, precisão até 100 m e confirmação de correspondência ao endereço. Favoritos com apelido, escolha e remoção na conta; coordenadas confirmadas podem ser reutilizadas. Alterar rua/número/CEP invalida o ponto anterior. RLS impede equipe e terceiros de ler a agenda pessoal.

Cache de geocodificação confirmada por sete dias e distância por um dia, somente no servidor. Preço usa a tarifa atual e cada consumidor recebe sua própria cotação. Consultas simultâneas iguais são agrupadas dentro da instância da função. Falhas não são guardadas como frete zero. O limite próprio de três consultas/minuto e as cotas do provedor continuam vigentes; não há promessa de disponibilidade ilimitada.

**Ativado em 22/11, após autorização:** migração `20261122133234_enderecos_favoritos_e_cache_frete.sql`, função `calcular-entrega` e frontend. RLS conferida no ambiente operacional: agenda somente do titular; cache inacessível a anon/authenticated e disponível ao servidor. Os testes de gravação/remoção usaram exclusivamente ambientes descartáveis.

**Verificação operacional de 22/11:** origem do Retiro confirmada pelo link de mapa do responsável e salva; três unidades ativas com ponto e tarifa positiva cadastrados. Rota real Retiro → Eloy validada com pontos salvos (9.602 m; R$ 17,76). A busca apenas pelo endereço de destino da unidade Eloy não encontrou o imóvel na base gratuita; os pontos salvos permitiram calcular a rota sem inventar a localização ou o frete.

**Falta:** comparar trajetos e entradas em campo e realizar o ensaio com os endereços dos participantes. ViaCEP não substitui um serviço de rotas. A cobertura por texto e as cotas do provedor continuam sendo limites; para imóvel ausente na base, o consumidor pode usar ponto confirmado ou endereço favorito com ponto salvo. Nome, CPF, telefone e complemento não são enviados ao provedor de rotas.

**Pesquisa de concorrentes:** a pesquisa aprofundada com Search/Exa continua pendente da conexão desse serviço; não foi apresentada como executada. Ela não impede os ajustes do código e da interface.

## 7. Slides e apresentação interativa

**Pedido:** melhorar imagens, ritmo e interatividade; três apresentações (acadêmica, linguagens/tecnologias e negócio); preservar o formato entregue e a conexão com as aplicações reais.

**Entregue:** três trilhas, com 12 + 9 + 10 páginas; menos texto visível e detalhamento nas notas; imagens ilustrativas, logos identificados, etapas clicáveis, controles de trilha/página, tela cheia e visualização do portal em moldura mobile/desktop. As abas Consumidor e ERP abrem as aplicações reais, com login da equipe para operar o ERP.

PowerPoints revisados em `Slides/Aula-Visual-2026/`, PDFs correspondentes em `output/pdf/aula-*-visual.pdf`. Os arquivos da release anterior foram preservados. Fontes e prompts acompanham as imagens. O formato integrado da apresentação foi mantido; ela não constitui a separação comercial futura.

**Conferido em 22/11:** navegação das três trilhas no navegador e existência das 13 referências de imagem. Corrigida a resolução de `/apresentacao/` no Vite local, que podia cair na entrada do ERP.

**Falta humano:** ensaio de fala, divisão entre os integrantes e conferência dos slides no equipamento/projetor da sala. Capturas históricas dos PowerPoints são identificadas; a aba interativa apresenta a aplicação atual.

## 8. QR Code, GitHub e Entrega 2

**Pedido:** cartazes coloridos com QR e instruções, cerca de quatro para os grupos; retirar o QR da navegação do aplicativo; registrar no GitHub; focar a Entrega 2 usando a Entrega 1 como base aceita pelo docente.

**Entregue:** cartaz A4 individual e conjunto de quatro páginas (grupos 01–04), fora da navegação do app. O QR aponta somente para o portal público. Os quatro códigos foram decodificados dos PDFs renderizados e conferidos. Materiais em `output/aula/`. Os arquivos anteriores da Entrega 2, ZIP, manifesto e release permanecem disponíveis; a Entrega 1 foi mantida como histórico.

**Verificações:** 140 testes locais aprovados, incluindo recuperação de acesso, validação do titular antes da troca de senha e regressão do agrupamento após ativação. Instalação integral em dois bancos vazios e ensaio em PostgreSQL nativo. Build Vite com a base do GitHub Pages. Componentes de conta/favoritos conferidos no navegador com API sintética local, sem pedido real. Workflow `45029203785` aprovado nas três frentes, incluindo Auth/PostgREST/Realtime reais, favoritos após novo login e turma de 30 consumidores. A publicação usa workflow separado, disparado por atualização de `main`.

**Conferência da publicação:** acompanhar o resultado do workflow de publicação antes de anunciar os links como atualizados. O histórico e os resultados ficam em Actions no GitHub.

**QR:** a versão antiga persistia porque a revisão anterior ainda estava no PR. Após a autorização, o deploy atualizou o mesmo endereço; não é necessário reimprimir o QR. A conferência pós-publicação confirmou o novo layout e ausência de atalho de equipe. Se o navegador preservar uma aba antiga, recarregar ou reabrir o link.

**Falta humano:** realizar o ensaio em sala, enviar o material institucional e guardar comprovante. A submissão acadêmica não foi feita em nome dos integrantes.

## Links de referência e sequência de uso

1. Apresentação: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/apresentacao/#visao
2. Consumidor do Brasa Burger: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/pedir/brasa-burger
3. ERP do Brasa Burger: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/?marca=brasa-burger
4. Fila da equipe: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/solicitacoes?marca=brasa-burger

O link do consumidor e o QR não dão acesso de equipe. A apresentação mantém a navegação entre os três ambientes para a aula. A sequência sugerida de teste é selecionar a unidade no portal, montar o carrinho, entrar/cadastrar, confirmar e acompanhar; a equipe recebe em Solicitações.

## Tecnologias

O projeto já usa React, JavaScript, CSS, Tailwind e Vite no frontend, e Supabase/PostgreSQL no backend. Python é usado em estudos e geração de material, fora da operação de vendas. Esta melhoria reorganiza componentes React e estilos existentes; não adiciona um segundo framework.
