# Entrega 2 — aplicação integrada — Convívium Management System

Revisão: **29/10/2026**. Caso de aplicação: **Brasa Burger**. Esta é a referência para o fechamento acadêmico da Entrega 2; a Entrega 1 permanece como histórico e fonte de continuidade.

## 1. Regras da entrega

| Exigência | Atendimento previsto |
|---|---|
| Prazo | 27/11/2026, horário institucional; janela de 23 a 27/11 |
| Valor | 7.000 pontos; as duas entregas somam 10.500, com mínimo de aprovação de 6.000 conforme enunciado |
| Canal | Formulário oficial com título, URL completa do repositório e ZIP |
| Nome do ZIP | `PI-2026-2-CONVIVIUM-MANAGEMENT-SYSTEM-ENTREGA-2.zip` |
| Tamanho | Até 100 MB |
| Conteúdo obrigatório | `trabalho-escrito.pdf`, `apresentacao.pdf` e pasta `anexos/` |
| Código | Permanece versionado no GitHub; PDFs descrevem a mesma versão |
| Identificação final da versão | Tag ou release `entrega-2-2026-2` |
| Apresentação | 8 a 12 páginas de conteúdo e exposição de até 15 minutos |
| Continuidade | Incorporar correções e artefatos relevantes da Entrega 1, distinguindo base anterior e incremento de 2026/2 |

Fonte dos requisitos: enunciado “Entrega 2 — Aplicação integrada”, Projeto Integrado I, II e III 2026/2, Prof. Gilberto Falco Netto, quatro páginas, fornecido pelo responsável. A entrega da disciplina não se confunde com a numeração dos oito pedidos de melhoria do produto.

## 2. Identificação consolidada

Faculdade Anhanguera; Tecnologia em Análise e Desenvolvimento de Sistemas; turma e disciplina Projeto Integrado I, II e III; período 2026/2; Jundiaí/SP; docente Prof. Gilberto Falco Netto. Integrantes: Gabriel Rodrigues do Prado, 3º semestre, e Rafaela Rodrigues Oliveira, 1º semestre. Modalidade: continuidade de protótipo acadêmico.

Dados extraídos do trabalho da Entrega 1, páginas 1 a 4 e 19 a 20. O uso de JavaScript foi aceito pelo docente, conforme confirmação do responsável em 29/10/2026. A implementação também utiliza SQL/PL/pgSQL. Esse aceite está registrado e não constitui pendência de aprovação.

## 3. Situação dos oito blocos da Entrega 2

**Documentado** significa fonte editável disponível; **verificado** identifica execução efetiva; **pendente** exige atividade/evidência adicional. Código implementado não equivale a fluxo inteiro homologado.

| Bloco | O que já existe | O que precisa ser concluído |
|---|---|---|
| 1. Aplicação e escopo | ERP, portal, empresa/marca, unidades, fila, aceite transacional, estoque e indicadores | Demonstração integrada com dados sintéticos, duas sessões reais e conciliação |
| 2. Linguagem | JavaScript modular e SQL/PL/pgSQL; aceite confirmado | Relacionar explicações e trechos essenciais no PDF final |
| 3. Algoritmos | Condições, repetições, funções, validações e transações; [fluxo atualizado](anexos/ARQUITETURA_E_FLUXO.md) | Exportar e conferir os diagramas e explicar o algoritmo na apresentação |
| 4. Matemática | [Modelo, unidades e exemplos atuais](anexos/MEMORIA_CALCULO.md); testes de cálculo aprovados | Incorporar cálculos e interpretação ao PDF final, preservando a base de CMV implementada |
| 5. Testes | 100 testes aprovados; [casos com esperado, obtido e interpretação](anexos/CASOS_E_RESULTADOS.md) | Executar cenários conectados pendentes e repetir checks na versão final |
| 6. GitHub e reprodução | Repositório público, lockfile, workflow, histórico e [guia atualizado](../../GUIA_PASSO_A_PASSO.md) | Bootstrap vazio homologado, contribuições individuais localizadas e tag/release final |
| 7. Trabalho escrito | [Texto-base nas 11 seções exigidas](TRABALHO_ESCRITO.md), matriz e anexos | Revisão pelos integrantes, bibliografias das disciplinas, evidências finais e exportação PDF |
| 8. Apresentação e submissão | Roteiro de conteúdo neste plano e materiais históricos reaproveitáveis | Produzir PDF final, ensaiar, gerar ZIP, conferir e enviar pelo formulário |

