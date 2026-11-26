import { test, expect } from "@playwright/test";
const start = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
};
test("tutorial terminal, real crafting queue, warehouse transfer and durable reload", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.player.x = 93;
    w.player.y = 716;
    w.player.vx = 0;
  });
  await page.keyboard.press("KeyF");
  await expect(
    page.getByRole("heading", { name: "개척자의 작업실" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.__ASTRO__.world.survival.state.scanner),
  ).toBe(true);
  await page.locator('[data-action="hub-tab"][data-value="craft"]').click();
  await page
    .locator('[data-action="recipe-select"][data-value="medicalGel"]')
    .click();
  await expect(page.locator(".recipe-detail")).toContainText("외계 식물 섬유");
  await page.locator('[data-action="produce"]').click();
  await expect(page.locator("#production-queue")).toContainText("회수 대기", {
    timeout: 10000,
  });
  await page.locator('[data-action="job-claim"]').click();
  expect(
    await page.evaluate(() => window.__ASTRO__.world.inventory.medicalGel),
  ).toBe(2);
  await page.locator('[data-action="hub-tab"][data-value="storage"]').click();
  await page.locator("#transfer-fiber").fill("2");
  await page.locator('[data-action="withdraw"][data-value="fiber"]').click();
  expect(
    await page.evaluate(() => window.__ASTRO__.world.inventory.fiber),
  ).toBe(2);
  await page.screenshot({ path: "artifacts/phase-3-storage.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyG");
  await expect(page.locator(".scanner-readings")).toBeVisible();
  await page.evaluate(() => window.__ASTRO__.save());
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(
    await page.evaluate(() => window.__ASTRO__.world.inventory.medicalGel),
  ).toBe(2);
  expect(
    await page.evaluate(
      () => window.__ASTRO__.world.survival.state.jobs.length,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
});
test("research UI, environmental regions, scanner and sentinel rendering", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.activate("terminal");
    w.player.level = 15;
    w.survival.state.facilities.push("research", "equipment", "refinery");
    w.survival.state.warehouse.data = 10;
    w.survival.state.warehouse.resin = 3;
    w.survival.state.researchPoints = 100;
  });
  await page.keyboard.press("KeyL");
  await page.locator('[data-action="hub-tab"][data-value="research"]').click();
  await page
    .locator('[data-action="research-start"][data-value="bio"]')
    .click();
  await expect(page.locator("#production-queue")).toContainText("회수 대기", {
    timeout: 10000,
  });
  await page.locator('[data-action="job-claim"]').click();
  await expect(page.locator(".technology.done")).toContainText([
    "기초 광물 분석",
    "기초 금속 정제",
    "생체 소재",
  ]);
  await page.screenshot({ path: "artifacts/phase-3-research.png" });
  await page.keyboard.press("Escape");
  for (const id of ["marsh", "caverns", "ruins", "abyss"]) {
    await page.evaluate((id) => {
      const w = window.__ASTRO__.world;
      w.enterRegion(id);
      w.player.x = 1200;
      w.player.y = 716;
      w.player.invulnerable = 999;
      w.survival.state.owned = ["light", "oxygen"];
      w.survival.equip("light");
      w.survival.equip("oxygen");
      w.survival.scanner.cooldown = 0;
    }, id);
    await page.waitForTimeout(5200);
    await page.keyboard.press("KeyG");
    await expect(page.locator(".survival-hud")).toBeVisible();
    await page.screenshot({ path: `artifacts/phase-3-${id}.png` });
  }
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.sentinel.start();
    w.survival.scanner.cooldown = 0;
  });
  await page.keyboard.press("KeyG");
  await expect(page.locator(".sentinel-hud")).toContainText("공급 장치 2개");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "artifacts/phase-3-sentinel.png" });
  expect(errors).toEqual([]);
});
