# Validação · clientes, histórico e roteiro

## Validação isolada concluída

- Instalação integral do schema e testes de compatibilidade do App/ERP aprovados.
- Cadastro no App visível no ERP antes do primeiro pedido; consulta do titular por empresa; alterações restritas; isolamento entre empresas; CPF público sem exposição da ficha.
- Simulador validado em PostgreSQL 18.4 local e descartável: **9.000 vendas e 600 clientes**; repetição sem duplicatas; rollback integral por FK inválida; quantidades e datas do estoque preservadas.
- Plano gerado com o catálogo real e confirmado no banco publicado: **Japy 3.600**, **Retiro 2.700**, **Eloy 2.700**; **R$ 803.715,21** em vendas simuladas e ticket médio de **R$ 89,30**.
- Roteiro criado: `docs/ROTEIRO_APRESENTACAO_20_MINUTOS.md`, com explicação do negócio, demonstração, termos em inglês e GitHub Pages/Supabase.

## Ambiente publicado

**Banco Supabase atualizado em 24/11/2026**, no projeto já utilizado pelos links públicos. Migração de clientes aplicada; função de login publicada; URLs exatas de retorno do consumidor autorizadas, mantendo os retornos do ERP, a confirmação de e-mail e o MFA.

**Carga confirmada:** execução `aula-2026-9000`, assinatura `a9254925d3e1ce508fb5`. O envio usa 85 lotes em uma transação, em formato compacto de 727.605 bytes. O transporte inicial foi recusado pelo tamanho antes de executar SQL; a versão compacta foi novamente testada antes do envio confirmado.

| Conferência | Resultado |
|---|---:|
| Vendas simuladas | 9.000 |
| Clientes simulados novos | 600 |
| Itens simulados | 32.415 |
| Total de clientes após a carga | 607 |
| Total de pedidos após a carga | 9.016 |
| Total de itens após a carga | 32.471 |
| Pedidos simulados disponíveis em `fato_vendas` | 9.000 |
| Totais de pedidos divergentes da soma de itens + frete | 0 |
| Vendas presenciais em unidade exclusivamente delivery | 0 |
| Datas locais dos pedidos simulados | 01/01–22/11/2026 |

Os **7 clientes, 16 pedidos e 56 itens anteriores** tiveram seu conteúdo comparado por assinatura antes/depois e permanecem idênticos. **Todas as quantidades e datas do estoque também permanecem idênticas**. A carga não criou usuários de autenticação: continuam 4 contas Auth e 3 contas de consumidor.

| Unidade | Vendas simuladas | Faturamento simulado | Ticket médio | Presencial |
|---|---:|---:|---:|---:|
| Japy | 3.600 | R$ 303.620,68 | R$ 84,34 | 2.683 |
| Retiro | 2.700 | R$ 252.602,80 | R$ 93,56 | 0 |
| Eloy | 2.700 | R$ 247.491,73 | R$ 91,66 | 0 |

O [recibo da carga](entrega-02/anexos/resultado-simulacao-2026.json) contém a conferência por unidade/canal, totais, assinatura, distribuição mensal e ABC, sem dados pessoais de consumidores reais.

**Testes no GitHub:** [PR #4](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/pull/4), com [execução aprovada do código](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/runs/45523643534): App/build, PostgreSQL com carga completa e Supabase Auth/API/Realtime em stack descartável. São 148 testes Node e 3 testes Python, além da homologação da API real local e da instalação em PostgreSQL nativo. A integração do PR aciona a [publicação das telas no Pages](https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP/actions/workflows/publicar.yml).

A auditoria de segurança pós-migração confirmou o bloqueio anônimo da nova RPC e o bloqueio do helper privado para usuários comuns. O Advisor também relacionou funções legadas `SECURITY DEFINER` em `public` e a configuração de proteção contra senhas vazadas; esses itens não foram reconfigurados nesta entrega. Os novos wrappers públicos usam `SECURITY INVOKER` e delegam a validação de titular/empresa ao schema privado.

Para a apresentação: usar os últimos 30/90 dias no Painel ou **01/01/2026–22/11/2026 em Análises**. ‘Hoje’ mostra os pedidos da aula e não todo o histórico simulado. O QR Code continua apontando para o mesmo link do consumidor; não precisa ser reimpresso quando o deploy atualiza esse endereço.

## Limites da verificação

A ativação do pré-cadastro depende de e-mail confirmado e ficha única/válida. O teste com token do Supabase local comprova a associação e a senha; não comprova entrega de e-mail na caixa postal do serviço público. CPF sem e-mail válido, contato ambíguo ou CPF já associado a outra conta exige conferência da loja. O cadastro normal por CPF e senha permanece disponível.

O histórico é sintético, identificado por execução, e não representa faturamento real. Preços e custos são os atuais do catálogo. Nenhuma conta Auth de consumidor é criada pela carga.