## 4. Checklist completo com critérios de aceite

### Já atendido nesta revisão

- [x] **E2-DOC-01:** atualizar README e documentação com foco na Entrega 2; identificar a Entrega 1 como histórico.
- [x] **E2-ID-01:** recuperar identificação, turma, integrantes e organização inicial na Entrega 1; registrar aceite do docente.
- [x] **E2-MAT-01:** criar matriz das três disciplinas com conceito, função/algoritmo e teste localizáveis.
- [x] **E2-CAL-01:** atualizar memória de cálculo com variáveis, unidades, arredondamento e diferença entre receita de itens e frete.
- [x] **E2-TES-01:** organizar casos com entrada, esperado, obtido, interpretação, ambiente e versão; distinguir casos ainda não executados.
- [x] **E2-DIA-01:** atualizar fontes de arquitetura, fluxo e recorte de dados para portal, empresas e Supabase.
- [x] **E2-TXT-01:** organizar texto-base nas 11 seções obrigatórias, indicando os fechamentos ainda pendentes.
- [x] **E2-CI-01:** localizar resultado público do CI e execução local de referência; não confundir isso com homologação completa.

### Obrigatório para fechar a Entrega 2

| ID / prioridade | Tarefa a executar | Critério de conclusão / evidência |
|---|---|---|
| **E2-REP-01 / P0** | Consolidar e testar bootstrap completo em banco vazio, migrações, primeiro master, dados sintéticos e função de entrega | Segundo ambiente vazio reproduz o fluxo a partir do guia; ordem dos arquivos, versões e resultados registrados; nenhum objeto depende do banco antigo |
| **E2-APP-01 / P0** | Homologar consumidor → unidade → aceite → pedido → estoque → histórico → indicadores | Capturas e roteiro com entrada/esperado/obtido; UUIDs sintéticos permitem rastrear um ciclo completo na mesma versão |
| **E2-SEG-01 / P0** | Operar duas sessões reais de teste com consumidor, administrador, gerente e empresa/unidade distintas | Acesso alheio negado; confirmação simultânea sem venda/baixa duplicada; resultado registrado por papel e ação |
| **E2-RES-01 / P0** | Conciliar totais, frete, cancelamento, baixa e reposição no fluxo conectado | Quantidades e valores antes/depois conferidos; indicadores utilizam mesmo recorte; limites de custo histórico explicados |
| **E2-ENT-01 / P1** | Confirmar origens geográficas das lojas e comparar trajetos reais de entrega | Pontos reais confirmados, distância/tarifa/taxa reproduzíveis; falha de cobertura documentada sem cobrança fictícia |
| **E2-AUT-01 / P0** | Atualizar contribuições efetivas individuais da Entrega 2 | Atividade → integrante → artefato/commit/registro real; explicação coerente com histórico e domínio na apresentação |
| **E2-REF-01 / P0** | Conferir referências usadas e bibliografias das três disciplinas | Obras e fontes efetivamente consultadas, citadas no texto e identificadas; materiais da Entrega 1 revisados, sem datas de acesso inventadas |
| **E2-ACA-01 / P0** | Finalizar o trabalho nas 11 seções e exportar `trabalho-escrito.pdf` | Identificação, resumo, escopo, método, evolução, disciplinas, algoritmo, matemática, testes, conclusão e referências completos; páginas legíveis e links corretos |
| **E2-APR-01 / P0** | Produzir `apresentacao.pdf`, com 8–12 páginas de conteúdo | Problema, solução, disciplinas, arquitetura, demonstração, algoritmo, matemática, testes, limites e conclusão; identificação e referências |
| **E2-EXP-01 / P0** | Exportar diagramas/cálculos/casos citados e organizar anexos | Todo anexo citado existe e abre; diagramas legíveis; nomes e números correspondem aos PDFs |
| **E2-ENS-01 / P0** | Ensaiar exposição de até 15 minutos | Ambos os integrantes explicam fluxo, código, matemática, resultados e limites; tempo medido e roteiro de contingência |
| **E2-SIG-01 / P0** | Revisar sigilo no código, histórico, logs, imagens e pacote | Sem credenciais nem dados pessoais reais nos artefatos; ocorrências corrigidas e credenciais expostas, se encontradas, revogadas |
| **E2-VER-01 / P0** | Congelar versão e executar verificações finais | Commit anotado; testes/build/auditoria passam; PDFs e demonstração descrevem esse código; README executável conforme ambiente adotado |
| **E2-GIT-01 / P0** | Criar tag ou release `entrega-2-2026-2` | Marca aponta para commit final conferido; URL acessível ao docente e aos avaliadores |
| **E2-PAC-01 / P0** | Gerar ZIP final no padrão exigido | Dois PDFs e `anexos/` na raiz; até 100 MB; extração testada em outra pasta; fontes de código permanecem no GitHub |
| **E2-ENV-01 / P0** | Conferir e enviar pelo formulário oficial | Título atual, URL completa testada fora da conta, ZIP correto e confirmação real de envio antes do prazo |

