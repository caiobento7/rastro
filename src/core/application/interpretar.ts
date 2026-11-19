/**
 * Entende de qual venda o creator está falando, sem IA.
 * Usado no modo demonstração e como reforço quando a IA não está disponível.
 */
import { normalizar, somarMinutos } from "../domain/formatar";
import type { ResumoVenda } from "../domain/tipos";

function dataDaPergunta(pergunta: string, hoje: string): string | null {
  const p = normalizar(pergunta);
  if (/\banteontem\b/.test(p)) return somarMinutos(hoje, -2 * 24 * 60).slice(0, 10);
  if (/\bontem\b/.test(p)) return somarMinutos(hoje, -24 * 60).slice(0, 10);
  if (/\bhoje\b/.test(p)) return hoje.slice(0, 10);
  const m = /\b(\d{1,2})\/(\d{1,2})\b/.exec(p);
  if (m) return `${hoje.slice(0, 4)}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
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

/**
 * Escolhe a venda mais provável. Prioriza data e produto citados; sem pistas,
 * escolhe a venda mais recente que não contou.
 */
export function escolherVenda(pergunta: string, vendas: ResumoVenda[], hoje: string): ResumoVenda | null {
  if (vendas.length === 0) return null;
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
