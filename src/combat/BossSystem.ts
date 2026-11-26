import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { createEnemy } from "./EnemyAI";
import { enemySize, overlaps } from "./DamageSystem";
import { difficulties } from "../data/battle";
import { StatusEffectSystem } from "./StatusEffectSystem";
export const bossPatterns = [
  ["claw", "crystals", "wave", "charge"],
  ["volley", "eruption", "pillars", "summon", "rush"],
  ["beam", "waves", "rain", "nova"],
] as const;
export class BossSystem {
  enemy: Enemy | null = null;
  intro = 0;
  phase = 0;
  pattern = "";
  stage: "idle" | "prepare" | "attack" | "recover" = "idle";
  timer = 0;
  index = 0;
  victory = 0;
  coreOpen = false;
  constructor(private w: World) {}
  get active() {
    return !!this.enemy && this.enemy.state !== "Death";
  }
  start() {
    const w = this.w;
    if (this.active || w.combat.training) return;
    w.battle.bossSeen = true;
    w.count("titanDiscover");
    this.enemy = createEnemy(
      "titan",
      4650,
      780,
      10000,
      undefined,
      w.settings.difficulty,
    );
    this.intro = 3.5;
    this.phase = 0;
    this.index = 0;
    this.stage = "idle";
    this.timer = 1;
    this.coreOpen = false;
    w.player.x = 4100;
    w.player.y = 716;
    w.player.vx = 0;
    w.player.vy = 0;
    w.player.invulnerable = 4;
    w.camera.x = 3920;
    w.camera.y = 160;
    w.sound("bossIntro");
    w.emit("save", "boss-entry");
  }
  skip() {
    this.intro = 0;
    this.w.player.invulnerable = Math.max(1, this.w.player.invulnerable);
  }
  abort() {
    this.enemy = null;
    this.intro = 0;
    this.coreOpen = false;
    this.w.combat.hazards = [];
    this.w.enemies = this.w.enemies.filter((e) => !e.noLoot);
  }
  update(dt: number) {
    this.victory = Math.max(0, this.victory - dt);
    if (!this.active) return;
    const w = this.w,
      e = this.enemy!,
      p = w.player;
    e.flash = Math.max(0, e.flash - dt);
    e.ccImmunity = Math.max(0, e.ccImmunity - dt);
    if (this.intro > 0) {
      this.intro = Math.max(0, this.intro - dt);
      w.camera.shake = 2;
      return;
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
    if (!this.active) return;
    p.x = Math.max(4000, Math.min(5160, p.x));
    e.facing = Math.sign(p.x - e.x - 150) || -1;
    const phase = e.hp / e.maxHp > 0.7 ? 0 : e.hp / e.maxHp > 0.35 ? 1 : 2;
    if (phase !== this.phase) {
      this.phase = phase;
      this.index = 0;
      w.toast(["AWAKENING", "CRYSTAL RAGE", "CORE OVERLOAD"][phase]);
      w.sound("bossPhase");
    }
    this.timer -= dt;
    if (
      this.stage === "idle" ||
      (this.stage === "recover" && this.timer <= 0)
    ) {
      this.coreOpen = false;
      this.prepare();
    } else if (this.stage === "prepare" && this.timer <= 0) {
      this.stage = "attack";
      this.timer =
        this.pattern === "charge" || this.pattern === "rush" ? 1.05 : 0.8;
      this.attack();
    } else if (this.stage === "attack") {
      if (this.pattern === "charge" || this.pattern === "rush") {
        e.x = Math.max(4050, Math.min(4870, e.x + e.vx * dt));
        if (
          overlaps(
            {
              kind: "rect",
              x: e.x,
              y: e.y,
              ...enemySize(e),
              radius: 0,
              facing: 1,
            },
            { x: p.x, y: p.y, w: p.w, h: p.h },
          )
        )
          w.damage(36, e.x + 150, "gravity");
      }
      if (this.timer <= 0) {
        this.stage = "recover";
        this.timer =
          (this.phase === 0 ? 2.4 : 2.8) *
          difficulties[w.settings.difficulty].frequency;
        this.coreOpen = this.phase > 0;
        e.vx = 0;
      }
    }
  }
  private prepare() {
    const w = this.w,
      e = this.enemy!,
      p = w.player;
    this.pattern =
      bossPatterns[this.phase][this.index++ % bossPatterns[this.phase].length];
    this.stage = "prepare";
    this.timer =
      this.pattern === "nova" ? 1.9 : this.pattern === "beam" ? 1.5 : 1.1;
    e.attackX = p.x + 17;
    e.attackY = p.y + 30;
    const rect = (x: number, y: number, width: number, height: number) => ({
      kind: "rect" as const,
      x,
      y,
      w: width,
      h: height,
      radius: 0,
      facing: 1,
    });
    if (this.pattern === "claw")
      w.combat.hazard(
        rect(e.x + e.facing * 130, 688, 220, 92),
        30,
        "physical",
        this.timer,
        0.2,
        "앞발 강타",
      );
    if (["wave", "waves"].includes(this.pattern)) {
      const count = this.pattern === "waves" ? 3 : 1;
      for (let i = 0; i < count; i++)
        w.combat.hazard(
          rect(e.x, 750, 75, 30),
          29,
          "gravity",
          this.timer + i * 0.5,
          3,
          "지면 충격파",
          undefined,
          -260,
        );
    }
    if (["eruption", "pillars", "rain"].includes(this.pattern)) {
      const xs = [e.attackX - 240, e.attackX, e.attackX + 240];
      for (const x of xs) {
        if (this.pattern === "rain")
          w.combat.hazard(
            rect(Math.max(4020, Math.min(5080, x)) - 30, 120, 60, 90),
            34,
            "physical",
            this.timer,
            2,
            "수정 낙하",
            undefined,
            0,
            480,
          );
        else
          w.combat.hazard(
            rect(
              Math.max(4020, Math.min(5080, x)) - 40,
              this.pattern === "pillars" ? 545 : 720,
              80,
              this.pattern === "pillars" ? 235 : 60,
            ),
            32,
            "electric",
            this.timer,
            this.pattern === "pillars" ? 2.3 : 0.3,
            this.pattern === "pillars" ? "수정 기둥" : "지면 폭발",
          );
      }
    }
    if (this.pattern === "beam")
      w.combat.hazard(
        rect(4000, 700, 1200, 50),
        38,
        "plasma",
        this.timer,
        1.2,
        "에너지 광선 · 점프로 회피",
      );
    if (this.pattern === "nova")
      w.combat.hazard(
        {
          kind: "circle",
          x: e.x + 150,
          y: 690,
          w: 0,
          h: 0,
          radius: 270,
          facing: 1,
        },
        46,
        "electric",
        this.timer,
        0.4,
        "코어 폭발 · 범위 이탈",
      );
    if (["charge", "rush"].includes(this.pattern)) {
      w.combat.effect(
        rect(4000, 720, 1200, 60),
        "#f5a282",
        this.timer,
        true,
        "돌진 · 발판으로 회피",
      );
    }
    if (["crystals", "volley", "summon"].includes(this.pattern))
      w.combat.effect(
        {
          kind: "circle",
          x: e.x + 150,
          y: e.y + 90,
          w: 0,
          h: 0,
          radius: 55,
          facing: 1,
        },
        "#e7b6ff",
        this.timer,
        true,
        this.pattern === "summon" ? "수정 생명체 소환" : "수정 투사체",
      );
    w.sound("bossWindup");
  }
  private attack() {
    const w = this.w,
      e = this.enemy!;
    if (this.pattern === "charge" || this.pattern === "rush")
      e.vx =
        (e.attackX < e.x + 150 ? -1 : 1) *
        (this.pattern === "rush" ? 430 : 260);
    if (this.pattern === "crystals" || this.pattern === "volley") {
      const n = this.pattern === "volley" ? 7 : 3;
      for (let i = 0; i < n; i++)
        w.combat.hostileShot(
          e.x + 150,
          e.y + 80,
          e.attackX,
          e.attackY + (i - (n - 1) / 2) * 45,
          230 + this.phase * 30,
          26,
          "plasma",
          10,
        );
    }
    if (
      this.pattern === "summon" &&
      w.enemies.filter((e) => e.noLoot && e.state !== "Death").length < 4
    ) {
      for (let i = 0; i < 2; i++) {
        const minion = createEnemy(
          "beetle",
          4220 + i * 450,
          780,
          20000 + this.index * 2 + i,
          undefined,
          w.settings.difficulty,
        );
        minion.hp = minion.maxHp = 75;
        minion.noLoot = true;
        w.enemies.push(minion);
      }
    }
    w.sound(this.phase === 2 ? "bossOverload" : "hammer");
    w.camera.shake = this.phase === 2 ? 5 : 3;
  }
  defeat() {
    if (!this.enemy || this.enemy.state === "Death") return;
    this.enemy.state = "Death";
    this.enemy.hp = 0;
    this.victory = 7;
    this.coreOpen = false;
    this.w.combat.hazards = [];
    this.w.enemies = this.w.enemies.filter((e) => !e.noLoot);
    this.w.combat.loot.boss();
    this.w.burst(this.enemy.x + 150, this.enemy.y + 100, "#d9bff7", 80);
  }
}
