import { describe, expect, it } from "vitest";
import { classificar, diagnosticar, type ContextoDaVenda } from "@/core/domain/diagnostico";
import type { Evento, Venda } from "@/core/domain/tipos";

const T = "2026-11-16T20:14:00-03:00";

function contexto(ajustes: {
  venda?: Partial<Venda>;
  conta?: "ativa" | "restrita";
  afiliacao?: "aprovada" | "pendente_aprovacao_produtor" | null;
  tipo?: "fisico" | "digital";
  eventos?: Evento["tipo"][];
}): ContextoDaVenda {
  const venda: Venda = {
    id: "v-1",
    produto_id: "p-1",
    data_hora: T,
    valor: 100,
    sessao_id: "s-1",
    checkout_versao: "v3.1",
    origem_checkout: "link_afiliado",
    codigo_afiliado_no_checkout: "LIA-WHE",
    creator_atribuido: "c-1",
    comprador_coincide_com_creator: false,
    pedido: { status: "entregue", previsao_entrega: null, entregue_em: T },
    comissao: { valor: 12, status: "liberada", libera_em: T, motivo: null },
    ...ajustes.venda,
  };
  const tipos = ajustes.eventos ?? ["pagamento_aprovado", "atribuicao_afiliado"];
  return {
    venda,
    creator: {
      id: "c-1",
      nome: "Lia Martins",
      usuario: "@liafit",
      nicho: "Treino",
      conta:
        ajustes.conta === "restrita"
          ? { status: "restrita", restrita_desde: "2026-11-08T10:00:00-03:00", motivo_restricao: "promessa de resultado" }
          : { status: "ativa", restrita_desde: null, motivo_restricao: null },
    },
    produto: {
      id: "p-1",
      nome: "Kit Whey Protein 900g",
      tipo: ajustes.tipo ?? "digital",
      produtor: "Nutri Max",
      preco: 100,
      comissao_percentual: 12,
      comissao_libera: "apos_entrega",
    },
    afiliacao:
      ajustes.afiliacao === null
        ? undefined
        : {
            id: "af-1",
            creator_id: "c-1",
            produto_id: "p-1",
            status: ajustes.afiliacao ?? "aprovada",
            solicitada_em: "2026-11-05T09:00:00-03:00",
            aprovada_em: null,
            link_id: "lnk-1",
            codigo_afiliado: "LIA-WHE",
          },
    eventosDaSessao: [
      { id: "e-0", sessao_id: "s-1", venda_id: null, tipo: "clique_link", data_hora: "2026-11-16T20:01:00-03:00", detalhes: { link_id: "lnk-1" } },
      ...tipos.map((tipo, i) => ({ id: `e-${i + 1}`, sessao_id: "s-1", venda_id: "v-1", tipo, data_hora: T, detalhes: {} })),
    ],
  };
}

describe("classificar", () => {
  it("conta com restrição vence qualquer outra regra", () => {
    expect(classificar(contexto({ conta: "restrita", venda: { codigo_afiliado_no_checkout: null } }))).toBe("conta");
  });

  it("venda feita antes da restrição não é culpa da restrição", () => {
    expect(classificar(contexto({ conta: "restrita", venda: { data_hora: "2026-11-01T10:00:00-03:00" } }))).toBe(
      "venda_contabilizada",
    );
  });

  it("afiliação pendente ou inexistente é configuração", () => {
    expect(classificar(contexto({ afiliacao: "pendente_aprovacao_produtor" }))).toBe("configuracao");
    expect(classificar(contexto({ afiliacao: null }))).toBe("configuracao");
  });

  it("autocompra é regra do programa", () => {
    expect(classificar(contexto({ venda: { comprador_coincide_com_creator: true } }))).toBe("regra");
  });

  it("checkout sem código é uso do link", () => {
    expect(classificar(contexto({ venda: { codigo_afiliado_no_checkout: null } }))).toBe("uso_do_link");
  });

  it("produto físico não entregue com comissão pendente é prazo", () => {
    const ctx = contexto({
      tipo: "fisico",
      venda: {
        pedido: { status: "enviado", previsao_entrega: "2026-11-21T20:14:00-03:00", entregue_em: null },
        comissao: { valor: 12, status: "pendente", libera_em: null, motivo: null },
      },
    });
    expect(classificar(ctx)).toBe("prazo");
  });

  it("pagamento aprovado sem atribuição e sem recusa é possível falha", () => {
    expect(classificar(contexto({ eventos: ["checkout_iniciado", "pagamento_aprovado"] }))).toBe("possivel_falha");
  });

  it("recusa registrada não é falha", () => {
    expect(classificar(contexto({ eventos: ["pagamento_aprovado", "atribuicao_recusada"] }))).toBe("venda_contabilizada");
  });

  it("caminho completo é venda contabilizada", () => {
    expect(classificar(contexto({}))).toBe("venda_contabilizada");
  });
});

describe("diagnosticar", () => {
  it("possível falha tem confiança baixa, vai para a tecnologia e mostra o passo que faltou", () => {
    const d = diagnosticar(contexto({ eventos: ["checkout_iniciado", "pagamento_aprovado"] }));
    expect(d.confianca).toBe("baixa");
    expect(d.escalar).toBe(true);
    expect(d.time_responsavel).toBe("tecnologia");
    expect(d.trilha.at(-1)).toMatchObject({ estado: "faltando" });
    expect(d.evidencias.filter((e) => e.decisiva)).toHaveLength(1);
  });

  it("toda causa explicada tem confiança alta e não escala", () => {
    for (const ctx of [
      contexto({ venda: { codigo_afiliado_no_checkout: null } }),
      contexto({ venda: { comprador_coincide_com_creator: true } }),
      contexto({ conta: "restrita" }),
      contexto({ afiliacao: "pendente_aprovacao_produtor" }),
      contexto({}),
    ]) {
      const d = diagnosticar(ctx);
      expect(d.confianca).toBe("alta");
      expect(d.escalar).toBe(false);
      expect(d.evidencias.some((e) => e.decisiva)).toBe(true);
      expect(d.proximo_passo.length).toBeGreaterThan(10);
    }
  });

  it("uso do link cita o horário do clique e do checkout", () => {
    const d = diagnosticar(contexto({ venda: { codigo_afiliado_no_checkout: null } }));
    expect(d.explicacao).toContain("16/11 às 20:01");
    expect(d.time_responsavel).toBe("marketing_conteudo");
  });

  it("nunca expõe dados do comprador", () => {
    const d = diagnosticar(contexto({ venda: { comprador_coincide_com_creator: true } }));
    expect(JSON.stringify(d)).not.toMatch(/\bcpf\b|e-?mail|telefone|endere[cç]o|\bip\b/i);
  });
});
