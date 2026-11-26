import type { World } from "../core/world";
import { items, regions, type ItemId, type Platform } from "../data/content";
import { recipes, type Cost, type Facility } from "../survival/catalog";
import { StorageSystem } from "../survival/StorageSystem";
import { occupiedSlots } from "../systems/inventory";
import { createEnemy } from "../combat/EnemyAI";
import {
  definition,
  buildings,
  colonyTech,
  deposits,
  shipParts,
  partNames,
  BASE_END,
  GRID,
  GROUND,
  type BuildingKind,
  type PartId,
} from "./catalog";
import {
  newColony,
  type Building,
  type BuildingStatus,
  type PowerNetwork,
  type Robot,
  type Role,
} from "./types";
export interface AutoRecipe {
  id: string;
  name: string;
  cost: Cost;
  seconds: number;
  item: ItemId;
  count: number;
}
const alive = (b: Building) => b.remaining <= 0 && b.hp > 0 && b.enabled;
const center = (b: Building) => b.x + definition(b.kind).w / 2;
const distance = (a: Building, b: Building) =>
  Math.hypot(center(a) - center(b), a.y - b.y);
const source = (b: Building) =>
  !!definition(b.kind).generation || b.kind === "relay";
const overlaps = (x: number, y: number, w: number, h: number, b: Building) =>
  x < b.x + definition(b.kind).w &&
  x + w > b.x &&
  y - h < b.y &&
  y > b.y - definition(b.kind).h;
