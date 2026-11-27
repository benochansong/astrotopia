import type { Inventory } from "../systems/inventory";
import type { PlanetId } from "../space/catalog";
import type { ItemId } from "../data/content";
export type Endpoint = PlanetId | "station";
export type FlightState =
  | "Idle"
  | "Loading"
  | "Departing"
  | "InTransit"
  | "Arrived"
  | "Unloading"
  | "Returning"
  | "Refueling"
  | "Maintenance"
  | "Waiting";
export interface Freighter {
  id: number;
  owner: string;
  tier: 1 | 2;
  at: Endpoint;
  route: number | null;
  state: FlightState;
  remaining: number;
  fuel: number;
  condition: number;
  cargo: Inventory;
  reason: string;
  returning: boolean;
}
export interface Route {
  id: number;
  name: string;
  from: Endpoint;
  to: Endpoint;
  item: ItemId;
  amount: number;
  minimum: number;
  target: number;
  interval: number;
  priority: number;
  repeat: boolean;
  enabled: boolean;
  delivered: number;
}
export interface TradeRule {
  id: number;
  at: Endpoint;
  item: ItemId;
  side: "buy" | "sell";
  threshold: number;
  target: number;
  batch: number;
  price: number;
  reserve: number;
  budget: number;
  enabled: boolean;
}
export interface City {
  population: number;
  wellbeing: number;
  focus: import("./workforce").WorkFocus;
  supplied: boolean;
}
export interface CivilizationSave {
  owner: string;
  serial: number;
  elapsed: number;
  lastClock: number;
  advanced: boolean;
  ships: Freighter[];
  routes: Route[];
  rules: TradeRule[];
  markets: Partial<Record<Endpoint, Inventory>>;
  cities: Partial<Record<PlanetId, City>>;
  station: { stage: number; warehouse: Inventory; visited: boolean };
  odyssey: boolean;
  restored: PlanetId[];
  contracts: string[];
  quests: number[];
  reputation: number;
  milestones: string[];
  samples: {
    time: number;
    credits: number;
    population: number;
    delivered: number;
  }[];
  logs: { id: number; time: number; text: string }[];
  stats: { bought: number; sold: number; delivered: number; contracts: number };
}
export const newCivilization = (now = Date.now()): CivilizationSave => ({
  owner: "pioneer-local",
  serial: 0,
  elapsed: 0,
  lastClock: now,
  advanced: false,
  ships: [],
  routes: [],
  rules: [],
  markets: {},
  cities: {},
  station: { stage: 0, warehouse: {}, visited: false },
  odyssey: false,
  restored: [],
  contracts: [],
  quests: [],
  reputation: 0,
  milestones: [],
  samples: [],
  logs: [],
  stats: { bought: 0, sold: 0, delivered: 0, contracts: 0 },
});
