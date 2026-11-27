import type { Cost } from "../survival/catalog";
export const GRID = 40,
  GROUND = 780,
  BASE_START = 3360,
  BASE_END = 9760;
export const partNames = {
  hullPanel: "강화 선체 패널",
  thrusterPart: "추진기 부품",
  navCircuit: "항법 회로",
  commModule: "통신 모듈",
  lifeSupport: "생명 유지 장치",
  coreStabilizer: "코어 안정기",
} as const;
export type PartId = keyof typeof partNames;
export const colonyItems = Object.fromEntries(
  Object.entries(partNames).map(([id, name]) => [
    id,
    {
      name,
      type: "우주선 부품",
      color: "#efc583",
      icon: "◇",
      description:
        "ASTRA-01 수리 준비용 정밀 부품. 기지의 우주선 부품 제작소에서 생산합니다.",
    },
  ]),
) as Record<
  PartId,
  {
    name: string;
    type: string;
    color: string;
    icon: string;
    description: string;
  }
>;
export type Category =
  | "structure"
  | "habitat"
  | "energy"
  | "industry"
  | "research"
  | "logistics"
  | "defense";
export const categories: Record<Category, string> = {
  structure: "구조물",
  habitat: "거주",
  energy: "전력",
  industry: "산업",
  research: "연구",
  logistics: "물류",
  defense: "방어",
};
export interface BuildingDef {
  name: string;
  category: Category;
  w: number;
  h: number;
  cost: Cost;
  seconds: number;
  power: number;
  generation?: number;
  range?: number;
  capacity?: number;
  tech?: string;
  science?: string;
  hp: number;
  description: string;
}
const d = (
  name: string,
  category: Category,
  cost: Cost,
  power: number,
  description: string,
  extra: Partial<BuildingDef> = {},
): BuildingDef => ({
  name,
  category,
  cost,
  power,
  description,
  w: 160,
  h: 120,
  seconds: 5,
  hp: 500,
  ...extra,
});
export const buildings = {
  ancientResearch: d(
    "고대 연구 센터",
    "research",
    { aeternumAlloy: 4, ancientCircuit: 3 },
    8,
    "고대 연구 작업을 수행합니다.",
    { science: "omegaQuantum" },
  ),
  quantumReactor: d(
    "양자 반응로",
    "energy",
    { aeternumAlloy: 5, quantumStableCell: 3 },
    0,
    "양자 안정 셀 1개당 180초 · 90 전력",
    { generation: 90, range: 500, science: "omegaQuantum" },
  ),
  relicFabricator: d(
    "유물 제작소",
    "industry",
    { aeternumAlloy: 4, aeternumChip: 2 },
    8,
    "고대 장비와 소재 제작을 수행합니다.",
    { science: "omegaQuantum" },
  ),
  gravityField: d(
    "중력 안정장",
    "habitat",
    { gravityControlCore: 3, aeternumAlloy: 3 },
    6,
    "주변 320m의 방사선과 양자 간섭을 차폐합니다.",
    { science: "gravityMastery", range: 320 },
  ),
  aeternumArchive: d(
    "에테르눔 기록고",
    "logistics",
    { memoryData: 4, aeternumAlloy: 3 },
    4,
    "고대 기록과 소재를 보관합니다. 창고 +240.",
    { capacity: 240, science: "omegaQuantum" },
  ),
  genesisNetwork: d(
    "GENESIS 네트워크 단말",
    "research",
    { civilizationCore: 1, genesisCircuit: 2 },
    8,
    "문명 복원 연구 작업과 ECHO 기록을 연결합니다.",
    { science: "civilizationRestoration" },
  ),
  academy: d(
    "PIONEER ACADEMY",
    "research",
    { iron: 12, circuit: 4 },
    5,
    "V: 6명의 교관 · 전직, 도전, 숙련도와 장비 설계",
    { hp: 650 },
  ),
  sealedHabitat: d(
    "밀폐형 해저 거주지",
    "habitat",
    { pressureAlloy: 3, bioPolymer: 3 },
    8,
    "산소 시설과 같은 전력망에서 거주 가능",
    { science: "pressureEngineering" },
  ),
  pressureShield: d(
    "수압 차폐 시설",
    "habitat",
    { pressureUnit: 2, marineAlloy: 2 },
    14,
    "주변 260px 수압 한도 +1600m",
    { science: "pressureEngineering" },
  ),
  oxygen2: d(
    "고급 산소 공급기",
    "habitat",
    { lifeEfficiency: 2, ironBar: 3 },
    12,
    "주변 산소 공급·밀폐 거주지 지원",
    { science: "pressureEngineering" },
  ),
  tidalGenerator: d(
    "조력 발전기",
    "energy",
    { hydroModule: 2, marineAlloy: 2 },
    0,
    "AQUARIA 해류에서 무연료 90 EU 발전",
    { generation: 90, range: 440, science: "pressureEngineering" },
  ),
  minerUnderwater: d(
    "수중 채굴기",
    "industry",
    { pressureAlloy: 2, hydroModule: 1 },
    12,
    "해양 광맥 자동 채굴",
    { tech: "mining", science: "pressureEngineering" },
  ),
  bioFarm: d(
    "해양 생물 농장",
    "industry",
    { bioPolymer: 2, lifeEfficiency: 1 },
    8,
    "바이오매스로 아쿠아 섬유·심해 효소 생산",
    { science: "pressureEngineering" },
  ),
  submarineDock: d(
    "잠수정 정비소",
    "industry",
    { pressureAlloy: 3, hydroModule: 2 },
    15,
    "주변 탐험 차량 에너지 충전",
    { science: "pressureEngineering" },
  ),
  aquaLogistics: d(
    "해저 물류 창고",
    "logistics",
    { pressureAlloy: 2, marineAlloy: 2 },
    5,
    "공용 현지 창고 +100칸 및 생산 시설 물류 연결",
    { capacity: 100, science: "pressureEngineering" },
  ),
  vacuumHabitat: d(
    "진공 거주지",
    "habitat",
    { spaceShield: 2, lightAlloy: 3 },
    10,
    "산소 전력망에서 거주·진공 환경 보호",
    { science: "quantumEngineering" },
  ),
  radShieldStation: d(
    "방사선 차폐 시설",
    "habitat",
    { spaceShield: 3, gravityCircuit: 1 },
    14,
    "주변 진공·방사선 위험 회복",
    { science: "quantumEngineering" },
  ),
  cosmicSolar: d(
    "우주 태양광 발전기",
    "energy",
    { lightAlloy: 3, quantumCircuit: 2 },
    0,
    "LUNARIS에서 무연료 100 EU 발전",
    { generation: 100, range: 440, science: "quantumEngineering" },
  ),
  gravityAnchor: d(
    "중력 안정화 장치",
    "habitat",
    { gravityCircuit: 2, lightAlloy: 2 },
    12,
    "주변 자세 안정·추진 에너지 충전",
    { science: "quantumEngineering" },
  ),
  quantumLab: d(
    "양자 연구소",
    "research",
    { quantumCircuit: 3, gravityCircuit: 2 },
    20,
    "전력 공급 시 연구 시설 역할 및 속도 50% 증가",
    { science: "quantumEngineering" },
  ),
  minerMeteor: d(
    "운석 채굴기",
    "industry",
    { lightAlloy: 3, advancedDrive: 1 },
    15,
    "우주 광맥 자동 채굴",
    { tech: "mining", science: "quantumEngineering" },
  ),
  advancedNav: d(
    "고급 항법 시설",
    "research",
    { longNav: 2, quantumCell: 2 },
    16,
    "연료 최적화: 현지에서 출발할 때 항해 연료 20% 절약",
    { science: "quantumEngineering" },
  ),

  geothermalGen: d(
    "지열 발전기",
    "energy",
    { geothermalModule: 2, densePlate: 2 },
    0,
    "지열 매장지 반경 240에서 무연료 120 EU",
    { generation: 120, range: 440, science: "geothermalEngineering" },
  ),
  thermalShieldGen: d(
    "열 차폐 시설",
    "habitat",
    { thermalMaterial: 2, ironBar: 3 },
    12,
    "주변 260px 고온 위험 보호",
  ),
  magmaCooling: d(
    "마그마 냉각 시설",
    "industry",
    { coolingCell: 2, thermalMaterial: 2 },
    14,
    "주변 260px 체온 회복 및 자원 정제",
  ),
  alloyFactory: d(
    "고급 합금 생산 공장",
    "industry",
    { densePlate: 3, reactorCircuit: 2 },
    18,
    "극한 소재 자동 정제",
  ),
  ashProtection: d(
    "화산재 보호 시설",
    "habitat",
    { thermalMaterial: 2, polymer: 3 },
    10,
    "화산재 기상 시 태양광 효율 저하 완화",
  ),
  dustShield: d(
    "방진 보호막",
    "habitat",
    { ironBar: 3, polymer: 2 },
    8,
    "주변 260px 모래폭풍 바람과 시야 제한 차단",
  ),
  thermalRegulator: d(
    "온도 조절 장치",
    "habitat",
    { copperBar: 3, heatAlloy: 2 },
    10,
    "주변 260px 체온 회복",
  ),
  highSolar: d(
    "고효율 태양광 발전기",
    "energy",
    { cobaltAlloy: 2, wafer: 3 },
    0,
    "낮 45 EU 발전",
    { generation: 45, range: 400 },
  ),
  desertMine: d(
    "사막 채굴기",
    "industry",
    { cobaltAlloy: 2, ironBar: 4 },
    10,
    "현지 광맥을 자동 채굴합니다.",
    { tech: "mining" },
  ),
  terminal: d(
    "생존 터미널",
    "habitat",
    {},
    0,
    "독립 비상 전력. 기존 생존 기능을 유지합니다.",
  ),
  floor: d(
    "금속 발판",
    "structure",
    { ironBar: 1 },
    0,
    "점프·아래로 통과할 수 있는 지지 발판. 160 높이 간격으로 확장합니다.",
    { w: 160, h: 20, seconds: 1 },
  ),
  wall: d(
    "방어벽",
    "structure",
    { ironBar: 3 },
    0,
    "침공 개체의 접근을 막습니다. 탐험가는 통과 가능한 방어 배리어입니다.",
    { w: 80, h: 80, hp: 1500, seconds: 2 },
  ),
  lamp: d(
    "개척 조명",
    "structure",
    { copperBar: 1 },
    1,
    "야간에 주변을 밝힙니다.",
    { w: 80, h: 80, seconds: 1 },
  ),
  habitat: d(
    "소형 거주 모듈",
    "habitat",
    { ironBar: 4, wovenFiber: 2 },
    5,
    "정착민 2명을 수용합니다. 연결된 산소 시설이 있으면 거주할 수 있습니다.",
  ),
  medical: d(
    "의료 시설",
    "habitat",
    { ironBar: 5, polymer: 2, electronics: 1 },
    10,
    "주변 탐험가를 회복합니다. 의무관 배치 시 회복 속도가 증가합니다.",
    { tech: "habitation" },
  ),
  oxygen: d(
    "산소 공급 시설",
    "habitat",
    { ironBar: 3, copperBar: 2, refinedCell: 1 },
    8,
    "같은 전력망의 거주 시설에 산소를 공급하고 주변 탐험가의 산소를 보충합니다.",
  ),
  greenhouse: d(
    "자동 온실",
    "habitat",
    { ironBar: 4, polymer: 2, enzyme: 1 },
    10,
    "생체 물질을 배양해 섬유·수지·효소·의료 젤을 자동 수확합니다.",
    { tech: "habitation", w: 200 },
  ),
  solar: d(
    "태양광 발전기",
    "energy",
    { ironBar: 2, copperBar: 1, wafer: 1 },
    0,
    "낮 20 EU · 밤 0 EU. 전력 공급 반경 360.",
    { generation: 20, range: 360 },
  ),
  battery: d(
    "축전지",
    "energy",
    { ironBar: 2, copperBar: 1, refinedCell: 1 },
    0,
    "200 EU·s 저장. 충전·방전 최대 20 EU.",
    { capacity: 200, w: 80, h: 80 },
  ),
  relay: d(
    "전력 중계기",
    "energy",
    { copperBar: 1 },
    0,
    "전력망을 반경 360까지 확장합니다.",
    { range: 360, w: 80, h: 80, seconds: 1 },
  ),
  crystalGen: d(
    "결정 발전기",
    "energy",
    { titaniumBar: 3, denseCell: 1 },
    0,
    "결정 1개를 60초 동안 소비하여 60 EU 생산.",
    { generation: 60, range: 360, tech: "crystalPower" },
  ),
  plasmaGen: d(
    "플라즈마 발전기",
    "energy",
    { titaniumBar: 5, alloy: 2, denseCell: 2 },
    0,
    "고밀도 셀 1개로 120초간 140 EU 생산.",
    { generation: 140, range: 440, tech: "plasmaPower" },
  ),
  coreGen: d(
    "고대 코어 발전기",
    "energy",
    { alloy: 4, coreShard: 2, denseCell: 3 },
    0,
    "고밀도 셀 1개로 180초간 240 EU 생산.",
    { generation: 240, range: 520, tech: "navigation" },
  ),
  workbench: d(
    "기초 제작대",
    "industry",
    { ironBar: 2, copperBar: 1 },
    5,
    "기존 제작 대기열과 연결됩니다. 의료 젤·에너지 셀의 자동 생산도 지원합니다.",
  ),
  refinery: d(
    "광물 정제소",
    "industry",
    { ironBar: 4, copperBar: 2 },
    10,
    "기존 정제 레시피를 반복 생산합니다. 입력과 출력은 중앙 창고를 사용합니다.",
  ),
  miner: d(
    "자동 채굴기 MK-I",
    "industry",
    { ironBar: 5, titaniumBar: 1, electronics: 1 },
    15,
    "철·구리·실리콘·결정 매장지에서 채굴합니다.",
    { tech: "mining", w: 120 },
  ),
  miner2: d(
    "자동 채굴기 MK-II",
    "industry",
    { ironBar: 6, titaniumBar: 3, electronics: 2 },
    20,
    "티타늄을 포함한 매장지 채굴. 생산 속도 1.5배.",
    { tech: "automation", w: 120 },
  ),
  factory: d(
    "부품 생산 공장",
    "industry",
    { ironBar: 6, titaniumBar: 2, electronics: 2 },
    25,
    "전자 부품·합금·고밀도 셀 자동 생산.",
    { tech: "automation", w: 200 },
  ),
  equipment: d(
    "장비 제작소",
    "industry",
    { ironBar: 4, electronics: 2 },
    15,
    "기존 장비 제작 및 강화 기능에 전력을 공급합니다.",
  ),
  shipyard: d(
    "우주선 부품 제작소",
    "industry",
    { titaniumBar: 5, alloy: 2, circuit: 1 },
    35,
    "ASTRA-01 수리용 6종 정밀 부품 생산.",
    { tech: "shipParts", w: 240, h: 160, seconds: 12 },
  ),
  lab: d(
    "기초 연구소",
    "research",
    { ironBar: 4, copperBar: 2, wafer: 2 },
    12,
    "개척 연구에 필요한 전력을 공급하며 기존 연구 대기열과 연결됩니다.",
  ),
  analysis: d(
    "외계 기술 분석소",
    "research",
    { alloy: 3, circuit: 2 },
    15,
    "고대 코어 분석과 성계 항법 연구를 지원합니다.",
    { tech: "advanced", w: 200 },
  ),
  warehouse: d(
    "자원 창고",
    "logistics",
    { ironBar: 3, wovenFiber: 1 },
    0,
    "중앙 창고 저장 용량 +60칸. 반경 480의 물류 연결을 제공합니다.",
    { capacity: 60 },
  ),
  largeWarehouse: d(
    "대형 창고",
    "logistics",
    { ironBar: 6, titaniumBar: 2 },
    0,
    "저장 용량 +240칸. 반경 480 물류 연결.",
    { capacity: 240, tech: "logistics", w: 240 },
  ),
  logistics: d(
    "중앙 물류 관리소",
    "logistics",
    { ironBar: 4, electronics: 2 },
    5,
    "전 구역의 시설을 중앙 창고에 연결합니다.",
    { tech: "logistics" },
  ),
  robotStation: d(
    "지원 로봇 정거장",
    "logistics",
    { ironBar: 4, electronics: 2, refinedCell: 2 },
    8,
    "채굴·수리·탐사 로봇을 배치하고 충전합니다.",
    { tech: "robotics" },
  ),
  turret: d(
    "펄스 포탑",
    "defense",
    { ironBar: 4, copperBar: 2, refinedCell: 1 },
    8,
    "사거리 420 · 초당 28 피해. 기존 전투 판정을 사용합니다.",
    { tech: "defense", w: 120, h: 80, range: 420 },
  ),
  plasmaTurret: d(
    "플라즈마 포탑",
    "defense",
    { titaniumBar: 3, alloy: 1, denseCell: 1 },
    16,
    "사거리 480 · 초당 55 피해.",
    { tech: "advanced", w: 120, h: 80, range: 480 },
  ),
  cryoTurret: d(
    "냉각 포탑",
    "defense",
    { ironBar: 4, denseCrystal: 2, refinedCell: 2 },
    12,
    "사거리 400 · 초당 16 피해와 냉각 효과.",
    { tech: "defense", w: 120, h: 80, range: 400 },
  ),
  radar: d(
    "감지 레이더",
    "defense",
    { ironBar: 3, electronics: 2 },
    5,
    "침공 준비 30초 경보와 접근 방향을 표시합니다.",
    { tech: "defense" },
  ),
  shield: d(
    "보호막 발생기",
    "defense",
    { alloy: 3, denseCell: 2 },
    20,
    "반경 320 건물의 받는 피해를 60% 줄입니다.",
    { tech: "advanced", range: 320 },
  ),
  port: d(
    "우주항 관제소",
    "research",
    { alloy: 4, titaniumBar: 5, electronics: 4 },
    20,
    "선체·추진·항법·통신·생명 유지·코어 수리 준비 현황을 관리합니다.",
    { tech: "spaceport", w: 240, h: 160, seconds: 15 },
  ),
} satisfies Record<string, BuildingDef>;
export type BuildingKind = keyof typeof buildings;
export const definition = (kind: BuildingKind): BuildingDef => buildings[kind];
export const deposits = [
  { id: "iron", name: "철의 고원", x: 3600, item: "iron", seconds: 10 },
  { id: "copper", name: "구리층", x: 4400, item: "copper", seconds: 12 },
  { id: "silicon", name: "실리콘 능선", x: 5200, item: "silicon", seconds: 15 },
  { id: "crystal", name: "에너지 분지", x: 6000, item: "crystal", seconds: 20 },
  {
    id: "titanium",
    name: "고대 산업 광맥",
    x: 6800,
    item: "titanium",
    seconds: 25,
  },
  { id: "coal", name: "탄소층", x: 7600, item: "coal", seconds: 12 },
] as const;
export interface ColonyTech {
  name: string;
  branch: string;
  requires: string[];
  cost: Cost;
  points: number;
  seconds: number;
  description: string;
}
const t = (
  name: string,
  branch: string,
  requires: string[],
  description: string,
  cost: Cost = { data: 2 },
  points = 2,
): ColonyTech => ({
  name,
  branch,
  requires,
  cost,
  points,
  seconds: 12,
  description,
});
export const colonyTech: Record<string, ColonyTech> = {
  mining: t("자동 채굴", "산업", [], "자동 채굴기 MK-I 해금"),
  automation: t(
    "산업 자동화",
    "산업",
    ["mining"],
    "공장·MK-II 해금 / 자동화 속도 +10%",
  ),
  crystalPower: t("결정 발전", "전력", [], "결정 발전기 해금"),
  plasmaPower: t(
    "플라즈마 발전",
    "전력",
    ["crystalPower"],
    "플라즈마 발전기 해금",
    { advancedData: 1, data: 3 },
    3,
  ),
  logistics: t("중앙 물류", "물류", [], "전역 물류 관리소·대형 창고 해금"),
  robotics: t(
    "지원 로봇",
    "물류",
    ["logistics", "automation"],
    "충전 정거장과 지원 로봇 해금",
  ),
  defense: t("기지 방어", "방어", [], "펄스·냉각 포탑·레이더 해금"),
  habitation: t("거주 환경", "거주", ["automation"], "의료 시설·온실 해금"),
  advanced: t(
    "첨단 개척",
    "건설",
    ["automation", "defense"],
    "외계 분석소·보호막·플라즈마 포탑 / 시설 Lv.3",
    { advancedData: 1, data: 3 },
    3,
  ),
  shipParts: t(
    "우주선 부품 생산",
    "산업",
    ["automation", "plasmaPower"],
    "우주선 부품 제작소와 부품 생산 해금",
    { ancientData: 1, data: 3 },
    3,
  ),
  spaceport: t(
    "우주항 설계",
    "건설",
    ["shipParts", "advanced"],
    "우주항 관제소 해금",
    { ancientData: 1, data: 3 },
    3,
  ),
  navigation: t(
    "성계 항법",
    "건설",
    ["spaceport"],
    "고대 코어 분석 후 항법 준비 완료 / 코어 발전기",
    { ancientData: 1, data: 4 },
    4,
  ),
};
export const shipParts: Record<PartId, { cost: Cost; seconds: number }> = {
  hullPanel: { cost: { titaniumBar: 3, alloy: 1 }, seconds: 20 },
  thrusterPart: {
    cost: { titaniumBar: 2, electronics: 2, denseCell: 1 },
    seconds: 24,
  },
  navCircuit: { cost: { wafer: 3, circuit: 1, electronics: 2 }, seconds: 20 },
  commModule: { cost: { copperBar: 3, electronics: 2 }, seconds: 16 },
  lifeSupport: {
    cost: { polymer: 2, medicalGel: 1, electronics: 1 },
    seconds: 18,
  },
  coreStabilizer: {
    cost: { alloy: 2, coreShard: 1, denseCell: 2 },
    seconds: 30,
  },
};
export const colonyQuests = [
  ["새로운 집", ["colonyOpen", "build_floor", "build_habitat"]],
  [
    "첫 번째 전력망",
    ["build_solar", "build_relay", "poweredWorkbench", "build_battery"],
  ],
  [
    "쉬지 않는 드릴",
    ["ct_mining", "depositSurvey", "build_miner", "auto_iron"],
  ],
  ["광물에서 소재로", ["poweredRefinery", "auto_ironBar", "centralStorage"]],
  [
    "산업의 시작",
    ["poweredLab", "ct_automation", "build_factory", "auto_electronics"],
  ],
  ["정착지 방어", ["build_radar", "build_turret", "siegePrepared", "siegeWon"]],
  ["혼자가 아닌 생존", ["rescueSignal", "settlerArrived", "settlerAssigned"]],
  [
    "살아 있는 기지",
    ["build_medical", "build_greenhouse", "build_crystalGen", "industryLevel"],
  ],
  [
    "우주를 향한 준비",
    [
      "shipInspected",
      "build_shipyard",
      "ct_shipParts",
      "auto_thrusterPart",
      "build_port",
    ],
  ],
  ["별들 사이의 길", ["shipReady", "coreAnalyzed", "ct_navigation"]],
].map(([name, goals], i) => ({
  name: name as string,
  story: [
    "B 건설 · O 기지 관리 · L 제작/연구",
    "태양광·중계기·축전지를 연결하세요. 기존 제작대에 전력을 공급하세요.",
    "건설 모드에서 표시된 매장지 위에 채굴기를 설치하세요.",
    "정제소 자동 생산을 설정하고 창고 연결을 확인하세요.",
    "연구소에 전력을 공급하고 전자 부품을 자동 생산하세요.",
    "방어 시설에 전력을 공급한 뒤 O에서 첫 침공을 시작하세요.",
    "기지 Lv.3에서 구조 신호를 받고 산소·거주 공간을 제공하세요.",
    "의료와 생체 소재를 안정적으로 공급하세요.",
    "O 우주선 탭에서 수리 준비를 시작하세요.",
    "필수 부품을 납품하고 고대 코어를 분석하세요.",
  ][i],
  goals: (goals as string[]).map(
    (k) =>
      [
        k,
        (
          {
            colonyOpen: "건설 모드 열기",
            poweredWorkbench: "제작대 전력 연결",
            poweredRefinery: "정제소 전력 연결",
            poweredLab: "연구소 전력 연결",
            depositSurvey: "매장지 조사",
            centralStorage: "중앙 창고에 자동 생산품 저장",
            siegePrepared: "침공 준비",
            siegeWon: "침공 방어 성공",
            rescueSignal: "구조 신호 수신",
            settlerArrived: "정착민 맞이하기",
            settlerAssigned: "정착민 시설 배치",
            industryLevel: "기지 Lv.3 달성",
            shipInspected: "ASTRA-01 조사",
            shipReady: "우주선 수리 부품 납품",
            coreAnalyzed: "고대 코어 분석",
          } as Record<string, string>
        )[k] ??
          (k.startsWith("build_")
            ? definition(k.slice(6) as BuildingKind).name + " 건설"
            : k.startsWith("ct_")
              ? colonyTech[k.slice(3)].name + " 연구"
              : (partNames[k.slice(5) as PartId] ?? k.slice(5)) + " 자동 생산"),
        1,
      ] as [string, string, number],
  ),
  xp: 400 + i * 40,
}));
