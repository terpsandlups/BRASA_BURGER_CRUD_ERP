# Casos de teste e resultados — Entrega 2

## Execução disponível

| Campo | Registro |
|---|---|
| Código funcional | `6c83548fd19d31ad71f0f0641754597664c60eb5` |
| Execução local | 29/10/2026, Windows, Node.js, diretório `frontend/` |
| Comando | `npm test` → `node --test` |
| Obtido | 100 testes; 100 aprovados; 0 falhas, cancelados ou ignorados |
| Banco | 32 cenários PostgreSQL/PGlite isolados, com rollback |
| CI | [Execução 40368508146](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/40368508146), 26/10/2026, mesmo commit, conclusão success |
| Passos do CI | Instalação pelo lockfile, testes, build e auditoria de dependências |
| Limite | Repetir os checks na versão final antes da tag |

A revisão documental posterior não altera nem reatribui esses resultados. Testes isolados não acessam o Supabase operacional nem comprovam o bootstrap integral. Os caminhos abaixo são relativos à raiz do repositório; os nomes localizam as asserções e os dados completos. A tabela é um recorte da suíte.

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

## Homologações necessárias

| Caso / tarefa | Entrada e execução | Esperado | Obtido / situação |
|---|---|---|---|
| HM01 / E2-REP-01 | Instalação documentada em Supabase vazio | Backend reproduzível sem objetos ocultos | Não executado; bootstrap integral pendente |
| HM02 / E2-APP-01 | Consumidor → unidade → aceite → estoque → histórico pela interface | Mesma operação rastreável em todas as etapas | Não executado integralmente em ambiente descartável |
| HM03 / E2-SEG-01 | Duas sessões reais confirmando a mesma solicitação | Uma venda/baixa e recuperação coerente | Pendente; PGlite não substitui duas conexões remotas |
| HM04 / E2-SEG-01 | Contas reais de teste em empresas/unidades distintas | Acesso alheio negado | Pendente de homologação conectada; testes SQL aprovados |
| HM05 / E2-RES-01 | Venda, cancelamento com destinação e reposição | Estoque, receita e indicadores conciliados | Pendente de ciclo conectado completo |
| HM06 / E2-ENT-01 | Origens reais confirmadas e destinos variados | Distância/taxa coerentes com trajeto real | Pendente de comparação em campo |
| HM07 / E2-EXT-01 | Cadastro/confirmação em origem HTTPS | Receber e-mail e retornar ao portal da marca | Não executado; origem externa não publicada |
| HM08 / E2-EXP-01 | Capturas atuais da demonstração | Legibilidade, dados sintéticos e versão identificada | Pendente de capturas finais |

## Falhas corrigidas e limites

- O centavo divergente de markup foi corrigido e tem regressão em CT04.
- Preço adulterado, cotação inválida, estoque insuficiente e acesso alheio são rejeições esperadas nos testes.
- O registro anterior relata falha de geocodificação do endereço comercial do Retiro: envio bloqueado e mapa oferecido, sem taxa inventada. Isso comprova tratamento daquela falha, não sucesso de rota do imóvel.
- Respostas simuladas do provedor não demonstram cobertura cartográfica real.
- Carga e múltiplas conexões reais continuam pendentes.
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