P0: necessário ao fechamento acadêmico. P1: fechar o cenário de entrega utilizado na demonstração; cobertura não homologada deve constar como limite do escopo. Não declarar E2-REP-01 concluída com base no fixture PGlite.

### Continuidade do produto, com impacto condicional na demonstração

- [ ] **E2-EXT-01:** publicar origem HTTPS, configurar retorno Auth e origens da função, e verificar confirmação de e-mail quando a demonstração/acesso for externo.
- [ ] **PROD-EXA:** concluir pesquisa aprofundada de concorrentes quando Exa estiver conectado. Não é requisito explícito do enunciado da Entrega 2.
- [ ] **PROD-EVOL:** convites de equipe, tema completo, cupons, integrações comerciais, pagamentos online e módulos fiscais/financeiros seguem o roadmap; não são condições automáticas para a entrega acadêmica.
- [ ] Registrar decisões de escopo: concluir uma melhoria, ou descrevê-la como limite/evolução, sem apresentá-la como funcionalidade pronta.

## 5. Rubrica e localização das evidências

| Critério | Pontos | Evidências e fechamento |
|---|---:|---|
| Funcionamento e aderência ao escopo | 1.600 | Guia; fluxo integrado; E2-APP-01, E2-REP-01 e E2-RES-01 |
| Linguagem e qualidade da implementação | 1.000 | Matriz; módulos JavaScript; funções SQL; trechos interpretados |
| Algoritmos e programação estruturada | 1.000 | Fluxo; validação/repetição; explicação do envio e aceite |
| Matemática implementada e validada | 1.000 | Memória de cálculo; testes; variáveis, unidades e interpretação |
| GitHub, README, acesso, histórico e reprodução | 900 | README; CI; bootstrap; contribuições; tag final e acesso público |
| Trabalho escrito, rastreabilidade e referências | 900 | Texto de 11 seções; anexos; E2-REF-01 e E2-ACA-01 |
| Apresentação e domínio | 600 | PDF; demonstração; E2-APR-01 e E2-ENS-01 |
| **Total** | **7.000** | Pontuação de critérios; não é estimativa de nota obtida |

## 6. Estrutura do trabalho escrito

