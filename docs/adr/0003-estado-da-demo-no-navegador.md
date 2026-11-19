# ADR 0003: Estado da demonstração no navegador

- Status: aceita
- Data: 18/11/2026

## Contexto

A demonstração precisa mostrar uma ação atravessando times: a creator pergunta, o atendimento responde, a tecnologia corrige e a resposta volta. Na Vercel, funções serverless não compartilham memória entre si, e um banco só para a demo traria custo, credenciais e dados de avaliadores misturados.

## Decisão

- O catálogo de vendas é fixo e gerado de forma determinística (semente fixa), igual no servidor e no navegador.
- O que muda (casos, contestações, respostas, estado dos alertas) fica no `localStorage` de quem testa, em `src/lib/demo/estado.ts`.
- As telas leem esse estado com `useSyncExternalStore` e executam os casos de uso do núcleo sobre ele. O estado de fábrica é o mesmo no servidor e no cliente, então a hidratação não diverge.
- O histórico inicial de um mês não é escrito à mão: é produzido rodando os próprios casos de uso com um relógio ajustável (`src/adapters/demo/index.ts`).

## Consequências

- Cada avaliador vê o resultado das próprias ações, sem interferir no de outro.
- A demo funciona sem banco e sem chave de API.
- Em produção, o mesmo núcleo usaria repositórios em banco. A porta `RepositorioDeCasos` já separa isso.
