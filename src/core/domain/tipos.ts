/**
 * Modelo de domínio do Rastro.
 *
 * Tudo aqui é TypeScript puro: nada de React, Next.js, banco ou IA.
 * As datas são strings ISO 8601 com fuso (ex.: 2026-11-16T20:14:00-03:00).
 */

/** As causas que explicam por que uma venda contou ou não contou. */
export type Causa =
  | "venda_contabilizada"
  | "uso_do_link"
  | "regra"
  | "prazo"
  | "conta"
  | "configuracao"
  | "possivel_falha";

/** Times da YouShop que podem evitar que uma causa se repita. */
export type TimeId =
  | "atendimento_creator"
  | "atendimento_produtor"
  | "marketing_conteudo"
  | "produto"
  | "operacoes"
  | "tecnologia";

export interface Creator {
  id: string;
  nome: string;
  usuario: string;
  nicho: string;
  conta: {
    status: "ativa" | "restrita";
    restrita_desde: string | null;
    motivo_restricao: string | null;
  };
}

export interface Produto {
  id: string;
  nome: string;
  tipo: "digital" | "fisico";
  produtor: string;
  preco: number;
  comissao_percentual: number;
  comissao_libera: "apos_7_dias_de_garantia" | "apos_entrega";
}

export interface Afiliacao {
  id: string;
  creator_id: string;
  produto_id: string;
  status: "aprovada" | "pendente_aprovacao_produtor";
  solicitada_em: string;
  aprovada_em: string | null;
  link_id: string;
  codigo_afiliado: string;
}

export interface Comissao {
  valor: number;
  status: "liberada" | "pendente" | "invalidada";
  libera_em: string | null;
  motivo: string | null;
}

export interface Venda {
  id: string;
  produto_id: string;
  data_hora: string;
  valor: number;
  sessao_id: string;
  /** Versão do checkout que processou a compra. Ajuda a achar falhas em grupo. */
  checkout_versao: string;
  origem_checkout: "link_afiliado" | "pagina_produtor";
  codigo_afiliado_no_checkout: string | null;
  creator_atribuido: string | null;
  /** O sistema guarda só se os dados coincidem. Nunca os dados do comprador. */
  comprador_coincide_com_creator: boolean;
  pedido: {
    status: "aprovado" | "enviado" | "entregue";
    previsao_entrega: string | null;
    entregue_em: string | null;
  };
  comissao: Comissao | null;
}

export type TipoEvento =
  | "clique_link"
  | "checkout_iniciado"
  | "pagamento_aprovado"
  | "atribuicao_afiliado"
  | "atribuicao_recusada"
  | "comissao_invalidada"
  | "pedido_enviado"
  | "pedido_entregue"
  | "comissao_liberada";

export interface Evento {
  id: string;
  sessao_id: string;
  venda_id: string | null;
  tipo: TipoEvento;
  data_hora: string;
  detalhes: Record<string, string | number | null>;
}

/** Um passo do caminho da venda, como o creator vê. */
export interface PassoDaTrilha {
  data_hora: string | null;
  rotulo: string;
  estado: "ok" | "problema" | "faltando" | "pendente";
}

/** Um fato que sustenta o diagnóstico. A evidência decisiva é a que aparece grifada. */
export interface Evidencia {
  fato: string;
  decisiva: boolean;
}

export interface Diagnostico {
  venda_id: string;
  creator_id: string;
  produto: string;
  produtor: string;
  valor: number;
  data_hora: string;
  causa: Causa;
  titulo: string;
  explicacao: string;
  proximo_passo: string;
  evidencias: Evidencia[];
  confianca: "alta" | "baixa";
  /** true quando nenhuma regra explica a venda e o caso precisa de uma pessoa. */
  escalar: boolean;
  time_responsavel: TimeId;
  comissao: { valor: number | null; status: Comissao["status"] | "nao_gerada" };
  trilha: PassoDaTrilha[];
}

/** O que o creator vê na lista de vendas. Nenhum dado do comprador. */
export interface ResumoVenda {
  venda_id: string;
  produto: string;
  data_hora: string;
  valor: number;
  situacao: "contou" | "comissao_pendente" | "sem_comissao" | "nao_contou";
  comissao: number | null;
}

export type StatusCaso =
  | "explicado"
  | "aguardando_atendimento"
  | "com_tecnologia"
  | "resolvido";

export type AutorMensagem = "creator" | "rastro" | "atendimento" | "tecnologia";

export interface MensagemDoCaso {
  em: string;
  autor: AutorMensagem;
  texto: string;
}

/** Um caso nasce quando o creator pergunta ao Rastro sobre uma venda. */
export interface Caso {
  protocolo: string;
  venda_id: string;
  creator_id: string;
  causa: Causa;
  time_responsavel: TimeId;
  status: StatusCaso;
  aberto_em: string;
  explicado_em: string;
  resolvido_em: string | null;
  /** O creator discordou da explicação e pediu uma pessoa. */
  contestado: boolean;
  alerta_id: string | null;
  mensagens: MensagemDoCaso[];
}

export type StatusAlerta = "aberto" | "investigando" | "resolvido";

/** Vendas parecidas sem explicação, agrupadas para o time de tecnologia. */
export interface Alerta {
  id: string;
  titulo: string;
  assinatura: { checkout_versao: string; produtor: string };
  venda_ids: string[];
  creator_ids: string[];
  produtos: string[];
  primeira_em: string;
  ultima_em: string;
  comissoes_em_risco: number;
  status: StatusAlerta;
  resumo_tecnico: string;
}
