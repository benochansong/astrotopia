import { CivilizationSystem } from "../civilization/CivilizationSystem";
import { AncientSystem } from "../ancient/AncientSystem";
import { ancientDeposits } from "../ancient/regions";
import { ClassSystem } from "../classes/ClassSystem";
import { ExtremeSystem } from "../extreme/ExtremeSystem";
import { extremeDeposits } from "../extreme/regions";
import {
  extremeIds,
  extremePlanets,
  type ExtremePlanet,
} from "../extreme/catalog";
import { SpaceSystem } from "../space/SpaceSystem";
import { baseForPlanet, aresDeposits } from "../space/catalog";
import { deposits } from "../colony/catalog";
import { ColonySystem } from "../colony/ColonySystem";
import { BASE_END } from "../colony/catalog";
import { environments, regionEnvironment } from "../survival/catalog";
import { SurvivalSystem } from "../survival/SurvivalSystem";
import {
  enemyData,
  items,
  questData,
  regionOrder,
  regions,
  type ItemId,
  type RegionId,
  type Resource,
} from "../data/content";
import {
  type Bullet,
  type Drop,
  type Enemy,
  type FloatingText,
  type InputFrame,
  type Particle,
  type Player,
  type Progress,
  type SaveData,
  type Settings,
} from "./types";
import {
  attackPower,
  maxHp,
  MAX_STEP,
  movePlayer,
  xpRequired,
} from "../physics/movement";
import { addItem, occupiedSlots, type Inventory } from "../systems/inventory";
import { newProgress, defaultSettings } from "../save/storage";
import { newBattle } from "../data/battle";
import { EquipmentSystem } from "../combat/EquipmentSystem";
import { CombatSystem } from "../combat/CombatSystem";
import { createEnemy } from "../combat/EnemyAI";
import type { Element } from "../combat/types";
export type WorldEvent = {
  type: "sound" | "toast" | "save" | "ending" | "facility";
  text: string;
};
export function createPlayer(x = 360, y = 716): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    w: 34,
    h: 64,
    facing: 1,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    drop: 0,
    dash: 0,
    dashCooldown: 0,
    shotCooldown: 0,
    invulnerable: 2,
    hp: 100,
    energy: 100,
    level: 1,
    xp: 0,
    animation: "Idle",
    animationTime: 0,
  };
}
export class World {
  player = createPlayer();
  battle = newBattle();
  settings = defaultSettings();
  combat = new CombatSystem(this);
  survival = new SurvivalSystem(this);
  colony = new ColonySystem(this);
  space = new SpaceSystem(this);
  extreme = new ExtremeSystem(this);
  classes = new ClassSystem(this);
  omega = new AncientSystem(this);
  civilization = new CivilizationSystem(this);
  get planetId() {
    return this.space.planet;
  }
  get baseRegion() {
    return baseForPlanet(this.planetId);
  }
  get isColonyRegion() {
    return this.region === this.baseRegion;
  }
  get deposits() {
    if (this.planetId === "omega") return ancientDeposits;
    return extremeIds.includes(this.planetId as ExtremePlanet)
      ? extremeDeposits(this.planetId)
      : this.planetId === "ares"
        ? aresDeposits
        : deposits;
  }
  get levelCap() {
    return Math.max(
      this.omega.state.visited ? 100 : 0,
      this.space.state.launched ? 30 : 15,
      ...extremeIds
        .filter((id) => this.space.state.planets[id])
        .map((id) => extremePlanets[id].level),
    );
  }
  get stats() {
    const stats = EquipmentSystem.stats(this.player.level, this.battle);
    stats.defense += this.survival.resistance.defense;
    if (this.survival.state.equipped.includes("advanced")) stats.regen += 2;
    const weapon = this.combat.weapons.id,
      gear = this.battle.gear.find(
        (g) =>
          g.id ===
          this.battle.equipment[
            this.battle.activeSlot === 0 ? "primary" : "secondary"
          ],
      );
    if (
      this.survival.state.technologies.includes("melee") &&
      ["blade", "hammer"].includes(weapon) &&
      gear?.template.includes("_mk")
    )
      stats.attack *= 1.05;
    return this.omega.applyStats(this.classes.applyStats(stats));
  }
  region: RegionId = "crash";
  progress: Progress = newProgress();
  inventory: Inventory = { medkit: 2 };
  enemies: Enemy[] = [];
  bullets: Bullet[] = Array.from({ length: 64 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    life: 0,
    damage: 0,
  }));
  particles: Particle[] = Array.from({ length: 180 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    color: "",
    size: 0,
  }));
  drops: Drop[] = [];
  texts: FloatingText[] = [];
  cooldowns: Record<string, number> = {};
  events: WorldEvent[] = [];
  mining: { node: Resource; elapsed: number } | null = null;
  camera = { x: 0, y: 170, shake: 0 };
  time = 0;
  dead = 0;
  transition = 0;
  regionNotice = 5;
  safe = { x: 360, y: 716 };
  private buffered: Partial<InputFrame> = {};
  private autosave = 0;
  private moved = false;
  constructor(save?: SaveData) {
    if (save) {
      if (save.ancient) this.omega.state = structuredClone(save.ancient);
      if (save.space) this.space.state = structuredClone(save.space);
      this.extreme.initialize(save.extreme);
      this.colony.state = structuredClone(save.colony);
      this.battle = structuredClone(save.battle);
      this.survival.state = structuredClone(save.survival);
      this.cooldowns = { ...save.survival.miningCooldowns };
      this.settings = { ...save.settings };
      this.region = save.region;
      this.player = createPlayer(save.x, save.y);
      Object.assign(this.player, {
        level: save.level,
        xp: save.xp,
        hp: save.hp || maxHp(save.level),
        energy: save.energy,
      });
      this.classes.initialize(save.classes);
      this.inventory = structuredClone(save.inventory);
      this.progress = structuredClone(save.progress);
      if (save.hp === 0) {
        this.region = this.progress.checkpoint.region;
        this.player.x = this.progress.checkpoint.x;
        this.player.y = 716;
        this.player.hp = this.stats.hp;
        this.player.invulnerable = 4;
      }
      this.colony.invalidate();
      this.ensureSafePosition();
    }
    this.safe = { x: this.player.x, y: this.player.y };
    this.spawnEnemies();
    this.combat.unlock();
    this.colony.initialize();
    this.space.initialize(save?.space);

    this.civilization.initialize(
      save?.civilization,
      save?.savedAt ?? Date.now(),
    );
    if (!["crash", "forest", "valley"].includes(this.region)) {
      this.player.x = this.map.spawn;
      this.player.y = 716;
      this.survival.environment.grace = 12;
      this.survival.state.oxygen = this.survival.oxygen.maximum;
      this.safe = { x: this.player.x, y: this.player.y };
    }
    this.camera.x = Math.max(0, this.player.x - 500);
  }
  get map() {
    const source = regions[this.region];
    const map = {
      ...source,
      platforms: [
        ...source.platforms,
        ...this.extreme.combat.platforms,
        ...this.omega.combat.platforms,
        ...this.extreme.physics.extraPlatforms,
      ],
    };
    if (this.isColonyRegion && this.colony.unlocked)
      return {
        ...map,
        width: BASE_END + 240,
        platforms: [...map.platforms, ...this.colony.platforms],
        landmarks:
          this.planetId !== "eden"
            ? map.landmarks
            : [
                ...map.landmarks,
                {
                  id: "colony-forest",
                  kind: "portal" as const,
                  x: 3100,
                  y: 780,
                  label: "발광 숲으로 이동",
                  target: "forest" as const,
                },
              ],
      };
    return map;
  }
  emit(type: WorldEvent["type"], text: string) {
    this.events.push({ type, text });
  }
  toast(text: string) {
    this.emit("toast", text);
  }
  sound(name: string) {
    this.emit("sound", name);
  }
  ensureSafePosition() {
    const p = this.player;
    const surface = this.map.platforms.find(
      (t) =>
        p.x >= t.x && p.x + p.w <= t.x + t.w && Math.abs(p.y + p.h - t.y) < 4,
    );
    if (!surface) {
      p.x = this.map.spawn;
      p.y = 716;
    }
  }
  spawnEnemies() {
    this.enemies = this.map.enemies.map((e, id) =>
      createEnemy(e.kind, e.x, e.y, id, e.elite, this.settings.difficulty),
    );
  }
  count(key: string, n = 1) {
    this.progress.counters[key] = (this.progress.counters[key] ?? 0) + n;
    this.checkQuests();
  }
  checkQuests() {
    while (this.progress.quest < questData.length) {
      const q = questData[this.progress.quest];
      if (!q.goals.every(([id, , n]) => (this.progress.counters[id] ?? 0) >= n))
        break;
      this.progress.quest++;
      this.survival.state.researchPoints += 2;
      this.addXp(q.xp);
      this.toast(`임무 완료 · ${q.name}  +${q.xp} XP`);
      this.sound("quest");
      this.emit("save", "quest");
      if (
        this.progress.quest === 4 ||
        this.progress.quest === 10 ||
        this.progress.quest === 18 ||
        this.progress.quest === 28
      )
        this.emit(
          "ending",
          "이 행성에는 우리가 생각했던 것보다 훨씬 오래된 비밀이 존재한다.",
        );
    }
  }
  addXp(amount: number) {
    const p = this.player;
    if (p.level >= this.levelCap) {
      if (p.level === 100 && this.classes.state.classId) {
        const id = this.classes.state.classId;
        this.classes.state.mastery[id] = Math.min(
          4000,
          (this.classes.state.mastery[id] ?? 0) + Math.floor(amount / 50),
        );
      }
      return;
    }
    p.xp += amount;
    while (p.level < this.levelCap && p.xp >= xpRequired(p.level)) {
      p.xp -= xpRequired(p.level);
      p.level++;
      this.combat.unlock();
      this.classes.sync();
      p.hp = this.stats.hp;
      this.burst(p.x + 17, p.y + 30, "#e8df98", 40);
      this.toast(`LEVEL UP · 탐험가 Lv.${p.level}`);
      this.sound("level");
      this.emit("save", "level");
    }
    if (p.level === this.levelCap) p.xp = 0;
  }
  collect(item: ItemId, count: number) {
    const next = { ...this.inventory };
    if (
      !addItem(next, item, count, this.survival.state.capacity) ||
      occupiedSlots(next) + this.battle.gear.length >
        this.survival.state.capacity
    ) {
      this.toast(
        "인벤토리가 가득 찼습니다. 회복 키트를 사용해 공간을 확보하세요.",
      );
      return false;
    }
    this.inventory = next;
    this.survival.discovery.resource(item);
    this.count(item, count);
    this.toast(`${items[item].name} +${count}`);
    this.sound("pickup");
    return true;
  }
  burst(x: number, y: number, color: string, n = 12) {
    for (let i = 0; i < n; i++) {
      const p = this.particles.find((p) => !p.active);
      if (!p) break;
      const angle = Math.random() * Math.PI * 2,
        speed = 25 + Math.random() * 130;
      Object.assign(p, {
        active: true,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.3 + Math.random() * 0.6,
        max: 0.9,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }
  damage(amount: number, fromX: number, element: Element = "physical") {
    if (this.player.invulnerable <= 0) this.extreme.vehicles.damage(amount);
    const p = this.player;
    if (p.invulnerable > 0 || this.dead > 0 || this.combat.training) return;
    const actual = this.combat.receive(amount, element, fromX !== p.x);
    this.mining = null;
    if (this.omega.endgame.original)
      this.omega.endgame.damage += Math.min(p.hp, actual);
    p.hp = Math.max(0, p.hp - actual);
    p.invulnerable = 1.1;
    p.vx =
      (p.x < fromX ? -1 : 1) *
      (this.classes.state.classId === "guardian" ? 140 : 280);
    p.vy = -150;
    p.animation = "Hit";
    p.animationTime = 0.25;
    this.camera.shake = 7;
    this.sound("hit");
    this.burst(p.x + 17, p.y + 32, "#ffad99");
    this.texts.push({
      x: p.x,
      y: p.y,
      text: `−${actual}`,
      color: "#ffb29c",
      life: 1,
    });
    if (p.hp === 0) {
      this.classes.clearEffects();
      this.combat.reset();
      this.dead = 2.8;
      p.animation = "Death";
      this.sound("death");
      this.mining = null;
    }
  }
  respawn() {
    const { region, x } = this.progress.checkpoint;
    this.enterRegion(region, x);
    this.player.hp = this.stats.hp;
    this.player.energy = this.stats.energy;
    this.player.invulnerable = 4;
    this.survival.state.oxygen = this.survival.oxygen.maximum;
    this.survival.state.exposure = { toxic: 0, radiation: 0, unstable: 0 };
    this.survival.environment.grace = 12;
    this.dead = 0;
    this.toast("회복 지점에서 깨어났습니다 · 자원과 경험치는 유지됩니다.");
    this.emit("save", "respawn");
  }
  enterRegion(id: RegionId, x?: number) {
    if (this.extreme.state.vehicle) this.extreme.state.vehicle.mounted = false;
    this.classes.clearEffects();
    this.combat.reset();
    this.survival.sentinel.abort();
    this.space.combat.abort();
    this.extreme.combat.abort();
    this.omega.combat.abort();
    this.survival.environment.grace = 8;
    this.region = id;
    const p = this.player;
    p.x = x ?? regions[id].spawn;
    p.y = 716;
    p.vx = 0;
    p.vy = 0;
    p.invulnerable = 2;
    p.grounded = false;
    p.dash = 0;
    p.drop = 0;
    this.ensureSafePosition();
    this.safe = { x: p.x, y: p.y };
    this.camera.x = Math.max(0, p.x - 500);
    this.camera.y = 170;
    this.spawnEnemies();
    this.bullets.forEach((b) => (b.active = false));
    this.particles.forEach((p) => (p.active = false));
    this.texts = [];
    this.drops = [];
    this.mining = null;
    this.transition = 0.65;
    this.regionNotice = 4.5;
    if (!this.progress.discovered.includes(id)) {
      this.progress.discovered.push(id);
      this.survival.discovery.record("지역 발견 · " + regions[id].name, 4);
      this.addXp(25);
      this.count(id);
      this.toast(`새로운 지역 발견 · ${regions[id].name} +25 XP`);
    }
    if (
      id === "crash" &&
      this.battle.bossKills > 0 &&
      !this.progress.counters.returnCamp
    )
      this.count("returnCamp");
    if (
      id === "crash" &&
      this.survival.state.sentinelKills > 0 &&
      !this.progress.counters.returnFrontier
    )
      this.count("returnFrontier");
    this.emit("save", "region");
  }
  nearby() {
    const p = this.player,
      cx = p.x + p.w / 2,
      cy = p.y + p.h;
    const candidates = [
      ...this.map.resources
        .filter((n) => !(this.cooldowns[n.id] > 0))
        .map((n) => ({
          id: n.id,
          label: `${items[n.item].name} 채집`,
          x: n.x,
          y: n.y,
          node: n,
        })),
      ...this.map.landmarks
        .filter(
          (l) => l.kind !== "chest" || !this.progress.opened.includes(l.id),
        )
        .map((l) => ({
          id: l.id,
          label:
            l.kind === "portal" && l.target
              ? l.label +
                " · " +
                environments[regionEnvironment(l.target, 1200, 716)].hint
              : l.label,
          x: l.x,
          y: l.y,
          landmark: l,
        })),
    ];
    return candidates
      .filter((n) => Math.abs(n.y - cy) < 75 && Math.abs(n.x - cx) < 95)
      .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
  }
  interact() {
    if (this.isColonyRegion && this.colony.state.enabled) {
      const b = this.colony.state.buildings.find(
        (b) =>
          !b.legacy &&
          Math.abs(b.x + 60 - this.player.x) < 100 &&
          Math.abs(b.y - this.player.y - 64) < 100,
      );
      if (b) {
        this.colony.selected = b.id;
        this.emit("facility", "colony");
        return;
      }
    }
    if (this.mining) return;
    const target = this.nearby();
    if (!target) return;
    if (this.combat.training) {
      if (target.id === "training") this.combat.endTraining();
      return;
    }
    if ("node" in target) {
      this.survival.mining.start(target.node);
      return;
    }
    const l = target.landmark;
    if (l.id.startsWith("nexus-zone-")) {
      this.emit("facility", "civilization");
      return;
    }
    if (this.omega.interact(l)) return;
    if (this.extreme.interact(l)) return;
    if (this.space.interact(l)) return;
    if (this.survival.interact(l)) return;
    if (l.kind === "training") {
      this.combat.startTraining();
      return;
    }
    if (l.kind === "boss") {
      this.combat.boss.start();
      return;
    }
    if (
      l.id === "beacon" &&
      this.progress.counters.titanCore &&
      !this.progress.counters.coreAnalysis
    ) {
      this.count("coreAnalysis");
      this.battle.story.push("coreAnalysis");
      this.toast("타이탄 코어 분석 완료 · 고대 에너지 변환 프로토콜 확보");
      this.emit("save", "analysis");
      return;
    }
    if (
      l.id === "ship" &&
      this.progress.counters.coreAnalysis &&
      !this.progress.counters.engine
    ) {
      this.count("engine");
      this.battle.story.push("engine");
      this.toast(
        "동력 장치 분석 완료 · 정제·제작을 통한 새로운 개척이 필요합니다.",
      );
      this.emit("save", "engine");
      return;
    }
    if (l.kind === "heal") {
      this.survival.state.oxygen = this.survival.oxygen.maximum;
      this.survival.state.exposure = { toxic: 0, radiation: 0, unstable: 0 };
      this.player.hp = this.stats.hp;
      this.player.energy = this.stats.energy;
      this.progress.checkpoint = { region: this.region, x: l.x };
      this.emit("save", "checkpoint");
      this.toast("회복 완료 · 이곳에 귀환 신호를 남겼습니다.");
      this.burst(l.x, l.y - 40, "#b5f4d4", 20);
      this.sound("heal");
    } else if (l.kind === "chest") {
      if (this.collect("medkit", 2)) {
        this.progress.opened.push(l.id);
        this.addXp(15);
        this.combat.loot.place(
          l.x,
          l.y - 30,
          undefined,
          1,
          this.combat.loot.gear("uncommon"),
        );
        this.emit("save", "chest");
      }
    } else {
      if (!this.progress.counters[l.id]) {
        this.count(l.id);
        this.addXp(10);
        this.burst(l.x, l.y - 50, "#a1ebef", 15);
        this.emit("save", "discovery");
      }
      this.toast(
        l.kind === "ship"
          ? "ASTRA-01 · 선체 손상. 생존 캡슐과 통신 장치를 확인하세요."
          : l.kind === "capsule"
            ? "생존 캡슐 활성화 · 당신의 생체 신호가 기록되었습니다."
            : l.kind === "beacon"
              ? "통신 장치 · 잔해 3개와 에너지 결정 3개가 필요합니다."
              : "고대의 문은 잠겨 있습니다. 저 너머에서 알 수 없는 신호가 감지됩니다.",
      );
      this.sound("ui");
    }
  }
  heal() {
    if (this.combat.training) {
      this.player.hp = this.stats.hp;
      return;
    }
    if (this.player.hp >= this.stats.hp) {
      this.toast("체력이 이미 가득 찼습니다.");
      return;
    }
    if (!this.inventory.medkit) {
      this.toast("회복 키트가 없습니다. 회복 지점을 찾아보세요.");
      return;
    }
    this.inventory.medkit--;
    this.player.hp = Math.min(this.stats.hp, this.player.hp + 50);
    this.sound("heal");
    this.burst(this.player.x, this.player.y, "#b1f3bd");
    this.toast("체력 +50");
  }
  update(dt: number, input: InputFrame) {
    dt = Math.min(dt, 0.1);
    if (this.omega.endgame.update(dt, input)) return;
    this.time += dt;
    this.colony.tick(dt);
    this.survival.production.tick(dt);
    this.space.tick(dt, input);
    this.civilization.tick(dt);
    if (this.space.state.trip) return;
    this.transition = Math.max(0, this.transition - dt);
    this.regionNotice = Math.max(0, this.regionNotice - dt);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 25);
    if (this.dead > 0) {
      this.dead -= dt;
      this.player.animation = "Death";
      if (this.dead <= 0) this.respawn();
      this.effects(dt);
      return;
    }
    if (this.omega.update(dt, input)) return;
    this.combat.tickEffects(dt);
    if (this.combat.boss.intro > 0) {
      this.combat.boss.update(dt);
      this.effects(dt);
      return;
    }
    if (this.combat.hitStop > 0) {
      for (const key of [
        "jump",
        "dash",
        "interact",
        "heal",
        "special",
      ] as const)
        if (input[key]) this.buffered[key] = true;
      if (input.weaponSlot !== undefined)
        this.buffered.weaponSlot = input.weaponSlot;
      if (input.skillSlot !== undefined)
        this.buffered.skillSlot = input.skillSlot;
      this.effects(dt);
      return;
    }
    input = { ...input, ...this.buffered };
    this.buffered = {};
    this.survival.update(dt, input);
    this.extreme.update(dt, input);
    if (this.dead > 0) return;
    this.classes.update(dt, input);
    this.combat.beforeMovement(dt, input);
    const p = this.player;
    if (input.interact) this.interact();
    if (input.heal) this.heal();
    if (input.left || input.right) this.moved = true;
    if (input.jump && this.moved && !this.progress.counters.move)
      this.count("move");
    let remaining = dt,
      first = true;
    while (remaining > 0) {
      const step = Math.min(remaining, MAX_STEP);
      this.extreme.physics.beforeStep(step, input);
      const landed = movePlayer(
        p,
        {
          ...input,
          jump: first && input.jump && !this.extreme.physics.swimming,
          down: this.extreme.physics.swimming ? false : input.down,
          jumpHeld:
            this.extreme.physics.swimming ||
            input.jumpHeld ||
            this.combat.skills.liftTime > 0,
          dash: first && input.dash,
        },
        step,
        this.map.platforms,
        this.extreme.physics.swimming ? 0 : this.space.gravity,
        {
          speed:
            this.stats.moveSpeed *
            this.combat.weapons.movement(input) *
            this.extreme.physics.speedFactor,
          swimming: this.extreme.physics.swimming,
          airControl: this.extreme.physics.airControl,
          energy: this.stats.energy,
          regen: this.stats.regen,
          friction: this.extreme.friction,
          jumpSpeed: this.extreme.physics.jumpSpeed,
        },
      );
      this.extreme.physics.afterStep();
      if (landed) {
        p.animation = "Land";
        p.animationTime = 0.13;
        this.burst(p.x + 17, p.y + p.h, "#b7d3b8", 7);
        this.sound("land");
        this.camera.shake = 1.5;
      }
      first = false;
      remaining -= step;
    }
    p.x = Math.max(0, Math.min(this.map.width - p.w, p.x));
    if (p.grounded) this.safe = { x: p.x, y: p.y };
    if (p.y > (this.planetId === "aquaria" ? 2900 : 1100)) {
      p.invulnerable = 0;
      this.damage(1000, p.x);
    }
    p.animationTime = Math.max(0, p.animationTime - dt);
    if (p.animationTime <= 0)
      p.animation = this.extreme.physics.swimming
        ? "Swim"
        : p.dash > 0
          ? "Dash"
          : !p.grounded
            ? p.vy < 0
              ? "Jump"
              : "Fall"
            : Math.abs(p.vx) > 200
              ? "Run"
              : Math.abs(p.vx) > 15
                ? "Walk"
                : "Idle";
    if (p.dash > 0) {
      this.burst(p.x + 17, p.y + 40, "#77e5df", 2);
      if (input.dash) this.sound("dash");
    }
    this.survival.mining.update(dt, input);
    for (const id in this.cooldowns)
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
    this.combat.update(dt, input);
    this.effects(dt);
    const targetX = this.extreme.combat.boss
      ? Math.max(0, this.map.width - 1500)
      : this.combat.boss.active || this.survival.sentinel.active
        ? this.map.width - 1280
        : Math.max(
            0,
            Math.min(this.map.width - 1280, p.x - 600 + p.facing * 100),
          );
    const targetY = Math.max(
      0,
      Math.min(this.planetId === "aquaria" ? 2200 : 350, p.y - 490),
    );
    const ease = 1 - Math.exp(-dt * 5 * (this.settings.cameraSpeed ?? 1));
    this.camera.x += (targetX - this.camera.x) * ease;
    this.camera.y += (targetY - this.camera.y) * ease;
    const index = regionOrder.indexOf(this.region);
    if (
      p.x > this.map.width - p.w - 5 &&
      index < 2 &&
      !(index === 0 && this.colony.unlocked)
    )
      this.enterRegion(regionOrder[index + 1]);
    else if (p.x < 3 && index > 0 && index < 3)
      this.enterRegion(
        regionOrder[index - 1],
        regions[regionOrder[index - 1]].width - 110,
      );
    this.autosave += dt;
    if (this.autosave > 15) {
      this.autosave = 0;
      this.emit("save", "auto");
    }
  }
  private effects(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
    }
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= dt * 30;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
  snapshot(settings: Settings): SaveData {
    if (this.omega.endgame.original)
      return structuredClone(this.omega.endgame.original);
    if (this.classes.trialReturn)
      return structuredClone(this.classes.trialReturn);
    this.classes.sync();
    return {
      version: 9,
      civilization: structuredClone(this.civilization.state),
      ancient: structuredClone(this.omega.state),
      classes: structuredClone(this.classes.state),
      extreme: structuredClone(this.extreme.state),
      space: this.space.snapshot(),
      colony: structuredClone(this.colony.state),
      survival: {
        ...structuredClone(this.survival.state),
        miningCooldowns: { ...this.cooldowns },
      },
      battle: {
        ...structuredClone(this.battle),
        ...(this.combat.training
          ? { skillSlots: [...this.combat.training.skillSlots] }
          : {}),
      },
      savedAt: Date.now(),
      region: this.region,
      x:
        this.combat.training?.x ??
        (this.combat.boss.active ? 3820 : this.safe.x),
      y:
        this.combat.training?.y ??
        (this.combat.boss.active ? 716 : this.safe.y),
      level: this.player.level,
      xp: this.player.xp,
      hp: this.combat.training?.hp ?? this.player.hp,
      energy: this.combat.training?.energy ?? this.player.energy,
      inventory: structuredClone(this.inventory),
      progress: structuredClone(this.progress),
      settings: { ...settings },
    };
  }
}
