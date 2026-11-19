/**
 * Motor de regras do Rastro: a fonte da verdade sobre por que uma venda contou ou não.
 *
 * Quem decide a causa é este código determinístico e testado. A IA nunca decide:
 * ela só busca os dados, chama este motor e explica o resultado com outras palavras.
 */
import { CAUSAS } from "./causas";
import { dataHora, dia, dinheiro, hora } from "./formatar";
import type {
  Afiliacao,
  Causa,
  Creator,
  Diagnostico,
  Evento,
  Evidencia,
  PassoDaTrilha,
  Produto,
  Venda,
} from "./tipos";

export interface ContextoDaVenda {
  venda: Venda;
  creator: Creator;
  produto: Produto;
  afiliacao: Afiliacao | undefined;
  /** Todos os eventos da sessão de compra, inclusive o clique no link. */
  eventosDaSessao: Evento[];
}

/** As regras rodam nesta ordem. A primeira que bater define a causa. */
export function classificar(ctx: ContextoDaVenda): Causa {
  const { venda, creator, produto, afiliacao } = ctx;
  const tipos = new Set(ctx.eventosDaSessao.filter((e) => e.venda_id === venda.id).map((e) => e.tipo));

  const restritaNaHoraDaVenda =
    creator.conta.status !== "ativa" &&
    (creator.conta.restrita_desde === null || venda.data_hora >= creator.conta.restrita_desde);
  if (restritaNaHoraDaVenda) return "conta";
  if (!afiliacao || afiliacao.status !== "aprovada") return "configuracao";
  if (venda.comprador_coincide_com_creator) return "regra";
  if (!venda.codigo_afiliado_no_checkout) return "uso_do_link";
  if (produto.tipo === "fisico" && venda.pedido.entregue_em === null && venda.comissao?.status === "pendente") {
    return "prazo";
  }
  if (tipos.has("pagamento_aprovado") && !tipos.has("atribuicao_afiliado") && !tipos.has("atribuicao_recusada")) {
    return "possivel_falha";
  }
  return "venda_contabilizada";
}

function passoDoEvento(e: Evento): PassoDaTrilha {
  const base = { data_hora: e.data_hora };
  switch (e.tipo) {
    case "clique_link":
      return { ...base, rotulo: "Clique no seu link", estado: "ok" };
    case "checkout_iniciado":
      return e.detalhes.origem === "pagina_produtor"
        ? { ...base, rotulo: "Compra iniciada pela página do produtor, sem o seu código", estado: "problema" }
        : { ...base, rotulo: `Compra iniciada com o seu código ${e.detalhes.codigo_afiliado}`, estado: "ok" };
    case "pagamento_aprovado":
      return { ...base, rotulo: "Pagamento aprovado", estado: "ok" };
    case "atribuicao_afiliado":
      return { ...base, rotulo: "Venda atribuída a você", estado: "ok" };
    case "atribuicao_recusada":
      return e.detalhes.motivo === "conta_restrita"
        ? { ...base, rotulo: "Venda não atribuída: sua conta está com restrição", estado: "problema" }
        : { ...base, rotulo: "Venda não atribuída: afiliação aguardando o produtor", estado: "problema" };
    case "comissao_invalidada":
      return { ...base, rotulo: "Comissão não gerada: compra com os dados do próprio afiliado", estado: "problema" };
    case "pedido_enviado":
      return { ...base, rotulo: "Pedido enviado", estado: "ok" };
    case "pedido_entregue":
      return { ...base, rotulo: "Pedido entregue", estado: "ok" };
    case "comissao_liberada":
      return { ...base, rotulo: `Comissão de ${dinheiro(Number(e.detalhes.valor))} liberada`, estado: "ok" };
  }
}

export function montarTrilha(ctx: ContextoDaVenda, causa: Causa): PassoDaTrilha[] {
  const passos = ctx.eventosDaSessao
    .slice()
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .map(passoDoEvento);

  if (causa === "possivel_falha") {
    passos.push({ data_hora: null, rotulo: "Atribuição da venda: não registrada", estado: "faltando" });
  }
  if (causa === "prazo" && ctx.venda.pedido.previsao_entrega) {
    passos.push({
      data_hora: ctx.venda.pedido.previsao_entrega,
      rotulo: "Entrega prevista, e a comissão libera em seguida",
      estado: "pendente",
    });
  }
  if (causa === "venda_contabilizada" && ctx.venda.comissao?.status === "pendente" && ctx.venda.comissao.libera_em) {
    passos.push({
      data_hora: ctx.venda.comissao.libera_em,
      rotulo: "Fim da garantia de 7 dias, e a comissão libera",
      estado: "pendente",
    });
  }
  return passos;
}

