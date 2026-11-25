# Convívium · roteiro de apresentação em até 20 minutos

**Objetivo:** mostrar um pedido saindo do celular e chegando à operação da loja; explicar o produto, a tecnologia e a publicação. Ensaie para terminar em **19 minutos**, reservando o último minuto para uma pergunta ou imprevisto. O roteiro complementa a apresentação atual, sem mudar seu formato.

## Cronograma

| Tempo | Mostrar | Mensagem principal |
|---|---|---|
| 0:00–1:30 | Abertura da apresentação | Problema e proposta do Convívium |
| 1:30–3:00 | Visão do negócio | Quem contrata e quem faz pedidos |
| 3:00–5:00 | App do Brasa Burger | Cardápio, categorias, carrinho e conta |
| 5:00–7:00 | QR Code nos cartazes | Um pedido da turma para retirada no Japy |
| 7:00–10:00 | ERP: solicitações e pedidos | Aceitar, acompanhar e avançar o preparo |
| 10:00–12:00 | Produtos, ficha técnica e estoque | Composição, custos e controle operacional |
| 12:00–14:00 | Dashboard e análises | Indicadores e histórico simulado |
| 14:00–17:00 | Arquitetura e GitHub | Como o sistema funciona e está hospedado |
| 17:00–19:00 | Encerramento | Segurança, limites do MVP e evolução |
| 19:00–20:00 | Reserva | Uma pergunta ou conclusão, sem abrir novo módulo |

## 0:00–1:30 · O problema

**Fala sugerida:**

“O Convívium Management System nasceu para integrar a gestão de um estabelecimento de alimentação ao seu canal próprio de pedidos. Em uma operação com várias unidades, informações podem ficar divididas entre atendimento presencial, mensagens, cadastros e planilhas. Nossa proposta é reunir esses processos em uma base comum, com acesso adequado para cada pessoa.

O Brasa Burger é o nosso piloto. A marca aparece para o consumidor, enquanto o Convívium fornece a estrutura de gestão por trás dela. Chamamos essa estrutura de **ERP — Enterprise Resource Planning**, ou planejamento dos recursos da empresa: um sistema que conecta pedidos, produtos, clientes, estoque e indicadores.”

**Ação:** mostrar a abertura; evitar percorrer todos os slides.

## 1:30–3:00 · O modelo de negócio

“Existem dois públicos. O cliente do Convívium é a empresa, como o Brasa Burger. O consumidor dessa empresa usa o aplicativo para escolher produtos, enviar pedidos e acompanhar o atendimento.

O modelo proposto é **SaaS — Software as a Service**, software oferecido como serviço. A proposta comercial pode combinar implantação e personalização com uma assinatura por empresa ou por unidades. Os valores e contratos ainda precisam de validação comercial.

Outra expressão é **white label**: a solução mantém a estrutura tecnológica e recebe a identidade do contratante. Também utilizamos uma organização **multi-tenant**, com separação dos dados por empresa. No piloto, ERP e portal são experiências distintas publicadas no mesmo projeto; isso não significa dois ambientes de infraestrutura totalmente independentes.”

**Ação:** apontar a identidade Brasa Burger no portal e a identificação Convívium no ERP.

## 3:00–5:00 · A experiência do consumidor

“O consumidor acessa o link pelo celular, escolhe a unidade e encontra o cardápio por categorias: lanches, acompanhamentos, bebidas e sobremesas. Ele adiciona os itens, revisa o carrinho e se identifica para enviar o pedido.

Quem já possui conta usa CPF ou e-mail e senha. Nome e telefone ficam associados à conta. Quem tem apenas um pré-cadastro comercial na loja precisa ativar o acesso ao aplicativo; esse cadastro, sozinho, ainda não é uma conta com senha. A confirmação do e-mail já registrado permite reconhecer uma ficha única e continuar o cadastro. Apenas digitar um CPF não pode revelar dados de outra pessoa.

Para entrega, o sistema trabalha com endereço, consulta de CEP, favoritos e cálculo de frete. Para nossa demonstração coletiva, vamos escolher retirada na unidade Japy.”

**Ação:** selecionar Japy, retirada e dois produtos de categorias diferentes. Mostrar o carrinho e a identificação. Não exibir dados pessoais da turma no projetor.

## 5:00–7:00 · Participação da turma

**Convite sugerido:**

“Agora vocês podem participar. Escaneiem o QR Code do cartaz, selecionem a unidade Japy e a opção de retirada. Escolham um lanche e uma bebida. Entrem na conta ou criem seu acesso com seus próprios dados e enviem apenas um pedido. Na observação, escrevam ‘Demonstração em sala’. São pedidos para esta atividade; não haverá compra ou preparo real.”

