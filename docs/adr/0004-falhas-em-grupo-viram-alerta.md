# ADR 0004: Perguntas parecidas sem explicação viram um alerta

- Status: aceita
- Data: 18/11/2026

## Contexto

Nas reclamações públicas, falhas reais de rastreamento só apareciam quando muitos afiliados já tinham reclamado, às vezes semanas depois. Para o atendimento, cada caso parece isolado. Para a tecnologia, cada caso chega como uma interrupção.

## Decisão

Toda pergunta com causa "possível falha" é agrupada pela assinatura técnica da venda (versão do checkout e produtor). A partir de 3 vendas com a mesma assinatura (`MINIMO_PARA_ALERTA`), o Rastro abre um alerta com:

- as vendas e os creators afetados;
- a janela de tempo e as comissões em risco;
- uma comparação com as vendas do mesmo produtor em outras versões do checkout, que foram atribuídas normalmente;
- uma hipótese técnica e o resumo para reproduzir.

Quando a tecnologia marca o alerta como resolvido, todos os casos ligados são encerrados e cada creator recebe a resposta no próprio caso.

## Consequências

- A falha aparece em horas, a partir das próprias perguntas, e não da reclamação pública.
- O limite de 3 é um ponto de partida. Num piloto, ele seria calibrado pelo volume real.
- Próximo passo: varrer todas as vendas, não só as perguntadas, para achar a falha antes da primeira pergunta. A tela da tecnologia já mostra vendas com a mesma falha que ninguém reclamou.
