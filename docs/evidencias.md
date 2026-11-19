# Evidências: como cheguei ao problema

Li uma por uma 12 reclamações públicas de afiliados no Reclame Aqui, em 17/11/2026, em seis plataformas. Nenhuma é contra a YouShop: o problema é do mercado de afiliados. Os textos abaixo são resumos meus; as citações curtas estão entre aspas.

| # | Plataforma | Data | O que aconteceu | Causa no Rastro |
|---|---|---|---|---|
| 1 | Kiwify | 31/01/2025 | Link errado. A plataforma explicou em 4 dias e a afiliada deu nota 10. | Uso do link |
| 2 | Kiwify | 04/10/2024 | Link "duplicado". A afiliada abriu mão da comissão para não envolver a cliente. | Uso do link |
| 3 | Kiwify | 10/03/2026 | Conta bloqueada desde 07/2025 sem o afiliado saber. Resposta em 45 dias. | Conta |
| 4 | Kiwify | 08/09/2023 | Venda sumiu. "Agora estou com medo de continuar divulgando produtos". | Possível falha |
| 5 | Kiwify | 12/01/2025 | A irmã comprou pelo link. Resolvido pela regra de dados coincidentes. | Regra |
| 6 | Hotmart | 2018 | Comissão sumiu. Nota 2 e "não voltaria". | Possível falha |
| 7 | Hotmart | 23/06/2025 | Compra pelo próprio link, sem comissão pela regra de dados coincidentes. | Regra |
| 8 | Eduzz | 2022 | O produtor não vinculou o afiliado ao produto. | Configuração |
| 9 | Braip | 05/11/2024 | A compra foi feita no checkout do produtor, sem o link. | Uso do link |
| 10 | Shopee | 02/03/2025 | A comissão só vale depois da entrega. | Prazo |
| 11 | Mercado Livre | 11/04/2026 | Comissão negada por violação de diretrizes. Resposta em 10 dias. | Conta |
| 12 | Mercado Livre | 15/05/2026 | Comissões caíram de cerca de R$ 1.200 para R$ 420 por mês; vendas para "familiares e amigos". Resposta em 12 dias. | Regra |

## O que tirei daqui

1. **A frase é a mesma, a causa não.** "Minha venda não contou" esconde seis causas diferentes, e cada uma tem um dono diferente na empresa.
2. **O que resolve é explicar rápido, com prova.** No caso 1, quando a causa foi explicada com clareza, a nota foi 10, mesmo sem a comissão.
3. **A demora custa o creator.** A primeira resposta levou de 2 a 45 dias. Nesse tempo, o afiliado desconfia e para de divulgar.
4. **Falha real se esconde no meio.** Casos 4 e 6 eram, pelo relato, falhas de rastreamento que só apareceram na reclamação pública.

Essas seis causas viraram as regras de `src/core/domain/diagnostico.ts`, e os dados fictícios da demonstração reproduzem cada uma delas.
