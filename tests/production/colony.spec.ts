import { test, expect } from "@playwright/test";
import { World } from "../../src/core/world";
import { defaultSettings } from "../../src/save/storage";
test("production bundle restores a v4 colony and supports real construction without debug hooks", async ({
  page,
}) => {
  const w = new World();
  w.progress.quest = 18;
  w.survival.state.blueprint = true;
  w.colony.initialize();
  Object.assign(w.survival.state.warehouse, {
    ironBar: 30,
    copperBar: 20,
    wafer: 10,
    wovenFiber: 10,
  });
  const fixture = w.snapshot(defaultSettings());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((save) => {
    if (!localStorage.getItem("astrotopia.save.v1"))
      localStorage.setItem("astrotopia.save.v1", JSON.stringify(save));
  }, fixture);
  await page.goto("/");
  expect(await page.evaluate(() => Object.hasOwn(window, "__ASTRO__"))).toBe(
    false,
  );
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyO");
  await expect(
    page.getByRole("heading", { name: "기지 관제 센터" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyB");
  await expect(page.locator("#builder-ui")).toBeVisible();
  await page
    .locator('[data-action="cb-category"][data-value="habitat"]')
    .click();
  await page
    .locator('[data-action="cb-blueprint"][data-value="habitat"]')
    .click();
  const r = (await page.locator("#game-frame").boundingBox())!;
  await page.mouse.click(
    r.x + (645 * r.width) / 1280,
    r.y + (595 * r.height) / 720,
  );
  await page.waitForTimeout(5500);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "진행 상황 저장" }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("astrotopia.save.v1")!),
  );
  expect(saved.version).toBe(7);
  expect(
    saved.colony.buildings.filter((b: any) => b.kind === "habitat"),
  ).toHaveLength(1);
  expect(
    saved.colony.buildings.find((b: any) => b.kind === "habitat").remaining,
  ).toBe(0);
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyO");
  await expect(page.locator(".colony-facilities")).toContainText(
    "소형 거주 모듈",
  );
  await page.screenshot({ path: "artifacts/phase-4-production-bundle.png" });
  expect(errors).toEqual([]);
});
