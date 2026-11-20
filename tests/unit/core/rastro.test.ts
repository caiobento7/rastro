import { beforeEach, describe, expect, it } from "vitest";
import { ErroDoRastro } from "@/core/application/rastro";
import { somarMinutos } from "@/core/domain/formatar";
import { criarRastroDaDemo, HOJE } from "@/adapters/demo";

let demo: ReturnType<typeof criarRastroDaDemo>;
const vendaDaLia = (produto: string, dia: string) =>
  demo.rastro.vendasDoCreator("c-lia").find((v) => v.produto.startsWith(produto) && v.data_hora.startsWith(dia))!;

beforeEach(() => {
  demo = criarRastroDaDemo(HOJE);
});

describe("vendas do creator", () => {
  it("mostra vendas que não foram atribuídas, mas passaram pelo link dele", () => {
    const situacoes = new Set(demo.rastro.vendasDoCreator("c-lia").map((v) => v.situacao));
    expect(situacoes).toContain("nao_contou");
    expect(situacoes).toContain("contou");
  });

  it("não devolve nenhum dado do comprador", () => {
    for (const v of demo.rastro.vendasDoCreator("c-lia")) {
      expect(Object.keys(v).sort()).toEqual(["comissao", "data_hora", "produto", "situacao", "valor", "venda_id"]);
    }
  });

  it("não diagnostica venda de outro creator", () => {
    const daLia = vendaDaLia("Kit Whey", "2026-11-16");
    expect(demo.rastro.diagnosticarVenda(daLia.venda_id, "c-bia")).toBeNull();
  });
});

describe("as vendas da Lia contam uma história", () => {
  it.each([
    ["Kit Whey", "2026-11-16", "possivel_falha"],
    ["Treino em Casa", "2026-11-15", "uso_do_link"],
    ["Creatina", "2026-11-14", "prazo"],
    ["Treino em Casa", "2026-11-02", "regra"],
    ["Treino em Casa", "2026-11-17", "venda_contabilizada"],
  ])("%s em %s é %s", (produto, dia, causa) => {
    const v = vendaDaLia(produto, dia);
    expect(demo.rastro.diagnosticarVenda(v.venda_id, "c-lia")?.causa).toBe(causa);
  });
});

describe("perguntar ao Rastro", () => {
  it("explica na hora e abre um caso já explicado", () => {
    const v = vendaDaLia("Treino em Casa", "2026-11-15");
    const r = demo.rastro.perguntar("c-lia", v.venda_id, "Por que não contou?");
    expect(r.caso.status).toBe("explicado");
    expect(r.caso.protocolo).toMatch(/^RST-\d+$/);
    expect(r.caso.mensagens.map((m) => m.autor)).toEqual(["creator", "rastro"]);
    expect(r.repetida).toBe(false);
  });

  it("não abre dois casos para a mesma venda", () => {
    const v = vendaDaLia("Treino em Casa", "2026-11-15");
    const a = demo.rastro.perguntar("c-lia", v.venda_id);
    const b = demo.rastro.perguntar("c-lia", v.venda_id);
    expect(b.repetida).toBe(true);
    expect(b.caso.protocolo).toBe(a.caso.protocolo);
  });

  it("possível falha vai direto para a tecnologia e entra no alerta do checkout v3.2", () => {
    const antes = demo.rastro.alertas();
    expect(antes).toHaveLength(1);
    expect(antes[0].venda_ids).toHaveLength(5);

    const v = vendaDaLia("Kit Whey", "2026-11-16");
    const r = demo.rastro.perguntar("c-lia", v.venda_id);
    expect(r.caso.status).toBe("com_tecnologia");
    expect(r.alerta?.assinatura.checkout_versao).toBe("v3.2");
    expect(r.alerta?.venda_ids).toHaveLength(6);
    expect(r.caso.alerta_id).toBe(r.alerta?.id);
  });

  it("recusa venda inexistente", () => {
    expect(() => demo.rastro.perguntar("c-lia", "v-0")).toThrow(ErroDoRastro);
  });
});

