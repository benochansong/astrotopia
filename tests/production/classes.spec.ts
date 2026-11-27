import { test, expect } from "@playwright/test";
import { World } from "../../src/core/world";
import { defaultSettings } from "../../src/save/storage";
test("production advanced class, actual ultimate, gear crafting and cooldown persistence without debug hooks", async ({
  page,
}) => {
  const w = new World();
  w.player.level = 60;
  w.combat.unlock();
  w.classes.state.trials.engineer = 1;
  w.classes.choose("engineer");
  w.classes.state.trials.engineer_tier2 = 1;
  w.classes.specialize("mechanic");
  w.classes.state.trials.engineer_tier3 = 1;
  w.classes.state.gauge = 100;
  w.inventory = { ultraAlloy: 4, superCircuit: 2 };
  w.player.hp = w.stats.hp;
  w.player.energy = w.stats.energy;
  const fixture = w.snapshot(defaultSettings()),
    errors: string[] = [];
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
  await page.keyboard.press("KeyV");
  await page.locator('[data-action="cl-advance"]').click();
  await expect(page.locator(".class-header")).toContainText("MECH ARCHITECT");
  await page.locator('[data-action="cl-tab"][data-value="tree"]').click();
  await page
    .locator('[data-action="cl-learn"][data-value="mechanic_0"]')
    .click();
  await page
    .locator('[data-action="cl-learn"][data-value="mechanic_ultimate"]')
    .click();
  await page.locator('[data-action="cl-tab"][data-value="progress"]').click();
  await page.locator('[data-action="cl-gear"][data-value="body"]').click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Digit6");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "artifacts/phase7-production-mech.png" });
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("astrotopia.save.v1")!),
  );
  expect(saved.classes.tier).toBe(3);
  expect(saved.classes.gauge).toBe(0);
  expect(saved.classes.cooldowns.mechanic_ultimate).toBeGreaterThan(90);
  expect(
    saved.battle.gear.some((g: any) => g.template === "class_engineer_body"),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await expect(page.locator(".class-gauge")).toContainText("TITAN MECH");
  await page.keyboard.press("Digit6");
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("astrotopia.save.v1")!));
  expect(after.classes.cooldowns.mechanic_ultimate).toBeLessThanOrEqual(saved.classes.cooldowns.mechanic_ultimate);
  expect(after.classes.gauge).toBe(0);
  expect(errors).toEqual([]);
});
