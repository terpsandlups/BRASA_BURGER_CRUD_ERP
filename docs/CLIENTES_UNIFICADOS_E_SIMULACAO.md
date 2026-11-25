# Clientes ERP ↔ App e histórico para a apresentação

## Diagnóstico do banco e do código

Auditoria somente de leitura no projeto Supabase `aglrevynnumzokvwutok`, em 24/11/2026: **7 fichas comerciais**, **3 contas de consumidor**, **16 pedidos**. As três contas já tinham uma ficha no ERP naquele momento; o problema do fluxo continua reproduzível com uma conta nova, antes de aceitar seu primeiro pedido.

`public.clientes` é a ficha comercial, com chave composta **empresa + CPF**. `erp_privado.contas_consumidor` relaciona o usuário autenticado ao seu CPF. Essas estruturas têm funções diferentes; a segunda não precisa virar uma tabela pública para unificar a experiência.

**Antes da correção:**

- Cadastrar alguém no ERP não criava uma credencial no Supabase Auth. Portanto, uma ficha de ERP, sozinha, **não permitia entrar no App com CPF e senha**.
- O cadastro no App gravava apenas a identidade privada. A ficha comercial era criada quando a loja aceitava o primeiro pedido. Sem aceite, o novo consumidor não aparecia no ERP.
- A lista de clientes do ERP carregava ao abrir a tela e após salvar; não recebia atualização ao vivo. Não havia filtro por `origem` ocultando consumidores.
- As regras de acesso limitavam a leitura por empresa e permissão da equipe. Abrir essas regras aos consumidores permitiria consultar dados de terceiros e não resolveria a falta de credencial.

## Correção compatível

Migração: `supabase/migrations/20261125002912_unificar_clientes_erp_app.sql`.

- Novas contas do App criam a ficha comercial antes do primeiro pedido. O CPF permanece único por empresa; não há cópia de clientes em outro cadastro público.
- As chamadas do portal informam a empresa explicitamente. Atualizar um perfil em uma marca não reescreve a ficha comercial de outra.
- A tela Clientes recebe eventos e também se atualiza periodicamente. A busca aceita nome, CPF, telefone e e-mail normalizados. Contato repetido sinaliza possível duplicidade antes de criar outro CPF; contatos compartilhados por familiares não são fundidos automaticamente.
- O primeiro acesso oferece **“Cadastro incompleto — continue seu cadastro”**. O consumidor informa CPF e o e-mail já cadastrado na loja, confirma o e-mail e define sua senha. Quando o e-mail confirmado corresponde a **uma única ficha válida**, nome, CPF e telefone são reaproveitados.
- O CPF digitado não serve como prova de identidade. A interface de primeiro acesso não divulga se um CPF público pertence a um cliente nem mostra seus dados pessoais.
- E-mail ausente, compartilhado entre fichas, não confirmado ou CPF já associado a outra conta não causa transferência automática de identidade. A loja precisa conferir o cadastro. A confirmação de e-mail depende do serviço de envio configurado no Supabase; a entrega na caixa postal precisa de teste humano. O fluxo normal CPF + senha não depende desse envio.
- A ativação usa o e-mail confirmado pelo Auth, e não os metadados editáveis do usuário, para reconhecer uma ficha existente. A escolha da marca no cadastro não concede cargo, acesso de equipe ou permissão no ERP.
- As funções anteriores permanecem disponíveis durante a atualização. Os vínculos de identidade ficam no schema privado, com RLS, grants restritos e consultas limitadas ao titular autenticado.

**Resposta objetiva após a correção:** o cliente pré-cadastrado no ERP não precisa repetir sua ficha quando consegue confirmar o e-mail único dessa ficha. Precisa **ativar a credencial de acesso** uma vez. Depois utiliza CPF ou e-mail e senha. Quem se cadastra no App aparece no ERP sem esperar o primeiro pedido.

## Simulador Python

Arquivo: `scripts/simular_vendas_2026.py`. Dependências: `scripts/requirements-simulador.txt`.

Prévia por padrão, sem gravar dados. A opção `--aplicar` confirma a importação. Todos os registros são **sintéticos**, para validar relatórios; não representam receita real, clientes reais ou integração real com marketplaces.

Padrão aprovado: **9.000 vendas e 600 clientes novos**, de **01/01/2026 a 22/11/2026**, inclusivo. Japy recebe 40% do volume e predomínio presencial dentro da unidade; Retiro e Eloy recebem 30% cada. A unidade presencial é conferida pelo cadastro real.

O catálogo é lido do banco, com variações, preços e disponibilidade. Os preços e custos utilizados são os **atuais**, pois não existe uma série histórica de preços para reconstruir aquele período. A sazonalidade, as datas de maior movimento, as cestas e a distribuição ABC são hipóteses geradas pelo simulador, não conclusões sobre o comportamento real do restaurante.

Pedidos são concluídos (`entregue`), com pagamentos e canais válidos. O banco distingue canal (`proprio`, `ifood`, `rappi`) de atendimento (`presencial`, `delivery`). A saída mostra ambas as dimensões. O frete histórico é estimado sinteticamente e identificado na observação; não utiliza ou fabrica cotações oficiais de mapas.

