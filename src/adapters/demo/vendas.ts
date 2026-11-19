/**
 * Gera um mês de vendas fictícias com os eventos de cada sessão de compra.
 *
 * O gerador é determinístico (semente fixa): a mesma demonstração aparece no
 * navegador, nos testes, na rota de IA e no servidor MCP.
 */
import { minutosEntre, somarMinutos } from "@/core/domain/formatar";
import type { Evento, Venda } from "@/core/domain/tipos";
import { AFILIACOES, CREATORS, HOJE, PRODUTOS } from "./cadastro";

export type Desfecho = "normal" | "uso_do_link" | "regra" | "conta" | "configuracao" | "falha";

interface PlanoDeVenda {
  creator: string;
  produto: string;
  data_hora: string;
  desfecho: Desfecho;
  checkout_versao?: string;
  /** Minutos entre o clique no link e o início da compra. */
  minutosDoClique?: number;
}

/** O checkout v3.2 entrou no ar para a Nutri Max em 16/11 às 14h. */
export const INICIO_DO_INCIDENTE = "2026-11-16T14:00:00-03:00";
export const VERSAO_COM_FALHA = "v3.2";
const VERSAO_ESTAVEL = "v3.1";

/** Vendas que os dados da demonstração precisam ter, para contar a história. */
const VENDAS_DA_HISTORIA: PlanoDeVenda[] = [
  // Lia: uma venda de cada tipo para o creator principal.
  { creator: "c-lia", produto: "p-treino", data_hora: "2026-11-02T13:05:00-03:00", desfecho: "regra" },
  { creator: "c-lia", produto: "p-creatina", data_hora: "2026-11-14T16:20:00-03:00", desfecho: "normal" },
  { creator: "c-lia", produto: "p-treino", data_hora: "2026-11-15T10:41:00-03:00", desfecho: "uso_do_link", minutosDoClique: 39 },
  { creator: "c-lia", produto: "p-treino", data_hora: "2026-11-17T10:12:00-03:00", desfecho: "normal" },
  // Incidente: vendas da Nutri Max no checkout v3.2 que nunca foram atribuídas.
  { creator: "c-jv", produto: "p-whey", data_hora: "2026-11-16T14:02:00-03:00", desfecho: "falha", checkout_versao: VERSAO_COM_FALHA },
  { creator: "c-diego", produto: "p-creatina", data_hora: "2026-11-16T15:37:00-03:00", desfecho: "falha", checkout_versao: VERSAO_COM_FALHA },
  { creator: "c-jv", produto: "p-creatina", data_hora: "2026-11-16T18:20:00-03:00", desfecho: "falha", checkout_versao: VERSAO_COM_FALHA },
  { creator: "c-lia", produto: "p-whey", data_hora: "2026-11-16T20:14:00-03:00", desfecho: "falha", checkout_versao: VERSAO_COM_FALHA },
  { creator: "c-diego", produto: "p-whey", data_hora: "2026-11-16T21:48:00-03:00", desfecho: "falha", checkout_versao: VERSAO_COM_FALHA },
  { creator: "c-jv", produto: "p-whey", data_hora: "2026-11-17T09:05:00-03:00", desfecho: "falha", checkout_versao: VERSAO_COM_FALHA },
  { creator: "c-diego", produto: "p-creatina", data_hora: "2026-11-17T11:30:00-03:00", desfecho: "falha", checkout_versao: VERSAO_COM_FALHA },
  // No mesmo período, o checkout v3.1 continuou atribuindo normalmente (a v3.2 estava em liberação gradual).
  { creator: "c-lia", produto: "p-creatina", data_hora: "2026-11-16T16:45:00-03:00", desfecho: "normal" },
  { creator: "c-diego", produto: "p-whey", data_hora: "2026-11-16T19:05:00-03:00", desfecho: "normal" },
  { creator: "c-jv", produto: "p-creatina", data_hora: "2026-11-17T07:50:00-03:00", desfecho: "normal" },
  { creator: "c-jv", produto: "p-whey", data_hora: "2026-11-17T10:20:00-03:00", desfecho: "normal" },
  // Theo: afiliação pendente. Mel: conta com restrição.
  { creator: "c-theo", produto: "p-planilhas", data_hora: "2026-11-12T19:22:00-03:00", desfecho: "configuracao" },
  { creator: "c-theo", produto: "p-planilhas", data_hora: "2026-11-16T08:47:00-03:00", desfecho: "configuracao" },
  { creator: "c-mel", produto: "p-skincare", data_hora: "2026-11-10T12:15:00-03:00", desfecho: "conta" },
  { creator: "c-mel", produto: "p-serum", data_hora: "2026-11-15T17:40:00-03:00", desfecho: "conta" },
];

