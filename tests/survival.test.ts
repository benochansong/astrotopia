import {desertGear} from '../src/space/catalog';
import { describe, it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import { defaultSettings, parseSave } from "../src/save/storage";
import {
  recipes,
  technologies,
  environmentGear,
} from "../src/survival/catalog";
import { regions, questData, type ItemId } from "../src/data/content";
import { EquipmentSystem } from "../src/combat/EquipmentSystem";
const step = (w: World, n: number, input = emptyInput()) => {
  for (let t = 0; t < n; t += 1 / 60) w.update(1 / 60, input);
};
const base = () => {
  const w = new World();
  w.player.level = 15;
  w.survival.state.facilities = [
    "terminal",
    "workbench",
    "refinery",
    "research",
    "equipment",
    "warehouse",
  ];
  return w;
};
const complete = (w: World) => {
  w.survival.production.tick(1000);
  for (const j of [...w.survival.state.jobs])
    expect(w.survival.production.claim(j.id)).toBe(true);
};
describe("Survival Protocol", () => {
  it("migrates phase 2 without changing battle gear, quests or resources", () => {
    const w = base();
    w.battle.gear.push({ id: "gear-1", template: "body", rarity: "epic" });
    w.progress.quest = 10;
    w.inventory.iron = 10;
    const old: any = w.snapshot(defaultSettings());
    old.version = 2;
    delete old.survival;
    const s = parseSave(JSON.stringify(old))!;
    expect(s.version).toBe(5);
    expect(s.progress.quest).toBe(10);
    expect(s.battle).toEqual(w.battle);
    expect(s.inventory.iron).toBe(10);
    expect(s.survival.capacity).toBe(24);
  });
  it("does not drain oxygen in breathable EDEN and gives a grace period in caves", () => {
    const w = base();
    step(w, 20);
    expect(w.survival.state.oxygen).toBe(100);
    w.enterRegion("caverns");
    w.player.x = 550;
    step(w, 3);
    expect(w.survival.state.oxygen).toBe(100);
    step(w, 20);
    expect(w.survival.state.oxygen).toBeLessThan(90);
  });
  it("applies mask and radiation suit resistance and recovers exposure in shelters", () => {
    const w = base();
    w.enterRegion("marsh");
    w.player.x = 550;
    step(w, 24);
    expect(w.survival.state.exposure.toxic).toBeGreaterThan(40);
    w.survival.state.owned = ["mask", "radiation"];
    w.survival.equip("mask");
    const before = w.survival.state.exposure.toxic;
    step(w, 10);
    expect(w.survival.state.exposure.toxic).toBeLessThanOrEqual(before);
    w.enterRegion("ruins");
    w.player.x = 550;
    w.survival.equip("radiation");
    step(w, 24);
    expect(w.survival.state.exposure.radiation).toBe(0);
    w.player.x = 250;
    step(w, 12);
    expect(w.survival.state.exposure.toxic).toBe(0);
  });
  it("consumes oxygen supplies once with cooldown and retains independent weapon slots", () => {
    const w = base();
    w.survival.state.oxygen = 0;
    w.inventory.oxygenCan = 2;
    expect(w.survival.use("oxygenCan")).toBe(true);
    expect(w.survival.use("oxygenCan")).toBe(false);
    expect(w.survival.state.oxygen).toBe(90);
    expect(w.inventory.oxygenCan).toBe(1);
    const slots = [...w.battle.weaponSlots];
    w.survival.state.tool = 3;
    expect(w.battle.weaponSlots).toEqual(slots);
  });
  it("blocks high-tier mining, cancels on movement, consumes energy only on success", () => {
    const w = base();
    w.enterRegion("caverns");
    const n = w.map.resources.find((n) => n.item === "titanium")!;
    w.player.x = n.x - 17;
    w.player.y = n.y - 64;
    expect(w.survival.mining.start(n)).toBe(false);
    w.survival.state.tool = 2;
    w.survival.state.tools.push(2);
    expect(w.survival.mining.start(n)).toBe(true);
    step(w, 0.1, { ...emptyInput(), left: true });
    expect(w.mining).toBeNull();
    w.player.x = n.x - 17;
    w.player.vx = 0;
    w.survival.mining.start(n);
    step(w, 3);
    expect(w.inventory.titanium).toBe(12);
    expect(w.cooldowns[n.id]).toBeGreaterThan(40);
    const saved = parseSave(JSON.stringify(w.snapshot(defaultSettings())))!;
    expect(saved.survival.miningCooldowns[n.id]).toBeGreaterThan(40);
  });
  it("spends inventory and warehouse atomically and delivers a queued batch once", () => {
    const w = base();
    w.inventory.iron = 2;
    w.survival.state.warehouse.iron = 7;
    expect(w.survival.refinery.start("refine_ironBar", 3)).toBe(true);
    expect(w.inventory.iron).toBe(0);
    expect(w.survival.state.warehouse.iron).toBe(0);
    expect(w.survival.refinery.start("refine_ironBar")).toBe(false);
    const id = w.survival.state.jobs[0].id;
    w.survival.production.tick(9);
    expect(w.survival.production.claim(id)).toBe(true);
    expect(w.survival.production.claim(id)).toBe(false);
    expect(w.inventory.ironBar).toBe(3);
  });
  it("keeps completed output when both inventories are full", () => {
    const w = base();
    w.inventory.iron = 3;
    w.survival.refinery.start("refine_ironBar");
    w.inventory = { iron: 2376 };
    w.survival.state.warehouse = { copper: 5940 };
    w.survival.production.tick(10);
    const id = w.survival.state.jobs[0].id;
    expect(w.survival.production.claim(id)).toBe(false);
    expect(w.survival.state.jobs).toHaveLength(1);
    w.inventory = {};
    expect(w.survival.production.claim(id)).toBe(true);
    expect(w.inventory.ironBar).toBe(1);
  });
  it("returns cancelled materials exactly once and blocks finished cancellation", () => {
    const w = base();
    w.inventory.iron = 9;
    w.survival.refinery.start("refine_ironBar", 3);
    const id = w.survival.state.jobs[0].id;
    expect(w.survival.production.cancel(id)).toBe(true);
    expect(w.survival.production.cancel(id)).toBe(false);
    expect(w.survival.production.claim(id)).toBe(true);
    expect(w.inventory.iron).toBe(9);
    expect(w.survival.production.claim(id)).toBe(false);
    w.survival.refinery.start("refine_ironBar");
    w.survival.production.tick(10);
    expect(w.survival.production.cancel(w.survival.state.jobs[0].id)).toBe(
      false,
    );
  });
  it("restores finite queues offline and tolerates a backwards clock", () => {
    const w = base();
    w.inventory.iron = 30;
    w.survival.refinery.start("refine_ironBar", 10);
    const save = w.snapshot(defaultSettings());
    save.survival.lastClock -= 60000;
    const w2 = new World(parseSave(JSON.stringify(save))!);
    expect(w2.survival.state.jobs[0].state).toBe("ready");
    const id = w2.survival.state.jobs[0].id;
    expect(w2.survival.production.claim(id)).toBe(true);
    w2.survival.production.offline(Date.now() + 1e10);
    expect(w2.inventory.ironBar).toBe(10);
    w2.inventory.iron = 3;
    w2.survival.refinery.start("refine_ironBar");
    const rem = w2.survival.state.jobs[0].remaining;
    w2.survival.production.offline(1);
    expect(w2.survival.state.jobs[0].remaining).toBe(rem);
  });
  it("enforces technology prerequisites, expenses, and duplicate research prevention", () => {
    const w = base();
    w.inventory = { data: 8, resin: 2 };
    w.survival.state.researchPoints = 20;
    expect(w.survival.research.start("filter")).toBe(false);
    expect(w.survival.research.start("bio")).toBe(true);
    expect(w.survival.research.start("bio")).toBe(false);
    complete(w);
    expect(w.survival.research.start("filter")).toBe(true);
    complete(w);
    expect(w.survival.state.technologies).toContain("filter");
    expect(w.survival.production.reason("mask", "craft")).toContain("재료");
  });
  it("crafts all six protection devices and replaces suit slots correctly", () => {
    const w = base();
    w.survival.state.technologies = Object.keys(technologies);
    for (const id of Object.keys(environmentGear).filter(id=>!Object.hasOwn(desertGear,id))) {
      w.inventory = { ...recipes[id].cost };
      expect(w.survival.crafting.start(id)).toBe(true);
      complete(w);
    }
    expect(w.survival.state.owned).toHaveLength(6);
    expect(w.survival.state.equipped).toHaveLength(5);
    expect(w.survival.state.equipped).not.toContain("radiation");
    expect(w.survival.resistance.radiation).toBe(55);
    expect(w.survival.oxygen.maximum).toBe(240);
  });
  it("has 18 distinct weapon recipes and deterministic +5 upgrade cap", () => {
    expect(
      Object.keys(recipes).filter((id) => id.includes("_mk")),
    ).toHaveLength(18);
    const w = base();
    w.survival.state.technologies.push("upgrade");
    w.inventory = { ironBar: 50, refinedCell: 30 };
    w.battle.credits = 10000;
    const g = w.combat.loot.gear("rare", "pulse");
    w.battle.gear.push(g);
    EquipmentSystem.equip(w.battle, g.id);
    const before = w.stats.attack;
    for (let i = 0; i < 5; i++)
      expect(w.survival.upgrade.upgrade(g.id)).toBe(true);
    expect(w.survival.upgrade.upgrade(g.id)).toBe(false);
    expect(w.stats.attack).toBeGreaterThan(before);
    expect(
      parseSave(JSON.stringify(w.snapshot(defaultSettings())))!.battle.gear[0]
        .upgrade,
    ).toBe(5);
  });
  it("caps warehouse and bag transfers with no losses", () => {
    const w = base();
    w.inventory = { iron: 4 };
    w.survival.state.warehouse = { copper: 5940 };
    expect(w.survival.storage.transfer("iron", 4, true)).toBe(false);
    expect(w.inventory.iron).toBe(4);
    w.survival.state.warehouse = {};
    expect(w.survival.storage.transfer("iron", 3, true)).toBe(true);
    expect(w.survival.storage.transfer("iron", 5, false)).toBe(false);
    expect(w.survival.state.warehouse.iron).toBe(3);
    w.enterRegion("forest");
    expect(w.survival.storage.transfer("iron", 1, true)).toBe(false);
  });
  it("requires a designated beacon location and blocks recall in either boss arena", () => {
    const w = base();
    w.inventory = { portableBeacon: 2, recall: 2 };
    expect(w.survival.use("portableBeacon")).toBe(false);
    w.enterRegion("marsh");
    w.player.x = 3233;
    expect(w.survival.use("portableBeacon")).toBe(true);
    expect(w.progress.checkpoint.region).toBe("marsh");
    w.survival.useCooldown = 0;
    w.enterRegion("abyss");
    w.survival.sentinel.start();
    expect(w.survival.use("recall")).toBe(false);
    expect(w.inventory.recall).toBe(2);
  });
  it("restores hazardous saves at a safe shelter with grace", () => {
    const w = base();
    w.enterRegion("caverns");
    w.player.x = 2000;
    w.safe = { x: 2000, y: 716 };
    w.survival.state.oxygen = 0;
    const w2 = new World(
      parseSave(JSON.stringify(w.snapshot(defaultSettings())))!,
    );
    expect(w2.player.x).toBe(regions.caverns.spawn);
    expect(w2.survival.environment.kind).toBe("safe");
    expect(w2.survival.environment.grace).toBe(12);
    step(w2, 1);
    expect(w2.survival.state.oxygen).toBeGreaterThan(0);
    expect(w2.player.hp).toBe(w.player.hp);
  });
  it("drops sentinel shield after destroying both conduits and has first-only rewards", () => {
    const w = base();
    w.enterRegion("abyss");
    const b = w.survival.sentinel;
    b.start();
    const hit = {
      damage: 1000,
      element: "plasma" as const,
      crit: 0,
      critDamage: 1,
      knockback: 0,
      statusChance: 0,
      special: true,
      sourceX: 3000,
    };
    w.combat.hit(b.enemy!, hit);
    expect(b.enemy!.hp).toBe(b.enemy!.maxHp);
    for (const e of b.conduits) w.combat.hit(e, hit);
    b.update(0.01);
    expect(b.enemy!.shield).toBe(0);
    w.combat.hit(b.enemy!, hit);
    expect(b.enemy!.hp).toBeLessThan(b.enemy!.maxHp);
    w.survival.state.scanner = true;
    w.survival.scanner.activate();
    expect(w.progress.counters.conduitScan).toBe(1);
    b.defeat();
    expect(w.survival.state.sentinelBlueprint).toBe(true);
    b.start();
    b.defeat();
    expect(
      w.battle.groundLoot.filter((l) => l.item === "colonyData"),
    ).toHaveLength(1);
    expect(w.survival.state.sentinelKills).toBe(2);
  });
  it("has complete connected regions and eight sequential quest definitions", () => {
    expect(questData).toHaveLength(38);
    for (const id of ["marsh", "caverns", "ruins", "abyss"] as const) {
      expect(regions[id].resources.length).toBeGreaterThan(3);
      expect(regions[id].landmarks.some((l) => l.kind === "portal")).toBe(true);
    }
    expect(regions.forest.resources.some((n) => n.item === "resin")).toBe(true);
    expect(regions.forest.resources.some((n) => n.item === "enzyme")).toBe(
      true,
    );
  });
  it("rejects altered queued costs, duplicate jobs and invalid environmental gear", () => {
    const w = base();
    w.inventory.iron = 3;
    w.survival.refinery.start("refine_ironBar");
    const a = w.snapshot(defaultSettings());
    a.survival.jobs[0].cost.iron = 300;
    expect(parseSave(JSON.stringify(a))).toBeNull();
    const b = w.snapshot(defaultSettings());
    b.survival.jobs.push({ ...b.survival.jobs[0] });
    expect(parseSave(JSON.stringify(b))).toBeNull();
    const c: any = w.snapshot(defaultSettings());
    c.survival.equipped = ["constructor"];
    expect(parseSave(JSON.stringify(c))).toBeNull();
  });
});
