# ADR 0006: Limite de uso na rota de IA

- Status: aceita
- Data: 20/11/2026

## Contexto

A rota `/api/perguntar` é pública. Com uma chave da API configurada, cada pergunta vira uma chamada paga ao modelo. Sem limite, um robô ou um curioso insistente pode gerar custo sem fim.

## Decisão

- Cada origem (IP informado pelo proxy) pode fazer até **10 perguntas por minuto**. Acima disso, a rota responde `429` com `Retry-After: 60`.
- O limite é verificado antes de ler o corpo, para custar o mínimo possível.
- A implementação (`src/adapters/limite.ts`) é uma janela deslizante em memória, atrás da interface `Limitador`.
- O laço de ferramentas da IA tem no máximo 6 rodadas e 1024 tokens de saída por resposta, o que limita o custo de cada pergunta.

## Consequências

- Em funções serverless, cada instância tem a própria memória, então o limite é de melhor esforço. Em produção, a mesma interface seria implementada com um armazenamento compartilhado (Redis, por exemplo) e com um teto de gasto mensal no console da Anthropic.
- Sem chave de API, o limite continua valendo e protege também o processamento das regras.
