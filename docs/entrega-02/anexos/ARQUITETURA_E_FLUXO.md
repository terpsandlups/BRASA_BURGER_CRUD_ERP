# Arquitetura, fluxo e dados — Entrega 2

Fontes de 29/10/2026 para o código `6c83548`. Exportação e conferência visual para PDFs/anexos permanecem em E2-EXP-01.

## Figura 1 — arquitetura implementada

```mermaid
flowchart LR
    C["Consumidor: portal da marca"] --> A["Supabase Auth"]
    E["Equipe: ERP"] --> A
    C --> P["PostgREST e RPCs autorizadas"]
    E --> P
    P --> B[("PostgreSQL: empresas, lojas, pedidos e estoque")]
    B --> R["RLS, permissões, transações e triggers"]
    C --> F["Edge Function calcular-entrega"]
    E --> F
    F --> A
    F --> O["openrouteservice / HeiGIT"]
    F --> B
    M["OpenStreetMap / Leaflet"] --> C
    M --> E
```

React é a interface no navegador. Node.js executa Vite e testes, sem API intermediária própria. PostgREST e RPCs aplicam o acesso permitido; o servidor confere titular, empresa/unidade, preços e estoque. A função de entrega valida a sessão e consulta o provedor com segredo no servidor. O mapa permite confirmar pontos. O frontend HTTPS externo ainda não está publicado.

## Figura 2 — pedido móvel

```mermaid
flowchart TD
    I["Abrir portal da marca"] --> U["Escolher unidade e modalidade"]
    U --> K["Montar carrinho e entrar ou cadastrar conta"]
    K --> D{"Delivery?"}
    D -- Sim --> Q["Informar endereço e obter cotação válida"]
    Q --> V["Conferir contato, itens, preços e total"]
    D -- Não --> V
    V --> S["Enviar solicitação com chave idempotente"]
    S --> X{"Servidor valida dados e escopo?"}
    X -- Não --> ER["Informar erro e permitir correção"]
    ER --> V
    X -- Sim --> AG["Aguardar na fila da unidade, sem baixa"]
    AG --> DC{"Decisão da equipe autorizada"}
    DC -- Recusar --> RC["Registrar motivo e informar consumidor"]
    DC -- Aceitar --> TR["Transação: conferir cotação, preços e estoque"]
    TR --> OK{"Transação aprovada?"}
    OK -- Não --> AG
    OK -- Sim --> PE["Criar pedido e baixar estoque uma vez"]
    PE --> ST["Avançar status e acompanhar"]
    ST --> HI["Consultar histórico e indicadores"]
```

Consumidor pode cancelar enquanto aguarda. Aceite repetido recupera a venda existente. Unidade delivery-only recusa presencial. A reserva de cotação vinculada preserva o frete durante a espera pelo aceite. Exceções detalhadas estão nas RPCs e nos testes.

## Figura 3 — recorte lógico dos dados

```mermaid
erDiagram
    EMPRESA ||--o{ LOJA : possui
    EMPRESA ||--o{ CLIENTE : cadastra
    EMPRESA ||--o{ PRODUTO : define
    EMPRESA ||--o{ USUARIO_ERP : autoriza
    LOJA ||--o{ PEDIDO : atende
    CLIENTE ||--o{ PEDIDO : realiza
    PEDIDO ||--|{ ITEM_PEDIDO : contem
    PRODUTO ||--o{ VARIACAO : oferece
    VARIACAO ||--o{ ITEM_PEDIDO : identifica
    VARIACAO ||--o{ FICHA_TECNICA : possui
    INGREDIENTE ||--o{ FICHA_TECNICA : compoe
    LOJA ||--o{ ESTOQUE_LOJA : controla
    INGREDIENTE ||--o{ ESTOQUE_LOJA : tem_saldo
    LOJA ||--o{ SOLICITACAO_MOBILE : recebe
    CONTA_AUTH ||--o{ SOLICITACAO_MOBILE : envia
```

Recorte funcional, não schema completo. Cliente usa empresa + CPF. Catálogo e CRM são compartilhados pelas unidades da mesma empresa. Usuário ERP pode ter unidade vinculada ou escopo de empresa no caso do administrador. Conta Auth do consumidor não implica usuário ERP; solicitação aguardando não é venda.

## Localização

- Rotas: `frontend/src/App.jsx`.
- Sessão e perfil: `frontend/src/lib/AuthContext.jsx`.
- Portal e fila: `frontend/src/pages/PortalCliente.jsx` e `SolicitacoesMobile.jsx`.
- Fluxo servidor: migrações `20261025000912_portal_clientes_convivium.sql` e `20261025004910_empresas_acesso_frete_cliente.sql`.
- Frete: `supabase/functions/calcular-entrega/`.
- Testes: `frontend/test/operacaoBanco.test.js`.

Na exportação, incluir número, título, legenda e fonte “elaboração a partir da implementação do projeto, 2026”; conferir legibilidade e correspondência com o relatório.
