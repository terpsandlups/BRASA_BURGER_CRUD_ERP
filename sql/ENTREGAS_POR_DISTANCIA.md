# Entregas por distância — histórico da etapa 1

Estado atual: consulta automática gratuita com openrouteservice, endereços e
pontos opcionais em mapa OpenStreetMap. Siga `MVP_GRATUITO_SETUP.md` na raiz.
O texto abaixo registra a simulação manual inicial. A cobrança em pedidos
continua desativada; o guia Google está arquivado para versão futura.

## Instalação

Execute `sql/migration_configuracao_entrega.sql` no SQL Editor do Supabase.
Depois abra **Entregas** (`/entregas`) e clique em **Recarregar**.
Selecione a loja, preencha endereço completo e tarifa e salve.
Administrador/Gerente ativos podem editar dentro de sua unidade; usuários ativos
podem ler dentro de sua unidade. Usuário sem unidade tem acesso multiunidade.
As políticas dependem das tabelas de usuários/perfis existentes; validar com
contas reais de cada perfil. A migração não foi executada por este agente.

Endereço de entrega fica em `configuracoes_entrega`, separado do endereço textual
legado em `lojas`. Não há sincronização automática entre os dois. A origem para
a futura cotação será a configuração nova. Nenhum tipo de operação é alterado.

## Regra implementada

- R$ 1,50/km é apenas sugestão inicial; cada loja salva sua tarifa.
- Simulação manual: distância de ida em km × tarifa, arredondada ao centavo no fim.
- Precisão da distância: um metro. Tarifa salva: duas casas decimais.
- Sem arredondamento para km inteiro, taxa mínima, raio máximo comercial ou retorno.
- A simulação usa os campos exibidos, inclusive alterações ainda não salvas.
- Esta etapa NÃO soma taxa ao pedido nem calcula rotas automaticamente.
- Não foram cadastrados endereços fictícios ou alterados pedidos de clientes.

## Próxima etapa: cotação automática e pedido

Antes da implementação, escolher um serviço de geocodificação/rotas e autorizar
eventuais custos. Endereços de loja e destino serão enviados ao provedor; não enviar
CPF, nome ou telefone. Chave secreta deve ficar no servidor, nunca em variável VITE.

Usar trajeto pelas ruas entre endereço completo da origem e destino (incluindo
número); CEP sozinho não determina a distância. Validar endereços ambíguos e não
substituir falha de rota por taxa zero nem por distância em linha reta.

A cotação deverá ser calculada no servidor e ter validade, loja e destino
vinculados. Gravar no pedido uma cópia do endereço, distância, tarifa e taxa
aplicada, sem recalcular o passado quando o cliente/loja mudar de endereço.
Integrar ao pedido transacional, total/troco e histórico; separar receita de
mercadorias e frete nas análises. Definir explicitamente como tratar iFood/Rappi
para não cobrar frete duas vezes. Atendimento presencial não leva taxa.

## Verificação manual após instalar

1. Salvar endereço verdadeiro de uma loja e tarifa 1,50; recarregar e conferir.
2. Trocar de loja: não deve reaproveitar endereço/tarifa da anterior.
3. Simular 3,5 km: R$ 5,25. Entrada vazia/inválida não deve gerar taxa.
4. Perfil sem permissão: conferir leitura e bloqueio de escrita no banco.
5. Usuário de uma loja: confirmar impossibilidade de ler/editar outra loja.

SQL/RLS e persistência ainda exigem validação integrada no Supabase.
