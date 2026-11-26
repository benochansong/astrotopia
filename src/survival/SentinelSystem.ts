import { StatusEffectSystem } from "../combat/StatusEffectSystem";
import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { createEnemy } from "../combat/EnemyAI";
export class SentinelSystem {
  enemy: Enemy | null = null;
  timer = 0;
  index = 0;
  vulnerable = 0;
  intro = 0;
  pattern = "";
  constructor(private w: World) {}
  get active() {
    return !!this.enemy && this.enemy.state !== "Death";
  }
  get conduits() {
    return this.w.enemies.filter(
      (e) => e.kind === "conduit" && e.state !== "Death",
    );
  }
  start() {
    const w = this.w;
    if (this.active || w.region !== "abyss") return;
    this.enemy = createEnemy(
      "sentinel",
      3750,
      780,
      50000,
      undefined,
      w.settings.difficulty,
    );
    this.enemy.noLoot = true;
    w.enemies.push(this.enemy);
    this.supplies();
    this.timer = 3;
    this.intro = 3;
    this.index = 0;
    this.vulnerable = 0;
    w.player.x = 3460;
    w.player.facing = -1;
    w.camera.x = 3120;
    w.player.invulnerable = 5;
    w.count("sentinelDiscover");
    w.toast(
      "ABYSS SENTINEL · G 스캐너로 공급 장치 분석 · 장치를 먼저 파괴하세요.",
    );
    w.sound("bossIntro");
    w.emit("save", "sentinel-entry");
  }
  private supplies() {
    this.w.enemies = this.w.enemies.filter((e) => e.kind !== "conduit");
    for (const [i, x] of [3370, 4180].entries()) {
      const e = createEnemy("conduit", x, 780, 51000 + i);
      e.noLoot = true;
      this.w.enemies.push(e);
    }
    if (this.enemy) this.enemy.shield = 6500;
  }
  update(dt: number) {
    if (!this.active) return;
    const w = this.w,
      e = this.enemy!;
    this.intro = Math.max(0, this.intro - dt);
    w.player.x = Math.max(3120, Math.min(4360, w.player.x));
    e.flash = Math.max(0, e.flash - dt);
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
          sourceX: w.player.x,
        },
        false,
        true,
      ),
    );
    if (!this.active) return;
    if (this.conduits.length) {
      e.shield = e.maxHp;
    } else {
      e.shield = 0;
      if (this.vulnerable === 0) {
        this.vulnerable = 15;
        w.toast("공급 차단 · 보호막 해제 15초 · 코어를 공격하세요.");
      }
      this.vulnerable -= dt;
      if (this.vulnerable <= 0) {
        this.vulnerable = 0;
        this.supplies();
      }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 4.5;
    const index = this.index++ % 6;
    this.pattern = [
      "에너지 투사체",
      "지면 파동",
      "보호막 충격",
      "결정 활성화",
      "에너지 폭발",
      "수호 드론",
    ][index];
    const rect = (x: number, y: number, width: number, height: number) => ({
      kind: "rect" as const,
      x,
      y,
      w: width,
      h: height,
      radius: 0,
      facing: 1,
    });
    if (index === 0)
      for (let i = -1; i <= 1; i++)
        w.combat.hazard(
          {
            kind: "circle",
            x: e.x + 100,
            y: e.y + 100 + i * 25,
            w: 0,
            h: 0,
            radius: 10,
            facing: -1,
          },
          24,
          "plasma",
          1.1,
          4,
          "파수꾼 투사체",
          undefined,
          -250,
          i * 45,
        );
    if (index === 1)
      for (let i = 0; i < 2; i++)
        w.combat.hazard(
          rect(4200, 750, 85, 30),
          27,
          "electric",
          1.2 + i * 0.7,
          5,
          "파수꾼 지면 파동",
          undefined,
          -250,
        );
    if (index === 2 || index === 4)
      w.combat.hazard(
        {
          kind: "circle",
          x: index === 2 ? e.x + 100 : w.player.x + 17,
          y: 740,
          w: 0,
          h: 0,
          radius: index === 2 ? 230 : 160,
          facing: 1,
        },
        30,
        "electric",
        1.7,
        0.4,
        this.pattern,
      );
    if (index === 3)
      for (const x of [3300, 3650, 4100])
        w.combat.hazard(
          rect(x, 580, 65, 200),
          26,
          "plasma",
          1.5,
          1.4,
          "활성 에너지 결정",
        );
    if (
      index === 5 &&
      w.enemies.filter((e) => e.kind === "drone" && e.state !== "Death")
        .length < 3
    )
      for (const x of [3250, 4050]) {
        const d = createEnemy("drone", x, 620, 52000 + this.index + x);
        d.noLoot = true;
        w.enemies.push(d);
      }
    w.sound("bossWindup");
  }
  defeat() {
    if (!this.active) return;
    const w = this.w,
      s = w.survival.state,
      first = s.sentinelKills === 0;
    this.enemy!.state = "Death";
    this.enemy!.hp = 0;
    this.enemy!.shield = 0;
    w.combat.hazards = [];
    w.enemies = w.enemies.filter((e) => !["conduit", "drone"].includes(e.kind));
    s.sentinelKills++;
    s.sentinelBlueprint = true;
    w.count("sentinelKill");
    w.addXp(first ? 1200 : 300);
    w.battle.credits += first ? 1500 : 300;
    for (const [id, n] of [
      ["ancientData", first ? 3 : 1],
      ["advancedData", first ? 5 : 2],
      ["coreShard", first ? 3 : 1],
      ...(first ? [["colonyData", 1]] : []),
    ] as [import("../data/content").ItemId, number][])
      w.combat.loot.place(3500, 700, id, n);
    w.combat.loot.place(
      3550,
      700,
      undefined,
      1,
      w.combat.loot.gear(first ? "epic" : "rare"),
    );
    w.toast(
      first
        ? "심연의 파수꾼 격파 · 고급 탐험복 설계도 확보"
        : "심연의 파수꾼 재격파 · 반복 보상",
    );
    w.sound("bossVictory");
    w.emit("save", "sentinel-victory");
  }
  abort() {
    this.enemy = null;
    this.w.enemies = this.w.enemies.filter(
      (e) => !["sentinel", "conduit", "drone"].includes(e.kind),
    );
  }
}
