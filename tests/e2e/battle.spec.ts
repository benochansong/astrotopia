import { test, expect } from "@playwright/test";
test("training, equipment, skills, titan phase rendering and safe reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.player.x = 2140;
    w.player.y = 716;
    w.player.level = 15;
    w.combat.unlock();
    w.combat.startTraining();
  });
  await expect(page.locator(".training-hud")).toBeVisible();
  await page.keyboard.press("KeyC");
  await expect(page.locator(".equipment-slots")).toBeVisible();
  await page.screenshot({ path: "artifacts/phase-2-equipment.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.combat.trial("rifle");
    w.player.x = 2180;
    w.player.facing = 1;
  });
  await page.keyboard.down("KeyJ");
  await page.waitForTimeout(1100);
  await page.keyboard.up("KeyJ");
  expect(
    await page.evaluate(() => window.__ASTRO__.world.combat.training.hits),
  ).toBeGreaterThan(0);
  await page.keyboard.press("KeyV");
  await expect(page.locator(".modal")).toContainText("궤도 에너지 강타");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "훈련 종료", exact: true }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("valley");
    w.combat.boss.start();
    w.player.invulnerable = 999;
  });
  await page.getByRole("button", { name: "등장 연출 건너뛰기" }).click();
  await expect(page.locator(".boss-hud")).toContainText("AWAKENING");
  await page.evaluate(() => {
    const b = window.__ASTRO__.world.combat.boss;
    b.enemy.hp = b.enemy.maxHp * 0.25;
  });
  await expect(page.locator(".boss-hud")).toContainText("CORE OVERLOAD");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "artifacts/phase-2-titan.png" });
  await page.evaluate(() => window.__ASTRO__.save());
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(
    await page.evaluate(() => window.__ASTRO__.world.combat.boss.active),
  ).toBe(false);
  expect(
    await page.evaluate(() => window.__ASTRO__.world.player.x),
  ).toBeLessThan(4000);
  expect(errors).toEqual([]);
});
