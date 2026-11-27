import type { BattleSave } from "../combat/types";
import type { EnvGearId } from "../survival/catalog";
import type { RegionId, ItemId } from "../data/content";
export interface ExtremeSave {
  temperature: number;
  pressure: number;
  radiation: number;
  jetEnergy: number;
  weather: Record<string, number>;
  kills: Record<string, number>;
  archives: string[];
  presets: Partial<Record<string, EnvGearId[]>>;
  combatPresets?: Partial<
    Record<
      string,
      { equipment: BattleSave["equipment"]; weapons: BattleSave["weaponSlots"] }
    >
  >;
  horizon: boolean;
  vehicle: null | {
    kind: "rover" | "pod";
    region: RegionId;
    x: number;
    y: number;
    energy: number;
    mounted: boolean;
    hp: number;
    cargo: Partial<Record<ItemId, number>>;
  };
}
export const newExtreme = (): ExtremeSave => ({
  temperature: 0,
  pressure: 0,
  radiation: 0,
  jetEnergy: 100,
  weather: {},
  kills: {},
  archives: [],
  presets: {},
  horizon: false,
  vehicle: null,
});
