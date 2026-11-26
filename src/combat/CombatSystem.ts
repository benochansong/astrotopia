import type { World } from "../core/world";
import type { Enemy, InputFrame, Player } from "../core/types";
import { enemyData } from "../data/content";
import { difficulties, skills, subzones, weapons } from "../data/battle";
import { DamageSystem, enemySize, overlaps } from "./DamageSystem";
import { EnemyAI, createEnemy } from "./EnemyAI";
import { BossSystem } from "./BossSystem";
import { LootSystem } from "./LootSystem";
import { ProjectileSystem } from "./ProjectileSystem";
import { WeaponSystem } from "./WeaponSystem";
import { SkillSystem } from "./SkillSystem";
import { StatusEffectSystem } from "./StatusEffectSystem";
import type {
  AttackPayload,
  AttackShape,
  CombatEffect,
  Element,
  Hazard,
  SkillId,
  Status,
  StatusId,
  WeaponId,
} from "./types";
export class CombatSystem {
  weapons: WeaponSystem;
  skills: SkillSystem;
  projectiles: ProjectileSystem;
  ai: EnemyAI;
  loot: LootSystem;
  boss: BossSystem;
  effects: CombatEffect[] = [];
  hazards: Hazard[] = [];
  playerStatuses: Status[] = [];
  combo = 0;
  comboTimer = 0;
  hitStop = 0;
  private serial = 0;
  private pending: {
    shape: AttackShape;
    payload: AttackPayload;
    color: string;
    delay: number;
  }[] = [];
  training: null | {
    weapon: WeaponId;
    hp: number;
    energy: number;
    x: number;
    y: number;
    activeSlot: 0 | 1;
    skillSlots: (SkillId | null)[];
    dashCooldown: number;
    cooldowns: Partial<Record<SkillId, number>>;
    hits: number;
    damage: number;
    maxCombo: number;
    elapsed: number;
  } = null;
  constructor(private w: World) {
    this.weapons = new WeaponSystem(w);
    this.skills = new SkillSystem(w);
    this.projectiles = new ProjectileSystem(w);
    this.ai = new EnemyAI(w);
    this.loot = new LootSystem(w);
    this.boss = new BossSystem(w);
  }
  get targets() {
    return [
      ...this.w.enemies.filter((e) =>
        this.training ? e.kind === "dummy" : e.kind !== "dummy",
      ),
      ...(this.boss.active ? [this.boss.enemy!] : []),
    ];
  }
  get zone() {
    return [...subzones[this.w.region]]
      .reverse()
      .find((z) => this.w.player.x >= z.start)!;
  }
  unlock() {
    for (const d of Object.values(weapons)) {
      if (
        this.w.player.level >= d.level &&
        !this.w.battle.ownedWeapons.includes(d.id)
      ) {
        this.w.battle.ownedWeapons.push(d.id);
        if (!this.w.battle.weaponSlots[1]) this.w.battle.weaponSlots[1] = d.id;
        this.w.toast(`새 무기 해금 · ${d.name} · C에서 장착`);
      }
    }
    for (const id of Object.keys(skills) as SkillId[])
      if (
        this.w.player.level >= skills[id].level &&
        !this.w.battle.unlockedSkills.includes(id)
      ) {
        this.w.battle.unlockedSkills.push(id);
        this.w.toast(`새 스킬 · ${skills[id].name} · V에서 배치`);
      }
  }
  effect(
    shape: AttackShape,
    color: string,
    life = 0.25,
    warning = false,
    label?: string,
  ) {
    if (this.effects.length >= 70) this.effects.shift();
    this.effects.push({ ...shape, color, life, maxLife: life, warning, label });
  }
  defer(
    shape: AttackShape,
    payload: AttackPayload,
    color: string,
    delay: number,
  ) {
    if (this.pending.length >= 24) return;
    this.pending.push({ shape, payload, color, delay });
    this.effect(shape, color, delay, true);
  }
  strike(
    shape: AttackShape,
    a: AttackPayload,
    color: string,
    life = 0.22,
    strong = false,
  ) {
    this.effect(shape, color, life);
    for (const e of this.targets) {
      if (e.state === "Death") continue;
      const s = enemySize(e);
      if (overlaps(shape, { x: e.x, y: e.y, ...s })) {
        this.hit(e, a, strong);
        if (
          strong &&
          e.kind !== "sentinel" &&
          e.kind !== "conduit" &&
          e.kind !== "colossus" &&
          e.kind !== "titan" &&
          e.kind !== "dummy" &&
          e.launched < 2
        ) {
          e.vy = -250;
          e.launched++;
        }
      }
    }
  }
  hit(e: Enemy, a: AttackPayload, strong = false, dot = false) {
    const w = this.w;
    if (e.state === "Death" || (e.kind === "worm" && e.state === "Retreat"))
      return;
    const result = DamageSystem.resolve(
      e,
      a,
      Math.random(),
      (e.kind === "titan" && this.boss.coreOpen) ||
        (e.kind === "colossus" && w.space.combat.core > 0),
    );
    let amount = result.damage;
    if (e.shield > 0) {
      const block = Math.min(amount, e.shield);
      e.shield -= block;
      amount -= block;
    }
    e.hp = Math.max(0, e.hp - amount);
    e.flash = 0.12;
    if (!dot) {
      this.combo++;
      this.comboTimer = 2.4;
      if (this.training) {
        this.training.hits++;
        this.training.damage += amount;
        this.training.maxCombo = Math.max(this.training.maxCombo, this.combo);
        if (!a.special) w.count("trainingHit");
        if (this.training.weapon !== "pulse") w.count("trainingTrial");
      }
      if (result.weak) w.count("weakness");
      if (
        e.kind !== "titan" &&
        e.kind !== "dummy" &&
        (e.staggerGuard ?? 0) <= 0
      ) {
        e.staggerGuard = 0.7;
        e.state = "Hit";
        e.timer = Math.min(0.2, e.elite ? 0.08 : 0.17);
        e.vx = Math.sign(e.x - a.sourceX) * a.knockback;
      }
      if (strong || result.critical) {
        this.hitStop = Math.max(this.hitStop, strong ? 0.045 : 0.018);
        if (strong) w.camera.shake = Math.max(w.camera.shake, 4);
      }
      w.sound(result.critical ? "critical" : "impact_" + e.kind);
      w.burst(
        e.x + enemySize(e).w / 2,
        e.y + enemySize(e).h / 2,
        enemyData[e.kind].color,
        result.critical ? 16 : 7,
      );
    }
    if (w.settings.damageNumbers)
      w.texts.push({
        x: e.x + enemySize(e).w / 2,
        y: e.y - 5,
        text:
          (result.critical ? "✦ " : "") +
          Math.round(amount) +
          (result.weak ? " 약점" : ""),
        color: result.critical ? "#ffe3a0" : dot ? "#c8dca0" : "#eef1d0",
        life: result.critical ? 1.1 : 0.7,
      });
    if (a.status && Math.random() < a.statusChance) {
      StatusEffectSystem.apply(
        e.statuses,
        a.status,
        Math.max(2, w.stats.attack * 0.12),
        !!e.elite,
        e.kind === "titan" || e.kind === "sentinel" || e.kind === "conduit",
        e.ccImmunity,
      );
      if (e.statuses.some((s) => s.id === "freeze" || s.id === "stun"))
        e.ccImmunity = 4;
    }
    if (e.kind === "dummy") {
      e.hp = e.maxHp;
      return;
    }
    if (e.hp <= 0) {
      if (e.kind === "sentinel") {
        w.survival.sentinel.defeat();
        return;
      }
      if (e.kind === "conduit") {
        e.state = "Death";
        e.timer = 999;
        return;
      }
      if (e.kind === "titan") {
        this.boss.defeat();
        return;
      }
      e.state = "Death";
      e.timer = 24;
      this.loot.drop(e);
      if (e.elite === "splitting" && w.enemies.length < 24)
        for (let i = 0; i < 2; i++) {
          const minion = createEnemy(
            "slime",
            e.x + i * 48,
            e.homeY + enemySize(e).h,
            30000 + ++this.serial,
          );
          minion.hp = minion.maxHp = 20;
          minion.noLoot = true;
          w.enemies.push(minion);
        }
    }
  }
  hazard(
    shape: AttackShape,
    damage: number,
    element: Element,
    delay: number,
    duration: number,
    label: string,
    status?: StatusId,
    vx = 0,
    vy = 0,
  ) {
    if (this.hazards.length >= 70) return;
    this.hazards.push({
      ...shape,
      id: ++this.serial,
      delay,
      duration,
      damage,
      element,
      status,
      vx,
      vy,
      clock: 0,
      interval: 0.8,
      color:
        element === "toxic"
          ? "#b3cc81"
          : element === "electric"
            ? "#ead48b"
            : element === "plasma"
              ? "#d3a9f0"
              : "#efa985",
      label,
    });
  }
  hostileShot(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    damage: number,
    element: Element,
    radius = 9,
  ) {
    const angle = Math.atan2(targetY - y, targetX - x);
    this.hazard(
      { kind: "circle", x, y, w: 0, h: 0, radius, facing: 1 },
      damage,
      element,
      0,
      4,
      "적 투사체",
      element === "toxic" ? "poison" : undefined,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
    );
  }
  receive(amount: number, element: Element) {
    const s = this.w.stats;
    let damage = Math.max(
      1,
      amount * difficulties[this.w.settings.difficulty].damage - s.defense,
    );
    if (element !== "physical") damage *= 1 - s.elementResist;
    damage = this.skills.absorb(damage);
    this.combo = 0;
    this.comboTimer = 0;
    return Math.max(0, Math.round(damage));
  }
  tickEffects(dt: number) {
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter((e) => e.life > 0);
    this.hitStop = Math.max(0, this.hitStop - dt);
  }
  beforeMovement(dt: number, input: InputFrame) {
    this.skills.update(dt, input);
    if (this.training) {
      this.training.elapsed += dt;
      this.w.player.energy = this.w.stats.energy;
      if (input.dash && this.w.player.dashCooldown === 0)
        this.w.count("trainingDodge");
    }
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (!this.comboTimer) this.combo = 0;
  }
  update(dt: number, input: InputFrame) {
    const w = this.w;
    this.weapons.update(dt, input);
    if (!this.training) this.ai.update(dt);
    this.boss.update(dt);
    this.projectiles.update(dt);
    for (const p of this.pending) {
      p.delay -= dt;
      if (p.delay <= 0) {
        this.strike(p.shape, p.payload, p.color, 0.4, true);
        p.delay = -999;
      }
    }
    this.pending = this.pending.filter((p) => p.delay !== -999);
    for (const h of this.hazards) {
      if (h.delay > 0) {
        h.delay -= dt;
        continue;
      }
      h.duration -= dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.clock -= dt;
      if (this.training) continue;
      if (
        h.clock <= 0 &&
        overlaps(h, {
          x: w.player.x,
          y: w.player.y,
          w: w.player.w,
          h: w.player.h,
        })
      ) {
        const vulnerable = w.player.invulnerable <= 0;
        w.damage(h.damage, h.x, h.element);
        if (vulnerable && h.status && Math.random() > w.stats.statusResist)
          StatusEffectSystem.apply(this.playerStatuses, h.status, 3);
        h.clock = h.interval;
        if (h.vx || h.vy) h.duration = 0;
      }
    }
    this.hazards = this.hazards.filter(
      (h) =>
        h.duration > 0 && h.x > -300 && h.x < w.map.width + 300 && h.y < 1200,
    );
    StatusEffectSystem.tick(this.playerStatuses, dt, (damage) => {
      if (w.player.invulnerable <= 0)
        w.damage(damage + w.stats.defense, w.player.x, "toxic");
    });
    this.loot.update(dt);
    if (this.training && (w.player.x < 1980 || w.player.x > 2500))
      this.endTraining();
    const zone = this.zone;
    if (zone && !w.progress.counters[zone.id]) {
      w.count(zone.id);
      if (zone.id !== "landing")
        w.toast(`${zone.name} · 권장 Lv.${zone.level}`);
    }
  }
  startTraining() {
    const w = this.w;
    if (this.training) {
      this.endTraining();
      return;
    }
    if (w.region !== "crash" || this.boss.active) return;
    const p = w.player;
    this.training = {
      weapon: "pulse",
      hp: p.hp,
      energy: p.energy,
      x: p.x,
      y: p.y,
      activeSlot: w.battle.activeSlot,
      skillSlots: [...w.battle.skillSlots],
      dashCooldown: p.dashCooldown,
      cooldowns: { ...this.skills.cooldowns },
      hits: 0,
      damage: 0,
      maxCombo: 0,
      elapsed: 0,
    };
    this.skills.cooldowns = {};
    w.enemies.push(
      createEnemy("dummy", 2300, 780, 9000),
      createEnemy("dummy", 2420, 630, 9001),
    );
    w.count("training");
    w.toast(
      "훈련 시작 · C에서 모든 무기를 시험하세요. 범위를 벗어나거나 F로 종료합니다. 실제 전리품은 지급하지 않습니다.",
    );
  }
  trial(id: WeaponId) {
    if (!this.training) return;
    this.training.weapon = id;
    this.weapons.charge = 0;
    this.weapons.comboStep = 0;
    this.w.player.shotCooldown = 0;
    this.weapons.specialCooldown = 0;
    this.w.sound("switch");
  }
  endTraining() {
    if (!this.training) return;
    const w = this.w,
      t = this.training;
    w.player.hp = Math.min(w.stats.hp, t.hp);
    w.player.energy = Math.min(w.stats.energy, t.energy);
    w.battle.activeSlot = t.activeSlot;
    w.battle.skillSlots = [...t.skillSlots];
    w.player.dashCooldown = t.dashCooldown;
    this.playerStatuses = [];
    this.skills.cooldowns = { ...t.cooldowns };
    this.skills.shield = 0;
    this.skills.shieldTime = 0;
    this.weapons.charge = 0;
    this.weapons.slam = false;
    this.training = null;
    w.enemies = w.enemies.filter((e) => e.kind !== "dummy");
    w.bullets.forEach((b) => (b.active = false));
    this.effects = [];
    this.pending = [];
    w.toast("훈련 종료 · 기존 장비와 체력·에너지를 복원했습니다.");
    w.emit("save", "training");
  }
  reset() {
    if (this.training) this.endTraining();
    this.boss.abort();
    this.hazards = [];
    this.effects = [];
    this.pending = [];
    this.playerStatuses = [];
    this.weapons.slam = false;
    this.weapons.charge = 0;
    this.combo = 0;
    this.skills.shield = 0;
    this.skills.shieldTime = 0;
  }
}
