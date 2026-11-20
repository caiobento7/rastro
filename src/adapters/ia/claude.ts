/**
 * Explicador com a API do Claude e ferramentas (tool use).
 *
 * A IA não decide a causa: ela só chama buscar_vendas e diagnosticar_venda, que
 * rodam o motor de regras, e reescreve o resultado em linguagem simples.
 * O creatorId vem da sessão, nunca do modelo.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Explicador, RespostaDoExplicador } from "@/core/application/portas";
import type { Rastro } from "@/core/application/rastro";
import { normalizar } from "@/core/domain/formatar";

const MAX_RODADAS = 6;

const FERRAMENTAS: Anthropic.Messages.Tool[] = [
  {
    name: "buscar_vendas",
    description:
      "Lista as vendas ligadas ao creator: atribuídas a ele, com o código dele no checkout ou com clique no link dele. " +
      "Devolve id, produto, data e hora, valor e situação. Nunca devolve dados do comprador.",
    input_schema: {
      type: "object",
      properties: {
        produto: { type: "string", description: "Parte do nome do produto, por exemplo 'whey' ou 'treino'." },
        data: { type: "string", description: "Data no formato AAAA-MM-DD." },
      },
      required: [],
    },
  },
  {
    name: "diagnosticar_venda",
    description:
      "Roda o motor de regras sobre uma venda e devolve a causa, a confiança, a explicação-base, as evidências, " +
      "o próximo passo e o caminho da venda. É a única fonte de verdade sobre o motivo.",
    input_schema: {
      type: "object",
      properties: { venda_id: { type: "string", description: "Id devolvido por buscar_vendas, por exemplo v-1042." } },
      required: ["venda_id"],
    },
  },
];

function instrucoes(nome: string, hoje: string) {
  return [
    `Você é o Rastro, da YouShop. Você explica a creators por que uma venda contou ou não. Está falando com ${nome}.`,
    `Agora é ${hoje} (horário de Brasília). Use isso para entender "ontem", "sábado" e parecidos.`,
    "1. Para qualquer pergunta sobre venda, use buscar_vendas e depois diagnosticar_venda. Nunca deduza a causa sozinho.",
    "2. Explique só o que veio de diagnosticar_venda. Pode usar suas palavras, mas não acrescente motivos, regras, prazos ou valores.",
    "3. Se o diagnóstico vier com escalar = true, diga com honestidade que os dados não explicam a venda e que o caso foi para o time de tecnologia.",
    "4. Nunca revele dados do comprador. Diga apenas que os dados coincidem com os do creator, quando for o caso.",
    "5. Responda em português do Brasil, em no máximo 4 frases curtas, e termine com o próximo passo.",
    "6. Se a pergunta não for sobre vendas ou comissões, diga que você só ajuda com isso.",
  ].join("\n");
}

/** O pedaço do SDK que o explicador usa. Permite trocar o cliente real por um falso nos testes. */
export interface ClienteDeMensagens {
  messages: {
    create(params: Anthropic.Messages.MessageCreateParamsNonStreaming): Promise<Anthropic.Messages.Message>;
  };
}

export class ExplicadorComClaude implements Explicador {
  private readonly cliente: ClienteDeMensagens;
  private readonly modelo: string;

  constructor(
    private readonly rastro: Rastro,
    opcoes: { cliente?: ClienteDeMensagens; modelo?: string } = {},
  ) {
    this.cliente = opcoes.cliente ?? new Anthropic();
    this.modelo = opcoes.modelo ?? (process.env.RASTRO_MODEL || "claude-opus-5-5");
  }

  private executar(nome: string, entrada: Record<string, unknown>, creatorId: string, vistas: string[]): unknown {
    if (nome === "buscar_vendas") {
      const produto = typeof entrada.produto === "string" ? normalizar(entrada.produto) : null;
      const data = typeof entrada.data === "string" ? entrada.data : null;
      return this.rastro
        .vendasDoCreator(creatorId)
        .filter((v) => !produto || normalizar(v.produto).includes(produto))
        .filter((v) => !data || v.data_hora.startsWith(data))
        .slice(0, 15);
    }
    if (nome === "diagnosticar_venda") {
      const d = this.rastro.diagnosticarVenda(String(entrada.venda_id), creatorId);
      if (!d) return { erro: "Venda não encontrada para este creator." };
      vistas.push(d.venda_id);
      return d;
    }
    return { erro: `Ferramenta desconhecida: ${nome}` };
  }

  async explicar(creatorId: string, pergunta: string): Promise<RespostaDoExplicador> {
    const creator = this.rastro.creator(creatorId);
    const mensagens: Anthropic.Messages.MessageParam[] = [{ role: "user", content: pergunta }];
    const vistas: string[] = [];

    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      const r = await this.cliente.messages.create({
        model: this.modelo,
        max_tokens: 1024,
        system: instrucoes(creator.nome, this.rastro.agora()),
        tools: FERRAMENTAS,
        messages: mensagens,
      });

      if (r.stop_reason === "tool_use") {
        mensagens.push({ role: "assistant", content: r.content });
        const resultados: Anthropic.Messages.ToolResultBlockParam[] = r.content
          .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use")
          .map((b) => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: JSON.stringify(
              this.executar(b.name, (b.input && typeof b.input === "object" ? b.input : {}) as Record<string, unknown>, creatorId, vistas),
            ),
          }));
        mensagens.push({ role: "user", content: resultados });
        continue;
      }

      const texto = r.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (r.stop_reason === "refusal" || !texto) {
        return { venda_id: vistas.at(-1) ?? null, resposta: "Não consegui responder agora. Diga o produto e o dia da venda?", modo: "ia" };
      }
      return { venda_id: vistas.at(-1) ?? null, resposta: texto, modo: "ia" };
    }
    return { venda_id: vistas.at(-1) ?? null, resposta: "A análise demorou mais que o esperado. Tente de novo dizendo o produto e o dia.", modo: "ia" };
  }
}
