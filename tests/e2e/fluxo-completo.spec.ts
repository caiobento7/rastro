import { expect, test } from "@playwright/test";

/**
 * A história da demonstração, de ponta a ponta:
 * a creator pergunta, discorda, o atendimento responde, a tecnologia corrige
 * e a resposta volta para a creator. Tudo no mesmo navegador.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/creator");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("a creator entende por que a venda de ontem não contou", async ({ page }) => {
  await page.getByRole("button", { name: "Minha venda de ontem não contou" }).click();

  await expect(page.getByRole("heading", { name: "Os dados não explicam esta venda" })).toBeVisible();
  await expect(page.getByText("Nenhum registro de atribuição nem de recusa")).toBeVisible();
  await expect(page.getByText(/Não é só com você: outras 5 vendas parecidas/)).toBeVisible();
  await expect(page.getByText("Com a tecnologia").first()).toBeVisible();
});

test("a creator discorda e o atendimento responde com a resposta sugerida", async ({ page }) => {
  const vendas = page.getByRole("region", { name: "Suas vendas" });
  await vendas.getByRole("button", { name: /Treino em Casa 12 Semanas.*15\/11/ }).click();
  await page.getByRole("button", { name: "Por que esta venda não contou?" }).click();
  await expect(page.getByRole("heading", { name: "A compra não passou pelo seu link" })).toBeVisible();

  await page.getByRole("button", { name: "Não concordo, quero falar com uma pessoa" }).click();
  await page.getByLabel("Conte o que você viu").fill("A cliente me mandou print do clique no meu link.");
  await page.getByRole("button", { name: "Enviar para o atendimento" }).click();
  await expect(page.getByText(/Uma pessoa do atendimento já recebeu o caso/)).toBeVisible();

  await page.getByRole("link", { name: /Atendimento/ }).first().click();
  await expect(page.getByRole("heading", { name: "Atendimento ao creator" })).toBeVisible();
  await page.getByRole("button", { name: /Lia Martins/ }).click();
  await expect(page.getByLabel("Resposta para Lia")).toHaveValue(/^Oi, Lia!/);
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await page.getByRole("link", { name: "Creator" }).click();
  await vendas.getByRole("button", { name: /Treino em Casa 12 Semanas.*15\/11/ }).click();
  await expect(page.getByText("Atendimento YouShop")).toBeVisible();
});

test("a tecnologia resolve o alerta e cada creator recebe a resposta", async ({ page }) => {
  await page.getByRole("button", { name: "Minha venda de ontem não contou" }).click();
  await expect(page.getByRole("heading", { name: "Os dados não explicam esta venda" })).toBeVisible();

  await page.getByRole("link", { name: /Tecnologia/ }).first().click();
  await expect(page.getByRole("heading", { name: "Vendas sem atribuição no checkout v3.2" })).toBeVisible();
  await expect(page.getByText(/1 venda com a mesma falha ainda sem reclamação/)).toBeVisible();

  await page.getByRole("button", { name: "Assumir a investigação" }).click();
  await page.getByRole("button", { name: "Marcar como corrigido e reprocessar as vendas" }).click();
  await expect(page.getByText(/Resolvido\. \d creators avisados/)).toBeVisible();

  await page.getByRole("link", { name: "Creator" }).click();
  await expect(page.getByText("Tecnologia YouShop")).toBeVisible();
  await expect(page.getByText(/Corrigimos a falha no checkout v3.2/)).toBeVisible();
});

test("a gestão mostra os números e para qual time vai cada causa", async ({ page }) => {
  await page.goto("/gestao");
  await expect(page.getByText("Explicados sem atendente")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cada causa tem um time que pode evitá-la" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Marketing e Conteúdo" })).toBeVisible();
});
