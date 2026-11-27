import type { OnlineState, Bag } from "./online";
import type { SaveData } from "../src/core/types";
import type { ColonySave } from "../src/colony/types";
export interface Trade {
  id: string;
  from: string;
  to: string;
  accepted: boolean;
  offers: Record<string, { items: Bag; credits: number }>;
  ready: string[];
  confirmed: string[];
}
export interface ColonyState extends OnlineState {
  economy?: SaveData;
  trades?: Trade[];
  restricted?: Bag;
}
export interface ColonyView {
  colony: ColonySave;
  warehouse: Bag;
  restricted: Bag;
  funds: number;
  points: number;
  technologies: string[];
  capacity: number;
  buildings: {
    id: number;
    name: string;
    powered: boolean;
    reason: string;
    recipes: { id: string; name: string }[];
  }[];
  trades: Trade[];
}
