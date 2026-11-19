/**
 * Monta a demonstração completa: catálogo de vendas e um mês de perguntas ao Rastro.
 *
 * O histórico de casos não é escrito à mão: ele é produzido rodando os próprios
 * casos de uso do núcleo com um relógio ajustável. Assim, o que aparece nas telas
 * é exatamente o que o motor de regras diria.
 */
import { Rastro } from "@/core/application/rastro";
import { minutosEntre, somarMinutos } from "@/core/domain/formatar";
import type { Caso, StatusAlerta } from "@/core/domain/tipos";
import { CasosEmMemoria, CatalogoEmMemoria, EstadoDeAlertasEmMemoria, RelogioAjustavel } from "../memoria";
import { AFILIACOES, CREATORS, HOJE, PRODUTOS } from "./cadastro";
import { criarSorteio, gerarVendas } from "./vendas";

export { CREATOR_PRINCIPAL, HOJE } from "./cadastro";

let catalogoUnico: CatalogoEmMemoria | null = null;

/** Catálogo da demonstração. É imutável, então pode ser compartilhado. */
export function catalogoDaDemo(): CatalogoEmMemoria {
  if (!catalogoUnico) {
    const { vendas, eventos } = gerarVendas();
    catalogoUnico = new CatalogoEmMemoria({ creators: CREATORS, produtos: PRODUTOS, afiliacoes: AFILIACOES, vendas, eventos });
  }
  return catalogoUnico;
}

export interface EstadoInicial {
  casos: Caso[];
  alertas: Record<string, StatusAlerta>;
}

function vendaDaHistoria(creator: string, produto: string, data_hora: string) {
  const v = catalogoDaDemo()
    .vendas()
    .find((x) => x.produto_id === produto && x.data_hora === data_hora);
  if (!v) throw new Error(`Venda da história não encontrada: ${creator} ${produto} ${data_hora}`);
  return v.id;
}

/** Ações do histórico, aplicadas em ordem cronológica. */
type Acao =
  | { em: string; tipo: "perguntar"; creator: string; venda: string; pergunta?: string }
  | { em: string; tipo: "contestar"; venda: string; relato: string }
  | { em: string; tipo: "responder"; venda: string }
  | { em: string; tipo: "alerta"; status: StatusAlerta };

const PERGUNTAS = [
  "Minha venda não apareceu no painel. O que aconteceu?",
  "Por que essa venda não contou?",
  "Vendi e não caiu comissão nenhuma. Pode ver?",
  "Essa venda não entrou pra mim, pode conferir?",
  "Cadê a comissão dessa venda?",
];

const CONTESTACOES = [
  "Mas a pessoa comprou pelo meu link, ela me mandou print do clique.",
  "Não concordo. Quero que alguém confira essa venda.",
  "Ela disse que usou meu link. Dá para ver de novo?",
];

