import { expect, test } from "@playwright/test";
declare global {
  interface Window {
    __ASTRO__: any;
  }
}
test("title, opening, keyboard movement, mining, menus and persistent continue", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "ASTROTOPIA", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /이어하기/ })).toBeDisabled();
  await page.screenshot({ path: "artifacts/title.png" });
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await expect(
    page.getByText("FLIGHT RECORDER", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await expect(page.locator(".quest-panel h3")).toHaveText("생존자");
  const x = await page.evaluate(() => window.__ASTRO__.world.player.x);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(500);
  await page.keyboard.down("Space");
  await page.waitForTimeout(200);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => window.__ASTRO__.world.player.x),
  ).toBeGreaterThan(x + 70);
  await page.waitForTimeout(900);
  await page.evaluate(() =>
    Object.assign(window.__ASTRO__.world.player, {
      x: 483,
      y: 716,
      vx: 0,
      vy: 0,
    }),
  );
  await page.keyboard.press("KeyF");
  await expect
    .poll(() =>
      page.evaluate(() => window.__ASTRO__.world.progress.counters.ship ?? 0),
    )
    .toBe(1);
  // Reposition only to avoid long travel in integration tests; mining uses actual key input and timer.
  await page.evaluate(() =>
    Object.assign(window.__ASTRO__.world.player, {
      x: 623,
      y: 716,
      vx: 0,
      vy: 0,
    }),
  );
  await page.keyboard.press("KeyF");
  await expect
    .poll(() =>
      page.evaluate(() => window.__ASTRO__.world.inventory.scrap ?? 0),
    )
    .toBe(3);
  await page.keyboard.press("KeyI");
  await expect(
    page.getByRole("heading", { name: "탐험가의 보관함" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "우주선 잔해 3개" }).click();
  await expect(page.locator("#item-detail")).toContainText("합금");
  await page.screenshot({ path: "artifacts/inventory.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyM");
  await expect(
    page.getByRole("heading", { name: "EDEN 탐사 지도" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "진행 상황 저장" }).click();
  await expect(
    page.getByText("탐험 기록이 저장되었습니다.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /이어하기/ }).click();
  expect(
    await page.evaluate(() => window.__ASTRO__.world.inventory.scrap),
  ).toBe(3);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "artifacts/crash-site.png" });
  await page.setViewportSize({ width: 900, height: 600 });
  const frame = page.locator("#game-frame");
  const rect = await frame.boundingBox();
  expect(rect!.width).toBeLessThanOrEqual(900);
  expect(rect!.height).toBeLessThanOrEqual(600);
  expect(errors).toEqual([]);
});
test("combat, all biomes, ending, death and revival integration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.enterRegion("forest");
    Object.assign(w.player, { x: 600, y: 716, invulnerable: 10 });
  });
  await page.keyboard.down("KeyJ");
  await expect
    .poll(() =>
      page.evaluate(() => window.__ASTRO__.world.progress.counters.slime ?? 0),
    )
    .toBeGreaterThanOrEqual(1);
  await page.keyboard.up("KeyJ");
  await page.waitForTimeout(4500);
  await page.screenshot({ path: "artifacts/luminous-forest.png" });
  await page.evaluate(() => window.__ASTRO__.world.enterRegion("valley"));
  await page.waitForTimeout(4700);
  await page.screenshot({ path: "artifacts/crystal-valley.png" });
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.player.invulnerable = 0;
    w.damage(1000, 500);
  });
  await expect(page.getByText("탐험 신호가 끊어졌습니다")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__ASTRO__.world.player.hp), {
      timeout: 6000,
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    const w = window.__ASTRO__.world;
    w.progress.counters = {
      move: 1,
      ship: 1,
      capsule: 1,
      beacon: 1,
      scrap: 3,
      crystal: 6,
      forest: 1,
      slime: 3,
      gel: 2,
      valley: 1,
      ruin: 1,
    };
    w.checkQuests();
  });
  await expect(
    page.getByRole("heading", { name: "오래된 별의 새로운 비밀" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "EDEN 탐험 계속하기" }).click();
  await expect(page.locator(".quest-panel h3")).toHaveText("전투 준비");
  expect(errors).toEqual([]);
});
test("settings, confirmation, pause and corrupt-save recovery", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /새로운 모험/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /협동 탐험/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "설정", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("그래픽 효과").selectOption("low");
  await page.getByLabel("배경음", { exact: true }).press("Home");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByLabel("그래픽 효과")).toHaveValue("low");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await page.getByRole("button", { name: /오프닝 건너뛰기/ }).click();
  await page.keyboard.press("Escape");
  const before = await page.evaluate(() => window.__ASTRO__.world.time);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ASTRO__.world.time)).toBe(before);
  await page.getByRole("button", { name: "저장 후 타이틀로" }).click();
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await expect(
    page.getByRole("heading", { name: "새로운 모험을 시작할까요?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "돌아가기", exact: true }).click();
  await expect(page.getByRole("button", { name: /이어하기/ })).toBeEnabled();
  await page.evaluate(() =>
    localStorage.setItem("astrotopia.save.v1", "{broken"),
  );
  await page.reload();
  await expect(page.locator(".storage-error")).toContainText("손상");
  await expect(page.getByRole("button", { name: /이어하기/ })).toBeDisabled();
});