interface Textos {
  titulo: string;
  explicacao: string;
  proximo_passo: string;
  evidencias: Evidencia[];
}

function textos(ctx: ContextoDaVenda, causa: Causa): Textos {
  const { venda, creator, produto, afiliacao } = ctx;
  const doCheckout = ctx.eventosDaSessao.filter((e) => e.venda_id === venda.id);
  const clique = ctx.eventosDaSessao.find((e) => e.tipo === "clique_link");
  const checkout = doCheckout.find((e) => e.tipo === "checkout_iniciado");
  const comissao = venda.comissao ? dinheiro(venda.comissao.valor) : "a comissão";

  switch (causa) {
    case "venda_contabilizada": {
      const liberada = venda.comissao?.status === "liberada";
      return {
        titulo: "A venda contou",
        explicacao:
          `A venda de ${produto.nome} em ${dataHora(venda.data_hora)} foi atribuída a você. ` +
          (liberada
            ? `A comissão de ${comissao} já foi liberada.`
            : `A comissão de ${comissao} libera depois da garantia de 7 dias${venda.comissao?.libera_em ? `, em ${dia(venda.comissao.libera_em)}` : ""}.`),
        proximo_passo: "Nada a fazer: está tudo certo com esta venda.",
        evidencias: [
          { fato: `Compra feita com o seu código ${venda.codigo_afiliado_no_checkout}`, decisiva: false },
          { fato: "Venda atribuída a você", decisiva: true },
          { fato: liberada ? `Comissão de ${comissao} liberada` : `Comissão de ${comissao} na garantia`, decisiva: false },
        ],
      };
    }
    case "uso_do_link":
      return {
        titulo: "A compra não passou pelo seu link",
        explicacao:
          (clique ? `Houve um clique no seu link em ${dataHora(clique.data_hora)}, mas a ` : "A ") +
          `compra foi iniciada${checkout ? ` às ${hora(checkout.data_hora)}` : ""} pela página do produtor, sem o seu código de afiliado. ` +
          "Sem o código no checkout, a plataforma não tem como atribuir a venda a você.",
        proximo_passo:
          "Peça para o cliente concluir a compra na mesma aba aberta pelo seu link, sem voltar pelo perfil ou pelo site do produtor.",
        evidencias: [
          ...(clique ? [{ fato: `Clique no seu link em ${dataHora(clique.data_hora)}`, decisiva: false }] : []),
          { fato: "Checkout aberto pela página do produtor, sem código de afiliado", decisiva: true },
        ],
      };
    case "regra":
      return {
        titulo: "Esta venda não gera comissão por uma regra do programa",
        explicacao:
          "A compra passou pelo seu link e foi registrada, mas os dados de quem comprou coincidem com os seus. " +
          "Pelas regras do programa de afiliados, compras feitas pelo próprio afiliado não geram comissão.",
        proximo_passo: "Seu link está funcionando: as vendas para outras pessoas continuam contando normalmente.",
        evidencias: [
          { fato: `Compra feita com o seu código ${venda.codigo_afiliado_no_checkout}`, decisiva: false },
          { fato: "Dados do comprador coincidem com os do afiliado", decisiva: true },
        ],
      };
    case "prazo":
      return {
        titulo: "A venda é sua. A comissão libera na entrega",
        explicacao:
          `A venda de ${produto.nome} foi atribuída a você em ${dataHora(venda.data_hora)}. ` +
          `Como é um produto físico, a comissão de ${comissao} fica pendente até o pedido ser entregue` +
          (venda.pedido.previsao_entrega ? `, e a entrega está prevista para ${dia(venda.pedido.previsao_entrega)}.` : "."),
        proximo_passo: "Não precisa fazer nada. Quando a entrega for confirmada, a comissão aparece como liberada.",
        evidencias: [
          { fato: "Venda atribuída a você", decisiva: false },
          {
            fato: venda.pedido.previsao_entrega
              ? `Pedido enviado, entrega prevista para ${dia(venda.pedido.previsao_entrega)}`
              : "Pedido ainda não entregue",
            decisiva: false,
          },
          { fato: "Produto físico: a comissão libera depois da entrega", decisiva: true },
        ],
      };
    case "conta":
      return {
        titulo: "Sua conta de afiliado está com restrição",
        explicacao:
          `Desde ${dia(creator.conta.restrita_desde ?? venda.data_hora)}, sua conta está com restrição` +
          (creator.conta.motivo_restricao ? ` (${creator.conta.motivo_restricao})` : "") +
          `. Enquanto a restrição estiver ativa, as vendas pelo seu link não geram comissão, e por isso a venda de ${dia(venda.data_hora)} não foi atribuída a você.`,
        proximo_passo:
          "Revise a política de divulgação e peça a revisão da restrição. Se ela for retirada, as próximas vendas voltam a contar.",
        evidencias: [
          { fato: `Conta com restrição desde ${dia(creator.conta.restrita_desde ?? venda.data_hora)}`, decisiva: true },
          { fato: "Atribuição recusada pela restrição da conta", decisiva: false },
        ],
      };
    case "configuracao":
      return {
        titulo: "Sua afiliação a este produto ainda não foi aprovada",
        explicacao:
          (afiliacao
            ? `Você pediu afiliação a ${produto.nome} em ${dia(afiliacao.solicitada_em)}, mas o produtor (${produto.produtor}) ainda não aprovou. `
            : `Você não está afiliado a ${produto.nome}. `) +
          "Sem a aprovação, as vendas pelo seu link não são atribuídas a você.",
        proximo_passo:
          "O Rastro avisou o atendimento ao produtor para lembrar a aprovação. Até lá, as vendas deste produto não geram comissão.",
        evidencias: [
          {
            fato: afiliacao
              ? `Afiliação pedida em ${dia(afiliacao.solicitada_em)} e ainda pendente no produtor`
              : "Nenhuma afiliação a este produto",
            decisiva: true,
          },
          { fato: "Atribuição recusada por falta de aprovação", decisiva: false },
        ],
      };
    case "possivel_falha":
      return {
        titulo: "Os dados não explicam esta venda",
        explicacao:
          `A compra passou pelo seu link e o pagamento foi aprovado em ${dataHora(venda.data_hora)}, com o seu código ${venda.codigo_afiliado_no_checkout}. ` +
          "Mesmo assim, a venda não foi atribuída a você, e nenhuma regra explica isso. Pode ser uma falha da plataforma.",
        proximo_passo: "O caso já foi para o time de tecnologia com este diagnóstico. Você não precisa juntar prints.",
        evidencias: [
          ...(clique ? [{ fato: `Clique no seu link em ${dataHora(clique.data_hora)}`, decisiva: false }] : []),
          { fato: `Seu código ${venda.codigo_afiliado_no_checkout} chegou ao checkout`, decisiva: false },
          { fato: "Pagamento aprovado", decisiva: false },
          { fato: "Nenhum registro de atribuição nem de recusa", decisiva: true },
        ],
      };
  }
}

