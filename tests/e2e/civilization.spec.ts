import { test, expect, type Page } from "@playwright/test";
import { ports } from "../fixtures/civilization";
import { parseSave, defaultSettings } from "../../src/save/storage";
const fixture = () => {
  const w = ports();
  w.battle.credits = 3000;
  w.survival.state.warehouse = {
    alloy: 30,
    electronics: 20,
    hullPanel: 5,
    iron: 100,
    shipFuel: 40,
  };
  w.civilization.state.station.stage = 1;
  const s = w.snapshot(defaultSettings());
  expect(parseSave(JSON.stringify(s))).not.toBeNull();
  return s;
};
const open = async (page: Page) => {
  await page.addInitScript((s) => {
    if (!localStorage.getItem("astrotopia.save.v1"))
      localStorage.setItem("astrotopia.save.v1", JSON.stringify(s));
  }, fixture());
  await page.goto("/");
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="civilization"]').click();
};
const save = async (page: Page) => {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("astrotopia.save.v1")!),
  );
};
test("civilization commands execute NPC trade and an actual automated freight trip across reload", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await expect(page.locator(".civil-hero")).toContainText("일곱 세계");
  await page.screenshot({ path: "artifacts/phase9-command.png" });
  await page.locator('[data-action="cv-tab"][data-value="economy"]').click();
  await page.locator("#cv-market-item").selectOption("copper");
  await page.locator('[data-action="cv-buy"]').click();
  await expect(page.locator(".civil-table").first()).toContainText("10 / 90");
  await page.screenshot({ path: "artifacts/phase9-market.png" });
  await page.locator('[data-action="cv-tab"][data-value="logistics"]').click();
  await page.locator('[data-action="cv-ship"][data-value="1"]').click();
  await page.locator("#cv-amount").fill("40");
  await page.locator("#cv-minimum").fill("20");
  await page.locator("#cv-target").fill("80");
  await page.locator('[data-action="cv-route"]').click();
  await expect(page.locator(".civilization")).toContainText("eden → ares");
  await page.locator('[data-action="cv-tab"][data-value="overview"]').click();
  await expect(page.locator(".civil-network title")).toContainText(
    "InTransit",
    { timeout: 15000 },
  );
  await page.screenshot({ path: "artifacts/phase9-freight.png" });
  const inFlight = await save(page);
  expect(inFlight.civilization.ships[0].cargo.iron).toBe(40);
  expect(inFlight.survival.warehouse.iron).toBe(60);
  expect(inFlight.survival.warehouse.copper).toBe(10);
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyU");
  await page.locator('[data-action="civilization"]').click();
  await expect(page.locator("#civil-live")).toContainText("40 운송 완료", {
    timeout: 45000,
  });
  const completed = await save(page);
  expect(completed.space.planets.ares.local.warehouse.iron).toBe(40);
  expect(completed.civilization.stats.delivered).toBe(40);
  expect(errors).toEqual([]);
});
test("station has a playable seven-zone interior and planner keeps material balances unchanged", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.locator('[data-action="cv-tab"][data-value="industry"]').click();
  await expect(page.locator(".civilization")).toContainText("고효율 냉각 셀");
  await page.screenshot({ path: "artifacts/phase9-planner.png" });
  await page
    .locator('[data-action="cv-tab"][data-value="infrastructure"]')
    .click();
  await page.locator('[data-action="cv-visit"]').click();
  await expect(page.locator("#dialog-layer")).toBeHidden();
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(2000);
  await page.keyboard.up("KeyD");
  await page.screenshot({ path: "artifacts/phase9-station.png" });
  await page.keyboard.press("Escape");
  await page.locator('[data-action="save"]').click();
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("astrotopia.save.v1")!),
  );
  expect(s.region).toBe("station");
  expect(s.x).toBeGreaterThan(600);
  expect(s.civilization.station.visited).toBe(true);
  expect(s.survival.warehouse.iron).toBe(100);
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await page.keyboard.press("KeyF");
  await expect(page.locator(".civilization")).toBeVisible();
  await page
    .locator('[data-action="cv-tab"][data-value="infrastructure"]')
    .click();
  await page.locator('[data-action="cv-leave"]').click();
  await expect(page.locator("#dialog-layer")).toBeHidden();
  expect(errors).toEqual([]);
});
