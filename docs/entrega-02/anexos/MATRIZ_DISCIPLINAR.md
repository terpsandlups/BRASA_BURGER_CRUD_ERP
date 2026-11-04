# Matriz final de evidências — Entrega 2

Revisão de 04/11/2026; referência `entrega-2-2026-2`. Os caminhos são relativos à raiz do repositório na tag de referência.

## Três disciplinas obrigatórias

| Disciplina | Conceito | Aplicação necessária | Localização no código | Teste e evidência |
|---|---|---|---|---|
| Linguagem de Programação | Tipos, módulos, funções e retorno | Dados do carrinho transformados em solicitação | `frontend/src/lib/portalCliente.js`: `montarSolicitacao`, `totalCarrinho` | `frontend/test/portalCliente.test.js`: subtotal, normalização e entrada inválida |
| Linguagem de Programação | Entrada/saída, eventos e estado | Consumidor escolhe unidade/itens; equipe recebe a solicitação | `frontend/src/pages/PortalCliente.jsx`; `frontend/src/pages/SolicitacoesMobile.jsx` | API/Auth locais reais aprovados; escrita integral pela interface ainda não homologada; cenários RPC em `operacaoBanco.test.js` aprovados |
| Linguagem de Programação | Erros e operações assíncronas | Preservar envio pendente quando a resposta de rede é incerta | `frontend/src/lib/pedidoTransacional.js`: `criarEnvioTransacional` | `frontend/test/pedidoTransacional.test.js`: recuperação e cliques simultâneos |
| Algoritmos e Programação Estruturada | Sequência e seleção | Validar conta, unidade, modalidade, preços, CPF, cotação e itens antes da persistência | `supabase/migrations/20261025004910_empresas_acesso_frete_cliente.sql`: `erp_privado.enviar_mobile` | `frontend/test/operacaoBanco.test.js`: preço adulterado, cotação vencida e titular divergente |
| Algoritmos e Programação Estruturada | Repetição e decomposição | Somar linhas/adicionais e processar itens da venda | `frontend/src/lib/portalCliente.js`: `totalCarrinho`; RPCs de envio/aceite | `portalCliente.test.js` e `operacaoBanco.test.js`: adicionais, quantidade e baixa |
| Algoritmos e Programação Estruturada | Estado, transação e idempotência | Solicitação aguarda sem baixar estoque; aceite cria uma venda; reenvio recupera a mesma operação | `erp_privado.decidir_mobile`, `criar_pedido_transacional`; migrações de portal/empresas e estoque | `operacaoBanco.test.js`: aceite repetido, rollback por falta de estoque e baixa uma vez |
| Matemática Computacional | Somatório e aritmética monetária | Subtotal com quantidades e adicionais, total e arredondamento | `frontend/src/lib/portalCliente.js`: `totalCarrinho`; `frontend/src/lib/pedidoTransacional.js`: `calcularPrecoCanal` | `portalCliente.test.js`; `operacaoBanco.test.js`: markup coincide com `round(numeric)` |
| Matemática Computacional | Proporcionalidade e unidades | Taxa de entrega a partir de metros e centavos/km | `frontend/src/lib/entrega.js`: `calcularTaxaEntrega`; função de entrega no servidor | `frontend/test/entrega.test.js`: 3,5 km × R$ 1,50 = R$ 5,25; entradas inválidas |
| Matemática Computacional | Razões, percentuais e médias | CMV, margem, cobertura de custo e ticket com recorte explícito | `frontend/src/lib/dashboard.js`: `calcularDashboard` | `frontend/test/dashboard.test.js`: CMV 31,90%, cobertura 50%, cancelados e frete separado |
| Matemática Computacional | Soma ponderada e módulo | Validar dígitos do CPF | `frontend/src/lib/format.js`: `validarCPF`; validação adicional na RPC móvel | `portalCliente.test.js` e `operacaoBanco.test.js`: CPF inválido recusado |

A matriz localiza os trechos interpretados nas seções 6 a 8 do trabalho escrito, relacionando conceito, implementação e resultado.

## Disciplinas complementares da continuidade

| Eixo da Entrega 1 | Evidência atual |
|---|---|
| Desenvolvimento em JavaScript | Componentes React, módulos de domínio, chamadas assíncronas e testes Node.js |
| Computação em Nuvem | Supabase Auth/PostgREST, PostgreSQL, Edge Function e secrets no servidor; hospedagem externa pendente |
| Análise Orientada a Objetos | Responsabilidades e relações de Empresa, Loja, Cliente, Pedido, Item, Produto e Variação; o frontend atual usa componentes/funções, não a classe inicial isolada do ZIP |

O docente aceitou a linguagem, conforme confirmação do responsável. Os três eixos obrigatórios continuam explicitamente demonstrados. As fontes efetivamente usadas estão na seção 11 do trabalho; a lista institucional completa não foi fornecida no enunciado.
