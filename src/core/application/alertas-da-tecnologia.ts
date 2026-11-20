/**
 * Alertas da tecnologia: perguntas parecidas sem explicação viram um incidente.
 * Ver docs/adr/0004-falhas-em-grupo-viram-alerta.md.
 */
import { detectarAlertas, type VendaComProduto } from "../domain/alertas";
import { dinheiro, somarMinutos } from "../domain/formatar";
import type { Alerta, Caso, StatusAlerta } from "../domain/tipos";
import { ErroDoRastro } from "./erros";
import type { CatalogoDeVendas, Relogio, RepositorioDeAlertas, RepositorioDeCasos } from "./portas";

export class AlertasDaTecnologia {
  constructor(
    private readonly catalogo: CatalogoDeVendas,
    private readonly casos: RepositorioDeCasos,
    private readonly estado: RepositorioDeAlertas,
    private readonly relogio: Relogio,
  ) {}

  private falhasPerguntadas(): VendaComProduto[] {
    return this.casos
      .todos()
      .filter((c) => c.causa === "possivel_falha")
      .map((c) => {
        const venda = this.catalogo.venda(c.venda_id)!;
        return { venda, produto: this.catalogo.produto(venda.produto_id)!, creator_id: c.creator_id };
      });
  }

  /** Alertas formados a partir das perguntas dos creators, com o estado salvo. */
  alertas(): Alerta[] {
    const todas = this.catalogo.vendas().map((venda) => ({
      venda,
      produto: this.catalogo.produto(venda.produto_id)!,
      creator_id: venda.creator_atribuido ?? "",
    }));
    return detectarAlertas(this.falhasPerguntadas(), todas).map((a) => ({
      ...a,
      status: this.estado.status(a.id) ?? a.status,
    }));
  }

  alertaDoCaso(caso: Caso): Alerta | null {
    return this.alertas().find((a) => a.venda_ids.includes(caso.venda_id)) ?? null;
  }

  /** Casos com possível falha que ainda não formam um alerta (vendas isoladas). */
  falhasIsoladas(): Caso[] {
    const emAlerta = new Set(this.alertas().flatMap((a) => a.venda_ids));
    return this.casos.todos().filter((c) => c.causa === "possivel_falha" && !emAlerta.has(c.venda_id));
  }

  /** Muda o estado do alerta. Ao resolver, todos os casos ligados são encerrados com resposta ao creator. */
  mudarStatus(id: string, status: StatusAlerta): Alerta {
    const alerta = this.alertas().find((a) => a.id === id);
    if (!alerta) throw new ErroDoRastro(`Alerta ${id} não encontrado.`);
    this.estado.definirStatus(id, status);

    if (status === "resolvido") {
      const agora = this.relogio.agora();
      for (const caso of this.casos.todos().filter((c) => alerta.venda_ids.includes(c.venda_id))) {
        if (caso.status === "resolvido") continue;
        const venda = this.catalogo.venda(caso.venda_id)!;
        const produto = this.catalogo.produto(venda.produto_id)!;
        const comissao = Math.round(venda.valor * produto.comissao_percentual) / 100;
        caso.status = "resolvido";
        caso.resolvido_em = agora;
        caso.alerta_id = id;
        caso.mensagens.push({
          em: agora,
          autor: "tecnologia",
          texto:
            `Corrigimos a falha no checkout ${venda.checkout_versao}. A venda de ${produto.nome} foi reprocessada e atribuída a você, ` +
            `e a comissão de ${dinheiro(comissao)} entra no prazo normal de liberação.`,
        });
        this.casos.salvar(caso);
      }
    }
    return { ...alerta, status };
  }

  /**
   * Vendas do mesmo produtor ao redor do alerta, para comparar as que falharam
   * com as que passaram por outra versão do checkout.
   */
  vendasAoRedor(id: string, margemEmMinutos = 120) {
    const alerta = this.alertas().find((a) => a.id === id);
    if (!alerta) throw new ErroDoRastro(`Alerta ${id} não encontrado.`);
    const de = somarMinutos(alerta.primeira_em, -margemEmMinutos);
    const depoisDaUltima = somarMinutos(alerta.ultima_em, margemEmMinutos);
    const agora = this.relogio.agora();
    const ate = agora > depoisDaUltima ? agora : depoisDaUltima;
    const noAlerta = new Set(alerta.venda_ids);
    return this.catalogo
      .vendas()
      .filter((v) => v.data_hora >= de && v.data_hora <= ate)
      .map((v) => ({ venda: v, produto: this.catalogo.produto(v.produto_id)! }))
      .filter((x) => x.produto.produtor === alerta.assinatura.produtor)
      .map(({ venda, produto }) => ({
        venda_id: venda.id,
        produto: produto.nome,
        data_hora: venda.data_hora,
        checkout_versao: venda.checkout_versao,
        no_alerta: noAlerta.has(venda.id),
        sem_atribuicao: venda.creator_atribuido === null && venda.codigo_afiliado_no_checkout !== null,
      }))
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  }
}
