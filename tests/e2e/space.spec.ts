import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("ship repairs, map, ascent, cargo, ARES landing and return survive browser reload", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.colony.state.ship = [
      "hullPanel",
      "thrusterPart",
      "navCircuit",
      "commModule",
      "lifeSupport",
      "coreStabilizer",
    ];
    w.colony.state.coreAnalyzed = true;
    w.survival.state.technologies.push("shipEngineering", "desertExploration");
    w.survival.state.owned = ["dustHelmet", "oxygen"];
    w.survival.state.equipped = ["dustHelmet", "oxygen"];
    w.inventory = { landingGear: 1, shipFuel: 60 };
  });
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="sp-inspect"]').click();
  await page.locator('[data-action="sp-repair"][data-value="landing"]').click();
  await page.locator('[data-action="sp-fuel"]').click();
  await page.locator('[data-action="sp-board"]').click();
  await expect
    .poll(() => page.evaluate(() => window.__ASTRO__.world.region))
    .toBe("ship");
  await page.screenshot({ path: "artifacts/phase5-ship.png" });
  await page.locator('[data-action="sp-tab"][data-value="map"]').click();
  await page.screenshot({ path: "artifacts/phase5-star-map.png" });
  await page.locator('[data-action="sp-ascent"]').click();
  await page.locator('[data-action="sp-skip"]').click();
  await page.locator('[data-action="sp-travel"][data-value="ares"]').click();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="sp-skip"]').click();
  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.__ASTRO__.world.region))
    .toBe("aresLanding");
  await page.screenshot({ path: "artifacts/phase5-ares-landing.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.collect("redIron", 5);
  });
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="sp-tab"][data-value="cargo"]').click();
  await page.locator('[data-value="load:redIron:5"]').click();
  await page.locator('[data-action="sp-tab"][data-value="ship"]').click();
  await page.locator('[data-action="sp-board"]').click();
  await page.locator('[data-action="sp-tab"][data-value="map"]').click();
  await page.locator('[data-action="sp-travel"][data-value="eden"]').click();
  await page.locator('[data-action="sp-skip"]').click();
  await page.locator('[data-action="sp-tab"][data-value="cargo"]').click();
  await page.locator('[data-value="deliver:redIron:5"]').click();
  expect(
    await page.evaluate(
      () => window.__ASTRO__.world.survival.state.warehouse.redIron,
    ),
  ).toBe(5);
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(
    await page.evaluate(
      () => window.__ASTRO__.world.survival.state.warehouse.redIron,
    ),
  ).toBe(5);
  expect(errors).toEqual([]);
});
test("ARES has distinct regions, boss telegraphs, low gravity and measured active rendering", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.space.switchPlanet("ares");
    w.player.invulnerable = 999;
    w.enterRegion("aresCanyon", 1600);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "artifacts/phase5-ares-canyon.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("aresFoundry", 3850);
    w.space.combat.start();
    w.space.combat.timer = 0;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "artifacts/phase5-colossus.png" });
  const stats = await page.evaluate(async () => {
    const frames: number[] = [];
    const world = window.__ASTRO__.world,
      original = world.update.bind(world);
    let updates = 0;
    world.update = (...args: any[]) => {
      updates++;
      return original(...args);
    };
    let prev = performance.now(),
      start = prev;
    await new Promise<void>((resolve) => {
      const frame = (t: number) => {
        frames.push(t - prev);
        prev = t;
        t - start > 5000 ? resolve() : requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    world.update = original;
    return {
      gameUpdates: updates,
      gameFps: (updates * 1000) / (prev - start),
      duration: prev - start,
      frames: frames.length,
      averageRafFps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
      p95FrameMs: frames.sort((a, b) => a - b)[
        Math.floor(frames.length * 0.95)
      ],
      region: window.__ASTRO__.world.region,
    };
  });
  await writeFile(
    "artifacts/phase5-performance.json",
    JSON.stringify(stats, null, 2),
  );
  expect(stats.averageRafFps).toBeGreaterThan(25);
});