export class ColonySystem {
  state = newColony();
  statuses = new Map<number, BuildingStatus>();
  networks: PowerNetwork[] = [];
  selected = 0;
  buildMode = false;
  overlay: "power" | "logistics" | "none" = "power";
  blueprint: BuildingKind | null = "floor";
  demolishing = false;
  view = { x: 3200, y: 160, zoom: 1 };
  pointer = { x: 0, y: 0, inside: false };
  siege: {
    phase: "preparing" | "fighting";
    remaining: number;
    ids: number[];
    origin: number;
  } | null = null;
  lastSiege = "침공 기록 없음";
  offlineReport = "";
  beams: {
    x: number;
    y: number;
    tx: number;
    ty: number;
    life: number;
    color: string;
  }[] = [];
  private dirty = true;
  private clock = 0;
  private saveClock = 0;
  private soundClock = 0;
  private turretSound = 0;
  private networkIds: number[][] = [];
  private expanded: Platform[] = [];
  constructor(private w: World) {}
  get unlocked() {
    return this.state.enabled || this.w.survival.state.blueprint;
  }
  get capacity() {
    return Math.min(
      12000,
      60 +
        this.state.buildings
          .filter(
            (b) =>
              b.remaining <= 0 &&
              ["warehouse", "largeWarehouse"].includes(b.kind),
          )
          .reduce(
            (n, b) =>
              n +
              (definition(b.kind).capacity ?? 0) *
                (b.level - (b.legacy ? 1 : 0)),
            0,
          ),
    );
  }
  get level() {
    const has = (kind: BuildingKind) =>
      this.state.buildings.some((b) => b.kind === kind && alive(b));
    if (
      has("coreGen") &&
      has("port") &&
      this.state.ship.length === 6 &&
      this.state.technologies.includes("navigation")
    )
      return 5;
    if (
      has("medical") &&
      has("greenhouse") &&
      has("analysis") &&
      this.state.settlers.length > 0
    )
      return 4;
    if (
      has("factory") &&
      this.state.technologies.includes("automation") &&
      this.state.buildings.some(
        (b) =>
          b.kind === "crystalGen" &&
          this.statuses.get(b.id)?.powered &&
          (this.w.progress.counters.industryLevel ||
            (b.fuel > 0 &&
              this.networks.some(
                (n) => n.members.includes(b.id) && n.generation >= n.demand,
              ))),
      ) &&
      has("habitat")
    )
      return 3;
    if (has("miner") && has("lab") && has("oxygen") && has("turret")) return 2;
    return 1;
  }
  get night() {
    return this.state.day >= 720;
  }
  get platforms() {
    return this.expanded;
  }
  initialize() {
    if (!this.unlocked) return;
    if (!this.state.enabled) {
      this.state.enabled = true;
      const kinds: Record<Facility, BuildingKind> = {
        terminal: "terminal",
        workbench: "workbench",
        refinery: "refinery",
        research: "lab",
        equipment: "equipment",
        warehouse: "warehouse",
      };
      for (const f of this.w.survival.state.facilities) {
        const l = regions.crash.landmarks.find((l) => l.facility === f);
        if (l)
          this.state.buildings.push(this.make(kinds[f], l.x - 80, 780, true));
      }
      // Once-only construction grant; no unique boss items or quest completions.
      for (const [id, n] of Object.entries({
        ironBar: 20,
        copperBar: 12,
        wafer: 6,
        wovenFiber: 4,
        refinedCell: 4,
      }))
        this.deposit(id as ItemId, n);
      this.w.toast(
        "SECTOR 01 개방 · 건설 자재가 중앙 창고에 도착했습니다. B 건설 / O 관리",
      );
      this.state.lastClock = Date.now();
    }
    if (this.state.siegeWins > 0)
      this.lastSiege = `누적 방어 성공 ${this.state.siegeWins}회 · 기지 안전`;
    this.invalidate();
    this.rebuild();
    this.power(0, false);
  }
  private make(
    kind: BuildingKind,
    x: number,
    y: number,
    legacy = false,
  ): Building {
    const d = definition(kind);
    return {
      id: ++this.state.serial,
      kind,
      x,
      y,
      level: 1,
      hp: d.hp,
      enabled: true,
      remaining: legacy ? 0 : d.seconds,
      age: 0,
      paid: legacy ? {} : { ...d.cost },
      priority:
        d.category === "habitat"
          ? 1
          : d.category === "defense"
            ? 2
            : d.category === "industry" || d.category === "research"
              ? 3
              : 4,
      battery: 0,
      fuel: 0,
      progress: 0,
      recipe: "",
      repeat: true,
      target: 10,
      produced: 0,
      job: null,
      legacy,
    };
  }
  invalidate() {
    this.dirty = true;
    this.expanded = [
      { x: 3200, y: GROUND, w: BASE_END - 3200 + 240, h: 400 },
      ...this.state.buildings
        .filter((b) => b.kind === "floor" && b.remaining <= 0)
        .map((b) => ({
          x: b.x,
          y: b.y,
          w: definition(b.kind).w,
          h: 20,
          oneWay: true,
        })),
    ];
  }
  placement(kind: BuildingKind, x: number, y: number) {
    const d = definition(kind);
    if (!this.unlocked) return "개척 기술 연구와 건설 설계도가 필요합니다.";
    if (this.w.region !== "crash" || this.w.dead > 0 || this.siege)
      return "기지의 평온한 상태에서 건설할 수 있습니다.";
    if (d.tech && !this.state.technologies.includes(d.tech))
      return `${colonyTech[d.tech].name} 연구 필요`;
    if (this.state.buildings.length >= 150) return "건물 한도 150개";
    if (
      x < 40 ||
      x + d.w > BASE_END ||
      y > GROUND ||
      y < 300 ||
      x % GRID !== 0 ||
      (GROUND - y) % GRID !== 0
    )
      return "건설 구역과 격자 안에 배치하세요.";
    if (kind === "terminal") return "생존 터미널은 기존 시설을 사용합니다.";
    if (
      this.state.buildings.some(
        (b) =>
          !(
            ((b.kind === "floor" && kind !== "floor") ||
              (kind === "floor" && b.kind !== "floor")) &&
            b.y === y
          ) && overlaps(x, y, d.w, d.h, b),
      )
    )
      return "다른 시설과 겹칩니다.";
    if (
      regions.crash.landmarks.some(
        (l) =>
          x < l.x + 55 && x + d.w > l.x - 55 && y > l.y - 110 && y - d.h < l.y,
      )
    )
      return "스토리 시설·출입 경로 보호 구역";
    if (
      regions.crash.resources.some(
        (n) =>
          x < n.x + 35 && x + d.w > n.x - 35 && y > n.y - 80 && y - d.h < n.y,
      )
    )
      return "수동 채집 자원 보호 구역";
    if (y !== GROUND) {
      const feet = kind === "floor" ? y + 160 : y;
      const supports = [...regions.crash.platforms, ...this.expanded];
      if (
        !supports.some(
          (p) => Math.abs(p.y - feet) < 1 && x >= p.x && x + d.w <= p.x + p.w,
        )
      )
        return kind === "floor"
          ? "160 높이 아래에 지지 발판이 필요합니다."
          : "바닥 또는 완성된 발판 위에 배치하세요.";
    }
    if (
      kind.startsWith("miner") &&
      !deposits.some(
        (p) =>
          Math.abs(p.x - (x + d.w / 2)) <= 100 &&
          y === GROUND &&
          (kind === "miner2" || p.item !== "titanium"),
      )
    )
      return "지원하는 광물 매장지 위에 배치하세요.";
    const missing = this.w.survival.storage.missing(d.cost);
    if (missing.length) return "재료 부족 · " + missing.join(" / ");
    return "";
  }
  place(kind: BuildingKind, x: number, y: number) {
    const reason = this.placement(kind, x, y);
    if (reason) {
      this.w.toast(reason);
      return false;
    }
    if (!this.w.survival.storage.spend(definition(kind).cost)) return false;
    const b = this.make(kind, x, y);
    this.state.buildings.push(b);
    this.selected = b.id;
    this.invalidate();
    this.w.sound("constructionStart");
    this.changed("construction");
    return true;
  }
  private changed(reason: string) {
    this.w.emit("save", "colony-" + reason);
  }
  private refund(cost: Cost, capacity = this.capacity) {
    const wh = { ...this.w.survival.state.warehouse };
    for (const [id, n] of Object.entries(cost))
      if (!StorageSystem.add(wh, id as ItemId, n!, capacity)) return false;
    this.w.survival.state.warehouse = wh;
    return true;
  }
  demolish(id: number) {
    const b = this.find(id);
    if (!b || b.legacy || this.siege || !this.w.survival.inBase)
      return this.fail(
        "기존 필수 시설은 철거할 수 없습니다. 침공 중에는 철거가 제한됩니다.",
      );
    if (
      b.kind === "floor" &&
      this.state.buildings.some(
        (o) =>
          o.id !== id &&
          o.y <= b.y &&
          o.y >= b.y - 160 &&
          o.x < b.x + 160 &&
          o.x + definition(o.kind).w > b.x,
      )
    )
      return this.fail("위쪽 시설과 발판을 먼저 철거하세요.");
    if (
      this.state.settlers.some((s) => s.home === id || s.assigned === id) ||
      this.state.robots.some((r) => r.station === id)
    )
      return this.fail("거주민·배치 인원·로봇을 먼저 해제하세요.");
    const ratio = b.remaining > 0 || b.age < 15 ? 1 : 0.8,
      refund: Cost = {};
    for (const [k, n] of Object.entries(b.paid))
      refund[k as ItemId] = Math.floor(n! * ratio);
    for (const [k, n] of Object.entries(b.job?.cost ?? {}))
      refund[k as ItemId] = (refund[k as ItemId] ?? 0) + n!;
    const cap =
      this.capacity -
      (["warehouse", "largeWarehouse"].includes(b.kind) && b.remaining <= 0
        ? (definition(b.kind).capacity ?? 0) * (b.level - (b.legacy ? 1 : 0))
        : 0);
    if (
      occupiedSlots(this.w.survival.state.warehouse) > cap ||
      !this.refund(refund, cap)
    )
      return this.fail(
        "환불 또는 축소된 창고 공간이 부족합니다. 자원을 먼저 옮기세요.",
      );
    this.state.buildings = this.state.buildings.filter((o) => o.id !== id);
    this.selected = 0;
    this.invalidate();
    this.changed("demolish");
    return true;
  }
  find(id: number) {
    return this.state.buildings.find((b) => b.id === id);
  }
  private fail(reason: string) {
    this.w.toast(reason);
    return false;
  }
  upgrade(id: number) {
    const b = this.find(id);
    if (!b || b.remaining > 0 || b.level >= 3 || !this.w.survival.inBase)
      return false;
    if (
      !this.state.technologies.includes(
        b.level === 1 ? "automation" : "advanced",
      )
    )
      return this.fail("산업 자동화 / 첨단 개척 연구가 필요합니다.");
    const cost = { ironBar: b.level * 3, electronics: b.level };
    if (!this.w.survival.storage.spend(cost))
      return this.fail("업그레이드 자재 부족");
    for (const [k, n] of Object.entries(cost))
      b.paid[k as ItemId] = (b.paid[k as ItemId] ?? 0) + n;
    b.level++;
    b.hp += definition(b.kind).hp * 0.5;
    this.invalidate();
    this.changed("upgrade");
    return true;
  }
  repair(id: number) {
    const b = this.find(id);
    if (!b || !this.w.survival.inBase) return false;
    const max = this.maxHp(b);
    if (b.hp >= max) return false;
    if (!this.w.survival.storage.spend({ ironBar: 1 }))
      return this.fail("수리용 철괴 1개 필요");
    b.hp = Math.min(max, b.hp + 300);
    this.invalidate();
    this.changed("repair");
    return true;
  }
  maxHp(b: Building) {
    return definition(b.kind).hp * (1 + (b.level - 1) * 0.5);
  }
  toggle(id: number) {
    const b = this.find(id);
    if (b && b.kind !== "terminal") {
      b.enabled = !b.enabled;
      this.invalidate();
      this.changed("toggle");
    }
  }
  facilityPowered(f: Facility) {
    if (!this.state.enabled || f === "terminal" || f === "warehouse")
      return true;
    const kind = f === "research" ? "lab" : f;
    return this.state.buildings.some(
      (b) => b.kind === kind && this.statuses.get(b.id)?.powered,
    );
  }
  facilitySpeed(f: Facility) {
    if (!this.state.enabled) return 1;
    const kind = f === "research" ? "lab" : f;
    return Math.max(
      1,
      ...this.state.buildings
        .filter((b) => b.kind === kind && this.statuses.get(b.id)?.powered)
        .map((b) => 1 + (b.level - 1) * 0.3),
    );
  }
  projectedFlows() {
    const flows: Partial<Record<ItemId, { input: number; output: number }>> =
      {};
    const add = (id: ItemId, n: number, output: boolean) => {
      const f = (flows[id] ??= { input: 0, output: 0 });
      if (output) f.output += n;
      else f.input += n;
    };
    for (const b of this.state.buildings) {
      const s = this.statuses.get(b.id);
      if (!alive(b) || !s?.powered || !s.connected || s.reason !== "작동 중")
        continue;
      const speed =
        1 +
        (b.level - 1) * 0.3 +
        (this.state.technologies.includes("automation") ? 0.1 : 0);
      if (b.kind.startsWith("miner")) {
        const d = deposits.find((d) => Math.abs(d.x - center(b)) <= 100);
        if (d)
          add(
            d.item,
            (60 / d.seconds) * speed * (b.kind === "miner2" ? 1.5 : 1),
            true,
          );
      }
      const r = this.recipeList(b).find((r) => r.id === b.recipe);
      if (r) {
        add(r.item, (60 / r.seconds) * r.count * speed, true);
        for (const [id, n] of Object.entries(r.cost))
          add(id as ItemId, (60 / r.seconds) * n! * speed, false);
      }
    }
    return flows;
  }
  emergencyRefine() {
    if (!this.w.survival.inBase || !this.state.enabled) return false;
    const wh = { ...this.w.survival.state.warehouse };
    if (!StorageSystem.add(wh, "ironBar", 1, this.capacity))
      return this.fail("창고 공간이 부족합니다.");
    if (!this.w.survival.storage.spend({ scrap: 3 }))
      return this.fail("비상 수동 정제에 우주선 잔해 3개가 필요합니다.");
    // Rebuild from post-spend state so materials taken from warehouse stay spent.
    this.deposit("ironBar", 1);
    this.changed("emergency-refine");
    return true;
  }
  private rebuild() {
    if (!this.dirty) return;
    this.dirty = false;
    const all = this.state.buildings.filter(alive),
      sources = all.filter(source);
    const groups: Building[][] = [];
    const seen = new Set<number>();
    for (const s of sources) {
      if (seen.has(s.id)) continue;
      const group = [s];
      seen.add(s.id);
      for (let i = 0; i < group.length; i++)
        for (const o of sources)
          if (
            !seen.has(o.id) &&
            distance(group[i], o) <=
              Math.max(
                definition(group[i].kind).range ?? 0,
                definition(o.kind).range ?? 0,
              )
          ) {
            seen.add(o.id);
            group.push(o);
          }
      groups.push(group);
    }
    // Consumers never bridge two separate power networks.
    for (const b of all.filter((b) => !source(b))) {
      const g = groups
        .map((g) => ({
          g,
          d: Math.min(
            ...g
              .filter(
                (s) =>
                  source(s) &&
                  distance(s, b) <= (definition(s.kind).range ?? 0),
              )
              .map((s) => distance(s, b)),
          ),
        }))
        .filter((o) => Number.isFinite(o.d))
        .sort((a, b) => a.d - b.d)[0]?.g;
      if (g) g.push(b);
    }
    this.networkIds = groups.map((g) => g.map((b) => b.id));
  }
  private power(dt: number, offline: boolean) {
    this.rebuild();
    this.networks = [];
    this.statuses.clear();
    const all = this.state.buildings;
    for (const b of all)
      this.statuses.set(b.id, {
        powered: b.kind === "terminal",
        network: -1,
        reason:
          b.remaining > 0
            ? "건설 중"
            : b.hp <= 0
              ? "손상 · 수리 필요"
              : !b.enabled
                ? "일시정지"
                : "전력망 미연결",
        connected: false,
      });
    for (let index = 0; index < this.networkIds.length; index++) {
      const members = this.networkIds[index]
        .map((id) => this.find(id)!)
        .filter(alive);
      let generation = 0;
      for (const b of members) {
        const d = definition(b.kind);
        if (!d.generation) continue;
        let output = d.generation * (1 + (b.level - 1) * 0.35);
        if (b.kind === "solar") output *= offline ? 0.6 : this.night ? 0 : 1;
        else {
          if (b.fuel <= 0 && dt > 0) {
            const item = b.kind === "crystalGen" ? "crystal" : "denseCell";
            if (this.takeWarehouse({ [item]: 1 }))
              b.fuel =
                b.kind === "crystalGen"
                  ? 60
                  : b.kind === "plasmaGen"
                    ? 120
                    : 180;
          }
          if (b.fuel <= 0) output = 0;
          else b.fuel = Math.max(0, b.fuel - dt);
        }
        generation += output;
      }
      const batteries = members.filter((b) => b.kind === "battery"),
        maxDischarge = batteries.reduce(
          (n, b) => n + Math.min(20 * b.level, b.battery / Math.max(dt, 0.001)),
          0,
        );
      let budget = generation + maxDischarge,
        used = 0,
        demand = 0;
      for (const b of [...members].sort(
        (a, b) => a.priority - b.priority || a.id - b.id,
      )) {
        const d = definition(b.kind),
          consume = d.power * (1 - (b.level - 1) * 0.08);
        demand += consume;
        const powered = budget + 1e-8 >= consume;
        if (powered) {
          budget -= consume;
          used += consume;
        }
        this.statuses.set(b.id, {
          powered,
          network: index,
          reason: powered ? "작동 중" : "전력 부족 · 우선순위 대기",
          connected: false,
        });
        if (d.generation && b.kind !== "solar" && b.fuel <= 0)
          this.statuses.get(b.id)!.reason = "발전 연료 부족";
        if (b.kind === "solar" && this.night && !offline)
          this.statuses.get(b.id)!.reason = "야간 · 발전 정지";
      }
      let balance = (generation - used) * dt;
      for (const b of batteries) {
        if (balance >= 0) {
          const n = Math.min(
            balance,
            20 * b.level * dt,
            200 * b.level - b.battery,
          );
          b.battery += n;
          balance -= n;
        } else {
          const n = Math.min(-balance, 20 * b.level * dt, b.battery);
          b.battery -= n;
          balance += n;
        }
      }
      this.networks.push({
        id: index,
        members: members.map((b) => b.id),
        generation,
        demand,
        used,
        stored: batteries.reduce((n, b) => n + b.battery, 0),
        capacity: batteries.reduce((n, b) => n + 200 * b.level, 0),
      });
    }
    const warehouses = all.filter(
        (b) => alive(b) && ["warehouse", "largeWarehouse"].includes(b.kind),
      ),
      global = all.some(
        (b) => b.kind === "logistics" && this.statuses.get(b.id)?.powered,
      );
    for (const b of all) {
      const s = this.statuses.get(b.id)!;
      s.connected = global || warehouses.some((wh) => distance(wh, b) <= 480);
      if (
        alive(b) &&
        definition(b.kind).power === 0 &&
        !source(b) &&
        b.kind !== "battery"
      ) {
        s.powered = true;
        s.reason =
          b.kind === "terminal" ? "독립 비상 전력" : "전력 불필요 · 사용 가능";
      }
    }
  }
  private takeWarehouse(cost: Cost) {
    const wh = this.w.survival.state.warehouse;
    for (const [id, n] of Object.entries(cost))
      if (
        (wh[id as ItemId] ?? 0) - n! <
        (this.state.reserve[id as ItemId] ?? 0)
      )
        return false;
    for (const [id, n] of Object.entries(cost))
      wh[id as ItemId] = (wh[id as ItemId] ?? 0) - n!;
    return true;
  }
  deposit(id: ItemId, n: number) {
    return StorageSystem.add(
      this.w.survival.state.warehouse,
      id,
      n,
      this.capacity,
    );
  }
  recipeList(b: Building): AutoRecipe[] {
    if (b.kind === "shipyard")
      return Object.entries(shipParts).map(([id, r]) => ({
        id,
        name: partNames[id as PartId],
        ...r,
        item: id as PartId,
        count: 1,
      }));
    if (b.kind === "greenhouse")
      return (
        ["fiber", "strongFiber", "resin", "enzyme", "medicalGel"] as ItemId[]
      ).map((id) => ({
        id: "grow_" + id,
        name: items[id].name,
        cost: { biomass: 1 },
        seconds: 30,
        item: id,
        count: 3,
      }));
    return Object.entries(recipes)
      .filter(
        ([, r]) =>
          r.result.kind === "item" &&
          (b.kind === "refinery"
            ? r.facility === "refinery"
            : b.kind === "factory"
              ? ["electronics", "refine_alloy", "refine_denseCell"].includes(
                  r.id,
                )
              : b.kind === "workbench"
                ? ["medicalGel", "energyCell", "fieldData"].includes(r.id)
                : false) &&
          (!r.tech || this.w.survival.state.technologies.includes(r.tech)),
      )
      .map(([id, r]) => ({
        id,
        name: r.name,
        cost: r.cost,
        seconds: r.seconds,
        item: (r.result as { id: ItemId }).id,
        count: (r.result as { count: number }).count,
      }));
  }
  configure(id: number, recipe: string, repeat: boolean, target: number) {
    const b = this.find(id);
    if (
      !b ||
      !this.w.survival.inBase ||
      !this.recipeList(b).some((r) => r.id === recipe) ||
      !Number.isInteger(target) ||
      target < 1 ||
      target > 999
    )
      return false;
    if (b.job && !this.refund(b.job.cost))
      return this.fail("진행 중 재료를 반환할 창고 공간이 부족합니다.");
    b.job = null;
    b.recipe = recipe;
    b.repeat = recipe === "coreStabilizer" ? false : repeat;
    b.target = recipe === "coreStabilizer" ? 1 : target;
    b.produced = 0;
    b.progress = 0;
    this.changed("configure");
    return true;
  }
  setReserve(id: ItemId, value: number) {
    if (
      !Object.hasOwn(items, id) ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 9999
    )
      return false;
    this.state.reserve[id] = value;
    this.changed("reserve");
    return true;
  }
  startResearch(id: string) {
    const t = colonyTech[id];
    if (
      !t ||
      !this.w.survival.inBase ||
      this.state.research ||
      this.state.technologies.includes(id)
    )
      return false;
    if (!t.requires.every((id) => this.state.technologies.includes(id)))
      return this.fail("선행 연구 필요");
    if (id === "navigation" && !this.state.coreAnalyzed)
      return this.fail("고대 코어를 먼저 분석하세요.");
    if (!this.facilityPowered("research"))
      return this.fail("전력 공급 중인 연구소 필요");
    if (
      this.w.survival.state.researchPoints < t.points ||
      !this.w.survival.storage.spend(t.cost)
    )
      return this.fail("연구 자료 또는 연구 포인트 부족");
    this.w.survival.state.researchPoints -= t.points;
    this.state.research = { id, remaining: t.seconds };
    this.changed("research");
    return true;
  }
  private production(b: Building, dt: number) {
    const status = this.statuses.get(b.id)!;
    if (!status.powered || !alive(b)) return;
    if (!status.connected) {
      if (b.kind.startsWith("miner") || this.recipeList(b).length)
        status.reason = "물류 미연결 · 창고 반경 480 / 중앙 물류 관리소";
      return;
    }
    const bonus =
      1 +
      (b.level - 1) * 0.3 +
      (this.state.technologies.includes("automation") ? 0.1 : 0) +
      this.state.settlers.filter(
        (s) =>
          s.assigned === b.id &&
          this.habitable(s.home) &&
          ["miner", "engineer"].includes(s.role),
      ).length *
        0.15 +
      this.state.robots.filter(
        (r) => r.target === b.id && r.state === "Working" && r.role === "miner",
      ).length *
        0.1;
    if (b.kind.startsWith("miner")) {
      const p = deposits.find((p) => Math.abs(p.x - center(b)) <= 100);
      if (!p) {
        status.reason = "매장지 없음";
        return;
      }
      b.progress += dt * bonus * (b.kind === "miner2" ? 1.5 : 1);
      if (b.progress >= p.seconds) {
        if (!this.deposit(p.item, 1)) {
          b.progress = p.seconds;
          status.reason = "창고 가득 참";
          return;
        }
        b.progress -= p.seconds;
        b.produced++;
        this.output(p.item, 1);
        this.once("depositSurvey");
      }
      return;
    }
    const r = this.recipeList(b).find((r) => r.id === b.recipe);
    if (!r) return;
    if (!b.job) {
      if (
        (b.repeat
          ? (this.w.survival.state.warehouse[r.item] ?? 0)
          : b.produced) >= b.target
      ) {
        status.reason = "목표 수량 충족";
        return;
      }
      if (!this.takeWarehouse(r.cost)) {
        status.reason = "입력 재료 부족 / 최소 보유량 보호";
        return;
      }
      b.job = { recipe: r.id, remaining: r.seconds, cost: { ...r.cost } };
    }
    b.job.remaining = Math.max(0, b.job.remaining - dt * bonus);
    b.progress = 1 - b.job.remaining / r.seconds;
    if (b.job.remaining <= 0) {
      if (!this.deposit(r.item, r.count)) {
        status.reason = "창고 가득 참 · 완성품 보류";
        return;
      }
      b.produced += r.count;
      b.job = null;
      b.progress = 0;
      this.output(r.item, r.count);
    }
  }
  private output(id: ItemId, n: number) {
    this.w.count("auto_" + id, n);
    this.once("centralStorage");
    this.w.survival.discovery.resource(id);
  }
  private once(key: string) {
    if (!this.w.progress.counters[key]) this.w.count(key);
  }
  tick(dt: number, offline = false) {
    if (!this.state.enabled) {
      this.initialize();
      if (!this.state.enabled) return;
    }
    dt = Math.max(0, Math.min(1, dt));
    if (!dt) return;
    this.state.day = (this.state.day + dt) % 1200;
    for (const b of this.state.buildings) {
      b.age += dt;
      if (b.remaining > 0) {
        b.remaining = Math.max(0, b.remaining - dt);
        if (b.remaining === 0) {
          b.age = 0;
          this.invalidate();
          this.w.count("build_" + b.kind);
          if (b.kind.startsWith("miner")) this.once("depositSurvey");
          if (!offline) {
            this.w.toast(definition(b.kind).name + " 건설 완료");
            this.w.sound("constructionComplete");
          }
        }
      }
    }
    this.clock += dt;
    this.saveClock += dt;
    if (this.clock >= 0.25 || offline || this.dirty) {
      const step = this.clock;
      this.clock = 0;
      this.power(step, offline);
      for (const b of [...this.state.buildings].sort(
        (a, b) => a.priority - b.priority || a.id - b.id,
      ))
        this.production(b, step);
      for (const [f, key] of [
        ["workbench", "poweredWorkbench"],
        ["refinery", "poweredRefinery"],
        ["research", "poweredLab"],
      ] as [Facility, string][])
        if (this.facilityPowered(f)) this.once(key);
      if (this.state.research && this.facilityPowered("research")) {
        const job = this.state.research;
        job.remaining -=
          step *
          (1 +
            this.state.settlers.filter(
              (s) =>
                s.role === "scientist" &&
                this.habitable(s.home) &&
                this.statuses.get(s.assigned)?.powered,
            ).length *
              0.15);
        if (job.remaining <= 0) {
          this.state.technologies.push(job.id);
          this.state.research = null;
          this.w.count("ct_" + job.id);
          if (!offline) {
            this.w.toast(colonyTech[job.id].name + " 연구 완료");
            this.w.sound("researchComplete");
          }
        }
      }
      this.robots(step);
      if (this.level >= 3) this.once("industryLevel");
    }
    if (!offline) {
      this.soundClock -= dt;
      this.turretSound = Math.max(0, this.turretSound - dt);
      if (this.soundClock <= 0 && this.w.region === "crash") {
        this.soundClock = 4;
        const nearby = this.state.buildings.find(
          (b) =>
            this.statuses.get(b.id)?.powered &&
            Math.abs(center(b) - this.w.player.x) < 400 &&
            (b.job || b.kind.startsWith("miner")),
        );
        if (nearby) this.w.sound("machine");
      }
      this.defense(dt);
      this.health(dt);
      for (const b of this.beams) b.life -= dt;
      this.beams = this.beams.filter((b) => b.life > 0);
      this.state.lastClock = Math.max(this.state.lastClock, Date.now());
      if (this.saveClock >= 15) {
        this.saveClock = 0;
        this.changed("auto");
      }
    }
  }
  offline(now = Date.now()) {
    if (!this.state.enabled) return;
    const seconds = Math.floor(
      Math.max(0, Math.min(14400, (now - this.state.lastClock) / 1000)),
    );
    const before = { ...this.w.survival.state.warehouse };
    for (let i = 0; i < seconds; i++) {
      this.tick(1, true);
      this.w.survival.production.tick(1);
    }
    this.state.lastClock = Math.max(this.state.lastClock, now);
    if (seconds > 5) {
      const out = Object.entries(this.w.survival.state.warehouse)
        .filter(([k, n]) => n! > (before[k as ItemId] ?? 0))
        .map(
          ([k, n]) =>
            `${items[k as ItemId].name} +${n! - (before[k as ItemId] ?? 0)}`,
        );
      this.offlineReport = `오프라인 ${Math.round(seconds / 60)}분 (최대 4시간) · ${out.join(" / ") || "순증가 생산물 없음"} · ${[...this.statuses.values()].filter((s) => s.reason.includes("부족") || s.reason.includes("가득")).length}개 시설 대기. 침공 없음.`;
      this.w.toast(this.offlineReport);
    }
  }
  habitable(id: number) {
    const b = this.find(id),
      s = this.statuses.get(id);
    return (
      !!b &&
      b.kind === "habitat" &&
      !!s?.powered &&
      this.state.buildings.some(
        (o) =>
          o.kind === "oxygen" &&
          this.statuses.get(o.id)?.powered &&
          this.statuses.get(o.id)?.network === s.network,
      )
    );
  }
  rescue() {
    if (
      !this.w.survival.inBase ||
      this.level < 3 ||
      !this.state.buildings.some(
        (b) => b.kind === "radar" && this.statuses.get(b.id)?.powered,
      )
    )
      return this.fail("기지 Lv.3와 작동 중인 레이더가 필요합니다.");
    this.state.rescue = true;
    this.once("rescueSignal");
    this.changed("rescue");
    return true;
  }
  recruit(role: Role) {
    if (
      !this.state.rescue ||
      !this.w.survival.inBase ||
      this.state.settlers.length >= 10
    )
      return false;
    const home = this.state.buildings.find(
      (b) =>
        this.habitable(b.id) &&
        this.state.settlers.filter((s) => s.home === b.id).length < 2 * b.level,
    );
    if (!home)
      return this.fail("산소·전력이 공급되는 빈 거주 모듈이 필요합니다.");
    const id = ++this.state.serial;
    this.state.settlers.push({
      id,
      name:
        ["서윤", "지오", "루나", "태오", "이든"][
          this.state.settlers.length % 5
        ] +
        " " +
        id,
      role,
      home: home.id,
      assigned: 0,
    });
    this.once("settlerArrived");
    this.changed("settler");
    return true;
  }
  assign(id: number, building: number) {
    const s = this.state.settlers.find((s) => s.id === id),
      b = this.find(building);
    if (!s || !b || !this.w.survival.inBase) return false;
    const kinds: Record<Role, BuildingKind[]> = {
      engineer: ["factory", "refinery", "shipyard", "workbench"],
      scientist: ["lab", "analysis"],
      miner: ["miner", "miner2"],
      medic: ["medical"],
      security: ["turret", "plasmaTurret", "cryoTurret"],
    };
    if (!kinds[s.role].includes(b.kind))
      return this.fail("직업에 맞는 시설을 선택하세요.");
    s.assigned = building;
    this.once("settlerAssigned");
    this.changed("assign");
    return true;
  }
  addRobot(role: Robot["role"], station: number) {
    if (
      !this.w.survival.inBase ||
      !this.state.technologies.includes("robotics") ||
      this.state.robots.length >= 20 ||
      this.find(station)?.kind !== "robotStation"
    )
      return false;
    if (!this.w.survival.storage.spend({ electronics: 2, ironBar: 2 }))
      return this.fail("로봇 제작 자재 부족");
    this.state.robots.push({
      id: ++this.state.serial,
      role,
      station,
      target: 0,
      charge: 100,
      x: center(this.find(station)!),
      state: "Idle",
      progress: 0,
    });
    this.changed("robot");
    return true;
  }
  private robots(dt: number) {
    for (const r of this.state.robots) {
      const station = this.find(r.station);
      if (!station) continue;
      if (!this.statuses.get(station.id)?.powered) {
        r.state = "Waiting";
        continue;
      }
      if (r.charge < 15 || r.state === "Returning" || r.state === "Charging") {
        if (Math.abs(r.x - center(station)) > 10) {
          r.state = "Returning";
          r.x +=
            Math.sign(center(station) - r.x) *
            Math.min(Math.abs(center(station) - r.x), dt * 180);
        } else {
          r.state = "Charging";
          r.charge = Math.min(100, r.charge + dt * 10);
          if (r.charge === 100) r.state = "Idle";
        }
        continue;
      }
      const target =
        r.role === "miner"
          ? this.state.buildings.find(
              (b) =>
                b.kind.startsWith("miner") && this.statuses.get(b.id)?.powered,
            )
          : r.role === "repair"
            ? this.state.buildings.find(
                (b) => b.hp < this.maxHp(b) && !b.legacy,
              )
            : station;
      if (!target) {
        r.state = "Idle";
        continue;
      }
      r.target = target.id;
      if (Math.abs(r.x - center(target)) > 10) {
        r.state = "Moving";
        r.x +=
          Math.sign(center(target) - r.x) *
          Math.min(Math.abs(center(target) - r.x), dt * 180);
      } else {
        r.state = "Working";
        r.progress += dt;
        if (r.progress >= 20) {
          r.progress = 0;
          if (r.role === "repair" && this.takeWarehouse({ ironBar: 1 })) {
            target.hp = Math.min(this.maxHp(target), target.hp + 180);
            this.invalidate();
          }
          if (r.role === "explorer") {
            this.deposit("data", 1);
            this.once("depositSurvey");
          }
        }
      }
      r.charge = Math.max(0, r.charge - dt * 0.4);
    }
  }
  private health(dt: number) {
    if (this.w.region !== "crash") return;
    for (const b of this.state.buildings) {
      if (
        !this.statuses.get(b.id)?.powered ||
        Math.abs(center(b) - this.w.player.x) > 180
      )
        continue;
      if (b.kind === "medical")
        this.w.player.hp = Math.min(
          this.w.stats.hp,
          this.w.player.hp +
            dt *
              (4 +
                this.state.settlers.filter(
                  (s) =>
                    s.assigned === b.id &&
                    s.role === "medic" &&
                    this.habitable(s.home),
                ).length *
                  2),
        );
      if (b.kind === "oxygen")
        this.w.survival.state.oxygen = Math.min(
          this.w.survival.oxygen.maximum,
          this.w.survival.state.oxygen + dt * 15,
        );
    }
  }
  startSiege() {
    if (
      this.siege ||
      this.w.region !== "crash" ||
      this.w.dead > 0 ||
      this.buildMode ||
      !!this.w.combat.training
    )
      return false;
    const radar = this.state.buildings.find(
      (b) => b.kind === "radar" && this.statuses.get(b.id)?.powered,
    );
    if (!radar) return this.fail("작동 중인 레이더가 필요합니다.");
    if (this.state.siegeWins > 0 && !this.state.siegeEnabled)
      return this.fail("반복 침공은 설정에서 켜세요.");
    this.siege = {
      phase: "preparing",
      remaining: 30,
      ids: [],
      origin: center(radar),
    };
    this.once("siegePrepared");
    this.w.sound("siegeAlarm");
    this.w.toast("COLONY SIEGE · 오른쪽 접근 · 준비 시간 30초");
    return true;
  }
  abortSiege() {
    if (!this.siege) return;
    this.w.enemies = this.w.enemies.filter(
      (e) => !this.siege!.ids.includes(e.id),
    );
    this.siege = null;
    this.lastSiege = "침공 중단 · 시설과 창고는 보존됩니다.";
  }
  private defense(dt: number) {
    if (!this.siege) return;
    if (this.w.region !== "crash" || this.w.dead > 0) {
      this.abortSiege();
      return;
    }
    const raid = this.siege;
    raid.remaining -= dt;
    if (raid.phase === "preparing") {
      if (raid.remaining > 0) return;
      raid.phase = "fighting";
      raid.remaining = 180;
      for (let i = 0; i < 3 + this.level; i++) {
        const id = 80000 + i;
        const e = createEnemy(
          i === 2 + this.level ? "beetle" : i % 2 ? "crawler" : "slime",
          Math.min(BASE_END - 120, raid.origin + 550 + i * 90),
          780,
          id,
          undefined,
          this.w.settings.difficulty,
        );
        e.hp = e.maxHp = i === 2 + this.level ? 260 : 80;
        e.noLoot = true;
        this.w.enemies.push(e);
        raid.ids.push(id);
      }
      this.w.toast("침공 시작 · 포탑과 함께 기지를 방어하세요.");
    }
    const enemies = this.w.enemies.filter(
      (e) => raid.ids.includes(e.id) && e.hp > 0 && e.state !== "Death",
    );
    for (const b of this.state.buildings.filter(
      (b) =>
        (alive(b) &&
          this.statuses.get(b.id)?.powered &&
          b.kind.endsWith("Turret")) ||
        (alive(b) && this.statuses.get(b.id)?.powered && b.kind === "turret"),
    )) {
      b.progress = Math.max(0, b.progress - dt);
      if (b.progress > 0) continue;
      const range = definition(b.kind).range!;
      const e = enemies.find(
        (e) => Math.hypot(e.x - center(b), e.y - (b.y - 50)) <= range,
      );
      if (!e) continue;
      b.progress = 1;
      if (
        this.turretSound === 0 &&
        Math.abs(center(b) - this.w.player.x) < 650
      ) {
        this.w.sound("pulse");
        this.turretSound = 0.3;
      }
      const security = this.state.settlers.filter(
        (s) =>
          s.assigned === b.id &&
          s.role === "security" &&
          this.habitable(s.home),
      ).length;
      this.w.combat.hit(
        e,
        {
          damage:
            (b.kind === "plasmaTurret"
              ? 55
              : b.kind === "cryoTurret"
                ? 16
                : 28) *
            (1 + (b.level - 1) * 0.3 + security * 0.15),
          element: b.kind === "cryoTurret" ? "cryo" : "electric",
          crit: 0,
          critDamage: 1,
          knockback: 0,
          status: b.kind === "cryoTurret" ? "chill" : undefined,
          statusChance: 1,
          special: false,
          sourceX: center(b),
        },
        false,
        true,
      );
      this.beams.push({
        x: center(b),
        y: b.y - 60,
        tx: e.x,
        ty: e.y + 20,
        life: 0.15,
        color: b.kind === "cryoTurret" ? "#93d8ff" : "#ffd39a",
      });
    }
    for (const e of enemies) {
      const targets = this.state.buildings.filter(
        (b) => alive(b) && !b.legacy && b.kind !== "floor",
      );
      const b = targets.sort(
        (a, b) => Math.abs(center(a) - e.x) - Math.abs(center(b) - e.x),
      )[0];
      if (!b) continue;
      if (Math.abs(center(b) - e.x) > 90) {
        const blocked = e.statuses.some(
          (s) => s.id === "freeze" || s.id === "stun",
        );
        if (!blocked)
          e.x +=
            Math.sign(center(b) - e.x) *
            dt *
            (e.statuses.some((s) => s.id === "chill") ? 20 : 45);
      } else {
        const shield = this.state.buildings.some(
          (s) =>
            s.kind === "shield" &&
            this.statuses.get(s.id)?.powered &&
            distance(s, b) <= 320,
        );
        b.hp = Math.max(0, b.hp - dt * (shield ? 4 : 10));
        if (b.hp === 0) this.invalidate();
      }
    }
    if (!enemies.length) {
      this.state.siegeWins++;
      this.once("siegeWon");
      if (this.state.siegeWins === 1) {
        this.w.battle.credits += 500;
        this.deposit("data", 5);
        this.deposit("biomass", 8);
      }
      this.lastSiege =
        "방어 성공 · " + this.state.siegeWins + "회 (첫 승리만 보상)";
      this.w.enemies = this.w.enemies.filter((e) => !raid.ids.includes(e.id));
      this.siege = null;
      this.changed("siege");
      this.w.toast(this.lastSiege);
    } else if (raid.remaining <= 0) this.abortSiege();
  }
  inspectShip() {
    this.state.shipInspected = true;
    this.once("shipInspected");
    this.changed("ship");
  }
  deliverPart(id: PartId) {
    if (
      !this.w.survival.inBase ||
      !Object.hasOwn(partNames, id) ||
      this.state.ship.includes(id) ||
      !this.state.buildings.some(
        (b) => b.kind === "port" && this.statuses.get(b.id)?.powered,
      )
    )
      return false;
    if (!this.w.survival.storage.spend({ [id]: 1 }))
      return this.fail("납품할 부품이 없습니다.");
    this.state.ship.push(id);
    if (this.state.ship.length === 6) this.once("shipReady");
    this.changed("ship-delivery");
    return true;
  }
  analyzeCore() {
    if (
      this.state.coreAnalyzed ||
      !this.w.survival.inBase ||
      !this.state.buildings.some(
        (b) => b.kind === "analysis" && this.statuses.get(b.id)?.powered,
      )
    )
      return this.fail("작동 중인 외계 기술 분석소가 필요합니다.");
    if (!this.w.survival.storage.spend({ titanCore: 1, coreShard: 1 }))
      return this.fail("타이탄 코어 1개와 파수꾼 코어 조각 1개가 필요합니다.");
    this.state.coreAnalyzed = true;
    this.once("coreAnalyzed");
    this.changed("core-analysis");
    return true;
  }
}
