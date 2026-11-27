import { definition } from "../colony/catalog";
import type { World } from "../core/world";
import type { Enemy, InputFrame, SaveData } from "../core/types";
import type {
  AttackPayload,
  AttackShape,
  Element,
  Stats,
} from "../combat/types";
import { EquipmentSystem } from "../combat/EquipmentSystem";
import { enemySize } from "../combat/DamageSystem";
import {
  classIds,
  classes,
  classSkills,
  paths,
  type ClassId,
  type ClassSkill,
} from "./catalog";
import { newClass, totalSP, type ClassSave } from "./types";
import { occupiedSlots } from "../systems/inventory";

export interface Summon {
  id: number;
  owner: "player";
  kind: "drone" | "turret" | "trap";
  x: number;
  y: number;
  life: number;
  hp: number;
  clock: number;
  power: number;
  range: number;
}
export class ClassSystem {
  state = newClass();
  summons: Summon[] = [];
  buffs: Record<string, number> = {};
  marks = new Map<number, number>();
  element: Element = "cryo";
  lock = 0;
  trialReturn: SaveData | null = null;
  trial: {
    classId: ClassId;
    elapsed: number;
    hits: number;
    skills: string[];
    defended: number;
    distance: number;
    scanned: boolean;
    kills: number;
    startX: number;
    grade: number;
    targetHp: number;
    mode: "trial" | "challenge";
    tier: number;
  } | null = null;
  metrics = {
    damage: 0,
    hits: 0,
    critical: 0,
    spentEP: 0,
    gaugeEarned: 0,
    ultimates: 0,
    prevented: 0,
    healing: 0,
    summonDamage: 0,
    elapsed: 0,
  };
  rematch: {
    enemy: Enemy;
    difficulty: number;
    elapsed: number;
    pulse: number;
  } | null = null;
  private serial = 0;
  private rewardBudgets = new WeakMap<Enemy, number>();
  private gaugeClock = 0;
  private lastElement: Element | null = null;
  private pending: {
    time: number;
    skill: ClassSkill;
    power: number;
    x: number;
    y: number;
  }[] = [];
  constructor(private w: World) {}
  initialize(saved?: ClassSave) {
    if (saved) this.state = structuredClone(saved);
    this.sync();
    this.state.slots = this.state.slots.map((id) =>
      id && this.usable(id) ? id : null,
    );
  }
  sync() {
    this.state.granted = totalSP(
      this.w.player.level,
      this.state.highestTier,
      this.state.quests,
    );
  }
  get spent() {
    return Object.entries(this.state.ranks).reduce(
      (n, [id, rank]) =>
        n +
        Math.max(
          0,
          rank -
            (classSkills[id]?.tier === 1 && !classSkills[id]?.passive ? 1 : 0),
        ),
      0,
    );
  }
  get sp() {
    this.sync();
    return Math.max(0, this.state.granted - this.spent);
  }
  get definition() {
    return this.state.classId ? classes[this.state.classId] : null;
  }
  get name() {
    return this.state.path
      ? this.state.tier === 3
        ? paths[this.state.path].final
        : paths[this.state.path].name
      : (this.definition?.name ?? "ROOKIE PIONEER");
  }
  get mastery() {
    return this.state.classId
      ? Math.min(
          20,
          1 + Math.floor((this.state.mastery[this.state.classId] ?? 0) / 200),
        )
      : 0;
  }
  rank(branch: 0 | 1 | 2) {
    return this.state.ranks[`${this.state.classId}_passive${branch}`] ?? 0;
  }
  get bonus() {
    return this.state.classId
      ? Math.min(0.15, 0.05 + this.rank(2) * 0.01 + this.mastery * 0.0025)
      : 0;
  }
  get industryBonus() {
    return this.state.classId === "engineer" ? this.bonus : 0;
  }
  get environmentFactor() {
    return Math.max(
      0.55,
      1 -
        (this.state.classId === "explorer" ? this.bonus : 0) -
        (this.buffs.adapt > 0 ? 0.3 : 0),
    );
  }
  get miningFactor() {
    return Math.max(
      0.7,
      1 -
        (this.state.classId === "explorer" ? this.bonus : 0) -
        (this.buffs.scan > 0 ? 0.1 : 0) -
        (this.buffs.extraction > 0 ? 0.15 : 0),
    );
  }
  get safeReason() {
    const w = this.w;
    if (this.trialReturn) return "체험 중에는 변경할 수 없습니다.";
    if (
      w.dead ||
      w.space.state.trip ||
      w.combat.training ||
      w.combat.boss.active ||
      w.extreme.combat.boss ||
      w.omega.combat.boss ||
      w.omega.endgame.original ||
      w.survival.sentinel.active ||
      w.space.combat.boss ||
      w.colony.siege
    )
      return "전투·침공·항해 중에는 사용할 수 없습니다.";
    if (
      !w.survival.inBase ||
      !w.extreme.environment.sheltered ||
      w.player.y > 850
    )
      return "안전한 기지 또는 우주선에서 이용하세요.";
    if (
      w.enemies.some(
        (e) =>
          e.state !== "Death" &&
          e.kind !== "dummy" &&
          Math.hypot(e.x - w.player.x, e.y - w.player.y) < 650,
      )
    )
      return "주변 위협을 먼저 제거하세요.";
    return "";
  }
  applyStats(stats: Stats) {
    const d = this.definition;
    if (!d) return stats;
    for (const [k, v] of Object.entries(d.stats)) {
      const key = k as keyof Stats;
      stats[key] = ["crit", "statusResist", "elementResist"].includes(key)
        ? stats[key] + v
        : stats[key] * (1 + v);
    }
    stats.attack *= 1 + this.rank(0) * 0.02;
    if (d.weapons.includes(this.w.combat.weapons.id))
      stats.attack *= 1.05 + this.mastery * 0.002;
    if (this.buffs.guard > 0) {
      stats.moveSpeed *= 0.75;
      stats.statusResist = Math.min(0.8, stats.statusResist + 0.3);
    }
    if (this.buffs.buff > 0) {
      stats.attack *= 1.25;
      stats.attackSpeed *= 1.1;
      if (this.state.path === "sharpshooter") {
        stats.crit += 0.15;
        stats.critDamage += 0.2;
      }
    }
    if (this.buffs.mech > 0) {
      stats.attack *= 1.35;
      stats.defense += 20;
    }
    if (this.buffs.jet > 0) stats.moveSpeed *= 1.3;
    stats.crit = Math.min(0.75, stats.crit);
    stats.elementResist = Math.min(0.7, stats.elementResist);
    return stats;
  }
  usable(id: string) {
    const d = classSkills[id],
      s = this.state;
    return (
      !!d &&
      d.classId === s.classId &&
      (!d.path || d.path === s.path) &&
      d.tier <= s.tier &&
      d.level <= this.w.player.level &&
      (s.ranks[id] ?? 0) > 0
    );
  }
  learnReason(id: string) {
    const d = classSkills[id],
      s = this.state;
    if (!d || d.classId !== s.classId || (d.path && d.path !== s.path))
      return "현재 직업의 스킬이 아닙니다.";
    if (d.tier > s.tier || this.w.player.level < d.level)
      return `Lv.${d.level} / ${d.tier}차 전직 필요`;
    if (d.prerequisite && !s.ranks[d.prerequisite])
      return `선행 스킬: ${classSkills[d.prerequisite].name}`;
    if ((s.ranks[id] ?? 0) >= d.max) return "최대 단계";
    if (this.sp < 1) return "SP 부족";
    return "";
  }
  learn(id: string) {
    const reason = this.learnReason(id);
    if (reason) {
      this.w.toast(reason);
      return false;
    }
    this.state.ranks[id] = (this.state.ranks[id] ?? 0) + 1;
    this.record("learn");
    this.w.emit("save", "class-skill");
    return true;
  }
  assign(slot: number, id: string | null) {
    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 3 ||
      (id &&
        (!this.usable(id) ||
          classSkills[id].passive ||
          classSkills[id].ultimate))
    )
      return false;
    if (id) {
      const previous = this.state.slots.indexOf(id);
      if (previous >= 0) this.state.slots[previous] = this.state.slots[slot];
    }
    this.state.slots[slot] = id;
    return true;
  }
  choose(id: ClassId) {
    if (
      !classIds.includes(id) ||
      this.w.player.level < 10 ||
      this.state.classId === id
    )
      return false;
    const reason = this.safeReason;
    if (reason) {
      this.w.toast(reason);
      return false;
    }
    if (!(this.state.trials[id] >= 1)) {
      this.w.toast("교관의 직업 체험 시험을 먼저 통과하세요.");
      return false;
    }
    if (
      this.state.classId &&
      (this.state.changeCooldown > 0 || this.w.battle.credits < 100)
    ) {
      this.w.toast("직업 변경: 100 CR 및 60초 대기 필요");
      return false;
    }
    if (this.state.classId) {
      this.w.battle.credits -= 100;
      this.state.changes++;
      this.state.changeCooldown = 60;
    }
    this.state.classId = id;
    this.state.path = null;
    this.state.tier = 1;
    this.state.highestTier = Math.max(1, this.state.highestTier);
    this.state.ranks = Object.fromEntries(
      [0, 1, 2, 3].map((i) => [`${id}_${i}`, 1]),
    );
    this.state.slots = [0, 1, 2, 3].map((i) => `${id}_${i}`);
    this.state.gauge = 0;
    this.clearEffects();
    this.clampVitals();
    this.record("first");
    this.sync();
    this.w.emit("save", "class-change");
    return true;
  }
  specialize(id: string) {
    const d = paths[id],
      s = this.state;
    if (
      this.safeReason ||
      !d ||
      d.classId !== s.classId ||
      this.w.player.level < 30 ||
      s.path === id
    )
      return false;
    if (!(s.trials[`${s.classId}_tier2`] >= 1)) {
      this.w.toast("2차 전직 시험을 먼저 통과하세요.");
      return false;
    }
    if (s.path && (s.changeCooldown > 0 || this.w.battle.credits < 50))
      return false;
    if (s.path) {
      this.w.battle.credits -= 50;
      s.changeCooldown = 60;
    }
    s.ranks = Object.fromEntries(
      Object.entries(s.ranks).filter(([key]) => !classSkills[key].path),
    );
    s.path = id;
    s.tier =
      s.highestTier >= 3 &&
      this.w.player.level >= 60 &&
      s.trials[`${s.classId}_tier3`] >= 1
        ? 3
        : 2;
    s.highestTier = Math.max(s.highestTier, 2);
    s.slots = s.slots.map((key) => (key && this.usable(key) ? key : null));
    s.gauge = 0;
    this.clearEffects();
    this.record("second");
    this.sync();
    this.w.emit("save", "specialization");
    return true;
  }
  advance() {
    const s = this.state;
    if (
      this.safeReason ||
      s.tier !== 2 ||
      !s.path ||
      this.w.player.level < 60 ||
      !(s.trials[`${s.classId}_tier3`] >= 1)
    )
      return false;
    s.tier = 3;
    s.highestTier = 3;
    this.record("third");
    this.sync();
    this.w.emit("save", "advancement");
    return true;
  }
  resetSkills() {
    if (this.safeReason || !this.state.classId) return false;
    if (this.state.resets && this.w.battle.credits < 50) return false;
    if (this.state.resets) this.w.battle.credits -= 50;
    this.state.resets++;
    this.state.ranks = Object.fromEntries(
      [0, 1, 2, 3].map((i) => [`${this.state.classId}_${i}`, 1]),
    );
    this.state.slots = [0, 1, 2, 3].map((i) => `${this.state.classId}_${i}`);
    this.clearEffects();
    this.clampVitals();
    this.w.emit("save", "respec");
    return true;
  }
  clampVitals() {
    this.w.player.hp = Math.min(this.w.player.hp, this.w.stats.hp);
    this.w.player.energy = Math.min(this.w.player.energy, this.w.stats.energy);
  }
  record(id: string) {
    if (!this.state.records.includes(id)) this.state.records.push(id);
  }
  craftGear(slot: "body" | "core") {
    const s = this.state,
      w = this.w;
    if (
      this.safeReason ||
      !s.classId ||
      s.tier < 2 ||
      !["body", "core"].includes(slot)
    )
      return false;
    if (
      occupiedSlots(w.inventory) + w.battle.gear.length >=
      w.survival.state.capacity
    ) {
      w.toast("장비 공간이 부족합니다.");
      return false;
    }
    if (
      !w.survival.storage.spend(
        s.tier === 3
          ? { ultraAlloy: 4, superCircuit: 2 }
          : { iron: 8, circuit: 2 },
      )
    )
      return false;
    w.battle.gear.push({
      id: `gear-${++w.battle.serial}`,
      template: `class_${s.classId}_${slot}`,
      rarity: s.tier === 3 ? "epic" : "rare",
      upgrade: 0,
    });
    this.record("gear");
    w.emit("save", "class-gear");
    return true;
  }
  preset(name: string, save: boolean) {
    if (
      this.safeReason ||
      !this.state.classId ||
      !["boss", "hunt", "defense", "mining", "water", "space"].includes(name)
    )
      return false;
    const w = this.w,
      s = this.state;
    if (save)
      s.presets[name] = {
        classId: s.classId!,
        slots: [...s.slots],
        common: [...w.battle.skillSlots],
        equipment: { ...w.battle.equipment },
        weapons: [...w.battle.weaponSlots],
        environment: [...w.survival.state.equipped],
      };
    else {
      const p = s.presets[name];
      if (!p || p.classId !== s.classId) return false;
      s.slots = p.slots.map((id) => (id && this.usable(id) ? id : null));
      w.battle.skillSlots = [...p.common];
      for (const [i, id] of p.weapons.entries())
        if (id && w.battle.ownedWeapons.includes(id))
          w.battle.weaponSlots[i] = id;
      w.battle.equipment = {};
      for (const [slot, id] of Object.entries(p.equipment))
        EquipmentSystem.equip(w.battle, id!, slot as never);
      w.survival.state.equipped = p.environment.filter((id) =>
        w.survival.state.owned.includes(id),
      );
      this.clampVitals();
      w.survival.state.oxygen = Math.min(
        w.survival.state.oxygen,
        w.survival.oxygen.maximum,
      );
    }
    w.emit("save", "class-preset");
    return true;
  }
  energyCost(d: ClassSkill) {
    return Math.max(
      8,
      Math.ceil(
        d.energy *
          (this.state.classId === "scientist" ? 0.85 : 1) *
          (d.power
            ? 1
            : 1 - Math.max(0, (this.state.ranks[d.id] ?? 1) - 1) * 0.04),
      ),
    );
  }
  castReason(id: string) {
    const d = classSkills[id];
    if (!d || !this.usable(id) || d.passive) return "스킬을 먼저 배우세요.";
    if (this.w.dead || this.w.space.state.trip)
      return "현재 사용할 수 없습니다.";
    if (this.lock > 0 || (this.state.cooldowns[id] ?? 0) > 0)
      return "재사용 대기 중";
    if (
      (d.effect === "dash" || d.effect === "counter") &&
      this.w.player.dashCooldown > 0
    )
      return "공통 회피 재사용 대기 중";
    if (
      d.effect === "aerial" &&
      this.w.player.grounded &&
      !this.w.extreme.physics.swimming
    )
      return "공중 또는 수중에서 사용하세요.";
    if (this.w.player.energy < this.energyCost(d)) return "EP 부족";
    if (this.state.gauge < d.gauge) return "직업 게이지 부족";
    return "";
  }
  cast(id: string) {
    const reason = this.castReason(id);
    if (reason) {
      this.w.toast(reason);
      return false;
    }
    const d = classSkills[id],
      w = this.w,
      s = this.state,
      p = w.player,
      rank = s.ranks[id];
    const energy = this.energyCost(d);
    p.energy -= energy;
    this.metrics.spentEP += energy;
    s.gauge -= d.gauge;
    s.cooldowns[id] = Math.max(
      d.ultimate ? 90 : 3,
      d.cooldown * (1 - this.rank(1) * 0.01),
    );
    this.lock = 0.35;
    const power =
      d.power *
      (1 + (rank - 1) * 0.08) *
      (1 + this.mastery * 0.0025) *
      (d.id === "explorer_3" && (Math.abs(p.vx) > 100 || p.dash > 0) ? 1.2 : 1);
    if (d.ultimate) {
      this.metrics.ultimates++;
      this.record("ultimate");
      w.toast(d.name);
      w.camera.shake = Math.max(w.camera.shake, 7);
    }
    if (d.gauge) this.record("gauge");
    if (this.trial && !this.trial.skills.includes(id))
      this.trial.skills.push(id);
    this.execute(d, power, p.x + 17, p.y + 32);
    w.sound(
      d.ultimate
        ? "orbital"
        : s.classId === "guardian"
          ? "hammer"
          : s.classId === "engineer"
            ? "switch"
            : s.classId === "explorer"
              ? "jet"
              : s.classId === "cyberBlade"
                ? "blade"
                : s.classId === "scientist"
                  ? "wave"
                  : "shoot",
    );
    w.burst(p.x + 17, p.y + 32, this.definition!.color, d.ultimate ? 36 : 12);
    return true;
  }
  private payload(d: ClassSkill, power: number, x: number): AttackPayload {
    return {
      damage: this.w.stats.attack * power,
      element: d.element,
      crit: Math.min(0.85, this.w.stats.crit + (d.id === "ranger_0" ? 0.2 : 0)),
      critDamage: this.w.stats.critDamage,
      knockback: 200,
      status:
        d.element === "gravity"
          ? "shred"
          : d.element === "electric"
            ? "shock"
            : d.element === "cryo"
              ? "chill"
              : d.element === "toxic"
                ? "poison"
                : d.id === "guardian_0"
                  ? "stun"
                  : undefined,
      statusChance: 1,
      special: true,
      sourceX: x,
      classSkill: true,
    };
  }
  private shape(x: number, y: number, radius: number): AttackShape {
    return {
      kind: "circle",
      x,
      y,
      w: 0,
      h: 0,
      radius,
      facing: this.w.player.facing,
    };
  }
  private strike(
    d: ClassSkill,
    power: number,
    x: number,
    y: number,
    radius = d.range,
  ) {
    this.w.combat.strike(
      this.shape(x, y, radius),
      this.payload(d, power, x),
      this.definition!.color,
      0.3,
      true,
    );
  }
  private execute(d: ClassSkill, power: number, x: number, y: number) {
    const w = this.w,
      p = w.player,
      fx = d.effect,
      ult = !!d.ultimate;
    if (fx === "strike" || fx === "aerial") {
      const count =
        d.id === "duelist_1" ? 3 : ult ? 5 : fx === "aerial" ? 2 : 1;
      for (let i = 0; i < count; i++)
        this.pending.push({
          time: i * 0.16,
          skill: d,
          power: power / (ult ? 3 : 1),
          x: x + p.facing * 80,
          y,
        });
      if (
        fx === "aerial" &&
        !w.extreme.physics.swimming &&
        d.path === "berserker"
      )
        p.vy = 400;
    }
    if (fx === "burst") {
      const n = d.id === "destroyer_1" ? 3 : ult ? 4 : 1;
      for (let i = 0; i < n; i++)
        this.pending.push({
          time: i * 0.25,
          skill: d,
          power: power / (ult ? 2 : 1),
          x,
          y,
        });
    }
    if (fx === "wave") {
      const n = d.id === "ranger_1" ? 3 : d.id === "gunner_0" ? 5 : 1;
      for (let i = 0; i < n; i++)
        w.combat.projectiles.fire(
          x + p.facing * 35,
          y + (i - (n - 1) / 2) * 12,
          p.facing * (d.id === "scientist_0" ? 360 : 1000),
          0,
          d.range,
          ult ? 34 : 12,
          this.definition!.color,
          this.payload(d, power, x),
          true,
        );
    }
    if (fx === "guard") {
      this.buffs.guard = ult ? 10 : d.id === "sentinel_2" ? 3 : 6;
      w.combat.skills.shield = Math.max(
        w.combat.skills.shield,
        w.stats.hp * (ult ? 0.6 : 0.2),
      );
      w.combat.skills.shieldTime = this.buffs.guard;
    }
    if (fx === "counter") {
      this.buffs.counter = this.state.classId === "cyberBlade" ? 0.8 : 1;
      p.dashCooldown = 3;
      this.buffs.counterPower = power;
    }
    if (fx === "mark" || fx === "analysis") {
      const targets = w.combat.targets
        .filter(
          (e) => e.state !== "Death" && Math.hypot(e.x - x, e.y - y) < d.range,
        )
        .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
      for (const e of fx === "mark" ? targets.slice(0, 1) : targets) {
        this.marks.set(e.id, 8);
        w.toast(`${e.kind} · ${d.name} · 추가 피해 15%`);
      }
      this.strike(d, power, x, y);
    }
    if (fx === "drone" || fx === "turret" || fx === "trap" || fx === "swarm") {
      const n = fx === "swarm" ? (ult ? 4 : 3) : 1;
      for (let i = 0; i < n; i++) {
        if (this.summons.length >= 4) this.summons.shift();
        this.summons.push({
          id: ++this.serial,
          owner: "player",
          kind: fx === "turret" ? "turret" : fx === "trap" ? "trap" : "drone",
          x: x + i * 38,
          y: y - 25,
          life: ult ? 16 : 12,
          hp: 100,
          clock: 0.5 + i * 0.1,
          power: ult ? 0.9 : power,
          range: d.range,
        });
      }
    }
    if (fx === "repair" || fx === "heal") {
      if (fx === "repair" && d.path) {
        w.combat.skills.shield = Math.max(
          w.combat.skills.shield,
          w.stats.hp * 0.2,
        );
        w.combat.skills.shieldTime = Math.max(w.combat.skills.shieldTime, 3);
      }
      const amount = Math.min(
        w.stats.hp - p.hp,
        w.stats.hp * (ult ? 0.3 : fx === "heal" ? 0.16 : 0.08),
      );
      p.hp += amount;
      this.metrics.healing += amount;
      for (const s of this.summons) s.hp = Math.min(100, s.hp + 50);
      for (const b of w.colony.state.buildings.filter(
        (b) => Math.hypot(b.x - x, b.y - y) < 420,
      ))
        b.hp = Math.min(
          definition(b.kind).hp * (1 + (b.level - 1) * 0.3),
          b.hp + 50,
        );
      if (ult) this.strike(d, power * 0.6, x, y);
    }
    if (fx === "well") {
      this.buffs.well = 3;
      this.buffs.wellX = x + p.facing * 160;
      this.buffs.wellY = y;
      w.combat.effect(
        this.shape(this.buffs.wellX, y, d.range),
        this.definition!.color,
        3,
        true,
        d.name,
      );
      this.pending.push({ time: 3, skill: d, power, x: this.buffs.wellX, y });
    }
    if (fx === "shift") {
      this.element =
        this.element === "cryo"
          ? "electric"
          : this.element === "electric"
            ? "toxic"
            : "cryo";
      this.buffs.shift = 12;
      w.toast(`속성 변환 · ${this.element}`);
    }
    if (fx === "dash") {
      if (d.id === "ranger_2") {
        p.facing *= -1;
        this.buffs.reverse = 0.2;
      }
      p.dash = 0.18;
      p.dashCooldown = 3;
      p.invulnerable = Math.max(p.invulnerable, 0.18);
      if (d.id === "ranger_2")
        w.combat.projectiles.fire(
          x - p.facing * 30,
          y,
          -p.facing * 900,
          0,
          d.range,
          12,
          this.definition!.color,
          this.payload(d, power, x),
          false,
        );
      else
        this.strike(
          d,
          power,
          x + (d.id === "ranger_2" ? -p.facing : p.facing) * 100,
          y,
        );
    }
    if (fx === "jet") {
      this.buffs.jet = ult ? 10 : 4;
      p.vy = -320;
      w.extreme.state.jetEnergy = Math.min(100, w.extreme.state.jetEnergy + 15);
      this.strike(d, power * (ult ? 0.5 : 1), x, y);
    }
    if (fx === "scan") {
      this.buffs.scan = ult ? 20 : 10;
      w.survival.scanner.remaining = 10;
      if (this.trial) this.trial.scanned = true;
      this.strike(d, power, x, y);
    }
    if (fx === "adapt") {
      this.buffs.adapt = 12;
      if (d.id === "prospector_1") this.buffs.extraction = 12;
    }
    if (fx === "buff") this.buffs.buff = 8;
    if (fx === "mech") {
      this.buffs.mech = ult ? 12 : 8;
      if (ult) this.strike(d, power * 0.6, x, y);
    }
  }
  modifyAttack(a: AttackPayload, e: Enemy) {
    let damage = a.damage;
    if (this.marks.has(e.id)) damage *= 1.15;
    if (
      this.state.classId === "cyberBlade" &&
      this.w.combat.weapons.id === "blade"
    )
      damage *= 1 + Math.min(0.12, this.w.combat.combo * 0.01);
    return {
      ...a,
      damage,
      element: !a.classSkill && this.buffs.shift > 0 ? this.element : a.element,
    };
  }
  onHit(e: Enemy, a: AttackPayload, damage: number, critical: boolean) {
    this.metrics.damage += damage;
    this.metrics.hits++;
    if (critical) this.metrics.critical++;
    if (a.summon) this.metrics.summonDamage += damage;
    if (this.trial) {
      this.trial.hits++;
      if (e.hp <= 0) this.trial.kills++;
    }
    if (
      !this.state.classId ||
      e.kind === "dummy" ||
      (e.noLoot && !this.isBoss(e)) ||
      damage <= 0
    )
      return;
    const spent = this.rewardBudgets.get(e) ?? 0,
      budget = Math.max(4, Math.min(80, e.maxHp / 10));
    if (spent >= budget) return;
    const gain =
      Math.min(budget - spent, Math.max(0.3, Math.min(3, damage / 20))) *
      (1 + this.rank(1) * 0.03);
    this.rewardBudgets.set(e, spent + gain);
    let charge = 1;
    if (this.state.classId === "scientist")
      charge = this.lastElement !== a.element ? 2 : 0.5;
    if (this.state.classId === "ranger" && critical) charge = 1.5;
    if (this.state.classId === "cyberBlade")
      charge = 1 + Math.min(0.5, this.w.combat.combo * 0.05);
    this.lastElement = a.element;
    if (this.gaugeClock <= 0) {
      const amount = Math.min(7, gain * charge);
      this.state.gauge = Math.min(100, this.state.gauge + amount);
      this.metrics.gaugeEarned += amount;
      this.gaugeClock = 0.15;
    }
    if (a.classSkill) {
      this.awardMastery(Math.min(4, gain));
      this.record("skillHit");
      if (this.w.combat.combo >= 3) this.record("combo");
    }
  }
  awardMastery(n: number) {
    const id = this.state.classId;
    if (id)
      this.state.mastery[id] = Math.min(
        4000,
        (this.state.mastery[id] ?? 0) + n,
      );
  }
  receive(damage: number, hostile = true) {
    let factor = this.buffs.guard > 0 ? 0.55 : this.buffs.mech > 0 ? 0.7 : 1;
    if (this.state.path === "berserker" && this.buffs.buff > 0) factor *= 1.15;
    if (this.buffs.counter > 0 && hostile) {
      factor = 0.25;
      this.buffs.counter = 0;
      const d = classSkills[`${this.state.classId}_0`];
      if (d)
        this.strike(
          d,
          this.buffs.counterPower || 3,
          this.w.player.x + 17,
          this.w.player.y + 32,
          230,
        );
      this.state.gauge = Math.min(100, this.state.gauge + 10);
      this.record("counter");
      if (this.trial) this.trial.defended++;
    }
    if (this.state.classId === "guardian" && damage > 0 && hostile)
      this.state.gauge = Math.min(
        100,
        this.state.gauge + Math.min(5, damage * 0.1),
      );
    this.metrics.prevented += Math.max(0, damage * (1 - factor));
    return damage * factor;
  }
  update(dt: number, input: InputFrame) {
    this.metrics.elapsed += dt;
    this.lock = Math.max(0, this.lock - dt);
    this.gaugeClock = Math.max(0, this.gaugeClock - dt);
    this.state.changeCooldown = Math.max(0, this.state.changeCooldown - dt);
    for (const key of Object.keys(this.state.cooldowns))
      this.state.cooldowns[key] = Math.max(0, this.state.cooldowns[key] - dt);
    if (this.buffs.reverse > 0 && this.buffs.reverse <= dt)
      this.w.player.facing *= -1;
    for (const key of Object.keys(this.buffs))
      if (!["wellX", "wellY", "counterPower"].includes(key))
        this.buffs[key] = Math.max(0, this.buffs[key] - dt);
    for (const [id, time] of this.marks) {
      if (time <= dt) this.marks.delete(id);
      else this.marks.set(id, time - dt);
    }
    if (input.ultimate && this.state.path)
      this.cast(`${this.state.path}_ultimate`);
    const w = this.w,
      p = w.player;
    if (
      this.state.classId === "explorer" &&
      Math.abs(p.vx) > 150 &&
      w.combat.targets.some(
        (e) =>
          e.kind !== "dummy" &&
          e.state !== "Death" &&
          Math.hypot(e.x - p.x, e.y - p.y) < 600,
      )
    )
      this.state.gauge = Math.min(100, this.state.gauge + dt * 1.5);
    if (this.buffs.well > 0)
      for (const e of w.combat.targets)
        if (
          !this.isBoss(e) &&
          e.kind !== "dummy" &&
          Math.hypot(e.x - this.buffs.wellX, e.y - this.buffs.wellY) < 340
        ) {
          e.vx += (this.buffs.wellX - e.x) * dt * 3;
          e.vy += (this.buffs.wellY - e.y) * dt;
        }
    for (const attack of this.pending) {
      attack.time -= dt;
      if (attack.time <= 0) {
        this.strike(attack.skill, attack.power, attack.x, attack.y);
        attack.time = -999;
      }
    }
    this.pending = this.pending.filter((a) => a.time !== -999);
    for (const summon of this.summons) {
      summon.life -= dt;
      summon.clock -= dt;
      if (summon.kind === "drone") {
        summon.x +=
          (p.x + ((summon.id % 3) - 1) * 60 - summon.x) * Math.min(1, dt * 4);
        summon.y += (p.y - 60 - summon.y) * Math.min(1, dt * 4);
      }
      const target = w.combat.targets
        .filter(
          (e) =>
            e.state !== "Death" &&
            Math.hypot(e.x - summon.x, e.y - summon.y) < summon.range,
        )
        .sort((a, b) => Math.abs(a.x - summon.x) - Math.abs(b.x - summon.x))[0];
      if (target && summon.clock <= 0) {
        summon.clock = 1;
        const d = classSkills.engineer_0,
          center = enemySize(target);
        w.combat.hit(target, {
          ...this.payload(
            d,
            summon.power * (this.buffs.buff > 0 ? 1.25 : 1),
            summon.x,
          ),
          summon: true,
        });
        w.combat.effect(
          {
            kind: "rect",
            x: Math.min(summon.x, target.x),
            y: target.y + center.h / 2,
            w: Math.abs(target.x - summon.x) + 10,
            h: 3,
            radius: 0,
            facing: 1,
          },
          classes.engineer.color,
          0.12,
        );
        if (summon.kind === "trap") summon.life = 0;
      }
      for (const h of w.combat.hazards)
        if (h.delay <= 0 && Math.hypot(h.x - summon.x, h.y - summon.y) < 80)
          summon.hp -= dt * 12;
    }
    this.summons = this.summons.filter((s) => s.life > 0 && s.hp > 0);
    if (this.rematch && this.rematch.enemy.hp > 0) {
      const r = this.rematch;
      r.elapsed += dt;
      r.pulse -= dt;
      if (r.difficulty > 0 && r.pulse <= 0) {
        r.pulse = r.difficulty === 2 ? 4 : 7;
        w.combat.hazard(
          this.shape(p.x + 17, p.y + 32, r.difficulty === 2 ? 110 : 80),
          30 + r.difficulty * 20,
          "gravity",
          1.2,
          0.4,
          "아카데미 중력 추적",
        );
        if (r.difficulty === 2)
          w.combat.hazard(
            {
              kind: "rect",
              x: p.x - 300,
              y: p.y - 110,
              w: 600,
              h: 25,
              radius: 0,
              facing: 1,
            },
            65,
            "electric",
            1.7,
            0.5,
            "숙련 교차 광선",
          );
      }
    }
    if (this.trial) {
      const t = this.trial;
      p.x = Math.max(250, Math.min(2100, p.x));
      t.elapsed += dt;
      t.distance = Math.max(t.distance, Math.abs(p.x - t.startX));
      if (t.elapsed > 180 || w.dead) t.grade = 0;
      else if (
        t.hits >= 6 &&
        t.skills.length >= 3 &&
        t.kills >= 1 &&
        (t.classId !== "explorer" || (t.distance > 350 && t.scanned)) &&
        ((t.classId !== "guardian" && t.classId !== "cyberBlade") ||
          t.defended >= 1)
      )
        t.grade =
          t.elapsed < 45 ? 4 : t.elapsed < 75 ? 3 : t.elapsed < 120 ? 2 : 1;
    }
  }
  isBoss(e: Enemy) {
    return (
      e === this.w.extreme.combat.boss ||
      e === this.w.omega.combat.boss ||
      ["titan", "colossus", "sentinel", "conduit"].includes(e.kind)
    );
  }
  clearEffects() {
    this.summons = [];
    this.buffs = {};
    this.pending = [];
    this.marks.clear();
    this.lock = 0;
  }
  questReady(id: number) {
    const s = this.state,
      r = s.records;
    return (
      [
        r.includes("mentor") && r.includes("trial"),
        s.tier >= 1,
        r.includes("learn") && r.includes("skillHit") && r.includes("combo"),
        s.tier >= 2,
        this.mastery >= 2 && r.includes("challenge") && r.includes("gear"),
        s.tier >= 3 && r.includes("ultimate"),
        r.includes("rematch"),
        !!this.w.progress.counters.genesis && r.includes("third"),
      ][id - 57] ?? false
    );
  }
  claimQuest(id: number) {
    if (
      !Number.isInteger(id) ||
      id < 57 ||
      id > 64 ||
      this.state.quests.includes(id) ||
      !this.questReady(id)
    )
      return false;
    this.state.quests.push(id);
    this.awardMastery(50);
    this.sync();
    this.w.emit("save", "class-quest");
    return true;
  }
}
