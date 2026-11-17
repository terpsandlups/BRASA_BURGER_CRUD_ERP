window.CONVIVIUM_SLIDES = {
  "academica": [
    {
      "kind": "cover",
      "title": "Convívium\nManagement System",
      "subtitle": "Aplicação integrada para operações de alimentação",
      "detail": "Entrega 2 de 2026/2\nCaso de aplicação: Brasa Burger\nGabriel Rodrigues do Prado e Rafaela Rodrigues Oliveira",
      "notes": "Abertura, 40 segundos. Faculdade Anhanguera, ADS, Projeto Integrado I, II e III. Prof. Gilberto Falco Netto. Apresentar Convívium como plataforma e Brasa Burger como empresa do caso.",
      "backgroundImage": "assets/portal-aula-visual.jpg",
      "imageAlt": "Catálogo real do portal público Brasa Burger"
    },
    {
      "title": "Problema e escopo",
      "notes": "1 minuto. Delimitar o escopo acadêmico. Fiscal e financeiro completos, aplicativos nativos e integrações comerciais são evoluções. Fonte: README e trabalho escrito da Entrega 2.\n\nDetalhamento da versão anterior:\nInformações de atendimento e gestão precisam acompanhar o mesmo pedido.\n\nProblema\n\nCadastros separados dificultam recuperar vendas, conferir estoque e interpretar custos.\n\nEscopo entregue\n\nPortal do consumidor, pedidos da unidade, catálogo, fichas, estoque e indicadores integrados.",
      "kind": "photo",
      "lead": "Um pedido precisa acompanhar toda a operação.",
      "body": "Do atendimento ao preparo, a equipe precisa trabalhar com a mesma informação.",
      "image": "assets/cozinha-aula.jpg",
      "caption": "Ilustração gerada por IA. Não retrata o Brasa Burger."
    },
    {
      "kind": "table",
      "title": "Plataforma, empresa e unidade",
      "headers": [
        "Nível",
        "Responsabilidade"
      ],
      "rows": [
        [
          "Convívium",
          "Administra a plataforma e seus contratantes."
        ],
        [
          "Empresa",
          "Opera seu ERP com a própria marca."
        ],
        [
          "Unidade",
          "Recebe e prepara seus pedidos."
        ],
        [
          "Consumidor",
          "Pede no portal da loja."
        ]
      ],
      "notes": "1 minuto. Identificar a empresa como fronteira dos dados. Administrador comum não recebe acesso às outras empresas. Fonte: migração empresas_acesso_frete_cliente e testes de permissões.\n\nDetalhamento da versão anterior:\n"
    },
    {
      "kind": "screenshot",
      "title": "Pedido pelo portal da marca",
      "notes": "Captura pública em 11/11/2026. Duas unidades de R$ 26,90. Cadastro por CPF e senha. Nenhuma conta, solicitação ou venda foi criada na captura. A integração escrita foi verificada em Supabase local descartável no CI.\n\nDetalhamento da versão anterior:\n1. Escolher unidade\n2. Montar o carrinho\n3. Conferir total e contato\n4. Enviar à loja",
      "left": "1. Escolher unidade\n2. Montar o carrinho\n3. Conferir total e contato\n4. Enviar à loja",
      "image": "assets/portal-aula-visual.jpg",
      "caption": "Portal local desta revisão, conectado ao catálogo existente. Nenhum pedido enviado."
    },
    {
      "title": "Arquitetura implementada",
      "notes": "1 minuto. Python é script independente e MySQL é estudo separado. Não apresentar uma API Node intermediária. Fonte: App.jsx, AuthContext.jsx, migrações e calcular-entrega.\n\nDetalhamento da versão anterior:\nO navegador apresenta a operação. O servidor valida as regras.\n\nInterface\n\nReact, JavaScript e Vite\nComponentes, eventos e chamadas à API\nNode.js executa as ferramentas e os testes\n\nServiços e dados\n\nSupabase Auth e PostgREST\nPostgreSQL com RLS, funções e transações\nEdge Function para consultar a rota",
      "kind": "photo",
      "lead": "Portal e ERP se conectam ao mesmo backend.",
      "body": "React apresenta a operação.\nSupabase fornece autenticação e atualização.\nPostgreSQL valida e grava o pedido.",
      "image": "assets/estrutura-aula.jpg",
      "caption": "Representação conceitual. As telas da aplicação ficam nas abas Consumidor e ERP."
    },
    {
      "kind": "code",
      "title": "Algoritmo do aceite",
      "notes": "1 minuto e 20 segundos. Interpretar cada estrutura. A solicitação aguardando ainda não baixa estoque. Idempotência evita duplicação ao repetir uma confirmação. Fonte: enviar_mobile, decidir_mobile e criar_pedido_transacional.\n\nDetalhamento da versão anterior:\nVALIDAR conta, unidade, itens e preços\nPARA CADA item: conferir quantidade e estoque\nSE delivery: conferir cotação e endereço\nSE requisição já concluída: retornar a venda\nEM TRANSAÇÃO: criar pedido e baixar estoque\nSE ocorrer falha: reverter alterações",
      "code": "validar conta e unidade\nconferir preço e estoque\ncriar a venda uma vez\nbaixar os insumos\nconfirmar a transação",
      "caption": "Qualquer falha desfaz a operação inteira."
    },
    {
      "kind": "number",
      "title": "Frete e arredondamento",
      "number": "R$ 5,25",
      "notes": "1 minuto. Explicar 3500 × 150 ÷ 1000 = 525 centavos. Mostrar também o teste de markup: 24,90 × 1,15 = 28,635, arredondado para 28,64. Fonte: entrega.test.js e operacaoBanco.test.js.\n\nDetalhamento da versão anterior:\n3,5 km × R$ 1,50 por km\n\nDistância em metros e tarifa em centavos.\nO cálculo arredonda a taxa final ao centavo.\nA cotação do servidor determina o frete do pedido.",
      "lead": "3,5 km × R$ 1,50 por km",
      "body": "A rota define a distância.\nA loja define a tarifa.\nO servidor calcula e arredonda o frete."
    },
    {
      "kind": "number",
      "title": "CMV com base definida",
      "number": "31,90%",
      "notes": "1 minuto. Um segundo item sem ficha reduz a cobertura de custo para 50% no exemplo do teste. A ficha atual gera uma estimativa gerencial; margem não é lucro líquido. Fonte: dashboard.js, dashboard.test.js e memória de cálculo.\n\nDetalhamento da versão anterior:\nR$ 8,90 de custo ÷ R$ 27,90 de receita × 100\n\nMargem simplificada: 68,10%.\nA receita elegível usa itens com ficha conhecida.\nFrete separado e pedidos cancelados excluídos.",
      "lead": "R$ 8,90 ÷ R$ 27,90 × 100",
      "body": "CMV sobre a receita dos itens com custo conhecido.\nO frete fica fora dessa base."
    },
    {
      "kind": "table",
      "title": "Evidências das três disciplinas",
      "headers": [
        "Disciplina",
        "Aplicação no projeto"
      ],
      "rows": [
        [
          "Programação",
          "Formulários, cadastros e interfaces."
        ],
        [
          "Algoritmos",
          "Validação, aceite e estoque."
        ],
        [
          "Matemática",
          "Frete, ticket médio e CMV."
        ]
      ],
      "notes": "1 minuto. Localizar arquivos e testes pela matriz anexada. Desenvolvimento em JavaScript, Nuvem e Análise Orientada a Objetos complementam os três eixos exigidos. O docente aceitou a linguagem, conforme confirmação do responsável.\n\nDetalhamento da versão anterior:\n"
    },
    {
      "kind": "number",
      "title": "Verificação reproduzível",
      "number": "122",
      "notes": "Revisão de novembro: 117 testes locais aprovados, incluindo CPF, ViaCEP, isolamento e eventos mínimos de status. Validação adicional da API e Realtime em stack local descartável no CI. O código e o registro de revisão acompanham os materiais. CI com Auth e Realtime: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43116523681 . Publicação HTTPS: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43114129902 .\n\nDetalhamento da versão anterior:\ntestes automatizados aprovados\n\nInstalação integral em dois bancos vazios.\nDuas conexões PostgreSQL confirmam a mesma venda.\nUma baixa de estoque e rollback em caso de falha.",
      "lead": "testes locais aprovados nesta revisão",
      "body": "Incluem catálogo, permissões, pedidos e instalação do banco.\nA homologação completa usa Supabase isolado no CI."
    },
    {
      "title": "Resultados e limites",
      "notes": "1 minuto. Apresentar os limites com precisão. Não alegar operação em pico ou escala comercial comprovada. Os testes em ambiente isolado não são ensaio dos integrantes nem validação de todos os trajetos reais.\n\nDetalhamento da versão anterior:\nO fluxo central tem regras e resultados rastreáveis.\n\nResultado\n\nCadastro do consumidor por CPF e senha.\nVenda e baixa transacionais.\nAutorização por empresa e unidade.\n\nLimites conhecidos\n\nCobertura de endereços pode exigir mapa.\nCarga simultânea da turma requer ensaio.\nPagamento presencial e canais manuais.",
      "kind": "plain",
      "lead": "O pedido conecta consumidor, unidade e gestão.",
      "leftTitle": "MVP para a aula",
      "left": "Canal próprio de pedidos.\nConfirmação e acompanhamento.\nEstoque e custos.",
      "rightTitle": "Próxima etapa comercial",
      "right": "Deploys separados.\nValidação com empresas.\nOperação e suporte."
    },
    {
      "title": "Conclusão e referências",
      "notes": "1 minuto. Fontes completas no trabalho escrito. Repositório: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP . Referência visual complementar: https://brasa-burguer-apresentacao-2026.azurebard4.chatgpt.site/ . Distribuir fala entre os dois integrantes e ensaiar a exposição em até 15 minutos.\n\nDetalhamento da versão anterior:\nProgramação, algoritmos e matemática sustentam a mesma operação.\n\nO Convívium evolui a base da Entrega 1 para uma aplicação integrada.\nO Brasa Burger permanece como caso de uso da plataforma.\nCódigo, cálculos e resultados acompanham a versão entrega-2-2026-2-revisao-1.\n\nFontes: repositório do projeto, memória de cálculo, matriz disciplinar, registros de teste e enunciado da Entrega 2.",
      "kind": "photo",
      "lead": "O consumidor pede. A empresa opera.",
      "body": "Na aula, acompanhe o mesmo pedido no portal e no ERP.\nCódigo, testes e referências estão no GitHub.",
      "image": "assets/gestor-aula.jpg",
      "caption": "Cena ilustrativa gerada por IA."
    }
  ],
  "tecnica": [
    {
      "kind": "cover",
      "title": "Fundamentos\ndo Convívium",
      "subtitle": "Como a aplicação organiza interface, regras e dados",
      "detail": "Complemento técnico da Entrega 2\nGabriel Rodrigues do Prado e Rafaela Rodrigues Oliveira",
      "notes": "Versão atualizada a partir de Fundamentos Técnicos Brasa Burguer.pptx. Uso como material de apoio, separado da apresentação acadêmica principal. Logo: https://www.postgresql.org/about/press/ . Marca PostgreSQL pertencente aos respectivos titulares.",
      "backgroundImage": "assets/postgresql-logo.png",
      "imageAlt": "Logo oficial PostgreSQL"
    },
    {
      "kind": "table",
      "title": "CRUD no projeto",
      "headers": [
        "Operação",
        "Onde aparece"
      ],
      "rows": [
        [
          "Criar",
          "Produto, cliente e pedido."
        ],
        [
          "Consultar",
          "Cardápio, ficha e indicadores."
        ],
        [
          "Atualizar",
          "Preços, quantidades e status."
        ],
        [
          "Desativar / cancelar",
          "Catálogo inativo e pedidos com histórico."
        ]
      ],
      "notes": "Explicar a diferença entre exclusão física e desativação de cadastro. O ERP não oferece exclusão indiscriminada de insumos vinculados. Fonte: permissões, políticas e componentes atuais.\n\nDetalhamento da versão anterior:\n"
    },
    {
      "title": "Interface e servidor",
      "notes": "O navegador não define sozinho permissões nem valores definitivos de frete. Fonte: AuthContext, módulos de envio e funções SQL.\n\nDetalhamento da versão anterior:\nCada camada tem uma responsabilidade delimitada.\n\nReact no navegador\n\nApresenta telas e recebe dados.\nAtualiza carrinho e filtros.\nEnvia solicitações para a API.\n\nSupabase e PostgreSQL\n\nAutenticam a conta e aplicam o acesso.\nConferem preços, unidade e estoque.\nPersistem a operação em transação.",
      "kind": "plain",
      "lead": "A interface solicita. O servidor valida.",
      "leftTitle": "React no navegador",
      "left": "Exibe o catálogo.\nMonta o carrinho.\nAcompanha o pedido.",
      "rightTitle": "Regras no backend",
      "right": "Confere a autorização.\nRecalcula os valores.\nProtege a transação."
    },
    {
      "kind": "screenshot",
      "title": "JavaScript na experiência de uso",
      "image": "assets/carrinho-cpf-publicado.jpg",
      "left": "Componentes React\nCadastro por CPF\nEstado do carrinho\nEventos de formulário",
      "caption": "Cadastro CPF e carrinho publicados em HTTPS. Nenhum cadastro ou pedido enviado na captura.",
      "notes": "A captura não contém sessão identificada nem pedido persistido. Não afirmar arrastar cartões: o fluxo atual avança por ações autorizadas. Imagem do próprio projeto."
    },
    {
      "title": "Scripts e estudos separados",
      "notes": "Corrige as alegações de ETL contínuo e milhares de produtos dos materiais anteriores. Fonte: python/, mysql/ e guia de execução. Logo oficial: https://www.python.org/community/logos/ . Marca Python pertencente à Python Software Foundation.\n\nDetalhamento da versão anterior:\nO banco transacional da aplicação é PostgreSQL.\n\nPython\n\nScripts legados de carga e simulação.\nNão são API intermediária.\nA instalação final usa SQL e dados sintéticos próprios.\n\nMySQL\n\nEstudo analítico independente.\nNão substitui o backend Supabase.\nNão é necessário para abrir a interface.",
      "kind": "plain",
      "lead": "Cada linguagem tem seu papel.",
      "leftTitle": "Python",
      "left": "Análises e materiais de apoio.\nFora do fluxo de venda.",
      "rightTitle": "PostgreSQL",
      "right": "Dados da operação.\nRegras, estoque e transações.",
      "decorationImage": "assets/python-logo.png"
    },
    {
      "kind": "code",
      "title": "Estruturas de controle",
      "notes": "Fonte: portalCliente.js, pedidoTransacional.js, funções SQL e testes. Não apresentar impressão de cupom ou fechamento financeiro como implementados.\n\nDetalhamento da versão anterior:\nSE o CPF for inválido: comunicar erro\nPARA CADA linha: somar quantidade × preço\nSE o estoque for insuficiente: recusar aceite\nSE a chave já existir: recuperar o resultado\nAPÓS confirmar: atualizar a visão do pedido",
      "code": "se a conta não pode operar: recusar\npara cada item: validar preço e quantidade\nse faltar estoque: reverter\nse tudo estiver correto: confirmar",
      "caption": "Condições, repetições e tratamento de falhas na mesma operação."
    },
    {
      "title": "Nuvem e implantação",
      "notes": "Publicação HTTPS confirmada em 11/11/2026. Fonte: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43114129902 . Frontend público: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/ .\n\nDetalhamento da versão anterior:\nSupabase fornece os serviços gerenciados do backend.\n\nImplementado\n\nAuth, PostgREST e banco relacional.\nFunção de entrega com segredo no servidor.\nRLS e validação por contexto.\n\nPublicação da entrega\n\nGitHub Pages para a interface.\nSupabase para autenticação e dados.\nPortal público e acesso restrito à equipe.",
      "kind": "photo",
      "lead": "Supabase reúne os serviços do backend.",
      "body": "Autenticação para as contas.\nPostgreSQL para os dados.\nRealtime para avisar as telas.",
      "image": "assets/estrutura-aula.jpg",
      "caption": "Representação conceitual da conexão entre aplicações."
    },
    {
      "kind": "number",
      "title": "Cálculo com interpretação",
      "number": "68,10%",
      "notes": "Corrige a margem de 68,6% do material anterior. Fonte: dashboard.test.js e memória de cálculo. Não é lucro líquido.\n\nDetalhamento da versão anterior:\nReceita de R$ 27,90 e custo conhecido de R$ 8,90\n\nCMV de 31,90% sobre receita de itens com ficha.\nCobertura informa quanto da receita tem custo conhecido.\nFrete e cancelamentos seguem critérios explícitos.",
      "lead": "100% − 31,90% de CMV",
      "body": "Margem simplificada sobre insumos.\nDespesas e taxas ainda precisam entrar na análise do lucro."
    },
    {
      "title": "Segurança e rastreabilidade",
      "notes": "Referências: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP ; documentação de Supabase Auth, RLS e PostgREST. O histórico de consumo sustenta a conferência do cancelamento.\n\nDetalhamento da versão anterior:\nA sessão identifica a conta. As regras limitam a operação.\n\nConsumidor entra com CPF e senha e acompanha seus pedidos.\nGerente opera sua unidade. Administrador opera sua empresa.\nEventos atualizam a fila e o acompanhamento.\nReenvio e aceite repetido preservam uma venda.\n\nFontes: código, migrações, testes e documentação da versão final no GitHub.",
      "kind": "steps",
      "steps": [
        {
          "title": "Conta",
          "detail": "A sessão identifica quem está acessando."
        },
        {
          "title": "Perfil",
          "detail": "Empresa e unidade limitam os dados disponíveis."
        },
        {
          "title": "Transação",
          "detail": "O banco confere a ação antes de gravar."
        }
      ],
      "lead": "Conhecer a conta é diferente de autorizar uma ação."
    }
  ],
  "negocio": [
    {
      "kind": "cover",
      "title": "Convívium\nModelo de negócio",
      "subtitle": "Plataforma personalizável para operações de alimentação",
      "detail": "Brasa Burger como primeiro caso de aplicação\nProposta comercial em validação",
      "notes": "Apresentação complementar de negócio. A plataforma está implementada em piloto; assinatura e serviços descritos são proposta comercial, sem preços ou faturamento contratados presumidos. Fotografia ilustrativa recuperada do deck original. Não retrata o Brasa Burger. Fonte e crédito em Slides/Entrega-2/assets/CREDITOS.md.",
      "backgroundImage": "assets/gestor-aula.jpg",
      "imageAlt": "Fotografia ilustrativa de comprovantes de restaurante"
    },
    {
      "kind": "photo",
      "title": "Cliente da plataforma",
      "notes": "Foto ilustrativa fornecida no deck original Brasa Burguer Management.pptx, image2.png. Crédito original: https://ak1.ostkcdn.com/images/products/30115178/6-Stainless-Steel-Metal-Receipt-Spike-Holder-Bill-Spindle-for-Restaurant-Office-0a9481ad-a3f0-405b-beec-66f7f8c9cd58_600.jpg?impolicy=medium . A foto não retrata a operação Brasa Burger. Segmentação é proposta do projeto, sem estudo de tamanho de mercado.\n\nDetalhamento da versão anterior:\nQuem contrata é o estabelecimento.\n\nHamburguerias e operações de alimentação precisam acompanhar pedidos, estoque e custos.\nO consumidor utiliza o portal da marca.\nO gestor utiliza o ERP para conduzir a operação.",
      "lead": "O estabelecimento contrata o Convívium.",
      "body": "Brasa Burger é o piloto.\nSeus consumidores usam o portal da própria marca.",
      "image": "assets/gestor-aula.jpg",
      "caption": "Gestor fictício em imagem gerada por IA."
    },
    {
      "title": "Oferta ao estabelecimento",
      "notes": "Distinguir a configuração implementada da personalização completa, ainda futura. Fonte: Administracao.jsx, PortalCliente.jsx e módulos operacionais.\n\nDetalhamento da versão anterior:\nGestão e pedido próprio com a identidade da empresa.\n\nOperação\n\nCatálogo, fichas técnicas e estoque.\nFila de pedidos e histórico.\nIndicadores com critérios de cálculo definidos.\n\nExperiência da marca\n\nNome, logo e cor configuráveis.\nPortal próprio para o consumidor.\nUnidades e acessos da equipe na mesma plataforma.",
      "kind": "photo",
      "lead": "A empresa opera. O consumidor pede.",
      "body": "Presencial e WhatsApp: registro pela equipe.\nCanal próprio: pedido pelo consumidor.\nOs canais chegam à operação da loja.",
      "image": "assets/cozinha-aula.jpg",
      "caption": "Cena ilustrativa. WhatsApp permanece com registro manual da equipe."
    },
    {
      "kind": "table",
      "title": "Quem participa do modelo",
      "headers": [
        "Participante",
        "Seu papel"
      ],
      "rows": [
        [
          "Convívium",
          "Fornece e administra a estrutura."
        ],
        [
          "Empresa contratante",
          "Controla sua marca, equipe e operação."
        ],
        [
          "Equipe da unidade",
          "Recebe, prepara e conclui pedidos."
        ],
        [
          "Consumidor",
          "Compra pelo portal da loja."
        ]
      ],
      "notes": "O cliente comercial do software é a empresa; o comprador do alimento é o consumidor. A relação operacional não pressupõe marketplace ou comissão por venda.\n\nDetalhamento da versão anterior:\n"
    },
    {
      "title": "Fluxo operacional",
      "notes": "A solicitação aguardando não reserva estoque. Não alegar contratação automática de entregador, gateway financeiro ou repasse pela plataforma.\n\nDetalhamento da versão anterior:\nO pedido chega à unidade escolhida pelo consumidor.\n\nO consumidor se cadastra com CPF e monta o carrinho.\nA unidade escolhida recebe a solicitação ao vivo.\nO aceite cria venda e baixa os insumos.\nO cliente acompanha os próximos status.\n\nPagamento atual diretamente à loja. Frete próprio depende de cotação válida.",
      "kind": "steps",
      "steps": [
        {
          "title": "Consumidor pede",
          "detail": "Escolhe a unidade e envia uma solicitação."
        },
        {
          "title": "Unidade recebe",
          "detail": "A equipe confere o pedido. O estoque ainda não muda."
        },
        {
          "title": "Equipe confirma",
          "detail": "O aceite cria a venda e baixa os insumos uma vez."
        },
        {
          "title": "Cliente acompanha",
          "detail": "O andamento volta ao titular do pedido."
        }
      ],
      "lead": "O pedido pertence à unidade escolhida."
    },
    {
      "title": "Receita proposta",
      "notes": "HIPÓTESE COMERCIAL, não tabela de planos ativos. Fonte conceitual: slide Modelo de Receita SaaS do deck fornecido pelo usuário. Não há sistema de cobrança de assinatura implementado nem preços definidos nesta entrega.\n\nDetalhamento da versão anterior:\nAssinatura por empresa, com faixas de unidades.\n\nRecorrência\n\nAcesso ao ERP e ao portal.\nManutenção e evolução do produto.\nFaixas e preços a definir em validação comercial.\n\nServiços opcionais\n\nImplantação e migração de dados.\nConfiguração e treinamento.\nPersonalizações avaliadas por escopo.",
      "kind": "plain",
      "lead": "Assinatura por empresa é a proposta de receita.",
      "leftTitle": "Recorrência",
      "left": "Faixas conforme a quantidade de unidades.\nPreço depende de validação comercial.",
      "rightTitle": "Implantação",
      "right": "Configuração da marca e do catálogo.\nTreinamento e suporte como serviços."
    },
    {
      "kind": "table",
      "title": "Estrutura econômica proposta",
      "headers": [
        "Componente",
        "O que validar"
      ],
      "rows": [
        [
          "Infraestrutura",
          "Hospedagem, banco e rotas."
        ],
        [
          "Implantação",
          "Tempo para configurar e treinar."
        ],
        [
          "Suporte",
          "Esforço para manter a operação."
        ],
        [
          "Assinatura",
          "Valor que o cliente aceita pagar."
        ]
      ],
      "notes": "Modelo conceitual. Não representa demonstração financeira, contrato ou faturamento realizado. Não foi estimado ganho de margem ou eliminação de taxas de terceiros.\n\nDetalhamento da versão anterior:\n"
    },
    {
      "title": "Implantação de uma empresa",
      "notes": "Sequência proposta de implantação apoiada nos módulos existentes. A primeira conta master exige provisionamento controlado pelo dono do banco; cadastro público não concede acesso de equipe.\n\nDetalhamento da versão anterior:\nA configuração acompanha a operação que vai usar o sistema.\n\n1. Definir identidade e cadastrar unidades.\n2. Organizar catálogo, fichas e saldo inicial.\n3. Vincular contas aos perfis e unidades.\n4. Conferir um pedido completo e os indicadores.\n5. Treinar a equipe e acompanhar o uso.",
      "kind": "steps",
      "steps": [
        {
          "title": "Empresa",
          "detail": "Identidade e vínculo com a plataforma."
        },
        {
          "title": "Unidades e equipe",
          "detail": "Responsáveis e permissões de cada loja."
        },
        {
          "title": "Catálogo",
          "detail": "Produtos, preços, insumos e fichas."
        },
        {
          "title": "Operação",
          "detail": "Pedidos e acompanhamento com a equipe."
        }
      ],
      "lead": "A configuração acompanha a empresa que vai operar."
    },
    {
      "title": "Validação comercial",
      "notes": "Métricas propostas para acompanhamento futuro. Não são resultados já medidos. Pesquisa aprofundada de concorrentes depende do conector Exa e não foi substituída por afirmações genéricas.\n\nDetalhamento da versão anterior:\nO piloto deve produzir evidências de uso antes de definir a oferta.\n\nProduto\n\nTempo até o primeiro pedido.\nErros de cadastro e atendimento.\nUso dos módulos pela equipe.\n\nNegócio\n\nCusto de implantação e suporte.\nAceitação da proposta de assinatura.\nRetenção de empresas ao longo do tempo.",
      "kind": "photo",
      "lead": "O piloto vem antes da expansão comercial.",
      "body": "Validar o uso no Brasa Burger.\nMedir o esforço de implantação e suporte.\nDepois, ampliar para outras operações.",
      "image": "assets/executivo-aula.jpg",
      "caption": "Prato ilustrativo. Não representa uma nova empresa contratante."
    },
    {
      "title": "Estágio e evolução",
      "notes": "Fontes: repositório da versão final, apresentações originais e https://brasa-burguer-apresentacao-2026.azurebard4.chatgpt.site/ . Nenhuma receita, adesão, preço ou resultado de mercado é presumido.\n\nDetalhamento da versão anterior:\nUma base funcional com espaço para validação e expansão.\n\nDisponível no piloto\n\nEmpresas e unidades isoladas.\nIdentidade configurável e portal próprio.\nPedidos, estoque e análise gerencial.\n\nEvolução prevista\n\nConvites, tema completo e integrações.\nEnsaio da turma e operação acompanhada.\nOferta comercial validada com estabelecimentos.",
      "kind": "plain",
      "lead": "MVP integrado para a apresentação da aula.",
      "leftTitle": "Foco atual",
      "left": "Pedido pelo consumidor.\nOperação pela loja.\nDemonstração do fluxo real.",
      "rightTitle": "Evolução comercial",
      "right": "Publicações separadas.\nValidação com contratantes.\nSuporte e modelo de cobrança."
    }
  ]
};
