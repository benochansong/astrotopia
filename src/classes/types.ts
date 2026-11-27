import type { BattleSave } from "../combat/types";
import type { EnvGearId } from "../survival/catalog";
import type { ClassId } from "./catalog";
export interface ClassSave {
  classId: ClassId | null;
  path: string | null;
  tier: number;
  highestTier: number;
  granted: number;
  ranks: Record<string, number>;
  slots: (string | null)[];
  gauge: number;
  cooldowns: Record<string, number>;
  mastery: Partial<Record<ClassId, number>>;
  trials: Record<string, number>;
  quests: number[];
  records: string[];
  resets: number;
  changes: number;
  changeCooldown: number;
  presets: Record<
    string,
    {
      classId: ClassId;
      slots: (string | null)[];
      common: BattleSave["skillSlots"];
      equipment: BattleSave["equipment"];
      weapons: BattleSave["weaponSlots"];
      environment: EnvGearId[];
    }
  >;
}
export const newClass = (level = 1): ClassSave => ({
  classId: null,
  path: null,
  tier: 0,
  highestTier: 0,
  granted: Math.max(0, level - 9),
  ranks: {},
  slots: [null, null, null, null],
  gauge: 0,
  cooldowns: {},
  mastery: {},
  trials: {},
  quests: [],
  records: [],
  resets: 0,
  changes: 0,
  changeCooldown: 0,
  presets: {},
});
export const totalSP = (level: number, highestTier: number, quests: number[]) =>
  Math.max(0, level - 9) +
  (highestTier >= 1 ? 5 : 0) +
  (highestTier >= 2 ? 5 : 0) +
  (highestTier >= 3 ? 10 : 0) +
  quests.length * 2;
