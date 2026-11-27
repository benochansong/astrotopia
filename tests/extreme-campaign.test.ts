import { it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import { technologies, recipes, type EnvGearId } from "../src/survival/catalog";
import { extremeTech, type ExtremePlanet } from "../src/extreme/catalog";
import { colonyTech, type BuildingKind } from "../src/colony/catalog";
import { shipSystems, type PlanetId } from "../src/space/catalog";
import { type ItemId } from "../src/data/content";
import { parseSave, defaultSettings } from "../src/save/storage";
it("plays the phase 6 research, craft, four voyages, boss rewards and all missions 39–56 from a finite prepared expedition", () => {
  let w = new World();
  w.progress.quest = 38;
  w.player.level = 30;
  w.survival.state.capacity = 36;
  w.survival.state.blueprint = true;
  w.survival.state.researchPoints = 200;
  w.survival.state.tools = [1, 2];
  w.survival.state.tool = 2;
  w.survival.state.owned = ["oxygen"];
  w.survival.state.equipped = ["oxygen"];
  w.survival.state.technologies = Object.keys(technologies).filter(
    (id) => !extremeTech.some((t) => t.id === id),
  );
  w.survival.state.facilities = [
    "terminal",
    "workbench",
    "equipment",
    "research",
    "refinery",
    "warehouse",
  ];
  w.colony.initialize();
  w.colony.state.technologies = Object.keys(colonyTech);
  Object.assign(w.survival.state.warehouse, {
    ironBar: 60,
    copperBar: 50,
    wafer: 20,
    titaniumBar: 40,
    alloy: 20,
    denseCell: 30,
    electronics: 20,
    data: 20,
    heatAlloy: 50,
    wovenFiber: 20,
    polymer: 30,
    thermalCrystal: 10,
    cobaltAlloy: 20,
    efficientCell: 10,
    powerCircuit: 20,
    refinedCell: 20,
  });
  for (const [kind, x] of [
    ["plasmaGen", 3400],
    ["equipment", 3560],
    ["lab", 3720],
    ["refinery", 3880],
    ["plasmaGen", 4040],
  ] as [BuildingKind, number][]) {
    expect(w.colony.placement(kind, x, 780), kind).toBe("");
    expect(w.colony.place(kind, x, 780)).toBe(true);
    for (let i = 0; i < 15; i++) w.colony.tick(1);
  }
  w.inventory.shipFuel = 700;
  w.space.state.repaired = Object.keys(shipSystems) as any;
  w.space.state.launched = true;
  const job = (id: string, kind: "craft" | "research" = "craft", n = 1) => {
    expect(w.survival.production.reason(id, kind, n), id).toBe("");
    expect(w.survival.production.enqueue(id, kind, n)).toBe(true);
    w.survival.production.tick(300);
    expect(w.survival.production.claim(w.survival.state.jobs[0].id), id).toBe(
      true,
    );
  };
  const suit = (id: EnvGearId) => {
    expect(w.survival.equip(id)).toBe(true);
    w.survival.equip("oxygen");
  };
  const voyage = (id: PlanetId) => {
    w.enterRegion(w.baseRegion, 360);
    w.space.board();
    w.space.refuel();
    const before = w.space.state.fuel,
      cost = w.space.costFor(id);
    expect(w.space.reason(id), id).toBe("");
    expect(w.space.launch(id)).toBe(true);
    expect(w.space.state.fuel).toBe(before - cost);
    const saved = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
    expect(saved, "pending voyage " + id).not.toBeNull();
    w = new World(saved!);
    w.space.arrive();
    expect(w.planetId).toBe(id);
    expect(w.space.state.fuel).toBe(before - cost);
  };
  const home = () => {
    voyage("eden");
    for (const [id, n] of Object.entries(w.inventory))
      if (id !== "shipFuel" && n! > 0)
        expect(
          w.survival.storage.transfer(id as ItemId, n!, true),
          "store " + id,
        ).toBe(true);
  };
  const gather = (planet: ExtremePlanet) => {
    w.enterRegion((planet + "Landing") as any);
    for (const node of w.map.resources) {
      w.player.x = node.x - 17;
      w.player.y = node.y - 64;
      for (let i = 0; i < 7; i++) {
        w.cooldowns[node.id] = 0;
        expect(w.survival.mining.start(node)).toBe(true);
        w.survival.mining.update(3, emptyInput());
        w.player.energy = 100;
      }
    }
  };
  const exploreBoss = (planet: ExtremePlanet, boss: string) => {
    w.enterRegion((planet + "Wilds") as any);
    w.player.x = 1100;
    w.player.y = planet === "aquaria" ? 1000 : 716;
    w.extreme.update(0.02, { ...emptyInput(), jump: true });
    if (planet === "aquaria") {
      w.extreme.physics.beforeStep(0.02, { ...emptyInput(), up: true });
      w.extreme.combat.enemy(w.enemies[0], 0.02);
    }
    if (planet === "lunaris")
      w.extreme.physics.beforeStep(0.02, { ...emptyInput(), jumpHeld: true });
    w.enterRegion((planet + "Depths") as any);
    w.enterRegion((planet + "Ruins") as any);
    for (const l of w.map.landmarks.filter(
      (l) => l.id.startsWith("archive-") || l.id.startsWith("gravity-switch-"),
    ))
      w.extreme.interact(l);
    w.player.x = 3850;
    w.player.y = planet === "aquaria" ? 2036 : 716;
    expect(w.extreme.combat.start(boss)).toBe(true);
    w.combat.hit(w.extreme.combat.boss!, {
      damage: 1e6,
      element: "physical",
      crit: 0,
      critDamage: 1,
      knockback: 0,
      statusChance: 0,
      special: true,
      sourceX: 3850,
    });
    w.extreme.combat.update(0.02);
    for (const l of [...w.battle.groundLoot]) {
      w.player.x = l.x - 17;
      w.player.y = l.y - 40;
      w.combat.loot.update(0.1);
    }
    expect(w.progress.counters["kill_" + boss]).toBe(1);
  };
  job("cryoEngineering", "research");
  job("ext_thermalSuit");
  suit("thermalSuit");
  voyage("frostia");
  gather("frostia");
  exploreBoss("frostia", "leviathan");
  home();
  expect(w.progress.quest).toBe(42);
  job("superconductivity", "research");
  job("ext_coolingCell", "craft", 8);
  job("ext_cryoAlloy", "craft", 6);
  job("ext_superCircuit", "craft", 4);
  job("ext_advancedBattery", "craft", 2);
  job("thermalEngineering", "research");
  job("ext_thermalShield");
  job("ext_exoskeleton");
  w.player.x = 360;
  expect(w.extreme.upgradeHorizon()).toBe(true);
  suit("thermalShield");
  voyage("inferno");
  gather("inferno");
  exploreBoss("inferno", "helios");
  home();
  expect(w.progress.quest).toBe(47);
  job("geothermalEngineering", "research");
  job("oceanEngineering", "research");
  job("ext_aquaSuit");
  suit("aquaSuit");
  voyage("aquaria");
  gather("aquaria");
  home();
  job("pressureEngineering", "research");
  job("ext_pressureAlloy", "craft", 9);
  job("ext_bioPolymer", "craft", 2);
  job("ext_deepPressureSuit");
  job("ext_hydroModule", "craft", 2);
  suit("deepPressureSuit");
  voyage("aquaria");
  exploreBoss("aquaria", "emperor");
  home();
  expect(w.progress.quest).toBe(51);
  job("ext_lifeParts", "craft", 2);
  job("zeroGEngineering", "research");
  job("ext_vacuumSuit");
  job("ext_advancedJetCore");
  suit("vacuumSuit");
  voyage("lunaris");
  gather("lunaris");
  exploreBoss("lunaris", "archon");
  w.extreme.update(0.02, emptyInput());
  expect(w.progress.quest).toBe(56);
  expect(w.progress.counters.genesis).toBe(1);
  expect(w.battle.titles).toContain("극한 세계의 개척자");
  const final = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
  expect(final).not.toBeNull();
  expect(Object.keys(final!.space!.planets)).toHaveLength(5);
}, 20000);
