# Entrega 2: Convívium Management System

Caso de aplicação: Brasa Burger. Revisão para aula de 11/11/2026. A versão acadêmica original de 04/11 permanece na tag `entrega-2-2026-2`. A Entrega 1 permanece como histórico. JavaScript foi aceito pelo docente, conforme confirmação do responsável em 29/10/2026.

## Pacote acadêmico

- Arquivo: `PI-2026-2-CONVIVIUM-MANAGEMENT-SYSTEM-ENTREGA-2-REVISAO-1.zip`.
- Raiz: `trabalho-escrito.pdf`, `apresentacao.pdf` e `anexos/`.
- Código público: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP.
- Referência: tag/release `entrega-2-2026-2-revisao-1`.
- Entrega institucional: https://forms.gle/8V9iZ6P7GL2mnmNSA.
- Prazo: 27/11/2026, horário institucional, na janela de 23 a 27/11. ZIP até 100 MB.
- Apresentação principal: 12 páginas totais, sendo capa, 10 de conteúdo e conclusão/referências. Roteiro de aproximadamente 13 minutos, sujeito ao ensaio dos integrantes.

## Oito blocos: realizado e próximo passo

| Bloco | Realizado e evidência | O que falta ou limite |
|---|---|---|
| 1. Aplicação | Plataforma Convívium separada da marca Brasa Burger; empresas, unidades, portal, pedidos e estoque. API integrada aprovada em stack isolada | Ciclo escrito integral pela interface ainda requer homologação em ambiente próprio |
| 2. Linguagem | JavaScript modular e SQL/PL/pgSQL explicados no trabalho e slides; aceite do docente registrado | Integrantes precisam dominar a explicação oral |
| 3. Algoritmos | Validação, repetição, transação, idempotência e pseudocódigo com localização no código | Ensaio oral dos exemplos |
| 4. Matemática | Frete, subtotal, markup, CMV, margem, cobertura e ticket com entradas/saídas e testes | Trajetos físicos precisam de comparação em campo |
| 5. Testes | 117 testes, 36 com PGlite; dois bancos PostgreSQL vazios e concorrência; Auth/API locais reais, aceite único, isolamento e cancelamento | 30 consumidores concorrentes aprovados em stack local; ensaio humano e rotas físicas pendentes |
| 6. GitHub e reprodução | Lockfile, instalador integral, seed sintético, primeiro master controlado, CI com três jobs e versão por tag | Credenciais do novo ambiente são configuradas pelo responsável; não acompanham o ZIP |
| 7. Trabalho escrito | PDF com as 11 seções exigidas, matriz, cálculo, casos e fontes; identificação recuperada da Entrega 1 | Conferência final do grupo e bibliografia institucional completa, se exigida pelo docente |
| 8. Apresentação e entrega | Apresentação acadêmica, complemento técnico, modelo de negócio, imagens, versão interativa HTTPS, PDFs, PPTX editáveis e ZIP | Ensaio de até 15 minutos e envio humano pelo formulário institucional |

## Evidências

Os testes de API usam a stack local descartável do runner, sem credenciais operacionais. O registro completo está em `anexos/resultado-api-local.json`. O ensaio nativo está em `anexos/resultado-postgres.json`. Capturas públicas mostram apenas catálogo e carrinho, sem envio. A escrita de dados sintéticos no Supabase compartilhado não foi executada.

CI de referência: https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/43116523681. Três jobs aprovados: testes/build/auditoria, PostgreSQL nativo e Supabase Auth/PostgREST isolado.

## Material e organização

- `TRABALHO_ESCRITO.md`: fonte das 11 seções do relatório.
- `anexos/`: matriz, cálculo, casos, arquitetura, evidências e resultados sanitizados.
- `SLIDES_CONTEUDO.json`: textos e notas das três apresentações.
- `MODELO_DE_NEGOCIO.md`: proposta comercial e limites.
- `ROTEIRO_APRESENTACAO.md`: sequência e duração para ensaio.
- `../../Slides/Entrega-2/`: três PowerPoints atualizados. Os dois originais permanecem preservados em `Slides/`.
- `../../output/pdf/`: cinco PDFs finais.
- `../../GUIA_PASSO_A_PASSO.md`: instalação e reprodução.

## Limites de produto

Pagamento presencial, marketplaces manuais, personalização de nome/logo/destaque e conta Auth previamente existente para vínculo de equipe. Convites, tema integral, financeiro/fiscal, gateways e integrações comerciais são evoluções. A pesquisa aprofundada de concorrentes depende de Search/Exa e não foi usada para fabricar conclusões comerciais.

O modelo de assinatura é proposta a validar. Não há alegação de faturamento, contratos, ganho de produtividade medido ou tração comercial.

## Acesso público da revisão

Portal: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/pedir/brasa-burger . Equipe: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/solicitacoes . Apresentação: https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/apresentacao/ . Consulte REVISAO_AULA.md para o roteiro e os limites do ensaio.
