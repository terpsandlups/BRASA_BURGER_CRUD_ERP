# Duas aplicações, uma operação

Revisão de 16/11/2026. Implementação preparada para finalizar o projeto antes do deploy desta revisão.

O Convívium atende empresas. Cada empresa oferece seu próprio portal aos consumidores. Brasa Burger é a empresa piloto, e não o nome da plataforma.

| Aplicação | Quem usa | Endereço após a publicação | Dados |
| --- | --- | --- | --- |
| Portal da loja | Consumidores da empresa | `/pedir/brasa-burger` ou `/pedir/{slug-da-empresa}` | Cardápio público e os pedidos do próprio consumidor |
| ERP personalizado | Equipe da empresa contratante | `/`, `/solicitacoes`, `/pedidos`, `/produtos`, `/clientes`, `/estoque` | Empresa e unidades permitidas pelo perfil |
| Apresentação | Público da apresentação | `/apresentacao/index.html` | Explicação do produto e acesso às duas aplicações reais |

Os caminhos são relativos à base da hospedagem. No GitHub Pages, o nome do repositório antecede essas rotas. Em um domínio próprio, podem começar na raiz.

## Publicação

É suficiente um repositório e um build do frontend. A hospedagem serve os dois acessos, e ambos se conectam ao backend Supabase. Não é necessário enviar dois ZIPs, duplicar o banco nem manter dois projetos só para separar consumidores e equipe. O backend continua com seu próprio ciclo de configuração e migrações.

As sessões ficam em chaves diferentes do navegador. O ERP preserva sua chave existente; o consumidor usa `convivium-consumidor-v1`. Sair de uma aplicação encerra sua sessão local. Retornos de confirmação por URL são processados somente pela aplicação correspondente ao caminho aberto. Contas públicas nunca recebem perfil de equipe.

O isolamento real dos dados continua no banco: empresa, vínculo da equipe, unidade, permissões e RLS. Separar menus ou URLs não substitui essas regras.

Nesta entrega, a navegação integrada e a apresentação são mantidas para a aula. A separação comercial em aplicações e publicações independentes fica para uma etapa posterior; a apresentação acadêmica não faz parte do produto comercial. A estrutura atual não deve ser anunciada como essa separação já concluída.

## Oito frentes desta revisão

1. **Identidade e públicos:** apresentação explica plataforma, empresa contratante e consumidor. Brasa Burger permanece como piloto com identidade própria.
2. **Aplicações paralelas:** sessões independentes de consumidor e equipe, inclusive quando abertas ao mesmo tempo no mesmo navegador; links preservam a base da hospedagem.
3. **Cardápio real:** barra fixa de categorias retornadas pelo banco, busca sem acentos, destaques, descrições, fotos e cards padronizados. Categorias vazias não são inventadas para o piloto.
4. **Pedido real:** detalhe do produto, adicionais, adição rápida, quantidades e totais do carrinho. O envio continua pelo fluxo transacional existente até a unidade escolhida, com cotação de frete do servidor e confirmação da loja.
5. **Personalização no ERP:** Produtos → Ver detalhes → Editar apresentação no cardápio permite salvar nome comercial, categoria, descrição, foto HTTPS, destaque e disponibilidade para entrega/retirada, respeitando a empresa e a permissão de edição.
6. **Operação e indicadores:** corrigida a referência ausente ao usuário na tela de Pedidos. O dashboard passa a reler dados autorizados com avisos Realtime e recuperação periódica. O quadro de pedidos existente continua usando os status e transações reais.
7. **Ficha técnica:** custo de cada ingrediente, custo total, CMV e margem sobre insumos calculados a partir dos dados salvos. Custos ausentes não viram zero. Essa margem não representa lucro líquido.
8. **Apresentação:** abertura com mockups, navegação entre consumidor e ERP, aplicação real incorporada, modos celular/desktop e retorno claro à gestão. As três trilhas acadêmica, técnica e de negócio continuam disponíveis, com 31 páginas. A apresentação não cria pedidos ou indicadores fictícios.

