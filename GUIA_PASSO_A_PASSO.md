# Brasa Burguer — Guia passo a passo

Este guia prepara um ambiente local de desenvolvimento a partir do projeto completo. O ZIP de documentação contém somente os três arquivos Markdown: coloque-os na raiz da pasta que já contém `frontend/`, `sql/`, `python/` e `mysql/`.

**Já tem o sistema funcionando?** Substituir estes documentos não exige recriar o Supabase, executar migrações ou repetir seeds. As etapas de banco abaixo são para preparar um ambiente novo de desenvolvimento. Seeds podem duplicar dados se não forem idempotentes.

## 1. Conferir os arquivos e ferramentas

Abra o terminal na raiz do projeto extraído. Confirme que existe `frontend/package.json` e que as pastas de SQL e Python estão presentes.

Instale Node.js em versão compatível com o projeto e Python 3. Use os requisitos reais de `package.json`, eventual arquivo de versão do Node e dependências Python. Não atualize a versão do Vite apenas para seguir um tutorial.

```bash
node --version
npm --version
python --version
```

Em macOS/Linux, o comando Python pode ser `python3`. Node.js executa as ferramentas do Vite; a interface React executa no navegador. Veja a [documentação do Vite](https://vite.dev/guide/) para requisitos da ferramenta, lembrando que a documentação atual pode corresponder a outra versão.

## 2. Preparar um Supabase de desenvolvimento

Crie ou selecione um projeto no Supabase, preferencialmente separado de dados reais. Guarde a senha do banco em local seguro. A disponibilidade e os limites do plano devem ser conferidos na conta utilizada.

No SQL Editor, a ordem inicial descrita no material original é:

1. `sql/schema.sql`.
2. `sql/migration_fase1.sql`.
3. `sql/migration_fase1b_cardapio.sql`.

Execute cada arquivo somente após conferir suas instruções e dependências. Pare no primeiro erro e registre a mensagem completa. Não repita indiscriminadamente scripts parcialmente executados.

O README também cita:

| Script | Tratamento |
|---|---|
| `sql/migration_fase1c_rls_geral.sql` | Revisar as permissões antes de aplicar; o nome não garante isolamento por loja |
| `sql/update_marca_unidades.sql` | Conferir dependências e existência das lojas antes de aplicar o rebranding |
| Outras migrações da pasta real | Identificar dependências e registrar sua ordem |

Os três scripts iniciais não são uma instalação completa comprovada da versão atual. Histórico, canais, estoque e dashboard atualizado podem depender de migrações posteriores. Não inventar uma ordem para arquivos cujo conteúdo ainda não foi conferido.

## 3. Configurar acesso e criar o usuário

No painel Supabase, obtenha a URL do projeto e as chaves compatíveis com a configuração existente.

- O frontend documentado usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Os seeds documentados usam `SUPABASE_URL` e `SUPABASE_KEY`, com chave privilegiada `service_role` no fluxo original.
- Nunca coloque `service_role` ou outra chave secreta em variáveis `VITE_`, no navegador ou no repositório.

O Supabase também oferece chaves publishable/secret. Não troque os tipos sem conferir a compatibilidade dos scripts e bibliotecas. Consulte [API keys — Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

Em Authentication → Users, crie um usuário de desenvolvimento. Conforme o material do projeto, um trigger cria o registro correspondente em `usuarios` com perfil Visualização. Confira se ele existe. Se não existir, investigue as migrações e o trigger antes de continuar.

Para o administrador do ambiente de desenvolvimento, localize o ID do perfil Administrador em `perfis` e atribua-o ao campo `perfil_id` do usuário pela administração do banco. Use outro usuário com perfil restrito nos testes de autorização; conseguir entrar como administrador não valida o RBAC completo.

## 4. Instalar dependências e executar seeds

Use um ambiente virtual a partir da raiz do projeto:

```bash
python -m venv .venv
```

Ative-o conforme o sistema:

```powershell
# Windows / PowerShell
.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Se houver arquivo de dependências Python no projeto, instale-o pelo caminho real. Na ausência dele, o guia original informa a dependência `supabase`:

```bash
python -m pip install supabase
```

Essa instalação mínima não foi verificada com os scripts atuais. Registre versões compatíveis após validar o ambiente.

Configure as variáveis apenas no terminal local. Os valores abaixo são fictícios:

```powershell
# Windows / PowerShell
$env:SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:SUPABASE_KEY="SUA-CHAVE-PRIVILEGIADA"
```

```bash
# macOS / Linux
export SUPABASE_URL="https://SEU-PROJETO.supabase.co"
export SUPABASE_KEY="SUA-CHAVE-PRIVILEGIADA"
```

Em um banco novo e com os pré-requisitos atendidos, execute na raiz:

```bash
python python/seed_data.py
python python/seed_cardapio.py
```

Confira os resultados no banco. Não use uma contagem fixa de produtos como prova de sucesso: o cardápio mudou entre versões. Não publique prints ou histórico do terminal com credenciais.

## 5. Configurar e iniciar a interface

Entre em `frontend/`:

```bash
cd frontend
```

Se ainda não houver `.env`, copie o exemplo. Preserve um `.env` já configurado.

```powershell
# Windows / PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Preencha conforme os nomes lidos pela aplicação:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

Instale e inicie:

```bash
npm install
npm run dev
```

Se houver `package-lock.json` válido e sincronizado, use `npm ci` no lugar de `npm install`. Abra a URL exibida pelo terminal, normalmente `http://localhost:5173`. Faça login no Brasa Burguer. Reinicie o servidor de desenvolvimento após alterar as variáveis de ambiente.

Para conferir scripts disponíveis, execute `npm run`. Se o projeto definir `build`, execute `npm run build` para verificar a compilação; isso não substitui testes funcionais.

## 6. Validar o ambiente

Registre os resultados observados, sem marcar como aprovado antes de executar:

| Verificação | Resultado esperado |
|---|---|
| Login e encerramento de sessão | Acesso autorizado e sessão encerrada corretamente |
| Unidade e período no Dashboard | Indicadores e gráficos refletem o mesmo recorte |
| Custo 8,90 e preço 27,90 | CMV 31,90%; margem R$ 19,00 e 68,10% |
| Período sem pedidos | Estado vazio ou indicador indisponível, sem erro de divisão |
| Cliente não encontrado | Cadastro e retorno ao pedido preservam contexto, se implementado |
| Histórico | Pedido gravado pode ser recuperado e seus detalhes conferidos |
| Pedido e estoque | Consumo coerente com ficha/unidade; reenvio sem baixa duplicada |
| Usuário restrito | Leitura e escrita respeitam perfil e unidade |
| Telas menores e teclado | Conteúdo legível e ações acessíveis |

Para cada teste, registrar commit/versão, data, entrada e resultado. Este guia não comprova que a instalação ou os testes foram executados.

## 7. Atualizar a documentação no projeto

1. Extraia o ZIP de documentação em uma pasta temporária.
2. Copie `README.md`, `GUIA_PASSO_A_PASSO.md` e `DESIGN_SYSTEM_STATUS.md` para a raiz do projeto, substituindo as versões antigas.
3. Confira os caminhos descritos contra os arquivos reais e complete a ordem das migrações.
4. Publique esses documentos junto com o código-fonte no repositório. O ZIP é para transporte; os Markdown devem ficar extraídos para leitura no GitHub.
5. Registre um commit descritivo, por exemplo: `docs: atualiza arquitetura, status e guia do Brasa Burguer`.

Antes de publicar, confira se o Git ignora `.env` e variantes locais, chaves, `.venv/`, `node_modules/`, arquivos de build e dados pessoais. Preserve exemplos fictícios, código-fonte e arquivos de dependências. Se um segredo já foi versionado, ignorar o arquivo depois não remove o histórico; revogue a credencial exposta.

O endereço real do repositório deve ser incluído no formulário acadêmico e no trabalho escrito após a publicação. O pacote acadêmico é outro ZIP, com os dois PDFs e `anexos/`.

## 8. Problemas comuns

| Sintoma | Conferência |
|---|---|
| Node/npm não reconhecido | Instalação, PATH e novo terminal |
| Variável Supabase ausente nos seeds | Variáveis definidas no mesmo terminal da execução |
| Tabela ou coluna inexistente | Migrações e versão do schema; não presumir que os três scripts bastam |
| Acesso negado no banco | Sessão, perfil, grants e políticas RLS; não liberar acesso geral como solução automática |
| Tela em branco | Console do navegador, dependências e variáveis da aplicação |
| Login falha | Usuário Auth, credenciais e configuração do projeto correto |
| Nome antigo ou lojas erradas | Seed e script de marca aplicados no ambiente correto |
| Dashboard diverge do histórico | Mesmos filtros, estados de pedido, descontos e fonte de custo |

Guarde a mensagem de erro completa, retirando credenciais e dados pessoais antes de compartilhá-la.
