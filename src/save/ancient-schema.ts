import { newAncient, type AncientSave } from "../ancient/types";
import {
  moduleNames,
  endingNames,
  relicNames,
  puzzleSolutions,
} from "../ancient/catalog";
export function validAncient(v: unknown): v is AncientSave {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as AncientSave;
  const num = (n: unknown, max: number) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
  const list = (a: unknown, keys: unknown[], max = keys.length) =>
    Array.isArray(a) &&
    a.length <= max &&
    new Set(a).size === a.length &&
    a.every((x) => keys.includes(x));
  if (
    ["key", "visited", "ascended"].some(
      (k) => typeof (s as any)[k] !== "boolean",
    )
  )
    return false;
  if (
    !list(s.modules, Object.keys(moduleNames)) ||
    !list(s.puzzles, [0, 1, 2, 3, 4]) ||
    !list(s.memories, [0, 1, 2, 3, 4]) ||
    !list(
      s.quests,
      Array.from({ length: 14 }, (_, i) => i),
    )
  )
    return false;
  if (
    !Array.isArray(s.attempts) ||
    s.attempts.length !== 5 ||
    s.attempts.some(
      (a, i) =>
        !Array.isArray(a) ||
        a.length > puzzleSolutions[i].length ||
        a.some((v, j) => v !== puzzleSolutions[i][j]),
    )
  )
    return false;
  if (
    !s.kills ||
    Array.isArray(s.kills) ||
    typeof s.kills !== "object" ||
    Object.entries(s.kills).some(
      ([k, v]) =>
        !["aeternumGuardian", "nexusOverlord", "genesisZero"].includes(k) ||
        !num(v, 1e7) ||
        !Number.isInteger(v),
    )
  )
    return false;
  if (
    (s.ending !== null && !Object.hasOwn(endingNames, s.ending)) ||
    (s.pending !== null && !Object.hasOwn(endingNames, s.pending))
  )
    return false;
  if ((s.ending || s.pending) && !s.kills.genesisZero) return false;
  if (
    !list(s.relics, Object.keys(relicNames)) ||
    !list(s.equipped, s.relics, 2) ||
    !list(s.restoration, Object.keys(relicNames))
  )
    return false;
  if (s.cinematic) {
    const c = s.cinematic;
    if (
      typeof c !== "object" ||
      !num(c.elapsed, 75) ||
      typeof c.replay !== "boolean" ||
      !/^(landing|memory-[0-4]|ending-(freedom|harmony|rebirth))$/.test(c.id)
    )
      return false;
    if (
      c.id.startsWith("memory-") &&
      !s.memories.includes(Number(c.id.slice(7)))
    )
      return false;
    if (c.id.startsWith("ending-") && !s.ending) return false;
  }
  if (s.cinematic !== null && !s.cinematic) return false;
  if (
    !s.nexus ||
    !num(s.nexus.floor, 10) ||
    !num(s.nexus.best, 10) ||
    ![0, 5].includes(s.nexus.checkpoint) ||
    !Number.isInteger(s.nexus.floor) ||
    !Number.isInteger(s.nexus.best) ||
    !num(s.trialBest, 1e6)
  )
    return false;
  if (
    !Array.isArray(s.records) ||
    s.records.length > 20 ||
    s.records.some(
      (r) =>
        !r ||
        !["nexus", "galactic", "transcendent"].includes(r.mode) ||
        !num(r.seconds, 1e6) ||
        !num(r.damage, 1e9) ||
        !num(r.deaths, 1e5) ||
        typeof r.classId !== "string" ||
        r.classId.length > 30 ||
        typeof r.rarity !== "string" ||
        r.rarity.length > 30 ||
        !Array.isArray(r.bossTimes) ||
        r.bossTimes.length > 10 ||
        r.bossTimes.some((n) => !num(n, 1e6)),
    )
  )
    return false;
  return true;
}
export { newAncient };
