/**
 * Formatação em português, sem depender do fuso do servidor.
 * As datas do domínio já vêm com o fuso de Brasília, então a hora é lida da própria string.
 */

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function partes(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return { ano: m[1], mes: m[2], dia: m[3], hora: m[4] ?? "00", minuto: m[5] ?? "00" };
}

/** 16/11 */
export function dia(iso: string): string {
  const p = partes(iso);
  return `${p.dia}/${p.mes}`;
}

/** 16 de nov */
export function diaPorExtenso(iso: string): string {
  const p = partes(iso);
  return `${Number(p.dia)} de ${MESES[Number(p.mes) - 1]}`;
}

/** 20:14 */
export function hora(iso: string): string {
  const p = partes(iso);
  return `${p.hora}:${p.minuto}`;
}

/** 16/11 às 20:14 */
export function dataHora(iso: string): string {
  return `${dia(iso)} às ${hora(iso)}`;
}

/** R$ 1.234,56 */
export function dinheiro(valor: number): string {
  const [inteiro, centavos] = Math.abs(valor).toFixed(2).split(".");
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}R$ ${comPontos},${centavos}`;
}

/** Remove acentos e caixa para comparar textos digitados pelo creator. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Diferença em minutos entre duas datas ISO. */
export function minutosEntre(inicio: string, fim: string): number {
  return Math.round((Date.parse(fim) - Date.parse(inicio)) / 60000);
}

/** Soma minutos a uma data ISO mantendo o fuso de Brasília (-03:00). */
export function somarMinutos(iso: string, minutos: number): string {
  const alvo = new Date(Date.parse(iso) + minutos * 60000 - 3 * 3600000);
  const dois = (n: number) => String(n).padStart(2, "0");
  return (
    `${alvo.getUTCFullYear()}-${dois(alvo.getUTCMonth() + 1)}-${dois(alvo.getUTCDate())}` +
    `T${dois(alvo.getUTCHours())}:${dois(alvo.getUTCMinutes())}:00-03:00`
  );
}

/** "há 5 min", "há 3 h", "há 2 dias" em relação a uma data de referência. */
export function haQuantoTempo(iso: string, agora: string): string {
  const min = minutosEntre(iso, agora);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

/** Duração legível: "2 min", "3 h 20 min", "4 dias". */
export function duracao(minutos: number): string {
  if (minutos < 60) return `${Math.max(1, Math.round(minutos))} min`;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "1 dia" : `${d} dias`;
}
