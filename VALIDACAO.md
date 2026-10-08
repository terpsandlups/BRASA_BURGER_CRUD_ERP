# Registro de validação — Brasa Burguer

## Retorno de uso — 07/10/2026

**Versão:** fluxo de simulação de entregas publicado no projeto, antes da integração do frete ao pedido.

| Área | Entrada ou cenário | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|---|
| Entregas | Endereço físico e ponto confirmado no mapa OpenStreetMap | Calcular rota e taxa proporcional pelo openrouteservice | O mantenedor relatou que a simulação funcionou no aplicativo | Validado pelo usuário no cenário testado |

O relato confirma o funcionamento desse cenário, não a cobertura de todos os
endereços nem a precisão de cada trajeto. A taxa ainda não é lançada no pedido.
Na revisão técnica anterior, 40 testes automatizados e o build do frontend
passaram; a validação em campo acima foi informada pelo mantenedor.

## Execução de 13/09/2026

**Versão:** cópia local ainda sem repositório Git (`.git` ausente).

| Área | Entrada ou cenário | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|---|
| Endereço | CEP `01310-100` no cadastro de Clientes | Preencher rua, bairro, cidade e UF sem perder campos | Avenida Paulista, Bela Vista, São Paulo e SP preenchidos em conjunto | Aprovado |
| Endereço no pedido | Atualizações consecutivas de rua, bairro, cidade e UF | Preservar todos os campos no cadastro rápido | Teste automatizado do atualizador funcional aprovado | Aprovado |
| Dashboard | Período de 7 dias em 13/09/2026 | Incluir 07/09 a 13/09, com sete pontos no gráfico | Intervalo e preenchimento dos dias aprovados | Aprovado |
| Dashboard | Todas as unidades → Unidade Japy | Todos os indicadores devem acompanhar o filtro | Faturamento/pedidos mudaram de R$ 629,70/8 para R$ 376,90/5 | Aprovado |
| Dashboard | Custo R$ 8,90 e receita elegível R$ 27,90 | CMV 31,90% e margem bruta 68,10% | Teste automatizado aprovado | Aprovado |
| Dashboard | Item sem ficha técnica | Não apresentar custo ausente como margem de 100% | Indicadores usam apenas receita elegível e mostram cobertura | Aprovado |
| Dashboard | Pedido cancelado | Excluir de faturamento, ticket, produtos e canais | Teste automatizado aprovado | Aprovado |
| Pedidos | Tela conectada com sessão Administrador | Carregar lojas e indicadores operacionais | Três unidades e indicadores do dia carregados | Aprovado |
| Pedidos | Alterações externas em pedidos/itens | Atualizar o quadro sem aguardar recarga manual | Realtime implementado com atualização periódica de segurança | Implementado; validar com duas sessões |
| Pedidos | Cliques repetidos em finalizar/avançar/cancelar | Evitar duplicidade durante requisição em andamento | Travas síncronas e estados desabilitados implementados | Implementado; teste integrado pendente |

## Verificações técnicas

- `npm test`: 3 testes aprovados.
- `npm run build`: compilação de produção aprovada.
- O aviso de pacote JavaScript acima de 500 kB permanece; divisão do pacote é melhoria de desempenho futura.
- A gravação de pedido ainda ocorre em mais de uma requisição. A atomicidade completa exige uma função transacional no PostgreSQL e migração coordenada com o frontend.
- Testes de isolamento por perfil/unidade exigem usuários de teste restritos no Supabase.
