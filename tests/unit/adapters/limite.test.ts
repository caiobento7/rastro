import { describe, expect, it } from "vitest";
import { LimitePorJanela, origemDoPedido } from "@/adapters/limite";

describe("LimitePorJanela", () => {
  it("deixa passar até o máximo e bloqueia o resto dentro da janela", () => {
    const limite = new LimitePorJanela(3, 60_000);
    expect([0, 1, 2, 3].map((i) => limite.permitir("a", 1_000 + i))).toEqual([true, true, true, false]);
  });

  it("libera de novo quando a janela passa", () => {
    const limite = new LimitePorJanela(2, 60_000);
    limite.permitir("a", 0);
    limite.permitir("a", 1);
    expect(limite.permitir("a", 30_000)).toBe(false);
    expect(limite.permitir("a", 60_002)).toBe(true);
  });

  it("conta cada origem separadamente", () => {
    const limite = new LimitePorJanela(1, 60_000);
    expect(limite.permitir("a", 0)).toBe(true);
    expect(limite.permitir("b", 0)).toBe(true);
    expect(limite.permitir("a", 1)).toBe(false);
  });
});

describe("origemDoPedido", () => {
  it("usa o primeiro IP do x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
    expect(origemDoPedido(req)).toBe("203.0.113.7");
  });

  it("sem cabeçalho, agrupa como desconhecida", () => {
    expect(origemDoPedido(new Request("http://x"))).toBe("desconhecida");
  });
});
