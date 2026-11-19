/**
 * Casos de uso do Rastro. É a única porta de entrada das telas, do servidor MCP
 * e da rota de IA. Não conhece React, Next.js nem a API do Claude.
 */
import { detectarAlertas, type VendaComProduto } from "../domain/alertas";
import { CAUSAS, ORDEM_DAS_CAUSAS, TIMES } from "../domain/causas";
import { diagnosticar, resumoTecnico } from "../domain/diagnostico";
import { dataHora, dia, dinheiro, somarMinutos } from "../domain/formatar";
import { casosPorDia, creatorsQueContinuaram, painelDeNumeros } from "../domain/metricas";
import type { Alerta, Caso, Creator, Diagnostico, ResumoVenda, StatusAlerta, Venda } from "../domain/tipos";
import { escolherVenda } from "./interpretar";
import type { CatalogoDeVendas, Relogio, RepositorioDeAlertas, RepositorioDeCasos } from "./portas";

export class ErroDoRastro extends Error {}

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

export class Rastro {
  constructor(
    private readonly catalogo: CatalogoDeVendas,
    private readonly casos: RepositorioDeCasos,
    private readonly estadoDosAlertas: RepositorioDeAlertas,
    private readonly relogio: Relogio,
  ) {}

  agora(): string {
    return this.relogio.agora();
  }

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
  private vendasVisiveis(creatorId: string): Venda[] {
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
    const creator = this.creator(creatorId);
    return diagnosticar({
      venda,
      creator,
      produto: this.catalogo.produto(venda.produto_id)!,
      afiliacao: this.catalogo.afiliacoes().find((a) => a.creator_id === creatorId && a.produto_id === venda.produto_id),
      eventosDaSessao: this.catalogo.eventosDaSessao(venda.sessao_id),
    });
  }

  /** Entende de qual venda o creator fala numa pergunta em texto livre. */
  interpretarPergunta(creatorId: string, pergunta: string): ResumoVenda | null {
    return escolherVenda(pergunta, this.vendasDoCreator(creatorId), this.agora());
  }

  private proximoProtocolo(): string {
    const numeros = this.casos.todos().map((c) => Number(c.protocolo.replace(/\D/g, "")) || 0);
    const proximo = Math.max(PROTOCOLO_INICIAL, ...numeros) + 1;
    return `RST-${proximo}`;
  }

  /**
   * O creator pergunta sobre uma venda. O Rastro diagnostica, explica e abre um caso.
   * Se nenhuma regra explica a venda, o caso vai direto para a tecnologia.
   */
  perguntar(creatorId: string, vendaId: string, pergunta?: string, respostaDaIA?: string): ResultadoDaPergunta {
    const diagnostico = this.diagnosticarVenda(vendaId, creatorId);
    if (!diagnostico) throw new ErroDoRastro("Venda não encontrada para este creator.");

    const existente = this.casos.todos().find((c) => c.venda_id === vendaId && c.creator_id === creatorId);
    if (existente) {
      return { caso: existente, diagnostico, alerta: this.alertaDoCaso(existente), repetida: true };
    }

    const agora = this.agora();
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

    const alerta = diagnostico.escalar ? this.alertaDoCaso(caso) : null;
    if (alerta) {
      caso.alerta_id = alerta.id;
      this.casos.salvar(caso);
    }
    return { caso, diagnostico, alerta, repetida: false };
  }

  /** O creator não concordou com a explicação e pede uma pessoa. */
  contestar(protocolo: string, relato: string): Caso {
    const caso = this.caso(protocolo);
    if (caso.status === "resolvido") throw new ErroDoRastro("Este caso já foi resolvido.");
    caso.contestado = true;
    if (caso.status === "explicado") caso.status = "aguardando_atendimento";
    caso.mensagens.push({ em: this.agora(), autor: "creator", texto: relato.trim() || "Não concordo com a explicação." });
    this.casos.salvar(caso);
    return caso;
  }

