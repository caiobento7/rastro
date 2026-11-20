import type { Explicador, RespostaDoExplicador } from "@/core/application/portas";
import type { Rastro } from "@/core/application/rastro";

/** Resposta quando a pergunta não é sobre uma venda: o Rastro não chuta uma venda qualquer. */
export const FORA_DO_ASSUNTO =
  "Eu explico vendas e comissões. Me diga o produto ou o dia da venda, por exemplo: \"minha venda de ontem não contou\".";

/**
 * Explicador sem IA: identifica a venda pela pergunta e devolve o texto do próprio diagnóstico.
 * É o modo da demonstração publicada e a rede de segurança quando a API falha.
 */
export class ExplicadorDeRegras implements Explicador {
  constructor(private readonly rastro: Rastro) {}

  async explicar(creatorId: string, pergunta: string, aviso?: string): Promise<RespostaDoExplicador> {
    if (this.rastro.vendasDoCreator(creatorId).length === 0) {
      return { venda_id: null, resposta: "Não encontrei vendas ligadas a você.", modo: "regras", aviso };
    }
    const venda = this.rastro.interpretarPergunta(creatorId, pergunta);
    if (!venda) return { venda_id: null, resposta: FORA_DO_ASSUNTO, modo: "regras", aviso };

    const d = this.rastro.diagnosticarVenda(venda.venda_id, creatorId)!;
    return {
      venda_id: d.venda_id,
      resposta: `${d.titulo}. ${d.explicacao} ${d.proximo_passo}`,
      modo: "regras",
      aviso,
    };
  }
}
