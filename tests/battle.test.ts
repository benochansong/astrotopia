import { describe, it, expect } from "vitest";
import { World } from "../src/core/world";
import { emptyInput } from "../src/core/types";
import { newBattle, weapons } from "../src/data/battle";
import { EquipmentSystem } from "../src/combat/EquipmentSystem";
import { StatusEffectSystem } from "../src/combat/StatusEffectSystem";
import { createEnemy } from "../src/combat/EnemyAI";
import { DamageSystem } from "../src/combat/DamageSystem";
import {
  defaultSettings,
  parseSave,
  SAVE_KEY,
  SaveStore,
} from "../src/save/storage";
const tick = (w: World, n: number) => {
  for (let t = 0; t < n; t += 1 / 60) w.update(1 / 60, emptyInput());
};
describe("Battle evolution", () => {
  it("migrates and backs up phase 1 without losing progression", () => {
    const s: any = new World().snapshot(defaultSettings());
    delete s.battle;
    s.version = 1;
    s.level = 7;
    s.inventory = { iron: 12 };
    s.progress.quest = 4;
    s.settings = { music: 0.2, sfx: 0.4, effects: "low" };
    const raw = JSON.stringify(s),
      m = parseSave(raw)!;
    expect(m.version).toBe(9);
    expect(m.inventory.iron).toBe(12);
    expect(m.battle.ownedWeapons.length).toBeGreaterThan(2);
    const mem = new Map([[SAVE_KEY, raw]]);
    new SaveStore({
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => {
        mem.set(k, v);
      },
    }).save(m);
    expect(mem.get(SAVE_KEY + ".backup")).toBe(raw);
  });
  it("applies only active weapon gear and armor", () => {
    const b = newBattle(15);
    b.gear = [
      { id: "gear-1", template: "pulse", rarity: "epic" },
      { id: "gear-2", template: "body", rarity: "rare" },
    ];
    EquipmentSystem.equip(b, "gear-1");
    EquipmentSystem.equip(b, "gear-2");
    const a = EquipmentSystem.stats(15, b);
    b.activeSlot = 1;
    const z = EquipmentSystem.stats(15, b);
    expect(a.attack - z.attack).toBe(12);
    expect(z.hp).toBeGreaterThan(240);
  });
  it("restores training slots and never gives dummy loot", () => {
    const w = new World();
    w.player.x = 2140;
    const slots = [...w.battle.skillSlots],
      hp = w.player.hp;
    w.combat.startTraining();
    w.battle.skillSlots[0] = "orbital";
    for (const id of Object.keys(weapons) as (keyof typeof weapons)[]) {
      w.combat.trial(id);
      w.combat.weapons.update(0.02, { ...emptyInput(), attack: true });
      w.combat.weapons.update(0.02, emptyInput());
    }
    w.combat.hit(
      w.enemies.find((e) => e.kind === "dummy")!,
      {
        damage: 500,
        element: "physical",
        crit: 0,
        critDamage: 1,
        knockback: 0,
        statusChance: 0,
        special: false,
        sourceX: 2200,
      },
    );
    expect(w.battle.credits).toBe(0);
    expect(w.player.xp).toBe(0);
    expect(w.snapshot(defaultSettings()).battle.skillSlots).toEqual(slots);
    w.combat.endTraining();
    expect(w.battle.skillSlots).toEqual(slots);
    expect(w.player.hp).toBe(hp);
  });
  it("freezes after three chill stacks but does not freeze bosses", () => {
    const s: any[] = [];
    for (let i = 0; i < 3; i++) StatusEffectSystem.apply(s, "chill", 2);
    expect(s.some((s) => s.id === "freeze")).toBe(true);
    const boss: any[] = [];
    for (let i = 0; i < 9; i++)
      StatusEffectSystem.apply(boss, "chill", 2, false, true);
    expect(boss.some((s) => s.id === "freeze")).toBe(false);
  });
  it("preserves full-inventory loot across saves and collects it once", () => {
    const w = new World();
    w.inventory = { iron: 2376 };
    w.combat.loot.place(377, 716, "gel", 2);
    tick(w, 0.1);
    expect(w.battle.groundLoot.length).toBe(1);
    const w2 = new World(
      parseSave(JSON.stringify(w.snapshot(defaultSettings())))!,
    );
    w2.inventory = {};
    tick(w2, 0.1);
    expect(w2.inventory.gel).toBe(2);
    tick(w2, 0.1);
    expect(w2.inventory.gel).toBe(2);
  });
  it("has higher beetle weakness damage and bounded stagger", () => {
    const w = new World();
    const e = createEnemy("beetle", 500, 780, 1);
    e.facing = 1;
    const a = {
      damage: 100,
      element: "physical" as const,
      crit: 0,
      critDamage: 1,
      knockback: 1,
      statusChance: 0,
      special: false,
      sourceX: 700,
    };
    expect(
      DamageSystem.resolve(e, { ...a, sourceX: 400 }, 1).damage,
    ).toBeGreaterThan(DamageSystem.resolve(e, a, 1).damage);
    w.combat.hit(e, a);
    e.state = "Chase";
    w.combat.hit(e, a);
    expect(e.state).toBe("Chase");
  });
  it("runs all three boss phases and first-only core rewards", () => {
    const w = new World();
    w.enterRegion("valley");
    const b = w.combat.boss;
    b.start();
    expect(w.snapshot(defaultSettings()).x).toBe(3820);
    b.skip();
    w.player.invulnerable = 999;
    const seen = new Set<string>();
    for (const ratio of [1, 0.6, 0.25]) {
      b.enemy!.hp = b.enemy!.maxHp * ratio;
      for (let t = 0; t < 50; t += 0.05) {
        b.update(0.05);
        seen.add(b.pattern);
      }
    }
    expect(seen.size).toBe(13);
    b.defeat();
    expect(w.inventory.titanCore).toBe(1);
    const xp = w.player.xp;
    b.defeat();
    expect(w.player.xp).toBe(xp);
    b.start();
    b.defeat();
    expect(w.inventory.titanCore).toBe(1);
    expect(w.battle.bossKills).toBe(2);
  });
  it("rejects injected gear identifiers", () => {
    const s = new World().snapshot(defaultSettings());
    s.battle.gear.push({
      id: '" onclick="evil',
      template: "pulse",
      rarity: "common",
    });
    expect(parseSave(JSON.stringify(s))).toBeNull();
  });
});
