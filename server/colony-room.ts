import { Room } from "./room";
import { Store, opaque } from "./database";
import { World } from "../src/core/world";
import { items, type ItemId } from "../src/data/content";
import {
  buildings,
  colonyTech,
  BASE_END,
  type BuildingKind,
} from "../src/colony/catalog";
import { occupiedSlots } from "../src/systems/inventory";
import {
  permitted,
  type Character,
  type Command,
  type Permission,
  type Bag,
  type View,
} from "../shared/online";
import type { ColonyState, ColonyView, Trade } from "../shared/colony-online";
import { requireThat as need, text, integer, keys, record } from "./validation";
const tradable = new Set([
  "iron",
  "copper",
  "crystal",
  "fiber",
  "biomass",
  "scrap",
  "gel",
  "tissue",
  "medkit",
  "ironBar",
  "copperBar",
  "wafer",
  "wovenFiber",
  "refinedCell",
  "alloy",
  "electronics",
  "titaniumBar",
  "denseCell",
  "medicalGel",
  "energyCell",
]);
export class ColonyRoom extends Room {
  engine: World;
  private economyClock = 0;
  declare state: ColonyState;
  constructor(state: ColonyState, store: Store) {
    super(state, store);
    this.engine = new World(state.economy);
    if (!state.economy) {
      this.engine.inventory = {};
      this.engine.survival.state.blueprint = true;
      this.engine.colony.initialize();
    }
    this.state.trades ??= [];
    this.state.restricted ??= {};
    for (const t of [...this.state.trades]) this.cancel(t);
    this.sync();
    this.store.save(this.state);
  }
  static override create(
    store: Store,
    account: { id: string; name: string },
    name: string,
    limit: number,
  ) {
    const base = Room.create(store, account, name, limit);
    return new ColonyRoom(base.state, store);
  }
  override credit(c: Character, n: number) {
    const reserved = (this.state.trades ?? []).reduce(
      (sum, t) => sum + (t.offers[c.id]?.credits ?? 0),
      0,
    );
    c.credits = Math.min(1e9 - reserved, c.credits + n);
  }
  sync() {
    this.engine.civilization.state.lastClock = Date.now();
    this.state.economy = this.engine.snapshot(this.engine.settings);
  }
  override command(id: string, cmd: Command) {
    const previous = this.state,
      result = super.command(id, cmd);
    if (this.state !== previous)
      this.engine = new World({
        ...this.state.economy!,
        savedAt: Date.now(),
        civilization: {
          ...this.state.economy!.civilization!,
          lastClock: Date.now(),
        },
      });
    return result;
  }
  override connect(id: string) {
    if (
      !Object.values(this.state.characters).some((c) => c.connected) &&
      this.state.economy
    ) {
      this.engine = new World(this.state.economy);
      this.sync();
    }
    super.connect(id);
  }
  override disconnect(id: string) {
    for (const t of [...(this.state.trades ?? [])])
      if (t.from === id || t.to === id) this.cancel(t);
    this.sync();
    super.disconnect(id);
  }
  protected access(c: Character, p: Permission) {
    need(permitted(c, p), "이 작업에 필요한 월드 권한이 없습니다.");
  }
  protected base(c: Character) {
    need(
      c.region === "crash" && !c.instance && !c.downUntil,
      "EDEN 기지에서 이용하세요.",
    );
  }
  protected bag(bag: Bag, item: string, n: number, capacity = 200) {
    need(Object.hasOwn(items, item), "알 수 없는 자원");
    need(Number.isSafeInteger(n) && n >= 0 && n <= 99999, "수량 오류");
    const next = { ...bag, [item]: (bag[item] ?? 0) + n };
    need(
      next[item] <= 99999 && occupiedSlots(next) <= capacity,
      "개인 보관 한도입니다.",
    );
    Object.assign(bag, next);
  }
  protected take(bag: Bag, item: string, n: number) {
    need(
      Number.isSafeInteger(n) && n >= 0 && (bag[item] ?? 0) >= n,
      "자원이 부족합니다.",
    );
    bag[item] = (bag[item] ?? 0) - n;
  }
  private trade(c: Character, a: Record<string, unknown>) {
    const t = this.state.trades!.find((t) => t.id === text(a.trade));
    need(t && (t.from === c.id || t.to === c.id), "거래를 찾을 수 없습니다.");
    return t;
  }
  private refund(t: Trade, id: string) {
    const c = this.state.characters[id],
      o = t.offers[id];
    if (!o) return;
    for (const [k, n] of Object.entries(o.items))
      c.inventory[k] = (c.inventory[k] ?? 0) + n;
    c.credits += o.credits;
    t.offers[id] = { items: {}, credits: 0 };
  }
  private cancel(t: Trade) {
    this.refund(t, t.from);
    this.refund(t, t.to);
    this.state.trades = this.state.trades!.filter((v) => v.id !== t.id);
  }
  override action(
    c: Character,
    action: string,
    a: Record<string, unknown>,
  ): unknown {
    const result = this.colonyAction(c, action, a);
    this.sync();
    return result;
  }
  protected colonyAction(
    c: Character,
    action: string,
    a: Record<string, unknown>,
  ): unknown {
    const w = this.engine;
    switch (action) {
      case "shuttle": {
        keys(a, []);
        this.base(c);
        need(
          Math.abs(c.body.x - 360) < 180 || c.body.x >= 3200,
          "캠프 또는 건설 구역에서 탑승하세요.",
        );
        c.body.x = c.body.x >= 3200 ? 360 : 3400;
        c.body.y = 716;
        c.body.vx = c.body.vy = 0;
        this.inputs.delete(c.id);
        return;
      }
      case "build": {
        keys(a, ["kind", "x", "y"]);
        this.access(c, "build");
        this.base(c);
        const kind = text(a.kind) as BuildingKind;
        need(Object.hasOwn(buildings, kind), "알 수 없는 건물");
        const x = integer(a.x, 40, BASE_END),
          y = integer(a.y, 300, 780);
        need(
          w.colony.place(kind, x, y),
          w.colony.placement(kind, x, y) || "건설할 수 없습니다.",
        );
        this.audit(c, `${buildings[kind].name} 건설 (${x}, ${y})`);
        this.quest(c, 95);
        return;
      }
      case "demolish":
      case "upgrade": {
        keys(a, ["building"]);
        this.access(c, action);
        this.base(c);
        need(
          w.colony[action](integer(a.building, 1, 1e6)),
          "시설 상태·재료·연구·남은 창고 용량을 확인하세요.",
        );
        this.audit(c, `시설 ${a.building} ${action}`);
        return;
      }
      case "configure": {
        keys(a, ["building", "recipe", "repeat", "target"]);
        this.access(c, "configure");
        this.base(c);
        need(typeof a.repeat === "boolean", "반복 설정 오류");
        need(
          w.colony.configure(
            integer(a.building, 1, 1e6),
            text(a.recipe),
            a.repeat,
            integer(a.target, 1, 999),
          ),
          "레시피 또는 시설 상태를 확인하세요.",
        );
        this.audit(c, `생산 설정 ${a.building} → ${a.recipe}`);
        return;
      }
      case "power": {
        keys(a, ["building"]);
        this.access(c, "configure");
        this.base(c);
        const b = w.colony.find(integer(a.building, 1, 1e6));
        need(b, "시설 없음");
        b.enabled = !b.enabled;
        w.colony.invalidate();
        this.audit(c, `시설 ${b.id} 전원 ${b.enabled ? "켜짐" : "꺼짐"}`);
        return;
      }
      case "research": {
        keys(a, ["technology"]);
        this.access(c, "research");
        this.base(c);
        const id = text(a.technology);
        need(
          Object.hasOwn(colonyTech, id) &&
            !Object.values(w.space.state.planets).some(
              (p) => p?.colony.research?.id === id,
            ) &&
            w.colony.startResearch(id),
          "선행 연구·전력이 공급된 연구소·자원·연구 포인트를 확인하세요.",
        );
        this.audit(c, `공동 연구 ${colonyTech[id].name}`);
        return;
      }
      case "researchSample": {
        keys(a, ["count"]);
        this.access(c, "deposit");
        this.base(c);
        const n = integer(a.count, 1, 100);
        this.take(c.inventory, "crystal", n);
        w.survival.state.researchPoints = Math.min(
          1e6,
          w.survival.state.researchPoints + n * 2,
        );
        this.audit(c, `개인 결정 ${n} → 공동 연구 포인트 ${n * 2}`);
        return;
      }
      case "transfer": {
        keys(a, ["item", "count", "from", "to"]);
        this.base(c);
        const item = text(a.item),
          n = integer(a.count, 1, 9999),
          from = text(a.from),
          to = text(a.to);
        const stores: Record<string, Bag> = {
          inventory: c.inventory,
          personal: c.storage,
          shared: w.survival.state.warehouse as Bag,
          restricted: this.state.restricted!,
        };
        need(
          Object.hasOwn(stores, from) &&
            Object.hasOwn(stores, to) &&
            from !== to,
          "보관함 오류",
        );
        need(Object.hasOwn(items, item), "자원 오류");
        if (["shared", "restricted"].includes(from)) this.access(c, "withdraw");
        if (["shared", "restricted"].includes(to)) this.access(c, "deposit");
        if (from === "restricted" || to === "restricted")
          need(
            c.role === "OWNER" || c.role === "ADMIN",
            "관리자 보관함입니다.",
          );
        this.take(stores[from], item, n);
        this.bag(
          stores[to],
          item,
          n,
          to === "shared" ? w.colony.capacity : 200,
        );
        need(
          occupiedSlots(w.survival.state.warehouse) <= w.colony.capacity,
          "공동 창고가 가득 찼습니다.",
        );
        if (to === "shared" && !c.tutorial.includes(6)) c.tutorial.push(6);
        this.audit(c, `${from} → ${to}: ${items[item as ItemId].name} ${n}`);
        return;
      }
      case "funds": {
        keys(a, ["amount", "deposit"]);
        this.base(c);
        need(typeof a.deposit === "boolean", "입금/출금 오류");
        this.access(c, a.deposit ? "deposit" : "withdraw");
        const n = integer(a.amount, 1, 1e8);
        const shared = w.battle.credits;
        if (a.deposit) {
          need(c.credits >= n && shared + n <= 1e9, "잔액 또는 한도 오류");
          c.credits -= n;
          w.battle.credits += n;
        } else {
          need(shared >= n && c.credits + n <= 1e9, "잔액 또는 한도 오류");
          w.battle.credits -= n;
          c.credits += n;
        }
        this.audit(c, `공동 자금 ${a.deposit ? "입금" : "출금"} ${n} CR`);
        return;
      }
      case "tradeRequest": {
        keys(a, ["target"]);
        this.access(c, "trade");
        const target = this.member(a.target);
        need(
          target &&
            target.id !== c.id &&
            target.connected &&
            permitted(target, "trade") &&
            this.near(c, target, 200) &&
            !c.downUntil &&
            !target.downUntil,
          "가까운 거래 가능한 탐험가가 필요합니다.",
        );
        need(
          !this.state.trades!.some((t) =>
            [t.from, t.to].some((id) => id === c.id || id === target.id),
          ),
          "이미 진행 중인 거래가 있습니다.",
        );
        this.state.trades!.push({
          id: opaque(),
          from: c.id,
          to: target.id,
          accepted: false,
          offers: {
            [c.id]: { items: {}, credits: 0 },
            [target.id]: { items: {}, credits: 0 },
          },
          ready: [],
          confirmed: [],
        });
        return;
      }
      case "tradeAccept": {
        keys(a, ["trade"]);
        const t = this.trade(c, a);
        need(t.to === c.id, "받는 사람이 수락해야 합니다.");
        this.access(c, "trade");
        t.accepted = true;
        return;
      }
      case "tradeOffer": {
        keys(a, ["trade", "items", "credits"]);
        this.access(c, "trade");
        const t = this.trade(c, a);
        need(t.accepted, "상대방이 먼저 수락해야 합니다.");
        const offer = record(a.items);
        need(Object.keys(offer).length <= 12, "거래 품목 한도");
        const credit = integer(a.credits, 0, 1e8);
        this.refund(t, c.id);
        const bag: Bag = {};
        for (const [item, value] of Object.entries(offer)) {
          need(tradable.has(item), "이 아이템은 거래할 수 없습니다.");
          const n = integer(value, 1, 9999);
          this.take(c.inventory, item, n);
          bag[item] = n;
        }
        need(c.credits >= credit, "잔액 부족");
        c.credits -= credit;
        t.offers[c.id] = { items: bag, credits: credit };
        t.ready = [];
        t.confirmed = [];
        return;
      }
      case "tradeReady": {
        keys(a, ["trade"]);
        this.access(c, "trade");
        const t = this.trade(c, a);
        need(t.accepted, "수락되지 않은 거래");
        if (!t.ready.includes(c.id)) t.ready.push(c.id);
        return;
      }
      case "tradeConfirm": {
        keys(a, ["trade"]);
        this.access(c, "trade");
        const t = this.trade(c, a);
        need(t.ready.length === 2, "양쪽의 준비 확인이 필요합니다.");
        const other = this.state.characters[c.id === t.from ? t.to : t.from];
        need(
          other.connected &&
            permitted(other, "trade") &&
            this.near(c, other, 200) &&
            !c.downUntil &&
            !other.downUntil,
          "거래 조건이 변경되었습니다.",
        );
        if (!t.confirmed.includes(c.id)) t.confirmed.push(c.id);
        if (t.confirmed.length === 2) {
          for (const [from, to] of [
            [t.from, t.to],
            [t.to, t.from],
          ]) {
            const dest = this.state.characters[to],
              offer = t.offers[from];
            for (const [item, n] of Object.entries(offer.items))
              this.bag(dest.inventory, item, n);
            need(dest.credits + offer.credits <= 1e9, "상대방 잔액 상한");
            dest.credits += offer.credits;
          }
          this.state.trades = this.state.trades!.filter((v) => v.id !== t.id);
          this.audit(c, `${other.name}와 상호 승인 거래 완료`);
        }
        return;
      }
      case "tradeCancel":
        keys(a, ["trade"]);
        this.cancel(this.trade(c, a));
        return;
      default:
        return super.action(c, action, a);
    }
  }
  override terrain(c: Character) {
    return c.region === "crash" ? this.engine.map : super.terrain(c);
  }
  override tick(dt: number) {
    if (Object.values(this.state.characters).some((c) => c.connected)) {
      this.economyClock += dt;
      if (this.economyClock >= 0.25) {
        const step = this.economyClock;
        this.economyClock = 0;
        this.engine.colony.tick(step, false);
        this.engine.survival.production.tick(step);
        this.engine.civilization.tick(step);
        const sharedTech = [
          ...new Set(
            Object.values(this.engine.space.state.planets).flatMap(
              (p) => p?.colony.technologies ?? [],
            ),
          ),
        ];
        for (const planet of Object.values(this.engine.space.state.planets))
          if (planet) planet.colony.technologies = [...sharedTech];
        this.engine.events = [];
        this.sync();
        if (
          this.engine.colony.state.technologies.length &&
          this.engine.colony.state.buildings.some((b) => b.produced > 0)
        )
          for (const c of Object.values(this.state.characters))
            if (c.connected && c.quests.includes(95)) this.quest(c, 96);
      }
    }
    super.tick(dt);
  }
  override view(id: string): View {
    const view = super.view(id),
      w = this.engine,
      c = this.state.characters[id];
    const extension: ColonyView = {
      colony: w.colony.state,
      warehouse: w.survival.state.warehouse as Bag,
      restricted:
        c.role === "OWNER" || c.role === "ADMIN" ? this.state.restricted! : {},
      funds: w.battle.credits,
      points: w.survival.state.researchPoints,
      technologies: w.survival.state.technologies,
      capacity: w.colony.capacity,
      buildings: w.colony.state.buildings.map((b) => ({
        id: b.id,
        name: buildings[b.kind].name,
        powered: !!w.colony.statuses.get(b.id)?.powered,
        reason: w.colony.statuses.get(b.id)?.reason ?? "",
        recipes: w.colony
          .recipeList(b)
          .map((r) => ({ id: r.id, name: r.name })),
      })),
      trades: this.state.trades!.filter((t) => t.from === id || t.to === id),
    };
    view.extension = extension as unknown as Record<string, unknown>;
    return view;
  }
}
