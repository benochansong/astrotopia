import type { OmegaRegion } from "../ancient/catalog";
import {
  extremeIds,
  extremePlanets,
  type ExtremePlanet,
  type ExtremeRegion,
} from "../extreme/catalog";
import type { Cost, EnvGearId, Recipe } from "../survival/catalog";
import type { ItemId } from "../data/content";
export type PlanetId = "eden" | "ares" | "omega" | ExtremePlanet;
export const planetIds: PlanetId[] = ["eden", "ares", ...extremeIds, "omega"];
export type SpaceRegion =
  | OmegaRegion
  | ExtremeRegion
  | "ship"
  | "aresLanding"
  | "aresDunes"
  | "aresCanyon"
  | "aresFoundry";
export const spaceResources = {
  redIron: ["붉은 철광석", "광물", "#d59881"],
  pureTitanium: ["고순도 티타늄", "광물", "#c9c9c1"],
  cobalt: ["코발트 광석", "광물", "#82a4c8"],
  magnesium: ["마그네슘 광석", "광물", "#d4cab1"],
  desertCrystal: ["사막 결정", "광물", "#e4c88b"],
  thermalCrystal: ["열에너지 결정", "광물", "#efab78"],
  desertFiber: ["사막 생체 섬유", "식물", "#b8ae7a"],
  heatOre: ["내열 광물", "광물", "#bb8971"],
  industrialAlloy: ["고대 산업 합금", "정제 소재", "#bfa1a0"],
  powerCircuit: ["고출력 제어 회로", "부품", "#dfbc7c"],
  cobaltAlloy: ["코발트 합금", "정제 소재", "#a6b5d1"],
  heatAlloy: ["내열 합금", "정제 소재", "#d0b79e"],
  reinforcedPlate: ["강화 금속판", "정제 소재", "#b8c7cb"],
  efficientCell: ["고효율 에너지 셀", "정제 소재", "#dfc6a4"],
  advancedThruster: ["고급 추진 부품", "우주선 부품", "#d2c2ad"],
  heatShield: ["열 차폐 소재", "정제 소재", "#c6aa94"],
  advancedCircuit: ["고급 전자 회로", "부품", "#b7cfbf"],
  shipFuel: ["항해 연료", "우주선 연료", "#d6c599"],
  landingGear: ["강화 착륙 장치", "우주선 부품", "#b9c8ce"],
  replicaCore: ["복원 에너지 코어", "우주선 부품", "#d4bcf0"],
  duneCore: ["DUNE COLOSSUS 코어", "스토리", "#eeaa7a"],
  industrialData: ["고대 산업 데이터", "연구 데이터", "#d4bd97"],
  propulsionBlueprint: ["추진 장치 설계도", "스토리", "#eed2a1"],
} as const;
export type SpaceItem = keyof typeof spaceResources;
export const spaceItems = Object.fromEntries(
  Object.entries(spaceResources).map(([id, [name, type, color]]) => [
    id,
    {
      name,
      type,
      color,
      icon: "◇",
      description:
        id === "propulsionBlueprint"
          ? "거신 첫 처치 보상. PATHFINDER 연구를 해금합니다."
          : "우주 공학과 ARES 개척에 사용하는 자원. 연구·제작·우주선 화면에서 사용처를 확인하세요.",
    },
  ]),
) as Record<
  SpaceItem,
  {
    name: string;
    type: string;
    color: string;
    icon: string;
    description: string;
  }
