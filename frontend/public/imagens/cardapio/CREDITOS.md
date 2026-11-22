# Imagens de apoio ao cardápio

Criadas em 16/11/2026 com a ferramenta integrada ImageGen. Não são fotografias dos produtos vendidos pelo Brasa Burger. O portal identifica o uso de imagens de apoio como “Imagem ilustrativa”; uma foto configurada pela empresa no ERP tem prioridade.

Arquivos finais no projeto:

- `frontend/public/imagens/cardapio/burger.webp`
- `frontend/public/imagens/cardapio/executivo.webp`
- `frontend/public/imagens/cardapio/bebida.webp`
- `frontend/public/imagens/cardapio/sobremesa.webp`

Os originais gerados foram apenas reduzidos para 800 × 800 e otimizados em WebP para diminuir o tráfego. O cardápio usa exclusivamente produtos, categorias, disponibilidade e preços retornados pelo banco; essas imagens não criam itens nem alteram suas descrições.

## Prompts utilizados

Prefixo comum, seguido pelo texto específico de cada imagem:

> Generate a single premium photorealistic food catalog photograph for the Convivium restaurant software demonstration. Warm amber lighting, matte cream background, subtle soft shadow, carefully centered food filling 75% of a square composition, three-quarter camera angle, editorial food styling, restrained elegant mood. No text, logos, people, watermark, packaging branding, UI or collage. Realistic appetizing texture.

1. **burger:** A tall artisanal beef cheeseburger in a golden brioche bun, cheddar cheese, crisp bacon, lettuce and tomato, served on a small cream ceramic plate. One burger only.
2. **executivo:** A Brazilian executive lunch on a round cream ceramic plate: grilled chicken breast, white rice, black beans in a small matching ramekin, colorful fresh salad. One complete plate, beautiful and realistic.
3. **bebida:** A glass of freshly squeezed orange juice with ice and a thin orange slice on the rim, a single glass centered on the cream surface.
4. **sobremesa:** A chocolate brownie square with a single scoop of vanilla ice cream and a little chocolate drizzle, served on a small cream ceramic dessert plate.

O mockup de abertura da apresentação é uma representação visual da arquitetura. As abas Consumidor e ERP abrem as aplicações conectadas; não usam uma base de pedidos fictícios.
