# ADR 0002: Núcleo isolado com portas e adaptadores

- Status: aceita
- Data: 18/11/2026

## Contexto

O mesmo raciocínio (diagnosticar, abrir caso, detectar falhas em grupo) precisa servir a quatro entradas: as telas, a rota de IA, o servidor MCP e os testes. Se a regra morar dentro de um componente React ou de uma rota do Next.js, cada entrada acaba com uma cópia diferente.

## Decisão

Arquitetura hexagonal (portas e adaptadores):

```
src/core/domain        regras, diagnóstico, alertas e métricas. TypeScript puro.
src/core/application   casos de uso (classe Rastro) e portas (interfaces).
src/adapters           implementações das portas: dados da demo, memória, IA.
src/app, components    telas e rota HTTP. Usam o núcleo, nunca o contrário.
mcp/                   servidor MCP, outro adaptador do mesmo núcleo.
```

As fronteiras são verificadas no CI pelo `dependency-cruiser` (`.dependency-cruiser.cjs`):

- o domínio não importa nada fora dele;
- a aplicação só importa o domínio;
- adaptadores não importam telas;
- componentes de tela não chamam a IA direto;
- nenhum ciclo de dependência.

## Consequências

- Trocar os dados fictícios por um banco real é escrever um novo `CatalogoDeVendas` e um novo `RepositorioDeCasos`, sem tocar nas regras.
- O núcleo roda igual no navegador, no servidor e no MCP.
- Há mais arquivos do que num protótipo "tudo na página", o custo de deixar a regra testável e reaproveitável.
