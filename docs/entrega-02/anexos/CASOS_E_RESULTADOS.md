# Casos de teste e resultados — Entrega 2

## Execução disponível

| Campo | Registro |
|---|---|
| Código funcional | tag `entrega-2-2026-2-revisao-1`; código integrado em `5181371` |
| Execução local | 11/11/2026, Windows, Node.js, diretório `frontend/` |
| Comando | `npm test` → `node --test` |
| Obtido | 117 testes; 117 aprovados; 0 falhas, cancelados ou ignorados |
| Banco | 36 cenários PostgreSQL/PGlite isolados, com rollback |
| CI | [Execução 43116523681](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43116523681), 11/11/2026, três jobs com conclusão success |
| Passos do CI | Instalação pelo lockfile, testes, build e auditoria de dependências |
| Limite | Não comprova carga, e-mail externo ou trajetos físicos |

A tag original conserva o registro de 04/11; esta tabela identifica a revisão de 11/11 e suas novas verificações. Os testes não acessam o Supabase operacional. O novo teste de bootstrap usa a sequência integral, sem a fixture operacional. A API/Auth foi verificada separadamente na stack local do runner. Os caminhos abaixo são relativos à raiz do repositório; os nomes localizam as asserções e os dados completos. A tabela é um recorte da suíte.

## Casos automatizados executados

| Caso / entrada | Esperado | Obtido | Interpretação e localização |
|---|---|---|---|
| CT01 — 3,5 km e tarifa 1,50 | R$ 5,25 | R$ 5,25; aprovado | Proporcionalidade e vírgula decimal; `entrega.test.js`, “taxa proporcional por km...” |
| CT02 — 1,235 km e tarifa 1,50 | R$ 1,85 | R$ 1,85; aprovado | Arredondamento final ao centavo; mesmo teste |
| CT03 — distância/tarifa vazia, zero, negativa ou não numérica | Rejeitar sem taxa | Exceções esperadas; aprovado | Entrada inválida; `entrega.test.js`, “não cobra usando entradas...” |
| CT04 — preço 24,90 e markup 15% | R$ 28,64 no JS e PostgreSQL | Valores coincidem; aprovado | Regressão de arredondamento; `operacaoBanco.test.js`, “markup no navegador coincide...” |
| CT05 — duas receitas de 27,90, custo 8,90 conhecido em uma | CMV 31,90%; margem 68,10%; cobertura 50% | Asserções aprovadas | Custo ausente não vira zero; `dashboard.test.js`, “calcula CMV agregado...” |
| CT06 — pedido cancelado de 99,00 | Receita/quantidade zero e ticket indisponível | 0, 0 e null; aprovado | Exclusão de cancelados; `dashboard.test.js`, “exclui cancelamentos...” |
| CT07 — total 33,15 e frete 5,25, mais pedido cancelado | Faturamento 33,15; itens 27,90; frete 5,25 | Asserções aprovadas | Separação do frete; `dashboard.test.js`, “separa frete dos itens...” |
| CT08 — cotação 3,75 enviada e aceita após expiração inicial | Reserva mantém taxa; reenvio recupera solicitação; outro envio não reutiliza cotação | Asserções aprovadas; taxa 3,75 | Reserva e idempotência; `operacaoBanco.test.js`, “mobile: reserva é idempotente...” |
| CT09 — cotação vencida ou de outro titular | Recusar e não criar solicitação | Erros esperados e contagem zero; aprovado | Validade/titular no servidor; `operacaoBanco.test.js` |
| CT10 — cadastro Auth público | Não criar colaborador nem expor clientes/custos | Asserções aprovadas | Consumidor separado do ERP; `operacaoBanco.test.js`, “mobile: cadastro público...” |
| CT11 — preço adulterado, adicional repetido, CPF inválido ou quantidade fracionária | Recusar envio | Exceções esperadas; aprovado | Validação no servidor; `operacaoBanco.test.js`, “mobile: preço adulterado...” |
| CT12 — aceite com estoque insuficiente ou preço atualizado | Reverter venda e conservar solicitação aguardando | Asserções aprovadas | Atomicidade; `operacaoBanco.test.js`, “mobile: estoque insuficiente...” |
| CT13 — aceite repetido | Mesma venda e baixa única | Asserções aprovadas | Idempotência; `operacaoBanco.test.js`, “mobile: aceite transacional...” |
| CT14 — administrador e gerente em unidades distintas | Administrador vê suas unidades; gerente apenas a própria e não provisiona conta | Asserções aprovadas | Escopo no banco isolado; `operacaoBanco.test.js`, “empresas: administrador da marca...” |
| CT15 — mesmo CPF em duas empresas | Cadastros independentes | Asserções aprovadas | Isolamento entre empresas; `operacaoBanco.test.js`, “empresas: master cadastra...” |
| CT16 — resposta perdida e recarga | Recuperar mesma chave/conteúdo sem duplicação | Asserções aprovadas | Recuperação; `pedidoTransacional.test.js` |
| CT17 — reposição repetida | Somar saldo atual uma vez | Asserções aprovadas | Reposição atômica; `operacaoBanco.test.js`, “banco: reposição soma...” |
| CT18 — usuário de leitura, inativo ou gerente de outra unidade | Negar alteração não autorizada | Asserções aprovadas | Autorização/RLS; `operacaoBanco.test.js` |

