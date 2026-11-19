/**
 * Portas: o que o núcleo precisa do mundo de fora, sem saber como é feito.
 * Os adaptadores (dados da demo, navegador, servidor MCP) implementam estas interfaces.
 */
import type { Afiliacao, Caso, Creator, Evento, Produto, StatusAlerta, Venda } from "../domain/tipos";

/** Leitura dos dados de vendas da plataforma. Somente leitura. */
export interface CatalogoDeVendas {
  creators(): Creator[];
  creator(id: string): Creator | undefined;
  produtos(): Produto[];
  produto(id: string): Produto | undefined;
  afiliacoes(): Afiliacao[];
  vendas(): Venda[];
  venda(id: string): Venda | undefined;
  eventosDaSessao(sessaoId: string): Evento[];
  eventos(): Evento[];
}

export interface RepositorioDeCasos {
  todos(): Caso[];
  buscar(protocolo: string): Caso | undefined;
  salvar(caso: Caso): void;
}

export interface RepositorioDeAlertas {
  status(id: string): StatusAlerta | undefined;
  definirStatus(id: string, status: StatusAlerta): void;
}

export interface Relogio {
  agora(): string;
}

export interface RespostaDoExplicador {
  /** A venda de que o creator estava falando, se deu para identificar. */
  venda_id: string | null;
  resposta: string;
  modo: "ia" | "regras";
  aviso?: string;
}

/**
 * Quem transforma uma pergunta em texto livre numa explicação.
 * Pode ser a IA (Claude com ferramentas) ou só as regras. Nos dois casos,
 * a causa vem do motor de regras.
 */
export interface Explicador {
  explicar(creatorId: string, pergunta: string): Promise<RespostaDoExplicador>;
}
