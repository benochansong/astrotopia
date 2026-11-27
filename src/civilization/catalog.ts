import type { Cost, Recipe, Technology } from "../survival/catalog";
import type { BuildingDef } from "../colony/catalog";
export const civilNames = {
  starEngine: "고급 항성 엔진",
  universalSupport: "범용 생명 유지 모듈",
  transcendentReactor: "초월 반응로 모듈",
  robotAssembly: "산업 로봇 조립체",
  colonyRation: "정착민 식량",
} as const;
export type CivilItem = keyof typeof civilNames;
export const civilItems = Object.fromEntries(
  Object.entries(civilNames).map(([id, name]) => [
    id,
    {
      name,
      type: "문명 산업",
      color: "#81e2dd",
      icon: "⬡",
      description: "다중 행성 산업과 개척에 사용합니다.",
    },
  ]),
) as Record<
  CivilItem,
  {
    name: string;
    type: string;
    color: string;
    icon: string;
    description: string;
  }
>;
export const marketPrices = {
  iron: 4,
  copper: 5,
  crystal: 8,
  fiber: 3,
  biomass: 3,
  scrap: 2,
  alloy: 20,
  electronics: 30,
  denseCell: 35,
  shipFuel: 12,
  industrialAlloy: 28,
  heatAlloy: 45,
  polymer: 18,
  deepEnzyme: 25,
  quantumCircuit: 75,
  colonyRation: 12,
} as const;
export type MarketItem = keyof typeof marketPrices;
export const specialties = {
  eden: "생명 · 농업",
  ares: "금속 · 제련",
  frostia: "냉각 · 정밀",
  inferno: "고온 · 에너지",
  aquaria: "생명 공학 · 고압",
  lunaris: "양자 · 우주",
  omega: "고대 기술",
};
export const freightCosts: Record<1 | 2, Cost> = {
  1: { alloy: 12, electronics: 6, hullPanel: 2 },
  2: { industrialAlloy: 20, quantumCircuit: 6, hullPanel: 6 },
};
export const civilTech: Technology[] = [
  [
    "cargoAutomation",
    "물류 자동화",
    "물류",
    "shipEngineering",
    { electronics: 4, alloy: 6 },
  ],
  [
    "macroIndustry",
    "대규모 산업",
    "거대 산업",
    "cargoAutomation",
    { industrialAlloy: 6, denseCell: 4 },
  ],
  [
    "cityManagement",
    "행성 도시 운영",
    "도시",
    "macroIndustry",
    { polymer: 6, electronics: 6 },
  ],
  [
    "orbitalCivilization",
    "궤도 개척",
    "궤도",
    "macroIndustry",
    { quantumCircuit: 4, spaceShield: 3 },
  ],
  [
    "localRestoration",
    "지역 문명 복원",
    "복원",
    "civilizationRestoration",
    { civilizationCore: 1, memoryData: 3 },
  ],
  [
    "stellarNavigation",
    "성간 항법 관측",
    "성간",
    "orbitalCivilization",
    { navCrystal: 4, denseComputingCircuit: 2 },
  ],
].map(([id, name, branch, requires, cost]) => ({
  id: id as string,
  name: name as string,
  branch: branch as string,
  requires: [requires as string],
  cost: cost as Cost,
  points: 8,
  seconds: 20,
  description: "문명 관제 센터에서 관련 시설과 운영 기능을 사용할 수 있습니다.",
}));
const recipe = (id: CivilItem, cost: Cost): Recipe => ({
  id,
  name: civilNames[id],
  cost,
  result: { kind: "item", id, count: 1 },
  facility: "workbench",
  tech: "macroIndustry",
  level: 30,
  seconds: 30,
  description: "행성별 소재를 합쳐 생산합니다.",
});
export const civilRecipes = [
  recipe("starEngine", {
    industrialAlloy: 3,
    coolingCell: 2,
    heatAlloy: 2,
    gravityCircuit: 1,
  }),
  recipe("universalSupport", {
    wovenFiber: 2,
    polymer: 2,
    deepEnzyme: 2,
    coolingCell: 1,
  }),
  recipe("transcendentReactor", {
    denseCell: 3,
    quantumCircuit: 2,
    ancientEnergyModule: 1,
  }),
  recipe("robotAssembly", { alloy: 3, electronics: 2 }),
  recipe("colonyRation", { biomass: 2, enzyme: 1 }),
];
const def = (
  name: string,
  category: BuildingDef["category"],
  power: number,
  cost: Cost,
  science = "macroIndustry",
  extra: Partial<BuildingDef> = {},
): BuildingDef => ({
  name,
  category,
  w: 200,
  h: 160,
  cost,
  seconds: 12,
  power,
  hp: 900,
  description: "문명 산업 · 전력과 창고 연결 필요",
  science,
  ...extra,
});
export const civilBuildings = {
  megaRefinery: def("대형 정제소", "industry", 28, {
    alloy: 16,
    electronics: 6,
  }),
  alloyComplex: def("첨단 합금 단지", "industry", 32, {
    industrialAlloy: 16,
    denseCell: 6,
  }),
  electronicsFab: def("전자 부품 공장", "industry", 25, {
    alloy: 12,
    electronics: 8,
  }),
  quantumFactory: def("양자 부품 공장", "industry", 40, {
    industrialAlloy: 12,
    quantumCircuit: 6,
  }),
  bioengineering: def("생명 공학 단지", "industry", 20, {
    polymer: 12,
    deepEnzyme: 6,
  }),
  roboticsFactory: def("로봇 조립 공장", "industry", 30, {
    alloy: 16,
    electronics: 10,
  }),
  spaceshipComplex: def("우주선 산업 단지", "industry", 45, {
    industrialAlloy: 18,
    quantumCircuit: 8,
  }),
  cityHabitat: def(
    "도시 거주 구역",
    "habitat",
    25,
    { alloy: 20, polymer: 16 },
    "cityManagement",
    { capacity: 500 },
  ),
  cityClinic: def(
    "도시 의료원",
    "habitat",
    15,
    { alloy: 10, medicalGel: 12 },
    "cityManagement",
  ),
  industrialPort: def(
    "산업 우주항 · 2선석",
    "logistics",
    15,
    { alloy: 15, electronics: 10 },
    "cargoAutomation",
  ),
  galacticPort: def(
    "은하 우주항 · 4선석",
    "logistics",
    25,
    { industrialAlloy: 20, quantumCircuit: 8 },
    "orbitalCivilization",
  ),
  megaSolar: def(
    "대형 태양광 배열",
    "energy",
    0,
    { alloy: 20, electronics: 12 },
    "macroIndustry",
    { generation: 80, range: 600 },
  ),
  stellarObservatory: def(
    "항성 관측소",
    "research",
    30,
    { quantumCircuit: 8, navCrystal: 6 },
    "stellarNavigation",
  ),
};
export const industrialRecipes: Record<string, string[]> = {
  megaRefinery: [],
  alloyComplex: [],
  electronicsFab: ["electronics"],
  quantumFactory: ["quantumCircuit", "quantumCell", "transcendentReactor"],
  bioengineering: ["colonyRation", "universalSupport"],
  roboticsFactory: ["robotAssembly"],
  spaceshipComplex: ["starEngine", "universalSupport", "transcendentReactor"],
};
export const restorationNames = {
  eden: "GENESIS GARDEN",
  ares: "AETERNUM FORGE",
  frostia: "CRYOGENIC NETWORK",
  inferno: "HELIOS REACTOR",
  aquaria: "ATLANTIS",
  lunaris: "STAR OBSERVATORY",
  omega: "AETERNUM CAPITAL",
};
export const civilizationQuests = [
  "새로운 문명",
  "자동 물류의 시작",
  "은하 시장",
  "거대 산업",
  "살아 있는 도시",
  "STELLAR NEXUS",
  "우주의 교차로",
  "ODYSSEY",
  "문명의 복원",
  "세 세계의 연결",
  "행성 대도시",
  "별 너머의 신호",
  "은하 개척자",
];
export const stationStages: Cost[] = [
  { industrialAlloy: 30, quantumCircuit: 10, hullPanel: 10 },
  { starEngine: 2, universalSupport: 3, denseCell: 20 },
  { transcendentReactor: 2, robotAssembly: 5, spaceControl: 2 },
];
export const stars = ["AURORA", "NEBULA", "TITAN", "ELYSIUM", "VOID"];
export const contracts = {
  supply: {
    name: "개척지 보급",
    cost: { alloy: 10, electronics: 5 } as Cost,
    reward: 500,
    tech: "cargoAutomation",
  },
  industrial: {
    name: "산업 지원",
    cost: { robotAssembly: 3, industrialAlloy: 10 } as Cost,
    reward: 1000,
    tech: "macroIndustry",
  },
  research: {
    name: "연구 자료",
    cost: { quantumCircuit: 4, memoryData: 2 } as Cost,
    reward: 1200,
    tech: "orbitalCivilization",
  },
  colony: {
    name: "주민 정착",
    cost: { colonyRation: 30, universalSupport: 1 } as Cost,
    reward: 800,
    tech: "cityManagement",
  },
  restoration: {
    name: "문명 복원 지원",
    cost: { civilizationCore: 1, spaceControl: 1 } as Cost,
    reward: 2000,
    tech: "localRestoration",
  },
};
