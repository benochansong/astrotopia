import { World } from "../core/world";
import type { Enemy, InputFrame, SaveData } from "../core/types";
import type { RegionId, EnemyKind } from "../data/content";
import { createEnemy } from "../combat/EnemyAI";
export type ChallengeMode = "nexus" | "galactic" | "transcendent";
const bosses = [
  "titan",
  "colossus",
  "leviathan",
  "helios",
  "emperor",
  "archon",
  "genesisZero",
];
const arenas: RegionId[] = [
  "valley",
  "aresFoundry",
  "frostiaRuins",
  "infernoRuins",
  "aquariaRuins",
  "lunarisRuins",
  "omegaCore",
];
export class Endgame {
  original: SaveData | null = null;
  mode: ChallengeMode = "nexus";
  floor = 0;
  elapsed = 0;
  floorTime = 0;
  damage = 0;
  deaths = 0;
  bossTimes: number[] = [];
  enemy: Enemy | null = null;
  ready = false;
  complete = false;
  failed = false;
  pulse = 6;
  devices = 0;
  constructor(private w: World) {}
  get objective() {
    return this.mode !== "nexus"
      ? "보스 정지"
      : this.floor % 3 === 1
        ? "모든 적 처치"
        : this.floor % 3 === 2
          ? "x 3650 / 4050 / 4450에서 F · 장치 3개"
          : "30초 생존";
  }
  stage() {
    const w = this.w;
    this.ready = false;
    this.floorTime = 0;
    this.devices = 0;
    this.enemy = null;
    const index =
      this.mode === "nexus"
        ? (this.floor - 1) % 7
        : this.mode === "transcendent"
          ? 0
          : this.floor - 1;
    w.enterRegion(arenas[index], 4000);
    w.player.x = 4000;
    w.enemies = [];
    w.player.hp = w.stats.hp;
    w.player.energy = w.stats.energy;
    w.player.invulnerable = 4;
    w.survival.state.oxygen = w.survival.oxygen.maximum;
    w.survival.environment.grace = 3600;
    if (this.mode === "nexus") {
      const kinds: EnemyKind[] = [
        "golem",
        "sandCrawler",
        "frozenGolem",
        "thermalGolem",
        "pressureCrab",
        "nexusGuardian",
        "genesisEnforcer",
      ];
      for (let i = 0; i < 4; i++) {
        const e = createEnemy(
          kinds[index],
          3700 + i * 250,
          index === 4 ? 2100 : 780,
          29900 + i,
        );
        e.hp = e.maxHp = 1600 + this.floor * 300;
        e.noLoot = true;
        w.enemies.push(e);
      }
      if (index === 4) w.player.y = 1950;
    } else {
      const id = bosses[index];
      if (index === 0) {
        w.combat.boss.start();
        w.combat.boss.skip();
      } else if (index === 1) w.space.combat.start();
      else if (index === 6) w.omega.combat.start("genesisZero");
      else {
        for (let i = 0; i < 3; i++) w.progress.counters["gravity_" + i] = 1;
        w.extreme.combat.start(id);
        if (index === 4) w.player.y = 1950;
      }
      this.enemy =
        w.combat.boss.enemy ??
        w.space.combat.boss ??
        w.extreme.combat.boss ??
        w.omega.combat.boss;
      if (this.enemy) {
        this.enemy.hp = this.enemy.maxHp = Math.max(
          this.mode === "transcendent" ? 50000 : 22000,
          this.enemy.maxHp,
        );
      }
    }
  }
  update(dt: number, input: InputFrame) {
    if (!this.original) return false;
    if (this.ready || this.complete || this.failed) return true;
    const w = this.w;
    this.elapsed += dt;
    this.floorTime += dt;
    if (w.dead > 0) {
      this.failed = true;
      this.deaths++;
      return true;
    }
    if (this.mode === "nexus" && this.floor % 3 === 2 && input.interact) {
      const target = 3650 + this.devices * 400;
      if (Math.abs(w.player.x - target) < 100) {
        this.devices++;
        w.toast(`장치 ${this.devices}/3 복원`);
      }
    }
    if (this.mode === "transcendent") {
      this.pulse -= dt;
      if (this.pulse <= 0) {
        this.pulse = 5;
        w.omega.combat.hazard(
          "초월 TITAN · 지연 교차 균열",
          w.player.x - 60,
          w.player.y - 200,
          120,
          280,
          "gravity",
          1.6,
        );
      }
    }
    const won =
      this.mode === "nexus"
        ? this.floor % 3 === 1
          ? w.enemies.every((e) => e.hp <= 0)
          : this.floor % 3 === 2
            ? this.devices === 3
            : this.floorTime >= 30
        : !!this.enemy && this.enemy.hp <= 0;
    if (won) {
      this.bossTimes.push(this.floorTime);
      this.ready = true;
      w.combat.hazards = [];
      w.extreme.combat.abort();
      w.space.combat.abort();
      w.omega.combat.abort();
      w.combat.boss.abort();
      if (this.mode === "nexus" && this.floor === 5) {
        this.original.ancient!.nexus.checkpoint = 5;
        w.emit("save", "nexus-checkpoint");
      }
      if (
        this.floor ===
        (this.mode === "nexus" ? 10 : this.mode === "galactic" ? 7 : 1)
      ) {
        this.complete = true;
        this.ready = false;
      }
    }
    return this.ready || this.complete;
  }
  next() {
    if (!this.ready) return false;
    this.floor++;
    this.stage();
    return true;
  }
}
export function beginChallenge(original: World, mode: string) {
  if (
    !["nexus", "galactic", "transcendent"].includes(mode) ||
    !original.omega.state.ending ||
    original.classes.safeReason ||
    original.omega.endgame.original
  )
    return null;
  if (
    mode === "galactic" &&
    (!original.omega.records.every(Boolean) ||
      !original.omega.state.kills.genesisZero)
  )
    return null;
  const saved = original.snapshot(original.settings),
    w = new World(saved),
    e = w.omega.endgame;
  e.original = saved;
  e.mode = mode as ChallengeMode;
  e.floor = mode === "nexus" && saved.ancient!.nexus.checkpoint === 5 ? 6 : 1;
  e.stage();
  return w;
}
export function finishChallenge(current: World) {
  const e = current.omega.endgame;
  if (!e.original) return null;
  const restored = structuredClone(e.original);
  if (restored.civilization) restored.civilization.lastClock = Date.now();
  const w = new World(restored),
    s = w.omega.state;
  if (e.mode === "nexus")
    s.nexus.best = Math.max(s.nexus.best, e.complete ? 10 : e.floor - 1);
  if (e.complete) {
    const record = {
      mode: e.mode,
      seconds: e.elapsed,
      damage: e.damage,
      deaths: e.deaths,
      classId: current.classes.state.classId ?? "pioneer",
      rarity:
        current.battle.gear.find(
          (g) =>
            g.id ===
            current.battle.equipment[
              current.battle.activeSlot === 0 ? "primary" : "secondary"
            ],
        )?.rarity ?? "common",
      bossTimes: e.bossTimes,
    };
    s.records.push(record);
    s.records = s.records.slice(-20);
    if (e.mode === "galactic")
      s.trialBest = s.trialBest ? Math.min(s.trialBest, e.elapsed) : e.elapsed;
    if (e.mode === "nexus") s.nexus.checkpoint = 0;
    w.omega.reward("genesisFragment", 3);
    w.classes.awardMastery(100);
  }
  w.omega.openTab = "endgame";
  return w;
}
