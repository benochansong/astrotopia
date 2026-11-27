import { it, expect } from "vitest";
import { World, createPlayer } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import { movePlayer } from "../src/physics/movement";
import { parseSave, defaultSettings } from "../src/save/storage";
import { extremeQuests } from "../src/extreme/catalog";
function frost() {
  const w = new World();
  w.survival.state.blueprint = true;
  w.colony.initialize();
  w.space.state.launched = true;
  w.space.switchPlanet("frostia");
  w.survival.state.owned = ["thermalSuit", "heatingCore", "iceBoots", "oxygen"];
  w.survival.state.equipped = [
    "thermalSuit",
    "heatingCore",
    "iceBoots",
    "oxygen",
  ];
  return w;
}
it("FROSTIA has four connected regions, 1.2G and real ice friction countered by boots", () => {
  const w = frost();
  expect(w.space.gravity).toBe(1.2);
  w.enterRegion("frostiaWilds", 700);
  w.survival.state.equipped = [];
  expect(w.extreme.friction).toBe(0.15);
  const p = createPlayer(700, 716);
  p.grounded = true;
  p.vx = 250;
  movePlayer(p, emptyInput(), 0.05, w.map.platforms, 1.2, {
    speed: 250,
    energy: 100,
    regen: 12,
    friction: w.extreme.friction,
  });
  expect(p.vx).toBeGreaterThan(230);
  w.survival.state.equipped = ["iceBoots"];
  expect(w.extreme.friction).toBe(1);
  expect(extremeQuests.slice(0, 4)).toHaveLength(4);
});
it("cold equipment reduces exposure, weather warns before effects, shelter recovers oxygen and heat", () => {
  const w = frost();
  w.enterRegion("frostiaWilds", 1000);
  w.survival.state.equipped = [];
  w.extreme.environment.update(10);
  const raw = w.extreme.state.temperature;
  w.extreme.state.temperature = 0;
  w.survival.state.equipped = ["thermalSuit", "heatingCore"];
  w.extreme.environment.update(10);
  expect(w.extreme.state.temperature).toBeLessThan(raw * 0.2);
  w.extreme.state.weather.frostia = 129;
  w.extreme.environment.update(1);
  expect(w.extreme.environment.weather.warning).toBe(true);
  expect(w.extreme.environment.weather.active).toBe(false);
  w.extreme.environment.update(10);
  expect(w.extreme.environment.weather.active).toBe(true);
  w.enterRegion("frostiaLanding", 300);
  w.extreme.environment.update(10);
  expect(w.extreme.state.temperature).toBe(0);
});
it("saves FROSTIA and previous colonies, rejects malformed extreme state and migrates v5", () => {
  const w = frost();
  w.survival.state.warehouse.glacierCrystal = 13;
  const s = w.snapshot(defaultSettings());
  expect(parseSave(JSON.stringify(s))).not.toBeNull();
  const loaded = new World(parseSave(JSON.stringify(s))!);
  expect(loaded.planetId).toBe("frostia");
  expect(loaded.survival.state.warehouse.glacierCrystal).toBe(13);
  expect(loaded.space.state.planets.eden).toBeTruthy();
  s.extreme!.jetEnergy = -1;
  expect(parseSave(JSON.stringify(s))).toBeNull();
  const old: any = new World().snapshot(defaultSettings());
  old.version = 5;
  delete old.extreme;
  expect(parseSave(JSON.stringify(old))?.version).toBe(9);
});
it("Leviathan phases create telegraphs, terrain, exclusive first navigation reward and persist the kill", () => {
  const w = frost();
  w.enterRegion("frostiaRuins", 3850);
  expect(w.extreme.combat.start("leviathan")).toBe(true);
  const boss = w.extreme.combat.boss!;
  boss.hp = boss.maxHp * 0.5;
  w.extreme.combat.pattern = 2;
  w.extreme.combat.update(6);
  expect(w.extreme.combat.phase).toBe(2);
  expect(w.extreme.combat.platforms).toHaveLength(2);
  expect(w.combat.hazards.length).toBeGreaterThan(0);
  boss.hp = 0;
  w.extreme.combat.update(0.1);
  expect(w.extreme.state.kills.leviathan).toBe(1);
  expect(
    w.battle.groundLoot.filter((x) => x.item === "infernoNav"),
  ).toHaveLength(1);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
  w.extreme.combat.start("leviathan");
  w.extreme.combat.boss!.hp = 0;
  w.extreme.combat.update(0.1);
  expect(
    w.battle.groundLoot.filter((x) => x.item === "infernoNav"),
  ).toHaveLength(1);
});

