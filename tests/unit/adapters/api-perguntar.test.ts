import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/perguntar/route";

function pedido(corpo: unknown) {
  return new Request("http://localhost/api/perguntar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

let chave: string | undefined;
beforeEach(() => {
  chave = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  if (chave !== undefined) process.env.ANTHROPIC_API_KEY = chave;
});

describe("POST /api/perguntar sem chave de API", () => {
  it("identifica a venda e explica só com as regras", async () => {
    const r = await POST(pedido({ creatorId: "c-lia", pergunta: "Minha venda de ontem não contou" }));
    expect(r.status).toBe(200);
    const dados = await r.json();
    expect(dados.modo).toBe("regras");
    expect(dados.venda_id).toMatch(/^v-\d+$/);
    expect(dados.resposta).toMatch(/^Os dados não explicam esta venda\./);
  });

  it("recusa JSON inválido", async () => {
    const r = await POST(pedido("{não é json"));
    expect(r.status).toBe(400);
  });

  it("recusa pergunta vazia ou longa demais", async () => {
    expect((await POST(pedido({ creatorId: "c-lia", pergunta: " " }))).status).toBe(400);
    expect((await POST(pedido({ creatorId: "c-lia", pergunta: "x".repeat(501) }))).status).toBe(400);
  });

  it("recusa creator inexistente", async () => {
    const r = await POST(pedido({ creatorId: "c-ninguem", pergunta: "e minha venda?" }));
    expect(r.status).toBe(404);
  });
});
