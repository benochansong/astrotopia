import type { Enemy } from "../core/types";
import { enemyData } from "../data/content";
import type { AttackPayload, AttackShape } from "./types";
export const enemySize = (e: Enemy) => ({
  w: enemyData[e.kind].w * (e.elite ? 1.25 : 1),
  h: enemyData[e.kind].h * (e.elite ? 1.25 : 1),
});
export function overlaps(
  shape: AttackShape,
  rect: { x: number; y: number; w: number; h: number },
): boolean {
  if (shape.kind === "rect")
    return (
      shape.x < rect.x + rect.w &&
      shape.x + shape.w > rect.x &&
      shape.y < rect.y + rect.h &&
      shape.y + shape.h > rect.y
    );
  let left = rect.x,
    right = rect.x + rect.w;
  if (shape.kind === "arc") {
    if (shape.facing > 0) left = Math.max(left, shape.x);
    else right = Math.min(right, shape.x);
    if (right < left) return false;
  }
  const x = Math.max(left, Math.min(right, shape.x)),
    y = Math.max(rect.y, Math.min(rect.y + rect.h, shape.y));
  return (x - shape.x) ** 2 + (y - shape.y) ** 2 <= shape.radius ** 2;
}
export class DamageSystem {
  static resolve(
    e: Enemy,
    a: AttackPayload,
    roll = Math.random(),
    core = false,
  ) {
    const d = enemyData[e.kind];
    let multiplier = d.resists?.[a.element] ?? 1;
    const fromBehind = (a.sourceX - (e.x + enemySize(e).w / 2)) * e.facing < 0;
    const weak =
      e.kind === "beetle" &&
      (fromBehind || a.special || a.element === "electric");
    if (e.kind === "beetle" && !weak) multiplier *= 0.4;
    if (weak) multiplier *= 1.35;
    if (core) multiplier *= 1.65;
    if (e.kind === "guardian" && e.shield <= 0) multiplier *= 1.4;
    const defense = (d.defense ?? 0) + (e.elite === "fortified" ? 8 : 0),
      shred = e.statuses.some((s) => s.id === "shred") ? 1.2 : 1;
    const critical = roll < a.crit;
    const damage = Math.max(
      1,
      Math.round(
        (a.damage - defense * 0.65) *
          multiplier *
          shred *
          (critical ? a.critDamage : 1),
      ),
    );
    return { damage, critical, weak };
  }
}