it("HORIZON consumes previous-planet materials once, unlocks INFERNO and preserves presets without healing", () => {
  const w = frost();
  w.space.board();
  w.extreme.state.kills.leviathan = 1;
  w.survival.state.technologies.push("thermalEngineering");
  w.inventory = {
    cryoAlloy: 4,
    superCircuit: 2,
    advancedBattery: 2,
    titaniumBar: 4,
  };
  expect(w.extreme.upgradeHorizon()).toBe(true);
  expect(w.extreme.upgradeHorizon()).toBe(false);
  expect(w.space.capacity).toBe(320);
  w.extreme.state.temperature = 50;
  expect(w.extreme.preset("frostia", true)).toBe(true);
  w.survival.state.equipped = [];
  expect(w.extreme.preset("frostia", false)).toBe(true);
  expect(w.extreme.state.temperature).toBe(50);
  w.space.switchPlanet("inferno");
  w.enterRegion("infernoWilds", 1200);
  w.survival.state.equipped = ["exoskeleton"];
  expect(w.space.gravity).toBe(1.5);
  expect(w.extreme.physics.jumpSpeed).toBe(610);
  expect(w.extreme.preset("frostia", false)).toBe(false);
});
it("lava damages despite boots, cooling reduces heat, vents warn and Helios has phases and cooling interaction", () => {
  const w = frost();
  w.space.switchPlanet("inferno");
  w.enterRegion("infernoWilds", 1200);
  w.player.invulnerable = 0;
  w.survival.state.equipped = ["magmaBoots"];
  const hp = w.player.hp;
  w.extreme.environment.update(0.1);
  expect(w.player.hp).toBeLessThan(hp);
  w.player.x = 1700;
  w.extreme.environment.update(12);
  expect(w.combat.hazards.some((h) => h.label === "지열 분출 예고")).toBe(true);
  w.enterRegion("infernoRuins", 3850);
  expect(w.extreme.combat.start("helios")).toBe(true);
  w.extreme.combat.boss!.hp *= 0.2;
  w.extreme.combat.update(6);
  expect(w.extreme.combat.phase).toBe(3);
  const cooling = w.map.landmarks.find((l) => l.id === "cooling-helios")!;
  w.extreme.interact(cooling);
  expect(w.extreme.combat.cooling).toBe(10);
  w.extreme.combat.boss!.hp = 0;
  w.extreme.combat.update(0.1);
  expect(w.extreme.state.kills.helios).toBe(1);
  expect(w.battle.groundLoot.some((l) => l.item === "deepData")).toBe(true);
});

