import type { PlanetId } from "../space/catalog";
export const workforceNames = {
  industry: "산업 노동자",
  miner: "광부",
  engineer: "기술자",
  science: "연구원",
  medic: "의료 인력",
  logistics: "물류 인력",
  agriculture: "농업 인력",
  security: "경비 인력",
  shiptech: "우주선 기술자",
} as const;
export type WorkFocus = keyof typeof workforceNames;
