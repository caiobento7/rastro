/**
 * Os números que dizem se o Rastro funciona. Todos são calculados a partir
 * dos casos e das vendas, nunca digitados à mão.
 */
import { ORDEM_DAS_CAUSAS } from "./causas";
import { minutosEntre } from "./formatar";
import type { Caso, Causa, TimeId, Venda } from "./tipos";

export function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const v = valores.slice().sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/** O caso foi explicado sem que nenhuma pessoa do atendimento precisasse agir. */
export function semAtendente(caso: Caso): boolean {
  return !caso.contestado && !caso.mensagens.some((m) => m.autor === "atendimento");
}

export interface PainelDeNumeros {
  total: number;
  explicados_sem_atendente: number;
  percentual_sem_atendente: number;
  mediana_minutos_ate_explicacao: number;
  aguardando_atendimento: number;
  com_tecnologia: number;
  por_causa: { causa: Causa; casos: number }[];
  por_time: { time: TimeId; casos: number }[];
}

export function painelDeNumeros(casos: Caso[]): PainelDeNumeros {
  const sem = casos.filter(semAtendente).length;
  const porCausa = new Map<Causa, number>();
  const porTime = new Map<TimeId, number>();
  for (const c of casos) {
    porCausa.set(c.causa, (porCausa.get(c.causa) ?? 0) + 1);
    porTime.set(c.time_responsavel, (porTime.get(c.time_responsavel) ?? 0) + 1);
  }
  return {
    total: casos.length,
    explicados_sem_atendente: sem,
    percentual_sem_atendente: casos.length ? Math.round((sem / casos.length) * 100) : 0,
    mediana_minutos_ate_explicacao: mediana(casos.map((c) => minutosEntre(c.aberto_em, c.explicado_em))),
    aguardando_atendimento: casos.filter((c) => c.status === "aguardando_atendimento").length,
    com_tecnologia: casos.filter((c) => c.status === "com_tecnologia").length,
    por_causa: ORDEM_DAS_CAUSAS.map((causa) => ({ causa, casos: porCausa.get(causa) ?? 0 })).filter((x) => x.casos > 0),
    por_time: [...porTime.entries()].map(([time, n]) => ({ time, casos: n })).sort((a, b) => b.casos - a.casos),
  };
}

/**
 * Dos creators que perguntaram sobre uma venda há pelo menos `dias` dias,
 * quantos fizeram uma nova venda atribuída depois disso. É o número que mostra confiança.
 */
export function creatorsQueContinuaram(
  casos: Caso[],
  vendas: Venda[],
  agora: string,
  dias = 7,
): { elegiveis: number; continuaram: number; percentual: number } {
  const limite = dias * 24 * 60;
  const primeiro = new Map<string, string>();
  for (const c of casos) {
    if (minutosEntre(c.aberto_em, agora) < limite) continue;
    const atual = primeiro.get(c.creator_id);
    if (!atual || c.aberto_em < atual) primeiro.set(c.creator_id, c.aberto_em);
  }
  let continuaram = 0;
  for (const [creator, desde] of primeiro) {
    if (vendas.some((v) => v.creator_atribuido === creator && v.data_hora > desde)) continuaram++;
  }
  const elegiveis = primeiro.size;
  return { elegiveis, continuaram, percentual: elegiveis ? Math.round((continuaram / elegiveis) * 100) : 0 };
}

/** Casos por dia, por causa, para o gráfico da gestão. */
export function casosPorDia(casos: Caso[], datas: string[]): ({ dia: string } & Partial<Record<Causa, number>>)[] {
  return datas.map((d) => {
    const linha: { dia: string } & Partial<Record<Causa, number>> = { dia: d };
    for (const c of casos) {
      if (c.aberto_em.slice(0, 10) === d) linha[c.causa] = (linha[c.causa] ?? 0) + 1;
    }
    return linha;
  });
}