it("AQUARIA swims both axes, has depth pressure, and recovers in spatially bounded oxygen pockets", () => {
  const w = frost();
  w.space.switchPlanet("aquaria");
  w.enterRegion("aquariaDepths");
  w.enemies = [];
  w.player.x = 1000;
  w.player.y = 1100;
  w.survival.state.owned = ["aquaSuit", "rebreather", "deepPressureSuit"];
  w.survival.state.equipped = ["aquaSuit", "rebreather"];
  const y = w.player.y;
  for (let i = 0; i < 60; i++)
    w.update(1 / 60, { ...emptyInput(), up: true, right: true });
  expect(w.player.y).toBeLessThan(y - 80);
  expect(w.player.x).toBeGreaterThan(1100);
  w.player.y = 2100;
  w.extreme.environment.update(6);
  expect(w.extreme.state.pressure).toBeGreaterThan(0);
  w.survival.state.equipped = ["deepPressureSuit", "rebreather"];
  w.extreme.environment.update(6);
  expect(w.extreme.state.pressure).toBe(0);
  const shelter = w.map.landmarks.find((l) => l.id.startsWith("shelter-"))!;
  w.player.x = shelter.x;
  w.player.y = shelter.y - w.player.h;
  expect(w.extreme.environment.sheltered).toBe(true);
  w.player.y += 500;
  expect(w.extreme.environment.sheltered).toBe(false);
});
it("underwater weapon aim, speed and boss loot remain usable at depth and roundtrip through a save", () => {
  const w = frost();
  w.space.switchPlanet("aquaria");
  w.enterRegion("aquariaRuins");
  w.player.x = 3850;
  w.player.y = 2000;
  w.extreme.physics.beforeStep(0.01, { ...emptyInput(), up: true });
  w.combat.projectiles.fire(3900, 2020, 800, 0, 700, 4, "#fff", {
    damage: 10,
    element: "plasma",
    crit: 0,
    critDamage: 1,
    knockback: 0,
    statusChance: 0,
    special: false,
    sourceX: 3850,
  });
  expect(w.bullets.find((b) => b.active)!.vy).toBeLessThan(0);
  expect(w.extreme.combat.start("emperor")).toBe(true);
  w.extreme.combat.boss!.hp *= 0.2;
  w.extreme.combat.update(5);
  expect(w.extreme.combat.phase).toBe(3);
  w.extreme.combat.boss!.hp = 0;
  w.extreme.combat.update(0.1);
  expect(
    w.battle.groundLoot.some((l) => l.item === "zeroGBlueprint" && l.y > 1500),
  ).toBe(true);
  const save = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
  expect(save).not.toBeNull();
  const restored = new World(save!);
  expect(restored.player.x).toBeLessThan(650);
  expect(restored.survival.state.oxygen).toBe(restored.survival.oxygen.maximum);
});
it("LUNARIS jet energy drains, anchors brake and landing recharges with bounded ascent", () => {
  const w = frost();
  w.space.switchPlanet("lunaris");
  w.enterRegion("lunarisWilds");
  w.enemies = [];
  w.survival.state.equipped = ["advancedJetCore", "vacuumSuit"];
  w.player.x = 900;
  w.player.y = 400;
  for (let i = 0; i < 60; i++)
    w.update(1 / 60, { ...emptyInput(), jumpHeld: true });
  expect(w.player.y).toBeLessThan(350);
  expect(w.extreme.state.jetEnergy).toBeLessThan(90);
  w.player.vx = 200;
  w.player.vy = 200;
  w.extreme.physics.beforeStep(0.1, { ...emptyInput(), anchor: true });
  expect(w.player.vx).toBeLessThan(100);
  expect(w.player.vy).toBeLessThan(100);
  w.player.grounded = true;
  const energy = w.extreme.state.jetEnergy;
  w.extreme.physics.beforeStep(0.1, emptyInput());
  expect(w.extreme.state.jetEnergy).toBeGreaterThan(energy);
  w.player.y = -200;
  w.extreme.physics.afterStep();
  expect(w.player.y).toBe(-80);
  expect(w.space.gravity).toBe(0.2);
});
it("Archon requires three actual switches; victory grants legendary gear and one OMEGA coordinate", () => {
  const w = frost();
  w.space.switchPlanet("lunaris");
  w.enterRegion("lunarisRuins", 3850);
  expect(w.extreme.combat.start("archon")).toBe(false);
  for (const l of w.map.landmarks.filter((l) =>
    l.id.startsWith("gravity-switch-"),
  ))
    w.extreme.interact(l);
  expect(w.extreme.combat.start("archon")).toBe(true);
  w.extreme.combat.boss!.hp = 0;
  w.extreme.combat.update(0.1);
  expect(w.battle.groundLoot.some((l) => l.gear?.rarity === "legendary")).toBe(
    true,
  );
  expect(w.battle.story).toContain("omegaCoordinates");
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
  w.extreme.combat.start("archon");
  w.extreme.combat.boss!.hp = 0;
  w.extreme.combat.update(0.1);
  expect(
    w.battle.groundLoot.filter((l) => l.item === "omegaCoordinates"),
  ).toHaveLength(1);
});
it("vehicles consume finite materials, store cargo atomically, park and recover after energy loss", () => {
  const w = frost();
  w.survival.state.technologies.push(
    "thermalEngineering",
    "pressureEngineering",
  );
  w.inventory = {
    cryoAlloy: 4,
    engineParts: 2,
    advancedBattery: 4,
    pressureAlloy: 4,
    hydroModule: 2,
    iron: 3,
  };
  expect(w.extreme.vehicles.create("rover")).toBe(true);
  expect(w.extreme.vehicles.create("rover")).toBe(false);
  expect(w.extreme.vehicles.transfer("iron", true)).toBe(true);
  expect(w.inventory.iron).toBe(2);
  expect(w.extreme.state.vehicle!.cargo.iron).toBe(1);
  expect(w.extreme.vehicles.toggle()).toBe(true);
  w.extreme.state.vehicle!.energy = 0.001;
  w.extreme.vehicles.update(1);
  expect(w.extreme.state.vehicle!.mounted).toBe(false);
  expect(w.extreme.vehicles.dismantle()).toBe(false);
  expect(w.extreme.vehicles.transfer("iron", false)).toBe(true);
  expect(w.extreme.vehicles.dismantle()).toBe(true);
  w.space.switchPlanet("aquaria");
  expect(w.extreme.vehicles.create("pod")).toBe(true);
  expect(w.extreme.vehicles.toggle()).toBe(true);
  w.extreme.vehicles.damage(1000);
  expect(w.extreme.state.vehicle!.hp).toBe(0);
  expect(w.extreme.state.vehicle!.mounted).toBe(false);
  const s = w.snapshot(defaultSettings());
  expect(parseSave(JSON.stringify(s))).not.toBeNull();
  s.extreme!.vehicle!.cargo.iron = -1;
  expect(parseSave(JSON.stringify(s))).toBeNull();
});
it("full 56 quest chain, late gear research and Mk V upgrades are available without changing basic weapon identity", async () => {
  const { questData } = await import("../src/data/content");
  const { recipes } = await import("../src/survival/catalog");
  expect(questData).toHaveLength(56);
  expect(recipes.ext_aquaSuit.tech).toBe("oceanEngineering");
  expect(recipes.ext_aquaSuit.cost.pressureOre).toBeUndefined();
  expect(recipes.ext_vacuumSuit.cost.moonCrystal).toBeUndefined();
  expect(recipes.pulse_mk5.tech).toBe("quantumEngineering");
  const w = new World();
  w.survival.state.facilities.push("equipment");
  w.survival.state.technologies.push("upgrade", "quantumEngineering");
  w.inventory = {
    ironBar: 50,
    refinedCell: 30,
    quantumCell: 50,
    ultraAlloy: 50,
  };
  w.battle.credits = 10000;
  const g = w.combat.loot.gear("legendary", "quantumBlaster");
  w.battle.gear.push(g);
  for (let i = 0; i < 10; i++)
    expect(w.survival.upgrade.upgrade(g.id)).toBe(true);
  expect(w.survival.upgrade.upgrade(g.id)).toBe(false);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings())))?.battle.gear[0]
      .upgrade,
  ).toBe(10);
});
it("ocean power, warehouse capacity and quantum research integrate into persistent local colonies", async () => {
  const { definition } = await import("../src/colony/catalog");
  const w = frost();
  w.space.switchPlanet("aquaria");
  w.survival.state.technologies.push(
    "pressureEngineering",
    "quantumEngineering",
  );
  w.player.x = 3400;
  const build = (
    kind: "tidalGenerator" | "aquaLogistics" | "cosmicSolar" | "quantumLab",
    x: number,
  ) => {
    for (const [id, n] of Object.entries(definition(kind).cost))
      w.inventory[id as keyof typeof w.inventory] = n;
    expect(w.colony.placement(kind, x, 780)).toBe("");
    expect(w.colony.place(kind, x, 780)).toBe(true);
    for (let i = 0; i < 20; i++) w.colony.tick(1);
    return w.colony.state.buildings.at(-1)!;
  };
  const g = build("tidalGenerator", 3400);
  build("aquaLogistics", 3560);
  expect(w.colony.capacity).toBe(160);
  expect(
    w.colony.networks.find((n) => n.members.includes(g.id))?.generation,
  ).toBe(90);
  const oceanColony = w.colony;
  w.space.switchPlanet("lunaris");
  w.player.x = 3400;
  build("cosmicSolar", 3400);
  build("quantumLab", 3560);
  expect(w.colony.facilitySpeed("research")).toBe(1.5);
  expect(w.colony.facilityPowered("research")).toBe(true);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
  w.space.tick(1, emptyInput());
  expect(w.colony).not.toBe(oceanColony);
  w.space.switchPlanet("aquaria");
  expect(w.colony.capacity).toBe(160);
});

