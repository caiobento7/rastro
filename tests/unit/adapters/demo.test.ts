import { describe, expect, it } from "vitest";
import { detectarAlertas } from "@/core/domain/alertas";
import { dataHora, dinheiro, duracao, haQuantoTempo, somarMinutos } from "@/core/domain/formatar";
import { mediana } from "@/core/domain/metricas";
import { catalogoDaDemo, estadoInicialDaDemo, HOJE } from "@/adapters/demo";
import { gerarVendas, VERSAO_COM_FALHA } from "@/adapters/demo/vendas";

describe("dados da demonstração", () => {
  it("são determinísticos", () => {
    expect(JSON.stringify(gerarVendas())).toBe(JSON.stringify(gerarVendas()));
    expect(JSON.stringify(estadoInicialDaDemo())).toBe(JSON.stringify(estadoInicialDaDemo()));
  });

  it("toda venda tem produto, sessão com pagamento aprovado e nada no futuro", () => {
    const cat = catalogoDaDemo();
    for (const v of cat.vendas()) {
      expect(cat.produto(v.produto_id)).toBeDefined();
      const eventos = cat.eventosDaSessao(v.sessao_id);
      expect(eventos.some((e) => e.tipo === "pagamento_aprovado")).toBe(true);
      for (const e of eventos) expect(e.data_hora <= HOJE).toBe(true);
    }
  });

  it("só as vendas do incidente passaram pelo checkout com falha", () => {
    const comFalha = catalogoDaDemo()
      .vendas()
      .filter((v) => v.checkout_versao === VERSAO_COM_FALHA);
    expect(comFalha).toHaveLength(7);
    expect(comFalha.every((v) => v.creator_atribuido === null)).toBe(true);
  });

  it("todos os protocolos são únicos", () => {
    const { casos } = estadoInicialDaDemo();
    expect(new Set(casos.map((c) => c.protocolo)).size).toBe(casos.length);
  });
});

describe("detectarAlertas", () => {
  const cat = catalogoDaDemo();
  const todas = cat.vendas().map((venda) => ({ venda, produto: cat.produto(venda.produto_id)!, creator_id: "c" }));
  const falhas = todas.filter((t) => t.venda.checkout_versao === VERSAO_COM_FALHA);

  it("não abre alerta com menos de 3 vendas parecidas", () => {
    expect(detectarAlertas(falhas.slice(0, 2), todas)).toHaveLength(0);
  });

  it("agrupa pela versão do checkout e compara com as outras versões", () => {
    const [alerta] = detectarAlertas(falhas, todas);
    expect(alerta.venda_ids).toHaveLength(7);
    expect(alerta.assinatura).toEqual({ checkout_versao: "v3.2", produtor: "Nutri Max" });
    expect(alerta.resumo_tecnico).toMatch(/foram atribuídas normalmente/);
  });
});

describe("formatação", () => {
  it("formata datas sem depender do fuso do servidor", () => {
    expect(dataHora("2026-11-16T20:14:00-03:00")).toBe("16/11 às 20:14");
    expect(somarMinutos("2026-11-16T23:30:00-03:00", 45)).toBe("2026-11-17T00:15:00-03:00");
  });

  it("formata dinheiro em reais", () => {
    expect(dinheiro(1234.5)).toBe("R$ 1.234,50");
    expect(dinheiro(22.79)).toBe("R$ 22,79");
  });

  it("formata durações e tempo relativo", () => {
    expect(duracao(0)).toBe("1 min");
    expect(duracao(200)).toBe("3 h 20 min");
    expect(duracao(60 * 24 * 4)).toBe("4 dias");
    expect(haQuantoTempo("2026-11-17T17:55:00-03:00", HOJE)).toBe("há 5 min");
    expect(haQuantoTempo("2026-11-15T18:00:00-03:00", HOJE)).toBe("há 2 dias");
  });

  it("calcula a mediana", () => {
    expect(mediana([])).toBe(0);
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
  });
});
