import { test, expect } from "@playwright/test";
import { World } from "../../src/core/world";
test("offline cooperative server leaves the production solo save and continue flow intact", async ({
  page,
}) => {
  const w = new World(),
    save = w.snapshot(w.settings);
  save.inventory.iron = 17;
  await page.addInitScript(
    (data) => localStorage.setItem("astrotopia.save.v1", JSON.stringify(data)),
    save,
  );
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");
  expect(await page.evaluate(() => Object.hasOwn(window, "__ASTRO__"))).toBe(
    false,
  );
  const before = await page.evaluate(() =>
    localStorage.getItem("astrotopia.save.v1"),
  );
  await page.locator('[data-action="online"]').click();
  await expect(page.locator(".online-status")).toContainText("오프라인");
  await expect(page.locator(".online-notice")).not.toBeEmpty();
  expect(
    await page.evaluate(() => localStorage.getItem("astrotopia.save.v1")),
  ).toBe(before);
  await page.locator('[data-online="exit"]').click();
  await page.locator('[data-action="continue"]').click();
  await expect(page.locator("#hud")).toBeVisible();
  await page.screenshot({
    path: "artifacts/phase10-production-solo-preserved.png",
  });
});