“Enquanto vocês finalizam, vou abrir a visão de quem administra a loja. A ideia é mostrar a conexão entre duas experiências reais da aplicação.”

**Ação:** dedicar até dois minutos à participação. Um pedido recebido é suficiente para prosseguir. A confirmação de pagamento no sistema não substitui uma integração de cobrança bancária.

## 7:00–10:00 · O coração da operação

“Aqui está o ERP. O consumidor envia uma solicitação, e a equipe confirma a disponibilidade. Ao aceitar, a operação gera o pedido e aplica as regras do sistema. Isso evita confundir uma intenção de compra com uma venda já confirmada.

O pedido passa pelas etapas de atendimento, como recebido, em preparo, pronto e entregue. No delivery existe também a saída para entrega. O cliente acompanha as atualizações da própria conta.

Usamos o termo **real-time**, ou atualização em tempo real: as telas recebem avisos de mudanças e consultam novamente os dados autorizados. Não significa que uma rede nunca terá atraso.

Outra característica é a **idempotência**: se uma confirmação for reenviada por falha de conexão, a mesma identificação da operação evita criar duas vendas ou baixar o estoque duas vezes.”

**Ação:** abrir Solicitações, aceitar um pedido da turma, abrir Pedidos e avançar seu status. Mostrar a atualização do consumidor. Identificar a observação de demonstração antes de aceitar.

## 10:00–12:00 · Produtos, ficha técnica e estoque

“O produto tem variações e preços. A ficha técnica descreve os ingredientes e as quantidades necessárias para preparar cada variação. Ao confirmar uma venda, essas quantidades alimentam o controle de estoque.

Isso permite calcular o **CMV — Custo da Mercadoria Vendida**, relacionado à expressão inglesa **COGS — Cost of Goods Sold**. A ficha ajuda a entender quanto os insumos representam no preço do produto. Uma margem calculada com esses custos não é automaticamente lucro líquido: aluguel, salários, impostos e outras despesas também afetam o resultado da empresa.

Cadastros de produtos, clientes e insumos são exemplos de **CRUD — Create, Read, Update and Delete**: criar, consultar, atualizar e excluir registros, conforme as permissões e as regras implementadas.”

**Ação:** abrir um produto com ficha, mostrar composição e custo; depois um saldo de estoque. A carga histórica preserva o estoque físico atual, pois não representa preparo real.

## 12:00–14:00 · Indicadores e histórico

“Os indicadores ajudam a comparar unidades, canais e períodos. O ticket médio é o faturamento dividido pela quantidade de pedidos considerados. Em inglês, aparece como **AOV — Average Order Value**.

Para validar os gráficos, preparamos uma base **simulada**, com 9 mil vendas e 600 novos clientes fictícios entre 1º de janeiro e 22 de novembro de 2026. Não são receitas reais do Brasa Burger. Utilizamos os produtos cadastrados e criamos padrões de consumo: mais movimento no fim de semana, horários de pico, sazonalidade e combinações coerentes de produtos.

O Japy tem maior volume porque oferece atendimento presencial; Retiro e Eloy mantêm volumes semelhantes entre si. A **Curva ABC**, ou **ABC Analysis**, classifica os produtos por importância no resultado. Nosso simulador concentra a recorrência em alguns itens, sem assumir que a proporção 80/20 seja uma lei exata.”

**Ação:** no Painel, mostrar os últimos 30 ou 90 dias. Em **Análises**, selecionar **01/01/2026–22/11/2026**; mostrar comparação por unidade e canal e um gráfico de produtos. O filtro ‘Hoje’ não exibirá todo esse histórico. Citar os valores do resumo confirmado da carga, não da prévia se houver diferença.

## 14:00–17:00 · Como está hospedado no GitHub

“O código-fonte fica em um **repository**, um repositório no GitHub. O **Git** registra versões: conseguimos acompanhar mudanças, revisar correções e recuperar uma versão anterior.

O **frontend** é a parte que roda no navegador: telas, navegação e interação. Neste projeto, ele utiliza **React**, **JavaScript** e **CSS**. O **Vite** prepara o **build**, o conjunto de arquivos que será publicado.

A hospedagem dessas telas utiliza **GitHub Pages**. O navegador baixa os arquivos publicados e executa o aplicativo. O **GitHub Actions** automatiza verificações e a publicação. Esse processo é chamado de **CI/CD — Continuous Integration and Continuous Delivery**, integração e entrega contínuas. O **deploy** é a publicação de uma versão para acesso pelo link.

