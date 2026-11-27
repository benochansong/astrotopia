import { classes, classIds, classSkills, paths } from "../classes/catalog";
import { totalSP, type ClassSave } from "../classes/types";
import { skills, weapons, slotNames } from "../data/battle";
import { environmentGear } from "../survival/catalog";
const object = (x: unknown): x is Record<string, any> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const number = (x: unknown, max = 1e6) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max;
const integer = (x: unknown, max = 1e6) =>
  number(x, max) && Number.isInteger(x);
export function validClass(s: unknown, level: number): s is ClassSave {
  if (
    !object(s) ||
    (s.classId !== null && !classIds.includes(s.classId)) ||
    !integer(s.tier, 3) ||
    !integer(s.highestTier, 3) ||
    s.highestTier < s.tier ||
    !integer(s.granted, 1000)
  )
    return false;
  if (
    s.classId === null
      ? s.tier !== 0 || s.path !== null
      : s.tier < 1 || level < 10
  )
    return false;
  if (
    s.tier >= 2
      ? !object(paths[s.path]) ||
        paths[s.path].classId !== s.classId ||
        level < 30
      : s.path !== null
  )
    return false;
  if (
    (s.tier === 3 && level < 60) ||
    (s.highestTier >= 3 && level < 60) ||
    (s.highestTier >= 2 && level < 30) ||
    (s.highestTier >= 1 && level < 10)
  )
    return false;
  if (
    !object(s.ranks) ||
    Object.keys(s.ranks).length > 30 ||
    Object.entries(s.ranks).some(
      ([id, n]) =>
        !Object.hasOwn(classSkills, id) ||
        !integer(n, classSkills[id].max) ||
        classSkills[id].classId !== s.classId ||
        (classSkills[id].path && classSkills[id].path !== s.path) ||
        classSkills[id].tier > s.tier,
    )
  )
    return false;
  if (
    !Array.isArray(s.slots) ||
    s.slots.length !== 4 ||
    s.slots.some((id: unknown) => id !== null && typeof id !== "string")
  )
    return false;
  // Removed, foreign, or unlearned slots safely fall back to the preserved common skill.
  s.slots = s.slots.map((id: string | null) =>
    id &&
    Object.hasOwn(classSkills, id) &&
    s.ranks[id] &&
    classSkills[id].classId === s.classId &&
    (!classSkills[id].path || classSkills[id].path === s.path) &&
    !classSkills[id].passive &&
    !classSkills[id].ultimate
      ? id
      : null,
  );
  const nonempty = s.slots.filter(Boolean);
  if (new Set(nonempty).size !== nonempty.length) return false;
  if (
    !number(s.gauge, 100) ||
    !object(s.cooldowns) ||
    Object.entries(s.cooldowns).some(
      ([id, n]) => !Object.hasOwn(classSkills, id) || !number(n, 120),
    )
  )
    return false;
  if (
    !object(s.mastery) ||
    Object.entries(s.mastery).some(
      ([id, n]) => !Object.hasOwn(classes, id) || !number(n, 4000),
    )
  )
    return false;
  if (
    !object(s.trials) ||
    Object.entries(s.trials).some(
      ([id, n]) =>
        !classIds.some(
          (c) =>
            id === c ||
            id === `${c}_tier2` ||
            id === `${c}_tier3` ||
            id === `${c}_challenge`,
        ) || !integer(n, 4),
    )
  )
    return false;
  if (
    !Array.isArray(s.quests) ||
    s.quests.length > 8 ||
    new Set(s.quests).size !== s.quests.length ||
    s.quests.some((n: unknown) => !integer(n, 64) || Number(n) < 57)
  )
    return false;
  const records = [
    "mentor",
    "trial",
    "first",
    "learn",
    "skillHit",
    "combo",
    "gauge",
    "second",
    "challenge",
    "gear",
    "third",
    "ultimate",
    "rematch",
    "counter",
  ];
  if (
    !Array.isArray(s.records) ||
    s.records.length > records.length ||
    s.records.some((x: string) => !records.includes(x))
  )
    return false;
  if (
    !integer(s.resets) ||
    !integer(s.changes) ||
    !number(s.changeCooldown, 60)
  )
    return false;
  if (!object(s.presets) || Object.keys(s.presets).length > 6) return false;
  for (const [key, p] of Object.entries(s.presets)) {
    if (
      !["boss", "hunt", "defense", "mining", "water", "space"].includes(key) ||
      !object(p) ||
      !classIds.includes(p.classId) ||
      !Array.isArray(p.slots) ||
      p.slots.length !== 4 ||
      p.slots.some(
        (id: unknown) =>
          id !== null &&
          (typeof id !== "string" || !Object.hasOwn(classSkills, id)),
      )
    )
      return false;
    if (
      !Array.isArray(p.common) ||
      p.common.length !== 4 ||
      p.common.some(
        (id: string | null) => id !== null && !Object.hasOwn(skills, id),
      )
    )
      return false;
    if (
      !Array.isArray(p.weapons) ||
      p.weapons.length !== 2 ||
      !Object.hasOwn(weapons, p.weapons[0]) ||
      (p.weapons[1] !== null && !Object.hasOwn(weapons, p.weapons[1]))
    )
      return false;
    if (
      !object(p.equipment) ||
      Object.entries(p.equipment).some(
        ([slot, id]) =>
          !Object.hasOwn(slotNames, slot) ||
          typeof id !== "string" ||
          !/^gear-\d+$/.test(id),
      )
    )
      return false;
    if (
      !Array.isArray(p.environment) ||
      p.environment.length > 8 ||
      p.environment.some((id: string) => !Object.hasOwn(environmentGear, id))
    )
      return false;
  }
  s.granted = totalSP(level, s.highestTier, s.quests);
  const spent = Object.entries(s.ranks).reduce(
    (n, [id, v]) =>
      n +
      Math.max(
        0,
        Number(v) -
          (classSkills[id].tier === 1 && !classSkills[id].passive ? 1 : 0),
      ),
    0,
  );
  return spent <= s.granted;
}
