/**
 * Casos do atendimento: a pergunta do creator vira um caso, que pode ser explicado
 * pelo Rastro, contestado, respondido por uma pessoa ou levado à tecnologia.
 */
import { dataHora, dia } from "../domain/formatar";
import type { Alerta, Caso, Creator, Diagnostico } from "../domain/tipos";
import type { AlertasDaTecnologia } from "./alertas-da-tecnologia";
import type { ConsultaDeVendas } from "./consultas";
import { ErroDoRastro } from "./erros";
import type { Relogio, RepositorioDeCasos } from "./portas";

export interface ResultadoDaPergunta {
  caso: Caso;
  diagnostico: Diagnostico;
  alerta: Alerta | null;
  /** true quando o creator já tinha perguntado sobre essa venda. */
  repetida: boolean;
}

const PROTOCOLO_INICIAL = 2400;

function primeiroNome(creator: Creator) {
  return creator.nome.split(" ")[0];
}

export class CasosDoAtendimento {
  constructor(
    private readonly consulta: ConsultaDeVendas,
    private readonly casos: RepositorioDeCasos,
    private readonly alertas: AlertasDaTecnologia,
    private readonly relogio: Relogio,
  ) {}

  private proximoProtocolo(): string {
    const numeros = this.casos.todos().map((c) => Number(c.protocolo.replace(/\D/g, "")) || 0);
    return `RST-${Math.max(PROTOCOLO_INICIAL, ...numeros) + 1}`;
  }

  /**
   * O creator pergunta sobre uma venda. O Rastro diagnostica, explica e abre um caso.
   * Se nenhuma regra explica a venda, o caso vai direto para a tecnologia.
   */
  perguntar(creatorId: string, vendaId: string, pergunta?: string, respostaDaIA?: string): ResultadoDaPergunta {
    const diagnostico = this.consulta.diagnosticarVenda(vendaId, creatorId);
    if (!diagnostico) throw new ErroDoRastro("Venda não encontrada para este creator.");

    const existente = this.casos.todos().find((c) => c.venda_id === vendaId && c.creator_id === creatorId);
    if (existente) {
      return { caso: existente, diagnostico, alerta: this.alertas.alertaDoCaso(existente), repetida: true };
    }

    const agora = this.relogio.agora();
    const caso: Caso = {
      protocolo: this.proximoProtocolo(),
      venda_id: vendaId,
      creator_id: creatorId,
      causa: diagnostico.causa,
      time_responsavel: diagnostico.time_responsavel,
      status: diagnostico.escalar ? "com_tecnologia" : "explicado",
      aberto_em: agora,
      explicado_em: agora,
      resolvido_em: null,
      contestado: false,
      alerta_id: null,
      mensagens: [
        {
          em: agora,
          autor: "creator",
          texto: pergunta?.trim() || `Por que a venda de ${diagnostico.produto} em ${dataHora(diagnostico.data_hora)} não contou?`,
        },
        {
          em: agora,
          autor: "rastro",
          texto: respostaDaIA?.trim() || `${diagnostico.explicacao} ${diagnostico.proximo_passo}`,
        },
      ],
    };
    this.casos.salvar(caso);

    const alerta = diagnostico.escalar ? this.alertas.alertaDoCaso(caso) : null;
    if (alerta) {
      caso.alerta_id = alerta.id;
      this.casos.salvar(caso);
    }
    return { caso, diagnostico, alerta, repetida: false };
  }

  caso(protocolo: string): Caso {
    const caso = this.casos.buscar(protocolo);
    if (!caso) throw new ErroDoRastro(`Caso ${protocolo} não encontrado.`);
    return caso;
  }

  /** O creator não concordou com a explicação e pede uma pessoa. */
  contestar(protocolo: string, relato: string): Caso {
    const caso = this.caso(protocolo);
    if (caso.status === "resolvido") throw new ErroDoRastro("Este caso já foi resolvido.");
    caso.contestado = true;
    if (caso.status === "explicado") caso.status = "aguardando_atendimento";
    caso.mensagens.push({ em: this.relogio.agora(), autor: "creator", texto: relato.trim() || "Não concordo com a explicação." });
    this.casos.salvar(caso);
    return caso;
  }

