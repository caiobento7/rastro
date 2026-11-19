import type { Explicador, RespostaDoExplicador } from "@/core/application/portas";
import type { Rastro } from "@/core/application/rastro";

/**
 * Explicador sem IA: identifica a venda pela pergunta e devolve o texto do próprio diagnóstico.
 * É o modo da demonstração publicada e a rede de segurança quando a API falha.
 */
export class ExplicadorDeRegras implements Explicador {
  constructor(private readonly rastro: Rastro) {}

  async explicar(creatorId: string, pergunta: string, aviso?: string): Promise<RespostaDoExplicador> {
    const venda = this.rastro.interpretarPergunta(creatorId, pergunta);
    if (!venda) {
      return { venda_id: null, resposta: "Não encontrei vendas ligadas a você.", modo: "regras", aviso };
    }
    const d = this.rastro.diagnosticarVenda(venda.venda_id, creatorId)!;
    return {
      venda_id: d.venda_id,
      resposta: `${d.titulo}. ${d.explicacao} ${d.proximo_passo}`,
      modo: "regras",
      aviso,
    };
  }
}
