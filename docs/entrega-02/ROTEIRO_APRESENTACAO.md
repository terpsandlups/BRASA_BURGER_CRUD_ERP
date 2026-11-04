# Roteiro de apresentação e ensaio

A apresentação principal tem capa, 10 páginas de conteúdo e conclusão/referências. Tempo previsto aproximado: 13 minutos. O grupo deve ensaiar e distribuir a fala conforme domínio de cada trecho. O roteiro não comprova um ensaio já realizado.

## Página 1: Convívium Management System

Abertura, 40 segundos. Faculdade Anhanguera, ADS, Projeto Integrado I, II e III. Prof. Gilberto Falco Netto. Apresentar Convívium como plataforma e Brasa Burger como empresa do caso.

## Página 2: Problema e escopo

1 minuto. Delimitar o escopo acadêmico. Fiscal e financeiro completos, aplicativos nativos e integrações comerciais são evoluções. Fonte: README e trabalho escrito da Entrega 2.

## Página 3: Plataforma, empresa e unidade

1 minuto. Identificar a empresa como fronteira dos dados. Administrador comum não recebe acesso às outras empresas. Fonte: migração empresas_acesso_frete_cliente e testes de permissões.

## Página 4: Pedido pelo portal da marca

2 minutos, incluindo demonstração. A captura mostra duas unidades a R$ 26,90, totalizando R$ 53,80. É cálculo no navegador, sem venda. O aceite e a baixa são demonstrados separadamente pelos testes isolados. Imagem do próprio projeto.

## Página 5: Arquitetura implementada

1 minuto. Python é script independente e MySQL é estudo separado. Não apresentar uma API Node intermediária. Fonte: App.jsx, AuthContext.jsx, migrações e calcular-entrega.

## Página 6: Algoritmo do aceite

1 minuto e 20 segundos. Interpretar cada estrutura. A solicitação aguardando ainda não baixa estoque. Idempotência evita duplicação ao repetir uma confirmação. Fonte: enviar_mobile, decidir_mobile e criar_pedido_transacional.

## Página 7: Frete e arredondamento

1 minuto. Explicar 3500 × 150 ÷ 1000 = 525 centavos. Mostrar também o teste de markup: 24,90 × 1,15 = 28,635, arredondado para 28,64. Fonte: entrega.test.js e operacaoBanco.test.js.

## Página 8: CMV com base definida

1 minuto. Um segundo item sem ficha reduz a cobertura de custo para 50% no exemplo do teste. A ficha atual gera uma estimativa gerencial; margem não é lucro líquido. Fonte: dashboard.js, dashboard.test.js e memória de cálculo.

## Página 9: Evidências das três disciplinas

1 minuto. Localizar arquivos e testes pela matriz anexada. Desenvolvimento em JavaScript, Nuvem e Análise Orientada a Objetos complementam os três eixos exigidos. O docente aceitou a linguagem, conforme confirmação do responsável.

## Página 10: Verificação reproduzível

1 minuto. Os 101 testes incluem 33 cenários SQL, contando o bootstrap. A verificação nativa com conexões independentes é uma evidência adicional, sem somar sua contagem ao Node Test Runner. Fonte: resultado-postgres.json, testes e CI da versão final. CI de 04/11/2026: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/41924749997. Auth e API locais reais confirmaram venda única de R$ 55,80, saldo 100 para 98 e retorno a 100 no cancelamento.

## Página 11: Resultados e limites

1 minuto. Apresentar os limites com precisão. Não alegar operação em pico ou escala comercial comprovada. Os testes em ambiente isolado não são ensaio dos integrantes nem validação de todos os trajetos reais.

## Página 12: Conclusão e referências

1 minuto. Fontes completas no trabalho escrito. Repositório: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP . Referência visual complementar: https://brasa-burguer-apresentacao-2026.azurebard4.chatgpt.site/ . Distribuir fala entre os dois integrantes e ensaiar a exposição em até 15 minutos.
