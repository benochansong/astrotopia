import type { Cost } from "../survival/catalog";
import type { BuildingKind, PartId } from "./catalog";
export interface Building {
  id: number;
  kind: BuildingKind;
  x: number;
  y: number;
  level: number;
  hp: number;
  enabled: boolean;
  remaining: number;
  age: number;
  paid: Cost;
  priority: number;
  battery: number;
  fuel: number;
  progress: number;
  recipe: string;
  repeat: boolean;
  target: number;
  produced: number;
  job: { recipe: string; remaining: number; cost: Cost } | null;
  legacy: boolean;
}
export type Role = "engineer" | "scientist" | "miner" | "medic" | "security";
export interface Settler {
  id: number;
  name: string;
  role: Role;
  home: number;
  assigned: number;
}
export interface Robot {
  id: number;
  role: "miner" | "repair" | "explorer";
  station: number;
  target: number;
  charge: number;
  x: number;
  state: "Idle" | "Moving" | "Working" | "Returning" | "Charging" | "Waiting";
  progress: number;
}
export interface ColonySave {
  id: string;
  name: string;
  serial: number;
  buildings: Building[];
  technologies: string[];
  research: { id: string; remaining: number } | null;
  reserve: Cost;
  settlers: Settler[];
  robots: Robot[];
  day: number;
  lastClock: number;
  enabled: boolean;
  siegeWins: number;
  siegeEnabled: boolean;
  ship: PartId[];
  coreAnalyzed: boolean;
  shipInspected: boolean;
  rescue: boolean;
}
export const newColony = (): ColonySave => ({
  id: "eden-sector-01",
  name: "EDEN · SECTOR 01",
  serial: 0,
  buildings: [],
  technologies: [],
  research: null,
  reserve: {},
  settlers: [],
  robots: [],
  day: 120,
  lastClock: Date.now(),
  enabled: false,
  siegeWins: 0,
  siegeEnabled: false,
  ship: [],
  coreAnalyzed: false,
  shipInspected: false,
  rescue: false,
});
export interface BuildingStatus {
  powered: boolean;
  network: number;
  reason: string;
  connected: boolean;
}
export interface PowerNetwork {
  id: number;
  members: number[];
  generation: number;
  demand: number;
  used: number;
  stored: number;
  capacity: number;
}
