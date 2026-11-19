# ADR 0001: As regras decidem a causa, a IA só explica

- Status: aceita
- Data: 17/11/2026

## Contexto

Quando um creator diz que a venda não contou, a resposta mexe com dinheiro e com confiança. Uma IA generativa que escolhe o motivo pode errar com convicção ("alucinar") e, pior, errar de jeito diferente para dois creators com o mesmo caso. Nas reclamações analisadas, o que mais irrita o afiliado é a explicação vaga ou contraditória.

## Decisão

A causa de cada venda é decidida por um motor de regras determinístico em `src/core/domain/diagnostico.ts`, com ordem fixa e testes para cada regra. A IA (Claude com ferramentas) só:

1. entende de qual venda o creator está falando;
2. chama `buscar_vendas` e `diagnosticar_venda`;
3. reescreve o diagnóstico em linguagem simples, sem acrescentar motivos, prazos ou valores.

Quando nenhuma regra explica a venda, o diagnóstico vem com `confianca: "baixa"` e `escalar: true`, e o caso vai para uma pessoa.

## Consequências

- A mesma venda sempre tem a mesma causa, com a prova decisiva apontada.
- O produto funciona sem IA: a demonstração publicada roda só com as regras.
- Uma regra nova exige código e teste, não um ajuste de prompt. É mais lento de mudar, e de propósito.
