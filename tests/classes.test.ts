import { describe, it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import {
  classIds,
  classSkills,
  classes,
  paths,
  type ClassId,
} from "../src/classes/catalog";
import {
  beginTrial,
  finishTrial,
  beginRematch,
} from "../src/classes/TrainingArena";
import { createEnemy } from "../src/combat/EnemyAI";
import {
  parseSave,
  defaultSettings,
  SAVE_KEY,
  SaveStore,
} from "../src/save/storage";
import { EquipmentSystem } from "../src/combat/EquipmentSystem";
const setup = (id: ClassId = "guardian", level = 60) => {
  const w = new World();
  w.player.level = level;
  w.combat.unlock();
  w.classes.state.trials[id] = 1;
  expect(w.classes.choose(id)).toBe(true);
  w.player.hp = w.stats.hp;
  w.player.energy = w.stats.energy;
  return w;
};
function advance(w: World, path: string) {
  const c = w.classes;
  c.state.trials[`${c.state.classId}_tier2`] = 1;
  expect(c.specialize(path)).toBe(true);
  c.state.trials[`${c.state.classId}_tier3`] = 1;
  expect(c.advance()).toBe(true);
  expect(c.learn(`${path}_0`)).toBe(true);
  expect(c.learn(`${path}_ultimate`)).toBe(true);
}
const tick = (w: World, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.02) w.update(0.02, emptyInput());
};
describe("Path of the Explorer", () => {
  it("Prospector extraction improves actual mining duration and Ranger evasion fires toward the target", () => {
    const w = setup("explorer");
    advance(w, "prospector");
    w.classes.learn("prospector_1");
    w.classes.state.gauge = 100;
    const node = w.map.resources[0],
      before = w.survival.mining.duration(node);
    expect(w.classes.cast("prospector_1")).toBe(true);
    expect(w.survival.mining.duration(node)).toBeLessThan(before);
    expect(w.classes.miningFactor).toBeGreaterThanOrEqual(0.7);
    const ranger = setup("ranger");
    ranger.player.facing = 1;
    expect(ranger.classes.cast("ranger_2")).toBe(true);
    expect(ranger.player.facing).toBe(-1);
    expect(ranger.bullets.some((b) => b.active && b.vx > 0)).toBe(true);
    ranger.classes.update(0.3, emptyInput());
    expect(ranger.player.facing).toBe(1);
  });
  it("environment damage cannot farm counter charge and class gear is absent from rookie loot", () => {
    const w = setup("guardian");
    w.classes.cast("guardian_3");
    w.player.invulnerable = 0;
    w.damage(50, w.player.x, "toxic");
    expect(w.classes.state.gauge).toBe(0);
    expect(w.classes.state.records).not.toContain("counter");
    const rookie = new World();
    for (let i = 0; i < 50; i++)
      expect(rookie.combat.loot.gear("common").template).not.toMatch(/^class_/);
  });
  it("pioneer effects are bounded and disappear immediately on class change", () => {
    const w = setup("engineer"),
      c = w.classes;
    c.state.ranks.engineer_passive2 = 5;
    c.state.mastery.engineer = 4000;
    expect(c.industryBonus).toBe(0.15);
    w.battle.credits = 100;
    c.state.trials.scientist = 1;
    expect(c.choose("scientist")).toBe(true);
    expect(c.industryBonus).toBe(0);
    expect(w.survival.production.researchPoints(100)).toBeLessThan(100);
    expect(w.survival.production.researchPoints(100)).toBeGreaterThanOrEqual(
      85,
    );
  });
  it("migrates v6, backfills SP once and preserves the complete existing progression", () => {
    const w = new World();
    w.player.level = 90;
    w.inventory = { iron: 12, medkit: 2 };
    w.progress.quest = 56;
    w.battle.gear = [
      { id: "gear-1", template: "body", rarity: "legendary", upgrade: 10 },
    ];
    w.battle.serial = 1;
    const legacy: any = w.snapshot(defaultSettings());
    legacy.version = 6;
    delete legacy.classes;
    const migrated = parseSave(JSON.stringify(legacy))!;
    expect(migrated.version).toBe(7);
    expect(migrated.classes?.granted).toBe(81);
    for (const key of [
      "battle",
      "inventory",
      "survival",
      "colony",
      "space",
      "extreme",
      "progress",
    ] as const)
      expect(migrated[key]).toEqual(legacy[key]);
    const restored = new World(migrated);
    expect(restored.classes.sp).toBe(81);
    expect(
      new World(
        parseSave(JSON.stringify(restored.snapshot(defaultSettings())))!,
      ).classes.sp,
    ).toBe(81);
    const mem = new Map([[SAVE_KEY, JSON.stringify(legacy)]]);
    new SaveStore({
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => {
        mem.set(k, v);
      },
    }).save(migrated);
    expect(mem.has(SAVE_KEY + ".backup.v6")).toBe(true);
  });
  it.each(classIds)(
    "%s chooses and applies distinct stats while preserving common skills",
    (id) => {
      const w = setup(id, 10),
        base = EquipmentSystem.stats(10, w.battle);
      expect(w.stats).not.toEqual(base);
      expect(w.battle.unlockedSkills).toContain("dash");
      expect(w.classes.sp).toBe(6);
      expect(w.classes.choose(id)).toBe(false);
      expect(w.classes.sp).toBe(6);
      expect(
        parseSave(JSON.stringify(w.snapshot(defaultSettings()))),
      ).not.toBeNull();
    },
  );
  it("gates prerequisites, refunds SP, prevents duplicate advancement and removes prior passives", () => {
    const w = setup("guardian"),
      c = w.classes;
    expect(c.learn("ranger_0")).toBe(false);
    expect(c.learn("sentinel_ultimate")).toBe(false);
    expect(c.learn("guardian_passive0")).toBe(true);
    expect(c.sp).toBe(55);
    w.battle.credits = 300;
    advance(w, "sentinel");
    const granted = c.state.granted;
    expect(c.advance()).toBe(false);
    expect(c.state.granted).toBe(granted);
    expect(c.resetSkills()).toBe(true);
    expect(c.sp).toBe(granted);
    expect(w.battle.credits).toBe(300);
    expect(c.resetSkills()).toBe(true);
    expect(w.battle.credits).toBe(250);
    c.state.mastery.guardian = 220;
    c.state.trials.engineer = 1;
    expect(c.choose("engineer")).toBe(true);
    expect(c.state.mastery.guardian).toBe(220);
    expect(c.state.ranks.guardian_passive0).toBeUndefined();
    expect(c.industryBonus).toBeGreaterThan(0);
    expect(w.stats.hp).toBe(EquipmentSystem.stats(60, w.battle).hp);
    expect(c.choose("guardian")).toBe(false);
    expect(c.sp).toBe(granted);
  });
  it.each(Object.keys(paths))(
    "%s advances and executes its ultimate with finite resources and cleanup",
    (path) => {
      const w = setup(paths[path].classId);
      advance(w, path);
      const id = `${path}_ultimate`,
        c = w.classes;
      expect(c.cast(id)).toBe(false);
      c.state.gauge = 100;
      w.player.energy = w.stats.energy;
      expect(c.cast(id)).toBe(true);
      expect(c.state.gauge).toBe(0);
      expect(c.state.cooldowns[id]).toBeGreaterThanOrEqual(90);
      expect(c.cast(id)).toBe(false);
      tick(w, 0.5);
      expect(Number.isFinite(w.player.x)).toBe(true);
      expect(w.player.energy).toBeLessThan(w.stats.energy);
      w.enterRegion("forest");
      expect(c.summons).toHaveLength(0);
      expect(Object.keys(c.buffs)).toHaveLength(0);
    },
  );
  it.each(classIds)(
    "%s has four executable basic skills across land, water and zero gravity",
    (id) => {
      for (const region of [
        "forest",
        "aquariaWilds",
        "lunarisWilds",
      ] as const) {
        const w = setup(id),
          c = w.classes;
        w.enterRegion(region, 800);
        w.player.y = region === "aquariaWilds" ? 950 : 500;
        w.player.grounded = false;
        w.player.invulnerable = 20;
        const e = createEnemy("slime", 920, w.player.y + 50, 98765);
        e.hp = e.maxHp = 100000;
        w.enemies = [e];
        for (let i = 0; i < 4; i++) {
          c.lock = 0;
          w.player.dashCooldown = 0;
          w.player.energy = w.stats.energy;
          expect(c.cast(`${id}_${i}`)).toBe(true);
          c.update(0.4, emptyInput());
          w.combat.projectiles.update(0.1);
        }
        expect(c.metrics.spentEP).toBeGreaterThan(0);
        expect(c.summons.length).toBeLessThanOrEqual(4);
        expect(w.player.x).toBeGreaterThanOrEqual(0);
      }
    },
  );
  it("counter timing reduces damage; common dash cannot chain with class dodge", () => {
    const w = setup("guardian"),
      c = w.classes;
    w.player.invulnerable = 0;
    const hp = w.player.hp;
    expect(c.cast("guardian_3")).toBe(true);
    w.damage(100, w.player.x + 100);
    expect(hp - w.player.hp).toBeLessThan(30);
    expect(c.state.records).toContain("counter");
    expect(w.combat.skills.cast("dash")).toBe(false);
    c.lock = 0;
    expect(c.cast("guardian_3")).toBe(false);
  });
  it("dummy targets never grant gauge or mastery, and summons are capped and cleaned on death", () => {
    const w = setup("engineer"),
      c = w.classes;
    advance(w, "robotics");
    c.state.gauge = 100;
    const dummy = createEnemy("dummy", 380, 780, 9000);
    w.enemies = [dummy];
    const gauge = c.state.gauge;
    const a = {
      damage: 100,
      element: "plasma" as const,
      crit: 0,
      critDamage: 1,
      knockback: 0,
      statusChance: 0,
      special: true,
      classSkill: true,
      sourceX: 300,
    };
    for (let i = 0; i < 100; i++) w.combat.hit(dummy, a);
    expect(c.state.gauge).toBe(gauge);
    expect(c.state.mastery.engineer ?? 0).toBe(0);
    expect(c.cast("robotics_ultimate")).toBe(true);
    expect(c.summons).toHaveLength(4);
    c.lock = 0;
    w.player.energy = 100;
    expect(c.cast("engineer_0")).toBe(true);
    expect(c.summons).toHaveLength(4);
    w.player.invulnerable = 0;
    w.damage(1e6, 0);
    expect(c.summons).toHaveLength(0);
    expect(w.dead).toBeGreaterThan(0);
  });
  it("saves cooldowns and loadouts without restoring health, spending refunded resources, or creating gear", () => {
    const w = setup("scientist"),
      c = w.classes;
    w.battle.gear = [{ id: "gear-1", template: "body", rarity: "rare" }];
    w.battle.serial = 1;
    EquipmentSystem.equip(w.battle, "gear-1");
    expect(c.preset("boss", true)).toBe(true);
    w.player.hp = 20;
    w.battle.gear = [];
    w.battle.equipment = {};
    c.state.cooldowns.scientist_0 = 6;
    expect(c.preset("boss", false)).toBe(true);
    expect(w.player.hp).toBe(20);
    expect(w.battle.gear).toHaveLength(0);
    expect(w.battle.equipment).toEqual({});
    expect(c.state.cooldowns.scientist_0).toBe(6);
    const save = parseSave(JSON.stringify(w.snapshot(defaultSettings())))!;
    expect(save).not.toBeNull();
    expect(new World(save).classes.state.cooldowns.scientist_0).toBe(6);
  });
  it("repairs foreign skill slots but rejects malformed ranks, gauges and SP overspending", () => {
    const w = setup("guardian", 10),
      s: any = w.snapshot(defaultSettings());
    s.classes.slots[0] = "ranger_0";
    expect(parseSave(JSON.stringify(s))?.classes?.slots[0]).toBeNull();
    s.classes.gauge = 101;
    expect(parseSave(JSON.stringify(s))).toBeNull();
    s.classes.gauge = 0;
    s.classes.ranks.guardian_passive0 = 5;
    s.classes.ranks.guardian_passive1 = 10;
    expect(parseSave(JSON.stringify(s))).toBeNull();
  });
  it("trial saves always contain the original character and trial rewards cannot duplicate", () => {
    const original = setup("ranger", 30);
    original.inventory.iron = 5;
    const before = original.snapshot(defaultSettings());
    const trial = beginTrial(original, "engineer")!;
    expect(trial).not.toBeNull();
    trial.inventory.iron = 100;
    trial.battle.credits = 999;
    trial.player.level = 90;
    expect({
      ...trial.snapshot(defaultSettings()),
      savedAt: before.savedAt,
    }).toEqual(before);
    const restored = finishTrial(trial)!;
    expect(restored.inventory).toEqual(before.inventory);
    expect(restored.player.level).toBe(30);
    expect(restored.battle.credits).toBe(before.battle.credits);
    expect(restored.classes.state.classId).toBe("ranger");
    expect(restored.classes.state.trials.engineer).toBeUndefined();
  });
  it("real attacks and class actions complete a Ranger trial, preserving only first improvement rewards", () => {
    const original = new World();
    original.player.level = 30;
    function complete(source: World) {
      const w = beginTrial(source, "ranger")!;
      w.player.invulnerable = 999;
      for (let i = 0; i < 3; i++) {
        w.player.x = 600;
        w.player.facing = 1;
        w.classes.lock = 0;
        w.player.dashCooldown = 0;
        w.player.energy = w.stats.energy;
        w.classes.cast(`ranger_${i}`);
        tick(w, 1);
      }
      for (let i = 0; i < 35; i++) {
        w.player.x = 620;
        w.player.facing = 1;
        w.combat.weapons.update(0.3, { ...emptyInput(), attack: true });
        w.combat.projectiles.update(0.15);
        w.classes.update(0.3, emptyInput());
      }
      expect(w.classes.trial!.hits).toBeGreaterThanOrEqual(6);
      expect(w.classes.trial!.kills).toBeGreaterThanOrEqual(1);
      expect(w.classes.trial!.grade).toBeGreaterThan(0);
      return finishTrial(w)!;
    }
    const first = complete(original);
    expect(first.classes.state.trials.ranger).toBeGreaterThan(0);
    const xp = first.classes.state.mastery.ranger;
    const second = complete(first);
    expect(second.classes.state.mastery.ranger).toBe(xp);
  });
  it("optional hard rematches add telegraphed patterns without changing the story save", () => {
    const w = setup("guardian");
    w.battle.bossKills = 1;
    const before = w.snapshot(defaultSettings());
    const rematch = beginRematch(w, "titan", 2)!;
    expect(rematch).not.toBeNull();
    rematch.combat.boss.skip();
    rematch.player.invulnerable = 100;
    tick(rematch, 7);
    expect(
      rematch.combat.hazards.some(
        (h) => h.label.includes("숙련") || h.label.includes("아카데미"),
      ),
    ).toBe(true);
    expect({
      ...rematch.snapshot(defaultSettings()),
      savedAt: before.savedAt,
    }).toEqual(before);
    expect(finishTrial(rematch)!.battle.bossKills).toBe(1);
  });
});
