import { test, expect } from "@playwright/test";
import type { View } from "../../shared/online";
test("two independent browsers join by invite, form a party, move and exchange escaped chat without touching solo saves", async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const latest: Partial<View>[] = [{}, {}];
  for (const [i, page] of pages.entries()) {
    page.on("websocket", (ws) =>
      ws.on("framereceived", (e) => {
        try {
          const m = JSON.parse(e.payload.toString());
          if (m.type === "state") latest[i] = m;
        } catch {}
      }),
    );
    await page.addInitScript(() =>
      localStorage.setItem("solo-sentinel", "unchanged"),
    );
    await page.goto("/");
    await page.locator('[data-action="online"]').click();
    await page.locator("#on-name").fill(i ? "Bora" : "Astra");
    await page.locator('[data-online="login"]').click();
  }
  const [a, b] = pages;
  await a.locator("#on-world-name").fill("우리의 첫 개척지");
  await a.locator('[data-online="create"]').click();
  await expect.poll(() => latest[0].world?.invite).toBeTruthy();
  await b.locator("#on-invite").fill(latest[0].world!.invite!);
  await b.locator('[data-online="join"]').click();
  await expect.poll(() => latest[0].players?.length).toBe(1);
  await a.locator('[data-online="panel"][data-value="party"]').click();
  await a.locator('[data-online="partyCreate"]').click();
  await expect.poll(() => latest[0].self?.party).toBeTruthy();
  await b.locator('[data-online="panel"][data-value="party"]').click();
  await b.locator('[data-online="partyJoin"]').click();
  await expect.poll(() => latest[1].self?.party).toBe(latest[0].self!.party);
  await a.keyboard.press("Escape");
  await b.keyboard.press("Escape");
  const x = latest[0].self!.body.x;
  await a.keyboard.down("d");
  await a.waitForTimeout(700);
  await a.keyboard.up("d");
  await expect.poll(() => latest[0].self!.body.x).toBeGreaterThan(x + 50);
  expect(latest[1].self!.body.x).toBeCloseTo(360);
  await a.keyboard.press("Enter");
  await a.locator("#on-chat").fill("<img src=x onerror=alert(1)> 안녕");
  await a.locator('[data-online="chat"]').click();
  await expect.poll(() => latest[1].chat?.at(-1)?.text).toContain("<img");
  await b.keyboard.press("Enter");
  await expect(b.locator("#on-chat-log")).toContainText("<img src=x");
  await expect(b.locator("#on-chat-log img")).toHaveCount(0);
  await b.keyboard.press("Escape");
  await a.keyboard.press("Escape");
  await a.screenshot({ path: "artifacts/phase10-two-clients.png" });
  await a.keyboard.down("a");
  await a.waitForTimeout(250);
  await a.keyboard.up("a");
  for (const page of pages) {
    await page.locator('[data-online="panel"][data-value="world"]').click();
    await page.locator('[data-online="region"][data-value="forest"]').click();
    await page.keyboard.press("Escape");
  }
  await expect.poll(() => latest[0].self?.region).toBe("forest");
  await a.keyboard.down("d");
  await a.waitForTimeout(60);
  await a.keyboard.up("d");
  await a.keyboard.down("j");
  await a.waitForTimeout(100);
  await b.keyboard.down("j");
  await expect.poll(() => latest[0].self?.kills).toBeGreaterThan(0);
  await expect.poll(() => latest[1].self?.kills).toBeGreaterThan(0);
  await a.keyboard.up("j");
  await b.keyboard.up("j");
  await a.screenshot({ path: "artifacts/phase10-coop-combat.png" });
  for (const page of pages) {
    await page.locator('[data-online="panel"][data-value="world"]').click();
    await page.locator('[data-online="region"][data-value="crash"]').click();
    await page.keyboard.press("Escape");
  }
  await expect.poll(() => latest[0].self?.region).toBe("crash");
  await a.locator('[data-online="panel"][data-value="colony"]').click();
  await a.locator("#on-building-kind").selectOption("solar");
  await a.locator('[data-online="build"]').click();
  await expect
    .poll(
      () =>
        ((latest[0].extension?.colony as any)?.buildings ?? []).filter(
          (v: any) => v.kind === "solar",
        ).length,
    )
    .toBe(1);
  await b.locator('[data-online="panel"][data-value="colony"]').click();
  await expect(b.locator('[data-online="build"]')).toHaveCount(0);
  await expect(b.locator(".online-panel")).toContainText("BUILDER");
  await a.locator('[data-online="shuttle"]').click();
  await a.keyboard.press("Escape");
  await expect.poll(() => latest[0].self?.body.x).toBeGreaterThan(3300);
  await a.waitForTimeout(1200);
  await a.screenshot({ path: "artifacts/phase10-shared-colony.png" });
  await a.locator('[data-online="panel"][data-value="expedition"]').click();
  await expect(a.locator(".online-panel")).toContainText("행성 항해");
  await expect(a.locator('[data-online="raid"]')).toBeDisabled();
  await expect(a.locator('[data-online="raid"]')).toContainText("엔딩 필요");
  await expect(a.locator('[data-online="stationVisit"]')).toBeDisabled();
  await a.screenshot({ path: "artifacts/phase10-expedition-panel.png" });
  for (const page of pages) {
    expect(
      await page.evaluate(() => localStorage.getItem("solo-sentinel")),
    ).toBe("unchanged");
    expect(
      await page.evaluate(() => localStorage.getItem("astrotopia.save.v1")),
    ).toBeNull();
  }
  await Promise.all(contexts.map((c) => c.close()));
});
test("four independent browsers retain region updates and expose measured simulation/render timings", async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 4 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const latest: Partial<View>[] = [{}, {}, {}, {}];
  for (const [i, page] of pages.entries()) {
    page.on("websocket", (ws) =>
      ws.on("framereceived", (e) => {
        const m = JSON.parse(e.payload.toString());
        if (m.type === "state") latest[i] = m;
      }),
    );
    await page.goto("/");
    await page.locator('[data-action="online"]').click();
    await page.locator("#on-name").fill("Explorer " + (i + 1));
    await page.locator('[data-online="login"]').click();
    if (i === 0) {
      await page.locator('[data-online="create"]').click();
      await expect.poll(() => latest[0].world?.invite).toBeTruthy();
    } else {
      await page.locator("#on-invite").fill(latest[0].world!.invite!);
      await page.locator('[data-online="join"]').click();
      await expect.poll(() => latest[i].self?.connected).toBe(true);
    }
  }
  await expect
    .poll(() =>
      latest.every(
        (state) => state.members?.filter((m) => m.connected).length === 4,
      ),
    )
    .toBe(true);
  for (const [i, page] of pages.entries())
    if (i) {
      await page.keyboard.down("d");
      await page.waitForTimeout(i * 220);
      await page.keyboard.up("d");
    }
  const samples = await Promise.all(
    pages.map((page) =>
      page.evaluate(async () => {
        const api = (window as any).__ASTRO__;
        const before = api.online(),
          start = performance.now();
        await new Promise((r) => setTimeout(r, 5000));
        const after = api.online(),
          elapsed = performance.now() - start;
        return {
          ...after,
          frames: after.frames - before.frames,
          elapsed,
          fps: (1000 * (after.frames - before.frames)) / elapsed,
        };
      }),
    ),
  );
  for (const s of samples) {
    expect(s.frames).toBeGreaterThan(100);
    expect(s.serverMs).toBeLessThan(50);
    expect(s.connected).toBe(4);
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    "artifacts/phase10-four-client-performance.json",
    JSON.stringify(
      {
        clients: 4,
        measuredAt: new Date().toISOString(),
        samples: samples.map((s) => ({
          ...s,
          samples: undefined,
          p95: s.samples.slice().sort((a: number, b: number) => a - b)[
            Math.floor(s.samples.length * 0.95)
          ],
        })),
      },
      null,
      2,
    ),
  );
  await pages[0].locator('[data-online="panel"][data-value="party"]').click();
  await pages[0].screenshot({ path: "artifacts/phase10-four-clients.png" });
  await Promise.all(contexts.map((c) => c.close()));
});
