# Convívium Management System — execução de 24/10/2026

Esta revisão acompanha os oito pedidos de evolução. Código implementado, migração aplicada e testes executados são evidências diferentes de homologação operacional completa.

| Pedido | Entrega nesta revisão | Limite verificável |
|---|---|---|
| 1. Atualizar GitHub e reler o projeto | Fontes das melhorias revisadas, 100 testes e build; definições válidas de edição já versionadas; estudo pessoal e ZIPs preservados e ignorados no Git | Alterações locais preexistentes de `sql/schema.sql` e o arquivo local `sql/migration_edicao_fichas.sql` permanecem fora do commit. Configurações e dados comerciais continuam no Supabase |
| 2. Pedidos pelo celular | Portal por marca `/pedir/:marca`, conta do consumidor, unidade, carrinho, adicionais, cotação automática por endereço, total antes do envio, fila na unidade e acompanhamento. Frete reservado acompanha o aceite sem nova negociação | Cobertura do geocodificador pode exigir confirmação do imóvel no mapa. Hospedagem HTTPS e entrega de e-mail do domínio devem ser configuradas quando houver domínio publicado |
| 3. Plataforma e identidade da operação | `/administracao`: master cadastra empresas; administrador personaliza nome/logo/cor, cadastra unidades e vincula equipe; administrador da marca acessa suas unidades e gerente apenas a unidade atribuída. Brasa Burger na operação e Convívium no rodapé | Equipe utiliza contas Auth já cadastradas. Não há disparo de convites por e-mail nem personalização completa de todos os tokens de tema |
| 4. Segurança | Novo cadastro não cria colaborador; RLS por titular/unidade, escrita por RPC, preços verificados, limites de envio, idempotência, aceite e baixa atômicos; auxiliares legadas sem execução anônima e com `search_path` fixo | Proteção de senha vazada desativada na conta; funções autenticadas privilegiadas permanecem deliberadamente guardadas por permissões |
| 5. Revisão profissional | Mensagens de instalação removidas das telas, textos de frete reduzidos, informações operacionais preservadas, estado de indisponibilidade do portal e página Canais de venda | ERP permanece piloto; não inclui contabilidade fiscal, emissão de notas ou fechamento financeiro completo |
| 6. Pesquisa de concorrentes | Escopo e critérios registrados abaixo; nenhuma conclusão de mercado inventada | Pendente: ferramentas Exa indisponíveis. A busca de plugins também retornou indisponibilidade nesta sessão |
| 7. Plataforma própria e futuras APIs | Origem própria mantida no servidor; página Canais de venda; contrato e arquitetura futura em `INTEGRACOES_FUTURAS.md` | Nenhuma conexão automática iFood/Goomer/Rappi é anunciada como ativa |
| 8. Frete | Regressão do ORS e banco, preço adulterado, cotação vencida/usada, outro cliente/unidade e endereço divergente; aceitação integra frete ao total | Comparação de trajetos reais de carro/moto e testes operacionais com duas sessões reais continuam necessários |

## Operação do portal

1. Compartilhar a rota `/pedir/brasa-burger` do frontend publicado (ou `/pedir/SLUG` de outra empresa). `/pedir` mantém compatibilidade com a Brasa Burger. Um endereço `127.0.0.1` funciona apenas no mesmo computador.
2. Cliente escolhe unidade, modalidade, produtos e adicionais; cria uma conta ou entra com e-mail e senha.
3. Na entrega, o preenchimento de endereço completo inicia a cotação após uma pausa na digitação. O cliente vê itens, frete e total antes de enviar nome, CPF e telefone. Se a base não identificar o imóvel, o mapa permite confirmar o ponto exato. Não há cobrança online.
4. O servidor confere preços, titular, unidade, endereço e validade da cotação. O pedido fica aguardando, vincula a reserva de frete e ainda não altera receita ou estoque. Troca de unidade/endereço invalida a cotação; quantidade altera apenas o subtotal. Cotação vence em 15 minutos e é recalculada enquanto o carrinho está aberto.
5. Equipe abre **Pedidos do celular** e aceita ou recusa. Aceite cria a venda pelo fluxo transacional, usando canal `proprio`, frete já reservado e baixa de estoque. O valor reservado é preservado durante a espera na fila. Falha reverte a venda e conserva a solicitação aguardando. Pedidos antigos sem reserva continuam com cálculo pelo operador.
6. Cliente acompanha apenas solicitações de sua conta, incluindo etapa operacional e total confirmado. O CPF informado não vincula vendas históricas nem permite consultar cadastro de outras pessoas.
7. Cliente pode cancelar enquanto aguarda. Recusa da equipe exige motivo. Aceite repetido retorna a mesma venda.

Limites: 5 solicitações por conta em 15 minutos e 10 aguardando por conta; até 50 linhas, 99 unidades por linha e 20 adicionais por linha. Cotação móvel: 3 consultas/minuto e 30/dia por usuário, compartilhando o teto global de 500/dia. Não há reserva de estoque antes do aceite. Catálogo e CRM são compartilhados pelas unidades da mesma empresa; dados de empresas diferentes são isolados. A disponibilidade final depende do estoque da unidade.

## Administração e separação das empresas

- A conta administrativa existente foi reconhecida como master; nenhum cadastro público recebe esse privilégio. O master seleciona a empresa antes de operar seus dados.
- Administrador da marca pertence a uma empresa e tem `loja_id` nulo; gerente/operador/estoque/leitura recebem uma unidade. Vínculo por e-mail só aceita conta Auth existente e não transfere conta de outra empresa nem modifica o master.
- Empresas têm nome, slug, cor e logo HTTPS. Lojas, catálogo, ingredientes, adicionais, clientes, vendas e cotações receberam vínculo de empresa. Clientes usam chave composta empresa/CPF. As regras de banco também impedem relacionar fichas, itens, adicionais ou estoque de empresas diferentes.
- A remoção local anterior de `historico_estoque` do bootstrap foi revisada, mas permanece fora do commit das melhorias. A tabela não era consumida pela aplicação. O estoque operacional é registrado pelas estruturas de consumo, cancelamento e reposição já existentes. Nenhuma tabela foi removida do banco real.

