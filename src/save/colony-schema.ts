import {
  buildings,
  colonyTech,
  definition,
  shipParts,
  partNames,
} from "../colony/catalog";
import type { ColonySave } from "../colony/types";
import { items } from "../data/content";
import { recipes } from "../survival/catalog";
const obj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, max = 1e9): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const int = (v: unknown, max = 1e9) => num(v, max) && Number.isInteger(v);
const list = (v: unknown, max: number) => Array.isArray(v) && v.length <= max;
const cost = (v: unknown) =>
  obj(v) &&
  Object.entries(v).every(([id, n]) => Object.hasOwn(items, id) && int(n, 1e6));
export const savedColonyCapacity = (s: ColonySave) =>
  Math.min(
    12000,
    60 +
      s.buildings
        .filter(
          (b) =>
            b.remaining <= 0 &&
            ["warehouse", "largeWarehouse"].includes(b.kind),
        )
        .reduce(
          (n, b) =>
            n +
            (definition(b.kind).capacity ?? 0) * (b.level - (b.legacy ? 1 : 0)),
          0,
        ),
  );
export function validColony(s: unknown): s is ColonySave {
  if (
    !obj(s) ||
    !["eden-sector-01", "ares-sector-01"].includes(s.id) ||
    typeof s.name !== "string" ||
    s.name.length > 40 ||
    !int(s.serial) ||
    !num(s.lastClock, 1e15) ||
    !num(s.day, 1200) ||
    !int(s.siegeWins) ||
    ![
      "enabled",
      "siegeEnabled",
      "coreAnalyzed",
      "shipInspected",
      "rescue",
    ].every((k) => typeof s[k] === "boolean") ||
    !cost(s.reserve)
  )
    return false;
  if (
    !list(s.technologies, 12) ||
    new Set(s.technologies).size !== s.technologies.length ||
    s.technologies.some((id: any) => !Object.hasOwn(colonyTech, id))
  )
    return false;
  if (
    s.research !== null &&
    (!obj(s.research) ||
      !Object.hasOwn(colonyTech, s.research.id) ||
      s.technologies.includes(s.research.id) ||
      !num(s.research.remaining, colonyTech[s.research.id].seconds))
  )
    return false;
  if (
    !list(s.ship, 6) ||
    new Set(s.ship).size !== s.ship.length ||
    s.ship.some((id: any) => !Object.hasOwn(partNames, id))
  )
    return false;
  if (
    !list(s.buildings, 150) ||
    new Set(s.buildings.map((b: any) => b?.id)).size !== s.buildings.length
  )
    return false;
  for (const b of s.buildings) {
    if (
      !obj(b) ||
      !int(b.id, s.serial) ||
      b.id === 0 ||
      !Object.hasOwn(buildings, b.kind) ||
      ![1, 2, 3].includes(b.level) ||
      !num(b.x, 9760) ||
      !num(b.y, 780) ||
      b.y < 300 ||
      !num(b.hp, definition(b.kind).hp * (1 + (b.level - 1) * 0.5)) ||
      !num(b.remaining, 15) ||
      !num(b.age) ||
      !cost(b.paid) ||
      !num(b.battery, 200 * b.level) ||
      !num(b.fuel, 180) ||
      !num(b.progress, 1e6) ||
      ![1, 2, 3, 4].includes(b.priority) ||
      typeof b.enabled !== "boolean" ||
      typeof b.legacy !== "boolean" ||
      typeof b.repeat !== "boolean" ||
      !int(b.target, 999) ||
      b.target < 1 ||
      !int(b.produced) ||
      typeof b.recipe !== "string" ||
      b.recipe.length > 50
    )
      return false;
    const paid: Record<string, number> = b.legacy
      ? {}
      : ({ ...definition(b.kind).cost } as Record<string, number>);
    for (let level = 1; level < b.level; level++) {
      paid.ironBar = (paid.ironBar ?? 0) + level * 3;
      paid.electronics = (paid.electronics ?? 0) + level;
    }
    if (
      Object.keys(paid).length !== Object.keys(b.paid).length ||
      Object.entries(paid).some(([id, n]) => b.paid[id] !== n)
    )
      return false;
    const validRecipe = (id: string) =>
      Object.hasOwn(recipes, id) ||
      Object.hasOwn(shipParts, id) ||
      [
        "grow_fiber",
        "grow_strongFiber",
        "grow_resin",
        "grow_enzyme",
        "grow_medicalGel",
      ].includes(id);
    if (b.recipe && !validRecipe(b.recipe)) return false;
    if (b.job !== null) {
      const j = b.job;
      if (
        !obj(j) ||
        j.recipe !== b.recipe ||
        !validRecipe(j.recipe) ||
        !num(j.remaining, 90) ||
        !cost(j.cost)
      )
        return false;
      const expected = recipes[j.recipe]?.cost ??
        shipParts[j.recipe as keyof typeof shipParts]?.cost ?? { biomass: 1 };
      if (
        Object.keys(expected).length !== Object.keys(j.cost).length ||
        Object.entries(expected).some(([id, n]) => j.cost[id] !== n)
      )
        return false;
    }
  }
  if (!list(s.settlers, 10) || !list(s.robots, 20)) return false;
  const ids = [...s.buildings, ...s.settlers, ...s.robots].map(
    (x: any) => x?.id,
  );
  if (new Set(ids).size !== ids.length) return false;
  for (const p of s.settlers)
    if (
      !obj(p) ||
      !int(p.id, s.serial) ||
      !["engineer", "scientist", "miner", "medic", "security"].includes(
        p.role,
      ) ||
      typeof p.name !== "string" ||
      p.name.length > 40 ||
      !s.buildings.some((b: any) => b.id === p.home && b.kind === "habitat") ||
      !int(p.assigned, s.serial)
    )
      return false;
  for (const r of s.robots)
    if (
      !obj(r) ||
      !int(r.id, s.serial) ||
      !["miner", "repair", "explorer"].includes(r.role) ||
      !s.buildings.some(
        (b: any) => b.id === r.station && b.kind === "robotStation",
      ) ||
      !int(r.target, s.serial) ||
      !num(r.charge, 100) ||
      !num(r.x, 10000) ||
      !num(r.progress, 20) ||
      ![
        "Idle",
        "Moving",
        "Working",
        "Returning",
        "Charging",
        "Waiting",
      ].includes(r.state)
    )
      return false;
  return true;
}
