import { test, expect } from "@playwright/test";
import fs from "node:fs";
const start = async (page: any) => {
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.player.level = 90;
    w.combat.unlock();
    w.player.hp = w.stats.hp;
    w.player.invulnerable = 999;
    w.omega.state.visited = true;
    w.space.state.launched = true;
    w.space.switchPlanet("omega");
  });
};
test("OMEGA city art, physical archive puzzle, confirmed ending and immutable replay survive reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("omegaCity", 1600);
    w.player.invulnerable = 999;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/phase8-city.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("omegaBrokenArchive", 4100);
    w.player.invulnerable = 999;
  });
  await page.keyboard.press("KeyF");
  await expect(page.locator(".ancient-puzzle")).toBeVisible();
  await page.screenshot({ path: "artifacts/phase8-puzzle.png" });
  for (const n of [1, 3, 0, 2])
    await page.locator(`[data-action="an-solve"][data-value="${n}"]`).click();
  await expect(page.locator(".ancient-panel")).toContainText("복원 완료");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.omega.state.kills = { aeternumGuardian: 1, nexusOverlord: 1 };
    w.enterRegion("omegaCore", 3900);
    w.omega.combat.start("genesisZero");
    w.omega.combat.boss.hp = 500;
    w.omega.combat.boss.shield = 0;
    w.player.facing = 1;
    w.player.invulnerable = 999;
  });
  await page.keyboard.down("KeyJ");
  await expect(page.locator(".ancient-panel")).toContainText(
    "마지막 판단은 당신의 몫입니다",
    { timeout: 20000 },
  );
  await page.keyboard.up("KeyJ");
  await page.screenshot({ path: "artifacts/phase8-choice.png" });
  await page.locator('[data-action="an-choose"][data-value="harmony"]').click();
  await expect(page.locator(".ancient-confirm")).toBeVisible();
  await page.locator('[data-action="an-confirm"]').click();
  await expect(page.locator(".ancient-skip")).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "artifacts/phase8-ending.png" });
  await page.locator(".ancient-skip").click();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.locator('[data-action="ancient"]').click();
  await page.locator('[data-action="an-tab"][data-value="ending"]').click();
  await expect(page.locator(".ancient-panel")).toContainText(
    "조화 · 감독받는 조력자",
  );
  await page
    .locator('[data-action="an-film"][data-value="ending-rebirth"]')
    .click();
  await page.locator(".ancient-skip").click();
  const ending = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("astrotopia.save.v1")!).ancient.ending,
  );
  expect(ending).toBe("harmony");
  expect(errors).toEqual([]);
});
test("GENESIS patterns, final nova and transition cleanup have bounded frame cost", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.omega.state.kills.nexusOverlord = 1;
    w.enterRegion("omegaCore", 3900);
    w.player.invulnerable = 999;
    w.omega.combat.start("genesisZero");
    w.omega.combat.boss.hp = w.omega.combat.boss.maxHp * 0.1;
  });
  await page.waitForTimeout(4600);
  await page.screenshot({ path: "artifacts/phase8-genesis-nova.png" });
  const result = await page.evaluate(async () => {
    const w = window.__ASTRO__.world,
      update = w.update.bind(w);
    let frames = 0;
    w.update = (...args: any[]) => {
      frames++;
      return update(...args);
    };
    const started = performance.now();
    await new Promise((r) => setTimeout(r, 5000));
    const elapsed = performance.now() - started;
    w.update = update;
    const activeHazards = w.combat.hazards.length;
    for (let i = 0; i < 40; i++)
      w.enterRegion(i % 2 ? "omegaCity" : "omegaArchive", 900);
    return {
      elapsed,
      frames,
      gameFPS: frames / (elapsed / 1000),
      activeHazards,
      remainingHazards: w.combat.hazards.length,
      remainingProjectiles: w.bullets.filter((b: any) => b.active).length,
    };
  });
  expect(result.remainingHazards).toBe(0);
  expect(result.remainingProjectiles).toBe(0);
  expect(result.activeHazards).toBeLessThanOrEqual(70);
  fs.writeFileSync(
    "artifacts/phase8-performance.json",
    JSON.stringify(result, null, 2),
  );
});
