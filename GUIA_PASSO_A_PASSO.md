# Convívium — execução e demonstração da Entrega 2

Revisão: 29/10/2026. Versão funcional de referência: `6c83548`. Veja os [critérios de fechamento](docs/entrega-02/README.md).

## 1. Caminhos de reprodução

| Caminho | Requisitos | Evidência |
|---|---|---|
| Testes e build isolados | Git, Node.js 24, npm e lockfile | Testes locais e testes/build/auditoria do CI aprovados na versão de referência |
| Interface com backend preparado | Frontend e Supabase com schema, regras e dados compatíveis | Uso registrado em `VALIDACAO.md`; depende do backend preparado |
| Backend vazio | Bootstrap, migrações, Auth, primeiro master, função e dados sintéticos | **Homologação pendente E2-REP-01** |

A fixture dos testes não é uma instalação integral a partir de `sql/schema.sql`.

## 2. Obter a versão e instalar

```powershell
git clone https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP.git
cd BRASA_BURGER_CRUD_ERP
git rev-parse HEAD
cd frontend
node --version
npm --version
npm ci
```

Use Node.js 24, conforme `.github/workflows/validacao.yml`. Guarde o commit na evidência. A tag final `entrega-2-2026-2` será criada após o fechamento.

## 3. Testes e compilação

No diretório `frontend/`:

```powershell
npm test
npm run build
```

A revisão de referência tem 100 testes aprovados, incluindo 32 em PostgreSQL via PGlite em memória. Não exigem `.env`, Supabase remoto ou chave de rotas. O build gera `frontend/dist/`; não configura o backend.

A auditoria do CI pode ser reproduzida com acesso à rede:

```powershell
npm audit --audit-level=high
```

Registre data, ambiente, comando e resultado conforme os [casos de teste](docs/entrega-02/anexos/CASOS_E_RESULTADOS.md).

## 4. Interface com backend preparado

Copie o exemplo somente se ainda não houver `.env`:

```powershell
Copy-Item .env.example .env
```

Preencha localmente:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

Não use chave privilegiada em variáveis `VITE_`. Preserve configurações existentes.

```powershell
npm run dev
```

Abra a URL exibida pelo Vite. Outro Vite pode usar o mesmo banco: iniciar o frontend não cria um backend separado.

## 5. Contas e permissões atuais

- **Consumidor:** usa `/pedir/brasa-burger`. Cadastro público Auth não cria colaborador em `usuarios`.
- **Equipe:** exige conta Auth e registro ativo em `usuarios`, com empresa, perfil e unidade compatíveis.
- **Administrador:** em `/administracao`, vincula por e-mail uma conta Auth já existente ao perfil e à unidade permitidos.
- **Gerente:** opera apenas na unidade vinculada, conforme validação no servidor.
- **Master existente:** cadastra empresas e seleciona contexto. O provisionamento do primeiro master em banco vazio integra E2-REP-01.

A instrução antiga de cadastro automático como Visualização foi substituída pelo provisionamento explícito. Cadastro público nunca concede perfil ERP.

## 6. Instalação integral em banco vazio — E2-REP-01

Ainda não há uma sequência integral homologada. Para fechar essa exigência:

1. Preparar Supabase descartável, separado de dados operacionais.
2. Conferir o bootstrap legado e registrar a ordem efetivamente testada dos SQLs.
3. Incluir funções, views, triggers, grants, RLS e migrações de portal/empresas sem depender de objetos exclusivos do ambiente existente.
4. Documentar e testar a criação da primeira conta Auth e seu vínculo como master.
5. Preparar dados sintéticos mínimos de empresa, unidades, catálogo, ficha, estoque e contas de teste.
6. Configurar Auth e função de entrega; executar o fluxo integrado.
7. Repetir em outro banco vazio e guardar comandos, versões e resultados.

Inventário a conciliar, **não uma ordem certificada de execução**:

