import type { ColonySave } from "../colony/types";
import type { SurvivalSave } from "../survival/types";
import type { Inventory } from "../systems/inventory";
import type { PlanetId, ShipSystemId, ShipUpgrade } from "./catalog";
export type LocalSave = Pick<
  SurvivalSave,
  | "warehouse"
  | "facilities"
  | "jobs"
  | "lastClock"
  | "miningCooldowns"
  | "beacon"
>;
export interface PlanetSave {
  colony: ColonySave;
  local: LocalSave;
  visited: boolean;
}
export interface SpaceSave {
  location: PlanetId;
  repaired: ShipSystemId[];
  upgrades: ShipUpgrade[];
  fuel: number;
  launched: boolean;
  cargo: Inventory;
  planets: Partial<Record<PlanetId, PlanetSave>>;
  trip: null | {
    id: number;
    from: PlanetId;
    to: PlanetId;
    kind: "ascent" | "voyage";
    remaining: number;
    cost: number;
  };
  serial: number;
  emergencyClaimed: boolean;
  kills: number;
  heat: number;
  weather: number;
}
export const newSpace = (): SpaceSave => ({
  location: "eden",
  repaired: [],
  upgrades: [],
  fuel: 0,
  launched: false,
  cargo: {},
  planets: {},
  trip: null,
  serial: 0,
  emergencyClaimed: false,
  kills: 0,
  heat: 0,
  weather: 0,
});