/** Quantas vendas aleatórias cada creator tem no mês, além das da história. */
const VOLUME: Record<string, number> = {
  "c-lia": 22,
  "c-diego": 20,
  "c-jv": 22,
  "c-bia": 18,
  "c-rafa": 14,
  "c-carla": 16,
  "c-mel": 9,
  "c-theo": 9,
};

const INICIO_DO_MES = "2026-10-19T08:00:00-03:00";

/** PRNG pequeno e determinístico (mulberry32). */
export function criarSorteio(semente: number) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    numero: proximo,
    inteiro: (min: number, max: number) => min + Math.floor(proximo() * (max - min + 1)),
    item: <T>(lista: T[]): T => lista[Math.floor(proximo() * lista.length)],
  };
}

function planejarAleatorias(): PlanoDeVenda[] {
  const sorteio = criarSorteio(2027);
  const totalDeMinutos = minutosEntre(INICIO_DO_MES, "2026-11-17T17:30:00-03:00");
  const planos: PlanoDeVenda[] = [];

  for (const creator of CREATORS) {
    const afiliacoes = AFILIACOES.filter((a) => a.creator_id === creator.id && a.status === "aprovada");
    for (let i = 0; i < VOLUME[creator.id]; i++) {
      const af = sorteio.item(afiliacoes);
      const produto = PRODUTOS.find((p) => p.id === af.produto_id)!;
      let data = somarMinutos(INICIO_DO_MES, sorteio.inteiro(0, totalDeMinutos));
      const horaDoDia = Number(data.slice(11, 13));
      if (horaDoDia < 8) data = somarMinutos(data, 9 * 60);
      // A Mel só vende antes da restrição nas vendas aleatórias.
      if (creator.conta.status === "restrita" && creator.conta.restrita_desde && data >= creator.conta.restrita_desde) {
        data = somarMinutos(creator.conta.restrita_desde, -sorteio.inteiro(60, 15 * 24 * 60));
      }
      const r = sorteio.numero();
      const desfecho: Desfecho = r < 0.11 ? "uso_do_link" : r < 0.13 ? "regra" : "normal";
      planos.push({ creator: creator.id, produto: produto.id, data_hora: data, desfecho, minutosDoClique: sorteio.inteiro(3, 240) });
    }
  }
  return planos;
}

function comissaoDe(valor: number, percentual: number) {
  return Math.round(valor * percentual) / 100;
}

