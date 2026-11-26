import type { Element, EliteAffix } from "../combat/types";
export type RegionId = "crash" | "forest" | "valley";
export type ItemId =
  | "iron"
  | "copper"
  | "crystal"
  | "fiber"
  | "biomass"
  | "scrap"
  | "gel"
  | "tissue"
  | "medkit"
  | "fragment"
  | "ancientCrystal"
  | "titanCore";
export type EnemyKind =
  | "slime"
  | "crawler"
  | "manta"
  | "spore"
  | "beetle"
  | "worm"
  | "volt"
  | "wisp"
  | "golem"
  | "stalker"
  | "dummy"
  | "titan";
export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay?: boolean;
}
export interface Resource {
  id: string;
  item: ItemId;
  x: number;
  y: number;
  count: number;
  respawn: number;
}
export interface Landmark {
  id: string;
  label: string;
  x: number;
  y: number;
  kind:
    | "ship"
    | "capsule"
    | "beacon"
    | "heal"
    | "chest"
    | "ruin"
    | "training"
    | "boss";
}
export interface Region {
  id: RegionId;
  name: string;
  en: string;
  subtitle: string;
  width: number;
  spawn: number;
  palette: [string, string, string];
  platforms: Platform[];
  resources: Resource[];
  landmarks: Landmark[];
  enemies: { kind: EnemyKind; x: number; y: number; elite?: EliteAffix }[];
}
export interface Planet {
  id: string;
  name: string;
  gravity: number;
  atmosphere: string;
  temperature: string;
  radiation: number;
  oxygen: boolean;
  difficulty: string;
  biomes: string[];
  enemyTypes: EnemyKind[];
  resourceTypes: ItemId[];
  mapConnections: RegionId[];
  unlockConditions: string[];
  implemented: boolean;
}
export const planets: Planet[] = [
  {
    id: "eden",
    name: "EDEN",
    gravity: 0.9,
    atmosphere: "질소·산소",
    temperature: "온화함",
    radiation: 0.1,
    oxygen: true,
    difficulty: "1–15",
    biomes: ["불시착 지점", "발광 숲", "수정 계곡"],
    enemyTypes: ["slime", "crawler", "manta"],
    resourceTypes: ["iron", "copper", "crystal", "fiber", "biomass", "scrap"],
    mapConnections: ["crash", "forest", "valley"],
    unlockConditions: [],
    implemented: true,
  },
  ...[
    ["ares", "ARES", "붉은 사막", 1.1],
    ["frostia", "FROSTIA", "얼음", 0.8],
    ["inferno", "INFERNO", "화산", 1.2],
    ["aquaria", "AQUARIA", "해양", 1],
    ["lunaris", "LUNARIS", "저중력", 0.3],
    ["omega", "OMEGA", "고대 문명", 1],
  ].map(([id, name, biome, gravity]) => ({
    id: String(id),
    name: String(name),
    gravity: Number(gravity),
    atmosphere: "미탐사",
    temperature: "미탐사",
    radiation: 0,
    oxygen: false,
    difficulty: "미정",
    biomes: [String(biome)],
    enemyTypes: [],
    resourceTypes: [],
    mapConnections: [],
    unlockConditions: ["후속 개발 단계"],
    implemented: false,
  })),
];
export const items: Record<
  ItemId,
  {
    name: string;
    type: string;
    description: string;
    color: string;
    icon: string;
  }
