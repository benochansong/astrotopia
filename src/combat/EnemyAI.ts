import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { enemyData, type EnemyKind } from "../data/content";
import { difficulties } from "../data/battle";
import { enemySize, overlaps } from "./DamageSystem";
import { StatusEffectSystem } from "./StatusEffectSystem";
import type { EliteAffix } from "./types";
export function createEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  id: number,
  elite?: EliteAffix,
  difficulty: keyof typeof difficulties = "normal",
): Enemy {
  const d = enemyData[kind],
    scale = elite ? 1.25 : 1,
    hp = Math.round(d.hp * difficulties[difficulty].hp * (elite ? 3 : 1));
  return {
    id,
    kind,
    x,
    y: y - d.h * scale,
    homeX: x,
    homeY: y - d.h * scale,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    state: "Idle",
    timer: 0.4,
    facing: -1,
    attackX: 0,
    attackY: 0,
    statuses: [],
    ccImmunity: 0,
    flash: 0,
    elite,
    shield: elite === "shielded" || kind === "guardian" ? hp * 0.3 : 0,
    regenBudget: hp * 0.25,
    action: 0,
    launched: 0,
  };
}
export class EnemyAI {
  constructor(private w: World) {}
  update(dt: number) {
    const w = this.w,
      p = w.player;
    for (const e of [...w.enemies]) {
      if (["dummy", "sentinel", "conduit"].includes(e.kind)) continue;
      e.timer -= dt;
      e.staggerGuard = Math.max(0, (e.staggerGuard ?? 0) - dt);
      e.flash = Math.max(0, e.flash - dt);
      e.ccImmunity = Math.max(0, e.ccImmunity - dt);
      if (e.state === "Death") {
        if (e.timer <= 0 && !e.noLoot)
          Object.assign(
            e,
            createEnemy(
              e.kind,
              e.homeX,
              e.homeY + enemySize(e).h,
              e.id,
              e.elite,
              w.settings.difficulty,
            ),
          );
        continue;
      }
      if (Math.abs(e.x - p.x) > 1500) continue;
      const d = enemyData[e.kind],
        size = enemySize(e),
        distance = Math.hypot(p.x - e.x, p.y - e.y);
      if (
        e.kind === "lurker" &&
        distance > 160 &&
        !w.survival.scanner.remaining &&
        !w.survival.state.equipped.includes("light")
      ) {
        e.state = "Idle";
        e.y = e.homeY - 105;
        continue;
      }
      if (distance < 440 && !e.noLoot) {
        if (!w.battle.discovered.includes(e.kind)) {
          w.battle.discovered.push(e.kind);
          w.count("discover_" + e.kind);
          w.toast(`생물 조사 · ${d.name}`);
        }
        if (e.elite && !w.progress.counters["seen_" + e.id + "_" + w.region]) {
          w.count("eliteDiscover");
          w.count("seen_" + e.id + "_" + w.region);
        }
      }
      StatusEffectSystem.tick(e.statuses, dt, (damage, id) =>
        w.combat.hit(
          e,
          {
            damage,
            element: id === "poison" ? "toxic" : "electric",
            crit: 0,
            critDamage: 1,
            knockback: 0,
            statusChance: 0,
            special: true,
            sourceX: p.x,
          },
          false,
          true,
        ),
      );
      if (e.hp <= 0) continue;
      const speedFactor = StatusEffectSystem.speed(e.statuses);
      if (speedFactor === 0) continue;
      if (
        e.elite === "regenerating" &&
        e.state === "Recover" &&
        e.regenBudget > 0
      ) {
        const n = Math.min(e.maxHp - e.hp, 8 * dt, e.regenBudget);
        e.hp += n;
        e.regenBudget -= n;
      }
      if (
        e.elite === "electric" &&
        Math.floor(w.time / 5) !== Math.floor((w.time - dt) / 5)
      )
        w.combat.hazard(
          {
            kind: "circle",
            x: e.x + size.w / 2,
            y: e.y + size.h / 2,
            radius: 105,
            w: 0,
            h: 0,
            facing: 1,
          },
          18,
          "electric",
          0.85,
          0.2,
          "전기 방출",
        );
      if (e.state === "Hit") {
        e.x += e.vx * dt;
        e.vy += 990 * dt;
        e.y += e.vy * dt;
        this.floor(e);
        if (e.timer <= 0) {
          e.state = "Recover";
          e.timer = 0.35;
        }
        continue;
      }
      if (
        (e.state === "Idle" || e.state === "Patrol") &&
        distance < (d.range ?? 280)
      ) {
        e.state = "Alert";
        e.timer = 0.45;
        e.facing = Math.sign(p.x - e.x) || 1;
      }
      if (e.state === "Idle" && e.timer <= 0) {
        e.state = "Patrol";
        e.timer = 2;
      }
      if (e.state === "Patrol" && e.timer <= 0) {
        e.facing *= -1;
        e.timer = 2;
      }
      if (e.state === "Alert" && e.timer <= 0) {
        e.state = "Chase";
      }
      if (e.state === "Recover" && e.timer <= 0) {
        e.state = e.kind === "worm" ? "Retreat" : "Chase";
        e.timer = e.kind === "worm" ? 1.4 : 0;
      }
      if (e.state === "Retreat" && e.timer <= 0) e.state = "Chase";
      if (e.state === "Chase") {
        e.facing = Math.sign(p.x - e.x) || 1;
        if (distance > 650 || Math.abs(e.x - e.homeX) > 520) {
          e.state = "Return";
        } else if (distance < (d.range ?? (e.kind === "manta" ? 350 : 175))) {
          this.prepare(e);
        }
      }
      if (e.state === "PrepareAttack" && e.timer <= 0) {
        e.state = "Attack";
        e.timer = e.kind === "stalker" ? 1.1 : 0.65;
        this.attack(e);
      }
      if (e.state === "Attack" && e.timer <= 0) {
        e.state = "Recover";
        e.timer =
          (e.kind === "golem" ? 2 : e.kind === "slime" ? 0.55 : 1.15) *
          difficulties[w.settings.difficulty].frequency *
          (e.elite === "berserk" ? 0.8 : 1);
        e.vx = 0;
      }
      if (e.state === "Return") {
        e.facing = Math.sign(e.homeX - e.x) || 1;
        if (Math.abs(e.x - e.homeX) < 12) {
          e.state = "Idle";
          e.timer = 1;
        }
      }
      if (d.flying) {
        if (e.state === "Attack" && e.kind === "manta") {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        } else {
          e.y +=
            (e.homeY + Math.sin(w.time * 1.6 + e.id) * 25 - e.y) *
            Math.min(1, dt * 2);
          if (["Patrol", "Return", "Chase"].includes(e.state))
            e.x += e.facing * d.speed * dt * speedFactor;
        }
      } else {
        let speed = ["Patrol", "Return"].includes(e.state)
          ? d.speed
          : e.state === "Chase"
            ? d.speed * 1.25
            : e.state === "Retreat"
              ? d.speed * 0.7
              : 0;
        if (e.state === "Attack") speed = Math.abs(e.vx);
        if (
          e.kind === "stalker" &&
          e.state === "Attack" &&
          Math.floor(e.timer * 3) !== Math.floor((e.timer + dt) * 3)
        )
          e.vy = -220;
        const next = e.x + e.facing * speed * dt * speedFactor;
        const floor = w.map.platforms.find(
          (t) => !t.oneWay && next >= t.x && next + size.w <= t.x + t.w,
        );
        if (floor) {
          e.x = next;
          e.vy += 990 * dt;
          e.y = Math.min(floor.y - size.h, e.y + e.vy * dt);
          if (e.y >= floor.y - size.h) e.vy = 0;
        } else if (speed) {
          e.state = "Return";
          e.facing *= -1;
        }
      }
      e.x = Math.max(0, Math.min(w.map.width - size.w, e.x));
      if (e.kind === "worm" && e.state === "Retreat") continue;
      if (
        overlaps(
          { kind: "rect", x: e.x, y: e.y, ...size, radius: 0, facing: 1 },
          { x: p.x, y: p.y, w: p.w, h: p.h },
        )
      )
        w.damage(
          d.damage * (e.elite ? 1.35 : 1),
          e.x + size.w / 2,
          e.kind === "volt" ? "electric" : "physical",
        );
    }
  }
  private floor(e: Enemy) {
    const s = enemySize(e);
    const f = this.w.map.platforms.find(
      (p) => !p.oneWay && e.x + s.w > p.x && e.x < p.x + p.w,
    );
    if (f && e.y + s.h >= f.y) {
      e.y = f.y - s.h;
      e.vy = 0;
    }
    if (!f) {
      e.x = e.homeX;
      e.y = e.homeY;
    }
  }
  private prepare(e: Enemy) {
    const w = this.w,
      p = w.player,
      d = enemyData[e.kind],
      s = enemySize(e);
    e.state = "PrepareAttack";
    e.timer = e.kind === "golem" ? 1.2 : e.kind === "worm" ? 0.95 : 0.75;
    e.attackX = p.x + 17;
    e.attackY = p.y + 32;
    e.facing = Math.sign(p.x - e.x) || 1;
    const range =
      e.kind === "golem"
        ? 220
        : e.kind === "spore"
          ? 75
          : e.kind === "worm"
            ? 70
            : e.kind === "volt"
              ? 100
              : 80;
    if (["golem", "worm", "volt"].includes(e.kind))
      w.combat.hazard(
        {
          kind: "circle",
          x: e.kind === "golem" ? e.x + s.w / 2 + e.facing * 100 : e.attackX,
          y: 760,
          radius: range,
          w: 0,
          h: 0,
          facing: 1,
        },
        d.damage,
        e.kind === "volt" ? "electric" : "physical",
        e.timer,
        0.2,
        d.name,
      );
    else
      w.combat.effect(
        {
          kind: "arc",
          x: e.x + s.w / 2,
          y: e.y + s.h / 2,
          radius: range,
          w: 0,
          h: 0,
          facing: e.facing,
        },
        "#f3bc8e",
        e.timer,
        true,
        "공격 예고",
      );
  }
  private attack(e: Enemy) {
    const w = this.w,
      d = enemyData[e.kind],
      s = enemySize(e),
      x = e.x + s.w / 2,
      y = e.y + s.h / 2;
    if (e.kind === "slime") {
      e.vx = e.facing * 115;
      e.vy = -240;
    }
    if (e.kind === "crawler" || e.kind === "beetle")
      e.vx = e.facing * (e.kind === "crawler" ? 330 : 150);
    if (e.kind === "manta") {
      const a = Math.atan2(e.attackY - y, e.attackX - x);
      e.vx = Math.cos(a) * 360;
      e.vy = Math.sin(a) * 360;
    }
    if (e.kind === "spore") {
      w.combat.hostileShot(
        x,
        y,
        e.attackX,
        e.attackY,
        200,
        d.damage,
        "toxic",
        11,
      );
      w.combat.hazard(
        {
          kind: "circle",
          x: e.attackX,
          y: 763,
          radius: 75,
          w: 0,
          h: 0,
          facing: 1,
        },
        12,
        "toxic",
        1.3,
        3.3,
        "독성 포자",
        "poison",
      );
    }
    if (e.kind === "worm") {
      e.x = Math.max(0, Math.min(w.map.width - s.w, e.attackX - s.w / 2));
      e.vy = -270;
      this.floor(e);
    }
    if (e.kind === "volt") {
      e.vx = e.facing * 250;
      e.vy = -280;
    }
    if (e.kind === "wisp") {
      e.x = Math.max(
        e.homeX - 220,
        Math.min(e.homeX + 220, e.attackX - e.facing * 230),
      );
      for (const offset of [-35, 0, 35])
        w.combat.hostileShot(
          e.x + s.w / 2,
          y,
          e.attackX,
          e.attackY + offset,
          230,
          d.damage,
          "plasma",
          9,
        );
      w.burst(e.x, y, d.color, 12);
    }
    if (e.kind === "golem")
      w.combat.hazard(
        {
          kind: "rect",
          x: x + e.facing * 45,
          y: 748,
          w: 65,
          h: 32,
          radius: 0,
          facing: e.facing,
        },
        d.damage,
        "gravity",
        0,
        2.1,
        "지면 파동",
        undefined,
        e.facing * 220,
      );
    if (e.kind === "stalker") {
      e.vx = e.facing * 310;
      e.vy = -240;
    }
    if (e.kind === "bloom") {
      for (let i = -1; i <= 1; i++)
        w.combat.hostileShot(
          x,
          y,
          e.attackX + i * 90,
          e.attackY,
          170,
          d.damage,
          "toxic",
          12,
        );
      w.combat.hazard(
        {
          kind: "circle",
          x: e.attackX,
          y: 755,
          w: 0,
          h: 0,
          radius: 90,
          facing: 1,
        },
        12,
        "toxic",
        1.4,
        2.5,
        "독성 블룸 포자",
        "poison",
      );
    }
    if (e.kind === "lurker") {
      e.vx = e.facing * 350;
      e.vy = -300;
    }
    if (e.kind === "wraith" || e.kind === "drone") {
      w.combat.hostileShot(
        x,
        y,
        e.attackX,
        e.attackY,
        220,
        d.damage,
        "plasma",
        10,
      );
      if (e.kind === "wraith")
        w.combat.hazard(
          { kind: "circle", x, y, w: 0, h: 0, radius: 140, facing: 1 },
          18,
          "electric",
          1.3,
          0.4,
          "방사 에너지 방출",
        );
    }
    if (e.kind === "guardian") {
      w.combat.hazard(
        {
          kind: "rect",
          x: e.attackX - 65,
          y: 620,
          w: 130,
          h: 160,
          radius: 0,
          facing: 1,
        },
        d.damage,
        "electric",
        1.3,
        0.3,
        "기계 코어 강타",
      );
      if (e.action++ % 3 === 0 && e.regenBudget > 0) {
        e.shield = 70;
        e.regenBudget = Math.max(0, e.regenBudget - 70);
      }
    }
    if (e.kind === "devourer") {
      for (let i = -2; i <= 2; i++)
        w.combat.hostileShot(
          x,
          y,
          e.attackX,
          e.attackY + i * 60,
          210,
          d.damage,
          "plasma",
          12,
        );
      if (e.regenBudget > 0) {
        const n = Math.min(55, e.maxHp - e.hp, e.regenBudget);
        e.hp += n;
        e.regenBudget -= n;
        w.combat.effect(
          { kind: "circle", x, y, w: 0, h: 0, radius: 130, facing: 1 },
          "#c6a9ea",
          1,
          true,
          "결정 에너지 흡수",
        );
      }
    }
    w.sound("enemy_" + e.kind);
  }
}
