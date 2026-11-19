/**
 * Adaptadores em memória para as portas do núcleo.
 * Usados pela demonstração no navegador, pelos testes e pelo servidor MCP.
 */
import type { CatalogoDeVendas, Relogio, RepositorioDeAlertas, RepositorioDeCasos } from "@/core/application/portas";
import type { Afiliacao, Caso, Creator, Evento, Produto, StatusAlerta, Venda } from "@/core/domain/tipos";

export interface DadosDoCatalogo {
  creators: Creator[];
  produtos: Produto[];
  afiliacoes: Afiliacao[];
  vendas: Venda[];
  eventos: Evento[];
}

export class CatalogoEmMemoria implements CatalogoDeVendas {
  private readonly porSessao = new Map<string, Evento[]>();
  private readonly vendasPorId: Map<string, Venda>;
  private readonly produtosPorId: Map<string, Produto>;
  private readonly creatorsPorId: Map<string, Creator>;

  constructor(private readonly dados: DadosDoCatalogo) {
    for (const e of dados.eventos) {
      this.porSessao.set(e.sessao_id, [...(this.porSessao.get(e.sessao_id) ?? []), e]);
    }
    this.vendasPorId = new Map(dados.vendas.map((v) => [v.id, v]));
    this.produtosPorId = new Map(dados.produtos.map((p) => [p.id, p]));
    this.creatorsPorId = new Map(dados.creators.map((c) => [c.id, c]));
  }

  creators() {
    return this.dados.creators;
  }
  creator(id: string) {
    return this.creatorsPorId.get(id);
  }
  produtos() {
    return this.dados.produtos;
  }
  produto(id: string) {
    return this.produtosPorId.get(id);
  }
  afiliacoes() {
    return this.dados.afiliacoes;
  }
  vendas() {
    return this.dados.vendas;
  }
  venda(id: string) {
    return this.vendasPorId.get(id);
  }
  eventos() {
    return this.dados.eventos;
  }
  eventosDaSessao(sessaoId: string) {
    return this.porSessao.get(sessaoId) ?? [];
  }
}

/** Guarda cópias, para quem lê não alterar o caso sem passar pelo caso de uso. */
export class CasosEmMemoria implements RepositorioDeCasos {
  private readonly casos = new Map<string, Caso>();

  constructor(iniciais: Caso[] = []) {
    for (const c of iniciais) this.casos.set(c.protocolo, structuredClone(c));
  }
  todos() {
    return [...this.casos.values()].map((c) => structuredClone(c));
  }
  buscar(protocolo: string) {
    const c = this.casos.get(protocolo);
    return c ? structuredClone(c) : undefined;
  }
  salvar(caso: Caso) {
    this.casos.set(caso.protocolo, structuredClone(caso));
  }
}

export class EstadoDeAlertasEmMemoria implements RepositorioDeAlertas {
  private readonly estados: Map<string, StatusAlerta>;

  constructor(iniciais: Record<string, StatusAlerta> = {}) {
    this.estados = new Map(Object.entries(iniciais));
  }
  status(id: string) {
    return this.estados.get(id);
  }
  definirStatus(id: string, status: StatusAlerta) {
    this.estados.set(id, status);
  }
  comoObjeto(): Record<string, StatusAlerta> {
    return Object.fromEntries(this.estados);
  }
}

export class RelogioAjustavel implements Relogio {
  constructor(private momento: string) {}
  agora() {
    return this.momento;
  }
  ajustar(momento: string) {
    this.momento = momento;
  }
}
