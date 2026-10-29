# Memória de cálculo implementada — Entrega 2

Referência: `6c83548`; revisão de 29/10/2026. Valores de exemplo são sintéticos. As fórmulas descrevem a implementação atual, substituindo para a Entrega 2 a base matemática do exemplo inicial isolado.

## 1. Quantidades, preços e subtotal

Para cada linha i: qᵢ é quantidade inteira positiva; pᵢ é preço unitário em reais; aᵢⱼ é preço de cada adicional por unidade. O subtotal é:

```text
S = Σᵢ [qᵢ × (pᵢ + Σⱼ aᵢⱼ)]
T = arredondar(S + F, 2)
```

S, T e F são valores em reais; F é a taxa da cotação válida no delivery próprio, zero em atendimento sem esse frete. O portal soma preços em centavos inteiros antes de converter o resultado para reais. O servidor verifica preços e total; o navegador não determina a taxa cobrada.

Exemplo da validação de banco: item R$ 25,00 + adicional R$ 3,00 = subtotal R$ 28,00; frete R$ 3,75 resulta em R$ 31,75. A quantidade multiplica também os adicionais da linha.

Fontes: `portalCliente.js/totalCarrinho`, `entrega.js/totalComFrete`, RPC de pedido e `operacaoBanco.test.js`. Desconto e cupom não fazem parte deste cálculo atual; o exemplo de desconto do código inicial da Entrega 1 pertence ao histórico.

## 2. Frete por distância

Variáveis: d é distância de ida por rota em km; m é distância em metros; v é tarifa em R$/km; c é tarifa em centavos/km; f é taxa em centavos.

```text
m = arredondar(d × 1000)
c = arredondar(v × 100)
f = arredondar(m × c / 1000)
F = f / 100
```

| Entrada | Desenvolvimento | Esperado e obtido no teste |
|---|---|---|
| d = 3,5 km; v = R$ 1,50/km | 3500 m × 150 centavos/km ÷ 1000 = 525 centavos | R$ 5,25 |
| d = 1,235 km; v = R$ 1,50/km | 1235 × 150 ÷ 1000 = 185,25 centavos; arredondar | R$ 1,85 |
| d = 0,01 km; v = R$ 1,50/km | 10 × 150 ÷ 1000 = 1,5 centavo; arredondar | R$ 0,02 |

Fonte: função `calcularTaxaEntrega` em `frontend/src/lib/entrega.js`; teste “taxa proporcional por km, vírgula decimal e arredondamento final” em `entrega.test.js`. O servidor utiliza distância da rota, com cobertura e cotação verificadas; a simulação matemática não comprova a precisão de um endereço.

Entradas vazias, não numéricas, não positivas, além dos limites e abaixo da precisão mínima são recusadas. Não há taxa mínima comercial, cobrança de retorno nem trânsito em tempo real no modelo atual.

## 3. Markup e arredondamento monetário

p é preço em reais; u é markup percentual. Regra conceitual:

```text
preço do canal = arredondar(p × (1 + u/100), 2)
24,90 × 1,15 = 28,635 → R$ 28,64
```

`calcularPrecoCanal` usa inteiros BigInt para centavos e pontos percentuais; o arredondamento coincide com `round(numeric)` do PostgreSQL nos casos testados. A versão anterior podia apresentar R$ 28,63 pela representação decimal em ponto flutuante. Teste de banco: “markup no navegador coincide com round numeric do PostgreSQL”.

## 4. Custo de ficha e CMV gerencial

Cada ingrediente tem quantidade na unidade cadastrada (g, ml ou un) e custo por essa unidade. Multiplicar quantidade pelo custo unitário e somar compõe o custo de ficha da variação. Não multiplicar gramas por custo em quilogramas sem conversão prévia.

No dashboard:
- C é a soma do custo atual das fichas conhecidas multiplicado pelas quantidades vendidas.
- Rf é a receita dos itens com ficha conhecida.
- Ri é a receita de todos os itens.
- P é o total pago nos pedidos não cancelados; Fe é o frete desses pedidos.
- N é a quantidade desses pedidos.

```text
CMV (%) = 100 × C / Rf, se Rf > 0
Margem simplificada (%) = 100 − CMV
Cobertura de custo (%) = 100 × Rf / Ri, se Ri > 0
Faturamento dos itens = P − Fe
Ticket médio (R$/pedido) = P / N, se N > 0
```

Frete não entra na base Rf de CMV. Cancelados não entram nos indicadores. Denominador inválido resulta em indicador indisponível, não margem de 100%.

### Caso reproduzido

Pedido não cancelado com dois itens: A por R$ 27,90 com ficha R$ 8,90; B por R$ 27,90 sem ficha conhecida.

| Variável ou resultado | Valor |
|---|---:|
| Receita de todos os itens Ri | R$ 55,80 |
| Receita elegível Rf | R$ 27,90 |
| Custo conhecido C | R$ 8,90 |
| CMV = 8,90 ÷ 27,90 × 100 | 31,90% |
| Margem simplificada | 68,10% |
| Cobertura = 27,90 ÷ 55,80 × 100 | 50% |

Esperado e obtido coincidem no teste “calcula CMV agregado apenas sobre itens com ficha e informa cobertura”, em `frontend/test/dashboard.test.js`.

O custo do dashboard é estimado pela ficha atual, podendo mudar após alteração de insumos/fichas. A fotografia de consumo/custo usada no cancelamento é outra evidência operacional. Margem simplificada não é lucro líquido, não inclui todos os gastos e não transforma custo desconhecido em zero.

## 5. CPF

`validarCPF` normaliza o texto, recusa sequências repetidas e verifica dois dígitos por soma ponderada e resto da divisão por 11. Há validação também no servidor. O identificador sintético 52998224725 é usado em testes; 11111111111 é recusado. Testes não comprovam identidade civil de uma pessoa.

## 6. Interpretação para a Entrega 2

O modelo satisfaz uma necessidade da aplicação: determinar total/frete e apoiar leitura de custo e venda. Sua validação combina cálculo manual e asserções automatizadas. O relatório e os slides devem declarar as unidades, a base dos percentuais, a regra de arredondamento e as limitações acima.

Na revisão final, conferir novamente fórmulas e resultados se houver mudança no código. A fórmula antiga de CMV sobre total com frete, existente no pacote da Entrega 1, não deve ser apresentada como regra atual do dashboard.
