# Arquivo histórico — proposta futura de Google Maps

> **Este não é o guia de configuração do MVP atual.** O Brasa Burguer está em
> fase de testes com mapa Leaflet/OpenStreetMap e geocodificação e rotas pelo
> openrouteservice/HeiGIT no plano gratuito. A Google Maps API **não está ativa**.
> Siga [MVP_GRATUITO_SETUP.md](MVP_GRATUITO_SETUP.md). Não ative faturamento
> Google para esta fase. As instruções abaixo registram apenas uma alternativa
> estudada anteriormente; não descrevem a interface ou o deploy atuais.

## Proposta anterior, não vigente

Uma versão futura poderia substituir a integração atual por uma consulta à
Routes API do Google, após avaliação de custo, cobertura, privacidade e termos.
O adaptador Google preservado no código não é selecionado pela função publicada.
O bloco **Calcular pelas ruas — Google Maps** citado neste arquivo pertencia ao
protótipo anterior e não deve ser procurado na interface atual.

Mesmo na proposta anterior, a consulta seria somente uma simulação: sem gravar
cotação, rota ou taxa em pedidos. O MVP atual já oferece mapa visual com a base
OpenStreetMap e permite confirmar um ponto quando o imóvel não é localizado.

## 1. Google Cloud — configuração feita pelo proprietário

1. Abra https://console.cloud.google.com/ e crie ou selecione um projeto.
2. Vincule uma conta de faturamento. Revise preços antes de ativar.
3. Em **APIs e serviços → Biblioteca**, ative **Routes API**.
4. Em **Credenciais**, crie uma chave dedicada a esta integração.
5. Nas restrições de API da chave, permita somente **Routes API**.
6. Configure cotas de requisições e alertas de orçamento. Alertas de orçamento
   não interrompem automaticamente a cobrança. Revise as cotas disponíveis no console.

Esta implementação usa endereço diretamente na Routes API; não requer ativar
Maps JavaScript, Places ou Geocoding API separadamente.
Não configure restrição por domínio/referrer para esta chave de servidor.
Restrição por IP só funciona se houver saída de rede fixa conhecida no servidor;
não use o IP do seu computador. Mantenha a chave exclusivamente nos Secrets.

## 2. Banco no Supabase

No SQL Editor, execute nesta ordem, caso ainda não executados:

1. `sql/migration_configuracao_entrega.sql`
2. `sql/migration_consulta_rotas.sql`

A segunda migração cria um contador privado e a função de autorização/reserva de
consulta. Limites iniciais: **5 por minuto e 100 por dia por usuário**, mais **500
por dia para o projeto**. Dias começam às 00:00 UTC. Consultas que chegam à reserva
contam mesmo se o Google falhar; não há repetição automática. Os limites do app
não controlam outros usos da mesma chave e não substituem as cotas do Google.

Somente Administrador, Gerente ou perfil com `vendas.pode_criar`, ativo, pode
consultar, respeitando sua unidade. Usuário sem unidade pode consultar todas.

## 3. Secrets no Supabase

Em **Edge Functions → Secrets**, cadastre:

| Nome | Valor |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Chave criada no Google; não envie no chat |
| `ALLOWED_ORIGINS` | `http://127.0.0.1:5173,http://localhost:5173` |

Quando publicar o site, adicione a origem HTTPS exata à lista, separada por
vírgula, sem barra final. Não use `*`. As variáveis `SUPABASE_URL` e
`SUPABASE_ANON_KEY` já são fornecidas pelo ambiente hospedado do Supabase.
Não é necessária chave service_role para esta implementação.

## 4. Publicar a função

Com Supabase CLI instalado, execute no diretório raiz do projeto:

```powershell
supabase login
supabase functions deploy calcular-entrega --project-ref SEU_PROJECT_REF
```

Substitua `SEU_PROJECT_REF` pelo identificador do projeto no Supabase. O código
está em `supabase/functions/calcular-entrega/index.ts` e `handler.mjs`; publicar
os dois arquivos. `supabase/config.toml` desativa a validação JWT do gateway, mas
o próprio código **exige e valida** o token do usuário com `auth.getUser` antes de
consultar o banco. Não remova essa validação.

## 5. Conferir

1. Entre como Administrador/Gerente e abra **Entregas**.
2. Salve um endereço verdadeiro e completo da loja e a tarifa por km.
3. No bloco Google Maps, preencha um destino e clique em calcular.
4. Confira origem, destino, distância e tarifa. Alterações não salvas na loja
   não entram na consulta. Não testa nem cria pedidos automaticamente.
5. Teste falha de endereço, limite de consultas e usuário restrito a outra loja.

Se houver erro, confira publicação, secrets, origem permitida, migrações, API
ativada, faturamento e cotas. O app não mostra detalhes internos/chaves do Google.

## Situação de validação e próximos passos

- 18 testes locais passaram (respostas simuladas; nenhum consumo real no Google).
- Ainda pendentes: execução SQL, publicação, validação no runtime Deno/Supabase
  e consulta real. Deno/CLI não estavam disponíveis nesta execução local.
- Antes de uso público, providenciar termos de uso/política de privacidade do
  aplicativo e revisar a atribuição oficial do Google Maps no produto final.
- Próxima etapa funcional: cotação vinculada ao pedido transacional, total e
  troco, separação do frete nas análises e regras de marketplaces. Revisar os
  termos do provedor antes de persistir conteúdo de rotas; esta etapa não faz cache.

## Documentação oficial consultada

- [Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions)
- [Endereços na Routes API](https://developers.google.com/maps/documentation/routes/specify_location)
- [Políticas e atribuição](https://developers.google.com/maps/documentation/routes/policies)
- [Preços](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Secrets do Supabase](https://supabase.com/docs/guides/functions/secrets)
