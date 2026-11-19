import type { Causa, TimeId } from "./tipos";

export interface Time {
  id: TimeId;
  nome: string;
}

export const TIMES: Record<TimeId, Time> = {
  atendimento_creator: { id: "atendimento_creator", nome: "Atendimento ao creator" },
  atendimento_produtor: { id: "atendimento_produtor", nome: "Atendimento ao produtor" },
  marketing_conteudo: { id: "marketing_conteudo", nome: "Marketing e Conteúdo" },
  produto: { id: "produto", nome: "Produto" },
  operacoes: { id: "operacoes", nome: "Operações" },
  tecnologia: { id: "tecnologia", nome: "Tecnologia" },
};

export interface InfoCausa {
  causa: Causa;
  nome: string;
  /** Uma frase curta que o creator entende sem contexto. */
  resumo: string;
  /** O time que consegue evitar que essa causa se repita. */
  time: TimeId;
  /** O que esse time pode fazer para a causa parar de gerar chamados. */
  prevencao: string;
}

/**
 * Cada causa tem um time dono. É assim que um chamado de creator vira
 * uma melhoria para quem pode evitá-lo.
 */
export const CAUSAS: Record<Causa, InfoCausa> = {
  venda_contabilizada: {
    causa: "venda_contabilizada",
    nome: "A venda contou",
    resumo: "A venda foi atribuída ao creator e a comissão segue o fluxo normal.",
    time: "produto",
    prevencao: "Deixar o estado de cada venda mais claro no painel, para o creator não precisar perguntar.",
  },
  uso_do_link: {
    causa: "uso_do_link",
    nome: "Compra fora do link",
    resumo: "O cliente clicou no link, mas concluiu a compra por outro caminho, sem o código.",
    time: "marketing_conteudo",
    prevencao: "Guia curto de como o cliente deve comprar, no onboarding e ao copiar o link.",
  },
  regra: {
    causa: "regra",
    nome: "Regra do programa",
    resumo: "Uma regra do programa de afiliados impede a comissão, como a autocompra.",
    time: "produto",
    prevencao: "Mostrar a regra de autocompra no momento em que o creator copia o link.",
  },
  prazo: {
    causa: "prazo",
    nome: "Prazo de liberação",
    resumo: "A venda é do creator, mas a comissão só libera depois da entrega ou da garantia.",
    time: "produto",
    prevencao: "Mostrar na própria venda a data prevista de liberação da comissão.",
  },
  conta: {
    causa: "conta",
    nome: "Conta com restrição",
    resumo: "A conta do creator está com restrição, e as vendas não geram comissão.",
    time: "operacoes",
    prevencao: "Avisar a restrição no painel, com o motivo e o caminho para pedir revisão.",
  },
  configuracao: {
    causa: "configuracao",
    nome: "Afiliação pendente",
    resumo: "O produtor ainda não aprovou a afiliação do creator a esse produto.",
    time: "atendimento_produtor",
    prevencao: "Lembrar o produtor de afiliações pendentes há mais de 3 dias.",
  },
  possivel_falha: {
    causa: "possivel_falha",
    nome: "Possível falha",
    resumo: "Nenhuma regra explica a venda. Pode ser uma falha da plataforma.",
    time: "tecnologia",
    prevencao: "Alerta automático quando vendas parecidas ficam sem atribuição.",
  },
};

export const ORDEM_DAS_CAUSAS: Causa[] = [
  "uso_do_link",
  "prazo",
  "regra",
  "configuracao",
  "conta",
  "possivel_falha",
  "venda_contabilizada",
];
