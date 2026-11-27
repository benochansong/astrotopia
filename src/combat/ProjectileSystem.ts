import type { World } from "../core/world";
import type { AttackPayload } from "./types";
import { enemySize, overlaps } from "./DamageSystem";
export class ProjectileSystem {
  constructor(private w: World) {}
  fire(
    x: number,
    y: number,
    vx: number,
    vy: number,
    range: number,
    radius: number,
    color: string,
    a: AttackPayload,
    pierce = false,
    blast = 0,
  ) {
    const w = this.w;
    if (w.extreme.physics.swimming || w.planetId === "lunaris") {
      if (vy === 0 && w.extreme.physics.aim) {
        const speed = Math.abs(vx);
        vx *= 0.707;
        vy = speed * w.extreme.physics.aim * 0.707;
      }
      if (w.extreme.physics.swimming) {
        const factor =
          w.classes.state.classId === "ranger"
            ? 0.95
            : a.element === "physical"
              ? 0.55
              : 0.8;
        vx *= factor;
        vy *= factor;
        range *= 0.85;
      }
    }
    const b = this.w.bullets.find((b) => !b.active);
    if (!b) return false;
    Object.assign(b, {
      active: true,
      x,
      y,
      vx,
      vy,
      life: range / Math.max(1, Math.hypot(vx, vy)),
      radius,
      color,
      ...a,
      pierce,
      blast,
      hits: [],
    });
    return true;
  }
  update(dt: number) {
    for (const b of this.w.bullets) {
      if (!b.active) continue;
      const steps = Math.max(
        1,
        Math.ceil((Math.hypot(b.vx, b.vy ?? 0) * dt) / 12),
      );
      for (let i = 0; i < steps && b.active; i++) {
        b.x += (b.vx * dt * this.w.omega.localTime(b.x)) / steps;
        b.y += ((b.vy ?? 0) * dt * this.w.omega.localTime(b.x)) / steps;
        b.life -= dt / steps;
        if (b.life <= 0) {
          if (b.blast) this.explode(b);
          b.active = false;
          break;
        }
        for (const e of this.w.combat.targets) {
          if (e.state === "Death" || b.hits?.includes(e.id)) continue;
          const size = enemySize(e);
          if (
            !overlaps(
              {
                kind: "circle",
                x: b.x,
                y: b.y,
                w: 0,
                h: 0,
                radius: b.radius ?? 4,
                facing: 1,
              },
              { x: e.x, y: e.y, ...size },
            )
          )
            continue;
          if (b.blast) {
            this.explode(b);
            b.active = false;
            break;
          }
          this.w.combat.hit(e, this.payload(b));
          b.hits!.push(e.id);
          if (!b.pierce) {
            b.active = false;
            break;
          }
        }
      }
    }
  }
  private payload(b: World["bullets"][number]): AttackPayload {
    return {
      damage: b.damage,
      classSkill: b.classSkill,
      summon: b.summon,
      element: b.element ?? "plasma",
      crit: b.crit ?? 0,
      critDamage: b.critDamage ?? 1.65,
      knockback: b.knockback ?? 140,
      status: b.status,
      statusChance: b.statusChance ?? 0,
      special: b.special ?? false,
      sourceX: b.x - Math.sign(b.vx) * 30,
    };
  }
  private explode(b: World["bullets"][number]) {
    this.w.combat.strike(
      {
        kind: "circle",
        x: b.x,
        y: b.y,
        w: 0,
        h: 0,
        radius: b.blast!,
        facing: 1,
      },
      this.payload(b),
      b.color ?? "#d9c4ff",
      0.32,
    );
    this.w.sound("explosion");
  }
}
