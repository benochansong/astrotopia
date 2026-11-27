import { it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import { parseSave, defaultSettings } from "../src/save/storage";
import { shipSystems, upgrades } from "../src/space/catalog";
import { spaceEnemies } from "../src/space/regions";
import { createEnemy } from "../src/combat/EnemyAI";
function ready() {
  const w = new World();
  w.survival.state.blueprint = true;
  w.colony.initialize();
  w.colony.state.ship = [
    "hullPanel",
    "thrusterPart",
    "navCircuit",
    "commModule",
    "lifeSupport",
    "coreStabilizer",
  ];
  w.colony.state.coreAnalyzed = true;
  w.survival.state.technologies.push("shipEngineering", "desertExploration");
  w.inventory = { landingGear: 1, shipFuel: 50 };
  w.space.inspect();
  expect(w.space.state.repaired).toHaveLength(6);
  expect(w.space.repair("landing")).toBe(true);
  w.survival.state.owned = ["dustHelmet", "oxygen"];
  w.survival.state.equipped = ["dustHelmet", "oxygen"];
  w.space.refuel();
  w.space.board();
  return w;
}
it("honors consumed phase 4 parts, repairs landing once and charges ascent once", () => {
  const w = ready();
  expect(w.space.ready).toBe(true);
  expect(w.space.repair("landing")).toBe(false);
  expect(w.space.launch("eden", true)).toBe(true);
  expect(w.space.state.fuel).toBe(45);
  expect(w.space.launch("eden", true)).toBe(false);
  w.space.arrive();
  w.space.arrive();
  expect(w.progress.counters.firstAscent).toBe(1);
  expect(w.levelCap).toBe(30);
});
it("restores pending travel without charging twice or duplicating first-landing emergency fuel", () => {
  let w = ready();
  w.space.launch("eden", true);
  w.space.arrive();
  w.space.launch("ares");
  expect(w.space.state.fuel).toBe(30);
  const parsed = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
  expect(parsed).not.toBeNull();
  w = new World(parsed!);
  expect(w.space.state.trip?.to).toBe("ares");
  w.space.arrive();
  expect(w.space.state.fuel).toBe(45);
  w.space.arrive();
  expect(w.space.state.fuel).toBe(45);
  expect(w.region).toBe("aresLanding");
  expect(w.planetId).toBe("ares");
  expect(w.space.gravity).toBe(0.65);
});
it("keeps warehouses separate, transports finite cargo and preserves both planets on reload", () => {
  let w = ready();
  w.survival.state.warehouse.iron = 17;
  w.space.launch("eden", true);
  w.space.arrive();
  w.space.launch("ares");
  w.space.arrive();
  expect(w.survival.state.warehouse.iron ?? 0).toBe(0);
  w.inventory.redIron = 8;
  expect(w.space.transfer("redIron", 8, true)).toBe(true);
  expect(w.inventory.redIron).toBe(0);
  expect(w.space.transfer("redIron", 8, true)).toBe(false);
  w.space.board();
  w.space.launch("eden");
  w.space.arrive();
  expect(w.survival.state.warehouse.iron).toBe(17);
  expect(w.space.transfer("redIron", 8, false, true)).toBe(true);
  expect(w.survival.state.warehouse.redIron).toBe(8);
  expect(w.space.state.cargo.redIron).toBe(0);
  const save = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
  expect(save).not.toBeNull();
  w = new World(save!);
  expect(w.survival.state.warehouse.redIron).toBe(8);
  expect(w.space.state.planets.ares?.local.warehouse.redIron ?? 0).toBe(0);
});
it("rejects malformed cargo/trips and preserves legacy progress", () => {
  const w = ready();
  const s: any = w.snapshot(defaultSettings());
  s.space.cargo.redIron = -1;
  expect(parseSave(JSON.stringify(s))).toBeNull();
  s.space.cargo = {};
  s.space.trip = {
    id: 1,
    from: "ares",
    to: "eden",
    remaining: 8,
    kind: "voyage",
    cost: 15,
  };
  expect(parseSave(JSON.stringify(s))).toBeNull();
  s.version = 4;
  delete s.space;
  s.region = "crash";
  const m = parseSave(JSON.stringify(s));
  expect(m?.version).toBe(6);
  expect(m?.colony.ship).toEqual(w.colony.state.ship);
});
it("requires actual gear and fuel; local renewable fuel cannot overfill", () => {
  const w = ready();
  w.space.launch("eden", true);
  w.space.arrive();
  w.survival.state.equipped = [];
  expect(w.space.launch("ares")).toBe(false);
  w.space.state.fuel = 0;
  w.inventory = { crystal: 2, copper: 2 };
  expect(w.space.emergencyFuel()).toBe(true);
  expect(w.space.state.fuel).toBe(5);
  expect(w.inventory.crystal).toBe(1);
  w.space.state.fuel = 99;
  expect(w.space.emergencyFuel()).toBe(false);
  expect(w.inventory.crystal).toBe(1);
});
it("simulates remote colonies without moving the active player or consuming active warehouse", () => {
  const w = ready();
  w.space.launch("eden", true);
  w.space.arrive();
  w.space.launch("ares");
  w.space.arrive();
  w.survival.state.warehouse.ironBar = 5;
  const x = w.player.x,
    c = w.colony;
  w.space.capture();
  const day = w.space.state.planets.eden!.colony.day;
  w.space.tick(1);
  expect(w.colony).toBe(c);
  expect(w.region).toBe("aresLanding");
  expect(w.player.x).toBe(x);
  expect(w.survival.state.warehouse.ironBar).toBe(5);
  expect(w.space.state.planets.eden!.colony.day).toBeGreaterThan(day);
});
it("all eight ARES creatures produce telegraphed attacks and the boss changes phases with unique first rewards", () => {
  const w = ready();
  w.space.switchPlanet("ares");
  w.enterRegion("aresFoundry", 3850);
  for (const kind of Object.keys(spaceEnemies).filter(
    (x) => x !== "colossus",
  ) as Exclude<keyof typeof spaceEnemies, "colossus">[]) {
    const e = createEnemy(kind, 3900, 780, 90);
    e.timer = 0;
    w.space.combat.enemy(e, 0.1);
    expect(w.combat.hazards.at(-1)?.delay).toBeGreaterThan(0);
  }
  expect(w.space.combat.start()).toBe(true);
  const boss = w.space.combat.boss!;
  boss.hp = boss.maxHp * 0.5;
  w.space.combat.update(6);
  expect(w.space.combat.phase).toBe(2);
  boss.hp = boss.maxHp * 0.2;
  w.space.combat.update(6);
  expect(w.space.combat.phase).toBe(3);
  boss.hp = 0;
  w.space.combat.update(0.1);
  expect(w.space.state.kills).toBe(1);
  expect(
    w.battle.groundLoot.filter((x) => x.item === "propulsionBlueprint"),
  ).toHaveLength(1);
  w.space.combat.start();
  w.space.combat.boss!.hp = 0;
  w.space.combat.update(0.1);
  expect(
    w.battle.groundLoot.filter((x) => x.item === "propulsionBlueprint"),
  ).toHaveLength(1);
});
it("heat protection reduces exposure and safe landing restores temperature", () => {
  const w = ready();
  w.space.switchPlanet("ares");
  w.enterRegion("aresDunes", 1000);
  w.space.state.heat = 0;
  w.space.tick(1, emptyInput());
  const heat = w.space.state.heat;
  w.space.state.heat = 0;
  w.survival.state.equipped.push("desertSuit", "coolingModule");
  w.space.tick(1, emptyInput());
  expect(w.space.state.heat).toBeLessThan(heat);
  w.enterRegion("aresLanding", 300);
  w.space.tick(1, emptyInput());
  expect(w.space.state.heat).toBe(0);
});
