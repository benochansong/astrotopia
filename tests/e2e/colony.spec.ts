import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
async function setup(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.progress.quest = 18;
    w.survival.state.blueprint = true;
    w.player.level = 15;
    w.survival.state.technologies.push("alloy", "bio", "density", "ancient");
    w.colony.initialize();
    Object.assign(w.survival.state.warehouse, {
      ironBar: 60,
      copperBar: 40,
      wafer: 20,
      wovenFiber: 20,
      refinedCell: 20,
      titaniumBar: 20,
      electronics: 20,
      data: 30,
      crystal: 30,
    });
    w.survival.state.researchPoints = 100;
    w.player.invulnerable = 9999;
  });
}
async function clickAt(page: Page, x: number, y: number) {
  const v = await page.evaluate(() => window.__ASTRO__.world.colony.view);
  const r = (await page.locator("#game-frame").boundingBox())!;
  const sx = (x - v.x) * v.zoom,
    sy = (y - v.y) * v.zoom;
  expect(sx).toBeGreaterThan(280);
  expect(sx).toBeLessThan(1230);
  await page.mouse.move(
    r.x + (sx * r.width) / 1280,
    r.y + (sy * r.height) / 720,
  );
  await page.mouse.click(
    r.x + (sx * r.width) / 1280,
    r.y + (sy * r.height) / 720,
  );
}
async function place(page: Page, category: string, kind: string, x: number) {
  await page
    .locator(`[data-action="cb-category"][data-value="${category}"]`)
    .click();
  await page
    .locator(`[data-action="cb-blueprint"][data-value="${kind}"]`)
    .click();
  await clickAt(page, x + 5, 775);
  await expect
    .poll(() =>
      page.evaluate(
        (kind) =>
          window.__ASTRO__.world.colony.state.buildings.some(
            (b: any) => b.kind === kind && !b.legacy,
          ),
        kind,
      ),
    )
    .toBe(true);
}
test("real build controls, zoom coordinates, research, powered mining and durable colony save", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await page.keyboard.press("KeyB");
  await expect(page.locator("#builder-ui")).toBeVisible();
  await place(page, "structure", "floor", 3840);
  await page.waitForTimeout(1200);
  await place(page, "habitat", "habitat", 3840);
  await place(page, "energy", "solar", 4040);
  await place(page, "energy", "battery", 4200);
  await place(page, "energy", "relay", 4280);
  await page.locator('[data-action="cb-zoom"][data-value="out"]').click();
  await place(page, "logistics", "warehouse", 4520);
  await page.screenshot({ path: "artifacts/phase-4-builder.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyO");
  await expect(
    page.getByRole("heading", { name: "기지 관제 센터" }),
  ).toBeVisible();
  // A real powered lab is provided as a fixture; the UI performs the research transaction.
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.colony.place("lab", 4680, 780);
    w.colony.place("relay", 4880, 780);
    w.colony.place("solar", 5000, 780);
    for (let i = 0; i < 10; i++) w.colony.tick(1);
  });
  await page.locator('[data-action="cb-tab"][data-value="research"]').click();
  await page
    .locator('[data-action="cb-research"][data-value="mining"]')
    .click();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.__ASTRO__.world.colony.state.technologies.includes("mining"),
        ),
      { timeout: 20000 },
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyB");
  await page.locator('[data-action="cb-zoom"][data-value="out"]').click();
  await place(page, "industry", "miner", 4360);
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__ASTRO__.world.progress.counters.auto_copper ?? 0,
        ),
      { timeout: 25000 },
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyO");
  await page.locator('[data-action="cb-tab"][data-value="energy"]').click();
  await page.screenshot({ path: "artifacts/phase-4-energy.png" });
  await page.evaluate(() => window.__ASTRO__.save());
  const buildings = await page.evaluate(
    () => window.__ASTRO__.world.colony.state.buildings.length,
  );
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(
    await page.evaluate(
      () => window.__ASTRO__.world.colony.state.buildings.length,
    ),
  ).toBe(buildings);
  expect(
    await page.evaluate(() => window.__ASTRO__.world.colony.state.technologies),
  ).toContain("mining");
  expect(errors).toEqual([]);
});
test("colony dashboard, 100-building rendering, siege and production controls", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.colony.state.technologies = [
      "mining",
      "automation",
      "logistics",
      "defense",
      "crystalPower",
      "habitation",
      "robotics",
      "plasmaPower",
      "advanced",
      "shipParts",
      "spaceport",
    ];
    Object.assign(w.survival.state.warehouse, {
      ironBar: 400,
      copperBar: 300,
      wafer: 80,
      wovenFiber: 80,
      refinedCell: 100,
      crystal: 200,
      titaniumBar: 120,
      electronics: 100,
      denseCell: 100,
      alloy: 40,
      polymer: 40,
      enzyme: 20,
      circuit: 20,
    });
    const layout: [string, number][] = [
      ["crystalGen", 3400],
      ["warehouse", 3560],
      ["relay", 3720],
      ["radar", 3840],
      ["turret", 4000],
      ["habitat", 4160],
      ["oxygen", 4360],
      ["relay", 4560],
      ["factory", 4680],
      ["plasmaGen", 4920],
      ["lab", 5120],
      ["miner", 5960],
      ["logistics", 5520],
      ["greenhouse", 5720],
      ["relay", 6160],
      ["solar", 6320],
      ["robotStation", 6520],
      ["miner2", 6760],
      ["medical", 6920],
      ["shipyard", 7120],
      ["port", 7400],
      ["analysis", 7680],
    ];
    for (const [k, x] of layout) {
      w.colony.place(k, x, 780);
      for (let i = 0; i < 16; i++) w.colony.tick(1);
    }
    w.colony.configure(
      w.colony.state.buildings.find((b: any) => b.kind === "factory").id,
      "electronics",
      true,
      100,
    );
    w.enterRegion("crash", 3900);
    w.events = [];
  });
  await page.keyboard.press("KeyO");
  await page.screenshot({ path: "artifacts/phase-4-command.png" });
  await page.locator('[data-action="cb-tab"][data-value="production"]').click();
  await expect(page.locator(".colony-table").first()).toContainText(
    "부품 생산 공장",
  );
  await page.screenshot({ path: "artifacts/phase-4-production.png" });
  await page.locator('[data-action="cb-tab"][data-value="personnel"]').click();
  await page.locator('[data-action="cb-rescue"]').click();
  await page
    .locator('[data-action="cb-recruit"][data-value="engineer"]')
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__ASTRO__.world.colony.state.settlers.length),
    )
    .toBe(1);
  await page.screenshot({ path: "artifacts/phase-4-personnel.png" });
  await page.locator('[data-action="cb-tab"][data-value="defense"]').click();
  await page.locator('[data-action="cb-siege"]').click();
  await page.evaluate(() => {
    window.__ASTRO__.world.colony.siege.remaining = 0.1;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "artifacts/phase-4-siege.png" });
  await page.evaluate(() => window.__ASTRO__.world.colony.abortSiege());
  await page.keyboard.press("KeyB");
  await page.locator('[data-action="cb-zoom"][data-value="all"]').click();
  await page.screenshot({ path: "artifacts/phase-4-overview.png" });
  // Stress fixture uses real definitions and complete buildings; construction cost/grants are not part of this measurement.
  await page.evaluate(() => {
    const c = window.__ASTRO__.world.colony;
    const sample = c.state.buildings.find((b: any) => b.kind === "solar");
    while (c.state.buildings.length < 100) {
      const i = c.state.buildings.length;
      const b = structuredClone(sample);
      b.id = ++c.state.serial;
      b.x = 3400 + (i % 30) * 200;
      b.y = 620 - Math.floor(i / 30) * 80;
      b.remaining = 0;
      c.state.buildings.push(b);
    }
    c.invalidate();
  });
  const sample = await page.evaluate(
    () =>
      new Promise<{ fps: number; p95: number; buildings: number }>(
        (resolve) => {
          const c = document
              .querySelector<HTMLCanvasElement>("#canvas canvas")!
              .getContext("2d")!,
            original = c.drawImage;
          const frames: number[] = [];
          let last = 0;
          c.drawImage = function (...args: any[]) {
            const now = performance.now();
            if (last) frames.push(now - last);
            last = now;
            original.apply(this, args as Parameters<typeof original>);
          };
          setTimeout(() => {
            c.drawImage = original;
            const sorted = [...frames].sort((a, b) => a - b);
            resolve({
              fps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
              p95: sorted[Math.floor(sorted.length * 0.95)],
              buildings: window.__ASTRO__.world.colony.state.buildings.length,
            });
          }, 5000);
        },
      ),
  );
  await writeFile(
    "artifacts/phase-4-performance.json",
    JSON.stringify(sample, null, 2),
  );
  expect(sample.fps).toBeGreaterThan(25);
  expect(errors).toEqual([]);
});
