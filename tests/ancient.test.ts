import { environmentGear } from "../src/survival/catalog";
import { describe, it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import {
  parseSave,
  defaultSettings,
  SaveStore,
  SAVE_KEY,
} from "../src/save/storage";
import {
  keyCost,
  moduleCosts,
  puzzleSolutions,
  ancientRecipes,
  ancientGear,
} from "../src/ancient/catalog";
import { shipSystems } from "../src/space/catalog";
import { ancientRegions } from "../src/ancient/regions";
import { beginChallenge, finishChallenge } from "../src/ancient/Endgame";
import { createEnemy } from "../src/combat/EnemyAI";
import { EquipmentSystem } from "../src/combat/EquipmentSystem";
export function omegaReady() {
  const w = new World();
  w.player.level = 90;
  w.player.hp = w.stats.hp;
  w.combat.unlock();
  w.battle.bossKills = 1;
  w.space.state.kills = 1;
  w.progress.counters.coreAnalysis = 1;
  w.progress.counters.foundryArchive = 1;
  w.progress.counters.genesis = 1;
  w.extreme.state.kills = { leviathan: 1, helios: 1, emperor: 1, archon: 1 };
  w.extreme.state.archives = ["frostia", "inferno", "aquaria", "lunaris"];
  w.extreme.state.horizon = true;
  w.space.state.repaired = Object.keys(shipSystems) as never;
  w.space.state.launched = true;
  w.survival.state.technologies.push("quantumEngineering", "ancientShield");
  w.survival.state.owned.push("ancientExplorerSuit");
  w.survival.state.equipped = ["ancientExplorerSuit"];
  w.inventory = { ...keyCost };
  return w;
}
function land() {
  const w = omegaReady();
  expect(w.omega.craftKey()).toBe(true);
  for (const [id, cost] of Object.entries(moduleCosts)) {
    w.inventory = { ...cost };
    expect(w.omega.install(id)).toBe(true);
  }
  w.inventory = {};
  w.space.state.fuel = 100;
  w.region = "ship";
  expect(w.space.launch("omega")).toBe(true);
  w.space.arrive();
  w.omega.finishFilm();
  return w;
}
const kill = (w: World, id: string) => {
  const e = w.omega.combat.boss!;
  w.combat.hit(e, {
    damage: 1e8,
    element: "physical",
    crit: 0,
    critDamage: 1,
    knockback: 0,
    statusChance: 0,
    special: true,
    sourceX: w.player.x,
  });
  w.omega.combat.update(0.1);
  expect(w.omega.state.kills[id]).toBe(1);
};
describe("Ancient Secrets", () => {
  it("entry depends on six persistent records, consumes no spent boss cores, charges fuel once and resumes landing", () => {
    const w = land();
    expect(w.omega.state.visited).toBe(true);
    expect(w.levelCap).toBe(100);
    expect(w.space.state.fuel).toBe(50);
    w.space.arrive();
    expect(w.space.state.fuel).toBe(50);
    expect(w.omega.state.key).toBe(true);
    expect(w.omega.entryReason()).toBe("");
    const s = w.snapshot(defaultSettings());
    expect(parseSave(JSON.stringify(s))).not.toBeNull();
    const loaded = new World(parseSave(JSON.stringify(s))!);
    expect(loaded.planetId).toBe("omega");
    expect(loaded.omega.state.modules).toHaveLength(3);
  });
  it("cannot spend materials or install modules without prior research and complete records", () => {
    const w = omegaReady();
    w.progress.counters.coreAnalysis = 0;
    const inv = { ...w.inventory };
    expect(w.omega.craftKey()).toBe(false);
    expect(w.inventory).toEqual(inv);
    expect(w.omega.install("navigation")).toBe(false);
    w.progress.counters.coreAnalysis = 1;
    w.survival.state.technologies = [];
    expect(w.omega.craftKey()).toBe(false);
  });
  it("all five physical puzzles persist partial progress and unlock memories once; gates are not circular", () => {
    const w = land();
    const before = w.player.xp;
    for (let p = 0; p < 5; p++) {
      const landmark = Object.values(ancientRegions)
        .flatMap((r) => r.landmarks)
        .find((l) => l.id === "omega-puzzle-" + p)!;
      expect(w.omega.interact(landmark)).toBe(true);
      expect(
        w.omega.solve((puzzleSolutions[p][0] + 1) % puzzleSolutions[p].length),
      ).toBe(false);
      expect(w.omega.state.attempts[p]).toEqual([]);
      for (const step of puzzleSolutions[p]) w.omega.solve(step);
      expect(w.omega.solve(0)).toBe(false);
    }
    expect(w.omega.state.puzzles).toHaveLength(5);
    expect(w.omega.state.memories).toHaveLength(5);
    expect(w.player.level).toBeGreaterThan(90);
    const parsed = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
    expect(parsed).not.toBeNull();
    expect(parsed!.ancient!.puzzles).toHaveLength(5);
    w.omega.state.puzzles = [];
    w.omega.state.kills.aeternumGuardian = 1;
    expect(w.omega.portalReason("omegaCitadel")).toBe("");
  });
  it("full campaign has three bosses, five final phases, delayed nova counter window and confirmed non-destructive ending replay", () => {
    const w = land();
    w.enterRegion("omegaCity", 3900);
    expect(w.omega.combat.start("aeternumGuardian")).toBe(true);
    expect(w.omega.combat.feed()).toBe(true);
    expect(w.omega.combat.feed()).toBe(false);
    kill(w, "aeternumGuardian");
    for (let i = 0; i < 5; i++) {
      w.omega.puzzle = i;
      for (const n of puzzleSolutions[i]) w.omega.solve(n);
    }
    w.enterRegion("omegaCitadel", 3900);
    expect(w.omega.combat.start("nexusOverlord")).toBe(true);
    kill(w, "nexusOverlord");
    w.enterRegion("omegaCore", 3900);
    expect(w.omega.combat.start("genesisZero")).toBe(true);
    const e = w.omega.combat.boss!;
    for (const [ratio, phase] of [
      [0.9, 1],
      [0.7, 2],
      [0.5, 3],
      [0.3, 4],
      [0.1, 5],
    ]) {
      e.hp = e.maxHp * ratio;
      w.omega.combat.update(0.1);
      w.omega.combat.timer = 0;
      w.omega.combat.update(0.1);
      expect(w.omega.combat.phase).toBe(phase);
      expect(w.combat.hazards.length).toBeGreaterThan(0);
    }
    expect(w.omega.combat.core).toBe(0);
    w.omega.combat.update(3.1);
    expect(w.omega.combat.core).toBeGreaterThan(0);
    kill(w, "genesisZero");
    expect(w.omega.choose("freedom", true)).toBe(false);
    expect(w.omega.choose("freedom")).toBe(true);
    expect(w.omega.state.ending).toBeNull();
    expect(w.omega.choose("freedom", true)).toBe(true);
    expect(w.omega.state.cinematic?.id).toBe("ending-freedom");
    const s = parseSave(JSON.stringify(w.snapshot(defaultSettings())));
    expect(s).not.toBeNull();
    const loaded = new World(s!);
    expect(loaded.omega.state.cinematic?.id).toBe("ending-freedom");
    loaded.omega.finishFilm();
    expect(loaded.omega.play("ending-rebirth")).toBe(true);
    loaded.omega.finishFilm();
    expect(loaded.omega.state.ending).toBe("freedom");
  });
  it("migrates v7 with backup, rejects malformed phase8 state and preserves old colonies and class allocation", () => {
    const old: any = omegaReady().snapshot(defaultSettings());
    old.version = 7;
    delete old.ancient;
    const migrated = parseSave(JSON.stringify(old));
    expect(migrated?.version).toBe(8);
    expect(migrated?.ancient?.ending).toBeNull();
    expect(migrated?.classes).toEqual(old.classes);
    const data = new Map([[SAVE_KEY, JSON.stringify(old)]]);
    const store = new SaveStore({
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        data.set(k, v);
      },
    });
    store.save(migrated!);
    expect(data.has(SAVE_KEY + ".backup.v7")).toBe(true);
    for (const mutate of [
      (s: any) => (s.ancient.equipped = ["omega", "omega"]),
      (s: any) =>
        (s.ancient.cinematic = {
          id: "ending-freedom",
          elapsed: 0,
          replay: false,
        }),
      (s: any) => (s.ancient.attempts = [[9], [], [], [], []]),
      (s: any) => (s.ancient.kills.genesisZero = -1),
    ]) {
      const s = structuredClone(migrated);
      mutate(s);
      expect(parseSave(JSON.stringify(s))).toBeNull();
    }
  });
  it("field time scales only local projectiles, gravity is bounded and recovery checkpoints survive death", () => {
    const w = land();
    w.enterRegion("omegaArchive", 2000);
    expect(w.omega.localTime(2200)).toBe(0.55);
    expect(w.omega.localTime(3300)).toBe(1);
    w.enterRegion("omegaFracture", 2000);
    w.player.x = 2000;
    expect(w.space.gravity).toBe(1.8);
    w.survival.state.equipped.push("gravityControlBoots");
    expect(w.space.gravity).toBe(1);
    w.player.x = 3500;
    expect(w.space.gravity).toBe(0.1);
    w.progress.checkpoint = { region: "omegaFracture", x: 350 };
    w.dead = 1;
    w.respawn();
    expect(w.region).toBe("omegaFracture");
    expect(w.player.hp).toBe(w.stats.hp);
  });
  it("relics are limited to two, ascension is bounded and transcend preserves deterministic upgrades", () => {
    const w = land();
    w.omega.state.kills.genesisZero = 1;
    w.omega.state.ending = "harmony";
    w.player.level = 100;
    w.player.hp = w.stats.hp;
    expect(w.omega.ascend()).toBe(true);
    expect(w.omega.ascend()).toBe(false);
    for (const id of ["eden", "ares", "frostia"]) {
      w.inventory = { aeternumAlloy: 2, memoryData: 1 };
      w.omega.relic(id);
    }
    expect(w.omega.state.equipped).toHaveLength(2);
    const g = w.combat.loot.gear("legendary", "genesisBlaster");
    g.upgrade = 7;
    w.battle.gear.push(g);
    w.battle.ownedWeapons.push(
      ...(["rifle", "cannon", "cryo", "hammer"] as const).filter(
        (id) => !w.battle.ownedWeapons.includes(id),
      ),
    );
    w.inventory = { transcendentAlloy: 3, genesisFragment: 1 };
    expect(w.omega.transcend(g.id)).toBe(true);
    expect(g.upgrade).toBe(7);
    expect(g.rarity).toBe("transcendent");
    expect(
      parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
    ).not.toBeNull();
    expect(Object.keys(ancientGear)).toHaveLength(25);
    expect(ancientRecipes.length).toBeGreaterThan(40);
  });
  it("ten-floor nexus checkpoint persists while temporary loot and damage never contaminate the original save", () => {
    const original = land();
    original.omega.state.kills.genesisZero = 1;
    original.omega.state.ending = "freedom";
    original.inventory = { iron: 7 };
    const w = beginChallenge(original, "nexus")!;
    expect(w).not.toBeNull();
    for (let floor = 1; floor <= 10; floor++) {
      expect(w.omega.endgame.floor).toBe(floor);
      if (floor % 3 === 1) w.enemies.forEach((e) => (e.hp = 0));
      else if (floor % 3 === 2) w.omega.endgame.devices = 3;
      else w.omega.endgame.floorTime = 30;
      w.omega.endgame.update(0.1, emptyInput());
      if (floor === 5)
        expect(w.snapshot(defaultSettings()).ancient!.nexus.checkpoint).toBe(5);
      if (floor < 10) expect(w.omega.endgame.next()).toBe(true);
    }
    expect(w.omega.endgame.complete).toBe(true);
    w.inventory.iron = 99;
    const restored = finishChallenge(w)!;
    expect(restored.inventory.iron).toBe(7);
    expect(restored.omega.state.nexus.best).toBe(10);
    expect(restored.omega.state.nexus.checkpoint).toBe(0);
    expect(restored.omega.state.records[0].bossTimes).toHaveLength(10);
  });
  it("galactic trial starts actual seven bosses and records recovery intervals", () => {
    const original = land();
    original.omega.state.kills = {
      aeternumGuardian: 1,
      nexusOverlord: 1,
      genesisZero: 1,
    };
    original.omega.state.ending = "rebirth";
    const w = beginChallenge(original, "galactic")!;
    expect(w).not.toBeNull();
    for (let i = 1; i <= 7; i++) {
      expect(w.omega.endgame.enemy, "boss stage " + i).not.toBeNull();
      w.omega.endgame.enemy!.hp = 0;
      w.omega.endgame.update(1, emptyInput());
      if (i < 7) {
        expect(w.omega.endgame.ready).toBe(true);
        w.omega.endgame.next();
      }
    }
    expect(w.omega.endgame.complete).toBe(true);
    const result = finishChallenge(w)!;
    expect(result.omega.state.trialBest).toBeGreaterThan(0);
    expect(result.omega.state.records[0].bossTimes).toHaveLength(7);
  });
  it("all eight enemies run distinct live attacks, new bosses resist crowd control and temporary effects clear", () => {
    const w = land();
    w.enterRegion("omegaCity", 1500);
    for (const e of w.enemies) {
      w.player.x = e.x - 100;
      w.omega.combat.enemy(e, 1);
      expect(e.action).toBeGreaterThan(0);
    }
    expect(w.combat.hazards.length).toBeGreaterThan(0);
    w.enterRegion("omegaCity", 3900);
    w.omega.combat.start("aeternumGuardian");
    expect(w.classes.isBoss(w.omega.combat.boss!)).toBe(true);
    for (let i = 0; i < 25; i++)
      w.enterRegion(i % 2 ? "omegaCity" : "omegaLanding");
    expect(w.omega.combat.boss).toBeNull();
    expect(w.combat.hazards).toHaveLength(0);
  });
});

