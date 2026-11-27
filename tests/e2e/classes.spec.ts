import { test, expect } from "@playwright/test";
import fs from "node:fs";
const start = async (page: any) => {
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.player.level = 60;
    w.combat.unlock();
    w.player.hp = w.stats.hp;
  });
};
test("academy real Ranger trial, first advancement, skill tree and persistent class", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.keyboard.press("KeyV");
  await page.screenshot({ path: "artifacts/phase7-academy.png" });
  await page.locator('[data-action="cl-mentor"][data-value="ranger"]').click();
  await page
    .locator('[data-action="cl-trial"][data-value="ranger:1:trial"]')
    .click();
  await expect(page.locator(".class-trial-hud")).toBeVisible();
  await page.keyboard.press("KeyQ");
  await page.waitForTimeout(500);
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(500);
  await page.keyboard.press("KeyT");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(750);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyJ");
  await expect
    .poll(
      () =>
        page.evaluate(() => window.__ASTRO__.world.classes.trial?.grade ?? 0),
      { timeout: 25000 },
    )
    .toBeGreaterThan(0);
  await page.keyboard.up("KeyJ");
  await page.screenshot({ path: "artifacts/phase7-ranger-trial.png" });
  await page.locator('[data-action="cl-finish"]').click();
  await page.locator('[data-action="cl-choose"][data-value="ranger"]').click();
  await expect(page.locator(".class-header")).toContainText("RANGER");
  await page.locator('[data-action="cl-tab"][data-value="tree"]').click();
  await page
    .locator('[data-action="cl-learn"][data-value="ranger_passive0"]')
    .click();
  await page.screenshot({ path: "artifacts/phase7-skill-tree.png" });
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(
    await page.evaluate(() => window.__ASTRO__.world.classes.state.classId),
  ).toBe("ranger");
  expect(
    await page.evaluate(
      () => window.__ASTRO__.world.classes.state.ranks.ranger_passive0,
    ),
  ).toBe(1);
  expect(await page.evaluate(() => window.__ASTRO__.world.player.level)).toBe(
    60,
  );
  expect(errors).toEqual([]);
});
test("six classes use their four skills and twelve ultimates in extreme environments", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const result = await page.evaluate(async () => {
    const w = window.__ASTRO__.world;
    const { classes } = await import(
      /* @vite-ignore */ "/src/classes/" + "catalog.ts"
    );
    const samples: any[] = [];
    for (const [id, d] of Object.entries(classes) as any) {
      w.enterRegion("crash", 300);
      w.classes.state.changeCooldown = 0;
      w.battle.credits = 10000;
      w.classes.state.trials[id] = 1;
      w.classes.choose(id);
      for (const path of d.paths) {
        w.classes.state.changeCooldown = 0;
        w.classes.state.trials[`${id}_tier2`] = 1;
        w.classes.specialize(path);
        w.classes.state.trials[`${id}_tier3`] = 1;
        if (w.classes.state.tier === 2) w.classes.advance();
        w.classes.learn(`${path}_0`);
        w.classes.learn(`${path}_ultimate`);
        w.enterRegion(
          id === "explorer" || id === "scientist"
            ? "aquariaWilds"
            : "lunarisWilds",
          900,
        );
        w.player.y = 600;
        w.player.grounded = false;
        w.player.invulnerable = 999;
        for (let i = 0; i < 4; i++) {
          w.classes.lock = 0;
          w.player.dashCooldown = 0;
          w.classes.state.cooldowns[`${id}_${i}`] = 0;
          w.player.energy = w.stats.energy;
          w.classes.cast(`${id}_${i}`);
        }
        w.classes.lock = 0;
        w.player.energy = w.stats.energy;
        w.classes.state.gauge = 100;
        const used = w.classes.cast(`${path}_ultimate`);
        samples.push({ path, used });
        w.enterRegion("crash", 300);
      }
    }
    return samples;
  });
  expect(result).toHaveLength(12);
  expect(result.every((r: any) => r.used)).toBe(true);
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.classes.state.changeCooldown = 0;
    w.classes.state.trials.engineer = 1;
    w.classes.choose("engineer");
    w.enterRegion("lunarisWilds", 900);
    w.player.y = 450;
    w.player.invulnerable = 999;
    w.classes.cast("engineer_0");
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/phase7-drone-lunaris.png" });
  expect(errors).toEqual([]);
});
test("class combat has bounded effects, stable transition cleanup and measured frame rate", async ({
  page,
}) => {
  await start(page);
  const metrics = await page.evaluate(async () => {
    const w = window.__ASTRO__.world;
    w.classes.state.trials.engineer = 1;
    w.classes.choose("engineer");
    w.enterRegion("aquariaWilds", 900);
    w.player.y = 900;
    w.player.invulnerable = 999;
    w.classes.cast("engineer_0");
    const begin = w.time,
      start = performance.now();
    let frames = 0;
    const update = w.update.bind(w);
    w.update = (...args: any[]) => {
      frames++;
      return update(...args);
    };
    await new Promise((r) => setTimeout(r, 5000));
    const elapsed = performance.now() - start;
    const simulationSeconds = w.time - begin;
    w.update = update;
    const samples: number[] = [];
    let prev = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        samples.push(now - prev);
        prev = now;
        if (samples.length < 180) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    for (let i = 0; i < 40; i++)
      w.enterRegion(i % 2 ? "aquariaWilds" : "lunarisWilds", 900);
    return {
      elapsed,
      simulationSeconds,
      gameFrames: frames,
      gameFPS: frames / (elapsed / 1000),
      rafMeanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
      p95: samples.sort((a, b) => a - b)[Math.floor(samples.length * 0.95)],
      summons: w.classes.summons.length,
      effects: w.combat.effects.length,
      projectiles: w.bullets.filter((b: any) => b.active).length,
    };
  });
  expect(metrics.summons).toBe(0);
  expect(metrics.effects).toBe(0);
  expect(metrics.projectiles).toBe(0);
  fs.writeFileSync(
    "artifacts/phase7-performance.json",
    JSON.stringify(metrics, null, 2),
  );
});