  /** O atendimento responde ao creator e encerra o caso. */
  responder(protocolo: string, texto: string): Caso {
    const caso = this.caso(protocolo);
    if (!texto.trim()) throw new ErroDoRastro("Escreva a resposta antes de enviar.");
    const agora = this.agora();
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
      em: this.agora(),
      autor: "atendimento",
      texto: "Encaminhei para a tecnologia com o diagnóstico do Rastro. Você recebe a resposta por aqui.",
    });
    this.casos.salvar(caso);
    return caso;
  }

  caso(protocolo: string): Caso {
    const caso = this.casos.buscar(protocolo);
    if (!caso) throw new ErroDoRastro(`Caso ${protocolo} não encontrado.`);
    return caso;
  }

  casosDoCreator(creatorId: string): Caso[] {
    return this.casos
      .todos()
      .filter((c) => c.creator_id === creatorId)
      .sort((a, b) => b.aberto_em.localeCompare(a.aberto_em));
  }

  /** Fila do atendimento: primeiro quem espera uma pessoa, do mais antigo para o mais novo. */
  filaDoAtendimento(): Caso[] {
    const peso: Record<Caso["status"], number> = {
      aguardando_atendimento: 0,
      com_tecnologia: 1,
      explicado: 2,
      resolvido: 3,
    };
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
    const creator = this.creator(caso.creator_id);
    const d = this.diagnosticarVenda(caso.venda_id, caso.creator_id)!;
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

  private falhasPerguntadas(): VendaComProduto[] {
    return this.casos
      .todos()
      .filter((c) => c.causa === "possivel_falha")
      .map((c) => {
        const venda = this.catalogo.venda(c.venda_id)!;
        return { venda, produto: this.catalogo.produto(venda.produto_id)!, creator_id: c.creator_id };
      });
  }

  /** Alertas para a tecnologia, formados a partir das perguntas dos creators. */
  alertas(): Alerta[] {
    const todas = this.catalogo.vendas().map((venda) => ({
      venda,
      produto: this.catalogo.produto(venda.produto_id)!,
      creator_id: venda.creator_atribuido ?? "",
    }));
    return detectarAlertas(this.falhasPerguntadas(), todas).map((a) => ({
      ...a,
      status: this.estadoDosAlertas.status(a.id) ?? a.status,
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

  /** A tecnologia muda o estado do alerta. Ao resolver, todos os casos ligados são encerrados. */
  mudarStatusDoAlerta(id: string, status: StatusAlerta): Alerta {
    const alerta = this.alertas().find((a) => a.id === id);
    if (!alerta) throw new ErroDoRastro(`Alerta ${id} não encontrado.`);
    this.estadoDosAlertas.definirStatus(id, status);

    if (status === "resolvido") {
      const agora = this.agora();
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
   * Vendas do mesmo produtor ao redor do alerta, para a tecnologia comparar
   * as que falharam com as que passaram por outra versão do checkout.
   */
  vendasAoRedorDoAlerta(id: string, margemEmMinutos = 120) {
    const alerta = this.alertas().find((a) => a.id === id);
    if (!alerta) throw new ErroDoRastro(`Alerta ${id} não encontrado.`);
    const de = somarMinutos(alerta.primeira_em, -margemEmMinutos);
    const depoisDaUltima = somarMinutos(alerta.ultima_em, margemEmMinutos);
    const agora = this.agora();
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

  resumoTecnicoDaVenda(vendaId: string): string {
    const venda = this.catalogo.venda(vendaId);
    if (!venda) throw new ErroDoRastro(`Venda ${vendaId} não encontrada.`);
    return resumoTecnico(venda, this.catalogo.eventosDaSessao(venda.sessao_id));
  }

  /** Números para a gestão e para cada time saber o que evitar. */
  painel(dias = 14) {
    const casos = this.casos.todos();
    const agora = this.agora();
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
      alertas: this.alertas(),
    };
  }
}