>;
const env = (
  name: string,
  slot: string,
  oxygen = 0,
  efficiency = 0,
  defense = 0,
) => ({
  name,
  slot,
  toxic: 0,
  radiation: 0,
  unstable: 0,
  oxygen,
  efficiency,
  defense,
});
export const desertGear = {
  dustHelmet: env("방진 헬멧", "mask"),
  desertSuit: env("사막 탐험복", "suit", 20, 0.2, 9),
  coolingModule: env("냉각 모듈", "stabilizer"),
  stabilizerBoots: env("안정화 부츠", "boots", 0, 0, 3),
  advancedOxygen: env("고급 산소 공급 장치", "oxygen", 160, 0.45),
};
export const spaceTechRows = [
  {
    id: "shipEngineering",
    name: "기초 우주선 수리",
    branch: "우주",
    requires: ["colony"],
    cost: { data: 2 },
    points: 2,
    description: "항해 연료·착륙 장치·복원 코어 제작",
  },
  {
    id: "desertExploration",
    name: "사막 환경 분석",
    branch: "탐사",
    requires: ["shipEngineering"],
    cost: { data: 2, ecology: 1 },
    points: 2,
    description: "방진 헬멧·사막 탐험복·냉각 모듈·부츠·산소 팩 제작",
  },
  {
    id: "aresMaterials",
    name: "ARES 고급 소재",
    branch: "소재",
    requires: ["desertExploration"],
    cost: { data: 2, cobalt: 2 },
    points: 3,
    description: "코발트 합금·내열 합금·고급 회로·추진 부품 제작",
  },
  {
    id: "planetComms",
    name: "행성 간 통신",
    branch: "물류",
    requires: ["shipEngineering"],
    cost: { data: 2, electronics: 2 },
    points: 2,
    description: "행성별 원격 시설 정지·목표·우선순위 변경",
  },
  {
    id: "pathfinder",
    name: "PATHFINDER 추진 공학",
    branch: "우주",
    requires: ["aresMaterials"],
    cost: { industrialData: 1, propulsionBlueprint: 1 },
    points: 4,
    description: "MK-II 우주선 장치 강화·효율·화물칸 확장",
  },
] as const;
export function installSpaceRecipes(recipes: Record<string, Recipe>) {
  const put = (
    id: string,
    name: string,
    cost: Cost,
    result: Recipe["result"],
    facility: Recipe["facility"] = "workbench",
    tech = "shipEngineering",
    seconds = 6,
  ) => {
    recipes[id] = {
      id,
      name,
      cost,
      result,
      facility,
      tech,
      seconds,
      level: 1,
      description: "행성 탐험과 우주선 운영을 위한 제작.",
    };
  };
  const item = (
    id: SpaceItem,
    cost: Cost,
    facility: Recipe["facility"] = "refinery",
    tech = "aresMaterials",
    count = 1,
  ) =>
    put(
      "space_" + id,
      spaceItems[id].name,
      cost,
      { kind: "item", id, count },
      facility,
      tech,
    );
  item(
    "shipFuel",
    { crystal: 1, copper: 1 },
    "workbench",
    "shipEngineering",
    5,
  );
  put(
    "space_desertFuel",
    "사막 자원 항해 연료",
    { desertCrystal: 1, redIron: 1 },
    { kind: "item", id: "shipFuel", count: 5 },
    "workbench",
    "shipEngineering",
    3,
  );
  item(
    "landingGear",
    { titaniumBar: 2, electronics: 1 },
    "workbench",
    "shipEngineering",
  );
  item(
    "replicaCore",
    { alloy: 2, denseCell: 2 },
    "workbench",
    "shipEngineering",
  );
  item("cobaltAlloy", { cobalt: 3, ironBar: 1 });
  item("heatAlloy", { heatOre: 2, magnesium: 1, ironBar: 1 });
  item("reinforcedPlate", { pureTitanium: 2, ironBar: 1 });
  item("efficientCell", { thermalCrystal: 2, refinedCell: 1 });
  item("advancedCircuit", { powerCircuit: 1, wafer: 2 });
  item("heatShield", { heatOre: 2, polymer: 1 });
  item(
    "advancedThruster",
    { cobaltAlloy: 2, heatAlloy: 2, electronics: 1 },
    "equipment",
  );
  put(
    "space_redIron",
    "붉은 광석 → 철괴",
    { redIron: 2 },
    { kind: "item", id: "ironBar", count: 1 },
    "refinery",
    "shipEngineering",
  );
  put(
    "space_pureTitanium",
    "고순도 티타늄 정제",
    { pureTitanium: 2 },
    { kind: "item", id: "titaniumBar", count: 1 },
    "refinery",
    "shipEngineering",
  );
  const costs: Record<keyof typeof desertGear, Cost> = {
    dustHelmet: { polymer: 2, wafer: 1 },
    desertSuit: { wovenFiber: 3, titaniumBar: 2, polymer: 2 },
    coolingModule: { copperBar: 2, refinedCell: 2 },
    stabilizerBoots: { titaniumBar: 1, wovenFiber: 2 },
    advancedOxygen: { titaniumBar: 2, electronics: 2, polymer: 1 },
  };
  for (const [id, d] of Object.entries(desertGear))
    put(
      "space_" + id,
      d.name,
      costs[id as keyof typeof costs],
      { kind: "environment", id: id as EnvGearId },
      "equipment",
      "desertExploration",
    );
}
export const shipSystems = {
  hull: { name: "선체", part: "hullPanel", cost: { hullPanel: 1 } },
  propulsion: {
    name: "추진 장치",
    part: "thrusterPart",
    cost: { thrusterPart: 1 },
  },
  navigation: {
    name: "항법 장치",
    part: "navCircuit",
    cost: { navCircuit: 1 },
  },
  communication: {
    name: "통신 장치",
    part: "commModule",
    cost: { commModule: 1 },
  },
  lifeSupport: {
    name: "생명 유지",
    part: "lifeSupport",
    cost: { lifeSupport: 1 },
  },
  core: {
    name: "에너지 코어",
    part: "coreStabilizer",
    cost: { coreStabilizer: 1, replicaCore: 1 },
  },
  landing: { name: "착륙 장치", part: null, cost: { landingGear: 1 } },
} as const;
export type ShipSystemId = keyof typeof shipSystems;
export const upgrades = {
  propulsion: {
    name: "추진 장치 MK-II",
    cost: { advancedThruster: 1, efficientCell: 2 },
    effect: "연료 소모 −20% · 최대 항해 거리 2",
  },
  cargo: {
    name: "화물칸 MK-II",
    cost: { reinforcedPlate: 3, cobaltAlloy: 2 },
    effect: "화물 용량 80 → 160칸",
  },
  navigation: {
    name: "항법 장치 MK-II",
    cost: { advancedCircuit: 2, industrialData: 1 },
    effect: "항해 시간 8 → 5초 · 장거리 탐사 신호 분석",
  },
  hull: {
    name: "선체 보호 MK-II",
    cost: { heatShield: 3, reinforcedPlate: 2 },
    effect: "기본 산소 보호 유예 12 → 20초",
  },
  lifeSupport: {
    name: "고급 생명 유지",
    cost: { polymer: 3, efficientCell: 2 },
    effect: "선내 회복 8 → 16 HP/s",
  },
} as const;
export type ShipUpgrade = keyof typeof upgrades;
export const starPlanets = [
  {
    id: "eden",
    name: "EDEN",
    gravity: 0.9,
    color: "#9cc3a1",
    radius: 25,
    orbit: 100,
    level: "1–15",
    type: "생명체 행성",
    hazard: "일반 대기 · 숲과 수정 계곡",
    available: true,
  },
  {
    id: "ares",
    name: "ARES",
    gravity: 0.65,
    color: "#d59a7b",
    radius: 20,
    orbit: 180,
    level: "15–30",
    type: "붉은 사막 행성",
    hazard: "희박한 산소 · 모래폭풍 · 고열",
    available: true,
  },
  {
    id: "frostia",
    name: "FROSTIA",
    gravity: 1.2,
    color: "#b8dced",
    radius: 23,
    orbit: 260,
    level: "30–45",
    type: "극저온 얼음 행성",
    hazard: "후속 탐험 콘텐츠 · 착륙 미구현",
    available: false,
  },
  {
    id: "inferno",
    name: "INFERNO",
    gravity: 1.5,
    color: "#e4966c",
    radius: 26,
    orbit: 340,
    level: "45–60",
    type: "화산 행성",
    hazard: "후속 콘텐츠",
    available: false,
  },
  {
    id: "aquaria",
    name: "AQUARIA",
    gravity: 1,
    color: "#72bbd2",
    radius: 27,
    orbit: 420,
    level: "60–75",
    type: "해양 행성",
    hazard: "후속 콘텐츠",
    available: false,
  },
  {
    id: "lunaris",
    name: "LUNARIS",
    gravity: 0.2,
    color: "#c4c9ce",
    radius: 16,
    orbit: 500,
    level: "75–90",
    type: "저중력 위성",
    hazard: "후속 콘텐츠",
    available: false,
  },
  {
    id: "omega",
    name: "OMEGA",
    gravity: null,
    color: "#bb9cc5",
    radius: 22,
    orbit: 580,
    level: "90–100",
    type: "고대 중앙 제어 세계",
    hazard: "고대 방사선 · 양자 간섭 · GENESIS 인증 필요",
    available: false,
  },
] as const;
export const aresDeposits = [
  { id: "redIron", name: "붉은 철광층", x: 3600, item: "redIron", seconds: 10 },
  { id: "cobalt", name: "코발트 산맥", x: 4400, item: "cobalt", seconds: 14 },
  {
    id: "pureTitanium",
    name: "고순도 티타늄층",
    x: 5200,
    item: "pureTitanium",
    seconds: 18,
  },
  {
    id: "desertCrystal",
    name: "사막 결정층",
    x: 6000,
    item: "desertCrystal",
    seconds: 16,
  },
  {
    id: "magnesium",
    name: "마그네슘층",
    x: 6800,
    item: "magnesium",
    seconds: 15,
  },
  { id: "heatOre", name: "내열 광맥", x: 7600, item: "heatOre", seconds: 20 },
] satisfies {
  id: string;
  name: string;
  x: number;
  item: ItemId;
  seconds: number;
}[];
export const planetForRegion = (region: string): PlanetId =>
  (region.startsWith("omega")
    ? "omega"
    : extremeIds.find((id) => region.startsWith(id))) ??
  (region.startsWith("ares") ? "ares" : "eden");
