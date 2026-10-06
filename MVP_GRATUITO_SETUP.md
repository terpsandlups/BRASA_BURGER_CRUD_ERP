# MVP sem contratação de serviços pagos

Decisão do projeto: usar os planos gratuitos e aceitar seus limites nesta fase.
Não ativar Google Cloud Billing, testes que exijam depósito, upgrades ou cobrança
por excedente sem nova autorização. Isto não é uma garantia de gratuidade ilimitada:
as cotas e condições dos provedores precisam ser conferidas na conta.

## Rotas: openrouteservice

O código usa os endereços atuais `api.heigit.org/pelias/v1/search` e
`api.heigit.org/openrouteservice/v2/directions/driving-car/json`. O domínio antigo
foi descontinuado; a mesma chave HeiGIT atende os novos endereços.

1. Acesse https://openrouteservice.org/ e entre no portal da conta HeiGIT.
2. Crie uma conta e uma chave do plano gratuito Standard, com Directions e Geocoding.
   Confira as cotas atuais no painel. Se houver solicitação de pagamento, não prossiga.
3. No Supabase, em **Edge Functions → Secrets**, salve `ORS_API_KEY` com essa chave.
   Não envie a chave no chat e não use variável VITE para ela.
4. Configure `ALLOWED_ORIGINS` como `http://127.0.0.1:5173,http://localhost:5173`.
   Acrescente a origem HTTPS exata do site quando publicar, sem barra final.
5. Se ainda não instaladas, execute no SQL Editor:
   - `sql/migration_configuracao_entrega.sql`
   - `sql/migration_consulta_rotas.sql`
   - `supabase/migrations/20261005220617_origem_mapa.sql` (coordenadas opcionais da loja)
6. Publique novamente a função a partir da raiz do projeto, usando Supabase CLI:

```powershell
supabase login
supabase functions deploy calcular-entrega --project-ref SEU_PROJECT_REF
```

Substitua SEU_PROJECT_REF pelo identificador do seu projeto. A pasta da função
agora inclui `index.ts`, `handler.mjs`, `erro.mjs` e `openrouteservice.mjs`.
As variáveis de ambiente de Supabase URL/anon já são fornecidas na hospedagem.
A sessão continua sendo validada dentro da função com auth.getUser.

Não basta mudar Secrets: é necessário publicar a função nova. O index.ts fixa o
provedor gratuito e não lê GOOGLE_MAPS_API_KEY. O adaptador Google permanece no
código para uma versão futura, mas não existe fallback nem ativação por variável.
Nenhuma mudança na conta Google foi realizada pelo agente.

## Uso e limites

Cada cálculo pode usar **até quatro geocodificações e uma rota**: busca livre e,
quando não confirmar, uma busca estruturada por endereço, tanto para a loja
quanto para o destino. Um ponto marcado dispensa geocodificação daquele lado.
Não há novas
tentativas automáticas de rede. O limite já preparado no banco é 500 cálculos/dia global, 100/dia e
5/minuto por usuário. Isso não garante atender todas as cotas externas (incluindo
limites por minuto compartilhados): o erro do provedor interrompe a operação.
Confira as cotas da chave e reduza os limites SQL se necessário. Se atingir uma
cota, aguardar renovação; não contratar plano pago automaticamente.

Os endereços (sem nome, CPF, telefone ou complemento) são enviados ao ORS
somente nos lados sem ponto marcado; a rota usa as coordenadas dos pontos.
A resposta de geocodificação precisa corresponder a imóvel, número, rua, cidade, CEP e UF com confiança
alta; resultados genéricos ou ambíguos são recusados. A cobertura pode ser menor
que a do Google e algumas abreviações/endereços válidos podem ser recusados por
essa política conservadora. Não substituir por centro do CEP ou distância em
linha reta. Quando o imóvel não existe na base gratuita, o gerente pode marcar
o ponto correto no mapa. O ponto da loja é salvo; o do destino vale só para a
consulta. Alterar rua, número, CEP, bairro, cidade ou UF limpa o ponto ainda
não salvo. Antes de salvar a loja ou consultar o destino com ponto, a interface
exige confirmação de que ele representa o imóvel correto. O resultado informa
se cada lado foi calculado pelo endereço confirmado ou pelo ponto marcado.
Um ponto aleatório pode produzir uma rota válida, mas não valida o endereço;
nesse caso, a taxa não corresponde à entrega pretendida. O cálculo manual
continua disponível para simulação com uma distância conhecida.

Rota de carro, de ida, sem trânsito em tempo real. Distância arredondada ao metro,
taxa ao centavo. Atribuição ao openrouteservice/HeiGIT e OpenStreetMap na tela.
Revise as condições de uso e privacidade antes de publicação para clientes.

## Pendências e verificação

- A função com suporte a pontos foi republicada no Supabase. A origem Eloy,
  CEP 13212-070 e número 977, não foi localizada automaticamente na base
  gratuita. O CEP completa campos postais, mas não identifica o imóvel.
- Confirmar visualmente os pontos exatos da loja e da entrega e comparar a rota
  obtida com um trajeto real antes de usar qualquer valor operacionalmente.
  Testar também destino inválido e bloqueio por cota.
- Ainda é simulação em Entregas, não cobrança no pedido. A integração de frete
  no pedido transacional e no histórico permanece uma etapa posterior.
- Manter Supabase e hospedagem dentro dos planos gratuitos, sem domínio pago
  ou upgrades nesta fase. Nenhum plano dessas contas foi verificado/alterado aqui.

Fontes: https://openrouteservice.org/services/ e https://openrouteservice.org/plans/
