/**
 * Fachada dos casos de uso do Rastro: a única porta de entrada das telas, do servidor MCP
 * e da rota de IA. Não conhece React, Next.js nem a API do Claude.
 *
 * Cada responsabilidade mora no seu módulo:
 * - ConsultaDeVendas: o que o creator enxerga e o diagnóstico de cada venda;
 * - CasosDoAtendimento: perguntar, contestar, responder e encaminhar;
 * - AlertasDaTecnologia: falhas parecidas viram um incidente;
 * - PainelDaGestao: os números e a prevenção por time.
 * A fachada só monta os módulos com as mesmas portas e delega.
 */
import type { Alerta, Caso, Creator, Diagnostico, ResumoVenda, StatusAlerta } from "../domain/tipos";
import { AlertasDaTecnologia } from "./alertas-da-tecnologia";
import { CasosDoAtendimento, type ResultadoDaPergunta } from "./atendimento";
import { ConsultaDeVendas } from "./consultas";
import { PainelDaGestao } from "./painel-da-gestao";
import type { CatalogoDeVendas, Relogio, RepositorioDeAlertas, RepositorioDeCasos } from "./portas";

export { ErroDoRastro } from "./erros";
export type { ResultadoDaPergunta } from "./atendimento";

export class Rastro {
  private readonly consulta: ConsultaDeVendas;
  private readonly atendimento: CasosDoAtendimento;
  private readonly tecnologia: AlertasDaTecnologia;
  private readonly gestao: PainelDaGestao;

  constructor(
    catalogo: CatalogoDeVendas,
    casos: RepositorioDeCasos,
    estadoDosAlertas: RepositorioDeAlertas,
    private readonly relogio: Relogio,
  ) {
    this.consulta = new ConsultaDeVendas(catalogo, relogio);
    this.tecnologia = new AlertasDaTecnologia(catalogo, casos, estadoDosAlertas, relogio);
    this.atendimento = new CasosDoAtendimento(this.consulta, casos, this.tecnologia, relogio);
    this.gestao = new PainelDaGestao(catalogo, casos, this.tecnologia, relogio);
  }

  agora(): string {
    return this.relogio.agora();
  }

  // Consultas
  creators(): Creator[] {
    return this.consulta.creators();
  }
  creator(id: string): Creator {
    return this.consulta.creator(id);
  }
  vendasDoCreator(creatorId: string): ResumoVenda[] {
    return this.consulta.vendasDoCreator(creatorId);
  }
  diagnosticarVenda(vendaId: string, creatorId: string): Diagnostico | null {
    return this.consulta.diagnosticarVenda(vendaId, creatorId);
  }
  interpretarPergunta(creatorId: string, pergunta: string): ResumoVenda | null {
    return this.consulta.interpretarPergunta(creatorId, pergunta);
  }
  resumoTecnicoDaVenda(vendaId: string): string {
    return this.consulta.resumoTecnicoDaVenda(vendaId);
  }

  // Atendimento
  perguntar(creatorId: string, vendaId: string, pergunta?: string, respostaDaIA?: string): ResultadoDaPergunta {
    return this.atendimento.perguntar(creatorId, vendaId, pergunta, respostaDaIA);
  }
  contestar(protocolo: string, relato: string): Caso {
    return this.atendimento.contestar(protocolo, relato);
  }
  responder(protocolo: string, texto: string): Caso {
    return this.atendimento.responder(protocolo, texto);
  }
  encaminharParaTecnologia(protocolo: string): Caso {
    return this.atendimento.encaminharParaTecnologia(protocolo);
  }
  caso(protocolo: string): Caso {
    return this.atendimento.caso(protocolo);
  }
  casosDoCreator(creatorId: string): Caso[] {
    return this.atendimento.casosDoCreator(creatorId);
  }
  filaDoAtendimento(): Caso[] {
    return this.atendimento.fila();
  }
  respostaSugerida(protocolo: string): string {
    return this.atendimento.respostaSugerida(protocolo);
  }

  // Tecnologia
  alertas(): Alerta[] {
    return this.tecnologia.alertas();
  }
  alertaDoCaso(caso: Caso): Alerta | null {
    return this.tecnologia.alertaDoCaso(caso);
  }
  falhasIsoladas(): Caso[] {
    return this.tecnologia.falhasIsoladas();
  }
  mudarStatusDoAlerta(id: string, status: StatusAlerta): Alerta {
    return this.tecnologia.mudarStatus(id, status);
  }
  vendasAoRedorDoAlerta(id: string, margemEmMinutos = 120) {
    return this.tecnologia.vendasAoRedor(id, margemEmMinutos);
  }

  // Gestão
  painel(dias = 14) {
    return this.gestao.montar(dias);
  }
}
