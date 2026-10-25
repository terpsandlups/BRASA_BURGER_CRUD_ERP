# Convivium Management System — execução de 24/10/2026

Esta revisão acompanha os oito pedidos de evolução. Código implementado, migração aplicada e testes executados são evidências diferentes de homologação operacional completa.

| Pedido | Entrega nesta revisão | Limite verificável |
|---|---|---|
| 1. Atualizar GitHub e reler o projeto | Revisão de rotas, autenticação, transações, catálogo, estoque e frete; suíte e build; definições de edição de fichas recuperadas do banco em `sql/edicao_fichas_vigente.sql` | Alterações locais anteriores em `sql/schema.sql`, arquivo SQL incompleto, ZIPs e pasta `teste/` foram preservadas separadamente |
| 2. Pedidos pelo celular | `/pedir`: catálogo comercial, unidade, retirada/entrega, adicionais, carrinho, conta de cliente, envio e acompanhamento. `/solicitacoes`: fila, aceite e recusa | Delivery recebe o frete após conferência e contato da loja. Cadastro e confirmação por e-mail dependem das configurações de Auth |
| 3. Identidade Convivium | Login, título do navegador, menu desktop/móvel e portal com Convivium Management System | Brasa Burguer continua sendo a marca da operação e do cardápio; não há multiempresa isolada ou editor de identidade |
| 4. Segurança | Novo cadastro não cria colaborador; RLS por titular/unidade, escrita por RPC, preços verificados, limites de envio, idempotência, aceite e baixa atômicos; auxiliares legadas sem execução anônima e com `search_path` fixo | Proteção de senha vazada desativada na conta; funções autenticadas privilegiadas permanecem deliberadamente guardadas por permissões |
| 5. Revisão profissional | Mensagens de instalação removidas das telas, textos de frete reduzidos, informações operacionais preservadas, estado de indisponibilidade do portal e página Canais de venda | ERP permanece piloto; não inclui contabilidade fiscal, emissão de notas ou fechamento financeiro completo |
| 6. Pesquisa de concorrentes | Escopo e critérios registrados abaixo; nenhuma conclusão de mercado inventada | Pendente: ferramentas Exa indisponíveis. A busca de plugins também retornou indisponibilidade nesta sessão |
| 7. Plataforma própria e futuras APIs | Origem própria mantida no servidor; página Canais de venda; contrato e arquitetura futura em `INTEGRACOES_FUTURAS.md` | Nenhuma conexão automática iFood/Goomer/Rappi é anunciada como ativa |
| 8. Frete | Regressão do ORS e banco, preço adulterado, cotação vencida/usada, outro cliente/unidade e endereço divergente; aceitação integra frete ao total | Comparação de trajetos reais de carro/moto e testes operacionais com duas sessões reais continuam necessários |

## Operação do portal

1. Compartilhar a rota `/pedir` do frontend publicado. Localmente, usar o endereço do servidor Vite. Um endereço `127.0.0.1` funciona apenas no mesmo computador.
2. Cliente escolhe unidade, modalidade, produtos e adicionais; cria uma conta ou entra com e-mail e senha.
3. Cliente envia nome, CPF, telefone e, para entrega, endereço completo. Não há cobrança online. O pedido fica aguardando e ainda não altera receita ou estoque.
4. Equipe abre **Pedidos do celular**. Na entrega, **Preparar cálculo de frete** cria o cadastro de contato se ele ainda não existe, sem sobrescrever dados existentes. O operador calcula a rota para o endereço enviado e confirma o valor pelo telefone com o cliente.
5. Aceite cria a venda pelo fluxo transacional já existente, usando canal `proprio`, preço validado, cotação do operador e baixa de estoque. Falha reverte a venda e conserva a solicitação aguardando.
6. Cliente acompanha apenas solicitações de sua conta, incluindo etapa operacional e total confirmado. O CPF informado não vincula vendas históricas nem permite consultar cadastro de outras pessoas.
7. Cliente pode cancelar enquanto aguarda. Recusa da equipe exige motivo. Aceite repetido retorna a mesma venda.

Limites: 5 solicitações por conta em 15 minutos e 10 aguardando por conta; até 50 linhas, 99 unidades por linha e 20 adicionais por linha. Não há reserva de estoque antes do aceite. O catálogo é global, como no PDV atual. A disponibilidade final depende do estoque da unidade.