/** Transforma o plano em uma venda e nos eventos da sessão de compra. */
function materializar(plano: PlanoDeVenda, numero: number): { venda: Venda; eventos: Evento[] } {
  const produto = PRODUTOS.find((p) => p.id === plano.produto)!;
  const af = AFILIACOES.find((a) => a.creator_id === plano.creator && a.produto_id === plano.produto)!;
  const id = `v-${numero}`;
  const sessao = `s-${numero}`;
  const t = plano.data_hora;
  const versao = plano.checkout_versao ?? VERSAO_ESTAVEL;
  const eventos: Evento[] = [];
  let seq = 0;
  const ev = (tipo: Evento["tipo"], data_hora: string, detalhes: Evento["detalhes"] = {}, daVenda = true) => {
    if (data_hora > HOJE) return;
    eventos.push({ id: `e-${numero}-${++seq}`, sessao_id: sessao, venda_id: daVenda ? id : null, tipo, data_hora, detalhes });
  };

  const foraDoLink = plano.desfecho === "uso_do_link";
  const minutosDoClique = plano.minutosDoClique ?? 12;
  ev("clique_link", somarMinutos(t, -minutosDoClique - 2), { link_id: af.link_id }, false);
  ev("checkout_iniciado", somarMinutos(t, -2), {
    origem: foraDoLink ? "pagina_produtor" : "link_afiliado",
    codigo_afiliado: foraDoLink ? null : af.codigo_afiliado,
    versao,
  });
  ev("pagamento_aprovado", t, { versao });

  const valor = produto.preco;
  const comissao = comissaoDe(valor, produto.comissao_percentual);
  const previsao = produto.tipo === "fisico" ? somarMinutos(t, 5 * 24 * 60) : null;
  const venda: Venda = {
    id,
    produto_id: produto.id,
    data_hora: t,
    valor,
    sessao_id: sessao,
    checkout_versao: versao,
    origem_checkout: foraDoLink ? "pagina_produtor" : "link_afiliado",
    codigo_afiliado_no_checkout: foraDoLink ? null : af.codigo_afiliado,
    creator_atribuido: null,
    comprador_coincide_com_creator: plano.desfecho === "regra",
    pedido: { status: "aprovado", previsao_entrega: previsao, entregue_em: null },
    comissao: null,
  };

  const enviar = () => {
    if (produto.tipo !== "fisico") return;
    const enviado = somarMinutos(t, 20 * 60);
    if (enviado <= HOJE) {
      venda.pedido.status = "enviado";
      ev("pedido_enviado", enviado, { previsao_entrega: previsao });
    }
    if (previsao && previsao <= HOJE) {
      venda.pedido.status = "entregue";
      venda.pedido.entregue_em = previsao;
      ev("pedido_entregue", previsao);
    }
  };

  switch (plano.desfecho) {
    case "normal": {
      venda.creator_atribuido = plano.creator;
      ev("atribuicao_afiliado", somarMinutos(t, 1), { creator_id: plano.creator });
      enviar();
      const libera = produto.tipo === "fisico" ? previsao! : somarMinutos(t, 7 * 24 * 60);
      const liberada = libera <= HOJE;
      venda.comissao = { valor: comissao, status: liberada ? "liberada" : "pendente", libera_em: libera, motivo: null };
      if (liberada) ev("comissao_liberada", libera, { valor: comissao });
      break;
    }
    case "regra":
      venda.creator_atribuido = plano.creator;
      ev("atribuicao_afiliado", somarMinutos(t, 1), { creator_id: plano.creator });
      ev("comissao_invalidada", somarMinutos(t, 2), { motivo: "autocompra" });
      venda.comissao = { valor: comissao, status: "invalidada", libera_em: null, motivo: "autocompra" };
      enviar();
      break;
    case "conta":
      ev("atribuicao_recusada", somarMinutos(t, 1), { motivo: "conta_restrita" });
      break;
    case "configuracao":
      ev("atribuicao_recusada", somarMinutos(t, 1), { motivo: "afiliacao_pendente" });
      break;
    case "uso_do_link":
    case "falha":
      break;
  }
  return { venda, eventos };
}

export interface VendasGeradas {
  vendas: Venda[];
  eventos: Evento[];
  /** Creator que divulgou cada venda (mesmo quando ela não foi atribuída). */
  donos: Record<string, string>;
  desfechos: Record<string, Desfecho>;
}

export function gerarVendas(): VendasGeradas {
  const planos = [...planejarAleatorias(), ...VENDAS_DA_HISTORIA].sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  const vendas: Venda[] = [];
  const eventos: Evento[] = [];
  const donos: Record<string, string> = {};
  const desfechos: Record<string, Desfecho> = {};
  planos.forEach((plano, i) => {
    const r = materializar(plano, 1001 + i);
    vendas.push(r.venda);
    eventos.push(...r.eventos);
    donos[r.venda.id] = plano.creator;
    desfechos[r.venda.id] = plano.desfecho;
  });
  return { vendas, eventos, donos, desfechos };
}
