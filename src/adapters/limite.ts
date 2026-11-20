/**
 * Limite de perguntas por origem, para a rota de IA não virar uma fonte de custo aberta.
 *
 * Janela deslizante em memória. Numa função serverless cada instância tem a sua memória,
 * então é uma proteção de melhor esforço; em produção, o mesmo contrato seria implementado
 * com um armazenamento compartilhado (Redis, por exemplo). Ver docs/adr/0006-limite-de-uso-da-ia.md.
 */
export interface Limitador {
  /** true se a origem ainda pode perguntar agora. Registra a tentativa. */
  permitir(origem: string, agoraMs?: number): boolean;
}

export class LimitePorJanela implements Limitador {
  private readonly tentativas = new Map<string, number[]>();

  constructor(
    private readonly maximo: number,
    private readonly janelaMs: number,
  ) {}

  permitir(origem: string, agoraMs: number = Date.now()): boolean {
    const desde = agoraMs - this.janelaMs;
    const recentes = (this.tentativas.get(origem) ?? []).filter((t) => t > desde);
    if (recentes.length >= this.maximo) {
      this.tentativas.set(origem, recentes);
      return false;
    }
    recentes.push(agoraMs);
    this.tentativas.set(origem, recentes);
    if (this.tentativas.size > 5000) this.limpar(desde);
    return true;
  }

  private limpar(desde: number) {
    for (const [origem, ts] of this.tentativas) {
      if (ts.every((t) => t <= desde)) this.tentativas.delete(origem);
    }
  }
}

/** 10 perguntas por minuto por origem. */
export const limiteDaRotaDeIA = new LimitePorJanela(10, 60_000);

/** Origem do pedido a partir dos cabeçalhos do proxy (Vercel), sem guardar nada além disso. */
export function origemDoPedido(req: Request): string {
  const encaminhado = req.headers.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "desconhecida";
}
