# Convívium — execução e demonstração da Entrega 2

Revisão: 29/10/2026. Versão funcional de referência: `6c83548`. Veja os [critérios de fechamento](docs/entrega-02/README.md).

## 1. Caminhos de reprodução

| Caminho | Requisitos | Evidência |
|---|---|---|
| Testes e build isolados | Git, Node.js 24, npm e lockfile | Testes locais e testes/build/auditoria do CI aprovados na versão de referência |
| Interface com backend preparado | Frontend e Supabase com schema, regras e dados compatíveis | Uso registrado em `VALIDACAO.md`; depende do backend preparado |
| Backend vazio | Bootstrap, migrações, Auth, primeiro master, função e dados sintéticos | Instalador integral validado em banco vazio |

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

Use Node.js 24, conforme `.github/workflows/validacao.yml`. Guarde o commit na evidência. A tag original `entrega-2-2026-2` permanece histórica. A revisão para aula usa `entrega-2-2026-2-revisao-1`.

## 3. Testes e compilação

No diretório `frontend/`:

```powershell
npm test
npm run build
```

A revisão de referência tem 117 testes aprovados, incluindo 36 em PostgreSQL via PGlite em memória. Não exigem `.env`, Supabase remoto ou chave de rotas. O build gera `frontend/dist/`; não configura o backend.

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
- **Master existente:** cadastra empresas e seleciona contexto. O primeiro master é provisionado pelo dono do banco, conforme a seção 6.

A instrução antiga de cadastro automático como Visualização foi substituída pelo provisionamento explícito. Cadastro público nunca concede perfil ERP.

## 6. Instalação integral em Supabase novo

A sequência foi verificada em bancos vazios PGlite, PostgreSQL nativo e stack Supabase local real. Use um projeto novo ou uma stack local descartável. O instalador recusa tabelas ERP já existentes e não serve para atualizar o banco operacional.

1. Crie um projeto Supabase novo, ou inicie uma stack Supabase local com Docker e CLI. Auth e os papéis `anon`, `authenticated` e `service_role` devem existir antes da instalação.
2. No SQL Editor como dono do banco, execute `sql/instalacao/convivium-completo.sql` integralmente. Ele reúne 22 fontes na ordem de dependência registrada em `frontend/scripts/bootstrap.mjs`.
3. Para demonstração em banco novo, execute `sql/instalacao/dados_demonstracao.sql`. A carga possui três unidades demonstrativas, um produto de R$ 27,90, ficha e saldo 100 por unidade. Não inclui endereços físicos, coordenadas, senhas ou contas Auth. A reaplicação é recusada para evitar mistura de dados.
4. Crie a conta inicial pelo Auth do projeto novo, com e-mail que você controla. Confirme o e-mail conforme a política do ambiente.
5. Somente no SQL Editor como dono do banco, substitua o e-mail no comando abaixo pelo da conta criada:

```sql
SELECT erp_privado.provisionar_primeiro_master('seu-email@example.com');
```

A função exige a conta Auth existente e recusa execução quando já há master. Não é uma RPC pública e não concede privilégio pelo cadastro do consumidor.

6. Configure `frontend/.env` com URL e chave pública desse projeto novo. Execute `npm run dev` em `frontend/` e entre com a conta master. Em `/administracao`, confira empresa, unidades e perfis. A equipe precisa ter conta Auth existente para receber vínculo.
7. Para demonstrar o fluxo sem provedor de rotas, escolha retirada/presencial na unidade demonstrativa Japy. Crie uma conta de consumidor separada no portal. Envie dois produtos, aceite na fila, confira total 55,80 e saldo 98. Cancelar com devolução deve retornar o saldo a 100. Nunca execute esse roteiro sintético no ambiente operacional compartilhado sem autorização própria.
8. Para delivery, configure a função e as origens reais conforme a seção 7. O seed não inventa coordenadas para lojas reais.

O instalador foi gerado de fontes versionadas. Para regenerá-lo após alterações autorizadas, execute na raiz `node frontend/scripts/gerar-instalacao.mjs` e revise o diff. `sql/instalacao/base.sql` preserva a base de instalação versionada; alterações locais não publicadas em `sql/schema.sql` não compõem essa sequência.

### Reprodução automatizada

O workflow `.github/workflows/validacao.yml` executa três jobs: testes/build/auditoria, PostgreSQL 17 e Supabase local com CLI 2.117.0. O último usa Auth, PostgREST e sessões reais e exporta `resultado-api-local.json`. As contas e senhas sintéticas existem somente na stack descartável do runner.

Com PostgreSQL local disponível, pode-se executar `npm run verify:postgres` em `frontend/`, definindo `POSTGRES_TEST_URL` para uma instância local de teste. O usuário precisa poder criar e remover bancos. O script recusa host remoto, cria dois bancos com nomes aleatórios e remove somente os bancos que criou. O contrato Auth deste ensaio é mínimo de teste; o job Supabase valida os serviços reais separadamente.

As evidências sanitizadas ficam em `docs/entrega-02/anexos/resultado-postgres.json` e `resultado-api-local.json`. Scripts Python legados e o estudo MySQL não são necessários para instalar o ERP.

## 7. Delivery e acesso externo

Consulte `MVP_GRATUITO_SETUP.md` e `CONVIVIUM_EXECUCAO.md`. A função exige `ORS_API_KEY` somente no servidor, `ALLOWED_ORIGINS` com origens exatas, publicação da função, migrações compatíveis e origem/tarifa válidas por loja. Quando necessário, confirmar o ponto real do imóvel.

Configurar as URLs de retorno Auth, incluindo `/pedir/**`. O frontend está publicado em https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/ com fallback para rotas diretas. O cadastro CPF usa identificador interno e senha no Auth, sem envio de e-mail. Os arquivos `_redirects` e `_headers` preparados não comprovam publicação. A execução local e a publicação HTTPS estão disponíveis. Configure origens adicionais das funções ao adotar outro domínio.

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

Concorrência real e ciclo de pedido/cancelamento passaram por SQL e API em ambiente isolado. A revisão de interface cobriu catálogo e carrinho. O ciclo escrito integral pela interface, rotas físicas e e-mail externo ainda precisam de homologação própria.

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

## Cadastro CPF e aula ao vivo

Consulte docs/entrega-02/REVISAO_AULA.md. Em instalação nova, o instalador inclui cadastro privado, limites e publicação Realtime. Publique as funções `acesso-cliente` e `calcular-entrega`, com `ALLOWED_ORIGINS` do frontend. A chave de servidor existe somente nas funções. Não coloque chave privilegiada no Vite ou GitHub. Para reproduzir a publicação, configure as duas variáveis públicas documentadas em frontend/.env.example no repositório GitHub e habilite Pages por workflow.
