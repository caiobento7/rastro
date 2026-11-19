# ADR 0005: Privacidade por padrão

- Status: aceita
- Data: 17/11/2026

## Contexto

Para explicar a regra de autocompra, seria tentador mostrar ao creator quais dados do comprador coincidiram com os dele. Isso exporia dados pessoais de terceiros e ensinaria como contornar o antifraude.

## Decisão

- O modelo de venda guarda só `comprador_coincide_com_creator: boolean`. Nenhum nome, CPF, e-mail, telefone, endereço ou IP do comprador entra no Rastro.
- As ferramentas da IA e do MCP devolvem só id, produto, data, valor e situação.
- O resumo técnico para a tecnologia usa ids de venda e de sessão e a lista de eventos.
- Há testes que falham se o diagnóstico ou o resumo técnico tiver campos como CPF, e-mail, telefone, endereço ou IP.

## Consequências

- O creator recebe a explicação ("os dados coincidem com os seus") sem ver os dados.
- Os sinais do antifraude continuam sigilosos.
- Em produção, o registro de quem consultou cada diagnóstico atenderia à LGPD.
