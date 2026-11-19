// Gera as imagens das telas usadas no README e na apresentação.
// Uso: com o servidor rodando (npm run dev), `node scripts/capturar-telas.mjs [url-base]`.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3200";
const pasta = new URL("../docs/telas/", import.meta.url);
mkdirSync(pasta, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "pt-BR" });
const salvar = (nome, opcoes = {}) => pagina.screenshot({ path: new URL(`${nome}.png`, pasta).pathname.replace(/^\/([A-Z]:)/, "$1"), ...opcoes });

await pagina.goto(`${base}/`);
await pagina.waitForTimeout(1800);
await salvar("inicio");

await pagina.goto(`${base}/creator`);
await pagina.evaluate(() => window.localStorage.clear());
await pagina.reload();
await pagina.getByRole("button", { name: "Minha venda de ontem não contou" }).click();
await pagina.getByRole("heading", { name: "Os dados não explicam esta venda" }).waitFor();
await pagina.waitForTimeout(600);
await salvar("creator", { fullPage: true });

await pagina.goto(`${base}/atendimento`);
await pagina.getByRole("heading", { name: "Atendimento ao creator" }).waitFor();
await salvar("atendimento", { fullPage: true });

await pagina.goto(`${base}/tecnologia`);
await pagina.getByRole("heading", { name: "Vendas sem atribuição no checkout v3.2" }).waitFor();
await salvar("tecnologia", { fullPage: true });

await pagina.goto(`${base}/gestao`);
await pagina.getByRole("heading", { name: "Gestão" }).waitFor();
await pagina.waitForTimeout(1500);
await salvar("gestao", { fullPage: true });

await navegador.close();
console.log("Telas salvas em docs/telas/");