> = {
  fragment: {
    name: "수정 파편",
    type: "부품",
    description: "수정 갑충의 장갑에서 떨어진 희귀 소재.",
    color: "#a4c6f5",
    icon: "◈",
  },
  ancientCrystal: {
    name: "고대 에너지 결정",
    type: "광물",
    description: "고대 수호자의 에너지 잔류물. 정제와 제작 연구에 사용됩니다.",
    color: "#e5b9f7",
    icon: "✧",
  },
  titanCore: {
    name: "EDEN TITAN 코어",
    type: "스토리",
    description: "우주선의 동력 장치 연구에 필요한 핵심 코어. 첫 처치 보상.",
    color: "#e6cd8c",
    icon: "✦",
  },
  iron: {
    name: "철광석",
    type: "광물",
    description: "탐사 장비와 기지의 골격이 될 단단한 광물.",
    color: "#b8c4d0",
    icon: "⬡",
  },
  copper: {
    name: "구리 광석",
    type: "광물",
    description: "붉은빛 전도성 광석. 전력 부품의 기초 재료.",
    color: "#eda777",
    icon: "⬡",
  },
  crystal: {
    name: "에너지 결정",
    type: "광물",
    description: "미세한 맥동이 느껴지는 EDEN의 에너지원.",
    color: "#8df4ed",
    icon: "◇",
  },
  fiber: {
    name: "외계 식물 섬유",
    type: "식물",
    description: "탄력 있는 발광 식물의 섬유. 미래의 제작 재료.",
    color: "#a4df9c",
    icon: "❧",
  },
  biomass: {
    name: "외계 생체 물질",
    type: "생체 물질",
    description: "가시 절지류에서 발견되는 독특한 생체 소재.",
    color: "#efba84",
    icon: "◈",
  },
  scrap: {
    name: "우주선 잔해",
    type: "부품",
    description: "ASTRA-01에서 회수한 재사용 가능한 합금.",
    color: "#c2d2dd",
    icon: "▱",
  },
  gel: {
    name: "에너지 젤",
    type: "생체 물질",
    description: "글로우 슬라임이 남긴 은은하게 빛나는 젤.",
    color: "#9dedbc",
    icon: "◉",
  },
  tissue: {
    name: "발광 조직",
    type: "생체 물질",
    description: "스카이 만타의 날개에서 얻는 빛나는 조직.",
    color: "#c3b4ff",
    icon: "✧",
  },
  medkit: {
    name: "응급 회복 키트",
    type: "소비 아이템",
    description: "H키 또는 인벤토리에서 사용. 체력 50 회복.",
    color: "#ffb6a1",
    icon: "✚",
  },
};
export interface EnemyData {
  name: string;
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  drop: ItemId;
  color: string;
  w: number;
  h: number;
  defense?: number;
  resists?: Partial<Record<Element, number>>;
  range?: number;
  flying?: boolean;
}
export const enemyData: Record<EnemyKind, EnemyData> = {
  spore: {
    name: "SPORE WALKER",
    hp: 90,
    damage: 16,
    speed: 28,
    xp: 34,
    drop: "fiber",
    color: "#b8c98a",
    w: 54,
    h: 72,
    range: 330,
    resists: { plasma: 1.35, toxic: 0.5 },
  },
  beetle: {
    name: "CRYSTAL BEETLE",
    hp: 160,
    damage: 23,
    speed: 42,
    xp: 55,
    drop: "fragment",
    color: "#93b9df",
    w: 70,
    h: 48,
    defense: 9,
    resists: { physical: 0.75, electric: 1.4 },
    range: 125,
  },
  worm: {
    name: "BURROW WORM",
    hp: 130,
    damage: 24,
    speed: 85,
    xp: 48,
    drop: "biomass",
    color: "#c5aa90",
    w: 48,
    h: 78,
    range: 260,
  },
  volt: {
    name: "VOLT HUNTER",
    hp: 118,
    damage: 21,
    speed: 105,
    xp: 47,
    drop: "tissue",
    color: "#e2d48a",
    w: 58,
    h: 45,
    range: 220,
    resists: { electric: 0.55, cryo: 1.4 },
  },
  wisp: {
    name: "PHANTOM WISP",
    hp: 100,
    damage: 19,
    speed: 65,
    xp: 44,
    drop: "tissue",
    color: "#d6b3f1",
    w: 44,
    h: 50,
    range: 370,
    flying: true,
    resists: { physical: 0.8 },
  },
  golem: {
    name: "CRYSTAL GOLEM",
    hp: 330,
    damage: 35,
    speed: 28,
    xp: 90,
    drop: "fragment",
    color: "#90adc9",
    w: 92,
    h: 120,
    defense: 12,
    range: 220,
    resists: { physical: 0.65 },
  },
  stalker: {
    name: "EDEN STALKER",
    hp: 245,
    damage: 29,
    speed: 125,
    xp: 85,
    drop: "biomass",
    color: "#a6bfc2",
    w: 80,
    h: 60,
    range: 260,
  },
  dummy: {
    name: "훈련 표적",
    hp: 100000,
    damage: 0,
    speed: 0,
    xp: 0,
    drop: "scrap",
    color: "#d4cfa8",
    w: 44,
    h: 80,
  },
  titan: {
    name: "EDEN TITAN",
    hp: 8000,
    damage: 32,
    speed: 55,
    xp: 900,
    drop: "ancientCrystal",
    color: "#aac7d6",
    w: 300,
    h: 220,
    defense: 15,
    resists: { physical: 0.8 },
  },
  slime: {
    name: "GLOW SLIME",
    hp: 36,
    damage: 10,
    speed: 45,
    xp: 18,
    drop: "gel" as ItemId,
    color: "#89e8b1",
    w: 48,
    h: 36,
  },
  crawler: {
    name: "THORN CRAWLER",
    hp: 65,
    damage: 16,
    speed: 70,
    xp: 30,
    drop: "biomass" as ItemId,
    color: "#e1ab73",
    w: 60,
    h: 38,
  },
  manta: {
    flying: true,
    name: "SKY MANTA",
    hp: 48,
    damage: 13,
    speed: 85,
    xp: 25,
    drop: "tissue" as ItemId,
    color: "#afa5ff",
    w: 70,
    h: 35,
  },
};
const ground = (x: number, w: number, y = 780): Platform => ({
  x,
  y,
  w,
  h: 300,
});
const ledge = (x: number, y: number, w: number): Platform => ({
  x,
  y,
  w,
  h: 30,
  oneWay: true,
});
const node = (
  id: string,
  item: ItemId,
  x: number,
  y = 780,
  count = 1,
): Resource => ({ id, item, x, y, count, respawn: 35 });
export const regions: Record<RegionId, Region> = {
  crash: {
    id: "crash",
    name: "불시착 지점",
    en: "CRASH LANDING SITE",
    subtitle: "새로운 세계의 첫 발자국",
    width: 3200,
    spawn: 360,
    palette: ["#102b3b", "#507c79", "#bdc9a4"],
    platforms: [
      ground(0, 3200),
      ledge(1020, 655, 230),
      ledge(1390, 570, 220),
      ledge(1700, 650, 260),
      ledge(2200, 620, 220),
    ],
    resources: [
      node("wreck-a", "scrap", 640, 780, 3),
      node("iron-a", "iron", 1050),
      node("copper-a", "copper", 1450),
      node("crystal-a", "crystal", 1760, 650, 3),
      node("fiber-a", "fiber", 2100),
      node("crystal-b", "crystal", 2670, 780, 2),
    ],
    landmarks: [
      { id: "ship", label: "ASTRA-01 잔해 조사", x: 500, y: 780, kind: "ship" },
      {
        id: "capsule",
        label: "생존 캡슐 확인",
        x: 860,
        y: 780,
        kind: "capsule",
      },
      {
        id: "beacon",
        label: "통신 장치 확인",
        x: 1220,
        y: 780,
        kind: "beacon",
      },
      { id: "camp", label: "회복 및 저장", x: 300, y: 780, kind: "heal" },
      {
        id: "supply-a",
        label: "비상 보급품 열기",
        x: 1460,
        y: 570,
        kind: "chest",
      },
    ],
    enemies: [],
  },
  forest: {
    id: "forest",
    name: "발광 숲",
    en: "LUMINOUS FOREST",
    subtitle: "숲이 빛으로 속삭이는 곳",
    width: 3700,
    spawn: 140,
    palette: ["#0b2034", "#27696c", "#8ebc9a"],
    platforms: [
      ground(0, 3700),
      ledge(400, 660, 300),
      ledge(820, 550, 250),
      ledge(1170, 450, 200),
      ledge(1490, 560, 300),
      ledge(1930, 660, 280),
      ledge(2350, 540, 250),
      ledge(2760, 440, 260),
      ledge(3150, 630, 240),
    ],
    resources: [
      node("forest-fiber", "fiber", 460, 660, 2),
      node("forest-iron", "iron", 1100, 780, 2),
      node("forest-crystal", "crystal", 1580, 560, 3),
      node("forest-copper", "copper", 2200, 780, 2),
      node("forest-crystal2", "crystal", 2860, 440, 3),
    ],
    landmarks: [
      {
        id: "forest-camp",
        label: "회복 및 저장",
        x: 230,
        y: 780,
        kind: "heal",
      },
      {
        id: "secret-supply",
        label: "숨겨진 보급품 열기",
        x: 1240,
        y: 450,
        kind: "chest",
      },
    ],
    enemies: [
      { kind: "slime", x: 700, y: 780 },
      { kind: "slime", x: 1150, y: 780 },
      { kind: "slime", x: 1700, y: 780 },
      { kind: "crawler", x: 2170, y: 780 },
      { kind: "manta", x: 2700, y: 670 },
      { kind: "slime", x: 3200, y: 780 },
    ],
  },
  valley: {
    id: "valley",
    name: "수정 계곡",
    en: "CRYSTAL VALLEY",
    subtitle: "오래된 빛, 잠들어 있던 신호",
    width: 3900,
    spawn: 140,
    palette: ["#141c3d", "#495a8b", "#a6bad3"],
    platforms: [
      ground(0, 850),
      ground(1370, 700),
      ground(2670, 1230),
      ledge(760, 660, 240),
      ledge(1080, 600, 230),
      ledge(1400, 540, 250),
      ledge(1740, 450, 230),
      ledge(2010, 660, 240),
      ledge(2330, 590, 240),
      ledge(2670, 530, 240),
      ledge(3050, 650, 220),
    ],
    resources: [
      node("valley-crystal1", "crystal", 620, 780, 3),
      node("valley-iron", "iron", 1510, 780, 3),
      node("valley-crystal2", "crystal", 1810, 450, 3),
      node("valley-copper", "copper", 2420, 590, 3),
      node("valley-crystal3", "crystal", 2930, 780, 3),
    ],
    landmarks: [
      {
        id: "valley-camp",
        label: "회복 및 저장",
        x: 240,
        y: 780,
        kind: "heal",
      },
      {
        id: "ruin",
        label: "고대 유적의 신호 조사",
        x: 3550,
        y: 780,
        kind: "ruin",
      },
      {
        id: "valley-supply",
        label: "연구 보급품 열기",
        x: 1820,
        y: 450,
        kind: "chest",
      },
    ],
    enemies: [
      { kind: "crawler", x: 620, y: 780 },
      { kind: "manta", x: 1190, y: 500 },
      { kind: "crawler", x: 1710, y: 780 },
      { kind: "manta", x: 2400, y: 470 },
      { kind: "crawler", x: 3100, y: 780 },
    ],
  },
};
export const regionOrder: RegionId[] = ["crash", "forest", "valley"];
export const questData = [
  {
    name: "생존자",
    story: "ASTRA-01의 생존 장비를 확인하세요.",
    goals: [
      ["move", "이동 및 점프", 1],
      ["ship", "우주선 잔해 조사", 1],
      ["capsule", "생존 캡슐 발견", 1],
    ],
    xp: 30,
  },
  {
    name: "구조 신호",
    story: "통신 장치를 복구할 재료를 찾아보세요.",
    goals: [
      ["beacon", "통신 장치 확인", 1],
      ["scrap", "우주선 잔해 수집", 3],
      ["crystal", "에너지 결정 수집", 3],
    ],
    xp: 45,
  },
  {
    name: "미지의 생명체",
    story: "발광 숲에서 첫 생명체를 조사하세요.",
    goals: [
      ["forest", "발광 숲 발견", 1],
      ["slime", "GLOW SLIME 처치", 3],
      ["gel", "에너지 젤 수집", 2],
    ],
    xp: 60,
  },
  {
    name: "새로운 가능성",
    story: "수정 계곡 너머의 에너지 신호를 따라가세요.",
    goals: [
      ["valley", "수정 계곡 발견", 1],
      ["crystal", "에너지 결정 수집", 5],
      ["ruin", "외계 문명 유적 발견", 1],
    ],
    xp: 90,
  },
  {
    name: "전투 준비",
    story: "불시착 지점의 훈련 장치를 사용하세요.",
    goals: [
      ["training", "전투 훈련장 방문", 1],
      ["trainingHit", "기본 공격 연습", 3],
      ["trainingDodge", "회피 연습", 1],
      ["trainingTrial", "새 무기 시험", 1],
    ],
    xp: 100,
  },
  {
    name: "깊은 숲의 위협",
    story: "숲의 심층부에서 새로운 생명체를 조사하세요.",
    goals: [
      ["forestDeep", "발광 숲 심층부 발견", 1],
      ["discover_volt", "전기 사냥꾼 조사", 1],
      ["biomass", "외계 생체 물질 수집", 5],
    ],
    xp: 160,
  },
  {
    name: "수정 갑충의 비밀",
    story: "후방 또는 전기·특수 공격으로 장갑을 공략하세요.",
    goals: [
      ["discover_beetle", "수정 갑충 조사", 1],
      ["weakness", "약점 공격 성공", 1],
      ["fragment", "수정 파편 수집", 3],
    ],
    xp: 200,
  },
  {
    name: "비정상적인 에너지",
    story: "위험 구역의 엘리트와 고대 신호를 추적하세요.",
    goals: [
      ["eliteDiscover", "엘리트 발견", 1],
      ["eliteKill", "엘리트 처치", 1],
      ["ruin", "고대 유적 조사", 1],
    ],
    xp: 230,
  },
  {
    name: "잠들어 있던 수호자",
    story: "유적 동쪽의 타이탄 봉인을 조사하세요. 권장 레벨 12–15.",
    goals: [
      ["titanDiscover", "타이탄 발견", 1],
      ["titanKill", "타이탄 처치", 1],
      ["titanCore", "타이탄 코어 확보", 1],
    ],
    xp: 300,
  },
  {
    name: "새로운 개척의 시작",
    story: "코어를 가지고 돌아가 통신 장치와 우주선을 조사하세요.",
    goals: [
      ["returnCamp", "불시착 지점 귀환", 1],
      ["coreAnalysis", "통신 장치에서 코어 분석", 1],
      ["engine", "우주선 동력 장치 조사", 1],
    ],
    xp: 250,
  },
] as const;
export const opening = [
  [
    "2478 · THE EXODUS",
    "지구의 마지막 자원이 고갈되던 해, 인류는 별을 향했다.",
  ],
  [
    "ASTRA-01 · DEEP SPACE",
    "당신의 임무는 단 하나. 새로운 시작이 될 세계를 찾는 것.",
  ],
  [
    "WARNING · ENERGY STORM",
    "항로에 정체불명의 에너지 폭풍 감지. 모든 대원, 충격에 대비하라.",
  ],
  ["ENGINE FAILURE", "추진 시스템 정지. 통신 연결이 끊어졌다."],
  ["UNKNOWN ATMOSPHERE", "구름 너머, 푸른 행성이 눈앞으로 다가왔다."],
  ["IMPACT · SIGNAL LOST", "불시착. 그리고 긴 침묵."],
  ["EDEN · FIRST CONTACT", "낯선 바람이 바이저를 스친다. 당신은 살아 있다."],
  ["A NEW BEGINNING", "이제, 당신의 첫 번째 발자국을 남길 시간이다."],
];

