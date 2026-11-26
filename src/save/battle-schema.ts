import { enemyData, items, regionOrder } from "../data/content";
import { gearTemplates, skills, weapons } from "../data/battle";
import type { BattleSave, Gear } from "../combat/types";
const obj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown, max = 1e9) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export const validGear = (g: unknown): g is Gear =>
  obj(g) &&
  typeof g.id === "string" &&
  /^gear-\d+$/.test(g.id) &&
  Object.hasOwn(gearTemplates, g.template) &&
  ["common", "uncommon", "rare", "epic"].includes(g.rarity);
export function validBattle(b: unknown): b is BattleSave {
  if (!obj(b)) return false;
  for (const key of [
    "ownedWeapons",
    "weaponSlots",
    "gear",
    "unlockedSkills",
    "skillSlots",
    "titles",
    "discovered",
    "story",
    "groundLoot",
  ])
    if (!Array.isArray(b[key])) return false;
  if (
    !b.ownedWeapons.length ||
    b.ownedWeapons.length > 6 ||
    b.ownedWeapons.some((w: string) => !Object.hasOwn(weapons, w)) ||
    new Set(b.ownedWeapons).size !== b.ownedWeapons.length
  )
    return false;
  if (
    b.weaponSlots.length !== 2 ||
    !b.ownedWeapons.includes(b.weaponSlots[0]) ||
    (b.weaponSlots[1] !== null && !b.ownedWeapons.includes(b.weaponSlots[1])) ||
    ![0, 1].includes(b.activeSlot) ||
    !b.weaponSlots[b.activeSlot]
  )
    return false;
  if (
    b.gear.length > 24 ||
    b.gear.some((g: unknown) => !validGear(g)) ||
    new Set(b.gear.map((g: Gear) => g.id)).size !== b.gear.length ||
    !obj(b.equipment)
  )
    return false;
  if (
    Object.entries(b.equipment).some(([slot, id]) => {
      const g = b.gear.find((g: Gear) => g.id === id);
      if (!g) return true;
      const t = gearTemplates[g.template];
      return t.weapon
        ? !["primary", "secondary"].includes(slot) ||
            b.weaponSlots[slot === "primary" ? 0 : 1] !== t.weapon
        : slot !== t.slot;
    })
  )
    return false;
  if (
    new Set(Object.values(b.equipment)).size !==
    Object.values(b.equipment).length
  )
    return false;
  if (
    b.unlockedSkills.length > 6 ||
    b.unlockedSkills.some((s: string) => !Object.hasOwn(skills, s)) ||
    b.skillSlots.length !== 4 ||
    b.skillSlots.some(
      (s: string | null) => s !== null && !Object.hasOwn(skills, s),
    )
  )
    return false;
  if (
    !number(b.credits) ||
    !number(b.bossKills) ||
    !Number.isInteger(b.bossKills) ||
    !number(b.serial) ||
    !Number.isInteger(b.serial) ||
    typeof b.bossSeen !== "boolean"
  )
    return false;
  if (
    b.titles.length > 1 ||
    b.titles.some((s: string) => s !== "개척자") ||
    b.story.length > 3 ||
    b.story.some(
      (s: string) => !["titanCore", "coreAnalysis", "engine"].includes(s),
    )
  )
    return false;
  if (
    b.discovered.length > 12 ||
    b.discovered.some((s: string) => !Object.hasOwn(enemyData, s))
  )
    return false;
  if (
    b.groundLoot.length > 5000 ||
    b.groundLoot.some(
      (l: any) =>
        !obj(l) ||
        typeof l.id !== "string" ||
        !/^loot-\d+$/.test(l.id) ||
        !regionOrder.includes(l.region) ||
        !number(l.x, 5200) ||
        !number(l.y, 1100) ||
        !number(l.count, 99) ||
        l.count < 1 ||
        !Number.isInteger(l.count) ||
        (l.gear ? !validGear(l.gear) : !Object.hasOwn(items, l.item)),
    )
  )
    return false;
  return true;
}
