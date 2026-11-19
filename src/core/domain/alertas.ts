/**
 * Detecção de falhas em grupo.
 *
 * Uma venda sem explicação pode ser azar. Várias vendas sem explicação com a mesma
 * assinatura (mesma versão de checkout, mesmo produtor) são um incidente. O Rastro
 * transforma as perguntas dos creators em um alerta para a tecnologia, antes que o
 * problema vire reclamação pública.
 */
import { dataHora, dinheiro } from "./formatar";
import type { Alerta, Produto, Venda } from "./tipos";

/** A partir de quantas vendas parecidas sem explicação o Rastro abre um alerta. */
export const MINIMO_PARA_ALERTA = 3;

export interface VendaComProduto {
  venda: Venda;
  produto: Produto;
  /** Creator que perguntou (ou que tinha o código no checkout). */
  creator_id: string;
}

function chave(v: VendaComProduto) {
  return `${v.venda.checkout_versao}|${v.produto.produtor}`;
}

function slug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Agrupa vendas com causa "possível falha" e devolve um alerta por assinatura
 * que tenha pelo menos MINIMO_PARA_ALERTA vendas.
 *
 * @param falhas vendas classificadas como possível falha
 * @param todas todas as vendas do período, para comparar com quem não falhou
 */
export function detectarAlertas(falhas: VendaComProduto[], todas: VendaComProduto[]): Alerta[] {
  const grupos = new Map<string, VendaComProduto[]>();
  for (const f of falhas) {
    const k = chave(f);
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }

  const alertas: Alerta[] = [];
  for (const grupo of grupos.values()) {
    if (grupo.length < MINIMO_PARA_ALERTA) continue;
    const ordenado = grupo.slice().sort((a, b) => a.venda.data_hora.localeCompare(b.venda.data_hora));
    const primeira = ordenado[0];
    const ultima = ordenado[ordenado.length - 1];
    const versao = primeira.venda.checkout_versao;
    const produtor = primeira.produto.produtor;

    const idsComFalha = new Set(grupo.map((g) => g.venda.id));
    const mesmoPeriodo = todas.filter(
      (t) =>
        t.produto.produtor === produtor &&
        !idsComFalha.has(t.venda.id) &&
        t.venda.data_hora >= primeira.venda.data_hora &&
        t.venda.data_hora <= ultima.venda.data_hora,
    );
    const outrasVersoesOk = mesmoPeriodo.filter(
      (t) => t.venda.checkout_versao !== versao && t.venda.creator_atribuido !== null,
    ).length;

    const comissoes = grupo.reduce(
      (soma, g) => soma + Math.round(g.venda.valor * g.produto.comissao_percentual) / 100,
      0,
    );

    alertas.push({
      id: `alr-${slug(versao)}-${slug(produtor)}`,
      titulo: `Vendas sem atribuição no checkout ${versao}`,
      assinatura: { checkout_versao: versao, produtor },
      venda_ids: ordenado.map((g) => g.venda.id),
      creator_ids: [...new Set(ordenado.map((g) => g.creator_id))],
      produtos: [...new Set(ordenado.map((g) => g.produto.nome))],
      primeira_em: primeira.venda.data_hora,
      ultima_em: ultima.venda.data_hora,
      comissoes_em_risco: Math.round(comissoes * 100) / 100,
      status: "aberto",
      resumo_tecnico:
        `${grupo.length} vendas de ${produtor} com código de afiliado no checkout e pagamento aprovado, ` +
        `sem evento de atribuição nem de recusa. Todas passaram pelo checkout ${versao}, ` +
        `entre ${dataHora(primeira.venda.data_hora)} e ${dataHora(ultima.venda.data_hora)}. ` +
        `No mesmo período, ${outrasVersoesOk} vendas do mesmo produtor em outras versões do checkout foram atribuídas normalmente. ` +
        `Comissões em risco: ${dinheiro(Math.round(comissoes * 100) / 100)}. ` +
        `Hipótese: o checkout ${versao} não emite o evento de atribuição depois do pagamento aprovado.`,
    });
  }
  return alertas.sort((a, b) => b.venda_ids.length - a.venda_ids.length);
}
