import { civilReady, build, ports } from "./fixtures/civilization";
import { describe, it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import {
  defaultSettings,
  parseSave,
  SaveStore,
  SAVE_KEY,
} from "../src/save/storage";
import { technologies, recipes } from "../src/survival/catalog";
import {
  buildings,
  colonyTech,
  type BuildingKind,
} from "../src/colony/catalog";
import { planetIds } from "../src/space/catalog";
import { marketPrices } from "../src/civilization/catalog";
import { validCivilization } from "../src/save/civilization-schema";
function fleet(w: World) {
  w.survival.state.warehouse = {
    alloy: 12,
    electronics: 6,
    hullPanel: 2,
    iron: 100,
    shipFuel: 40,
  };
  expect(w.civilization.buildShip(1, "eden")).toBe(true);
  const id = w.civilization.state.ships[0].id;
  expect(
    w.civilization.createRoute(id, {
      name: "iron link",
      from: "eden",
      to: "ares",
      item: "iron",
      amount: 40,
      minimum: 20,
      target: 80,
      interval: 5,
      priority: 2,
      repeat: true,
    }),
  ).toBe(true);
  return w.civilization.state.ships[0];
}
function ticks(w: World, n: number) {
  for (let i = 0; i < n; i++) {
    w.colony.tick(1, true);
    w.survival.production.tick(1);
    w.civilization.tick(1);
  }
}
function iron(w: World) {
  return (
    (w.civilization.warehouse("eden")?.iron ?? 0) +
    (w.civilization.warehouse("ares")?.iron ?? 0) +
    w.civilization.state.ships.reduce((n, s) => n + (s.cargo.iron ?? 0), 0)
  );
}
describe("Galactic civilization", () => {
  it("conserves resources through every flight state and save/reload, stops at target and origin reserve", () => {
    let w = ports();
    fleet(w);
    const seen = new Set();
    for (let i = 0; i < 180; i++) {
      ticks(w, 1);
      expect(iron(w)).toBe(100);
      seen.add(w.civilization.state.ships[0].state);
      if (i % 13 === 0) {
        const save = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
        expect(save).not.toBeNull();
        w = new World(save!);
      }
    }
    expect(w.civilization.warehouse("ares")!.iron).toBe(80);
    expect(w.civilization.warehouse("eden")!.iron).toBe(20);
    expect(seen.has("InTransit")).toBe(true);
    expect(seen.has("Returning")).toBe(true);
    expect(w.civilization.state.stats.delivered).toBe(80);
  });
  it("holds full-destination cargo, recalls it safely and refuses a duplicate ship assignment", () => {
    const w = ports(),
      s = fleet(w),
      c = w.civilization;
    const r = { ...c.state.routes[0] };
    expect(c.createRoute(s.id, r)).toBe(false);
    w.space.state.planets.ares!.local.warehouse = { copper: 5940 };
    ticks(w, 45);
    expect(s.state).toBe("Waiting");
    expect(s.cargo.iron).toBe(40);
    expect(iron(w)).toBe(100);
    expect(c.recall(s.id)).toBe(true);
    ticks(w, 35);
    expect(s.cargo.iron ?? 0).toBe(0);
    expect(c.warehouse("eden")!.iron).toBe(100);
    expect(c.state.stats.delivered).toBe(0);
  });
  it("never loads empty cargo or consumes fuel without sufficient inventory and never spends protected reserves", () => {
    const w = ports(),
      s = fleet(w),
      c = w.civilization;
    w.survival.state.warehouse.shipFuel = 3;
    ticks(w, 3);
    expect(s.state).toBe("Refueling");
    expect(iron(w)).toBe(100);
    expect(s.cargo).toEqual({});
    w.survival.state.warehouse.shipFuel = 40;
    w.colony.state.reserve.iron = 100;
    ticks(w, 5);
    expect(w.survival.state.warehouse.shipFuel).toBe(40);
    expect(s.cargo).toEqual({});
  });
  it("uses quantity-sensitive prices without buy/sell arbitrage, rejects unique items, and is atomic on full storage", () => {
    const w = ports(),
      c = w.civilization;
    w.battle.credits = 100000;
    c.market("eden").iron = 1100;
    const before = w.battle.credits;
    expect(c.trade("eden", "iron", 1000, "buy")).toBe(true);
    expect(c.trade("eden", "iron", 1000, "sell")).toBe(true);
    expect(w.battle.credits).toBeLessThan(before);
    expect(c.trade("eden", "genesisFragment", 1, "sell")).toBe(false);
    w.survival.state.warehouse = { copper: 5940 };
    const cr = w.battle.credits,
      stock = c.market("eden").iron;
    expect(c.trade("eden", "iron", 1, "buy")).toBe(false);
    expect(w.battle.credits).toBe(cr);
    expect(c.market("eden").iron).toBe(stock);
  });
  it("bounds auto-trade by the reserve and per-window budget and completes each contract once", () => {
    const w = ports(),
      c = w.civilization;
    w.survival.state.warehouse = { alloy: 10, electronics: 5 };
    expect(c.contract("eden")).toBe(true);
    expect(c.contract("eden")).toBe(false);
    w.battle.credits = 1050;
    expect(
      c.addRule({
        at: "eden",
        item: "iron",
        side: "buy",
        threshold: 100,
        target: 100,
        batch: 100,
        price: 100,
        reserve: 1000,
        budget: 25,
      }),
    ).toBe(true);
    ticks(w, 60);
    expect(w.battle.credits).toBeGreaterThanOrEqual(1025);
    expect(w.battle.credits).toBeLessThan(1050);
  });
  it("advances unified offline time once, excludes trading and raids and respects backwards clocks", () => {
    const w = ports(),
      c = w.civilization;
    fleet(w);
    w.battle.credits = 500;
    const now = Date.now();
    c.state.lastClock = now - 180000;
    c.offline(now);
    expect(c.state.elapsed).toBe(180);
    expect(c.state.stats.delivered).toBe(80);
    expect(w.battle.credits).toBe(500);
    const data = JSON.stringify(c.state);
    c.offline(now);
    c.offline(now - 5000);
    expect(JSON.stringify(c.state)).toBe(data);
    expect(w.colony.siege).toBeNull();
  });
  it("caps long absences at four hours and retains bounded sample/log storage", () => {
    const w = new World(),
      c = w.civilization,
      now = Date.now();
    c.state.lastClock = now - 86400000;
    c.offline(now);
    expect(c.state.elapsed).toBe(14400);
    expect(c.state.samples).toHaveLength(120);
    expect(c.state.logs.length).toBeLessThanOrEqual(80);
    expect(
      parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
    ).not.toBeNull();
  }, 20000);
  it("executes a cross-planet manufacturing recipe once with exact reservation and output", () => {
    const w = civilReady();
    build(w, "megaSolar", 3400);
    build(w, "warehouse", 3600);
    const b = build(w, "spaceshipComplex", 3760);
    w.survival.state.warehouse = { ...recipes.starEngine.cost };
    expect(w.colony.configure(b.id, "starEngine", false, 1)).toBe(true);
    for (let i = 0; i < 65; i++) w.colony.tick(1, true);
    expect(w.survival.state.warehouse.starEngine).toBe(1);
    expect(w.survival.state.warehouse.industrialAlloy).toBe(0);
    expect(b.produced).toBe(1);
    expect(
      parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
    ).not.toBeNull();
  });
  it("does not invent resources in the planner and detects dependency cycles", () => {
    const w = ports(),
      c = w.civilization;
    w.survival.state.warehouse = {};
    const before = JSON.stringify(
      w.snapshot(defaultSettings()).survival.warehouse,
    );
    expect(
      c
        .plan("starEngine")
        .some((r) => r.item === "coolingCell" && r.missing > 0),
    ).toBe(true);
    expect(JSON.stringify(w.survival.state.warehouse)).toBe(before);
    const old = recipes.starEngine.cost;
    recipes.starEngine.cost = { starEngine: 1 };
    expect(c.plan("starEngine").some((r) => r.cycle)).toBe(true);
    recipes.starEngine.cost = old;
  });
  it("migrates v8 with a backup, rejects malformed ownership, duplicate IDs, invalid endpoints and nonfinite counters", () => {
    const w = ports();
    fleet(w);
    const save = w.snapshot(defaultSettings()),
      old = { ...save, version: 8 };
    delete old.civilization;
    const migrated = parseSave(JSON.stringify(old));
    expect(migrated?.version).toBe(9);
    expect(migrated?.civilization?.ships).toEqual([]);
    const db = new Map([[SAVE_KEY, JSON.stringify(old)]]),
      store = new SaveStore({
        getItem: (k) => db.get(k) ?? null,
        setItem: (k, v) => {
          db.set(k, v);
        },
      });
    expect(store.save(save)).toBe(true);
    expect(db.has(SAVE_KEY + ".backup.v8")).toBe(true);
    for (const mutate of [
      (s: any) => (s.ships[0].owner = "other"),
      (s: any) => s.ships.push(s.ships[0]),
      (s: any) => (s.routes[0].to = "void"),
      (s: any) => (s.stats.delivered = Infinity),
      (s: any) => (s.ships[0].cargo.iron = -1),
    ]) {
      const bad = structuredClone(save.civilization);
      mutate(bad);
      expect(validCivilization(bad, save.space)).toBe(false);
    }
  });
  it("station interior is safe on every orbit and does not expose a second copy of the planet warehouse", () => {
    const w = ports(),
      c = w.civilization;
    c.state.station.stage = 1;
    w.survival.state.warehouse.iron = 10;
    expect(c.visitStation()).toBe(true);
    expect(w.region).toBe("station");
    for (const id of planetIds) {
      w.space.state.location = id;
      w.player.x = 2000;
      expect(w.extreme.physics.swimming).toBe(false);
      expect(w.extreme.active).toBe(false);
      expect(w.space.gravity).toBe(0.9);
      expect(w.survival.environment.kind).toBe("safe");
    }
    w.space.state.location = "eden";
    for (let i = 0; i < 30; i++) w.update(0.05, emptyInput());
    expect(c.state.station.warehouse.iron).toBeUndefined();
    expect(c.leaveStation()).toBe(true);
    expect(w.region).toBe("ship");
    expect(c.warehouse("eden")!.iron).toBe(10);
  });
});
it("grows a supplied city, allocates workforce once per resident, and does not kill residents on shortage", () => {
  const w = civilReady();
  build(w, "megaSolar", 3400);
  build(w, "megaSolar", 3600);
  build(w, "megaRefinery", 3800);
  build(w, "cityHabitat", 4000);
  build(w, "megaSolar", 4200);
  build(w, "oxygen", 4400);
  build(w, "cityClinic", 4560);
  w.space.capture();
  w.survival.state.warehouse = { colonyRation: 500 };
  ticks(w, 720);
  const c = w.civilization,
    city = c.city("eden");
  expect(city.population).toBeGreaterThanOrEqual(500);
  expect(city.wellbeing).toBeGreaterThanOrEqual(80);
  const allocated = c.workforce("eden").reduce((n, r) => n + r.assigned, 0);
  expect(allocated).toBeLessThanOrEqual(city.population);
  w.survival.state.warehouse = {};
  const population = city.population;
  ticks(w, 120);
  expect(city.population).toBe(population);
  expect(city.wellbeing).toBeLessThan(100);
  expect(city.supplied).toBe(false);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
});
it("builds station stages and ODYSSEY with actual deliveries, retains cargo and rejects duplicate payments", () => {
  const w = ports(),
    c = w.civilization;
  for (const id of ["eden", "ares", "frostia"] as const) {
    w.space.switchPlanet(id);
    w.colony.state.technologies = Object.keys(colonyTech);
    if (id === "frostia") {
      build(w, "megaSolar", 3400);
      build(w, "industrialPort", 3600);
    }
    build(w, "megaRefinery", 3800);
    w.colony.tick(1, true);
  }
  w.space.switchPlanet("eden");
  w.colony.tick(1, true);
  w.survival.state.warehouse = {
    industrialAlloy: 30,
    quantumCircuit: 10,
    hullPanel: 10,
  };
  expect(c.buildStation()).toBe(true);
  expect(c.state.station.stage).toBe(1);
  c.state.station.warehouse = {
    starEngine: 2,
    universalSupport: 3,
    denseCell: 20,
  };
  expect(c.buildStation()).toBe(true);
  w.space.state.cargo = { iron: 7 };
  c.state.station.warehouse = {
    starEngine: 3,
    universalSupport: 2,
    transcendentReactor: 1,
  };
  expect(c.buildOdyssey()).toBe(true);
  expect(c.buildOdyssey()).toBe(false);
  expect(w.space.capacity).toBe(600);
  expect(w.space.state.cargo.iron).toBe(7);
  expect(c.state.station.warehouse.starEngine).toBe(0);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
});
it("refuses an invalid save without overwriting the last good snapshot", () => {
  const w = ports(),
    s = w.snapshot(defaultSettings());
  const db = new Map([[SAVE_KEY, JSON.stringify(s)]]),
    store = new SaveStore({
      getItem: (k) => db.get(k) ?? null,
      setItem: (k, v) => {
        db.set(k, v);
      },
    });
  s.civilization!.reputation = -1;
  const original = db.get(SAVE_KEY);
  expect(store.save(s)).toBe(false);
  expect(db.get(SAVE_KEY)).toBe(original);
});
it("servicing a freighter blocked by a full warehouse never resets or overwrites its cargo", () => {
  const w = ports(),
    s = fleet(w),
    c = w.civilization;
  w.space.state.planets.ares!.local.warehouse = { copper: 5940 };
  ticks(w, 45);
  expect(s.state).toBe("Waiting");
  expect(c.service(s.id)).toBe(true);
  ticks(w, 3);
  expect(s.cargo.iron).toBe(40);
  expect(iron(w)).toBe(100);
  expect(s.state).toBe("Waiting");
});
it("enforces the automatic price ceiling for every unit of a large order", () => {
  const w = ports(),
    c = w.civilization;
  w.survival.state.warehouse = {};
  w.battle.credits = 10000;
  const maximum = c.quote("eden", "iron", "buy");
  expect(
    c.addRule({
      at: "eden",
      item: "iron",
      side: "buy",
      threshold: 100,
      target: 100,
      batch: 100,
      price: maximum,
      reserve: 0,
      budget: 1000,
    }),
  ).toBe(true);
  ticks(w, 60);
  const bought = w.survival.state.warehouse.iron ?? 0;
  expect(bought).toBeGreaterThan(0);
  expect(bought).toBeLessThan(100);
  expect(10000 - w.battle.credits).toBeLessThanOrEqual(bought * maximum);
});
it("station orbit does not apply ARES heat or FROSTIA ice to the indoor player", () => {
  const w = ports();
  w.space.switchPlanet("ares");
  w.enterRegion("station");
  w.space.state.heat = 30;
  w.space.state.weather = 110;
  for (let i = 0; i < 40; i++) w.space.tick(0.05, emptyInput());
  expect(w.space.state.heat).toBeLessThan(30);
  w.space.switchPlanet("frostia");
  w.enterRegion("station");
  expect(w.extreme.friction).toBe(1);
});