export const baseForPlanet = (planet: PlanetId) =>
  planet === "eden"
    ? ("crash" as const)
    : ((planet + "Landing") as Exclude<
        SpaceRegion,
        "ship" | "aresDunes" | "aresCanyon" | "aresFoundry"
      >);
const quests: [string, string, [string, string, number][]][] = [
  [
    "별을 향한 준비",
    "ASTRA-01 상태와 이전 납품 기록을 확인하세요.",
    [
      ["shipSurvey", "우주선 상태 점검", 1],
      ["shipRepair", "우주선 시스템 복구", 1],
    ],
  ],
  [
    "다시 움직이는 심장",
    "추진·항법·에너지 코어를 복원하세요.",
    [
      ["repair_core", "에너지 코어 복구", 1],
      ["repair_propulsion", "추진 장치 수리", 1],
      ["repair_navigation", "항법 장치 활성화", 1],
    ],
  ],
  [
    "첫 번째 비행",
    "우주선 내부 조종실에서 첫 발사를 준비하세요.",
    [
      ["shipReadyFlight", "7개 시스템 점검", 1],
      ["shipFueled", "연료 충전", 1],
      ["firstAscent", "EDEN 이륙", 1],
    ],
  ],
  [
    "붉은 세계",
    "항성계 지도에서 ARES를 선택하세요. 방진 헬멧과 산소 장비가 필요합니다.",
    [
      ["aresScan", "ARES 탐지", 1],
      ["desertPrepared", "사막 탐험 장비 준비", 1],
      ["land_ares", "ARES 최초 착륙", 1],
    ],
  ],
  [
    "다른 중력, 다른 세계",
    "분지에서 점프하고 붉은 모래언덕을 탐험하세요.",
    [
      ["aresJump", "저중력 점프", 1],
      ["aresCreature", "사막 생명체 조사", 1],
      ["redIron", "붉은 철광석 채집", 2],
    ],
  ],
  [
    "두 번째 개척지",
    "착륙 분지에서 B로 두 번째 기지를 건설하세요.",
    [
      ["ares_build_habitat", "거주 모듈", 1],
      ["ares_build_oxygen", "산소 공급 시설", 1],
      ["ares_build_solar", "태양광 발전기", 1],
    ],
  ],
  [
    "사막의 산업",
    "고유 광물을 연구하고 새 소재와 자동화를 확보하세요.",
    [
      ["cobalt", "코발트 채집", 2],
      ["craft_space_heatAlloy", "내열 합금 제작", 1],
      ["ares_build_miner2", "고급 채굴기 설치", 1],
    ],
  ],
  [
    "고대 제련소",
    "협곡을 지나 산업 유적을 탐험하세요.",
    [
      ["aresFoundry", "고대 제련소 발견", 1],
      ["foundryArchive", "산업 기록 분석", 1],
      ["colossusDiscover", "사막의 거신 발견", 1],
    ],
  ],
  [
    "사막의 거신",
    "예고된 공격을 피하고 과열 뒤 노출되는 코어를 공격하세요.",
    [
      ["colossusKill", "DUNE COLOSSUS 처치", 1],
      ["industrialData", "고대 산업 데이터 확보", 1],
      ["propulsionBlueprint", "추진 설계도 확보", 1],
    ],
  ],
  [
    "연결된 세계",
    "ARES 자원을 화물칸에 싣고 EDEN으로 귀환하세요.",
    [
      ["aresCargo", "ARES 자원 적재", 1],
      ["returnEden", "EDEN 귀환", 1],
      ["cargoDelivered", "행성 간 자원 운송", 1],
      ["shipUpgraded", "PATHFINDER 장치 강화", 1],
    ],
  ],
];
export const spaceQuests = quests.map(([name, story, goals], i) => ({
  name,
  story,
  goals,
  xp: 550 + i * 80,
}));

export const navigablePlanets = starPlanets.map((p) => ({
  ...p,
  available:
    p.id === "omega" ||
    (extremePlanets[p.id as ExtremePlanet]?.available ?? p.available),
  hazard: extremePlanets[p.id as ExtremePlanet]?.available
    ? "극한 환경 · 전용 탐험복 필요"
    : p.hazard,
}));
