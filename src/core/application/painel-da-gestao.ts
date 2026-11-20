/** Números para a gestão e para cada time saber qual causa pode evitar. */
import { CAUSAS, ORDEM_DAS_CAUSAS, TIMES } from "../domain/causas";
import { somarMinutos } from "../domain/formatar";
import { casosPorDia, creatorsQueContinuaram, painelDeNumeros } from "../domain/metricas";
import type { AlertasDaTecnologia } from "./alertas-da-tecnologia";
import type { CatalogoDeVendas, Relogio, RepositorioDeCasos } from "./portas";

export class PainelDaGestao {
  constructor(
    private readonly catalogo: CatalogoDeVendas,
    private readonly casos: RepositorioDeCasos,
    private readonly alertas: AlertasDaTecnologia,
    private readonly relogio: Relogio,
  ) {}

  montar(dias = 14) {
    const casos = this.casos.todos();
    const agora = this.relogio.agora();
    const datas = Array.from({ length: dias }, (_, i) => somarMinutos(agora, -(dias - 1 - i) * 24 * 60).slice(0, 10));
    const numeros = painelDeNumeros(casos);
    const porCausa = new Map(numeros.por_causa.map((x) => [x.causa, x.casos]));
    return {
      numeros,
      continuaram: creatorsQueContinuaram(casos, this.catalogo.vendas(), agora),
      por_dia: casosPorDia(casos, datas),
      prevencao: ORDEM_DAS_CAUSAS.filter((c) => c !== "venda_contabilizada")
        .map((causa) => ({
          causa,
          nome: CAUSAS[causa].nome,
          time: TIMES[CAUSAS[causa].time],
          prevencao: CAUSAS[causa].prevencao,
          casos: porCausa.get(causa) ?? 0,
          percentual: numeros.total ? Math.round(((porCausa.get(causa) ?? 0) / numeros.total) * 100) : 0,
        }))
        .sort((a, b) => b.casos - a.casos),
      alertas: this.alertas.alertas(),
    };
  }
}
