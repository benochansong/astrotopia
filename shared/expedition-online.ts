import type { ColonyState, ColonyView } from "./colony-online";
import type { PlanetId } from "../src/space/catalog";
import type { RegionId, EnemyKind } from "../src/data/content";
export const campaign: {
  planet: PlanetId;
  region: RegionId;
  kind: EnemyKind;
  level: number;
}[] = [
  { planet: "eden", region: "valley", kind: "titan", level: 3 },
  { planet: "ares", region: "aresFoundry", kind: "colossus", level: 20 },
  { planet: "frostia", region: "frostiaRuins", kind: "leviathan", level: 35 },
  { planet: "inferno", region: "infernoRuins", kind: "helios", level: 50 },
  { planet: "aquaria", region: "aquariaRuins", kind: "emperor", level: 65 },
  {
    planet: "lunaris",
    region: "lunarisRuins",
    kind: "nexusGuardian",
    level: 80,
  },
  { planet: "omega", region: "omegaCore", kind: "genesisZero", level: 90 },
];
export const dungeonDefinitions = {
  crystal: {
    name: "CRYSTAL DEPTHS",
    planet: "eden",
    region: "valley",
    boss: "titan",
    level: 5,
  },
  helios: {
    name: "HELIOS REACTOR",
    planet: "inferno",
    region: "infernoRuins",
    boss: "helios",
    level: 50,
  },
  abyssal: {
    name: "ABYSSAL ARCHIVE",
    planet: "aquaria",
    region: "aquariaRuins",
    boss: "emperor",
    level: 65,
  },
  nexus: {
    name: "NEXUS VAULT",
    planet: "omega",
    region: "omegaVault",
    boss: "nexusGuardian",
    level: 90,
  },
} as const;
export interface Voyage {
  id: string;
  party: string;
  from: PlanetId;
  to: PlanetId;
  boarded: string[];
  ready: string[];
  arrive: number;
  cost: number;
  fuelItem?: import("../src/data/content").ItemId;
}
export interface Mission {
  id: string;
  party: string;
  kind: "resources" | "science" | "rescue" | "industry" | "ruins";
  region: RegionId;
  progress: number;
  goal: number;
  contributors: string[];
  scanned: string[];
  baseline: number;
  done: boolean;
}
export interface Instance {
  id: string;
  party: string;
  kind: keyof typeof dungeonDefinitions | "raid";
  region: RegionId;
  roster: string[];
  cleared: boolean;
  abandoned?: boolean;
  devices: Record<string, number>;
  exposedUntil: number;
}
export interface Exploration {
  campaign: string[];
  voyages: Voyage[];
  missions: Mission[];
  instances: Instance[];
  gear: Record<string, { weapon: number; suit: number }>;
  corps: {
    name: string;
    banner: string;
    reputation: number;
    bosses: number;
    goal: string;
  };
  ending: "" | "freedom" | "harmony" | "rebirth";
  vote: null | {
    eligible: string[];
    ballots: Record<string, string>;
    until: number;
    result: string;
  };
}
export interface ExpeditionState extends ColonyState {
  exploration?: Exploration;
}
export interface ExpeditionView extends ColonyView {
  exploration: Exploration;
  available: PlanetId[];
  planet: PlanetId;
  gravity: number;
}
