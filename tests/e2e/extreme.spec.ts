import { test, expect } from "@playwright/test";
test("FROSTIA flight, ice environment, archive, Leviathan and safe persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.space.state.launched = true;
    w.space.state.fuel = 100;
    w.space.state.repaired = [
      "hull",
      "propulsion",
      "navigation",
      "communication",
      "lifeSupport",
      "core",
      "landing",
    ];
    w.survival.state.technologies.push("cryoEngineering", "pathfinder");
    w.survival.state.owned = [
      "thermalSuit",
      "heatingCore",
      "iceBoots",
      "oxygen",
    ];
    w.survival.state.equipped = [
      "thermalSuit",
      "heatingCore",
      "iceBoots",
      "oxygen",
    ];
    w.space.board();
  });
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="sp-tab"][data-value="map"]').click();
  await page.locator('[data-action="sp-travel"][data-value="frostia"]').click();
  await page.locator('[data-action="sp-skip"]').click();
  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.__ASTRO__.world.region))
    .toBe("frostiaLanding");
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("frostiaWilds", 1400);
    w.player.invulnerable = 999;
    w.extreme.state.weather.frostia = 145;
  });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: "artifacts/phase6-frostia.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("frostiaRuins", 3850);
    w.extreme.combat.start("leviathan");
    w.extreme.combat.timer = 0;
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: "artifacts/phase6-leviathan.png" });
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(await page.evaluate(() => window.__ASTRO__.world.planetId)).toBe(
    "frostia",
  );
  expect(
    await page.evaluate(() => window.__ASTRO__.world.player.x),
  ).toBeLessThan(700);
  expect(errors).toEqual([]);
});

test("INFERNO high gravity, lava and Helios reactor render without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.space.state.launched = true;
    w.space.switchPlanet("inferno");
    w.enterRegion("infernoWilds", 1500);
    w.player.invulnerable = 999;
    w.survival.state.owned = [
      "thermalShield",
      "exoskeleton",
      "magmaBoots",
      "ashFilter",
      "oxygen",
    ];
    w.survival.state.equipped = [...w.survival.state.owned];
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "artifacts/phase6-inferno.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("infernoRuins", 3850);
    w.extreme.combat.start("helios");
    w.extreme.combat.timer = 0;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/phase6-helios.png" });
  expect(errors).toEqual([]);
});

test("AQUARIA keyboard swimming, vertical aiming, deep boss and safe reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.space.state.launched = true;
    w.space.switchPlanet("aquaria");
    w.enterRegion("aquariaWilds");
    w.player.x = 1400;
    w.player.y = 1400;
    w.player.invulnerable = 999;
    w.survival.state.owned = [
      "deepPressureSuit",
      "rebreather",
      "hydroPropulsor",
      "abyssLight",
    ];
    w.survival.state.equipped = [...w.survival.state.owned];
    w.survival.state.oxygen = w.survival.oxygen.maximum;
  });
  const before = await page.evaluate(() => window.__ASTRO__.world.player.y);
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1000);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => window.__ASTRO__.world.player.y),
  ).toBeLessThan(before - 70);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/phase6-aquaria.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("aquariaRuins");
    w.player.x = 3833;
    w.player.y = 2036;
    w.player.invulnerable = 999;
  });
  await page.keyboard.press("KeyF");
  await expect
    .poll(() =>
      page.evaluate(() => window.__ASTRO__.world.extreme.combat.boss?.kind),
    )
    .toBe("emperor");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "artifacts/phase6-emperor.png" });
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(await page.evaluate(() => window.__ASTRO__.world.planetId)).toBe(
    "aquaria",
  );
  expect(
    await page.evaluate(() => window.__ASTRO__.world.player.x),
  ).toBeLessThan(650);
  expect(errors).toEqual([]);
});
test("LUNARIS keyboard thrust, gravity puzzle, Archon and expedition management", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.space.state.launched = true;
    w.space.switchPlanet("lunaris");
    w.enterRegion("lunarisWilds");
    w.player.x = 1400;
    w.player.y = 500;
    w.player.invulnerable = 999;
    w.survival.state.owned = [
      "vacuumSuit",
      "advancedJetCore",
      "radShield",
      "rebreather",
    ];
    w.survival.state.equipped = [...w.survival.state.owned];
  });
  await page.keyboard.down("Space");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1200);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => window.__ASTRO__.world.extreme.state.jetEnergy),
  ).toBeLessThan(95);
  await page.screenshot({ path: "artifacts/phase6-lunaris.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("lunarisRuins");
    w.player.invulnerable = 999;
  });
  for (let n = 0; n < 3; n++) {
    await page.evaluate((n) => {
      const w = window.__ASTRO__.world;
      w.player.x = 2583 + n * 350;
      w.player.y = 716;
      w.player.vy = 0;
    }, n);
    await page.keyboard.press("KeyF");
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.player.x = 3833;
    w.player.y = 716;
  });
  await page.keyboard.press("KeyF");
  await expect
    .poll(() =>
      page.evaluate(() => window.__ASTRO__.world.extreme.combat.boss?.kind),
    )
    .toBe("archon");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "artifacts/phase6-archon.png" });
  await page.keyboard.press("KeyU");
  await page
    .locator('[data-action="sp-tab"][data-value="exploration"]')
    .click();
  await expect(
    page.getByRole("heading", { name: "탐험 진행도" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/phase6-exploration.png" });
  expect(errors).toEqual([]);
});

test("vehicle management UI builds a rover, carries cargo, drives and persists parked state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.survival.state.blueprint = true;
    w.colony.initialize();
    w.survival.state.technologies.push("thermalEngineering");
    w.inventory = { cryoAlloy: 4, engineParts: 2, advancedBattery: 2, iron: 3 };
  });
  await page.keyboard.press("KeyU");
  await page
    .locator('[data-action="sp-tab"][data-value="exploration"]')
    .click();
  await page
    .locator('[data-action="ext-vehicle-create"][data-value="rover"]')
    .click();
  await page
    .locator('[data-action="ext-vehicle-in"][data-value="iron"]')
    .click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyZ");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__ASTRO__.world.extreme.state.vehicle?.mounted,
      ),
    )
    .toBe(true);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(800);
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => window.__ASTRO__.world.player.x),
  ).toBeGreaterThan(550);
  await page.screenshot({ path: "artifacts/phase6-rover.png" });
  await page.keyboard.press("KeyZ");
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  const v = await page.evaluate(
    () => window.__ASTRO__.world.extreme.state.vehicle,
  );
  expect(v?.mounted).toBe(false);
  expect(v?.cargo.iron).toBe(1);
  expect(v?.energy).toBeLessThan(100);
  expect(errors).toEqual([]);
});
