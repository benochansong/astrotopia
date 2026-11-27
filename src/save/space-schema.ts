import { items } from "../data/content";
import {
  planetIds,
  shipSystems,
  upgrades,
  planetForRegion,
} from "../space/catalog";
import type { SpaceSave } from "../space/types";
import { occupiedSlots } from "../systems/inventory";
import { validColony, savedColonyCapacity } from "./colony-schema";
import { validSurvival } from "./survival-schema";
import type { SurvivalSave } from "../survival/types";
const obj = (x: any) => x && typeof x === "object" && !Array.isArray(x);
const num = (x: any, max = 1e9) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max;
const list = (x: any, keys: object) =>
  Array.isArray(x) &&
  x.length <= Object.keys(keys).length &&
  new Set(x).size === x.length &&
  x.every((k) => Object.hasOwn(keys, k));
export function validSpace(
  s: any,
  global: SurvivalSave,
  region: string,
  horizon = false,
): s is SpaceSave {
  if (
    !obj(s) ||
    !planetIds.includes(s.location) ||
    (region !== "ship" && planetForRegion(region) !== s.location) ||
    !list(s.repaired, shipSystems) ||
    !list(s.upgrades, upgrades) ||
    !num(s.fuel, 100) ||
    !Number.isInteger(s.fuel) ||
    typeof s.launched !== "boolean" ||
    typeof s.emergencyClaimed !== "boolean" ||
    !num(s.serial) ||
    !Number.isInteger(s.serial) ||
    !num(s.kills) ||
    !Number.isInteger(s.kills) ||
    !num(s.heat, 100) ||
    !num(s.weather, 150)
  )
    return false;
  if (
    !obj(s.cargo) ||
    Object.entries(s.cargo).some(
      ([id, n]) =>
        !Object.hasOwn(items, id) || !num(n, 31680) || !Number.isInteger(n),
    ) ||
    occupiedSlots(s.cargo) >
      (horizon ? 320 : s.upgrades.includes("cargo") ? 160 : 80)
  )
    return false;
  if (
    !obj(s.planets) ||
    Object.keys(s.planets).some((id) => !planetIds.includes(id as never))
  )
    return false;
  for (const [id, p] of Object.entries(s.planets) as [string, any][]) {
    if (
      !obj(p) ||
      typeof p.visited !== "boolean" ||
      !validColony(p.colony) ||
      p.colony.id !== id + "-sector-01" ||
      !obj(p.local) ||
      !validSurvival({ ...global, ...p.local }, savedColonyCapacity(p.colony))
    )
      return false;
  }
  if (s.trip !== null) {
    const t = s.trip;
    if (
      !obj(t) ||
      region !== "ship" ||
      !["ascent", "voyage"].includes(t.kind) ||
      !planetIds.includes(t.from) ||
      !planetIds.includes(t.to) ||
      t.from !== s.location ||
      !Number.isInteger(t.id) ||
      t.id < 1 ||
      t.id > s.serial ||
      !num(t.remaining, t.kind === "ascent" ? 20 : 8) ||
      !num(t.cost, 50) ||
      !Number.isInteger(t.cost) ||
      t.cost < 1 ||
      s.repaired.length !== 7
    )
      return false;
  }
  return true;
}