## Instalação e continuidade

- Migração: `supabase/migrations/20261025000912_portal_clientes_convivium.sql`, aplicada no projeto configurado `aglrevynnumzokvwutok`. O horário UTC do nome foi gerado pelo CLI; a data local da execução foi 24/10/2026.
- Fechamento: `20261025004910_empresas_acesso_frete_cliente.sql` aplicada; Edge Function `calcular-entrega` republicada com cotação móvel. A migração deve vir depois das definições de edição em `sql/edicao_fichas_vigente.sql` no bootstrap de uma instalação nova.
- A migração depende das tabelas e migrações operacionais anteriores. As migrações versionadas não substituem o bootstrap legado em `sql/`.
- Para reproduzir as verificações: Node.js 24, `cd frontend`, `npm ci`, `npm test`, `npm run build`, `npm audit --audit-level=high`.
- Configurar Supabase Auth com a URL HTTPS do frontend e `/pedir/**` entre os redirecionamentos permitidos. O cadastro envia `emailRedirectTo` para o portal da marca na origem atual. Testar o recebimento e a confirmação do e-mail no domínio publicado.
- `VITE_SUPABASE_URL` e a chave pública ficam no frontend; chaves privilegiadas continuam apenas no servidor. Não alterar a chave de rotas nem contratar serviços pagos.
- Colaboradores passam a ser provisionados administrativamente, vinculando explicitamente um usuário de Auth a `usuarios`, perfil e unidade. Cadastro público nunca concede perfil de equipe. Contas de equipe existentes são preservadas.
- Hospedagem deve ter fallback de SPA para `index.html` nas rotas `/pedir`, `/solicitacoes` e demais rotas. Nenhum domínio ou serviço de hospedagem novo foi criado nesta revisão.
- Para interromper novos pedidos móveis sem perder histórico: revogar `EXECUTE` de `authenticated` nas funções `public.enviar_solicitacao_mobile(uuid,jsonb)` e `erp_privado.enviar_mobile(uuid,jsonb)`. Reverter o frontend para o commit anterior se necessário. Não reativar o cadastro automático antigo nem apagar solicitações/vendas.

## Pesquisa de concorrentes pendente de Exa

Comparar Convivium com os fluxos públicos de Goomer, iFood e soluções de PDV/ERP para alimentação. Capturar URL, data, funcionalidade demonstrada, limitações e oportunidade de implementação própria. Cobrir pedido móvel, confirmação/pagamento, operação de cozinha, cancelamento/estoque, CRM, permissões e frete. Priorizar documentação oficial e demonstrações públicas. Nenhum acesso privado, código proprietário ou ativo visual será copiado.

A skill Search exige Exa e proíbe fallback para pesquisa genérica. A sessão não expõe `web_search_exa`/`web_fetch_exa`; a pesquisa não foi executada. Reconectar o plugin e recarregar suas ferramentas é a dependência restante dessa etapa.

## Segurança e limites da evidência

Verificações finais do fechamento: 100 testes aprovados (32 no PostgreSQL efêmero), build aprovado; dependências inalteradas desde a auditoria sem vulnerabilidades. Testes cobrem cadastro de empresa/unidade, troca de contexto, CPF repetido entre marcas, gerente restrito, bloqueio de vínculos cruzados, cotação do consumidor, expiração/titular e reserva preservada no aceite. O Advisor remoto retornou zero erros. A conferência de navegador está registrada em `VALIDACAO.md`.

O CEP salvo no Retiro, `15992-503`, correspondia a Matão. O ViaCEP informou `13209-201`, bairro Jardim Paris, para a faixa 926/927 a 1744/1745 da Rua do Retiro em Jundiaí; foi corrigido o cadastro do número 1354, mantendo rua/número. Na consulta real Eloy → endereço do Retiro, a cotação automática iniciou, mas a base ORS não encontrou o imóvel: envio permaneceu bloqueado e mapa foi oferecido. Não foi emitida taxa fictícia, alterado ponto geográfico ou enviado pedido real nesse teste.

O catálogo público devolve apenas unidades, produtos, preços e adicionais. Não concede `SELECT` às tabelas operacionais. As funções privilegiadas do portal ficam em `erp_privado`, com wrappers sem privilégio no schema público, `search_path` fixo e execução explicitamente concedida. RLS restringe a leitura de solicitações ao titular ou equipe autorizada da unidade. Estas decisões seguem a [documentação de RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) e de [dados de usuários](https://supabase.com/docs/guides/auth/managing-user-data).

O Advisor remoto após a migração não apontou erro de segurança, função com `search_path` mutável ou função `SECURITY DEFINER` executável por anônimo. Restaram 10 avisos: nove funções públicas autenticadas `SECURITY DEFINER` legadas (venda, status, cancelamento, reposição, edição de catálogo/ficha, perfil/unidade e orçamento de rotas) e proteção contra senhas vazadas desativada. Não foram alterados plano da conta nem requisitos de faturamento. A guarda de acesso dessas RPCs deve acompanhar futuras mudanças.

Não foram criados clientes, contas ou pedidos sintéticos persistentes no banco real. Testes de escrita usam PostgreSQL efêmero. Isso valida transações e permissões nos cenários automatizados; não comprova carga real, entrega de e-mail, SMTP, precisão de rotas no mundo real ou homologação multiusuário completa.
