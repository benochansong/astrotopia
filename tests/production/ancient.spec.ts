import { test, expect } from "@playwright/test";
import { World } from "../../src/core/world";
import { defaultSettings, parseSave } from "../../src/save/storage";
test("production ECHO ending confirmation, film reload and free-roam challenge return preserve the real save", async ({
  page,
}) => {
  const w = new World();
  w.player.level = 100;
  w.combat.unlock();
  w.omega.state.visited = true;
  w.omega.state.kills = {
    aeternumGuardian: 1,
    nexusOverlord: 1,
    genesisZero: 1,
  };
  w.space.state.launched = true;
  w.space.switchPlanet("omega");
  w.player.hp = w.stats.hp;
  w.inventory = { iron: 7 };
  const fixture = w.snapshot(defaultSettings());
  expect(parseSave(JSON.stringify(fixture))).not.toBeNull();
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
  await page.locator('[data-action="ancient"]').click();
  await page.locator('[data-action="an-tab"][data-value="ending"]').click();
  await page.locator('[data-action="an-choose"][data-value="freedom"]').click();
  await expect(page.locator(".ancient-confirm")).toBeVisible();
  await page.locator('[data-action="an-confirm"]').click();
  await expect(page.locator(".ancient-skip")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await expect(page.locator(".ancient-skip")).toBeVisible();
  await page.locator(".ancient-skip").click();
  await page.locator('[data-action="ancient"]').click();
  await page.locator('[data-action="an-tab"][data-value="equipment"]').click();
  await page.locator('[data-action="an-ascend"]').click();
  await expect(page.locator(".ancient-panel")).toContainText("승격 완료");
  await page.locator('[data-action="an-tab"][data-value="endgame"]').click();
  await page.screenshot({ path: "artifacts/phase8-production-endgame.png" });
  await page.locator('[data-action="an-run"][data-value="nexus"]').click();
  await expect(page.locator(".ancient-challenge")).toBeVisible();
  await page.locator('[data-action="an-exit"]').click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("astrotopia.save.v1")!),
  );
  expect(saved.version).toBe(9);
  expect(saved.ancient.ending).toBe("freedom");
  expect(saved.ancient.ascended).toBe(true);
  expect(saved.inventory.iron).toBe(7);
  expect(saved.region).toBe("omegaLanding");
  expect(errors).toEqual([]);
});