it("accessibility preserves environmental damage and safely restricts loadout presets", async () => {
  const { validSettings } = await import("../src/save/storage");
  const w = frost();
  w.settings.iceAssist = true;
  w.survival.state.equipped = [];
  expect(w.extreme.friction).toBe(0.6);
  w.player.x = 2200;
  expect(w.extreme.preset("frostia", true)).toBe(false);
  w.player.x = 360;
  expect(w.extreme.preset("frostia", true)).toBe(true);
  const settings = defaultSettings();
  settings.bindings!.KeyJ = "KeyY";
  expect(validSettings(settings)).toBe(true);
  settings.bindings!.KeyA = "KeyY";
  expect(validSettings(settings)).toBe(false);
  settings.bindings = defaultSettings().bindings;
  settings.cameraSpeed = 99;
  expect(validSettings(settings)).toBe(false);
});
it("advanced recipes and equipment preserve dedicated suit strengths and allow underwater farm saves", async () => {
  const { extremeGear } = await import("../src/extreme/catalog");
  const { definition } = await import("../src/colony/catalog");
  expect(extremeGear.universalSuit3.pressure).toBeLessThan(
    extremeGear.deepPressureSuit.pressure,
  );
  expect(extremeGear.universalSuit3.heat).toBeLessThan(
    extremeGear.thermalShield.heat,
  );
  const w = frost();
  w.space.switchPlanet("aquaria");
  w.survival.state.technologies.push("pressureEngineering");
  w.inventory = { ...definition("bioFarm").cost };
  expect(w.colony.place("bioFarm", 3400, 780)).toBe(true);
  for (let i = 0; i < 8; i++) w.colony.tick(1);
  const b = w.colony.state.buildings.at(-1)!;
  expect(w.colony.configure(b.id, "grow_aquaFiber", true, 10)).toBe(true);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
});

