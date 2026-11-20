import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { ExplicadorComClaude, type ClienteDeMensagens } from "@/adapters/ia/claude";
import { criarRastroDaDemo, HOJE } from "@/adapters/demo";

type Bloco = Anthropic.Messages.ContentBlock;

/** Monta uma resposta da API com os campos que o explicador lê. */
function resposta(stop_reason: Anthropic.Messages.Message["stop_reason"], content: unknown[]): Anthropic.Messages.Message {
  return { id: "msg", type: "message", role: "assistant", model: "teste", content: content as Bloco[], stop_reason } as Anthropic.Messages.Message;
}

/** Cliente falso: devolve as respostas na ordem e guarda o que recebeu. */
function clienteFalso(respostas: Anthropic.Messages.Message[]) {
  const pedidos: Anthropic.Messages.MessageCreateParamsNonStreaming[] = [];
  const cliente: ClienteDeMensagens = {
    messages: {
      async create(params) {
        pedidos.push(structuredClone(params));
        const r = respostas.shift();
        if (!r) throw new Error("O teste não previu mais chamadas.");
        return r;
      },
    },
  };
  return { cliente, pedidos };
}

const { rastro } = criarRastroDaDemo(HOJE);
const whey = rastro.vendasDoCreator("c-lia").find((v) => v.produto.startsWith("Kit Whey") && v.data_hora.startsWith("2026-11-16"))!;

describe("ExplicadorComClaude", () => {
  it("executa as ferramentas pedidas pelo modelo e devolve a explicação e a venda", async () => {
    const { cliente, pedidos } = clienteFalso([
      resposta("tool_use", [{ type: "tool_use", id: "t1", name: "buscar_vendas", input: { data: "2026-11-16", produto: "whey" } }]),
      resposta("tool_use", [{ type: "tool_use", id: "t2", name: "diagnosticar_venda", input: { venda_id: whey.venda_id } }]),
      resposta("end_turn", [{ type: "text", text: "Oi, Lia! Os dados não explicam esta venda; o caso foi para a tecnologia." }]),
    ]);

    const r = await new ExplicadorComClaude(rastro, { cliente, modelo: "teste" }).explicar("c-lia", "Minha venda de ontem não contou");

    expect(r).toEqual({ venda_id: whey.venda_id, resposta: "Oi, Lia! Os dados não explicam esta venda; o caso foi para a tecnologia.", modo: "ia" });
    expect(pedidos).toHaveLength(3);
    expect(pedidos[0].tools?.map((t) => (t as { name: string }).name)).toEqual(["buscar_vendas", "diagnosticar_venda"]);

    // O resultado das ferramentas volta para o modelo, vindo do motor de regras.
    const resultados = pedidos[2].messages.at(-1)!.content as Anthropic.Messages.ToolResultBlockParam[];
    const diagnostico = JSON.parse(String(resultados[0].content));
    expect(diagnostico.causa).toBe("possivel_falha");
    expect(JSON.stringify(pedidos)).not.toMatch(/\bcpf\b|e-?mail do comprador|telefone/i);
  });

  it("usa o creator da sessão, mesmo se o modelo pedir a venda de outra pessoa", async () => {
    const daBia = rastro.vendasDoCreator("c-bia")[0];
    const { cliente, pedidos } = clienteFalso([
      resposta("tool_use", [{ type: "tool_use", id: "t1", name: "diagnosticar_venda", input: { venda_id: daBia.venda_id } }]),
      resposta("end_turn", [{ type: "text", text: "Não encontrei essa venda para você." }]),
    ]);
    const r = await new ExplicadorComClaude(rastro, { cliente }).explicar("c-lia", "e a venda da Bia?");
    const resultado = (pedidos[1].messages.at(-1)!.content as Anthropic.Messages.ToolResultBlockParam[])[0];
    expect(String(resultado.content)).toContain("Venda não encontrada para este creator.");
    expect(r.venda_id).toBeNull();
  });

  it("recusa ou resposta vazia vira um pedido de reformulação", async () => {
    const { cliente } = clienteFalso([resposta("refusal", [])]);
    const r = await new ExplicadorComClaude(rastro, { cliente }).explicar("c-lia", "???");
    expect(r.resposta).toMatch(/Diga o produto e o dia/);
  });

  it("para depois de 6 rodadas de ferramentas", async () => {
    const sempreFerramenta = Array.from({ length: 6 }, (_, i) =>
      resposta("tool_use", [{ type: "tool_use", id: `t${i}`, name: "buscar_vendas", input: {} }]),
    );
    const { cliente, pedidos } = clienteFalso(sempreFerramenta);
    const r = await new ExplicadorComClaude(rastro, { cliente }).explicar("c-lia", "minha venda");
    expect(pedidos).toHaveLength(6);
    expect(r.resposta).toMatch(/demorou mais que o esperado/);
  });
});
