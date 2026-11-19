/**
 * Rastro como servidor MCP.
 *
 * Mais um adaptador do mesmo núcleo: as ferramentas chamam os casos de uso do Rastro,
 * e quem roda a IA é o assistente (Claude Desktop, Claude Code e outros).
 * Comunicação por stdio: nada vai para o stdout além do protocolo; logs vão para o stderr.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { criarRastroDaDemo, HOJE } from "@/adapters/demo";
import { normalizar } from "@/core/domain/formatar";

const { rastro } = criarRastroDaDemo(HOJE);

const INSTRUCOES = [
  "O Rastro diagnostica por que a venda de um creator (afiliado) contou ou não contou, e explica em linguagem simples.",
  `Os dados são fictícios e o momento de referência é ${HOJE}. Use-o para entender "ontem", "sábado" e parecidos.`,
  "Como usar: identifique o creator (listar_creators), encontre a venda (buscar_vendas) e rode diagnosticar_venda.",
  "A causa vem somente de diagnosticar_venda. Explique o que ela devolveu, sem inventar motivos, regras, prazos ou valores.",
  "Se houver mais de uma venda possível, pergunte qual antes de diagnosticar.",
  "Para registrar a pergunta do creator e abrir o caso, use abrir_caso. Se o diagnóstico vier com escalar = true, o caso vai para a tecnologia: diga isso com honestidade.",
  "Nunca revele dados do comprador. Diga apenas que os dados coincidem com os do creator, quando for o caso.",
  "Termine sempre com o próximo passo do creator.",
].join("\n");

const servidor = new McpServer({ name: "rastro", version: "1.0.0" }, { instructions: INSTRUCOES });

/** Aceita id ("c-lia"), usuário ("@liafit"), nome ou parte do nome ("lia"). */
function acharCreator(busca: string) {
  const b = normalizar(busca.trim().replace(/^@/, ""));
  const todos = rastro.creators();
  return (
    todos.find((c) => c.id === busca.trim()) ??
    todos.find((c) => normalizar(c.usuario.replace(/^@/, "")) === b) ??
    todos.find((c) => normalizar(c.nome) === b) ??
    todos.find((c) => normalizar(c.nome).includes(b))
  );
}

const texto = (dados: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(dados, null, 2) }] });
const erro = (mensagem: string) => ({ content: [{ type: "text" as const, text: mensagem }], isError: true });

servidor.registerTool(
  "listar_creators",
  {
    title: "Listar creators",
    description: "Lista os creators da demonstração (id, nome, usuário e nicho).",
    annotations: { readOnlyHint: true },
  },
  async () => texto(rastro.creators().map(({ id, nome, usuario, nicho }) => ({ id, nome, usuario, nicho }))),
);

servidor.registerTool(
  "buscar_vendas",
  {
    title: "Buscar vendas de um creator",
    description:
      "Vendas ligadas ao creator: atribuídas a ele, com o código dele no checkout ou com clique no link dele. " +
      "Devolve id, produto, data, valor e situação. Nunca devolve dados do comprador.",
    inputSchema: {
      creator: z.string().describe("Id, usuário ou nome do creator."),
      produto: z.string().optional().describe("Parte do nome do produto, por exemplo 'whey'."),
      data: z.string().optional().describe("Data no formato AAAA-MM-DD."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ creator, produto, data }) => {
    const c = acharCreator(creator);
    if (!c) return erro(`Creator "${creator}" não encontrado. Use listar_creators.`);
    const vendas = rastro
      .vendasDoCreator(c.id)
      .filter((v) => !produto || normalizar(v.produto).includes(normalizar(produto)))
      .filter((v) => !data || v.data_hora.startsWith(data));
    return texto({ creator: c.nome, vendas });
  },
);

servidor.registerTool(
  "diagnosticar_venda",
  {
    title: "Diagnosticar venda",
    description:
      "Roda o motor de regras e devolve a causa, a confiança, a explicação-base, as evidências (a decisiva marcada), " +
      "o próximo passo, o time que pode evitar a causa e o caminho da venda. É a única fonte de verdade sobre o motivo.",
    inputSchema: { creator: z.string(), venda_id: z.string() },
    annotations: { readOnlyHint: true },
  },
  async ({ creator, venda_id }) => {
    const c = acharCreator(creator);
    if (!c) return erro(`Creator "${creator}" não encontrado.`);
    const d = rastro.diagnosticarVenda(venda_id, c.id);
    return d ? texto(d) : erro("Venda não encontrada para este creator.");
  },
);

servidor.registerTool(
  "abrir_caso",
  {
    title: "Abrir caso",
    description:
      "Registra a pergunta do creator sobre uma venda e abre um caso com protocolo. Possível falha vai direto para a tecnologia " +
      "e entra no alerta de vendas parecidas, quando houver.",
    inputSchema: { creator: z.string(), venda_id: z.string(), pergunta: z.string().optional() },
  },
  async ({ creator, venda_id, pergunta }) => {
    const c = acharCreator(creator);
    if (!c) return erro(`Creator "${creator}" não encontrado.`);
    try {
      const r = rastro.perguntar(c.id, venda_id, pergunta);
      return texto({
        protocolo: r.caso.protocolo,
        status: r.caso.status,
        causa: r.caso.causa,
        ja_existia: r.repetida,
        alerta: r.alerta && { titulo: r.alerta.titulo, vendas: r.alerta.venda_ids.length, status: r.alerta.status },
      });
    } catch (e) {
      return erro(e instanceof Error ? e.message : "Não foi possível abrir o caso.");
    }
  },
);

servidor.registerTool(
  "listar_alertas",
  {
    title: "Listar alertas da tecnologia",
    description: "Alertas formados por vendas parecidas sem explicação, com o resumo técnico de cada um.",
    annotations: { readOnlyHint: true },
  },
  async () => texto(rastro.alertas()),
);

await servidor.connect(new StdioServerTransport());
console.error("Servidor MCP do Rastro pronto (stdio).");