  /** O atendimento responde ao creator e encerra o caso. */
  responder(protocolo: string, texto: string): Caso {
    const caso = this.caso(protocolo);
    if (!texto.trim()) throw new ErroDoRastro("Escreva a resposta antes de enviar.");
    const agora = this.relogio.agora();
    caso.mensagens.push({ em: agora, autor: "atendimento", texto: texto.trim() });
    caso.status = "resolvido";
    caso.resolvido_em = agora;
    this.casos.salvar(caso);
    return caso;
  }

  /** O atendimento manda o caso para a tecnologia, com o diagnóstico anexado. */
  encaminharParaTecnologia(protocolo: string): Caso {
    const caso = this.caso(protocolo);
    caso.status = "com_tecnologia";
    caso.mensagens.push({
      em: this.relogio.agora(),
      autor: "atendimento",
      texto: "Encaminhei para a tecnologia com o diagnóstico do Rastro. Você recebe a resposta por aqui.",
    });
    this.casos.salvar(caso);
    return caso;
  }

  casosDoCreator(creatorId: string): Caso[] {
    return this.casos
      .todos()
      .filter((c) => c.creator_id === creatorId)
      .sort((a, b) => b.aberto_em.localeCompare(a.aberto_em));
  }

  /** Fila do atendimento: primeiro quem espera uma pessoa, do mais antigo para o mais novo. */
  fila(): Caso[] {
    const peso: Record<Caso["status"], number> = { aguardando_atendimento: 0, com_tecnologia: 1, explicado: 2, resolvido: 3 };
    return this.casos
      .todos()
      .slice()
      .sort((a, b) =>
        peso[a.status] !== peso[b.status]
          ? peso[a.status] - peso[b.status]
          : a.status === "aguardando_atendimento"
            ? a.aberto_em.localeCompare(b.aberto_em)
            : b.aberto_em.localeCompare(a.aberto_em),
      );
  }

  /** Texto que o atendimento pode enviar, já preenchido com o diagnóstico. */
  respostaSugerida(protocolo: string): string {
    const caso = this.caso(protocolo);
    const creator = this.consulta.creator(caso.creator_id);
    const d = this.consulta.diagnosticarVenda(caso.venda_id, caso.creator_id)!;
    const nome = primeiroNome(creator);
    switch (d.causa) {
      case "uso_do_link":
        return (
          `Oi, ${nome}! Conferimos a venda de ${d.produto} em ${dataHora(d.data_hora)}. ` +
          "O seu link recebeu o clique, mas a compra foi finalizada pela página do produtor, sem o seu código, e por isso não foi atribuída. " +
          "Para as próximas, peça para o cliente concluir a compra na mesma aba aberta pelo seu link. Vou te mandar um guia curto para compartilhar com quem compra."
        );
      case "configuracao":
        return (
          `Oi, ${nome}! Pedimos ao produtor ${d.produtor} que analise a sua afiliação a ${d.produto}. ` +
          "Assim que ele aprovar, as vendas pelo seu link passam a contar. Te avisamos por aqui."
        );
      case "conta":
        return (
          `Oi, ${nome}! A sua conta está com restrição desde ${dia(creator.conta.restrita_desde ?? d.data_hora)}` +
          (creator.conta.motivo_restricao ? `, por ${creator.conta.motivo_restricao}` : "") +
          ". Abrimos o pedido de revisão com o time de Operações e te respondemos por aqui em até 2 dias úteis."
        );
      case "possivel_falha":
        return (
          `Oi, ${nome}! Confirmamos que a venda de ${d.produto} passou pelo seu link e não foi atribuída por uma falha nossa. ` +
          "O time de tecnologia já está corrigindo e a comissão será gerada assim que a venda for reprocessada."
        );
      default:
        return `Oi, ${nome}! ${d.explicacao} ${d.proximo_passo}`;
    }
  }
}
