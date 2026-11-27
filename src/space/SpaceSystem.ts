import { extremePlanets, type ExtremePlanet } from "../extreme/catalog";
import type { World } from "../core/world";
import type { InputFrame } from "../core/types";
import { items, type ItemId, type Landmark } from "../data/content";
import { ColonySystem } from "../colony/ColonySystem";
import { newColony } from "../colony/types";
import { newSurvival } from "../survival/types";
import { StorageSystem } from "../survival/StorageSystem";
import { occupiedSlots } from "../systems/inventory";
import { newSpace, type SpaceSave, type LocalSave } from "./types";
import {
  planetIds,
  baseForPlanet,
  planetForRegion,
  shipSystems,
  upgrades,
  type PlanetId,
  type ShipSystemId,
  type ShipUpgrade,
} from "./catalog";
import { SpaceCombat } from "./SpaceCombat";
const localKeys = [
  "warehouse",
  "facilities",
  "jobs",
  "lastClock",
  "miningCooldowns",
  "beacon",
] as const;
export class SpaceSystem {
  state = newSpace();
  systems: Partial<Record<PlanetId, ColonySystem>> = {};
  combat: SpaceCombat;
  private damageClock = 0;
  constructor(private w: World) {
    this.combat = new SpaceCombat(w);
  }
  get planet() {
    return ["ship", "station"].includes(this.w.region)
      ? this.state.location
      : planetForRegion(this.w.region);
  }
  get gravity() {
    if (this.w.region === "station") return 0.9;
    if (this.planet === "omega") return this.w.omega.gravity;
    return (
      extremePlanets[this.planet as ExtremePlanet]?.gravity ??
      (this.planet === "ares" ? 0.65 : 0.9)
    );
  }
  get capacity() {
    return this.w.civilization?.state.odyssey
      ? 600
      : this.w.extreme.state.horizon
        ? 320
        : this.state.upgrades.includes("cargo")
          ? 160
          : 80;
  }
  protectedBy(kind: string) {
    return (
      this.w.isColonyRegion &&
      this.w.colony.state.buildings.some(
        (b) =>
          b.kind === kind &&
          this.w.colony.statuses.get(b.id)?.powered &&
          Math.abs(b.x + 80 - this.w.player.x) < 260 &&
          Math.abs(b.y - this.w.player.y) < 260,
      )
    );
  }
  get storm() {
    return (
      this.planet === "ares" &&
      !["ship", "station"].includes(this.w.region) &&
      this.state.weather >= 100 &&
      !this.protectedBy("dustShield")
    );
  }
  get ready() {
    return this.state.repaired.length === 7;
  }
  get docked() {
    return (
      this.w.region === "ship" ||
      (this.w.isColonyRegion && this.w.player.x < 700)
    );
  }
  get fuelCost() {
    return this.state.upgrades.includes("propulsion") ? 12 : 15;
  }
  capture() {
    const w = this.w;
    const local = {} as LocalSave;
    for (const k of localKeys)
      Object.assign(local, { [k]: w.survival.state[k] });
    local.miningCooldowns = { ...w.cooldowns };
    this.state.planets[this.state.location] = {
      colony: w.colony.state,
      local,
      visited: true,
    };
    this.systems[this.state.location] = w.colony;
  }
  initialize(save?: SpaceSave) {
    if (save) this.state = structuredClone(save);
    this.capture();
    for (const id of planetIds) {
      if (id === this.state.location) continue;
      const p = this.state.planets[id];
      if (p) {
        const c = new ColonySystem(this.w);
        c.state = p.colony;
        this.systems[id] = c;
        this.withPlanet(id, () => {
          c.initialize();
        });
      }
    }
  }
  withPlanet<T>(id: PlanetId, fn: () => T): T {
    this.capture();
    const w = this.w,
      original = this.state.location,
      region = w.region,
      old = this.state.planets[original]!,
      checkpoint = w.progress.checkpoint;
    const next = this.state.planets[id];
    if (!next) throw new Error("Unvisited planet");
    this.state.location = id;
    w.region = baseForPlanet(id);
    w.colony = this.systems[id]!;
    Object.assign(w.survival.state, next.local);
    w.cooldowns = next.local.miningCooldowns;
    try {
      return fn();
    } finally {
      this.capture();
      this.state.location = original;
      w.colony = this.systems[original]!;
      Object.assign(w.survival.state, old.local);
      w.cooldowns = old.local.miningCooldowns;
      w.region = region;
      w.progress.checkpoint = checkpoint;
    }
  }
  inspect() {
    const w = this.w;
    if (!this.docked) return false;
    for (const [id, d] of Object.entries(shipSystems) as [
      ShipSystemId,
      (typeof shipSystems)[ShipSystemId],
    ][]) {
      if (
        d.part &&
        w.colony.state.ship.includes(d.part) &&
        (id !== "core" || w.colony.state.coreAnalyzed)
      )
        this.markRepair(id);
    }
    this.once("shipSurvey");
    w.emit("save", "ship-survey");
    return true;
  }
  once(key: string) {
    if (!this.w.progress.counters[key]) this.w.count(key);
  }
  markRepair(id: ShipSystemId) {
    if (!this.state.repaired.includes(id)) {
      this.state.repaired.push(id);
      this.once("repair_" + id);
      this.once("shipRepair");
    }
    if (this.ready) this.once("shipReadyFlight");
  }
  repair(id: ShipSystemId) {
    const w = this.w;
    if (
      !this.docked ||
      !Object.hasOwn(shipSystems, id) ||
      this.state.repaired.includes(id)
    )
      return false;
    if (!w.survival.state.technologies.includes("shipEngineering"))
      return this.fail("기초 우주선 수리를 먼저 연구하세요.");
    if (!w.survival.storage.spend(shipSystems[id].cost))
      return this.fail("수리 재료가 부족합니다.");
    this.markRepair(id);
    w.sound("craft");
    w.emit("save", "repair");
    return true;
  }
  fail(text: string) {
    this.w.toast(text);
    return false;
  }
  board() {
    if (!this.docked || this.state.trip || this.w.dead) return false;
    this.inspect();
    this.w.enterRegion(
      this.w.region === "ship" ? baseForPlanet(this.state.location) : "ship",
      360,
    );
    return true;
  }
  refuel() {
    if (!this.docked || this.state.trip) return false;
    const n = Math.min(
      100 - this.state.fuel,
      this.w.survival.storage.available("shipFuel"),
    );
    if (n <= 0 || !this.w.survival.storage.spend({ shipFuel: n }))
      return this.fail("항해 연료가 필요합니다.");
    this.state.fuel += n;
    this.once("shipFueled");
    this.w.emit("save", "fuel");
    return true;
  }
  costFor(to: PlanetId) {
    const base =
      to === "omega" || this.state.location === "omega"
        ? 50
        : (to === "eden" && this.state.location === "ares") ||
            (to === "ares" && this.state.location === "eden")
          ? 15
          : (to === "frostia" && this.state.location === "eden") ||
              (to === "eden" && this.state.location === "frostia")
            ? 35
            : Math.max(
                extremePlanets[to as ExtremePlanet]?.fuel ?? 15,
                extremePlanets[this.state.location as ExtremePlanet]?.fuel ??
                  15,
              );
    return Math.ceil(
      base *
        (this.w.civilization.state.odyssey ? 0.75 : 1) *
        (this.state.upgrades.includes("propulsion") ? 0.8 : 1) *
        (this.w.colony.state.buildings.some(
          (b) =>
            b.kind === "advancedNav" &&
            this.w.colony.statuses.get(b.id)?.powered,
        )
          ? 0.8
          : 1),
    );
  }
  reason(to: PlanetId, ascent = false) {
    if (to === "omega") {
      const why = this.w.omega.entryReason();
      if (why) return why;
    }
    const p = extremePlanets[to as ExtremePlanet];
    if (p) {
      if (!p.available) return "후속 항해 준비 중";
      if (to !== "frostia" && !this.w.extreme.state.horizon)
        return "HORIZON 선체 업그레이드 필요";
      if (!this.w.survival.state.technologies.includes(p.tech))
        return "선행 연구: " + p.tech;
      if (
        !(
          this.w.survival.state.equipped.includes(p.gear as never) ||
          (to === "aquaria" &&
            this.w.survival.state.equipped.includes("deepPressureSuit")) ||
          this.w.survival.state.equipped.includes("universalSuit3")
        ) ||
        this.w.survival.resistance.oxygen < 100
      )
        return "환경 탐험복과 산소 장비를 장착하세요.";
    }
    if (this.state.trip) return "항해 중";
    if (this.w.region !== "ship") return "우주선에 먼저 탑승하세요.";
    if (!this.ready) return "7개 시스템을 모두 복구하세요.";
    if (!ascent && !this.state.launched) return "첫 이륙을 완료하세요.";
    if (!ascent && to === this.state.location) return "현재 정박 행성";
    if (this.state.fuel < (ascent ? 5 : this.costFor(to))) return "연료 부족";
    if (
      to === "ares" &&
      (!this.w.survival.state.equipped.includes("dustHelmet") ||
        this.w.survival.resistance.oxygen < 100)
    )
      return "방진 헬멧과 산소 공급 장비를 장착하세요.";
    return "";
  }
  launch(to: PlanetId, ascent = false) {
    if (!planetIds.includes(to) || (ascent && this.state.launched))
      return false;
    const why = this.reason(to, ascent);
    if (why) return this.fail(why);
    const cost = ascent ? 5 : this.costFor(to);
    this.state.fuel -= cost;
    this.state.trip = {
      id: ++this.state.serial,
      from: this.state.location,
      to,
      kind: ascent ? "ascent" : "voyage",
      cost,
      remaining: ascent
        ? 20
        : this.w.extreme.state.horizon ||
            this.state.upgrades.includes("navigation")
          ? 5
          : 8,
    };
    this.w.sound("launch");
    this.w.emit("save", "departure");
    return true;
  }
  arrive() {
    const trip = this.state.trip;
    if (!trip) return;
    this.state.trip = null;
    this.state.launched = true;
    if (trip.kind === "ascent") {
      this.once("firstAscent");
      this.w.toast("EDEN 궤도 도달 · 항성계 항해를 사용할 수 있습니다.");
    } else {
      this.switchPlanet(trip.to);
      this.once("land_" + trip.to);
      if (trip.to === "omega") this.w.omega.arrive();
      if (trip.to === "ares") {
        this.once("desertPrepared");
        if (!this.state.emergencyClaimed) {
          this.state.emergencyClaimed = true;
          this.state.fuel = Math.min(100, this.state.fuel + 15);
          this.w.toast(
            "최초 착륙 비상 귀환 연료 +15 · 이후 현지 결정과 붉은 철로 연료 제작",
          );
        }
      } else if (trip.to === "eden") this.once("returnEden");
    }
    this.w.emit("save", "arrival");
  }
  switchPlanet(id: PlanetId) {
    this.capture();
    const w = this.w;
    if (!this.state.planets[id]) {
      const c = new ColonySystem(w);
      c.state = newColony();
      c.state.id = id + "-sector-01";
      c.state.name = id.toUpperCase() + " · SECTOR 01";
      c.state.technologies = [...w.colony.state.technologies];
      this.systems[id] = c;
      const s = newSurvival();
      this.state.planets[id] = {
        colony: c.state,
        local: {
          warehouse: {},
          facilities: s.facilities,
          jobs: [],
          lastClock: Date.now(),
          miningCooldowns: {},
          beacon: null,
        },
        visited: true,
      };
    }
    const p = this.state.planets[id]!;
    this.state.location = id;
    w.colony = this.systems[id]!;
    Object.assign(w.survival.state, p.local);
    w.cooldowns = { ...p.local.miningCooldowns };
    w.region = baseForPlanet(id);
    w.colony.initialize();
    w.progress.checkpoint = { region: w.region, x: 360 };
    w.enterRegion(w.region, 360);
    this.state.heat = 0;
    w.survival.state.oxygen = w.survival.oxygen.maximum;
    w.survival.environment.grace =
      this.w.extreme.state.horizon || this.state.upgrades.includes("hull")
        ? 20
        : 12;
  }
  transfer(id: ItemId, n: number, toCargo: boolean, warehouse = false) {
    const w = this.w;
    if (
      !this.docked ||
      this.state.trip ||
      !Object.hasOwn(items, id) ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 31680
    )
      return false;
    const source = warehouse ? w.survival.state.warehouse : w.inventory,
      cargo = { ...this.state.cargo },
      bag = { ...source },
      from = toCargo ? bag : cargo,
      to = toCargo ? cargo : bag;
    if ((from[id] ?? 0) < n) return false;
    from[id] = (from[id] ?? 0) - n;
    to[id] = (to[id] ?? 0) + n;
    if (
      occupiedSlots(cargo) > this.capacity ||
      occupiedSlots(bag) >
        (warehouse
          ? w.colony.capacity
          : w.survival.state.capacity - w.battle.gear.length)
    )
      return this.fail("목적지 보관 공간이 부족합니다.");
    this.state.cargo = cargo;
    if (warehouse) w.survival.state.warehouse = bag;
    else w.inventory = bag;
    if (
      toCargo &&
      this.planet === "ares" &&
      ["redIron", "cobalt", "pureTitanium", "heatAlloy"].includes(id)
    )
      this.once("aresCargo");
    if (!toCargo && this.planet === "eden" && w.progress.counters.aresCargo)
      this.once("cargoDelivered");
    w.emit("save", "cargo");
    return true;
  }
  upgrade(id: ShipUpgrade) {
    const w = this.w;
    if (
      !this.docked ||
      !Object.hasOwn(upgrades, id) ||
      this.state.upgrades.includes(id) ||
      !w.survival.state.technologies.includes("pathfinder")
    )
      return false;
    if (!w.survival.storage.spend(upgrades[id].cost))
      return this.fail("강화 재료 부족");
    this.state.upgrades.push(id);
    this.once("shipUpgraded");
    w.emit("save", "ship-upgrade");
    return true;
  }
  emergencyFuel() {
    const w = this.w;
    if (!this.docked || this.state.trip) return false;
    const cost =
      this.planet === "omega" || extremePlanets[this.planet as ExtremePlanet]
        ? { [w.deposits[0].item]: 1, [w.deposits[1].item]: 1 }
        : this.planet === "ares"
          ? { desertCrystal: 1, redIron: 1 }
          : { crystal: 1, copper: 1 };
    if (this.state.fuel > 95 || !w.survival.storage.spend(cost))
      return this.fail("연료 공간 또는 현지 광물 부족");
    this.state.fuel += 5;
    this.once("shipFueled");
    w.emit("save", "manual-fuel");
    return true;
  }
  interact(l: Landmark) {
    if (l.id.startsWith("ship-zone-")) {
      this.w.emit("facility", "space");
      return true;
    }
    if (l.kind === "ship" && this.w.colony.unlocked) {
      this.board();
      return true;
    }
    if (l.id === "foundry-archive") {
      this.once("foundryArchive");
      this.w.toast("산업 기록 복구 · 제련소 동쪽에서 거신의 열 신호 발견");
      return true;
    }
    if (l.id === "colossus-arena") {
      this.combat.start();
      return true;
    }
    return false;
  }
  tick(dt: number, input?: InputFrame) {
    const w = this.w;
    if (this.state.trip) {
      this.state.trip.remaining = Math.max(0, this.state.trip.remaining - dt);
      if (!this.state.trip.remaining) this.arrive();
    }
    if (!input) return;
    if (["ship", "station"].includes(w.region)) {
      w.player.hp = Math.min(
        w.stats.hp,
        w.player.hp +
          dt *
            (this.w.extreme.state.horizon ||
            this.state.upgrades.includes("lifeSupport")
              ? 16
              : 8),
      );
      this.state.heat = Math.max(0, this.state.heat - dt * 8);
      return;
    }
    if (this.planet === "ares") {
      const previous = this.state.weather;
      this.state.weather = (previous + dt) % 150;
      if (previous < 90 && this.state.weather >= 90)
        w.toast("모래폭풍 접근 · 10초 후 돌풍, 시야 제한");
      if (input.jump) this.once("aresJump");
      if (input.scan) this.once("aresScan");
      const protectedArea =
        (w.isColonyRegion && w.player.x < 650) ||
        this.protectedBy("thermalRegulator");
      const gear = w.survival.state.equipped;
      const cooling =
        (gear.includes("desertSuit") ? 0.5 : 0) +
        (gear.includes("coolingModule") ? 0.4 : 0);
      this.state.heat = Math.max(
        0,
        Math.min(
          100,
          this.state.heat +
            dt *
              (protectedArea
                ? -10
                : (w.colony.night
                    ? -0.3
                    : w.region === "aresFoundry"
                      ? 1.4
                      : 0.7) *
                  (1 - cooling)),
        ),
      );
      if (this.storm && !protectedArea) {
        const wind = gear.includes("stabilizerBoots") ? 8 : 38;
        w.player.x += Math.sin(w.time * 0.4) * dt * wind;
        for (const b of w.bullets)
          if (b.active && b.element === "physical") b.vx += dt * 45;
      }
      this.damageClock -= dt;
      if (this.state.heat > 80 && this.damageClock <= 0) {
        this.damageClock = 3;
        w.damage(8 + w.stats.defense, w.player.x, "plasma");
      }
      this.combat.update(dt);
    }
  }
  snapshot() {
    this.capture();
    return structuredClone(this.state);
  }
}
