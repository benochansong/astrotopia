import { World } from "../../src/core/world";
import { technologies } from "../../src/survival/catalog";
import {
  buildings,
  colonyTech,
  type BuildingKind,
} from "../../src/colony/catalog";
export function civilReady() {
  const w = new World();
  w.survival.state.blueprint = true;
  w.survival.state.technologies = Object.keys(technologies);
  w.player.level = 100;
  w.combat.unlock();
  w.events = [];
  w.player.hp = w.stats.hp;
  w.extreme.state.horizon = true;
  w.omega.state.ending = "freedom";
  w.omega.state.kills.genesisZero = 1;
  w.space.state.launched = true;
  w.colony.initialize();
  w.colony.state.technologies = Object.keys(colonyTech);
  return w;
}
export function build(w: World, kind: BuildingKind, x: number) {
  const d = buildings[kind];
  w.survival.state.warehouse = {
    ...w.survival.state.warehouse,
    ...Object.fromEntries(
      Object.entries(d.cost).map(([k, n]) => [
        k,
        (w.survival.state.warehouse[k as never] ?? 0) + n!,
      ]),
    ),
  };
  if (!w.colony.place(kind, x, 780))
    throw new Error(w.colony.placement(kind, x, 780));
  for (let i = 0; i < 16; i++) w.colony.tick(1, true);
  return w.colony.state.buildings.at(-1)!;
}
export function ports() {
  const w = civilReady();
  for (const id of ["eden", "ares"] as const) {
    w.space.switchPlanet(id);
    w.colony.state.technologies = Object.keys(colonyTech);
    build(w, "megaSolar", 3400);
    build(w, "industrialPort", 3600);
    w.colony.tick(1, true);
  }
  w.space.switchPlanet("eden");
  w.colony.tick(1, true);
  w.space.capture();
  return w;
}
import { planetIds } from "../../src/space/catalog";
export function stressWorld() {
  const w = civilReady();
  w.omega.state.visited = true;
  for (const [index, id] of planetIds.entries()) {
    w.space.switchPlanet(id);
    w.colony.state.technologies = Object.keys(colonyTech);
    const free = (kind: BuildingKind) => {
      Object.assign(w.survival.state.warehouse, buildings[kind].cost);
      for (let x = 3400; x < 9400; x += 40)
        if (!w.colony.placement(kind, x, 780)) return build(w, kind, x);
      throw new Error("stress placement " + id + " " + kind);
    };
    free("megaSolar");
    free("industrialPort");
    const template = free("floor");
    const target = index === 6 ? 74 : 71;
    while (w.colony.state.buildings.length < target) {
      const n = w.colony.state.buildings.length;
      w.colony.state.buildings.push({
        ...structuredClone(template),
        id: ++w.colony.state.serial,
        x: 3840 + (n % 36) * 80,
        y: n < 36 ? 780 : 580,
      });
    }
    w.colony.invalidate();
    w.colony.tick(1, true);
    w.civilization.city(id).population = index === 6 ? 716 : 714;
    w.civilization.city(id).wellbeing = 80;
  }
  w.space.switchPlanet("eden");
  w.colony.tick(1, true);
  w.survival.state.warehouse = {
    alloy: 500,
    electronics: 300,
    hullPanel: 100,
    shipFuel: 200,
    iron: 2000,
  };
  const c = w.civilization;
  for (let i = 0; i < 30; i++) {
    if (!c.buildShip(1, "eden")) throw new Error("stress ship");
    const ship = c.state.ships.at(-1)!;
    const cfg = {
      name: "route-" + i,
      from: "eden" as const,
      to: "ares" as const,
      item: "iron" as const,
      amount: 5,
      minimum: 10,
      target: 1500,
      interval: 5,
      priority: 2,
      repeat: true,
    };
    if (i < 20) {
      if (!c.createRoute(ship.id, cfg))
        throw new Error("stress historical route");
      c.recall(ship.id);
    }
    if (!c.createRoute(ship.id, cfg)) throw new Error("stress live route");
  }
  w.civilization.state.lastClock = Date.now();
  return w;
}
