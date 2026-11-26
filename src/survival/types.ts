import type { Inventory } from "../systems/inventory";
import type { ItemId, RegionId } from "../data/content";
import type { Cost, EnvGearId, Facility } from "./catalog";
export interface ProductionJob {
  id: number;
  kind: "craft" | "research";
  recipe: string;
  quantity: number;
  remaining: number;
  total: number;
  state: "working" | "ready" | "refund";
  cost: Cost;
  points: number;
  startedAt: number;
}
export interface SurvivalSave {
  oxygen: number;
  exposure: { toxic: number; radiation: number; unstable: number };
  owned: EnvGearId[];
  equipped: EnvGearId[];
  tools: number[];
  tool: number;
  technologies: string[];
  researchPoints: number;
  warehouse: Inventory;
  facilities: Facility[];
  jobs: ProductionJob[];
  serial: number;
  lastClock: number;
  discovered: ItemId[];
  records: string[];
  scanner: boolean;
  miningCooldowns: Record<string, number>;
  beacon: null | { region: RegionId; x: number };
  sentinelKills: number;
  sentinelBlueprint: boolean;
  blueprint: boolean;
  capacity: number;
  quick: ItemId[];
}
export const newSurvival = (): SurvivalSave => ({
  oxygen: 100,
  exposure: { toxic: 0, radiation: 0, unstable: 0 },
  owned: [],
  equipped: [],
  tools: [1],
  tool: 1,
  technologies: ["analysis", "metal"],
  researchPoints: 8,
  warehouse: {},
  facilities: ["terminal", "workbench", "warehouse"],
  jobs: [],
  serial: 0,
  lastClock: Date.now(),
  discovered: [],
  records: [],
  scanner: false,
  miningCooldowns: {},
  beacon: null,
  sentinelKills: 0,
  sentinelBlueprint: false,
  blueprint: false,
  capacity: 24,
  quick: ["medicalGel", "energyCell", "oxygenCan"],
});
