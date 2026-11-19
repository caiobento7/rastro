// Teste de ponta a ponta do servidor MCP: sobe o servidor como um assistente faria e chama as ferramentas.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const servidor = fileURLToPath(new URL("./dist/rastro-mcp.mjs", import.meta.url));
const cliente = new Client({ name: "teste-rastro", version: "1.0.0" });
await cliente.connect(new StdioClientTransport({ command: process.execPath, args: [servidor] }));

const ler = (r) => JSON.parse(r.content[0].text);
let falhas = 0;
const conferir = (ok, rotulo) => {
  if (!ok) falhas++;
  console.log(`${ok ? "OK    " : "FALHOU"} ${rotulo}`);
};

conferir(Boolean(cliente.getInstructions()), "o servidor envia instruções");
const nomes = (await cliente.listTools()).tools.map((t) => t.name).sort();
conferir(
  JSON.stringify(nomes) === JSON.stringify(["abrir_caso", "buscar_vendas", "diagnosticar_venda", "listar_alertas", "listar_creators"]),
  `ferramentas: ${nomes.join(", ")}`,
);

const busca = ler(await cliente.callTool({ name: "buscar_vendas", arguments: { creator: "lia", data: "2026-11-16" } }));
const whey = busca.vendas.find((v) => v.produto.startsWith("Kit Whey"));
conferir(Boolean(whey), "acha a venda do Kit Whey da Lia em 16/11");

const d = ler(await cliente.callTool({ name: "diagnosticar_venda", arguments: { creator: "@liafit", venda_id: whey.venda_id } }));
conferir(d.causa === "possivel_falha" && d.escalar === true, `diagnóstico: ${d.causa}`);

const caso = ler(await cliente.callTool({ name: "abrir_caso", arguments: { creator: "Lia", venda_id: whey.venda_id, pergunta: "Minha venda de ontem não contou" } }));
conferir(caso.status === "com_tecnologia" && caso.alerta?.vendas === 6, `caso ${caso.protocolo} foi para a tecnologia, alerta com ${caso.alerta?.vendas} vendas`);

const alertas = ler(await cliente.callTool({ name: "listar_alertas", arguments: {} }));
conferir(alertas[0]?.assinatura?.checkout_versao === "v3.2", "alerta do checkout v3.2 listado");

const alheio = await cliente.callTool({ name: "diagnosticar_venda", arguments: { creator: "Bia", venda_id: whey.venda_id } });
conferir(alheio.isError === true, "venda de outro creator é recusada");

await cliente.close();
console.log(falhas === 0 ? "RESULTADO: tudo certo" : `RESULTADO: ${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