// Phase 2 expands the existing regions; IDs and Phase 1 landmarks stay stable.
regions.crash.landmarks.push({
  id: "training",
  label: "전투 훈련장 · F 입장/퇴장",
  x: 2140,
  y: 780,
  kind: "training",
});
regions.crash.enemies.push(
  { kind: "slime", x: 2720, y: 780 },
  { kind: "slime", x: 2950, y: 780 },
);
regions.forest.enemies = [
  { kind: "slime", x: 700, y: 780 },
  { kind: "slime", x: 1150, y: 780 },
  { kind: "slime", x: 1700, y: 780 },
  { kind: "crawler", x: 900, y: 780 },
  { kind: "spore", x: 1400, y: 780 },
  { kind: "volt", x: 2170, y: 780 },
  { kind: "manta", x: 2700, y: 670 },
  { kind: "wisp", x: 3020, y: 600 },
  { kind: "crawler", x: 3350, y: 780, elite: "electric" },
  { kind: "spore", x: 2480, y: 780, elite: "regenerating" },
];
regions.valley.width = 5200;
regions.valley.platforms.find((p) => p.x === 2670 && !p.oneWay)!.w = 2530;
regions.valley.platforms.push(
  ledge(4140, 640, 190),
  ledge(4520, 540, 210),
  ledge(4870, 640, 190),
);
regions.valley.landmarks.push(
  { id: "ruins-camp", label: "회복 및 저장", x: 3780, y: 780, kind: "heal" },
  {
    id: "titan-gate",
    label: "타이탄 봉인 조사 · 권장 Lv.12–15",
    x: 3940,
    y: 780,
    kind: "boss",
  },
);
regions.valley.enemies = [
  { kind: "beetle", x: 650, y: 780, elite: "fortified" },
  { kind: "manta", x: 1190, y: 500 },
  { kind: "worm", x: 1590, y: 780, elite: "splitting" },
  { kind: "beetle", x: 1880, y: 780 },
  { kind: "wisp", x: 2400, y: 470, elite: "shielded" },
  { kind: "golem", x: 2910, y: 780 },
  { kind: "stalker", x: 3300, y: 780, elite: "berserk" },
];
planets[0].enemyTypes = [
  "slime",
  "crawler",
  "manta",
  "spore",
  "beetle",
  "worm",
  "volt",
  "wisp",
  "golem",
  "stalker",
];
