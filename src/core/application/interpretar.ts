/**
 * Entende de qual venda o creator está falando, sem IA.
 * Usado no modo demonstração e como reforço quando a IA não está disponível.
 */
import { normalizar, somarMinutos } from "../domain/formatar";
import type { ResumoVenda } from "../domain/tipos";

const DIAS_DA_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

/** Dia da semana (0 = domingo) de uma data ISO, pelo calendário, sem depender do fuso. */
function diaDaSemana(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

function dataDaPergunta(pergunta: string, hoje: string): string | null {
  const p = normalizar(pergunta);
  if (/\banteontem\b/.test(p)) return somarMinutos(hoje, -2 * 24 * 60).slice(0, 10);
  if (/\bontem\b/.test(p)) return somarMinutos(hoje, -24 * 60).slice(0, 10);
  if (/\bhoje\b/.test(p)) return hoje.slice(0, 10);

  const dataCompleta = /\b(\d{1,2})\/(\d{1,2})\b/.exec(p);
  if (dataCompleta) return `${hoje.slice(0, 4)}-${dataCompleta[2].padStart(2, "0")}-${dataCompleta[1].padStart(2, "0")}`;

  const diaDoMes = /\bdia (\d{1,2})\b/.exec(p);
  if (diaDoMes) return `${hoje.slice(0, 7)}-${diaDoMes[1].padStart(2, "0")}`;

  const semana = DIAS_DA_SEMANA.findIndex((d) => new RegExp(`\\b${d}\\b`).test(p));
  if (semana >= 0) {
    // O último dia com esse nome antes de hoje.
    const atras = (diaDaSemana(hoje) - semana + 7) % 7 || 7;
    return somarMinutos(hoje, -atras * 24 * 60).slice(0, 10);
  }
  return null;
}

/** Palavras do nome do produto que aparecem na pergunta (ignora palavras curtas). */
function pontuacaoDoProduto(pergunta: string, produto: string): number {
  const p = normalizar(pergunta);
  return normalizar(produto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
    .filter((w) => p.includes(w)).length;
}

const SOBRE_VENDA =
  /\b(vend\w*|comiss\w*|cont(ou|ar|ando|abiliz\w*)|entr(ou|ar)|caiu|cai|apare\w*|link|pag(ou|amento|o)|pedido|compr\w*|sumiu|cade|atribu\w*|credit\w*|receb\w*|ganh\w*|saque)\b/;

/**
 * A pergunta é sobre uma venda ou comissão? Se não for ("oi", "qual o horário?"),
 * o Rastro não escolhe uma venda qualquer: ele pede o produto ou o dia.
 */
export function falaDeVenda(pergunta: string, vendas: ResumoVenda[], hoje: string): boolean {
  const p = normalizar(pergunta);
  if (SOBRE_VENDA.test(p)) return true;
  if (dataDaPergunta(pergunta, hoje)) return true;
  return vendas.some((v) => pontuacaoDoProduto(pergunta, v.produto) > 0);
}

/**
 * Escolhe a venda mais provável. Prioriza data e produto citados; sem pistas,
 * escolhe a venda mais recente que não contou.
 */
export function escolherVenda(pergunta: string, vendas: ResumoVenda[], hoje: string): ResumoVenda | null {
  if (vendas.length === 0 || !falaDeVenda(pergunta, vendas, hoje)) return null;
  const data = dataDaPergunta(pergunta, hoje);
  let candidatas = data ? vendas.filter((v) => v.data_hora.startsWith(data)) : vendas;
  if (candidatas.length === 0) candidatas = vendas;

  const pontuadas = candidatas
    .map((v) => ({ v, pontos: pontuacaoDoProduto(pergunta, v.produto) }))
    .sort((a, b) => b.pontos - a.pontos || b.v.data_hora.localeCompare(a.v.data_hora));
  if (pontuadas[0].pontos > 0) return pontuadas[0].v;

  const naoContou = candidatas
    .filter((v) => v.situacao !== "contou")
    .sort((a, b) => b.data_hora.localeCompare(a.data_hora));
  return naoContou[0] ?? candidatas.slice().sort((a, b) => b.data_hora.localeCompare(a.data_hora))[0];
}
