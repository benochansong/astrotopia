import { StatusEffectSystem } from "../combat/StatusEffectSystem";
import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { createEnemy } from "../combat/EnemyAI";
import { spaceEnemies, type SpaceEnemy } from "./regions";
export class SpaceCombat {
  boss: Enemy | null = null;
  pattern = 0;
  timer = 2;
  core = 0;
  private coreDelay = 0;
  phase = 1;
  constructor(private w: World) {}
  start() {
    const w = this.w;
    if (this.boss || w.region !== "aresFoundry" || w.player.x < 3700)
      return false;
    this.boss = createEnemy(
      "colossus",
      4400,
      780,
      8900,
      undefined,
      w.settings.difficulty,
    );
    w.enemies.push(this.boss);
    this.timer = 3;
    this.pattern = 0;
    w.space.once("colossusDiscover");
    return true;
  }
  abort() {
    this.boss = null;
    this.core = 0;
  }
  hazard(
    e: Enemy,
    label: string,
    width = 150,
    delay = 1,
    kind = "ground",
    count = 1,
  ) {
    const w = this.w;
    for (let i = 0; i < count; i++) {
      const x =
        kind === "beam"
          ? Math.min(e.x, w.player.x)
          : w.player.x - 30 + (i - (count - 1) / 2) * 180;
      w.combat.hazard(
        {
          kind: "rect",
          radius: 0,
          x,
          y: kind === "beam" ? w.player.y + 20 : 735,
          w: kind === "beam" ? Math.abs(e.x - w.player.x) + 120 : width,
          h: kind === "beam" ? 35 : 45,
          facing: e.facing,
        },
        spaceEnemies[e.kind as SpaceEnemy].damage,
        kind === "beam" ? "plasma" : "physical",
        delay + i * 0.15,
        0.35,
        label,
      );
    }
  }
  enemy(e: Enemy, dt: number) {
    if (!Object.hasOwn(spaceEnemies, e.kind) || e.kind === "colossus")
      return false;
    if (e.hp <= 0) {
      e.timer -= dt;
      if (e.timer <= 0 && !e.noLoot)
        Object.assign(
          e,
          createEnemy(
            e.kind,
            e.homeX,
            e.homeY + spaceEnemies[e.kind as SpaceEnemy].h,
            e.id,
            e.elite,
            this.w.settings.difficulty,
          ),
        );
      return true;
    }
    StatusEffectSystem.tick(e.statuses, dt, (damage, id) =>
      this.w.combat.hit(
        e,
        {
          damage,
          element: id === "poison" ? "toxic" : "electric",
          crit: 0,
          critDamage: 1,
          knockback: 0,
          statusChance: 0,
          special: true,
          sourceX: this.w.player.x,
        },
        false,
        true,
      ),
    );
    if (StatusEffectSystem.speed(e.statuses) === 0) return true;
    const w = this.w,
      d = spaceEnemies[e.kind as SpaceEnemy],
      dist = Math.abs(w.player.x - e.x);
    e.timer -= dt;
    e.flash = Math.max(0, e.flash - dt);
    if (dist > 1100) return true;
    if (dist < 500) {
      w.space.once("aresCreature");
      if (!w.battle.discovered.includes(e.kind))
        w.battle.discovered.push(e.kind);
    }
    e.facing = Math.sign(w.player.x - e.x) || 1;
    if (e.timer > 0) {
      if (e.state === "Chase") {
        e.x += e.facing * d.speed * dt;
        if (d.flying) e.y = e.homeY - 90 + Math.sin(w.time * 2) * 45;
      }
      return true;
    }
    if (e.state !== "PrepareAttack") {
      e.state = "PrepareAttack";
      e.timer = e.kind === "ironBeast" ? 1.6 : 1;
      const names: Record<string, string> = {
        sandCrawler: "모래 도약",
        duneStalker: "잠복 돌진",
        crimsonScorpion: "꼬리 삼연격",
        dustManta: "분진 급강하",
        ironBeast: "중장갑 지면 강타",
        magmaBurrower: "지하 열 분출",
        ancientDrone: "추적 광선",
        foundryGuardian: "보호막 코어 방출",
      };
      this.hazard(
        e,
        names[e.kind],
        e.kind === "ironBeast" ? 270 : 130,
        e.timer,
        e.kind === "ancientDrone" ? "beam" : "ground",
        e.kind === "crimsonScorpion" ? 3 : 1,
      );
      if (e.kind === "foundryGuardian") e.shield = 100;
      return true;
    }
    e.state = "Chase";
    e.timer = 2.8;
    if (e.kind === "sandCrawler") e.x += e.facing * 90;
    if (e.kind === "duneStalker") {
      e.x += e.facing * 230;
      w.combat.effect(
        {
          kind: "rect",
          radius: 0,
          x: e.x,
          y: e.y,
          w: 100,
          h: 60,
          facing: e.facing,
        },
        "#dca37b",
      );
    }
    if (e.kind === "magmaBurrower") {
      e.x = w.player.x + e.facing * 130;
      e.y = e.homeY;
    }
    if (e.kind === "dustManta") e.y = w.player.y - 25;
    if (e.kind === "foundryGuardian") e.shield = 0;
    return true;
  }
  update(dt: number) {
    const e = this.boss,
      w = this.w;
    if (!e) return;
    if (w.dead || w.region !== "aresFoundry") {
      this.abort();
      return;
    }
    if (e.hp <= 0) {
      const first = w.space.state.kills++ === 0;
      w.space.once("colossusKill");
      w.combat.loot.place(4400, 700, "duneCore");
      w.combat.loot.place(4430, 700, "heatAlloy", first ? 6 : 2);
      if (first) {
        w.combat.loot.place(4460, 700, "industrialData", 3);
        w.combat.loot.place(4490, 700, "propulsionBlueprint");
        w.combat.loot.place(
          4520,
          700,
          undefined,
          1,
          w.combat.loot.gear("epic"),
        );
        if (!w.battle.titles.includes("사막의 개척자"))
          w.battle.titles.push("사막의 개척자");
        w.toast("칭호 획득 · 사막의 개척자");
      }
      w.addXp(first ? 1800 : 500);
      this.abort();
      w.emit("save", "colossus");
      return;
    }
    w.player.x = Math.max(3650, w.player.x);
    e.flash = Math.max(0, e.flash - dt);
    this.core = Math.max(0, this.core - dt);
    if (this.coreDelay > 0) {
      this.coreDelay -= dt;
      if (this.coreDelay <= 0) this.core = 2;
    }
    this.phase = e.hp / e.maxHp > 0.7 ? 1 : e.hp / e.maxHp > 0.35 ? 2 : 3;
    this.timer -= dt;
    if (this.timer > 0) return;
    const names = [
      "집게 강타",
      "모래 탄막",
      "대지 진동",
      "느린 돌진",
      "폭풍 소환",
      "지하 잠복",
      "다중 충격파",
      "꼬리 에너지",
      "사막 생명체 소환",
      "과열 광선",
      "지면 폭발",
      "연속 돌진",
      "코어 대방출",
    ];
    const from = this.phase === 1 ? 0 : this.phase === 2 ? 4 : 9,
      n =
        from +
        (this.pattern++ % (this.phase === 1 ? 4 : this.phase === 2 ? 5 : 4));
    this.hazard(
      e,
      names[n],
      n === 12 ? 700 : n === 2 ? 350 : 180,
      n === 12 ? 2 : 1.3,
      n === 7 || n === 9 ? "beam" : "ground",
      n === 1 || n === 6 || n === 10 ? 3 : n === 11 ? 2 : 1,
    );
    if (n === 4) w.space.state.weather = 100;
    if (n === 5) e.x = w.player.x > 4200 ? 3850 : 4450;
    if (n === 3 || n === 11)
      e.x = Math.max(
        3750,
        Math.min(4500, e.x + Math.sign(w.player.x - e.x) * 350),
      );
    if (n === 8 && w.enemies.filter((x) => x.hp > 0).length < 12)
      w.enemies.push(
        createEnemy("sandCrawler", 4100, 780, 9000 + this.pattern),
      );
    this.coreDelay = n === 12 ? 2.6 : 2;
    this.timer = this.phase === 3 ? 4.5 : 5.5;
  }
}
