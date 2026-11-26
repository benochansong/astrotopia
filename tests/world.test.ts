import { describe, expect, it } from "vitest";
import { World, createPlayer } from "../src/core/world";
import { emptyInput, type InputFrame } from "../src/core/types";
import { movePlayer, maxHp, xpRequired } from "../src/physics/movement";
import { addItem, occupiedSlots } from "../src/systems/inventory";
import { defaultSettings, parseSave, SaveStore } from "../src/save/storage";
import { regions } from "../src/data/content";
const run = (w: World, seconds: number, input: Partial<InputFrame> = {}) => {
  for (let i = 0; i < Math.ceil(seconds * 120); i++)
    w.update(1 / 120, {
      ...emptyInput(),
      ...input,
      jump: i === 0 && !!input.jump,
      dash: i === 0 && !!input.dash,
      interact: i === 0 && !!input.interact,
    });
};
const settle = (w: World, x: number, y = 716) => {
  Object.assign(w.player, { x, y, vx: 0, vy: 0, grounded: false });
  run(w, 0.05);
};
describe("movement and collision", () => {
  it("lands on solid ground and accelerates without sinking at different frame rates", () => {
    const outcomes: number[] = [];
    for (const rate of [30, 60, 120]) {
      const w = new World();
      for (let i = 0; i < rate * 2; i++)
        w.update(1 / rate, { ...emptyInput(), right: true });
      expect(w.player.y).toBe(716);
      expect(w.player.grounded).toBe(true);
      outcomes.push(w.player.x);
    }
    expect(Math.max(...outcomes) - Math.min(...outcomes)).toBeLessThan(1);
  });
  it("supports variable jump height and reaches the first 125px ledge", () => {
    const jump = (hold: boolean) => {
      const w = new World();
      settle(w, 1080);
      let top = w.player.y;
      for (let i = 0; i < 150; i++) {
        w.update(1 / 120, { ...emptyInput(), jump: i === 0, jumpHeld: hold });
        top = Math.min(top, w.player.y);
      }
      return { w, top };
    };
    const high = jump(true),
      low = jump(false);
    expect(high.top).toBeLessThan(low.top - 50);
    expect(high.w.player.y).toBe(655 - 64);
    expect(low.w.player.y).toBe(716);
  });
  it("supports coyote time and buffered jumps", () => {
    const p = createPlayer(0, 50);
    p.coyote = 0.08;
    movePlayer(
      p,
      { ...emptyInput(), jump: true, jumpHeld: true },
      1 / 120,
      [],
      0.9,
    );
    expect(p.vy).toBeLessThan(-500);
    const w = new World();
    settle(w, 350);
    w.player.y = 700;
    w.player.grounded = false;
    w.player.vy = 180;
    run(w, 0.02, { jump: true, jumpHeld: true });
    run(w, 0.15, { jumpHeld: true });
    expect(w.player.vy).toBeLessThan(0);
  });
  it("drops through one-way platforms but not solid ground", () => {
    const w = new World();
    settle(w, 1080, 591);
    expect(w.player.grounded).toBe(true);
    run(w, 0.8, { down: true });
    expect(w.player.y).toBe(716);
    run(w, 0.5, { down: true });
    expect(w.player.y).toBe(716);
  });
  it("does not tunnel horizontally through a solid wall", () => {
    const p = createPlayer(0, 10);
    p.grounded = true;
    const wall = { x: 80, y: 0, w: 50, h: 200 };
    for (let i = 0; i < 60; i++)
      movePlayer(
        p,
        { ...emptyInput(), right: true, dash: i === 0 },
        1 / 120,
        [wall],
        0.9,
      );
    expect(p.x + p.w).toBeLessThanOrEqual(80);
  });
  it("charges energy once per dash and respects cooldown", () => {
    const w = new World();
    run(w, 0.05, { dash: true });
    expect(w.player.energy).toBeLessThan(84);
    const energy = w.player.energy;
    run(w, 0.05, { dash: true });
    expect(w.player.energy).toBeGreaterThan(energy);
  });
});
describe("exploration, resources, combat and progression", () => {
  it.each([
    ["crash", 1000, 716, 1080, 591],
    ["crash", 1210, 591, 1420, 506],
    ["crash", 1560, 506, 1740, 586],
    ["forest", 360, 716, 460, 596],
    ["forest", 665, 596, 850, 486],
    ["forest", 1030, 486, 1210, 386],
    ["valley", 730, 716, 830, 596],
    ["valley", 965, 596, 1140, 536],
    ["valley", 1270, 536, 1450, 476],
    ["valley", 1990, 716, 2110, 596],
    ["valley", 2215, 596, 2400, 526],
    ["valley", 2535, 526, 2730, 466],
  ] as const)(
    "makes the critical %s jump from (%s, %s) to (%s, %s)",
    (region, x, y, targetX, targetY) => {
      const w = new World();
      w.enterRegion(region);
      settle(w, x, y);
      w.player.invulnerable = 10;
      for (let i = 0; i < 168; i++)
        w.update(1 / 120, {
          ...emptyInput(),
          jump: i === 0,
          jumpHeld: true,
          right: w.player.x < targetX - 5,
        });
      expect(w.player.y).toBe(targetY);
      expect(w.player.grounded).toBe(true);
    },
  );
  it("mines nodes into stacked inventory and regenerates them", () => {
    const w = new World();
    settle(w, 623);
    run(w, 1.2, { interact: true });
    expect(w.inventory.scrap).toBe(3);
    expect(w.cooldowns["wreck-a"]).toBeGreaterThan(30);
    expect(w.progress.counters.scrap).toBe(3);
    run(w, 36);
    expect(w.cooldowns["wreck-a"]).toBe(0);
    run(w, 1.2, { interact: true });
    expect(w.inventory.scrap).toBe(6);
  });
  it("cancels mining out of range without consuming the resource", () => {
    const w = new World();
    settle(w, 623);
    run(w, 0.2, { interact: true });
    run(w, 1, { right: true });
    expect(w.inventory.scrap).toBeUndefined();
    expect(w.mining).toBeNull();
  });
  it("keeps a full-inventory resource intact and reports it", () => {
    const w = new World();
    w.inventory = { iron: 2376 };
    settle(w, 623);
    run(w, 1.2, { interact: true });
    expect(w.inventory.scrap).toBeUndefined();
    expect(w.cooldowns["wreck-a"]).toBeUndefined();
    expect(w.events.some((e) => e.text.includes("가득"))).toBe(true);
  });
  it("damages enemies with projectiles, awards XP and collects drops", () => {
    const w = new World();
    w.enterRegion("forest");
    settle(w, 600);
    w.player.invulnerable = 10;
    run(w, 2, { attack: true });
    expect(w.progress.counters.slime).toBeGreaterThanOrEqual(1);
    expect(w.player.xp).toBeGreaterThan(0);
    const drop = w.battle.groundLoot.find((d) => d.item === "gel");
    if (drop) {
      settle(w, drop.x - 17);
      run(w, 0.5);
    }
    expect(w.inventory.gel).toBeGreaterThanOrEqual(1);
  });
  it("has distinct wind-up attacks for crawlers and mantas", () => {
    const w = new World();
    w.enterRegion("forest");
    for (const kind of ["crawler", "manta"] as const) {
      const e = w.enemies.find((e) => e.kind === kind)!;
      w.player.x = e.x - 90;
      w.player.y = e.y;
      w.player.invulnerable = 10;
      run(w, 0.01);
      expect(e.state).toBe("Alert");
      run(w, 0.7);
      expect(["Chase", "PrepareAttack", "Attack"]).toContain(e.state);
    }
  });
  it("applies invulnerability and restores a safe checkpoint without losing progress", () => {
    const w = new World();
    w.inventory.iron = 8;
    w.player.xp = 20;
    w.player.invulnerable = 0;
    w.damage(20, 500);
    const hp = w.player.hp;
    w.damage(20, 500);
    expect(w.player.hp).toBe(hp);
    w.player.invulnerable = 0;
    w.damage(1000, 500);
    expect(w.player.animation).toBe("Death");
    run(w, 3);
    expect(w.player.hp).toBe(maxHp(1));
    expect(w.inventory.iron).toBe(8);
    expect(w.player.xp).toBe(20);
    expect(w.player.invulnerable).toBeGreaterThan(2);
  });
  it("completes all four quests, emits an ending and permits free exploration", () => {
    const w = new World();
    w.count("move");
    settle(w, 483);
    run(w, 0.01, { interact: true });
    settle(w, 843);
    run(w, 0.01, { interact: true });
    expect(w.progress.quest).toBe(1);
    settle(w, 1203);
    run(w, 0.01, { interact: true });
    settle(w, 623);
    run(w, 1.2, { interact: true });
    settle(w, 1743, 586);
    run(w, 1.2, { interact: true });
    expect(w.progress.quest).toBe(2);
    w.enterRegion("forest");
    w.count("slime", 3);
    w.collect("gel", 2);
    expect(w.progress.quest).toBe(3);
    w.enterRegion("valley");
    settle(w, 603);
    run(w, 1.2, { interact: true });
    settle(w, 3533);
    run(w, 0.01, { interact: true });
    expect(w.progress.quest).toBe(4);
    expect(w.events.some((e) => e.type === "ending")).toBe(true);
    const x = w.player.x;
    run(w, 0.5, { left: true });
    expect(w.player.x).toBeLessThan(x);
  });
  it("transitions in both directions and awards discovery only once", () => {
    const w = new World();
    settle(w, regions.crash.width - 35);
    run(w, 0.1, { right: true });
    expect(w.region).toBe("forest");
    const xp = w.player.xp;
    settle(w, 0);
    run(w, 0.05, { left: true });
    expect(w.region).toBe("crash");
    w.enterRegion("forest");
    expect(w.player.xp).toBe(xp);
  });
  it("caps at level 15 and heals on level-up", () => {
    const w = new World();
    w.player.hp = 1;
    w.addXp(xpRequired(1));
    expect(w.player.level).toBe(2);
    expect(w.player.hp).toBe(110);
    w.addXp(100000);
    expect(w.player.level).toBe(15);
    expect(w.player.xp).toBe(0);
  });
});
describe("inventory and defensive persistence", () => {
  it("stacks into 24 slots and rejects overflow atomically", () => {
    const inv = { iron: 2375 };
    expect(addItem(inv, "iron", 1)).toBe(true);
    expect(occupiedSlots(inv)).toBe(24);
    expect(addItem(inv, "gel", 1)).toBe(false);
    expect(inv).toEqual({ iron: 2376 });
  });
  it("roundtrips a complete save with a safe position while airborne", () => {
    const w = new World();
    settle(w, 1080);
    run(w, 0.1, { jump: true, jumpHeld: true });
    w.collect("copper", 4);
    const save = w.snapshot(defaultSettings());
    expect(save.y).toBe(716);
    const parsed = parseSave(JSON.stringify(save));
    expect(parsed).toEqual(save);
    expect(new World(parsed!).inventory.copper).toBe(4);
  });
  it.each([
    "{bad",
    "null",
    "[]",
    '{"version":99}',
    JSON.stringify({
      ...new World().snapshot(defaultSettings()),
      inventory: { evil: 3 },
    }),
    JSON.stringify({
      ...new World().snapshot(defaultSettings()),
      progress: { checkpoint: null },
    }),
    JSON.stringify({ ...new World().snapshot(defaultSettings()), level: 2.5 }),
  ])("rejects malformed or unsupported saves: %s", (raw) =>
    expect(parseSave(raw)).toBeNull(),
  );
  it("survives denied storage reads and quota errors", () => {
    const store = new SaveStore({
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("quota");
      },
    });
    expect(store.load()).toBeNull();
    expect(store.save(new World().snapshot(defaultSettings()))).toBe(false);
    expect(store.error).toContain("저장");
  });
  it("relocates an unsafe loaded location to safe ground", () => {
    const save = new World().snapshot(defaultSettings());
    save.region = "valley";
    save.x = 1150;
    save.y = 900;
    const w = new World(save);
    expect(w.player.x).toBe(regions.valley.spawn);
    expect(w.player.y).toBe(716);
  });
  it("resumes an interrupted death at the checkpoint", () => {
    const save = new World().snapshot(defaultSettings());
    save.region = "valley";
    save.hp = 0;
    save.x = 2800;
    save.progress.checkpoint = { region: "forest", x: 230 };
    const w = new World(save);
    expect(w.region).toBe("forest");
    expect(w.player.x).toBe(230);
    expect(w.player.hp).toBe(100);
    expect(w.player.invulnerable).toBe(4);
  });
  it("rejects prototype names masquerading as item IDs", () => {
    const save = new World().snapshot(defaultSettings());
    save.inventory = JSON.parse('{"constructor":1}');
    expect(parseSave(JSON.stringify(save))).toBeNull();
  });
});