Os clientes recebem nome `[SIM]`, e-mail em domínio reservado `.invalid`, telefone sem DDD válido e CPF com verificador deliberadamente inválido. Isso evita apresentar documentos e contatos de pessoas como se fossem clientes fictícios. Os CPFs continuam com 11 dígitos e respeitam a chave do banco; esses registros não são contas de autenticação e não podem ser usados para login. Nenhum e-mail ou SMS é enviado pela carga.

### Executar com conexão PostgreSQL

Python 3.10 ou superior. Usar uma conexão de manutenção autorizada; a conta normal do consumidor não possui permissão para essa carga.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r scripts/requirements-simulador.txt

# Defina DATABASE_URL no ambiente local usando a conexão privada do banco.
# Não coloque a senha no código, no frontend ou no GitHub.
$env:DATABASE_URL = 'postgresql://USUARIO:SENHA@HOST:5432/BANCO?sslmode=require'

# Apenas prévia
.\.venv\Scripts\python scripts/simular_vendas_2026.py --resumo .entrega-02-build/previa.json

# Carga aprovada, mesma execução e semente
.\.venv\Scripts\python scripts/simular_vendas_2026.py --aplicar --resumo .entrega-02-build/carga-confirmada.json
```

### Alternativa com Supabase CLI já autenticado

Não exige obter a chave `service_role` nem copiar a senha do banco. Usa `db query` do CLI oficial. Execute na raiz do repositório vinculado, com CLI compatível (validado em **2.117.0**).

```powershell
python scripts/simular_vendas_2026.py --supabase-cli supabase --project-ref aglrevynnumzokvwutok
python scripts/simular_vendas_2026.py --supabase-cli supabase --project-ref aglrevynnumzokvwutok --aplicar --resumo .entrega-02-build/carga-confirmada.json
```

Opções: `--vendas`, `--clientes`, `--inicio`, `--fim`, `--seed`, `--execucao`, `--marca`, `--lote` e `--resumo`. Alterar o volume exige uma nova execução identificada, pois a mesma execução com outro conteúdo é recusada. Para repetir a carga após uma resposta perdida, mantenha a execução, semente, datas, volume e catálogo originais; alterações no catálogo também mudam a assinatura do plano.

### Integridade e estoque

As inserções são preparadas em lotes e confirmadas em **uma transação**. UUIDs determinísticos identificam a execução; repetir o mesmo plano não duplica as vendas. Colisão com um cliente existente ou modificação de um registro dessa execução interrompe a carga, sem sobrescrever a operação.

O transporte usa arrays compactos e índices numéricos, reconstruídos em tabelas temporárias. Isso evita o limite de tamanho da API de manutenção, preservando a transação única. A extensão `uuid-ossp`, já exigida na instalação do ERP, reconstrói os mesmos UUIDs determinísticos; nenhum componente permanente é acrescentado ao banco pela carga.

As FKs, constraints e triggers continuam habilitadas. Como os triggers de itens baixam estoque mesmo em pedidos classificados como históricos, a importação bloqueia os saldos necessários em ordem, provisiona o consumo apenas dentro da transação e restaura **quantidades e datas originais antes do commit**. As fotografias de custo permanecem para os relatórios históricos. Os pedidos são marcados como históricos, sem estoque operacional rastreado, evitando tratá-los como vendas reais para estorno.

Os bloqueios podem fazer uma venda concorrente aguardar durante a importação; o limite de espera é curto e uma falha reverte a transação. A carga não deve coincidir com o envio coletivo da turma. Ficha sem estoque vinculado ou saldo negativo faz a carga falhar, em vez de inventar um saldo permanente. Não há desativação de triggers nem exclusão geral de dados.

### Validação

- Testes SQL: conta nova aparece antes do pedido, CPF não expõe nem altera pré-cadastro, e-mail confirmado reaproveita ficha única, contatos ambíguos não são unidos e empresas não se sobrescrevem.
- Testes com Supabase Auth/PostgREST local: ativação por token de e-mail, senha, login com CPF e sincronização para o ERP. O teste de token não comprova a entrega de e-mail na caixa postal pública.
- PostgreSQL isolado: 9.000 pedidos e 600 clientes; totais e FKs; estoque preservado; reexecução sem duplicidade; rollback integral de uma carga com FK inválida.
- Testes de geração: datas, distribuição das lojas, predominância presencial, ABC, cestas coerentes, picos de fim de semana, reprodutibilidade e valores em centavos.
- O workflow de CI executa os testes do App, o build, PostgreSQL nativo, o simulador e a stack Supabase isolada.

```powershell
python -m unittest discover -s scripts -p test_simulador.py -v
# A integração de banco só roda com o runner que cria e destrói um banco local.
$env:POSTGRES_TEST_URL = 'postgresql://USUARIO:SENHA@127.0.0.1:5432/postgres'
node frontend/scripts/verificar-simulador.mjs
```

Consultar o resultado confirmado da publicação e da carga em `docs/VALIDACAO_FINAL_CLIENTES_E_CARGA.md`. O roteiro de fala está em `docs/ROTEIRO_APRESENTACAO_20_MINUTOS.md`.

Referências: [Psycopg](https://www.psycopg.org/psycopg3/docs/basic/install.html), [Supabase passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
