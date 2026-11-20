/**
 * Consultas sobre vendas: o que o creator enxerga e o diagnóstico de cada venda.
 * Só leitura; não abre nem altera casos.
 */
import { diagnosticar, resumoTecnico } from "../domain/diagnostico";
import type { Creator, Diagnostico, ResumoVenda, Venda } from "../domain/tipos";
import { ErroDoRastro } from "./erros";
import { escolherVenda } from "./interpretar";
import type { CatalogoDeVendas, Relogio } from "./portas";

export class ConsultaDeVendas {
  constructor(
    private readonly catalogo: CatalogoDeVendas,
    private readonly relogio: Relogio,
  ) {}

  creators(): Creator[] {
    return this.catalogo.creators();
  }

  creator(id: string): Creator {
    const c = this.catalogo.creator(id);
    if (!c) throw new ErroDoRastro(`Creator ${id} não encontrado.`);
    return c;
  }

  /**
   * Vendas que o creator enxerga: atribuídas a ele, com o código dele no checkout
   * ou numa sessão em que houve clique no link dele.
   */
  vendasVisiveis(creatorId: string): Venda[] {
    const minhas = this.catalogo.afiliacoes().filter((a) => a.creator_id === creatorId);
    const links = new Set(minhas.map((a) => a.link_id));
    const codigos = new Set(minhas.map((a) => a.codigo_afiliado));
    const sessoes = new Set(
      this.catalogo
        .eventos()
        .filter((e) => e.tipo === "clique_link" && links.has(String(e.detalhes.link_id)))
        .map((e) => e.sessao_id),
    );
    return this.catalogo
      .vendas()
      .filter(
        (v) =>
          v.creator_atribuido === creatorId ||
          (v.codigo_afiliado_no_checkout !== null && codigos.has(v.codigo_afiliado_no_checkout)) ||
          sessoes.has(v.sessao_id),
      );
  }

  /** Lista de vendas do creator, da mais recente para a mais antiga. Sem dados do comprador. */
  vendasDoCreator(creatorId: string): ResumoVenda[] {
    return this.vendasVisiveis(creatorId)
      .map((v): ResumoVenda => {
        const produto = this.catalogo.produto(v.produto_id)!;
        const atribuida = v.creator_atribuido === creatorId;
        const situacao: ResumoVenda["situacao"] = !atribuida
          ? "nao_contou"
          : v.comissao?.status === "liberada"
            ? "contou"
            : v.comissao?.status === "pendente"
              ? "comissao_pendente"
              : "sem_comissao";
        return {
          venda_id: v.id,
          produto: produto.nome,
          data_hora: v.data_hora,
          valor: v.valor,
          situacao,
          comissao: atribuida ? (v.comissao?.valor ?? null) : null,
        };
      })
      .sort((a, b) => b.data_hora.localeCompare(a.data_hora));
  }

  /** Diagnóstico de uma venda. Só diagnostica vendas que o creator enxerga. */
  diagnosticarVenda(vendaId: string, creatorId: string): Diagnostico | null {
    const venda = this.vendasVisiveis(creatorId).find((v) => v.id === vendaId);
    if (!venda) return null;
    return diagnosticar({
      venda,
      creator: this.creator(creatorId),
      produto: this.catalogo.produto(venda.produto_id)!,
      afiliacao: this.catalogo.afiliacoes().find((a) => a.creator_id === creatorId && a.produto_id === venda.produto_id),
      eventosDaSessao: this.catalogo.eventosDaSessao(venda.sessao_id),
    });
  }

  /** Entende de qual venda o creator fala numa pergunta em texto livre. */
  interpretarPergunta(creatorId: string, pergunta: string): ResumoVenda | null {
    return escolherVenda(pergunta, this.vendasDoCreator(creatorId), this.relogio.agora());
  }

  resumoTecnicoDaVenda(vendaId: string): string {
    const venda = this.catalogo.venda(vendaId);
    if (!venda) throw new ErroDoRastro(`Venda ${vendaId} não encontrada.`);
    return resumoTecnico(venda, this.catalogo.eventosDaSessao(venda.sessao_id));
  }
}