| Grupo | Fontes |
|---|---|
| Base e perfis | `sql/schema.sql`, `sql/migration_fase1.sql` |
| Catálogo e endereço | `sql/migration_fase1b_cardapio.sql`, `sql/migration_fase1d_endereco_cliente.sql`, `sql/migration_cadastro_insumos.sql` |
| Estoque e análises | `sql/migration_fase2_estoque.sql`, `sql/migration_fase4_5_fundacao_analitica.sql` |
| Pedido e entrega | `sql/migration_pedido_transacional.sql`, `sql/migration_configuracao_entrega.sql`, `sql/migration_consulta_rotas.sql` |
| Evolução | Arquivos existentes em `supabase/migrations/`, ordenados por dependência |
| Edição de catálogo/ficha | `sql/edicao_fichas_vigente.sql`, antes de `20261025004910_empresas_acesso_frete_cliente.sql` |
| Marca e unidades | `sql/update_marca_unidades.sql`, conferindo dependências e dados |

Não existe arquivo versionado `sql/migration_fase1c_rls_geral.sql`. O arquivo local `sql/migration_edicao_fichas.sql` não é fonte da versão publicada; use como referência versionada `sql/edicao_fichas_vigente.sql`.

Os scripts Python de seed citam marca anterior e estado prévio; precisam ser adaptados e testados para a estrutura atual de empresas antes de compor a carga oficial. O MySQL é um estudo separado e não instala a aplicação Supabase.

## 7. Delivery e acesso externo

Consulte `MVP_GRATUITO_SETUP.md` e `CONVIVIUM_EXECUCAO.md`. A função exige `ORS_API_KEY` somente no servidor, `ALLOWED_ORIGINS` com origens exatas, publicação da função, migrações compatíveis e origem/tarifa válidas por loja. Quando necessário, confirmar o ponto real do imóvel.

Configurar as URLs de retorno Auth, incluindo `/pedir/**`. Para acesso externo, publicar frontend HTTPS e conferir fallback SPA e e-mail de confirmação. Os arquivos `_redirects` e `_headers` preparados não comprovam publicação. Execução local reproduzível atende ao ambiente adotado para demonstração; acesso externo depende de hospedagem.

## 8. Demonstração integrada

Em ambiente de teste com dados sintéticos e commit registrado:

1. Mostrar empresa/unidades como administrador e gerente restrito em outra sessão.
2. No portal, escolher unidade, montar carrinho e demonstrar validação de entrada inválida.
3. Cotar delivery ou explicar a indisponibilidade de cobertura e confirmar o imóvel. Conferir itens + frete = total.
4. Enviar solicitação e conferir a fila da unidade correta.
5. Aceitar como equipe, conferir venda/estoque e repetir a confirmação para verificar ausência de duplicação.
6. Avançar status e consultar histórico e indicadores com os mesmos filtros.
7. Mostrar cálculo e teste correspondente; explicar cancelados e cobertura de custo.
8. Demonstrar cancelamento/estorno e bloqueio de outra empresa/unidade.

Escrita pela interface e concorrência real ainda dependem de E2-APP-01/E2-SEG-01. Este roteiro descreve a execução necessária, não declara esses cenários homologados.

## 9. Falhas e evidências

| Sintoma | Conferência |
|---|---|
| Variáveis ausentes | `.env`, nomes corretos e reinício do Vite |
| Auth funciona, ERP não abre | Registro ativo em `usuarios`, empresa, perfil e unidade; consumidor usa portal |
| Tabela/função ausente | Versão e bootstrap do backend |
| Acesso recusado | Empresa/unidade, perfil e RLS; registrar erro sem liberar acesso geral |
| Endereço não localizado | Cobertura e confirmação do imóvel; falha não gera taxa zero |
| Resposta de pedido incerta | Recuperar a mesma requisição e conferir pedido/estoque antes de iniciar outra venda |

Registrar caso, ambiente, entrada, esperado, obtido, interpretação e versão. Retirar senhas, tokens e dados pessoais reais de logs, capturas e anexos.
