import type {
  Region,
  Resource,
  EnemyData,
  RegionId,
  ItemId,
} from "../data/content";
export type FrontierRegion = "marsh" | "caverns" | "ruins" | "abyss";
export type FrontierEnemy =
  | "bloom"
  | "lurker"
  | "wraith"
  | "guardian"
  | "devourer"
  | "sentinel"
  | "conduit"
  | "drone";
export const frontierEnemies: Record<FrontierEnemy, EnemyData> = {
  bloom: {
    name: "TOXIC BLOOM",
    hp: 230,
    damage: 19,
    speed: 0,
    xp: 70,
    drop: "enzyme",
    color: "#b5d28f",
    w: 76,
    h: 96,
    range: 360,
    resists: { plasma: 1.35, toxic: 0.35 },
  },
  lurker: {
    name: "CAVE LURKER",
    hp: 260,
    damage: 22,
    speed: 100,
    xp: 80,
    drop: "rareQuartz",
    color: "#9daed5",
    w: 64,
    h: 54,
    range: 330,
  },
  wraith: {
    name: "RADIANT WRAITH",
    hp: 350,
    damage: 24,
    speed: 55,
    xp: 95,
    drop: "advancedData",
    color: "#d9a4ec",
    w: 70,
    h: 80,
    range: 400,
    flying: true,
    resists: { plasma: 0.75, electric: 1.3 },
  },
  guardian: {
    name: "CORE GUARDIAN",
    hp: 480,
    damage: 27,
    speed: 42,
    xp: 110,
    drop: "circuit",
    color: "#b5bdd9",
    w: 96,
    h: 112,
    defense: 16,
    range: 260,
    resists: { electric: 1.25 },
  },
  devourer: {
    name: "CRYSTAL DEVOURER",
    hp: 700,
    damage: 30,
    speed: 42,
    xp: 145,
    drop: "rareAlloy",
    color: "#bda5df",
    w: 146,
    h: 110,
    defense: 12,
    range: 440,
    resists: { cryo: 1.3 },
  },
  sentinel: {
    name: "ABYSS SENTINEL",
    hp: 6500,
    damage: 32,
    speed: 0,
    xp: 600,
    drop: "coreShard",
    color: "#d5a9f3",
    w: 210,
    h: 230,
    defense: 10,
    range: 1000,
  },
  conduit: {
    name: "에너지 공급 장치",
    hp: 150,
    damage: 0,
    speed: 0,
    xp: 0,
    drop: "crystal",
    color: "#dda5ef",
    w: 45,
    h: 90,
    range: 0,
  },
  drone: {
    name: "수호 드론",
    hp: 90,
    damage: 13,
    speed: 65,
    xp: 0,
    drop: "scrap",
    color: "#adb5d4",
    w: 36,
    h: 38,
    range: 290,
    flying: true,
  },
};
const node = (
  region: string,
  item: ItemId,
  x: number,
  y = 780,
  count = 6,
  tier = 1,
): Resource => ({
  id: `${region}-${item}-${x}`,
  item,
  x,
  y,
  count,
  respawn: 45,
  tier,
  seconds: tier === 1 ? 1.1 : tier + 1,
  reserve: count * 3,
  difficulty: tier,
  rareChance: tier === 4 ? 0.15 : 0.04,
});
const make = (
  id: FrontierRegion,
  name: string,
  en: string,
  palette: [string, string, string],
  subtitle: string,
): Region => ({
  id,
  name,
  en,
  palette,
  subtitle,
  width: 3600,
  spawn: 180,
  platforms: [
    { x: 0, y: 780, w: 3600, h: 400 },
    ...[600, 1050, 1500, 1950, 2400, 2850].map((x, i) => ({
      x,
      y: 650 - (i % 3) * 110,
      w: 270,
      h: 25,
      oneWay: true,
    })),
  ],
  resources: [],
  enemies: [],
  landmarks: [
    {
      id: id + "-safe",
      kind: "heal",
      x: 250,
      y: 780,
      label: "안전 대피소 · 산소 회복",
    },
    {
      id: id + "-return",
      kind: "portal",
      x: 80,
      y: 780,
      label: "이전 구역으로 귀환",
      target:
        id === "marsh"
          ? "forest"
          : id === "caverns"
            ? "marsh"
            : id === "ruins"
              ? "caverns"
              : "ruins",
    },
    {
      id: id + "-beacon",
      kind: "beaconSite",
      x: 3250,
      y: 780,
      label: "임시 비콘 설치 위치",
    },
  ],
});
export const frontierRegions: Record<FrontierRegion, Region> = {
  marsh: make(
    "marsh",
    "독성 습지",
    "TOXIC MARSH",
    ["#152c31", "#426851", "#b2be86"],
    "상층의 맑은 공기, 아래에 잠든 독성",
  ),
  caverns: make(
    "caverns",
    "심층 수정 동굴",
    "DEEP CRYSTAL CAVERNS",
    ["#091629", "#25496b", "#93bdd8"],
    "빛이 이끄는 깊은 지하",
  ),
  ruins: make(
    "ruins",
    "방사능 유적",
    "RADIANT RUINS",
    ["#1c1931", "#5c517b", "#b9a0d0"],
    "침묵한 기계의 방사능 흔적",
  ),
  abyss: make(
    "abyss",
    "심층 에너지 지대",
    "CORE ABYSS",
    ["#20182f", "#60426f", "#d8a4dc"],
    "불안정한 맥동, 심연의 파수꾼",
  ),
};
frontierRegions.marsh.resources = [
  node("marsh", "spores", 770),
  node("marsh", "resin", 1100),
  node("marsh", "strongFiber", 1550, 430),
  node("marsh", "enzyme", 1850),
  node("marsh", "ecology", 2490, 540, 3),
  node("marsh", "fiber", 2750, 780, 12),
  node("marsh", "resin", 3200, 780, 10),
];
frontierRegions.marsh.enemies = [
  { kind: "bloom", x: 1350, y: 780 },
  { kind: "spore", x: 2400, y: 780 },
  { kind: "bloom", x: 3000, y: 780 },
];
frontierRegions.marsh.platforms.push(
  { x: 850, y: 550, w: 210, h: 25, oneWay: true },
  { x: 1700, y: 550, w: 400, h: 25, oneWay: true },
);
frontierRegions.caverns.resources = [
  node("cave", "titanium", 750, 780, 12, 2),
  node("cave", "silicon", 1250, 780, 10),
  node("cave", "rareQuartz", 1590, 430, 4, 2),
  node("cave", "denseCrystal", 2050, 780, 9, 3),
  node("cave", "ecology", 2670, 540, 3),
  node("cave", "titanium", 3150, 780, 12, 2),
];
frontierRegions.caverns.enemies = [
  { kind: "lurker", x: 1100, y: 780 },
  { kind: "worm", x: 1900, y: 780 },
  { kind: "lurker", x: 2800, y: 780 },
];
frontierRegions.ruins.resources = [
  node("ruin", "radiant", 800, 780, 6, 3),
  node("ruin", "ancientMetal", 1250, 780, 9, 3),
  node("ruin", "circuit", 1800, 780, 6, 3),
  node("ruin", "advancedData", 2490, 540, 4, 3),
  node("ruin", "alloy", 3100, 780, 5, 3),
];
frontierRegions.ruins.enemies = [
  { kind: "wraith", x: 1100, y: 620 },
  { kind: "guardian", x: 2100, y: 780 },
  { kind: "wraith", x: 2900, y: 620 },
];
frontierRegions.ruins.landmarks.push(
  {
    id: "ruins-relay-a",
    kind: "relay",
    x: 1550,
    y: 430,
    label: "고대 회로 첫 신호 정렬",
  },
  {
    id: "ruins-relay-b",
    kind: "relay",
    x: 2800,
    y: 780,
    label: "고대 회로 두 번째 신호 정렬",
  },
);
frontierRegions.abyss.width = 4400;
frontierRegions.abyss.platforms[0].w = 4400;
frontierRegions.abyss.resources = [
  node("abyss", "coreCrystal", 800, 780, 6, 4),
  node("abyss", "rareAlloy", 1250, 780, 4, 4),
  node("abyss", "coreShard", 1650, 780, 2, 4),
  node("abyss", "advancedData", 2100, 780, 4, 4),
];
frontierRegions.abyss.enemies = [
  { kind: "devourer", x: 1450, y: 780 },
  { kind: "guardian", x: 2200, y: 780, elite: "shielded" },
];
frontierRegions.abyss.landmarks.push({
  id: "sentinel",
  kind: "sentinel",
  x: 2850,
  y: 780,
  label: "ABYSS SENTINEL · 도전",
});
frontierRegions.abyss.platforms.push(
  { x: 3150, y: 650, w: 170, h: 24, oneWay: true },
  { x: 3550, y: 540, w: 170, h: 24, oneWay: true },
  { x: 3950, y: 650, w: 170, h: 24, oneWay: true },
);
for (const [from, to] of [
  ["marsh", "caverns"],
  ["caverns", "ruins"],
  ["ruins", "abyss"],
] as [FrontierRegion, RegionId][])
  frontierRegions[from].landmarks.push({
    id: from + "-next",
    kind: "portal",
    x: 3470,
    y: 780,
    label: "다음 탐험 구역 · 환경 사전 분석",
    target: to,
  });