O [texto-base](TRABALHO_ESCRITO.md) segue exatamente: (1) identificação e resumo; (2) introdução; (3) objetivos e escopo final; (4) histórico; (5) método; (6) integração disciplinar; (7) algoritmos e implementação; (8) matemática; (9) testes e resultados; (10) conclusão; (11) referências.

Antes da exportação, completar as evidências pendentes; atualizar número de testes, commit, figuras e resultados se o código mudar; inserir bibliografias efetivamente usadas e revisão dos integrantes. Este arquivo Markdown não é o PDF final.

## 7. Roteiro da apresentação

Proposta: capa identificada, **10 páginas de conteúdo** e referências. Até 12 páginas no total; exposição-alvo de 14 minutos.

| Página de conteúdo | Conteúdo e demonstração | Tempo sugerido |
|---|---|---:|
| 1 | Problema de operação fragmentada e público interessado | 1 min |
| 2 | Convívium como plataforma; Brasa Burger como caso; objetivo e escopo entregue | 1 min |
| 3 | Linha de base da Entrega 1 e incrementos verificáveis de 2026/2 | 1 min |
| 4 | Arquitetura React → Auth/PostgREST/RPC → PostgreSQL; função de frete | 1 min |
| 5 | Demonstração: consumidor monta e envia; unidade recebe e aceita | 3 min |
| 6 | Algoritmo: validação, condição, repetição, transação e idempotência | 1,5 min |
| 7 | Matemática: total, frete, arredondamento e CMV com unidades e exemplo | 1,5 min |
| 8 | Evidências das três disciplinas, com função e teste localizáveis | 1 min |
| 9 | Resultados de teste, acesso por unidade e limites remanescentes | 1 min |
| 10 | Conclusão, aprendizado e evolução; contribuições individuais verificáveis | 1 min |

Ensaiar também a navegação e preparar capturas atuais como contingência de rede, identificadas como capturas, sem substituir o relato verdadeiro do funcionamento.

## 8. Anexos e empacotamento

Fontes atuais:

- [Matriz disciplinar](anexos/MATRIZ_DISCIPLINAR.md).
- [Memória de cálculo](anexos/MEMORIA_CALCULO.md).
- [Casos e resultados](anexos/CASOS_E_RESULTADOS.md).
- [Arquitetura, fluxo e recorte de dados](anexos/ARQUITETURA_E_FLUXO.md).

Estrutura exigida após exportar/conferir os arquivos:

```text
PI-2026-2-CONVIVIUM-MANAGEMENT-SYSTEM-ENTREGA-2.zip
├── trabalho-escrito.pdf
├── apresentacao.pdf
└── anexos/
    ├── matriz-disciplinar.*
    ├── memoria-de-calculo.*
    ├── casos-e-resultados.*
    ├── diagramas/
    └── evidencias/
```

Os asteriscos indicam formatos a escolher na exportação, não arquivos já existentes. Usar referências ao GitHub na versão final para localizar código; links relativos aos fontes não podem depender de código ausente do ZIP. Evitar incluir dependências, builds, `.env`, dados operacionais e cópias desnecessárias do código.

## 9. Sequência de fechamento

1. E2-REP-01: tornar a instalação comprovadamente reproduzível.
2. E2-APP-01, E2-SEG-01, E2-RES-01 e E2-ENT-01: executar demonstração e homologações necessárias.
3. E2-AUT-01 e E2-REF-01: consolidar autoria, referências e evidências.
4. E2-ACA-01, E2-APR-01 e E2-EXP-01: finalizar PDFs e anexos.
5. E2-ENS-01, E2-SIG-01 e E2-VER-01: ensaiar, conferir sigilo e validar versão.
6. E2-GIT-01, E2-PAC-01 e E2-ENV-01: marcar versão, testar ZIP e submeter.

Planejar margem para correções antes de 27/11. Marcar cada item como concluído somente com evidência localizável.
