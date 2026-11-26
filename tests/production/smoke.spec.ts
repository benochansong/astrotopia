import { test, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
test("production assets, full opening, actual keyboard controls and rendering cadence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => errors.push(r.url()));
  const response = await page.goto("/");
  expect(response!.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "ASTROTOPIA", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => Object.hasOwn(window, "__ASTRO__"))).toBe(
    false,
  );
  await page.getByRole("button", { name: /새로운 모험/ }).click();
  await expect(
    page.getByText("지구의 마지막 자원이 고갈되던 해, 인류는 별을 향했다."),
  ).toBeVisible();
  await expect(page.locator(".quest-panel h3")).toHaveText("생존자", {
    timeout: 35000,
  });
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(350);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("Space");
  await page.waitForTimeout(200);
  await page.keyboard.up("Space");
  await page.waitForTimeout(900);
  await page.keyboard.press("KeyF");
  await expect(page.locator(".quest-panel li").nth(0)).toHaveClass("complete");
  await expect(page.locator(".quest-panel li").nth(1)).toHaveClass("complete");
  const measurement = await page.evaluate(
    () =>
      new Promise<{ fps: number; p95FrameMs: number }>((resolve) => {
        const frames: number[] = [];
        const canvas =
          document.querySelector<HTMLCanvasElement>("#canvas canvas")!;
        const context = canvas.getContext("2d")!;
        const original = context.drawImage;
        let previous = 0;
        context.drawImage = function (
          this: CanvasRenderingContext2D,
          ...args: any[]
        ) {
          const time = performance.now();
          if (previous) frames.push(time - previous);
          previous = time;
          original.apply(this, args as Parameters<typeof original>);
        } as typeof original;
        setTimeout(() => {
          context.drawImage = original;
          const sorted = [...frames].sort((a, b) => a - b);
          resolve({
            fps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
            p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
          });
        }, 5000);
      }),
  );
  console.log("Production rendering cadence:", JSON.stringify(measurement));
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/performance.json",
    JSON.stringify(
      {
        environment: "Windows / local Chrome / 1440x900 / high effects",
        method:
          "5 second sample of actual Phaser display-canvas drawImage calls; one game image per frame",
        ...measurement,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: "artifacts/production.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "진행 상황 저장" }).click();
  await expect(
    page.getByText("탐험 기록이 저장되었습니다.", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