Arquivos: `frontend/test/entrega.test.js`, `dashboard.test.js`, `operacaoBanco.test.js` e `pedidoTransacional.test.js`. A suíte SQL carrega `frontend/test/fixtures/erp.sql` e as migrações indicadas no seu bloco de preparação.

## Homologações e alcance da evidência

| Caso | Entrada | Esperado | Obtido / interpretação |
|---|---|---|---|
| CT19 / HM01 | Sequência integral em dois bancos vazios | Objetos, permissões, primeiro master e dados mínimos | PGlite e PostgreSQL nativo aprovados; também Supabase local real |
| HM02 | Auth real, montagem/envio do frontend e PostgREST local | Solicitação na unidade correta, espera sem baixa, aceite e acompanhamento | R$ 55,80, saldo 100 antes e 98 após aceite; etapa recebido. API aprovada; escrita integral pela interface não realizada |
| HM03 | Duas conexões PostgreSQL e duas sessões Auth simultâneas | Venda e baixa únicas | Aprovado em ambos os ensaios. Nativo: R$ 25,00/150 g; API: R$ 55,80/2 un. Cenários distintos |
| HM04 | Gerente de outra unidade e consumidores | Negar leitura/alteração alheia | Aprovado em SQL e API; isolamento entre empresas adicionalmente coberto por PGlite |
| HM05 | Cancelar com devolução e estoque insuficiente | Repor uma vez, preservar histórico e reverter falha | Nativo: 850 g para 1000 g; API: 98 para 100. Rollback insuficiente aprovado no nativo e suíte SQL |
| HM06 | Endereços reais e rotas físicas | Distância/taxa compatíveis | Não executado em campo. Fórmula e falhas de cobertura testadas |
| HM07 | Origem HTTPS e rota direta | Abrir catálogo e cadastro CPF | Publicado no GitHub Pages e conferido no navegador; CPF dispensa envio de e-mail |
| HM08 | Catálogo e carrinho na interface | Carregar unidade/itens e somar preços | Aprovado em 04/11: 2 x 26,90 = 53,80. Capturas não mostram envio |

Resultados sanitizados: `resultado-postgres.json` e `resultado-api-local.json`. A stack Auth/API foi criada e destruída no runner isolado. Nenhuma conta ou pedido sintético foi criado no Supabase compartilhado.

## Falhas corrigidas e limites

- O centavo divergente de markup foi corrigido e tem regressão em CT04.
- Preço adulterado, cotação inválida, estoque insuficiente e acesso alheio são rejeições esperadas nos testes.
- O registro anterior relata falha de geocodificação do endereço comercial do Retiro: envio bloqueado e mapa oferecido, sem taxa inventada. Isso comprova tratamento daquela falha, não sucesso de rota do imóvel.
- Respostas simuladas do provedor não demonstram cobertura cartográfica real.
- Carga permanece não testada. Concorrência com conexões independentes foi aprovada; ela não representa carga de produção.
- Auditoria de dependências aprovada não comprova ausência de segredos nem ausência de todo risco.

## Modelo de registro para cada execução nova

```text
ID do caso e tarefa:
Data e responsável:
Commit/tag e ambiente/versões:
Perfis, empresa e unidade (dados sintéticos):
Entrada e pré-condições:
Resultado esperado:
Resultado obtido:
Interpretação: aprovado, reprovado ou bloqueado; justificativa.
Evidência: arquivo, captura, log sanitizado, consulta ou URL.
Limites e ação decorrente:
```

## Revisão para a aula, 11/11/2026

Cadastro direto CPF/senha com limite de rede, senha validada pelo Auth, identificador interno sem e-mail pessoal, CPF imutável no perfil, resolução de conta restrita ao servidor e negação de dados de outra unidade. O aviso Realtime de status chegou ao titular no ensaio real. Consulta ViaCEP e tratamento de falhas foram verificados. Frontend e apresentação publicados por GitHub Actions; capturas HTTPS não criaram contas ou pedidos.

CI integrado: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43116523681 . Deploy: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43114129902 .