export const frontierQuests = [
  {
    name: "살아남기 위한 기술",
    story: "불시착 지점의 작업 시설에서 새로운 탐험을 준비하세요.",
    goals: [
      ["terminal", "생존 터미널 조사 · 기본 채굴기와 스캐너 확보", 1],
      ["workbench", "기초 제작대 활성화", 1],
      ["craft_medicalGel", "의료 젤 제작·회수", 1],
    ],
    xp: 100,
  },
  {
    name: "광물의 가치",
    story: "정제소를 수리하고 원석을 가공하세요.",
    goals: [
      ["iron", "철광석 수집", 3],
      ["copper", "구리 광석 수집", 3],
      ["facility_refinery", "정제소 수리", 1],
      ["craft_refine_ironBar", "철괴 생산", 1],
      ["craft_refine_copperBar", "구리괴 생산", 1],
    ],
    xp: 120,
  },
  {
    name: "독성의 숲",
    story: "정화 장비로 습지의 독성에 적응하세요.",
    goals: [
      ["scanner", "스캐너 활성화 · G", 1],
      ["research_filter", "대기 정화 기술 연구", 1],
      ["craft_mask", "정화 마스크 제작", 1],
      ["marsh", "독성 습지 발견", 1],
      ["explore_marsh", "습지 내부 탐험", 1],
    ],
    xp: 160,
  },
  {
    name: "지하의 비밀",
    story: "산소와 빛을 준비해 심층 동굴을 탐험하세요.",
    goals: [
      ["craft_oxygen", "산소 공급 모듈 제작", 1],
      ["craft_light", "탐험용 조명 제작", 1],
      ["caverns", "심층 수정 동굴 발견", 1],
      ["titanium", "티타늄 광석 획득", 4],
    ],
    xp: 180,
  },
  {
    name: "고대 기술",
    story: "습지 생태 자료와 동굴 광물로 차폐 기술을 연구하세요.",
    goals: [
      ["ecology", "외계 생태 데이터 획득", 1],
      ["research_alloy", "소재 공학 연구", 1],
      ["craft_radiation", "방사능 차폐복 제작", 1],
      ["ruins", "방사능 유적 발견", 1],
    ],
    xp: 210,
  },
  {
    name: "불안정한 에너지",
    story: "에너지 안정화 장치를 준비해 심층으로 내려가세요.",
    goals: [
      ["research_stability", "에너지 안정화 연구", 1],
      ["craft_stabilizer", "안정화 장치 제작", 1],
      ["abyss", "심층 에너지 지대 발견", 1],
    ],
    xp: 240,
  },
  {
    name: "심연의 파수꾼",
    story: "G로 공급 장치를 분석하고 공격하여 보호막을 해제하세요.",
    goals: [
      ["sentinelDiscover", "ABYSS SENTINEL 발견", 1],
      ["conduitScan", "에너지 공급 장치 분석", 1],
      ["sentinelKill", "파수꾼 처치", 1],
      ["coreShard", "고대 에너지 코어 조각 획득", 1],
    ],
    xp: 350,
  },
  {
    name: "개척의 가능성",
    story: "기지로 돌아가 고대 자료와 개척 기술을 연구하세요.",
    goals: [
      ["returnFrontier", "불시착 지점 귀환", 1],
      ["ancientAnalysis", "생존 터미널에서 고대 기술 분석", 1],
      ["research_colony", "개척 기술 연구", 1],
      ["blueprint", "기지 건설 설계도 확보", 1],
    ],
    xp: 400,
  },
] as {
  name: string;
  story: string;
  goals: [string, string, number][];
  xp: number;
}[];

frontierRegions.abyss.landmarks.find((l) => l.kind === "beaconSite")!.x = 2700;