O banco de dados não está hospedado no GitHub Pages. O **backend**, a parte que fornece os serviços e mantém os dados, utiliza **Supabase**, com banco **PostgreSQL**, autenticação, funções no servidor e atualizações em tempo real.

Uma **API — Application Programming Interface** é a interface de comunicação entre essas partes. Quando o cliente envia um pedido, o aplicativo conversa com os serviços; o banco valida a operação, armazena os dados e a equipe recebe a atualização.

Assim, o QR Code aponta para o endereço publicado. Quando atualizamos o aplicativo nesse mesmo endereço, não precisamos imprimir outro código. Precisamos garantir que o deploy terminou e que o navegador carregou a versão atual.”

**Esquema para apontar durante a fala:**

```text
Código no GitHub → testes e build no Actions → telas no GitHub Pages
                                                     ↓ API
Celular do consumidor ↔ Supabase Auth + PostgreSQL ↔ ERP da loja
                           regras, RLS e Realtime
```

**Ação:** mostrar rapidamente o repositório e uma execução concluída do Actions. Não abrir variáveis de ambiente, credenciais, senhas ou configurações privadas.

## 17:00–19:00 · Acesso, limites e evolução

“Autenticação responde ‘quem é você?’; autorização responde ‘o que você pode acessar?’. Em inglês, usamos **Authentication** e **Authorization**.

O administrador master cuida da plataforma e dos contratantes. A administração da empresa acompanha suas unidades; o gerente tem o escopo definido para sua operação. O consumidor acessa seus pedidos e endereços. Essa separação também precisa existir no banco, não apenas nos menus.

Utilizamos **RLS — Row Level Security**, segurança por linha: regras que restringem os registros acessíveis em cada contexto. Um cliente não recebe acesso de equipe por criar uma conta no portal.

O que apresentamos é um **MVP — Minimum Viable Product**, um produto mínimo viável para validar a proposta com uma operação piloto. A evolução comercial envolve validar o modelo de cobrança, ampliar a homologação com empresas, amadurecer a operação e avaliar publicações independentes para portal e ERP.

A principal entrega é esta integração: o consumidor pede no canal próprio, a loja recebe e acompanha a operação, e o gestor utiliza os dados para tomar decisões.”

**Ação:** voltar à apresentação e encerrar até 19:00. Usar o minuto final para uma pergunta. Se houver atraso, reduzir a fala dos termos técnicos e preservar a demonstração do pedido.

## Cola rápida dos termos

| Termo | Inglês / significado | Explicação curta |
|---|---|---|
| ERP | Enterprise Resource Planning | Integra os recursos e processos da empresa |
| MVP | Minimum Viable Product | Versão inicial para validar a proposta |
| SaaS | Software as a Service | Software oferecido como serviço |
| White label | Marca personalizada | Estrutura adaptada à identidade do contratante |
| Multi-tenant | Vários contratantes | Dados separados por empresa na mesma plataforma |
| Frontend / Backend | Interface / serviços | O que o usuário opera / o que processa e guarda dados |
| API | Application Programming Interface | Comunicação entre aplicações e serviços |
| CRUD | Create, Read, Update, Delete | Criar, consultar, atualizar e excluir |
| RLS | Row Level Security | Restrições de acesso por registro |
| Real-time | Tempo real | Atualização das telas a partir de mudanças |
| Repository / Git | Repositório / controle de versões | Código e histórico de alterações |
| Build / Deploy | Preparação / publicação | Gerar os arquivos e colocá-los no ar |
| CI/CD | Continuous Integration / Continuous Delivery | Verificação e entrega automatizadas |
| Batch insert | Inserção em lote | Gravar vários registros com eficiência |
| Data seeding | Carga inicial de dados | Popular uma base para testes e demonstração |
| AOV | Average Order Value | Valor médio por pedido |
| COGS | Cost of Goods Sold | Custo dos produtos vendidos; relacionado ao CMV |

## Links para deixar abertos

- [Apresentação](https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/apresentacao/#visao)
- [Pedido do consumidor](https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/pedir/brasa-burger)
- [ERP do Brasa Burger](https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/?marca=brasa-burger)
- [Solicitações da loja](https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/solicitacoes?marca=brasa-burger)
- [Repositório GitHub](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP)

**Fontes técnicas:** [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [GitHub Actions](https://docs.github.com/en/actions/about-github-actions/understanding-github-actions), [Supabase](https://supabase.com/docs), [confirmação por e-mail](https://supabase.com/docs/guides/auth/auth-email-passwordless). A arquitetura específica descrita acima foi conferida no código e nos workflows do projeto.