it("late-game ownership of every environment module remains a valid save", () => {
  const w = land();
  w.survival.state.owned = Object.keys(environmentGear) as never;
  expect(
    parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
  ).not.toBeNull();
});
it("ancient reactor powers real research and fabrication, archive increases storage, local shield is scoped to its colony", () => {
  const w = land();
  w.survival.state.blueprint = true;
  w.colony.initialize();
  w.survival.state.technologies.push("omegaQuantum", "gravityMastery");
  w.inventory = {};
  w.survival.state.warehouse = {
    aeternumAlloy: 40,
    ancientCircuit: 10,
    quantumStableCell: 20,
    aeternumChip: 4,
    gravityControlCore: 5,
    memoryData: 10,
  };
  for (const [kind, x] of [
    ["quantumReactor", 3400],
    ["ancientResearch", 3600],
    ["relicFabricator", 3800],
    ["gravityField", 4000],
    ["aeternumArchive", 4200],
  ] as const) {
    expect(w.colony.place(kind, x, 780), kind).toBe(true);
  }
  for (let i = 0; i < 80; i++) w.colony.tick(0.25);
  expect(w.colony.networks.some((n) => n.generation >= 90)).toBe(true);
  expect(w.survival.state.warehouse.quantumStableCell).toBeLessThan(17);
  expect(w.colony.facilityPowered("research")).toBe(true);
  expect(w.colony.facilityPowered("workbench")).toBe(true);
  expect(w.colony.capacity).toBeGreaterThanOrEqual(300);
  const shield = w.colony.state.buildings.find(
    (b) => b.kind === "gravityField",
  )!;
  w.colony.statuses.set(shield.id, {
    powered: true,
    network: 0,
    reason: "작동 중",
    connected: true,
  });
  w.player.x = 4000;
  expect(w.omega.sheltered).toBe(true);
  w.region = "omegaArchive";
  expect(w.omega.sheltered).toBe(false);
});
