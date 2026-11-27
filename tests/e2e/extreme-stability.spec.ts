import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("extreme world rendering performance and bounded heap across repeated planet changes", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.space.state.launched = true;
    for (const id of [
      "eden",
      "ares",
      "frostia",
      "inferno",
      "aquaria",
      "lunaris",
    ] as const)
      w.space.switchPlanet(id);
  });
  const measurements = [];
  for (const id of ["aquaria", "lunaris"] as const) {
    await page.evaluate((id) => {
      const w = window.__ASTRO__.world;
      w.space.switchPlanet(id);
      w.enterRegion((id + "Wilds") as any);
      w.player.x = 1600;
      w.player.y = id === "aquaria" ? 1300 : 400;
      w.player.invulnerable = 999;
    }, id);
    await page.waitForTimeout(1200);
    measurements.push(
      await page.evaluate(async () => {
        const w = window.__ASTRO__.world,
          original = w.update;
        let updates = 0;
        w.update = function (...args: any[]) {
          updates++;
          return original.apply(this, args);
        };
        const start = performance.now(),
          frames: number[] = [];
        let previous = start;
        await new Promise<void>((resolve) => {
          const frame = (t: number) => {
            frames.push(t - previous);
            previous = t;
            if (t - start >= 5000) resolve();
            else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        });
        w.update = original;
        return {
          planet: w.planetId,
          gameUpdates: updates,
          gameFps: (updates * 1000) / (previous - start),
          rafFps: (frames.length * 1000) / (previous - start),
          p95FrameMs: frames.sort((a, b) => a - b)[
            Math.floor(frames.length * 0.95)
          ],
          durationMs: previous - start,
        };
      }),
    );
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.collectGarbage");
  const before = await cdp.send("Runtime.getHeapUsage");
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    for (let n = 0; n < 10; n++)
      for (const id of [
        "eden",
        "ares",
        "frostia",
        "inferno",
        "aquaria",
        "lunaris",
      ] as const) {
        w.space.switchPlanet(id);
        w.space.capture();
        w.snapshot(w.settings);
      }
    w.events.length = 0;
  });
  await page.waitForTimeout(1500);
  await cdp.send("HeapProfiler.collectGarbage");
  const after = await cdp.send("Runtime.getHeapUsage");
  await writeFile(
    "artifacts/phase6-performance.json",
    JSON.stringify(
      {
        measurements,
        heap: {
          cycles: 60,
          before: before.usedSize,
          after: after.usedSize,
          delta: after.usedSize - before.usedSize,
        },
        scope:
          "Chrome local development, one 5-second sample per planet; short GC-assisted travel retention check, not a long soak",
      },
      null,
      2,
    ),
  );
  for (const m of measurements) expect(m.gameFps).toBeGreaterThan(40);
  expect(after.usedSize - before.usedSize).toBeLessThan(15 * 1024 * 1024);
});
test("accessibility settings and remapped movement persist across reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.keyboard.press("Escape");
  await page.locator('[data-action="settings"]').click();
  await page.locator("#bind-KeyD").selectOption("KeyY");
  await page.locator("#fog").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.locator("#jetAssist").selectOption("true");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "탐험 계속하기" }).click();
  const before = await page.evaluate(() => window.__ASTRO__.world.player.x);
  await page.keyboard.down("KeyY");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyY");
  expect(
    await page.evaluate(() => window.__ASTRO__.world.player.x),
  ).toBeGreaterThan(before + 50);
  await page.reload();
  const settings = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("astrotopia.settings.v1")!),
  );
  expect(settings.bindings.KeyD).toBe("KeyY");
  expect(settings.jetAssist).toBe(true);
  expect(settings.fog).toBe(0.2);
});
