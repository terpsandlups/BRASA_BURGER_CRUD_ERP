# Cartazes para os pedidos na aula

- `cartaz-pedidos-aula-A4.pdf`: um cartaz A4 colorido.
- `cartazes-pedidos-aula-4-grupos.pdf`: quatro páginas, identificadas como Grupo 01 a 04. Imprima uma cópia do arquivo para distribuir quatro cartazes.
- `qr-pedidos.svg`: QR Code vetorial do mesmo endereço.

Impressão: papel A4, colorida, tamanho real (100%), uma página por folha e frente única. Não usar a opção de várias páginas por folha. O QR já inclui margem branca.

Destino atual:
https://terpsandlups.github.io/BRASA_BURGER_CRUD_ERP/pedir/brasa-burger

O QR abre apenas o portal do consumidor. O apresentador deve indicar a unidade escolhida para a atividade e acompanhar as solicitações no ERP com sua conta autorizada. O cartaz orienta a não realizar pagamentos durante a atividade.

Esta revisão do código ainda precisa passar pela ativação descrita em `docs/ARQUITETURA_E_FINALIZACAO.md`. O cartaz não publica o aplicativo nem aplica migrações. Antes da impressão e da aula, confirmar o fluxo completo no endereço publicado. Se o domínio mudar, gerar novamente o QR e os PDFs com os scripts `scripts/gerar-qr-aula.mjs` e `scripts/gerar-cartazes-aula.py`.