/** Gera o histórico de um mês de perguntas, contestações e respostas. */
export function estadoInicialDaDemo(): EstadoInicial {
  const catalogo = catalogoDaDemo();
  const { donos } = gerarVendas();
  const relogio = new RelogioAjustavel(HOJE);
  const casos = new CasosEmMemoria();
  const alertas = new EstadoDeAlertasEmMemoria();
  const rastro = new Rastro(catalogo, casos, alertas, relogio);
  const sorteio = criarSorteio(1117);

  const acoes: Acao[] = [];
  const daHistoria = new Set<string>();
  const historia = (creator: string, produto: string, data: string) => {
    const id = vendaDaHistoria(creator, produto, data);
    daHistoria.add(id);
    return id;
  };

  // Vendas da história que ficam sem pergunta, para quem testa a demo perguntar.
  historia("c-lia", "p-creatina", "2026-11-14T16:20:00-03:00");
  historia("c-lia", "p-treino", "2026-11-15T10:41:00-03:00");
  historia("c-lia", "p-whey", "2026-11-16T20:14:00-03:00");
  historia("c-lia", "p-treino", "2026-11-17T10:12:00-03:00");
  historia("c-diego", "p-creatina", "2026-11-17T11:30:00-03:00");

  // Lia já perguntou sobre a autocompra e aceitou a explicação.
  acoes.push({ em: "2026-11-03T10:20:00-03:00", tipo: "perguntar", creator: "c-lia", venda: historia("c-lia", "p-treino", "2026-11-02T13:05:00-03:00"), pergunta: "Comprei o treino pelo meu link e não ganhei comissão. Por quê?" });

  // Incidente: cinco perguntas que formam o alerta para a tecnologia.
  const incidente: [string, string, string, string][] = [
    ["c-jv", "p-whey", "2026-11-16T14:02:00-03:00", "2026-11-16T19:10:00-03:00"],
    ["c-diego", "p-creatina", "2026-11-16T15:37:00-03:00", "2026-11-16T22:30:00-03:00"],
    ["c-jv", "p-creatina", "2026-11-16T18:20:00-03:00", "2026-11-17T08:15:00-03:00"],
    ["c-diego", "p-whey", "2026-11-16T21:48:00-03:00", "2026-11-17T09:40:00-03:00"],
    ["c-jv", "p-whey", "2026-11-17T09:05:00-03:00", "2026-11-17T12:05:00-03:00"],
  ];
  for (const [creator, produto, data, em] of incidente) {
    acoes.push({ em, tipo: "perguntar", creator, venda: historia(creator, produto, data) });
  }

  // Theo: afiliação pendente, a segunda pergunta virou contestação.
  acoes.push({ em: "2026-11-13T09:00:00-03:00", tipo: "perguntar", creator: "c-theo", venda: historia("c-theo", "p-planilhas", "2026-11-12T19:22:00-03:00") });
  const theo = historia("c-theo", "p-planilhas", "2026-11-16T08:47:00-03:00");
  acoes.push({ em: "2026-11-16T19:30:00-03:00", tipo: "perguntar", creator: "c-theo", venda: theo });
  acoes.push({ em: "2026-11-16T19:34:00-03:00", tipo: "contestar", venda: theo, relato: "Já faz 11 dias que pedi a afiliação e o produtor não responde. Vocês conseguem cobrar?" });

  // Mel: conta com restrição. Contestou e o atendimento respondeu.
  const mel = historia("c-mel", "p-skincare", "2026-11-10T12:15:00-03:00");
  acoes.push({ em: "2026-11-10T20:00:00-03:00", tipo: "perguntar", creator: "c-mel", venda: mel });
  acoes.push({ em: "2026-11-10T20:06:00-03:00", tipo: "contestar", venda: mel, relato: "Não recebi nenhum aviso de restrição. Quero entender o que aconteceu." });
  acoes.push({ em: "2026-11-11T10:30:00-03:00", tipo: "responder", venda: mel });
  acoes.push({ em: "2026-11-15T21:00:00-03:00", tipo: "perguntar", creator: "c-mel", venda: historia("c-mel", "p-serum", "2026-11-15T17:40:00-03:00") });

  // Demais perguntas do mês, sorteadas entre as vendas que não contaram.
  const comuns: { venda: string; em: string }[] = [];
  for (const v of catalogo.vendas()) {
    if (daHistoria.has(v.id)) continue;
    const dono = donos[v.id];
    const d = rastro.diagnosticarVenda(v.id, dono);
    if (!d) continue;
    const chance = d.causa === "venda_contabilizada" ? (d.comissao.status === "pendente" ? 0.12 : 0) : 0.75;
    if (sorteio.numero() >= chance) continue;
    const em = somarMinutos(v.data_hora, sorteio.inteiro(120, 3 * 24 * 60));
    // Quem ainda não perguntou até agora fica sem caso: é uma venda para testar na demo.
    if (minutosEntre(em, HOJE) < 30) continue;
    acoes.push({ em, tipo: "perguntar", creator: dono, venda: v.id, pergunta: sorteio.item(PERGUNTAS) });
    comuns.push({ venda: v.id, em });
  }

  // Algumas explicações de uso do link foram contestadas e respondidas por uma pessoa.
  const contestaveis = comuns
    .filter((c) => rastro.diagnosticarVenda(c.venda, donos[c.venda])?.causa === "uso_do_link")
    .sort((a, b) => a.em.localeCompare(b.em));
  const pendente = contestaveis.pop();
  for (const c of contestaveis.filter((_, i) => i % 3 === 0)) {
    acoes.push({ em: somarMinutos(c.em, 25), tipo: "contestar", venda: c.venda, relato: sorteio.item(CONTESTACOES) });
    acoes.push({ em: somarMinutos(c.em, sorteio.inteiro(180, 20 * 60)), tipo: "responder", venda: c.venda });
  }
  if (pendente) {
    acoes.push({ em: somarMinutos(pendente.em, 12), tipo: "contestar", venda: pendente.venda, relato: CONTESTACOES[0] });
  }

  // Aplica tudo em ordem, com o relógio no momento de cada ação.
  acoes.sort((a, b) => a.em.localeCompare(b.em));
  const protocoloDa = new Map<string, string>();
  for (const a of acoes) {
    const em = a.em > HOJE ? HOJE : a.em;
    relogio.ajustar(em);
    if (a.tipo === "perguntar") {
      const r = rastro.perguntar(a.creator, a.venda, a.pergunta);
      protocoloDa.set(a.venda, r.caso.protocolo);
    } else if (a.tipo === "contestar") {
      rastro.contestar(protocoloDa.get(a.venda)!, a.relato);
    } else if (a.tipo === "responder") {
      const p = protocoloDa.get(a.venda)!;
      rastro.responder(p, rastro.respostaSugerida(p));
    }
  }

  return { casos: casos.todos(), alertas: alertas.comoObjeto() };
}

/** Cria um Rastro completo em memória, já com o histórico. Útil para testes e para o MCP. */
export function criarRastroDaDemo(momento: string = HOJE) {
  const estado = estadoInicialDaDemo();
  const relogio = new RelogioAjustavel(momento);
  const casos = new CasosEmMemoria(estado.casos);
  const alertas = new EstadoDeAlertasEmMemoria(estado.alertas);
  return { rastro: new Rastro(catalogoDaDemo(), casos, alertas, relogio), relogio, casos, alertas };
}

/** Creator que divulgou a venda (mesmo quando ela não foi atribuída). */
export function donoDaVenda(vendaId: string): string | undefined {
  return gerarVendas().donos[vendaId];
}
