import { ancientItems } from "../src/ancient/catalog";
import { extremeItems } from "../src/extreme/catalog";
import { spaceItems } from "../src/space/catalog";
import { describe, it, expect } from "vitest";
import { World } from "../src/core/world";
import {
  defaultSettings,
  parseSave,
  SaveStore,
  SAVE_KEY,
} from "../src/save/storage";
import {
  buildings,
  definition,
  colonyTech,
  type BuildingKind,
} from "../src/colony/catalog";
import { technologies } from "../src/survival/catalog";
import { items, type ItemId } from "../src/data/content";
import { emptyInput } from "../src/core/types";
function setup() {
  const w = new World();
  w.progress.quest = 18;
  w.survival.state.blueprint = true;
  w.player.level = 15;
  w.survival.state.technologies = Object.keys(technologies);
  w.survival.state.facilities = [
    "terminal",
    "workbench",
    "refinery",
    "research",
    "equipment",
    "warehouse",
  ];
  w.colony.initialize();
  w.player.x = 3400;
  w.player.y = 716;
  w.survival.state.researchPoints = 100;
  for (const id of Object.keys(items).filter(
    (id) =>
      !Object.hasOwn(spaceItems, id) &&
      !Object.hasOwn(extremeItems, id) &&
      !Object.hasOwn(ancientItems, id),
  ))
    w.survival.state.warehouse[id as ItemId] = 30;
  w.colony.state.technologies = Object.keys(colonyTech);
  return w;
}
function step(w: World, n: number) {
  for (let i = 0; i < n * 4; i++) w.colony.tick(0.25);
}
function build(w: World, kind: BuildingKind, x: number, y = 780) {
  expect(w.colony.placement(kind, x, y), `${kind} placement ${x},${y}`).toBe(
    "",
  );
  expect(w.colony.place(kind, x, y)).toBe(true);
  step(w, 16);
  return w.colony.state.buildings.at(-1)!;
}
describe("colony construction and persistence", () => {
  it("upgrades generation and legacy storage without losing pending work or save validity", () => {
    const w = setup();
    const solar = build(w, "solar", 3400),
      lab = build(w, "lab", 3560);
    const warehouse = w.colony.state.buildings.find(
      (b) => b.kind === "warehouse" && b.legacy,
    )!;
    const before = w.colony.capacity;
    expect(w.colony.upgrade(warehouse.id)).toBe(true);
    expect(w.colony.capacity).toBe(before + 60);
    expect(w.colony.upgrade(solar.id)).toBe(true);
    expect(w.colony.upgrade(lab.id)).toBe(true);
    step(w, 1);
    expect(
      w.colony.networks.find((n) => n.members.includes(solar.id))?.generation,
    ).toBe(27);
    expect(w.colony.facilitySpeed("research")).toBe(1.3);
    expect(
      parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
    ).not.toBeNull();
  });
  it("rejects forged construction refund costs and forces unique core components into one-shot jobs", () => {
    const w = setup();
    build(w, "shipyard", 3400);
    const b = w.colony.state.buildings.at(-1)!;
    expect(w.colony.configure(b.id, "coreStabilizer", true, 999)).toBe(true);
    expect(b.repeat).toBe(false);
    expect(b.target).toBe(1);
    const save = w.snapshot(defaultSettings());
    save.colony.buildings.at(-1)!.paid.ironBar = 999;
    expect(parseSave(JSON.stringify(save))).toBeNull();
  });
  it("migrates v3 without losing old inventory, facilities, quests, or granting a duplicate kit", () => {
    const w = new World();
    w.survival.state.blueprint = true;
    w.progress.quest = 18;
    const old: any = w.snapshot(defaultSettings());
    old.version = 3;
    delete old.colony;
    const save = parseSave(JSON.stringify(old))!;
    expect(save.version).toBe(9);
    const migrated = new World(save);
    expect(
      migrated.colony.state.buildings.filter((b) => b.legacy),
    ).toHaveLength(3);
    expect(migrated.survival.state.warehouse.ironBar).toBe(20);
    const again = new World(migrated.snapshot(defaultSettings()));
    expect(again.survival.state.warehouse.ironBar).toBe(20);
    expect(again.progress.quest).toBe(18);
  });
  it("deducts once, rejects overlaps/unsupported/protected placements, refunds construction atomically", () => {
    const w = setup(),
      before = w.survival.state.warehouse.ironBar!;
    expect(w.colony.place("habitat", 3400, 780)).toBe(true);
    expect(w.survival.state.warehouse.ironBar).toBe(before - 4);
    expect(w.colony.place("habitat", 3400, 780)).toBe(false);
    expect(w.colony.placement("habitat", 3840, 620)).toMatch(/바닥/);
    expect(w.colony.placement("habitat", 480, 780)).toMatch(/보호/);
    expect(w.colony.demolish(w.colony.selected)).toBe(true);
    expect(w.survival.state.warehouse.ironBar).toBe(before);
    expect(w.colony.demolish(w.colony.selected)).toBe(false);
    expect(w.colony.demolish(w.colony.state.buildings[0].id)).toBe(false);
  });
  it("supports floor stacking and blocks removing the supporting floor", () => {
    const w = setup();
    const floor = build(w, "floor", 3440, 620);
    const home = build(w, "habitat", 3440, 620);
    expect(w.colony.platforms.some((p) => p.x === 3440 && p.y === 620)).toBe(
      true,
    );
    expect(w.colony.demolish(floor.id)).toBe(false);
    expect(w.colony.demolish(home.id)).toBe(true);
    expect(w.colony.demolish(floor.id)).toBe(true);
  });
  it("warehouse removal cannot discard excess items; completed construction returns 80 percent", () => {
    const w = setup();
    const store = build(w, "warehouse", 3400);
    expect(w.colony.capacity).toBe(120);
    for (const id of Object.keys(items))
      w.survival.state.warehouse[id as ItemId] = 100;
    expect(w.colony.demolish(store.id)).toBe(false);
    w.survival.state.warehouse = {};
    step(w, 20);
    expect(w.colony.demolish(store.id)).toBe(true);
    expect(w.survival.state.warehouse.ironBar).toBe(2);
    expect(w.colony.capacity).toBe(60);
  });
  it("validates new save data, unique IDs, escrow recipes, bounds and warehouse expansion", () => {
    const w = setup();
    build(w, "warehouse", 3400);
    const save = w.snapshot(defaultSettings());
    expect(parseSave(JSON.stringify(save))).not.toBeNull();
    const bad = structuredClone(save);
    bad.colony.buildings[0].battery = 99999;
    expect(parseSave(JSON.stringify(bad))).toBeNull();
    bad.colony = structuredClone(save.colony);
    bad.colony.buildings.push(bad.colony.buildings[0]);
    expect(parseSave(JSON.stringify(bad))).toBeNull();
    const db = new Map([[SAVE_KEY, JSON.stringify({ ...save, version: 3 })]]);
    const store = new SaveStore({
      getItem: (k) => db.get(k) ?? null,
      setItem: (k, v) => void db.set(k, v),
    });
    expect(store.save(save)).toBe(true);
    expect(db.has(SAVE_KEY + ".backup.v3")).toBe(true);
  });
});
describe("power, automation and offline accounting", () => {
  it("keeps isolated networks separate and rebuilds when relay is stopped", () => {
    const w = setup();
    const a = build(w, "solar", 3400),
      relay = build(w, "relay", 3840),
      consumer = build(w, "workbench", 4160);
    step(w, 1);
    expect(w.colony.statuses.get(consumer.id)?.powered).toBe(false);
    const bridge = build(w, "relay", 3720);
    step(w, 1);
    expect(w.colony.statuses.get(consumer.id)?.powered).toBe(true);
    w.colony.toggle(bridge.id);
    step(w, 1);
    expect(w.colony.statuses.get(consumer.id)?.powered).toBe(false);
    expect(w.colony.networks.length).toBeGreaterThan(1);
    expect(a.id).not.toBe(relay.id);
  });
  it("allocates survival before industry, charges by EU seconds and drains batteries at night", () => {
    const w = setup();
    build(w, "solar", 3400);
    const battery = build(w, "battery", 3560),
      oxygen = build(w, "oxygen", 3640),
      factory = build(w, "factory", 3800);
    step(w, 20);
    expect(battery.battery).toBeGreaterThan(0);
    w.colony.state.day = 800;
    battery.battery = 20;
    step(w, 1);
    expect(w.colony.statuses.get(oxygen.id)?.powered).toBe(true);
    expect(w.colony.statuses.get(factory.id)?.powered).toBe(false);
    expect(battery.battery).toBeLessThan(20);
    step(w, 5);
    expect(battery.battery).toBeCloseTo(0);
    expect(w.colony.statuses.get(oxygen.id)?.powered).toBe(false);
  });
  it("requires real deposits, power and logistics, produces common resources only", () => {
    const w = setup();
    expect(w.colony.placement("miner", 4000, 780)).toMatch(/매장지/);
    build(w, "solar", 3400);
    const miner = build(w, "miner", 3560);
    const before = w.survival.state.warehouse.iron!;
    step(w, 20);
    expect(w.survival.state.warehouse.iron).toBe(before);
    expect(w.colony.statuses.get(miner.id)?.reason).toMatch(/물류/);
    build(w, "warehouse", 3720);
    step(w, 20);
    expect(w.survival.state.warehouse.iron).toBeGreaterThan(before);
    expect(w.progress.counters.auto_iron).toBeGreaterThan(0);
  });
  it("reserves inputs, pauses on lost power, resumes once, and protects minimum reserves", () => {
    const w = setup();
    const solar = build(w, "solar", 3400);
    build(w, "warehouse", 3560);
    const refinery = build(w, "refinery", 3760);
    w.survival.state.warehouse.iron = 5;
    w.survival.state.warehouse.ironBar = 0;
    w.colony.setReserve("iron", 3);
    expect(w.colony.configure(refinery.id, "refine_ironBar", false, 2)).toBe(
      true,
    );
    step(w, 2);
    expect(refinery.job).toBeNull();
    w.colony.setReserve("iron", 0);
    step(w, 0.5);
    expect(w.survival.state.warehouse.iron).toBe(2);
    expect(refinery.job).not.toBeNull();
    w.colony.toggle(solar.id);
    const remaining = refinery.job!.remaining;
    step(w, 5);
    expect(refinery.job!.remaining).toBe(remaining);
    w.colony.toggle(solar.id);
    step(w, 4);
    expect(w.survival.state.warehouse.ironBar).toBe(1);
    expect(refinery.job).toBeNull();
  });
  it("holds output when full and refunds escrow on cancellation without duplication", () => {
    const w = setup();
    build(w, "solar", 3400);
    build(w, "warehouse", 3560);
    const r = build(w, "refinery", 3760);
    w.survival.state.warehouse = { iron: 10 };
    w.colony.configure(r.id, "refine_ironBar", false, 2);
    step(w, 0.5);
    expect(r.job).not.toBeNull();
    const iron = w.survival.state.warehouse.iron!;
    expect(w.colony.configure(r.id, "refine_copperBar", false, 1)).toBe(true);
    expect(w.survival.state.warehouse.iron).toBe(iron + 3);
    expect(r.job).toBeNull();
    expect(w.colony.demolish(r.id)).toBe(true);
    expect(w.survival.state.warehouse.iron).toBe(iron + 3);
  });
  it("limits offline processing to four hours and advances the clock exactly once without attacks", () => {
    const w = setup();
    build(w, "solar", 3400);
    build(w, "warehouse", 3720);
    build(w, "miner", 3560);
    const now = Date.now();
    w.colony.state.lastClock = now - 1000 * 86400;
    const before = w.survival.state.warehouse.iron!;
    w.colony.offline(now);
    const produced = w.survival.state.warehouse.iron! - before;
    expect(produced).toBeLessThanOrEqual(1440);
    expect(w.colony.siege).toBeNull();
    w.colony.offline(now);
    expect(w.survival.state.warehouse.iron).toBe(before + produced);
    w.colony.offline(now - 5000);
    expect(w.survival.state.warehouse.iron).toBe(before + produced);
    expect(w.colony.state.lastClock).toBe(now);
  });
});
describe("colony defense and living facilities", () => {
  it("holds a finished output through save/reload until storage is available", () => {
    const w = setup();
    build(w, "solar", 3400);
    const r = build(w, "refinery", 3560);
    build(w, "warehouse", 3720);
    w.survival.state.warehouse = { iron: 3 };
    w.colony.configure(r.id, "refine_ironBar", false, 1);
    step(w, 0.5);
    w.survival.state.warehouse = { scrap: 120 * 99 };
    step(w, 5);
    expect(r.job?.remaining).toBe(0);
    expect(w.survival.state.warehouse.ironBar).toBeUndefined();
    const save = parseSave(JSON.stringify(w.snapshot(defaultSettings())))!;
    expect(save).not.toBeNull();
    const loaded = new World(save);
    loaded.survival.state.warehouse.scrap! -= 99;
    step(loaded, 1);
    expect(loaded.survival.state.warehouse.ironBar).toBe(1);
    step(loaded, 10);
    expect(loaded.survival.state.warehouse.ironBar).toBe(1);
    expect(loaded.colony.find(r.id)?.job).toBeNull();
  });
  it("robot work consumes repair supplies, waits without power and returns to charge", () => {
    const w = setup();
    const gen = build(w, "crystalGen", 3400);
    const station = build(w, "robotStation", 3560);
    const wall = build(w, "wall", 3760);
    wall.hp = 50;
    expect(w.colony.addRobot("repair", station.id)).toBe(true);
    const r = w.colony.state.robots[0],
      before = w.survival.state.warehouse.ironBar!;
    step(w, 30);
    expect(wall.hp).toBeGreaterThan(50);
    expect(w.survival.state.warehouse.ironBar).toBeLessThan(before);
    w.colony.toggle(gen.id);
    step(w, 1);
    expect(r.state).toBe("Waiting");
    w.colony.toggle(gen.id);
    r.charge = 5;
    step(w, 3);
    expect(["Returning", "Charging"]).toContain(r.state);
    step(w, 12);
    expect(r.charge).toBeGreaterThan(50);
    expect(w.colony.demolish(station.id)).toBe(false);
  });
  it("a manual queue pauses offline when fuel runs out and resumes without taking inputs again", () => {
    const w = setup();
    const g = build(w, "crystalGen", 3400);
    build(w, "lab", 3560);
    w.survival.state.warehouse = { data: 10, resin: 1 };
    w.survival.state.technologies = w.survival.state.technologies.filter(
      (id) => id !== "bio",
    );
    expect(w.survival.research.start("bio")).toBe(true);
    const job = w.survival.state.jobs[0];
    g.fuel = 0.25;
    w.colony.state.lastClock = Date.now() - 60000;
    w.colony.offline(Date.now());
    expect(job.remaining).toBeGreaterThan(0);
    expect(job.state).toBe("working");
    w.survival.state.warehouse.crystal = 1;
    step(w, 1);
    w.survival.production.tick(10);
    expect(job.state).toBe("ready");
    expect(w.survival.production.claim(job.id)).toBe(true);
    expect(w.survival.production.claim(job.id)).toBe(false);
  });
  it("uses actual turret hits, no repeated loot, preserves broken facilities, aborts away from base", () => {
    const w = setup();
    build(w, "crystalGen", 3400);
    build(w, "warehouse", 3560);
    build(w, "relay", 3720);
    const radar = build(w, "radar", 3840);
    build(w, "turret", 4000);
    const wall = build(w, "wall", 4160);
    w.player.invulnerable = 9999;
    expect(w.colony.startSiege()).toBe(true);
    step(w, 31);
    expect(w.colony.siege?.phase).toBe("fighting");
    const enemy = w.enemies.find((e) => e.noLoot)!;
    enemy.x = 4100;
    const hp = enemy.hp;
    step(w, 2);
    expect(enemy.hp).toBeLessThan(hp);
    expect(w.battle.credits).toBe(0);
    wall.hp = 0;
    w.colony.invalidate();
    expect(w.colony.repair(wall.id)).toBe(true);
    expect(wall.hp).toBe(300);
    w.enterRegion("forest");
    step(w, 1);
    expect(w.colony.siege).toBeNull();
    expect(w.colony.find(radar.id)).toBeTruthy();
  });
  it("keeps construction locked before the blueprint and gameplay movement intact", () => {
    const w = new World();
    expect(w.colony.place("solar", 3400, 780)).toBe(false);
    for (let i = 0; i < 100; i++)
      w.update(0.016, { ...emptyInput(), right: true });
    expect(w.player.x).toBeGreaterThan(600);
    expect(w.colony.state.enabled).toBe(false);
  });
});
