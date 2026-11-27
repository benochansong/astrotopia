import { weapons } from "../data/battle";
import { items } from "../data/content";
import { occupiedSlots } from "../systems/inventory";
import { environmentGear } from "../survival/catalog";
import { regionOrder } from "../data/content";
import { planetIds } from "../space/catalog";
import { extremeIds } from "../extreme/catalog";
import type { ExtremeSave } from "../extreme/types";
const obj = (x: any) => x && typeof x === "object" && !Array.isArray(x);
const num = (x: any, max = 100) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max;
export function validExtreme(s: any): s is ExtremeSave {
  if (
    !obj(s) ||
    !["temperature", "pressure", "radiation", "jetEnergy"].every((k) =>
      num(s[k]),
    ) ||
    typeof s.horizon !== "boolean" ||
    !obj(s.weather) ||
    Object.entries(s.weather).some(
      ([k, v]) => !planetIds.includes(k as never) || !num(v, 190),
    ) ||
    !obj(s.kills) ||
    Object.entries(s.kills).some(
      ([k, v]) =>
        !["leviathan", "helios", "emperor", "archon"].includes(k) ||
        !num(v, 1e9) ||
        !Number.isInteger(v),
    ) ||
    !Array.isArray(s.archives) ||
    s.archives.length > 4 ||
    new Set(s.archives).size !== s.archives.length ||
    s.archives.some((k: any) => !extremeIds.includes(k))
  )
    return false;
  if (!obj(s.presets) || Object.keys(s.presets).length > 6) return false;
  for (const [k, v] of Object.entries(s.presets) as [string, any][]) {
    if (
      !planetIds.includes(k as never) ||
      !Array.isArray(v) ||
      v.length > 8 ||
      v.some((id) => !Object.hasOwn(environmentGear, id)) ||
      new Set(
        v.map((id: keyof typeof environmentGear) => environmentGear[id].slot),
      ).size !== v.length
    )
      return false;
  }
  if (s.combatPresets !== undefined) {
    if (!obj(s.combatPresets) || Object.keys(s.combatPresets).length > 6)
      return false;
    for (const [id, p] of Object.entries(s.combatPresets) as [string, any][]) {
      if (
        !planetIds.includes(id as never) ||
        !obj(p) ||
        !obj(p.equipment) ||
        Object.entries(p.equipment).some(
          ([slot, id]) =>
            ![
              "primary",
              "secondary",
              "helmet",
              "body",
              "legs",
              "gloves",
              "boots",
              "core",
              "accessory",
            ].includes(slot) ||
            typeof id !== "string" ||
            !/^gear-\d+$/.test(id),
        ) ||
        !Array.isArray(p.weapons) ||
        p.weapons.length !== 2 ||
        !Object.hasOwn(weapons, p.weapons[0]) ||
        (p.weapons[1] !== null && !Object.hasOwn(weapons, p.weapons[1]))
      )
        return false;
    }
  }
  if (s.vehicle !== null) {
    const v = s.vehicle;
    if (
      !obj(v) ||
      !["rover", "pod"].includes(v.kind) ||
      !regionOrder.includes(v.region) ||
      !num(v.x, 10000) ||
      !num(v.y, 3000) ||
      !num(v.energy) ||
      typeof v.mounted !== "boolean" ||
      !num(v.hp) ||
      !obj(v.cargo) ||
      Object.entries(v.cargo).some(
        ([id, n]) =>
          !Object.hasOwn(items, id) ||
          !num(n, 1980) ||
          !Number.isInteger(n) ||
          Number(n) < 1,
      ) ||
      occupiedSlots(v.cargo) > 20
    )
      return false;
  }
  return true;
}
