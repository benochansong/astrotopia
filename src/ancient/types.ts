import type { AncientModule, Ending, RelicId } from "./catalog";
export interface AncientSave {
  key: boolean;
  modules: AncientModule[];
  visited: boolean;
  puzzles: number[];
  attempts: number[][];
  memories: number[];
  kills: Record<string, number>;
  quests: number[];
  cinematic: null | { id: string; elapsed: number; replay: boolean };
  ending: Ending | null;
  pending: Ending | null;
  relics: RelicId[];
  equipped: RelicId[];
  ascended: boolean;
  restoration: RelicId[];
  nexus: { floor: number; checkpoint: number; best: number };
  trialBest: number;
  records: {
    mode: string;
    seconds: number;
    damage: number;
    deaths: number;
    classId: string;
    rarity: string;
    bossTimes: number[];
  }[];
}
export const newAncient = (): AncientSave => ({
  key: false,
  modules: [],
  visited: false,
  puzzles: [],
  attempts: [[], [], [], [], []],
  memories: [],
  kills: {},
  quests: [],
  cinematic: null,
  ending: null,
  pending: null,
  relics: [],
  equipped: [],
  ascended: false,
  restoration: [],
  nexus: { floor: 0, checkpoint: 0, best: 0 },
  trialBest: 0,
  records: [],
});