/** Monta o diagnóstico completo de uma venda para um creator. */
export function diagnosticar(ctx: ContextoDaVenda): Diagnostico {
  const causa = classificar(ctx);
  const t = textos(ctx, causa);
  const falha = causa === "possivel_falha";
  return {
    venda_id: ctx.venda.id,
    creator_id: ctx.creator.id,
    produto: ctx.produto.nome,
    produtor: ctx.produto.produtor,
    valor: ctx.venda.valor,
    data_hora: ctx.venda.data_hora,
    causa,
    titulo: t.titulo,
    explicacao: t.explicacao,
    proximo_passo: t.proximo_passo,
    evidencias: t.evidencias,
    confianca: falha ? "baixa" : "alta",
    escalar: falha,
    time_responsavel: CAUSAS[causa].time,
    comissao: {
      valor: ctx.venda.comissao?.valor ?? null,
      status: ctx.venda.comissao?.status ?? "nao_gerada",
    },
    trilha: montarTrilha(ctx, causa),
  };
}

/** Resumo técnico para a tecnologia. Usa só ids e eventos, nunca dados do comprador. */
export function resumoTecnico(venda: Venda, eventosDaSessao: Evento[]): string {
  const presentes = eventosDaSessao
    .slice()
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .map((e) => `${e.tipo} (${hora(e.data_hora)})`)
    .join(", ");
  return (
    `Venda ${venda.id}, sessão ${venda.sessao_id}, checkout ${venda.checkout_versao}, ` +
    `código ${venda.codigo_afiliado_no_checkout ?? "nenhum"}. Eventos: ${presentes}. ` +
    "Ausentes: atribuicao_afiliado e atribuicao_recusada."
  );
}
