import { test, expect } from "@playwright/test";
import { World } from "../../src/core/world";
import { defaultSettings } from "../../src/save/storage";
import { shipSystems } from "../../src/space/catalog";
test("production HORIZON travels to AQUARIA and LUNARIS, saves and restores without development hooks", async ({
  page,
}) => {
  const w = new World();
  w.progress.quest = 47;
  w.player.level = 60;
  w.player.hp = w.stats.hp;
  w.survival.state.blueprint = true;
  w.colony.initialize();
  w.space.state.launched = true;
  w.space.state.repaired = Object.keys(shipSystems) as any;
  w.space.state.fuel = 100;
  w.extreme.state.horizon = true;
  w.survival.state.technologies.push("oceanEngineering", "zeroGEngineering");
  w.survival.state.owned = [
    "aquaSuit",
    "vacuumSuit",
    "advancedJetCore",
    "rebreather",
  ];
  w.survival.state.equipped = ["aquaSuit", "rebreather"];
  w.space.board();
  const fixture = w.snapshot(defaultSettings());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((s) => {
    if (!localStorage.getItem("astrotopia.save.v1"))
      localStorage.setItem("astrotopia.save.v1", JSON.stringify(s));
  }, fixture);
  await page.goto("/");
  expect(await page.evaluate(() => Object.hasOwn(window, "__ASTRO__"))).toBe(
    false,
  );
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="sp-tab"][data-value="map"]').click();
  await page.locator('[data-action="sp-travel"][data-value="aquaria"]').click();
  await page.locator('[data-action="sp-skip"]').click();
  await page.keyboard.press("Escape");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(2300);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyW");
  await expect(page.locator(".space-environment")).toContainText("수심");
  await page.screenshot({ path: "artifacts/phase6-production-aquaria.png" });
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyC");
  await page
    .locator('[data-action="env-equip"][data-value="vacuumSuit"]')
    .click();
  await page
    .locator('[data-action="env-equip"][data-value="advancedJetCore"]')
    .click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="sp-board"]').click();
  await page.locator('[data-action="sp-tab"][data-value="map"]').click();
  await page.locator('[data-action="sp-travel"][data-value="lunaris"]').click();
  await page.locator('[data-action="sp-skip"]').click();
  await page.keyboard.press("Escape");
  await page.keyboard.down("Space");
  await page.waitForTimeout(800);
  await page.keyboard.up("Space");
  await expect(page.locator(".space-environment")).toContainText("LUNARIS");
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("astrotopia.save.v1")!),
  );
  expect(saved.version).toBe(9);
  expect(saved.space.location).toBe("lunaris");
  expect(saved.space.fuel).toBe(25);
  expect(saved.space.planets.aquaria).toBeTruthy();
  expect(saved.extreme.jetEnergy).toBeLessThan(100);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "artifacts/phase6-production-lunaris.png" });
  expect(errors).toEqual([]);
});
