# Revisão para apresentação em aula

Convívium Management System, piloto Brasa Burger. Revisão de 11/11/2026. A versão acadêmica original permanece na tag `entrega-2-2026-2`; esta revisão usa `entrega-2-2026-2-revisao-1`.

## Links de uso

- Consumidor: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/pedir/brasa-burger
- Equipe, fila das solicitações: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/solicitacoes
- Equipe, pedidos confirmados: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/pedidos
- Apresentação interativa: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/apresentacao/
- Modelo de negócio: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/apresentacao/#negocio/1
- Linguagens: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/apresentacao/#tecnica/1

O portal público está conectado ao backend do piloto. Solicitações enviadas são persistidas na unidade escolhida. Não foi criada uma unidade exclusiva de demonstração enquanto a preferência do responsável permanece sem resposta. As capturas e os testes automatizados desta revisão não inseriram contas ou pedidos no ambiente operacional.

## Oito blocos de fechamento

| Bloco | Feito | Próximo passo ou limite |
|---|---|---|
| 1. Plataforma e marca | Convívium como ERP e Brasa Burger como empresa do piloto, identidade e portal da marca | Tema integral e convites são evoluções |
| 2. Perfis e lojas | Master, administrador da empresa e gerente da unidade, com autorização no banco | Conferir qual conta da equipe apresentará a aula |
| 3. Conta do consumidor | Cadastro com nome, CPF, telefone e senha; entrada por CPF; CPF único e protegido | Recuperação automática da senha dessas contas ainda não integra o MVP |
| 4. Pedido ao vivo | Solicitação na unidade escolhida; aceite transacional; status ao consumidor por Realtime | 30 consumidores concorrentes aprovados em ambiente isolado; falta o ensaio humano da turma |
| 5. Operação da loja | Catálogo, adicionais, preços, fila, preparo, entrega, cancelamento, estoque e indicadores | Fiscal, financeiro completo e pagamento online seguem fora da Entrega 2 |
| 6. Endereço e frete | ViaCEP preenche o endereço; openrouteservice calcula rota; servidor grava a cotação | Confirmar os pontos físicos das unidades e comparar trajetos em campo |
| 7. Apresentações | Três PowerPoints, PDFs, imagens reais do portal, logos oficiais e versão interativa com 31 páginas | Ensaio da fala e divisão entre os integrantes |
| 8. GitHub e entrega | Código, 117 testes, CI, publicação HTTPS, pacote e manifesto da revisão | Submissão institucional pelo responsável e comprovante de envio |

## Roteiro da aula

1. A equipe entra com a conta já autorizada no ERP e abre a fila de solicitações. Para testar consumidor e equipe na mesma máquina, use perfis de navegador diferentes ou uma janela anônima, pois as abas do mesmo domínio compartilham a sessão. Gerente vê sua unidade; administrador vê as unidades da própria empresa.
2. Compartilhe o link do consumidor. Para o primeiro ensaio, a retirada na unidade Japy dispensa uma consulta de rota.
3. Cada participante cria sua conta com CPF, nome, telefone e senha de pelo menos oito caracteres. Depois pode entrar novamente com CPF e senha.
4. O participante escolhe unidade e produtos, confere o total e envia o pedido. A solicitação aparece na fila correspondente sem baixar estoque durante a espera.
5. A equipe confere a disponibilidade e aceita a solicitação. O aceite cria uma única venda e baixa os insumos, mesmo se a ação for repetida.
6. A equipe avança o preparo. O consumidor acompanha a atualização por eventos. A consulta periódica recupera a tela se a conexão cair.
7. Para encerrar um pedido de ensaio já aceito, a equipe usa o cancelamento previsto no ERP e escolhe o destino correto do consumo. O cancelamento preserva o histórico.

O envio não efetua cobrança online. Retirada e entrega são modalidades da operação da loja. Não há contratação automática de entregador.

## Cadastro CPF

O CPF é o identificador de acesso do consumidor. A aplicação valida dígitos verificadores, sem atestar identidade na Receita Federal. Um perfil privado relaciona CPF à conta Auth. Nome e telefone servem ao atendimento. O cadastro público nunca cria um colaborador, administrador ou master.

A função `acesso-cliente` cria um identificador técnico no domínio reservado `.invalid`, sem caixa postal e sem reivindicar o e-mail de uma pessoa. A senha fica no Supabase Auth. A confirmação exigida para contas que usam e-mail pessoal não foi desativada. O login resolve o CPF somente no servidor e retorna uma sessão autenticada. Chaves privilegiadas permanecem no servidor.

Há limite de dez tentativas de login por CPF em cinco minutos e sessenta tentativas de cadastro por rede em uma hora. O limite de envio por conta permanece aplicado no banco. Esses limites não equivalem a um teste de carga com uma turma completa.

## ViaCEP e rotas

ViaCEP já integra os campos de endereço e recebe somente o CEP. Retorna rua, bairro, cidade e UF, permitindo preenchimento manual se falhar. O número do imóvel continua sendo informado pelo cliente. Não retorna distância por ruas, rota de carro ou taxa de entrega.

openrouteservice/HeiGIT fornece a rota e a distância. A tarifa da unidade e a cotação são conferidas no servidor. A confirmação do ponto no mapa continua necessária quando a cobertura não localiza o imóvel com precisão.

Referências: https://viacep.com.br/ e https://openrouteservice.org/ .

## Evidência e reprodução

117 testes locais aprovados, incluindo 36 cenários PostgreSQL/PGlite. A execução serial evita que dois motores PostgreSQL em WASM disputem memória em computadores com poucos recursos. Build Vite aprovado.

CI integrado: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43116523681 . O ensaio usa a stack Supabase local descartável, com cadastro CPF, senha real no Auth, API, duas sessões de equipe, aceite único, evento Realtime e cancelamento com devolução. Registro em `anexos/resultado-api-local.json`.

Publicação HTTPS: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43114129902 . O navegador confirmou o catálogo público, a escolha de unidade, o carrinho de duas unidades de R$ 26,90 e o formulário CPF. Nenhum pedido foi enviado nessa verificação pública.

Para atualizar o conteúdo interativo a partir dos slides, execute `node scripts/preparar-apresentacao-interativa.mjs`. O HTML e seus arquivos locais também acompanham o ZIP e podem ser abertos sem autenticação. A apresentação contém apenas exemplos didáticos e não cria pedidos.

Ensaio simultâneo adicional aprovado em 11/11/2026: 30 cadastros e solicitações concorrentes, 30 avisos à fila por Realtime, 30 vendas únicas e saldo 100 na espera, 70 no aceite e 100 após cancelamento. Trata-se de carga sintética isolada, sem promessa de capacidade ilimitada ou medição em sala de aula.
