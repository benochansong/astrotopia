import { workforceNames, type WorkFocus } from "./workforce";
import type { World } from "../core/world";
import { items, type ItemId } from "../data/content";
import { planetIds, type PlanetId } from "../space/catalog";
import { occupiedSlots, type Inventory } from "../systems/inventory";
import { savedColonyCapacity } from "../save/colony-schema";
import { recipes, type Cost } from "../survival/catalog";
import {
  newCivilization,
  type CivilizationSave,
  type Endpoint,
  type Freighter,
  type Route,
  type TradeRule,
} from "./types";
import {
  contracts,
  freightCosts,
  marketPrices,
  stationStages,
  industrialRecipes,
} from "./catalog";
export class CivilizationSystem {
  state = newCivilization();
  offlineSummary = "";
  private accumulator = 0;
  constructor(private w: World) {}
  get protected() {
    return (
      this.w.isColonyRegion &&
      this.state.restored.includes(this.w.planetId) &&
      this.w.colony.state.buildings.some(
        (b) =>
          b.kind === "ancientResearch" &&
          this.w.colony.statuses.get(b.id)?.powered &&
          Math.abs(b.x + 100 - this.w.player.x) <= 300 &&
          Math.abs(b.y - this.w.player.y) < 200,
      )
    );
  }
  get unlocked() {
    return this.w.survival.state.technologies.includes("cargoAutomation");
  }
  get canManage() {
    return (
      !this.w.omega.endgame.original &&
      !this.w.classes.trialReturn &&
      !this.w.dead
    );
  }
  get endpoints(): Endpoint[] {
    return [
      ...planetIds.filter((id) => this.w.space.state.planets[id]),
      ...(this.state.station.stage >= 1 ? ["station" as const] : []),
    ];
  }
  warehouse(at: Endpoint): Inventory | undefined {
    if (at === "station")
      return this.state.station.stage >= 1
        ? this.state.station.warehouse
        : undefined;
    return at === this.w.space.state.location
      ? this.w.survival.state.warehouse
      : this.w.space.state.planets[at]?.local.warehouse;
  }
  capacity(at: Endpoint) {
    return at === "station"
      ? 300 * this.state.station.stage
      : this.w.space.state.planets[at]
        ? savedColonyCapacity(this.w.space.state.planets[at]!.colony)
        : 0;
  }
  reserve(at: Endpoint, item: ItemId) {
    return at === "station"
      ? 0
      : (this.w.space.state.planets[at]?.colony.reserve[item] ?? 0);
  }
  /** Prepare every balance before mutating either side. All callers run in scheduler order. */
  exchange(at: Endpoint, cost: Cost, gain: Cost = {}, credit = 0): boolean {
    this.w.space.capture();
    const wh = this.warehouse(at);
    if (
      !wh ||
      !Number.isSafeInteger(credit) ||
      this.w.battle.credits + credit < 0 ||
      this.w.battle.credits + credit > 1e9
    )
      return false;
    const next = { ...wh };
    for (const [bag, sign] of [
      [cost, -1],
      [gain, 1],
    ] as const)
      for (const [key, n] of Object.entries(bag)) {
        const id = key as ItemId;
        if (!Object.hasOwn(items, id) || !Number.isSafeInteger(n) || n! < 0)
          return false;
        if (sign < 0 && (next[id] ?? 0) - this.reserve(at, id) < n!)
          return false;
        next[id] = (next[id] ?? 0) + sign * n!;
      }
    if (occupiedSlots(next) > this.capacity(at)) return false;
    for (const key of Object.keys(wh)) delete wh[key as ItemId];
    Object.assign(wh, next);
    this.w.battle.credits += credit;
    return true;
  }
  fail(message: string) {
    this.w.toast(message);
    return false;
  }
  log(text: string) {
    this.state.logs.push({
      id: ++this.state.serial,
      time: this.state.elapsed,
      text,
    });
    if (this.state.logs.length > 80) this.state.logs.shift();
  }
  changed(text: string) {
    this.log(text);
    this.w.emit("save", "civilization");
  }
  hasTech(id: string) {
    return this.w.survival.state.technologies.includes(id);
  }
  powered(at: Endpoint, kind: string) {
    if (at === "station") return this.state.station.stage > 0;
    const c = this.w.space.systems[at];
    return !!c?.state.buildings.some(
      (b) =>
        b.kind === kind &&
        b.remaining === 0 &&
        b.hp > 0 &&
        c.statuses.get(b.id)?.powered,
    );
  }
  docks(at: Endpoint) {
    if (at === "station") return this.state.station.stage + 1;
    return this.powered(at, "galacticPort")
      ? 4
      : this.powered(at, "industrialPort")
        ? 2
        : this.powered(at, "port")
          ? 1
          : 0;
  }
  buildShip(tier: 1 | 2, at: Endpoint) {
    if (
      !this.canManage ||
      !this.unlocked ||
      this.state.ships.length >= 30 ||
      ![1, 2].includes(tier) ||
      !this.docks(at) ||
      (tier === 2 && !this.hasTech("orbitalCivilization"))
    )
      return this.fail(
        "연구 · 가동 중인 우주항 · 함대 한도 30척을 확인하세요.",
      );
    if (!this.exchange(at, freightCosts[tier]))
      return this.fail("현지 창고의 건조 재료가 부족합니다.");
    this.state.ships.push({
      id: ++this.state.serial,
      owner: this.state.owner,
      tier,
      at,
      route: null,
      state: "Idle",
      remaining: 0,
      fuel: 0,
      condition: 100,
      cargo: {},
      reason: "",
      returning: false,
    });
    this.changed("MK" + tier + " 화물선 건조");
    return true;
  }
  createRoute(
    shipId: number,
    config: Omit<Route, "id" | "delivered" | "enabled">,
  ) {
    const ship = this.state.ships.find((s) => s.id === shipId);
    if (
      !this.canManage ||
      !this.unlocked ||
      !ship ||
      ship.route !== null ||
      ship.state !== "Idle" ||
      Object.values(ship.cargo).some((n) => n! > 0) ||
      this.state.routes.length >= 50 ||
      !this.endpoints.includes(config.from) ||
      !this.endpoints.includes(config.to) ||
      config.from === config.to ||
      ship.at !== config.from ||
      !Object.hasOwn(items, config.item) ||
      config.name.length > 40 ||
      ![
        config.amount,
        config.minimum,
        config.target,
        config.interval,
        config.priority,
      ].every(Number.isSafeInteger) ||
      config.amount < 1 ||
      config.amount > 9900 ||
      config.minimum < 0 ||
      config.minimum > 99999 ||
      config.target < 1 ||
      config.target > 99999 ||
      config.interval < 5 ||
      config.interval > 3600 ||
      config.priority < 1 ||
      config.priority > 4
    )
      return this.fail(
        "항로 설정이 올바르지 않습니다. 출발지의 유휴 화물선이 필요합니다.",
      );
    const r: Route = {
      ...config,
      id: ++this.state.serial,
      enabled: true,
      delivered: 0,
    };
    this.state.routes.push(r);
    ship.route = r.id;
    this.changed("항로 등록: " + r.name);
    return true;
  }
  toggleRoute(id: number) {
    const r = this.state.routes.find((r) => r.id === id);
    if (!r || !this.canManage) return false;
    if (!r.enabled && !this.state.ships.some((s) => s.route === id)) {
      const ship = this.state.ships.find(
        (s) => s.route === null && s.at === r.from && s.state === "Idle",
      );
      if (!ship) return this.fail("출발지에 유휴 화물선이 필요합니다.");
      ship.route = id;
    }
    r.enabled = !r.enabled;
    this.changed(r.enabled ? "항로 재개" : "항로 정지 · 실린 화물은 운송 완료");
    return true;
  }
  recall(id: number) {
    const s = this.state.ships.find((s) => s.id === id),
      r = this.state.routes.find((r) => r.id === s?.route);
    if (!s || !r || !this.canManage) return false;
    r.enabled = false;
    if (
      ["Loading", "InTransit", "Departing", "Arrived", "Unloading"].includes(
        s.state,
      ) ||
      (s.state === "Waiting" && s.at === r.to)
    ) {
      s.returning = true;
      s.state = "Returning";
      s.remaining = 30;
      s.reason = "출발지로 회수";
    } else if (s.state === "Idle" || s.state === "Waiting") {
      s.route = null;
      s.state = "Idle";
      s.reason = "";
      s.remaining = 0;
    }
    this.changed("화물선 회수");
    return true;
  }
  service(id: number) {
    const s = this.state.ships.find((s) => s.id === id);
    if (
      !s ||
      !this.canManage ||
      !["Idle", "Waiting", "Maintenance", "Refueling"].includes(s.state)
    )
      return false;
    if (s.condition < 100) {
      if (!this.exchange(s.at, { alloy: 1 }))
        return this.fail("수리용 합금 1 필요");
      s.condition = 100;
    }
    const n = Math.min(
      20 - s.fuel,
      Math.max(
        0,
        (this.warehouse(s.at)?.shipFuel ?? 0) - this.reserve(s.at, "shipFuel"),
      ),
    );
    if (n > 0 && this.exchange(s.at, { shipFuel: n })) s.fuel += n;
    s.state = occupiedSlots(s.cargo) ? "Waiting" : "Idle";
    s.reason = occupiedSlots(s.cargo) ? "적재 화물 하역 대기" : "";
    this.changed("정비 · 급유");
    return true;
  }
  private cargoStep(s: Freighter) {
    const r = this.state.routes.find((r) => r.id === s.route);
    if (!r) return;
    const cargo = Object.values(s.cargo).reduce((a, b) => a + (b ?? 0), 0);
    if (s.remaining > 0) {
      s.remaining = Math.max(0, s.remaining - 1);
      if (s.remaining) return;
    }
    if (s.state === "Loading") {
      s.state = "Departing";
      s.remaining = 2;
      return;
    }
    if (s.state === "Departing") {
      s.state = "InTransit";
      s.remaining = 30;
      return;
    }
    if (s.state === "InTransit") {
      s.at = r.to;
      s.state = "Arrived";
      s.remaining = 1;
      return;
    }
    if (s.state === "Arrived") {
      if (
        this.state.ships.filter(
          (x) => x.id !== s.id && x.at === s.at && x.state === "Unloading",
        ).length >= this.docks(s.at)
      ) {
        s.reason = "도착 선석 대기";
        return;
      }
      s.state = "Unloading";
      s.remaining = 2;
      s.reason = "";
      return;
    }
    if (s.state === "Returning") {
      s.at = r.from;
      s.state = "Unloading";
      s.returning = true;
    }
    if (s.state === "Unloading" || (s.state === "Waiting" && cargo > 0)) {
      if (!this.docks(s.at)) {
        s.reason = "도착지 우주항 전력 없음";
        s.state = "Waiting";
        return;
      }
      if (!this.exchange(s.at, {}, s.cargo)) {
        s.reason = "창고 가득 참 · 화물선에 보관";
        s.state = "Waiting";
        return;
      }
      if (!s.returning) {
        r.delivered = Math.min(1e9, r.delivered + cargo);
        this.state.stats.delivered = Math.min(
          1e9,
          this.state.stats.delivered + cargo,
        );
        this.log("하역 완료: " + r.name + " · " + cargo);
      }
      s.cargo = {};
      s.reason = "";
      if (!s.returning) {
        s.state = "Returning";
        s.remaining = 30;
        s.returning = true;
        return;
      }
      s.returning = false;
      s.condition = Math.max(0, s.condition - 2);
      s.state = "Idle";
      s.remaining = r.interval;
      if (!r.repeat) r.enabled = false;
      if (!r.enabled) s.route = null;
      return;
    }
    if (!r.enabled) {
      s.state = "Idle";
      s.reason = "항로 정지";
      return;
    }
    if (s.condition < 10) {
      s.state = "Maintenance";
      s.reason = "정비 필요 · 합금 1";
      return;
    }
    if (!this.docks(r.from) || !this.docks(r.to)) {
      s.state = "Waiting";
      s.reason = "양쪽 우주항 가동 필요";
      return;
    }
    const active = this.state.ships.filter(
      (x) =>
        x.id !== s.id &&
        x.at === r.from &&
        ["Loading", "Departing"].includes(x.state),
    ).length;
    if (active >= this.docks(r.from)) {
      s.state = "Waiting";
      s.reason = "출항 선석 대기";
      return;
    }
    const source = this.warehouse(r.from),
      dest = this.warehouse(r.to);
    if (!source || !dest) return;
    const n = Math.min(
      r.amount,
      (s.tier === 1 ? 100 : 300) * 99,
      Math.max(
        0,
        (source[r.item] ?? 0) -
          Math.max(r.minimum, this.reserve(r.from, r.item)),
      ),
      Math.max(
        0,
        r.target -
          (dest[r.item] ?? 0) -
          this.state.ships
            .filter(
              (x) =>
                x.id !== s.id &&
                !x.returning &&
                this.state.routes.find((rr) => rr.id === x.route)?.to === r.to,
            )
            .reduce((a, x) => a + (x.cargo[r.item] ?? 0), 0),
      ),
    );
    if (!n) {
      s.state = "Waiting";
      s.reason = "출발지 재고 또는 목적지 목표 수량 대기";
      return;
    }
    const fuelNeeded = Math.max(0, 4 - s.fuel),
      cost: Cost = { [r.item]: n };
    cost.shipFuel = (cost.shipFuel ?? 0) + fuelNeeded;
    if (!this.exchange(r.from, cost)) {
      s.state = "Refueling";
      s.reason = "재고 / 왕복 연료 4 부족";
      return;
    }
    s.fuel += fuelNeeded - 4;
    s.cargo = { [r.item]: n };
    s.state = "Loading";
    s.remaining = 2;
    s.reason = "";
    s.returning = false;
  }
  tradeTotal(at: Endpoint, item: ItemId, n: number, side: "buy" | "sell") {
    if (
      !Object.hasOwn(marketPrices, item) ||
      !Number.isSafeInteger(n) ||
      n < 0 ||
      n > 1000
    )
      return Infinity;
    const m = this.market(at),
      start = m[item] ?? 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += this.quote(at, item, side, start + (side === "buy" ? -i : i));
    }
    return total;
  }
  market(at: Endpoint) {
    return (this.state.markets[at] ??= Object.fromEntries(
      Object.keys(marketPrices).map((id) => [id, 100]),
    ) as Inventory);
  }
  quote(
    at: Endpoint,
    item: ItemId,
    side: "buy" | "sell",
    stockOverride?: number,
  ) {
    if (!Object.hasOwn(marketPrices, item)) return 0;
    const base = marketPrices[item as keyof typeof marketPrices],
      stock = stockOverride ?? this.market(at)[item] ?? 0,
      index = at === "station" ? 7 : planetIds.indexOf(at);
    const factor = Math.max(0.7, Math.min(1.5, 1.25 - stock / 400));
    return Math.max(
      1,
      side === "buy"
        ? Math.ceil(base * (1 + index * 0.04) * factor * 1.15)
        : Math.floor(base * (1 + index * 0.04) * factor * 0.75),
    );
  }
  trade(
    at: Endpoint,
    item: ItemId,
    n: number,
    side: "buy" | "sell",
    automatic = false,
  ) {
    if (
      (!automatic && !this.canManage) ||
      !this.unlocked ||
      !this.endpoints.includes(at) ||
      !Object.hasOwn(marketPrices, item) ||
      !Number.isSafeInteger(n) ||
      n < 1 ||
      n > 1000
    )
      return false;
    const market = this.market(at),
      price = this.tradeTotal(at, item, n, side);
    if (side === "buy" && (market[item] ?? 0) < n)
      return this.fail("NPC 시장 재고 부족");
    if (side === "sell" && (market[item] ?? 0) + n > 10000)
      return this.fail("NPC 시장 매입 한도");
    if (
      !this.exchange(
        at,
        side === "sell" ? { [item]: n } : {},
        side === "buy" ? { [item]: n } : {},
        (side === "buy" ? -1 : 1) * price,
      )
    )
      return this.fail("크레딧 · 현지 창고 재고 · 공간 부족");
    market[item] = (market[item] ?? 0) + (side === "sell" ? n : -n);
    const stat = side === "buy" ? "bought" : "sold";
    this.state.stats[stat] = Math.min(1e9, this.state.stats[stat] + n);
    this.log(
      (automatic ? "자동 " : "") +
        (side === "buy" ? "매입" : "매각") +
        " " +
        items[item].name +
        " ×" +
        n,
    );
    if (!automatic) this.w.emit("save", "trade");
    return true;
  }
  addRule(rule: Omit<TradeRule, "id" | "enabled">) {
    if (
      !this.canManage ||
      !this.unlocked ||
      this.state.rules.length >= 50 ||
      !this.endpoints.includes(rule.at) ||
      !Object.hasOwn(marketPrices, rule.item) ||
      !["buy", "sell"].includes(rule.side) ||
      ![
        rule.threshold,
        rule.target,
        rule.batch,
        rule.price,
        rule.reserve,
        rule.budget,
      ].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e6) ||
      rule.batch < 1 ||
      rule.batch > 1000 ||
      rule.price < 1 ||
      rule.budget < 1
    )
      return false;
    this.state.rules.push({ ...rule, id: ++this.state.serial, enabled: true });
    this.changed("자동 거래 규칙 등록");
    return true;
  }
  private autoTrade() {
    for (const r of this.state.rules) {
      if (!r.enabled) continue;
      const wh = this.warehouse(r.at);
      if (!wh) continue;
      const own = wh[r.item] ?? 0,
        price = this.quote(r.at, r.item, r.side);
      let n = 0;
      if (r.side === "sell" && own > r.threshold && price >= r.price)
        n = Math.min(
          r.batch,
          own - Math.max(r.threshold, this.reserve(r.at, r.item)),
          Math.floor(r.budget / price),
        );
      if (r.side === "buy" && own < r.threshold && price <= r.price)
        n = Math.min(
          r.batch,
          Math.max(0, r.target - own),
          this.market(r.at)[r.item] ?? 0,
          Math.floor(
            Math.min(r.budget, Math.max(0, this.w.battle.credits - r.reserve)) /
              price,
          ),
        );
      const fits = (count: number) => {
        if (!count) return true;
        const total = this.tradeTotal(r.at, r.item, count, r.side);
        const lastPrice = this.quote(
          r.at,
          r.item,
          r.side,
          (this.market(r.at)[r.item] ?? 0) +
            (r.side === "buy" ? 1 - count : count - 1),
        );
        return (
          total <= r.budget &&
          (r.side === "buy"
            ? total <= this.w.battle.credits - r.reserve && lastPrice <= r.price
            : lastPrice >= r.price)
        );
      };
      let low = 0,
        high = n;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (fits(mid)) low = mid;
        else high = mid - 1;
      }
      n = low;
      if (n > 0) this.trade(r.at, r.item, n, r.side, true);
    }
  }
  contract(at: Endpoint, kind: keyof typeof contracts = "supply") {
    const d = contracts[kind],
      id = kind + "-" + at;
    if (
      !d ||
      !this.canManage ||
      !this.unlocked ||
      !this.hasTech(d.tech) ||
      !this.endpoints.includes(at) ||
      this.state.contracts.includes(id) ||
      !this.exchange(at, d.cost, {}, d.reward)
    )
      return this.fail(
        "계약 연구 · 현지 창고 납품 재료 확인 / 각 계약은 창고별 1회",
      );
    this.state.contracts.push(id);
    this.state.stats.contracts++;
    this.award(id, 50);
    this.changed(d.name + " 완료 · " + d.reward + " CR");
    return true;
  }
  get title() {
    const ranks = [
      "개척자",
      "행성 탐험가",
      "무역 개척자",
      "산업 선구자",
      "문명 건설자",
      "항성 지도자",
      "은하 개척자",
    ];
    return ranks[
      [0, 100, 300, 700, 1500, 3000, 5000].filter(
        (n) => this.state.reputation >= n,
      ).length - 1
    ];
  }
  award(key: string, points: number) {
    if (this.state.milestones.includes(key)) return;
    this.state.milestones.push(key);
    this.state.reputation = Math.min(10000, this.state.reputation + points);
  }
  city(at: PlanetId) {
    return (this.state.cities[at] ??= {
      population: 0,
      wellbeing: 50,
      focus: "industry",
      supplied: false,
    });
  }
  workforce(at: PlanetId) {
    const city = this.city(at),
      sys = this.w.space.systems[at],
      active =
        sys?.state.buildings.filter(
          (b) =>
            b.remaining === 0 && b.hp > 0 && sys.statuses.get(b.id)?.powered,
        ) ?? [];
    const matching: Record<WorkFocus, string[]> = {
      industry: Object.keys(industrialRecipes),
      miner: ["miner", "miner2", "desertMine"],
      engineer: ["megaSolar", "quantumReactor", "crystalGen", "plasmaGen"],
      science: ["lab", "quantumLab", "ancientResearch", "stellarObservatory"],
      medic: ["medical", "cityClinic"],
      logistics: ["port", "industrialPort", "galacticPort", "logistics"],
      agriculture: ["bioFarm", "greenhouse", "bioengineering"],
      security: ["turret", "laserTurret", "shield"],
      shiptech: ["shipyard", "spaceshipComplex"],
    };
    let remaining = city.population;
    return (Object.keys(workforceNames) as WorkFocus[])
      .sort((a, b) => (a === city.focus ? -1 : b === city.focus ? 1 : 0))
      .map((role) => {
        const capacity =
            active.filter((b) => matching[role].includes(b.kind)).length *
            (role === "industry" ? 500 : 100),
          assigned = Math.min(remaining, capacity);
        remaining -= assigned;
        return { role, name: workforceNames[role], capacity, assigned };
      });
  }
  cityMetrics(at: PlanetId) {
    const c = this.w.space.systems[at];
    const active =
      c?.state.buildings.filter(
        (b) => b.remaining === 0 && b.hp > 0 && c.statuses.get(b.id)?.powered,
      ) ?? [];
    return {
      capacity: Math.min(
        5000,
        active
          .filter((b) => b.kind === "cityHabitat")
          .reduce((a, b) => a + 500 * b.level, 0),
      ),
      oxygen: active.some((b) => b.kind === "oxygen"),
      medical: active.some((b) => ["medical", "cityClinic"].includes(b.kind)),
      jobs:
        active.filter((b) => Object.hasOwn(industrialRecipes, b.kind)).length *
        500,
      industry: active.filter((b) => Object.hasOwn(industrialRecipes, b.kind))
        .length,
    };
  }
  cityLevel(at: PlanetId) {
    if (!this.w.space.state.planets[at]) return 0;
    const c = this.city(at);
    if (c.population < 500) return 0;
    const m = this.cityMetrics(at);
    return c.population >= 2000 &&
      c.wellbeing >= 80 &&
      m.industry >= 4 &&
      this.docks(at) >= 4
      ? 7
      : c.population >= 500 &&
          c.wellbeing >= 65 &&
          m.industry >= 2 &&
          this.docks(at) >= 2
        ? 6
        : 0;
  }
  researchBonus(at: PlanetId) {
    const c = this.state.cities[at];
    return c?.supplied && c.wellbeing >= 60 && c.focus === "science"
      ? Math.min(0.15, c.population / 10000)
      : 0;
  }
  get level() {
    const developed = planetIds.filter(
      (id) => this.w.space.state.planets[id] && this.cityLevel(id) >= 6,
    ).length;
    return developed >= 3 &&
      this.state.station.stage >= 3 &&
      this.state.odyssey &&
      this.state.restored.length >= 3 &&
      this.state.stats.delivered >= 1000
      ? 8
      : Math.max(
          1,
          ...planetIds
            .filter((id) => this.w.space.state.planets[id])
            .map((id) => this.cityLevel(id)),
        );
  }
  private population() {
    for (const id of planetIds) {
      if (!this.w.space.state.planets[id]) continue;
      const c = this.city(id),
        m = this.cityMetrics(id);
      const ration = Math.max(1, Math.ceil(c.population / 100));
      c.supplied = m.oxygen && this.exchange(id, { colonyRation: ration });
      const goal = c.supplied
        ? Math.min(
            100,
            60 + (m.medical ? 20 : 0) + (m.jobs >= c.population ? 20 : 0),
          )
        : 30;
      c.wellbeing = Math.max(
        0,
        Math.min(100, c.wellbeing + Math.sign(goal - c.wellbeing) * 5),
      );
      if (c.supplied && c.wellbeing >= 60)
        c.population = Math.min(
          m.capacity,
          c.population + Math.min(50, Math.max(1, m.jobs - c.population)),
        );
      else c.population = Math.min(c.population, m.capacity);
      if (c.population >= 500) this.award("city-" + id, 100);
    }
  }
  industryBonus(at: PlanetId, kind = "") {
    const c = this.state.cities[at];
    return c?.supplied &&
      c.wellbeing >= 60 &&
      (c.focus === "industry" ||
        (c.focus === "agriculture" &&
          ["greenhouse", "bioFarm", "bioengineering"].includes(kind)))
      ? Math.min(0.15, c.population / 10000)
      : 0;
  }
  buildStation() {
    const s = this.state.station;
    if (
      !this.canManage ||
      !this.hasTech("orbitalCivilization") ||
      !this.w.omega.state.ending ||
      s.stage >= 3 ||
      planetIds.filter(
        (id) => this.cityMetrics(id).industry > 0 && this.docks(id) > 0,
      ).length < 3
    )
      return this.fail(
        "엔딩 · 궤도 개척 연구 · 3개 행성의 가동 산업/우주항 필요",
      );
    const at = s.stage === 0 ? this.w.space.state.location : "station";
    if (!this.exchange(at, stationStages[s.stage]))
      return this.fail(
        "건설 단계 재료를 " +
          (at === "station" ? "정거장" : "현재 행성") +
          " 창고에 납품하세요.",
      );
    s.stage++;
    this.award("station-" + s.stage, 150);
    this.changed("STELLAR NEXUS Lv." + s.stage);
    return true;
  }
  buildOdyssey() {
    if (
      !this.canManage ||
      this.state.odyssey ||
      this.state.station.stage < 2 ||
      !this.w.extreme.state.horizon ||
      !this.exchange("station", {
        starEngine: 3,
        universalSupport: 2,
        transcendentReactor: 1,
      })
    )
      return this.fail(
        "정거장 Lv.2 · HORIZON · 항성 엔진 3 / 생명 유지 2 / 반응로 1 필요",
      );
    this.state.odyssey = true;
    this.award("odyssey", 250);
    this.changed("HORIZON → ODYSSEY");
    return true;
  }
  restore(at: PlanetId) {
    if (
      !this.canManage ||
      !this.w.omega.state.ending ||
      !this.hasTech("localRestoration") ||
      this.state.restored.includes(at) ||
      !this.powered(at, "ancientResearch") ||
      !this.exchange(at, {
        civilizationCore: 1,
        robotAssembly: 3,
        universalSupport: 2,
      })
    )
      return this.fail(
        "엔딩 · 지역 복원 연구 · 현지 고대 연구 센터 전력 및 재료 필요",
      );
    this.state.restored.push(at);
    this.award("restore-" + at, 200);
    this.changed(at.toUpperCase() + " 지역 복원");
    return true;
  }
  visitStation() {
    if (
      !this.canManage ||
      !this.state.station.stage ||
      !this.w.space.docked ||
      this.w.space.state.trip
    )
      return this.fail("우주선 또는 착륙장 부근에서 정거장으로 이동하세요.");
    this.state.station.visited = true;
    this.w.enterRegion("station");
    return true;
  }
  leaveStation() {
    if (this.w.region !== "station") return false;
    this.w.enterRegion("ship");
    return true;
  }
  get signals() {
    return (
      this.hasTech("stellarNavigation") &&
      planetIds.some((id) => this.powered(id, "stellarObservatory"))
    );
  }
  quests() {
    if (!this.w.omega.state.ending) return;
    const industrial = planetIds.some((id) =>
      (this.w.space.state.planets[id]?.colony.buildings ?? []).some(
        (b) => Object.hasOwn(industrialRecipes, b.kind) && b.produced > 0,
      ),
    );
    const checks = [
      true,
      this.state.stats.delivered > 0,
      this.state.stats.bought + this.state.stats.sold > 0 &&
        this.state.stats.contracts > 0,
      industrial,
      Object.values(this.state.cities).some((c) => c!.population >= 100),
      this.state.station.stage > 0,
      this.state.station.visited &&
        this.state.routes.some(
          (r) =>
            (r.to === "station" || r.from === "station") && r.delivered > 0,
        ),
      this.state.odyssey,
      this.state.restored.length > 0,
      new Set(
        this.state.routes
          .filter((r) => r.delivered > 0)
          .flatMap((r) => [r.from, r.to]),
      ).size >= 3,
      planetIds.some((id) => this.cityLevel(id) >= 6),
      this.signals,
      this.level === 8,
    ];
    for (let i = 0; i < checks.length; i++) {
      if (!checks[i]) break;
      if (!this.state.quests.includes(i)) {
        this.state.quests.push(i);
        this.award("quest-" + i, 50);
        this.log("문명 임무 " + (79 + i) + " 완료");
      }
    }
  }
  initialize(save?: CivilizationSave, previousClock = Date.now()) {
    this.state = save ? structuredClone(save) : newCivilization(previousClock);
    this.offline(Date.now());
  }
  tick(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.accumulator += Math.min(dt, 1);
    if (this.accumulator >= 1) {
      this.accumulator -= 1;
      this.step(false);
    }
    this.state.lastClock = Math.max(this.state.lastClock, Date.now());
  }
  private step(offline: boolean) {
    const current = this.w.space.state.location;
    this.w.space.capture();
    for (const id of planetIds) {
      if (!this.w.space.state.planets[id] || (!offline && id === current))
        continue;
      this.w.space.withPlanet(id, () => {
        this.w.colony.tick(1, true);
        this.w.survival.production.tick(1);
      });
    }
    this.state.elapsed++;
    for (const ship of [...this.state.ships].sort(
      (a, b) =>
        (this.state.routes.find((r) => r.id === b.route)?.priority ?? 0) -
          (this.state.routes.find((r) => r.id === a.route)?.priority ?? 0) ||
        a.id - b.id,
    ))
      this.cargoStep(ship);
    if (this.state.elapsed % 60 === 0) {
      for (const at of this.endpoints) {
        const m = this.market(at);
        for (const item of Object.keys(m) as ItemId[])
          m[item] = Math.max(
            0,
            (m[item] ?? 0) +
              Math.sign(100 - (m[item] ?? 0)) *
                Math.min(10, Math.abs(100 - (m[item] ?? 0))),
          );
      }
      if (!offline) this.autoTrade();
      this.population();
      this.quests();
      this.state.samples.push({
        time: this.state.elapsed,
        credits: this.w.battle.credits,
        population: Object.values(this.state.cities).reduce(
          (n, c) => n + c!.population,
          0,
        ),
        delivered: this.state.stats.delivered,
      });
      if (this.state.samples.length > 120) this.state.samples.shift();
    }
  }
  offline(now: number) {
    const seconds = Math.min(
        14400,
        Math.max(0, Math.floor((now - this.state.lastClock) / 1000)),
      ),
      before = this.state.stats.delivered,
      events = this.w.events.length;
    for (let i = 0; i < seconds; i++) this.step(true);
    this.state.lastClock = Math.max(this.state.lastClock, now);
    this.w.space.capture();
    for (const p of Object.values(this.w.space.state.planets)) {
      p!.colony.lastClock = this.state.lastClock;
      p!.local.lastClock = this.state.lastClock;
    }
    this.w.events.splice(events);
    if (seconds > 5) {
      this.offlineSummary = `비접속 ${seconds}초 · 화물 ${this.state.stats.delivered - before}개 전달 · 자동 거래 제외 · 최대 4시간`;
      this.w.toast(this.offlineSummary);
    }
  }
  plan(item: ItemId, amount = 1) {
    const lines: {
      item: ItemId;
      need: number;
      owned: number;
      transit: number;
      missing: number;
      recipe: string;
      seconds: number;
      cycle: boolean;
    }[] = [];
    const available: Inventory = {};
    for (const at of this.endpoints)
      for (const [id, n] of Object.entries(this.warehouse(at) ?? {}))
        available[id as ItemId] =
          (available[id as ItemId] ?? 0) +
          Math.max(0, n! - this.reserve(at, id as ItemId));
    const visit = (id: ItemId, n: number, path: Set<string>) => {
      const owned = Math.min(n, available[id] ?? 0);
      available[id] = Math.max(0, (available[id] ?? 0) - owned);
      const transit = this.state.ships.reduce(
          (sum, s) => sum + (s.cargo[id] ?? 0),
          0,
        ),
        missing = n - owned;
      const r = Object.values(recipes).find(
        (r) => r.result.kind === "item" && r.result.id === id,
      );
      const cycle = path.has(id);
      lines.push({
        item: id,
        need: n,
        owned,
        transit,
        missing,
        recipe: r?.name ?? "채굴 / 거래 / 운송",
        seconds: r?.seconds ?? 0,
        cycle,
      });
      if (!missing || !r || cycle || path.size > 20) return;
      const next = new Set(path).add(id),
        count = r.result.kind === "item" ? r.result.count : 1;
      for (const [key, v] of Object.entries(r.cost))
        visit(key as ItemId, Math.ceil(missing / count) * v!, next);
    };
    visit(item, amount, new Set());
    return lines;
  }
}
