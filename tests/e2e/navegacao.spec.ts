import { expect, test } from "@playwright/test";

test("a página inicial explica o problema e leva à demonstração", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Toda venda deixa um rastro." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Uma frase, seis causas diferentes." })).toBeVisible();
  await page.getByRole("link", { name: "Ver funcionando" }).click();
  await expect(page).toHaveURL(/\/creator$/);
  await expect(page.getByRole("heading", { name: "Lia Martins" })).toBeVisible();
});

test("todas as áreas abrem sem erro no console", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  for (const [rota, titulo] of [
    ["/creator", "Lia Martins"],
    ["/atendimento", "Atendimento ao creator"],
    ["/tecnologia", "Tecnologia"],
    ["/gestao", "Gestão"],
  ]) {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  }
  expect(erros).toEqual([]);
});

test("a página não tem rolagem horizontal", async ({ page }) => {
  for (const rota of ["/", "/creator", "/atendimento", "/tecnologia", "/gestao"]) {
    await page.goto(rota);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra, `rolagem horizontal em ${rota}`).toBeLessThanOrEqual(0);
  }
});