it("combat presets skip removed gear, clamp vitals and preserve valid equipment slots", async () => {
  const { EquipmentSystem } = await import("../src/combat/EquipmentSystem");
  const w = frost(),
    g = w.combat.loot.gear("rare", "body");
  w.battle.gear.push(g);
  EquipmentSystem.equip(w.battle, g.id);
  expect(w.extreme.preset("frostia", true)).toBe(true);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
  w.battle.gear = [];
  w.battle.equipment = {};
  w.player.hp = 50;
  expect(w.extreme.preset("frostia", false)).toBe(true);
  expect(w.battle.equipment).toEqual({});
  expect(w.player.hp).toBe(50);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
});
it("jetpack tiers extend thrust duration, improve control and recharge with a real consumable", () => {
  const w = frost();
  w.space.switchPlanet("lunaris");
  w.player.grounded = false;
  w.survival.state.equipped = ["jetpack1"];
  w.extreme.physics.beforeStep(1, { ...emptyInput(), jumpHeld: true });
  expect(w.extreme.state.jetEnergy).toBe(80);
  w.survival.state.equipped = ["zeroGPack"];
  w.extreme.physics.beforeStep(1, { ...emptyInput(), jumpHeld: true });
  expect(w.extreme.state.jetEnergy).toBe(71);
  expect(w.extreme.physics.airControl).toBe(900);
  w.inventory.energyCell = 1;
  expect(w.extreme.rechargeJet()).toBe(true);
  expect(w.extreme.state.jetEnergy).toBe(100);
  expect(w.inventory.energyCell ?? 0).toBe(0);
  expect(w.extreme.rechargeJet()).toBe(false);
});

it("vehicles remain saveable at map boundaries and manual dismount does not grant reusable immunity", () => {
  const w = frost();
  w.survival.state.technologies.push("thermalEngineering");
  w.inventory = { cryoAlloy: 4, engineParts: 2, advancedBattery: 2 };
  w.player.x = 9966;
  expect(w.extreme.vehicles.create("rover")).toBe(true);
  expect(w.extreme.state.vehicle!.x).toBeLessThan(10000);
  expect(w.extreme.vehicles.toggle()).toBe(true);
  w.player.invulnerable = 0;
  expect(w.extreme.vehicles.toggle()).toBe(true);
  expect(w.player.invulnerable).toBe(0);
  w.extreme.state.vehicle!.mounted = true;
  w.player.x = -10;
  w.player.y = -20;
  w.extreme.physics.afterStep();
  expect(w.extreme.state.vehicle!.x).toBe(0);
  expect(w.extreme.state.vehicle!.y).toBe(0);
  w.player.x = 360;
  w.player.y = 716;
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
});