## Material para a aula

O formato entregue da apresentação foi preservado. O texto visível foi reduzido, mantendo o detalhamento nas notas de fala. Novas imagens ilustrativas e etapas clicáveis ajudam a explicar o negócio, o fluxo do pedido e as permissões.

As três novas revisões em PowerPoint ficam em `Slides/Aula-Visual-2026/`, com PDFs correspondentes em `output/pdf/aula-*-visual.pdf`. Os arquivos da release anterior permanecem intactos.

O QR Code fica somente no material impresso, fora da navegação do aplicativo. `output/aula/` contém um cartaz A4 e uma versão de quatro páginas, uma para cada grupo. O destino é o portal público do Brasa Burger. Se o endereço de publicação mudar, regenerar antes de imprimir:

```powershell
node scripts/gerar-qr-aula.mjs --url https://endereco-publicado/pedir/brasa-burger
python scripts/gerar-cartazes-aula.py
```

Orientações de impressão e o endereço atual estão em `output/aula/README.md`.

## Ativação no deploy desta revisão

As alterações desta revisão não foram aplicadas ao banco operacional nem publicadas na branch `main`. O envio para `main` dispara a publicação automática já configurada; por isso esta revisão deve permanecer em sua branch de trabalho até a finalização.

1. Conferir a validação automatizada da branch, inclusive a homologação isolada com Auth, PostgREST e Realtime.
2. Aplicar somente `supabase/migrations/20261116000100_cardapio_visual.sql` ao ambiente de destino, uma vez, depois das migrações anteriores. Ela adiciona `imagem_url`, `destaque` e os metadados públicos ao catálogo. Não reinstalar `sql/instalacao/convivium-completo.sql` no banco existente.
3. Publicar o frontend com a URL e chave pública do Supabase. Nunca colocar chave privilegiada no frontend.
4. Configurar ou conferir logo, cor, categorias, descrições e fotos reais da empresa piloto. Imagens de apoio permanecem identificadas como ilustrações.
5. Validar com contas autorizadas: consumidor envia para a unidade escolhida, equipe recebe e aceita uma vez, estoque é atualizado, status volta ao titular e outra unidade/empresa não acessa o pedido.
6. Disponibilizar o link do portal aos alunos depois dessa validação no ambiente publicado.

Até aplicar a migração, o servidor anterior não fornece as novas categorias, imagens ou destaques. A interface permanece compatível: mostra os produtos existentes, com categoria “Outros” e sem inventar metadados. A edição dos novos campos depende da migração.

Na primeira utilização da sessão separada, consumidores que estavam logados na versão anterior podem precisar entrar novamente no portal. As credenciais existentes permanecem válidas.

## Validação e limites

- Testes locais cobrem catálogo, busca, URLs de imagens, cálculos da ficha, fluxos de pedidos e isolamento entre empresas em PostgreSQL WASM, além da instalação completa em bancos vazios.
- Verificação no navegador local: catálogo existente, seleção de unidade, busca, detalhe e carrinho com dois itens de R$ 26,90 totalizando R$ 53,80. Nenhuma solicitação foi enviada ao banco operacional durante essa verificação.
- O script de homologação local foi ampliado para conferir duas sessões no mesmo armazenamento. Ele recusa ambientes remotos; a execução completa dessa parte ocorre no CI com Supabase descartável.
- As telas privadas exigem conta de equipe. A verificação visual sem login não substitui o teste final com as contas autorizadas no ambiente publicado.
- ViaCEP continua preenchendo endereço. Distância e frete continuam dependendo do serviço de rotas e da origem configurada da unidade; ViaCEP não substitui esse cálculo.
- Os PowerPoints e o pacote acadêmico da revisão anterior são preservados. A nova revisão visual é entregue em arquivos separados, sem substituir os arquivos da release anterior.

Imagens e prompts: `frontend/public/imagens/cardapio/CREDITOS.md` e `Slides/Entrega-2/assets/CREDITOS-AULA-VISUAL.md`.
