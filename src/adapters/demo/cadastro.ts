/**
 * Cadastro fictício da demonstração: creators, produtos e afiliações.
 * Nomes e marcas são inventados. Nenhum dado real de pessoa ou empresa.
 */
import type { Afiliacao, Creator, Produto } from "@/core/domain/tipos";

/** Momento de referência da demonstração: 17/11/2026, 18h, horário de Brasília. */
export const HOJE = "2026-11-17T18:00:00-03:00";

/** O creator que a demonstração abre primeiro. */
export const CREATOR_PRINCIPAL = "c-lia";

export const PRODUTOS: Produto[] = [
  { id: "p-whey", nome: "Kit Whey Protein 900g", tipo: "fisico", produtor: "Nutri Max", preco: 189.9, comissao_percentual: 12, comissao_libera: "apos_entrega" },
  { id: "p-creatina", nome: "Creatina Pura 300g", tipo: "fisico", produtor: "Nutri Max", preco: 99.9, comissao_percentual: 12, comissao_libera: "apos_entrega" },
  { id: "p-treino", nome: "Treino em Casa 12 Semanas", tipo: "digital", produtor: "Fit em Casa", preco: 147, comissao_percentual: 45, comissao_libera: "apos_7_dias_de_garantia" },
  { id: "p-excel", nome: "Curso Excel do Zero ao Avançado", tipo: "digital", produtor: "Escola Lumen", preco: 297, comissao_percentual: 40, comissao_libera: "apos_7_dias_de_garantia" },
  { id: "p-planilhas", nome: "Ebook Planilhas Inteligentes", tipo: "digital", produtor: "Escola Lumen", preco: 47, comissao_percentual: 50, comissao_libera: "apos_7_dias_de_garantia" },
  { id: "p-financas", nome: "Mentoria Finanças 360", tipo: "digital", produtor: "FinançasPro", preco: 497, comissao_percentual: 35, comissao_libera: "apos_7_dias_de_garantia" },
  { id: "p-serum", nome: "Sérum Vitamina C 30ml", tipo: "fisico", produtor: "Pele Viva Cosméticos", preco: 129.9, comissao_percentual: 15, comissao_libera: "apos_entrega" },
  { id: "p-skincare", nome: "Kit Skincare Noite", tipo: "fisico", produtor: "Pele Viva Cosméticos", preco: 219, comissao_percentual: 15, comissao_libera: "apos_entrega" },
];

const ativa = { status: "ativa" as const, restrita_desde: null, motivo_restricao: null };

export const CREATORS: Creator[] = [
  { id: "c-lia", nome: "Lia Martins", usuario: "@liafit", nicho: "Treino e nutrição", conta: ativa },
  { id: "c-diego", nome: "Diego Prado", usuario: "@diegotreina", nicho: "Treino funcional", conta: ativa },
  { id: "c-jv", nome: "João Victor Alves", usuario: "@jvsuplementos", nicho: "Suplementação", conta: ativa },
  { id: "c-bia", nome: "Beatriz Lopes", usuario: "@biaskin", nicho: "Skincare", conta: ativa },
  { id: "c-rafa", nome: "Rafael Souza", usuario: "@rafafinancas", nicho: "Finanças pessoais", conta: ativa },
  { id: "c-carla", nome: "Carla Nunes", usuario: "@carlaestuda", nicho: "Estudos e carreira", conta: ativa },
  {
    id: "c-mel",
    nome: "Melissa Andrade",
    usuario: "@melbeleza",
    nicho: "Beleza",
    conta: { status: "restrita", restrita_desde: "2026-11-08T10:00:00-03:00", motivo_restricao: "promessa de resultado em anúncio" },
  },
  { id: "c-theo", nome: "Theo Ramos", usuario: "@theoplanilhas", nicho: "Produtividade", conta: ativa },
];

/** [creator, produto, status, solicitada_em] */
const PEDIDOS: [string, string, Afiliacao["status"], string][] = [
  ["c-lia", "p-whey", "aprovada", "2026-08-02"],
  ["c-lia", "p-creatina", "aprovada", "2026-08-02"],
  ["c-lia", "p-treino", "aprovada", "2026-07-15"],
  ["c-diego", "p-whey", "aprovada", "2026-06-10"],
  ["c-diego", "p-creatina", "aprovada", "2026-06-10"],
  ["c-diego", "p-treino", "aprovada", "2026-09-01"],
  ["c-jv", "p-whey", "aprovada", "2026-05-20"],
  ["c-jv", "p-creatina", "aprovada", "2026-05-20"],
  ["c-bia", "p-serum", "aprovada", "2026-07-01"],
  ["c-bia", "p-skincare", "aprovada", "2026-07-01"],
  ["c-rafa", "p-financas", "aprovada", "2026-04-11"],
  ["c-rafa", "p-planilhas", "aprovada", "2026-04-11"],
  ["c-rafa", "p-excel", "aprovada", "2026-09-20"],
  ["c-carla", "p-excel", "aprovada", "2026-03-03"],
  ["c-carla", "p-planilhas", "aprovada", "2026-03-03"],
  ["c-mel", "p-serum", "aprovada", "2026-06-15"],
  ["c-mel", "p-skincare", "aprovada", "2026-06-15"],
  ["c-theo", "p-excel", "aprovada", "2026-08-25"],
  ["c-theo", "p-planilhas", "pendente_aprovacao_produtor", "2026-11-05"],
];

export const AFILIACOES: Afiliacao[] = PEDIDOS.map(([creator, produto, status, data], i) => {
  const usuario = CREATORS.find((c) => c.id === creator)!.usuario.slice(1).toUpperCase();
  const sufixo = produto.slice(2, 5).toUpperCase();
  return {
    id: `af-${i + 1}`,
    creator_id: creator,
    produto_id: produto,
    status,
    solicitada_em: `${data}T09:00:00-03:00`,
    aprovada_em: status === "aprovada" ? `${data}T15:00:00-03:00` : null,
    link_id: `lnk-${creator.slice(2)}-${produto.slice(2)}`,
    codigo_afiliado: `${usuario}-${sufixo}`,
  };
});
