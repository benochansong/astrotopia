import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { stressWorld } from "../fixtures/civilization";
import { parseSave, defaultSettings } from "../../src/save/storage";
test("seven planets, 500 buildings, 30 freighters, 50 routes and 5000 residents stay responsive", async ({
  page,
}) => {
  const w = stressWorld(),
    s = w.snapshot(defaultSettings());
  expect(
    Object.values(s.space!.planets).reduce(
      (n, p) => n + p!.colony.buildings.length,
      0,
    ),
  ).toBe(500);
  expect(parseSave(JSON.stringify(s))).not.toBeNull();
  await page.addInitScript(
    (s) => localStorage.setItem("astrotopia.save.v1", JSON.stringify(s)),
    s,
  );
  await page.goto("/");
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="civilization"]').click();
  await page.waitForTimeout(1000);
  const metrics = await page.evaluate(async () => {
    const system = window.__ASTRO__.world.civilization,
      original = system.tick,
      frames: number[] = [];
    let prior = performance.now();
    const start = prior;
    system.tick = function (dt: number) {
      const now = performance.now();
      frames.push(now - prior);
      prior = now;
      original.call(this, dt);
    };
    await new Promise<void>((resolve) => {
      const sample = (now: number) =>
        now - start >= 5000 ? resolve() : requestAnimationFrame(sample);
      requestAnimationFrame(sample);
    });
    system.tick = original;
    const elapsed = performance.now() - start;
    frames.sort((a, b) => a - b);
    return {
      fps: frames.length / (elapsed / 1000),
      p95: frames[Math.floor(frames.length * 0.95)],
      max: frames.at(-1),
      frames: frames.length,
      elapsed,
      measurement: "actual game update calls, not display refresh callbacks",
    };
  });
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    "artifacts/phase9-performance.json",
    JSON.stringify(
      {
        ...metrics,
        planets: 7,
        buildings: 500,
        ships: 30,
        routes: 50,
        population: 5000,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: "artifacts/phase9-network-stress.png" });
  expect(metrics.fps).toBeGreaterThan(30);
  expect(metrics.p95).toBeLessThan(65);
});
