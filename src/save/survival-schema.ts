import { items, regions, regionOrder } from "../data/content";
import {
  environmentGear,
  facilities,
  recipes,
  technologies,
} from "../survival/catalog";
import { occupiedSlots } from "../systems/inventory";
import type { SurvivalSave } from "../survival/types";
const obj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, max = 1e9) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const array = (v: unknown, valid: (x: any) => boolean, max = 100) =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every(valid) &&
  new Set(v).size === v.length;
export function validSurvival(
  s: unknown,
  warehouseCapacity = 60,
): s is SurvivalSave {
  if (
    !obj(s) ||
    !num(s.oxygen, 500) ||
    !obj(s.exposure) ||
    Object.keys(s.exposure).length !== 3 ||
    !["toxic", "radiation", "unstable"].every((k) => num(s.exposure[k], 100))
  )
    return false;
  if (
    !array(s.owned, (id) => Object.hasOwn(environmentGear, id), 40) ||
    !array(s.equipped, (id) => s.owned.includes(id), 8)
  )
    return false;
  if (
    new Set(
      s.equipped.map(
        (id: keyof typeof environmentGear) => environmentGear[id].slot,
      ),
    ).size !== s.equipped.length
  )
    return false;
  if (
    !array(s.tools, (n) => [1, 2, 3, 4].includes(n), 4) ||
    !s.tools.includes(1) ||
    !s.tools.includes(s.tool)
  )
    return false;
  if (
    !array(s.technologies, (id) => Object.hasOwn(technologies, id), 100) ||
    !num(s.researchPoints) ||
    !Number.isInteger(s.researchPoints) ||
    !array(s.facilities, (id) => Object.hasOwn(facilities, id), 6)
  )
    return false;
  if (
    !obj(s.warehouse) ||
    Object.entries(s.warehouse).some(
      ([id, n]) =>
        !Object.hasOwn(items, id) ||
        !num(n, warehouseCapacity * 99) ||
        !Number.isInteger(n),
    ) ||
    occupiedSlots(s.warehouse) > warehouseCapacity
  )
    return false;
  if (
    ![24, 36].includes(s.capacity) ||
    !num(s.serial) ||
    !Number.isInteger(s.serial) ||
    !num(s.lastClock, 1e15) ||
    !array(s.discovered, (id) => Object.hasOwn(items, id), 250) ||
    !Array.isArray(s.records) ||
    s.records.length > 200 ||
    s.records.some((x: any) => typeof x !== "string" || x.length > 100)
  )
    return false;
  if (
    typeof s.scanner !== "boolean" ||
    typeof s.sentinelBlueprint !== "boolean" ||
    typeof s.blueprint !== "boolean" ||
    !num(s.sentinelKills) ||
    !Number.isInteger(s.sentinelKills)
  )
    return false;
  if (
    !Array.isArray(s.quick) ||
    s.quick.length !== 3 ||
    s.quick.some(
      (id: string) =>
        ![
          "medicalGel",
          "energyCell",
          "oxygenCan",
          "antitoxin",
          "purifier",
          "portableBeacon",
          "recall",
        ].includes(id),
    )
  )
    return false;
  const nodeIds = Object.values(regions).flatMap((r) =>
    r.resources.map((n) => n.id),
  );
  if (
    !obj(s.miningCooldowns) ||
    Object.entries(s.miningCooldowns).some(
      ([id, n]) => !nodeIds.includes(id) || !num(n, 300),
    )
  )
    return false;
  if (
    s.beacon !== null &&
    (!obj(s.beacon) ||
      !regionOrder.includes(s.beacon.region) ||
      !num(s.beacon.x, 4400))
  )
    return false;
  if (
    !Array.isArray(s.jobs) ||
    s.jobs.length > 12 ||
    new Set(s.jobs.map((j: any) => j.id)).size !== s.jobs.length
  )
    return false;
  for (const j of s.jobs) {
    if (
      !obj(j) ||
      !["craft", "research"].includes(j.kind) ||
      !num(j.id, s.serial) ||
      !Number.isInteger(j.id) ||
      !["working", "ready", "refund"].includes(j.state) ||
      !num(j.quantity, 10) ||
      !Number.isInteger(j.quantity) ||
      j.quantity < 1 ||
      !num(j.startedAt, 1e15)
    )
      return false;
    const d = j.kind === "craft" ? recipes[j.recipe] : technologies[j.recipe];
    if (!d || (j.kind === "research" && j.quantity !== 1)) return false;
    const total = d.seconds * j.quantity;
    if (
      j.total !== total ||
      !num(j.remaining, total) ||
      (j.state !== "working" && j.remaining !== 0) ||
      !obj(j.cost)
    )
      return false;
    const cost = Object.fromEntries(
      Object.entries(d.cost).map(([k, n]) => [k, n! * j.quantity]),
    );
    if (
      Object.keys(j.cost).length !== Object.keys(cost).length ||
      Object.entries(cost).some(([id, n]) => j.cost[id] !== n)
    )
      return false;
    if (
      j.points !== (j.kind === "research" ? technologies[j.recipe].points : 0)
    )
      return false;
  }
  return true;
}