## Instalação e continuidade

- Migração: `supabase/migrations/20261025000912_portal_clientes_convivium.sql`, aplicada no projeto configurado `aglrevynnumzokvwutok`. O horário UTC do nome foi gerado pelo CLI; a data local da execução foi 24/10/2026.
- A migração depende das tabelas e migrações operacionais anteriores. As migrações versionadas não substituem o bootstrap legado em `sql/`.
- Para reproduzir as verificações: Node.js 24, `cd frontend`, `npm ci`, `npm test`, `npm run build`, `npm audit --audit-level=high`.
- Configurar Supabase Auth com a URL HTTPS do frontend e `/pedir` entre os redirecionamentos permitidos. O cadastro envia `emailRedirectTo` para a origem atual. Testar o recebimento e a confirmação do e-mail no domínio publicado.
- `VITE_SUPABASE_URL` e a chave pública ficam no frontend; chaves privilegiadas continuam apenas no servidor. Não alterar a chave de rotas nem contratar serviços pagos.
- Colaboradores passam a ser provisionados administrativamente, vinculando explicitamente um usuário de Auth a `usuarios`, perfil e unidade. Cadastro público nunca concede perfil de equipe. Contas de equipe existentes são preservadas.
- Hospedagem deve ter fallback de SPA para `index.html` nas rotas `/pedir`, `/solicitacoes` e demais rotas. Nenhum domínio ou serviço de hospedagem novo foi criado nesta revisão.
- Para interromper novos pedidos móveis sem perder histórico: revogar `EXECUTE` de `authenticated` nas funções `public.enviar_solicitacao_mobile(uuid,jsonb)` e `erp_privado.enviar_mobile(uuid,jsonb)`. Reverter o frontend para o commit anterior se necessário. Não reativar o cadastro automático antigo nem apagar solicitações/vendas.

## Pesquisa de concorrentes pendente de Exa

Comparar Convivium com os fluxos públicos de Goomer, iFood e soluções de PDV/ERP para alimentação. Capturar URL, data, funcionalidade demonstrada, limitações e oportunidade de implementação própria. Cobrir pedido móvel, confirmação/pagamento, operação de cozinha, cancelamento/estoque, CRM, permissões e frete. Priorizar documentação oficial e demonstrações públicas. Nenhum acesso privado, código proprietário ou ativo visual será copiado.

A skill Search exige Exa e proíbe fallback para pesquisa genérica. A sessão não expõe `web_search_exa`/`web_fetch_exa`; a pesquisa não foi executada. Reconectar o plugin e recarregar suas ferramentas é a dependência restante dessa etapa.

## Segurança e limites da evidência

Verificações finais: 92 testes aprovados (25 no PostgreSQL efêmero), build de produção aprovado e zero vulnerabilidades no `npm audit`. No navegador, catálogo real com 3 unidades/44 variações, busca, carrinho de R$ 26,90 para R$ 53,80 e fila da equipe foram conferidos. O viewport móvel 390 × 844 não apresentou rolagem horizontal no cenário verificado.

O catálogo público devolve apenas unidades, produtos, preços e adicionais. Não concede `SELECT` às tabelas operacionais. As funções privilegiadas do portal ficam em `erp_privado`, com wrappers sem privilégio no schema público, `search_path` fixo e execução explicitamente concedida. RLS restringe a leitura de solicitações ao titular ou equipe autorizada da unidade. Estas decisões seguem a [documentação de RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) e de [dados de usuários](https://supabase.com/docs/guides/auth/managing-user-data).

O Advisor remoto após a migração não apontou erro de segurança, função com `search_path` mutável ou função `SECURITY DEFINER` executável por anônimo. Restaram 10 avisos: nove funções públicas autenticadas `SECURITY DEFINER` legadas (venda, status, cancelamento, reposição, edição de catálogo/ficha, perfil/unidade e orçamento de rotas) e proteção contra senhas vazadas desativada. Não foram alterados plano da conta nem requisitos de faturamento. A guarda de acesso dessas RPCs deve acompanhar futuras mudanças.

Não foram criados clientes, contas ou pedidos sintéticos persistentes no banco real. Testes de escrita usam PostgreSQL efêmero. Isso valida transações e permissões nos cenários automatizados; não comprova carga real, entrega de e-mail, SMTP, precisão de rotas no mundo real ou homologação multiusuário completa.
