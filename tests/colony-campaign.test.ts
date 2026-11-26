import { it, expect } from "vitest";
import { World } from "../src/core/world";
import { items, questData, type ItemId } from "../src/data/content";
import { technologies } from "../src/survival/catalog";
import {
  definition,
  partNames,
  type BuildingKind,
  type PartId,
} from "../src/colony/catalog";
import { parseSave, defaultSettings } from "../src/save/storage";
it("finishes quests 19–28 with real building, research, automatic transactions, siege, settler and ship systems", () => {
  // Phase 3 completion + finite expedition stock fixture. No direct quest counters,
  // technology grants, produced items, ship completion or siege wins after setup.
  const w = new World();
  w.player.level = 15;
  w.player.hp = w.stats.hp;
  w.progress.quest = 18;
  w.survival.state.blueprint = true;
  w.survival.state.technologies = Object.keys(technologies);
  w.survival.state.facilities = [
    "terminal",
    "workbench",
    "refinery",
    "research",
    "equipment",
    "warehouse",
  ];
  w.survival.state.researchPoints = 100;
  w.colony.initialize();
  w.player.x = 3400;
  for (const id of Object.keys(items))
    w.survival.state.warehouse[id as ItemId] = Object.hasOwn(partNames, id)
      ? 0
      : 80;
  const step = (seconds: number) => {
    for (let i = 0; i < seconds * 4; i++) w.colony.tick(0.25);
  };
  const build = (kind: BuildingKind, x: number) => {
    expect(w.colony.placement(kind, x, 780), `${kind} at ${x}`).toBe("");
    expect(w.colony.place(kind, x, 780)).toBe(true);
    step(16);
    return w.colony.state.buildings.at(-1)!;
  };
  const research = (id: string) => {
    expect(w.colony.startResearch(id), `research ${id}`).toBe(true);
    step(14);
    expect(w.colony.state.technologies).toContain(id);
  };
  w.count("colonyOpen");
  build("floor", 3360);
  const home = build("habitat", 3360);
  expect(w.progress.quest).toBe(19);
  build("solar", 3720);
  build("relay", 3920);
  build("workbench", 4040);
  build("battery", 4240);
  expect(w.progress.quest).toBe(20);
  build("warehouse", 4360);
  build("relay", 4560);
  build("lab", 4680);
  build("solar", 4880);
  build("relay", 5080);
  research("mining");
  research("crystalPower");
  build("crystalGen", 5240);
  build("relay", 5480);
  research("logistics");
  build("logistics", 5600);
  // An additional source powers the left industrial network even at night.
  build("crystalGen", 3040);
  build("relay", 3240);
  // Iron deposit: center 3600; place the mining machine on the elevated-free ground
  // beside the first solar array by choosing the deposit's left edge.
  const miner = build("miner", 3520);
  step(15);
  expect(w.progress.counters.auto_iron).toBeGreaterThan(0);
  const refinery = build("refinery", 5840);
  build("relay", 5760);
  w.colony.configure(refinery.id, "refine_ironBar", false, 2);
  step(10);
  expect(w.progress.quest).toBe(22);
  research("automation");
  const factory = build("factory", 6120);
  build("relay", 6040);
  w.colony.configure(factory.id, "electronics", false, 2);
  step(15);
  expect(w.progress.quest).toBe(23);
  research("defense");
  const radar = build("radar", 6440);
  build("relay", 6360);
  build("crystalGen", 6640);
  const turret = build("turret", 6840);
  const wall = build("wall", 6960);
  build("relay", 7040);
  build("oxygen", 7200);
  expect(w.colony.startSiege()).toBe(true);
  step(31);
  // Accelerated positioning only; damage still goes through actual turret combat.
  for (let i = 0; i < 100 && w.colony.siege; i++) {
    for (const e of w.enemies)
      if (e.noLoot) {
        e.x = turret.x + 160;
        e.y = 730;
      }
    step(1);
    if (wall.hp < 500) w.colony.repair(wall.id);
  }
  expect(w.colony.state.siegeWins).toBe(1);
  expect(w.progress.quest).toBe(24);
  // Connect oxygen to the home network using a small dedicated supply.
  build("oxygen", 2800);
  build("relay", 2960);
  expect(w.colony.habitable(home.id)).toBe(true);
  expect(w.colony.rescue()).toBe(true);
  expect(w.colony.recruit("engineer")).toBe(true);
  expect(w.colony.assign(w.colony.state.settlers[0].id, factory.id)).toBe(true);
  expect(w.progress.quest).toBe(25);
  research("habitation");
  build("medical", 7440);
  build("relay", 7360);
  build("greenhouse", 7680);
  build("relay", 7920);
  expect(w.progress.quest).toBe(26);
  research("plasmaPower");
  build("plasmaGen", 8040);
  research("advanced");
  research("shipParts");
  const yard = build("shipyard", 8240);
  research("spaceport");
  build("relay", 8480);
  build("port", 8600);
  build("analysis", 8880);
  build("relay", 9120);
  build("crystalGen", 9280);
  w.colony.inspectShip();
  for (const id of Object.keys(partNames) as PartId[]) {
    expect(w.colony.configure(yard.id, id, false, 1)).toBe(true);
    step(35);
    expect(w.survival.state.warehouse[id]).toBe(1);
    expect(w.colony.deliverPart(id)).toBe(true);
    expect(w.colony.deliverPart(id)).toBe(false);
  }
  expect(w.progress.quest).toBe(27);
  expect(w.colony.analyzeCore()).toBe(true);
  research("navigation");
  expect(w.progress.quest).toBe(28);
  expect(questData).toHaveLength(28);
  const saved = w.snapshot(defaultSettings());
  expect(parseSave(JSON.stringify(saved))).not.toBeNull();
  const loaded = new World(saved);
  expect(loaded.colony.state.ship).toHaveLength(6);
  expect(loaded.colony.state.coreAnalyzed).toBe(true);
  expect(loaded.progress.quest).toBe(28);
  expect(loaded.colony.find(miner.id)).toBeTruthy();
  expect(loaded.colony.find(radar.id)).toBeTruthy();
});
