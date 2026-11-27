import type { Platform } from "../data/content";
import type { InputFrame, Player } from "../core/types";
export const MAX_STEP = 1 / 120;
export const maxHp = (level: number) => 100 + (level - 1) * 10;
export const attackPower = (level: number) => 12 + (level - 1) * 2;
export const xpRequired = (level: number) => 50 + (level - 1) * 25;
const approach = (v: number, target: number, amount: number) =>
  v < target ? Math.min(target, v + amount) : Math.max(target, v - amount);
export function movePlayer(
  p: Player,
  input: InputFrame,
  dt: number,
  platforms: Platform[],
  gravity: number,
  tuning: {
    speed: number;
    energy: number;
    regen: number;
    friction?: number;
    jumpSpeed?: number;
    swimming?: boolean;
    airControl?: number;
  } = { speed: 250, energy: 100, regen: 12 },
): boolean {
  const landedBefore = p.grounded;
  p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
  p.jumpBuffer = input.jump ? 0.14 : Math.max(0, p.jumpBuffer - dt);
  p.drop = Math.max(0, p.drop - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.dash = Math.max(0, p.dash - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.shotCooldown = Math.max(0, p.shotCooldown - dt);
  const direction = Number(input.right) - Number(input.left);
  if (direction) p.facing = direction;
  if (
    input.down &&
    p.grounded &&
    platforms.some(
      (t) =>
        t.oneWay &&
        Math.abs(p.y + p.h - t.y) < 2 &&
        p.x + p.w > t.x &&
        p.x < t.x + t.w,
    )
  ) {
    p.drop = 0.28;
    p.grounded = false;
    p.y += 3;
    p.coyote = 0;
  }
  if (input.dash && p.dashCooldown === 0 && p.energy >= 18) {
    p.dash = 0.17;
    p.dashCooldown = 2;
    p.invulnerable = Math.max(p.invulnerable, 0.18);
    p.energy -= 18;
  }
  if (p.jumpBuffer > 0 && p.coyote > 0 && !p.drop) {
    p.vy = -(tuning.jumpSpeed ?? 520);
    p.grounded = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
  }
  if (!input.jumpHeld && p.vy < -190) p.vy = Math.max(-190, p.vy + 2200 * dt);
  p.vx =
    p.dash > 0
      ? p.facing * 660
      : approach(
          p.vx,
          direction * tuning.speed,
          (p.grounded
            ? 1800 * (tuning.friction ?? 1)
            : (tuning.airControl ?? 1100)) * dt,
        );
  if (p.dash > 0 && !tuning.swimming) p.vy = 0;
  else p.vy = Math.min(p.vy + 1100 * gravity * dt, 800);
  const oldX = p.x;
  p.x += p.vx * dt;
  for (const t of platforms) {
    if (t.oneWay || p.y + p.h <= t.y + 0.5 || p.y >= t.y + t.h) continue;
    if (p.x + p.w > t.x && p.x < t.x + t.w) {
      if (oldX + p.w <= t.x + 0.5) p.x = t.x - p.w;
      else if (oldX >= t.x + t.w - 0.5) p.x = t.x + t.w;
      p.vx = 0;
    }
  }
  const oldY = p.y;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const t of platforms) {
    if (p.x + p.w <= t.x || p.x >= t.x + t.w) continue;
    if (t.oneWay && (p.drop > 0 || p.vy < 0)) continue;
    if (p.vy >= 0 && oldY + p.h <= t.y + 0.5 && p.y + p.h >= t.y) {
      p.y = t.y - p.h;
      p.vy = 0;
      p.grounded = true;
    } else if (!t.oneWay && p.vy < 0 && oldY >= t.y + t.h && p.y < t.y + t.h) {
      p.y = t.y + t.h;
      p.vy = 0;
    }
  }
  p.energy = Math.min(tuning.energy, p.energy + dt * tuning.regen);
  return !landedBefore && p.grounded;
}
