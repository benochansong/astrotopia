import { it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import { recipes, technologies, type Cost } from "../src/survival/catalog";
import { regions, type ItemId, type RegionId } from "../src/data/content";
import { defaultSettings, parseSave } from "../src/save/storage";
// Integration campaign: shorten travel and combat, but source all crafting materials
// from actual nodes/recipes and enforce tool, research, queue and capacity rules.
it("completes quests 11–18 through gathering, refining, research, crafting and first boss rewards", () => {
  const w = new World();
  w.progress.quest = 10;
  w.player.level = 15;
  w.combat.unlock();
  w.player.invulnerable = 99999;
  const home = () => {
    w.enterRegion("crash", 300);
    w.survival.storage.depositAll();
  };
  const finish = () => {
    w.survival.production.tick(1000);
    for (const j of [...w.survival.state.jobs])
      expect(w.survival.production.claim(j.id)).toBe(true);
    w.survival.storage.depositAll();
  };
  const mine = (item: ItemId, need: number) => {
    const order: RegionId[] = [
      "crash",
      "forest",
      "valley",
      "marsh",
      "caverns",
      "ruins",
      "abyss",
    ];
    const region = order.find((id) =>
      regions[id].resources.some((n) => n.item === item),
    );
    expect(region, `natural source ${item}`).toBeTruthy();
    const node = regions[region!].resources.find((n) => n.item === item)!;
    if (region === "ruins")
      expect(w.survival.state.equipped).toContain("radiation");
    if (region === "abyss")
      expect(w.survival.state.equipped).toContain("stabilizer");
    let count = 0;
    while (count < need) {
      w.enterRegion(region!);
      w.enemies = [];
      Object.assign(w.player, {
        x: node.x - 17,
        y: node.y - 64,
        vx: 0,
        vy: 0,
        invulnerable: 9999,
      });
      w.cooldowns[node.id] = 0;
      expect(w.survival.mining.start(node), `tool for ${item}`).toBe(true);
      for (let i = 0; i < 600 && w.mining; i++) w.update(1 / 60, emptyInput());
      expect(w.mining).toBeNull();
      count += node.count;
      home();
    }
  };
  const ensure = (cost: Cost, depth = 0) => {
    expect(depth).toBeLessThan(15);
    home();
    for (const [id, n] of Object.entries(cost) as [ItemId, number][]) {
      const missing = n - w.survival.storage.available(id);
      if (missing <= 0) continue;
      const r =
        id === "data"
          ? recipes.fieldData
          : Object.values(recipes).find(
              (r) => r.result.kind === "item" && r.result.id === id,
            );
      if (r) {
        expect(r.result.kind).toBe("item");
        const qty = Math.ceil(
          missing / (r.result.kind === "item" ? r.result.count : 1),
        );
        ensure(
          Object.fromEntries(
            Object.entries(r.cost).map(([k, v]) => [k, v! * qty]),
          ),
          depth + 1,
        );
        expect(
          w.survival.crafting.start(r.id, qty),
          w.survival.production.reason(r.id, "craft", qty),
        ).toBe(true);
        finish();
      } else mine(id, missing);
    }
  };
  const craft = (id: string) => {
    ensure(recipes[id].cost);
    expect(
      w.survival.crafting.start(id),
      w.survival.production.reason(id, "craft"),
    ).toBe(true);
    finish();
  };
  const research = (id: string) => {
    const t = technologies[id];
    ensure(t.cost);
    while (w.survival.state.researchPoints < t.points) {
      ensure({ data: 2 });
      expect(w.survival.research.convert()).toBe(true);
    }
    expect(
      w.survival.research.start(id),
      w.survival.production.reason(id, "research"),
    ).toBe(true);
    finish();
  };
  w.survival.activate("terminal");
  w.survival.activate("workbench");
  craft("medicalGel");
  expect(w.progress.quest).toBe(11);
  ensure({ scrap: 3, iron: 3, copper: 3 });
  expect(w.survival.activate("refinery")).toBe(true);
  craft("refine_ironBar");
  craft("refine_copperBar");
  expect(w.progress.quest).toBe(12);
  ensure({ ironBar: 2, copperBar: 1 });
  expect(w.survival.activate("research")).toBe(true);
  ensure({ ironBar: 3, copperBar: 2, electronics: 2 });
  expect(w.survival.activate("equipment")).toBe(true);
  research("bio");
  research("filter");
  craft("mask");
  w.survival.scanner.activate();
  w.enterRegion("marsh");
  w.player.x = 1100;
  w.update(0.02, emptyInput());
  expect(w.progress.quest).toBe(13);
  home();
  research("laser");
  craft("tool2");
  research("oxygen");
  craft("oxygen");
  craft("light");
  mine("titanium", 4);
  expect(w.progress.quest).toBe(14);
  research("alloy");
  research("plasma");
  craft("tool3");
  research("shielding");
  craft("radiation");
  w.enterRegion("ruins");
  expect(w.progress.quest).toBe(15);
  home();
  research("density");
  research("stability");
  craft("stabilizer");
  research("ancient");
  research("quantum");
  craft("tool4");
  w.enterRegion("ruins");
  for (const l of w.map.landmarks.filter((l) => l.kind === "relay"))
    w.survival.interact(l);
  w.survival.interact(w.map.landmarks.find((l) => l.target === "abyss")!);
  expect(w.region).toBe("abyss");
  expect(w.progress.quest).toBe(16);
  const boss = w.survival.sentinel;
  boss.start();
  w.survival.scanner.cooldown = 0;
  w.survival.scanner.activate();
  boss.defeat();
  w.player.x = 3483;
  w.player.y = 716;
  w.combat.loot.update(0.1);
  expect(w.progress.quest).toBe(17);
  home();
  w.survival.activate("terminal");
  for (const id of [
    "powerPlan",
    "productionPlan",
    "habitatPlan",
    "autoPlan",
    "colony",
  ])
    research(id);
  expect(w.progress.quest).toBe(18);
  expect(w.survival.state.blueprint).toBe(true);
  expect(
    (w.inventory.blueprint ?? 0) + (w.survival.state.warehouse.blueprint ?? 0),
  ).toBe(1);
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings())))!.progress.quest,
  ).toBe(18);
});
