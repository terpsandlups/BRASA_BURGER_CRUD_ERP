# Validação · clientes, histórico e roteiro

## Validação isolada concluída

- Instalação integral do schema e testes de compatibilidade do App/ERP aprovados.
- Cadastro no App visível no ERP antes do primeiro pedido; consulta do titular por empresa; alterações restritas; isolamento entre empresas; CPF público sem exposição da ficha.
- Simulador validado em PostgreSQL 18.4 local e descartável: **9.000 vendas e 600 clientes**; repetição sem duplicatas; rollback integral por FK inválida; quantidades e datas do estoque preservadas.
- Plano gerado com o catálogo real: **Japy 3.600**, **Retiro 2.700**, **Eloy 2.700**; **R$ 803.715,21** em vendas simuladas e ticket médio de **R$ 89,30**. Os valores desta seção são da prévia; a confirmação do ambiente publicado será registrada abaixo.
- Roteiro criado: `docs/ROTEIRO_APRESENTACAO_20_MINUTOS.md`, com explicação do negócio, demonstração, termos em inglês e GitHub Pages/Supabase.

## Ambiente publicado

Aguardando o término das validações automatizadas antes da aplicação. Não interpretar a prévia acima como uma importação confirmada.

## Limites da verificação

A ativação do pré-cadastro depende de e-mail confirmado e ficha única/válida. O teste com token do Supabase local comprova a associação e a senha; não comprova entrega de e-mail na caixa postal do serviço público. CPF sem e-mail válido, contato ambíguo ou CPF já associado a outra conta exige conferência da loja. O cadastro normal por CPF e senha permanece disponível.

O histórico é sintético, identificado por execução, e não representa faturamento real. Preços e custos são os atuais do catálogo. Nenhuma conta Auth de consumidor é criada pela carga.