describe("contestação e atendimento", () => {
  it("contestar manda o caso para o atendimento, e responder encerra", () => {
    const v = vendaDaLia("Treino em Casa", "2026-11-15");
    const { caso } = demo.rastro.perguntar("c-lia", v.venda_id);
    demo.relogio.ajustar(somarMinutos(HOJE, 5));
    const contestado = demo.rastro.contestar(caso.protocolo, "Ela clicou no meu link!");
    expect(contestado.status).toBe("aguardando_atendimento");
    expect(demo.rastro.filaDoAtendimento()[0].status).toBe("aguardando_atendimento");

    const sugestao = demo.rastro.respostaSugerida(caso.protocolo);
    expect(sugestao).toMatch(/^Oi, Lia!/);
    const resolvido = demo.rastro.responder(caso.protocolo, sugestao);
    expect(resolvido.status).toBe("resolvido");
    expect(resolvido.resolvido_em).toBe(somarMinutos(HOJE, 5));
  });

  it("não aceita resposta vazia", () => {
    const pendente = demo.rastro.filaDoAtendimento()[0];
    expect(() => demo.rastro.responder(pendente.protocolo, "  ")).toThrow(ErroDoRastro);
  });

  it("o histórico já tem casos esperando uma pessoa", () => {
    const aguardando = demo.rastro.filaDoAtendimento().filter((c) => c.status === "aguardando_atendimento");
    expect(aguardando.length).toBeGreaterThanOrEqual(2);
    expect(aguardando.map((c) => c.causa)).toContain("configuracao");
  });

  it("encaminhar para a tecnologia muda o status e registra a mensagem", () => {
    const pendente = demo.rastro.filaDoAtendimento()[0];
    const c = demo.rastro.encaminharParaTecnologia(pendente.protocolo);
    expect(c.status).toBe("com_tecnologia");
    expect(c.mensagens.at(-1)?.autor).toBe("atendimento");
  });
});

describe("alertas da tecnologia", () => {
  it("resolver o alerta encerra todos os casos ligados e avisa cada creator", () => {
    const [alerta] = demo.rastro.alertas();
    demo.rastro.mudarStatusDoAlerta(alerta.id, "investigando");
    expect(demo.rastro.alertas()[0].status).toBe("investigando");

    demo.rastro.mudarStatusDoAlerta(alerta.id, "resolvido");
    const ligados = demo.rastro.filaDoAtendimento().filter((c) => alerta.venda_ids.includes(c.venda_id));
    expect(ligados).toHaveLength(5);
    for (const c of ligados) {
      expect(c.status).toBe("resolvido");
      expect(c.mensagens.at(-1)?.autor).toBe("tecnologia");
    }
  });

  it("o resumo técnico tem a versão do checkout e nenhum dado pessoal", () => {
    const [alerta] = demo.rastro.alertas();
    expect(alerta.resumo_tecnico).toContain("v3.2");
    expect(alerta.comissoes_em_risco).toBeGreaterThan(0);
    const tecnico = demo.rastro.resumoTecnicoDaVenda(alerta.venda_ids[0]);
    expect(tecnico).toContain("checkout v3.2");
    expect(tecnico).not.toMatch(/\bcpf\b|e-?mail|telefone/i);
  });

  it("recusa alerta inexistente", () => {
    expect(() => demo.rastro.mudarStatusDoAlerta("alr-x", "resolvido")).toThrow(ErroDoRastro);
  });
});

describe("painel da gestão", () => {
  it("calcula os números a partir dos casos", () => {
    const p = demo.rastro.painel();
    expect(p.numeros.total).toBeGreaterThan(20);
    expect(p.numeros.percentual_sem_atendente).toBeGreaterThan(50);
    expect(p.numeros.mediana_minutos_ate_explicacao).toBe(0);
    expect(p.por_dia).toHaveLength(14);
    expect(p.prevencao[0].casos).toBeGreaterThanOrEqual(p.prevencao.at(-1)!.casos);
    expect(p.continuaram.elegiveis).toBeGreaterThan(0);
  });
});

describe("interpretar a pergunta", () => {
  it("'ontem' leva à venda de 16/11", () => {
    const v = demo.rastro.interpretarPergunta("c-lia", "Minha venda de ontem não contou");
    expect(v?.data_hora.startsWith("2026-11-16")).toBe(true);
  });

  it("o nome do produto ajuda a escolher", () => {
    const v = demo.rastro.interpretarPergunta("c-lia", "e a creatina que vendi?");
    expect(v?.produto).toContain("Creatina");
  });

  it("sem pistas, escolhe a venda mais recente que não contou", () => {
    const v = demo.rastro.interpretarPergunta("c-lia", "por que não contou?");
    expect(v?.situacao).not.toBe("contou");
  });

  it("'dia 15' com o produto leva à venda certa", () => {
    const v = demo.rastro.interpretarPergunta("c-lia", "Por que o treino do dia 15 não entrou?");
    expect(v?.data_hora.startsWith("2026-11-15")).toBe(true);
    expect(v?.produto).toContain("Treino");
  });

  it("entende dia da semana: em 17/11 (terça), 'sábado' é 14/11", () => {
    const v = demo.rastro.interpretarPergunta("c-lia", "e a venda de sábado?");
    expect(v?.data_hora.startsWith("2026-11-14")).toBe(true);
  });

  it.each(["oi", "qual o horário de atendimento?", "obrigado!"])("não escolhe venda quando a pergunta é '%s'", (pergunta) => {
    expect(demo.rastro.interpretarPergunta("c-lia", pergunta)).toBeNull();
  });
});
