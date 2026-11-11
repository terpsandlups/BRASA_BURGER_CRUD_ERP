window.CONVIVIUM_SLIDES = {
  "academica": [
    {
      "kind": "cover",
      "title": "Convívium\nManagement System",
      "subtitle": "Aplicação integrada para operações de alimentação",
      "detail": "Entrega 2 de 2026/2\nCaso de aplicação: Brasa Burger\nGabriel Rodrigues do Prado e Rafaela Rodrigues Oliveira",
      "notes": "Abertura, 40 segundos. Faculdade Anhanguera, ADS, Projeto Integrado I, II e III. Prof. Gilberto Falco Netto. Apresentar Convívium como plataforma e Brasa Burger como empresa do caso.",
      "backgroundImage": "assets/portal-cpf-publicado.jpg",
      "imageAlt": "Catálogo real do portal público Brasa Burger"
    },
    {
      "title": "Problema e escopo",
      "lead": "Informações de atendimento e gestão precisam acompanhar o mesmo pedido.",
      "leftTitle": "Problema",
      "left": "Cadastros separados dificultam recuperar vendas, conferir estoque e interpretar custos.",
      "rightTitle": "Escopo entregue",
      "right": "Portal do consumidor, pedidos da unidade, catálogo, fichas, estoque e indicadores integrados.",
      "notes": "1 minuto. Delimitar o escopo acadêmico. Fiscal e financeiro completos, aplicativos nativos e integrações comerciais são evoluções. Fonte: README e trabalho escrito da Entrega 2."
    },
    {
      "kind": "table",
      "title": "Plataforma, empresa e unidade",
      "headers": [
        "Perfil",
        "Escopo de acesso"
      ],
      "rows": [
        [
          "Master",
          "Cadastra empresas e seleciona a operação"
        ],
        [
          "Administrador",
          "Gerencia marca, equipe e unidades da empresa"
        ],
        [
          "Gerente",
          "Opera somente a unidade vinculada"
        ],
        [
          "Consumidor",
          "Envia e acompanha suas solicitações"
        ]
      ],
      "notes": "1 minuto. Identificar a empresa como fronteira dos dados. Administrador comum não recebe acesso às outras empresas. Fonte: migração empresas_acesso_frete_cliente e testes de permissões."
    },
    {
      "kind": "screenshot",
      "title": "Pedido pelo portal da marca",
      "image": "assets/portal-cpf-publicado.jpg",
      "left": "1. Escolher unidade\n2. Montar o carrinho\n3. Conferir total e contato\n4. Enviar à loja",
      "caption": "Portal HTTPS: unidade Japy, carrinho de R$ 53,80. Nenhum envio nesta captura.",
      "notes": "Captura pública em 11/11/2026. Duas unidades de R$ 26,90. Cadastro por CPF e senha. Nenhuma conta, solicitação ou venda foi criada na captura. A integração escrita foi verificada em Supabase local descartável no CI."
    },
    {
      "title": "Arquitetura implementada",
      "lead": "O navegador apresenta a operação. O servidor valida as regras.",
      "leftTitle": "Interface",
      "left": "React, JavaScript e Vite\nComponentes, eventos e chamadas à API\nNode.js executa as ferramentas e os testes",
      "rightTitle": "Serviços e dados",
      "right": "Supabase Auth e PostgREST\nPostgreSQL com RLS, funções e transações\nEdge Function para consultar a rota",
      "notes": "1 minuto. Python é script independente e MySQL é estudo separado. Não apresentar uma API Node intermediária. Fonte: App.jsx, AuthContext.jsx, migrações e calcular-entrega."
    },
    {
      "kind": "code",
      "title": "Algoritmo do aceite",
      "code": "VALIDAR conta, unidade, itens e preços\nPARA CADA item: conferir quantidade e estoque\nSE delivery: conferir cotação e endereço\nSE requisição já concluída: retornar a venda\nEM TRANSAÇÃO: criar pedido e baixar estoque\nSE ocorrer falha: reverter alterações",
      "caption": "Sequência, condição, repetição e decomposição participam do fluxo real.",
      "notes": "1 minuto e 20 segundos. Interpretar cada estrutura. A solicitação aguardando ainda não baixa estoque. Idempotência evita duplicação ao repetir uma confirmação. Fonte: enviar_mobile, decidir_mobile e criar_pedido_transacional."
    },
    {
      "kind": "number",
      "title": "Frete e arredondamento",
      "number": "R$ 5,25",
      "lead": "3,5 km × R$ 1,50 por km",
      "body": "Distância em metros e tarifa em centavos.\nO cálculo arredonda a taxa final ao centavo.\nA cotação do servidor determina o frete do pedido.",
      "notes": "1 minuto. Explicar 3500 × 150 ÷ 1000 = 525 centavos. Mostrar também o teste de markup: 24,90 × 1,15 = 28,635, arredondado para 28,64. Fonte: entrega.test.js e operacaoBanco.test.js."
    },
    {
      "kind": "number",
      "title": "CMV com base definida",
      "number": "31,90%",
      "lead": "R$ 8,90 de custo ÷ R$ 27,90 de receita × 100",
      "body": "Margem simplificada: 68,10%.\nA receita elegível usa itens com ficha conhecida.\nFrete separado e pedidos cancelados excluídos.",
      "notes": "1 minuto. Um segundo item sem ficha reduz a cobertura de custo para 50% no exemplo do teste. A ficha atual gera uma estimativa gerencial; margem não é lucro líquido. Fonte: dashboard.js, dashboard.test.js e memória de cálculo."
    },
    {
      "kind": "table",
      "title": "Evidências das três disciplinas",
      "headers": [
        "Disciplina",
        "Aplicação",
        "Evidência"
      ],
      "rows": [
        [
          "Linguagem",
          "Funções e eventos JavaScript",
          "Portal e envio"
        ],
        [
          "Algoritmos",
          "Validação, repetição e transação",
          "Aceite e estoque"
        ],
        [
          "Matemática",
          "Somatórios, razões e proporcionalidade",
          "Total, CMV e frete"
        ]
      ],
      "notes": "1 minuto. Localizar arquivos e testes pela matriz anexada. Desenvolvimento em JavaScript, Nuvem e Análise Orientada a Objetos complementam os três eixos exigidos. O docente aceitou a linguagem, conforme confirmação do responsável."
    },
    {
      "kind": "number",
      "title": "Verificação reproduzível",
      "number": "117",
      "lead": "testes automatizados aprovados",
      "body": "Instalação integral em dois bancos vazios.\nDuas conexões PostgreSQL confirmam a mesma venda.\nUma baixa de estoque e rollback em caso de falha.",
      "notes": "Revisão de novembro: 117 testes locais aprovados, incluindo CPF, ViaCEP, isolamento e eventos mínimos de status. Validação adicional da API e Realtime em stack local descartável no CI. O código e o registro de revisão acompanham os materiais. CI com Auth e Realtime: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43116523681 . Publicação HTTPS: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43114129902 ."
    },
    {
      "title": "Resultados e limites",
      "lead": "O fluxo central tem regras e resultados rastreáveis.",
      "leftTitle": "Resultado",
      "left": "Cadastro do consumidor por CPF e senha.\nVenda e baixa transacionais.\nAutorização por empresa e unidade.",
      "rightTitle": "Limites conhecidos",
      "right": "Cobertura de endereços pode exigir mapa.\nCarga simultânea da turma requer ensaio.\nPagamento presencial e canais manuais.",
      "notes": "1 minuto. Apresentar os limites com precisão. Não alegar operação em pico ou escala comercial comprovada. Os testes em ambiente isolado não são ensaio dos integrantes nem validação de todos os trajetos reais."
    },
    {
      "title": "Conclusão e referências",
      "lead": "Programação, algoritmos e matemática sustentam a mesma operação.",
      "body": "O Convívium evolui a base da Entrega 1 para uma aplicação integrada.\nO Brasa Burger permanece como caso de uso da plataforma.\nCódigo, cálculos e resultados acompanham a versão entrega-2-2026-2-revisao-1.",
      "small": "Fontes: repositório do projeto, memória de cálculo, matriz disciplinar, registros de teste e enunciado da Entrega 2.",
      "notes": "1 minuto. Fontes completas no trabalho escrito. Repositório: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP . Referência visual complementar: https://brasa-burguer-apresentacao-2026.azurebard4.chatgpt.site/ . Distribuir fala entre os dois integrantes e ensaiar a exposição em até 15 minutos."
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
        "Exemplo atual"
      ],
      "rows": [
        [
          "Criar",
          "Cadastrar cliente ou enviar solicitação"
        ],
        [
          "Ler",
          "Consultar catálogo, pedido e histórico"
        ],
        [
          "Atualizar",
          "Editar ficha ou avançar status com autorização"
        ],
        [
          "Excluir",
          "Exclusão física restrita; operação preserva o histórico"
        ]
      ],
      "notes": "Explicar a diferença entre exclusão física e desativação de cadastro. O ERP não oferece exclusão indiscriminada de insumos vinculados. Fonte: permissões, políticas e componentes atuais."
    },
    {
      "title": "Interface e servidor",
      "lead": "Cada camada tem uma responsabilidade delimitada.",
      "leftTitle": "React no navegador",
      "left": "Apresenta telas e recebe dados.\nAtualiza carrinho e filtros.\nEnvia solicitações para a API.",
      "rightTitle": "Supabase e PostgreSQL",
      "right": "Autenticam a conta e aplicam o acesso.\nConferem preços, unidade e estoque.\nPersistem a operação em transação.",
      "notes": "O navegador não define sozinho permissões nem valores definitivos de frete. Fonte: AuthContext, módulos de envio e funções SQL."
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
      "lead": "O banco transacional da aplicação é PostgreSQL.",
      "leftTitle": "Python",
      "left": "Scripts legados de carga e simulação.\nNão são API intermediária.\nA instalação final usa SQL e dados sintéticos próprios.",
      "rightTitle": "MySQL",
      "right": "Estudo analítico independente.\nNão substitui o backend Supabase.\nNão é necessário para abrir a interface.",
      "notes": "Corrige as alegações de ETL contínuo e milhares de produtos dos materiais anteriores. Fonte: python/, mysql/ e guia de execução. Logo oficial: https://www.python.org/community/logos/ . Marca Python pertencente à Python Software Foundation.",
      "decorationImage": "assets/python-logo.png"
    },
    {
      "kind": "code",
      "title": "Estruturas de controle",
      "code": "SE o CPF for inválido: comunicar erro\nPARA CADA linha: somar quantidade × preço\nSE o estoque for insuficiente: recusar aceite\nSE a chave já existir: recuperar o resultado\nAPÓS confirmar: atualizar a visão do pedido",
      "caption": "As funções decompõem o processo e permitem testes de cada regra.",
      "notes": "Fonte: portalCliente.js, pedidoTransacional.js, funções SQL e testes. Não apresentar impressão de cupom ou fechamento financeiro como implementados."
    },
    {
      "title": "Nuvem e implantação",
      "lead": "Supabase fornece os serviços gerenciados do backend.",
      "leftTitle": "Implementado",
      "left": "Auth, PostgREST e banco relacional.\nFunção de entrega com segredo no servidor.\nRLS e validação por contexto.",
      "rightTitle": "Publicação da entrega",
      "right": "GitHub Pages para a interface.\nSupabase para autenticação e dados.\nPortal público e acesso restrito à equipe.",
      "notes": "Publicação HTTPS confirmada em 11/11/2026. Fonte: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43114129902 . Frontend público: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/ ."
    },
    {
      "kind": "number",
      "title": "Cálculo com interpretação",
      "number": "68,10%",
      "lead": "Receita de R$ 27,90 e custo conhecido de R$ 8,90",
      "body": "CMV de 31,90% sobre receita de itens com ficha.\nCobertura informa quanto da receita tem custo conhecido.\nFrete e cancelamentos seguem critérios explícitos.",
      "notes": "Corrige a margem de 68,6% do material anterior. Fonte: dashboard.test.js e memória de cálculo. Não é lucro líquido."
    },
    {
      "title": "Segurança e rastreabilidade",
      "lead": "A sessão identifica a conta. As regras limitam a operação.",
      "body": "Consumidor entra com CPF e senha e acompanha seus pedidos.\nGerente opera sua unidade. Administrador opera sua empresa.\nEventos atualizam a fila e o acompanhamento.\nReenvio e aceite repetido preservam uma venda.",
      "small": "Fontes: código, migrações, testes e documentação da versão final no GitHub.",
      "notes": "Referências: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP ; documentação de Supabase Auth, RLS e PostgREST. O histórico de consumo sustenta a conferência do cancelamento."
    }
  ],
  "negocio": [
    {
      "kind": "cover",
      "title": "Convívium\nModelo de negócio",
      "subtitle": "Plataforma personalizável para operações de alimentação",
      "detail": "Brasa Burger como primeiro caso de aplicação\nProposta comercial em validação",
      "notes": "Apresentação complementar de negócio. A plataforma está implementada em piloto; assinatura e serviços descritos são proposta comercial, sem preços ou faturamento contratados presumidos. Fotografia ilustrativa recuperada do deck original. Não retrata o Brasa Burger. Fonte e crédito em Slides/Entrega-2/assets/CREDITOS.md.",
      "backgroundImage": "assets/comprovantes-ilustracao.png",
      "imageAlt": "Fotografia ilustrativa de comprovantes de restaurante"
    },
    {
      "kind": "photo",
      "title": "Cliente da plataforma",
      "image": "assets/comprovantes-ilustracao.png",
      "lead": "Quem contrata é o estabelecimento.",
      "body": "Hamburguerias e operações de alimentação precisam acompanhar pedidos, estoque e custos.\nO consumidor utiliza o portal da marca.\nO gestor utiliza o ERP para conduzir a operação.",
      "notes": "Foto ilustrativa fornecida no deck original Brasa Burguer Management.pptx, image2.png. Crédito original: https://ak1.ostkcdn.com/images/products/30115178/6-Stainless-Steel-Metal-Receipt-Spike-Holder-Bill-Spindle-for-Restaurant-Office-0a9481ad-a3f0-405b-beec-66f7f8c9cd58_600.jpg?impolicy=medium . A foto não retrata a operação Brasa Burger. Segmentação é proposta do projeto, sem estudo de tamanho de mercado."
    },
    {
      "title": "Oferta ao estabelecimento",
      "lead": "Gestão e pedido próprio com a identidade da empresa.",
      "leftTitle": "Operação",
      "left": "Catálogo, fichas técnicas e estoque.\nFila de pedidos e histórico.\nIndicadores com critérios de cálculo definidos.",
      "rightTitle": "Experiência da marca",
      "right": "Nome, logo e cor configuráveis.\nPortal próprio para o consumidor.\nUnidades e acessos da equipe na mesma plataforma.",
      "notes": "Distinguir a configuração implementada da personalização completa, ainda futura. Fonte: Administracao.jsx, PortalCliente.jsx e módulos operacionais."
    },
    {
      "kind": "table",
      "title": "Quem participa do modelo",
      "headers": [
        "Participante",
        "Responsabilidade"
      ],
      "rows": [
        [
          "Convívium",
          "Disponibiliza e mantém a plataforma"
        ],
        [
          "Empresa cliente",
          "Configura marca, unidades e equipe"
        ],
        [
          "Unidade",
          "Aceita pedidos e executa o atendimento"
        ],
        [
          "Consumidor",
          "Escolhe, envia e acompanha o pedido"
        ]
      ],
      "notes": "O cliente comercial do software é a empresa; o comprador do alimento é o consumidor. A relação operacional não pressupõe marketplace ou comissão por venda."
    },
    {
      "title": "Fluxo operacional",
      "lead": "O pedido chega à unidade escolhida pelo consumidor.",
      "body": "O consumidor se cadastra com CPF e monta o carrinho.\nA unidade escolhida recebe a solicitação ao vivo.\nO aceite cria venda e baixa os insumos.\nO cliente acompanha os próximos status.",
      "small": "Pagamento atual diretamente à loja. Frete próprio depende de cotação válida.",
      "notes": "A solicitação aguardando não reserva estoque. Não alegar contratação automática de entregador, gateway financeiro ou repasse pela plataforma."
    },
    {
      "title": "Receita proposta",
      "lead": "Assinatura por empresa, com faixas de unidades.",
      "leftTitle": "Recorrência",
      "left": "Acesso ao ERP e ao portal.\nManutenção e evolução do produto.\nFaixas e preços a definir em validação comercial.",
      "rightTitle": "Serviços opcionais",
      "right": "Implantação e migração de dados.\nConfiguração e treinamento.\nPersonalizações avaliadas por escopo.",
      "notes": "HIPÓTESE COMERCIAL, não tabela de planos ativos. Fonte conceitual: slide Modelo de Receita SaaS do deck fornecido pelo usuário. Não há sistema de cobrança de assinatura implementado nem preços definidos nesta entrega."
    },
    {
      "kind": "table",
      "title": "Estrutura econômica proposta",
      "headers": [
        "Fluxo",
        "Tratamento no modelo"
      ],
      "rows": [
        [
          "Receita do software",
          "Assinaturas e serviços contratados"
        ],
        [
          "Venda e frete do pedido",
          "Valores da operação do estabelecimento"
        ],
        [
          "Custo da plataforma",
          "Infraestrutura, serviços e manutenção"
        ],
        [
          "Custo de atendimento",
          "Implantação, suporte e evolução"
        ]
      ],
      "notes": "Modelo conceitual. Não representa demonstração financeira, contrato ou faturamento realizado. Não foi estimado ganho de margem ou eliminação de taxas de terceiros."
    },
    {
      "title": "Implantação de uma empresa",
      "lead": "A configuração acompanha a operação que vai usar o sistema.",
      "body": "1. Definir identidade e cadastrar unidades.\n2. Organizar catálogo, fichas e saldo inicial.\n3. Vincular contas aos perfis e unidades.\n4. Conferir um pedido completo e os indicadores.\n5. Treinar a equipe e acompanhar o uso.",
      "notes": "Sequência proposta de implantação apoiada nos módulos existentes. A primeira conta master exige provisionamento controlado pelo dono do banco; cadastro público não concede acesso de equipe."
    },
    {
      "title": "Validação comercial",
      "lead": "O piloto deve produzir evidências de uso antes de definir a oferta.",
      "leftTitle": "Produto",
      "left": "Tempo até o primeiro pedido.\nErros de cadastro e atendimento.\nUso dos módulos pela equipe.",
      "rightTitle": "Negócio",
      "right": "Custo de implantação e suporte.\nAceitação da proposta de assinatura.\nRetenção de empresas ao longo do tempo.",
      "notes": "Métricas propostas para acompanhamento futuro. Não são resultados já medidos. Pesquisa aprofundada de concorrentes depende do conector Exa e não foi substituída por afirmações genéricas."
    },
    {
      "title": "Estágio e evolução",
      "lead": "Uma base funcional com espaço para validação e expansão.",
      "leftTitle": "Disponível no piloto",
      "left": "Empresas e unidades isoladas.\nIdentidade configurável e portal próprio.\nPedidos, estoque e análise gerencial.",
      "rightTitle": "Evolução prevista",
      "right": "Convites, tema completo e integrações.\nEnsaio da turma e operação acompanhada.\nOferta comercial validada com estabelecimentos.",
      "notes": "Fontes: repositório da versão final, apresentações originais e https://brasa-burguer-apresentacao-2026.azurebard4.chatgpt.site/ . Nenhuma receita, adesão, preço ou resultado de mercado é presumido."
    }
  ]
};
