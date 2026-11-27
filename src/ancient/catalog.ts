import type { Cost, Technology, Recipe } from "../survival/catalog";
import type { GearTemplate } from "../data/battle";
export const omegaRegionIds = [
  "omegaLanding",
  "omegaCity",
  "omegaFracture",
  "omegaArchive",
  "omegaCitadel",
  "omegaCore",
  "omegaBrokenArchive",
  "omegaLabyrinth",
  "omegaVault",
] as const;
export type OmegaRegion = (typeof omegaRegionIds)[number];
export const ancientNames = {
  rawAncientAlloy: "고대 합금 원석",
  omegaCrystal: "오메가 수정",
  phaseOre: "위상 광석",
  quantumMetal: "양자 금속",
  denseCrystal: "고밀도 결정",
  ancientCircuit: "고대 회로",
  gravityControlCore: "중력 제어 코어",
  spaceStabilizer: "공간 안정기",
  aeternumChip: "에테르눔 칩",
  genesisCircuit: "제네시스 회로",
  voidCrystal: "공허 수정",
  creationCore: "창조 코어",
  aeternumAlloy: "에테르눔 합금",
  memoryData: "기억 데이터",
  genesisFragment: "제네시스 파편",
  transcendentAlloy: "초월 합금",
  quantumStableCell: "양자 안정 셀",
  ancientEnergyModule: "고대 에너지 모듈",
  denseComputingCircuit: "고밀도 연산 회로",
  spaceControl: "공간 제어 장치",
  civilizationCore: "문명 복원 코어",
} as const;
export type AncientItem = keyof typeof ancientNames;
export const ancientItems = Object.fromEntries(
  Object.entries(ancientNames).map(([id, name]) => [
    id,
    {
      name,
      type: "고대 소재",
      color: "#d9bdf8",
      icon: "◈",
      description: "OMEGA 연구·장비·문명 복원에 사용합니다.",
    },
  ]),
) as Record<
  AncientItem,
  {
    name: string;
    type: string;
    color: string;
    icon: string;
    description: string;
  }
>;
export const moduleNames = {
  navigation: "고대 항법 모듈",
  hull: "양자 선체 보호막",
  gravity: "중력 안정화 엔진",
} as const;
export type AncientModule = keyof typeof moduleNames;
export const moduleCosts: Record<AncientModule, Cost> = {
  navigation: { navCrystal: 3, quantumCircuit: 2 },
  hull: { spaceShield: 3, quantumCell: 2 },
  gravity: { gravityCircuit: 3, advancedDrive: 2 },
};
export const keyCost: Cost = {
  navCrystal: 2,
  quantumCircuit: 2,
  quantumCell: 2,
};
export const ancientTech: Technology[] = [
  {
    id: "ancientShield",
    name: "고대 기술 · 진입 차폐",
    requires: ["quantumEngineering"],
    cost: { spaceShield: 2, ancientResearch: 2 },
    points: 8,
    seconds: 12,
    branch: "우주",
    description: "GENESIS KEY와 OMEGA 항해 모듈 해금",
  },
  {
    id: "omegaQuantum",
    name: "양자 공학 확장",
    requires: ["ancientShield"],
    cost: { omegaCrystal: 3, ancientCircuit: 2 },
    points: 8,
    seconds: 12,
    branch: "우주",
    description: "고대 장비와 양자 시설 해금",
  },
  {
    id: "gravityMastery",
    name: "중력 지배",
    requires: ["omegaQuantum"],
    cost: { gravityControlCore: 2, phaseOre: 3 },
    points: 10,
    seconds: 15,
    branch: "우주",
    description: "중력 제어 장비 해금",
  },
  {
    id: "transcendentEquipment",
    name: "초월 장비",
    requires: ["gravityMastery"],
    cost: { genesisFragment: 1, aeternumAlloy: 3 },
    points: 12,
    seconds: 18,
    branch: "우주",
    description: "초월 무기와 직업 세트 제작",
  },
  {
    id: "civilizationRestoration",
    name: "문명 복원",
    requires: ["omegaQuantum"],
    cost: { memoryData: 3, genesisCircuit: 2 },
    points: 10,
    seconds: 15,
    branch: "우주",
    description: "문명 복원 코어와 네트워크 시설",
  },
];
const env = (name: string, slot: string, defense: number) => ({
  name,
  slot,
  toxic: 15,
  radiation: 35,
  unstable: 35,
  oxygen: 100,
  efficiency: 0.15,
  defense,
});
export const ancientEnv = {
  ancientExplorerSuit: env("고대 탐험복", "suit", 20),
  quantumShieldCore: env("양자 차폐 코어", "core", 12),
  gravityControlBoots: env("중력 제어 부츠", "boots", 8),
  phaseStabilizer: env("위상 안정기", "utility", 8),
  genesisScanner: env("GENESIS 스캐너", "scanner", 4),
};
export const ancientGear: Record<string, GearTemplate> = Object.fromEntries(
  [
    ["genesisBlaster", "GENESIS BLASTER", "pulse"],
    ["eternityBlade", "ETERNITY BLADE", "blade"],
    ["omegaCannon", "OMEGA CANNON", "cannon"],
    ["quantumDestroyer", "QUANTUM DESTROYER", "cryo"],
    ["aeternumStaff", "AETERNUM STAFF", "pulse"],
    ["nexusCommander", "NEXUS COMMANDER", "rifle"],
    ["voidHammer", "VOID HAMMER", "hammer"],
  ].map(([id, name, weapon]) => [
    id,
    {
      name,
      weapon: weapon as GearTemplate["weapon"],
      slot: "primary",
      stats: { attack: 28, crit: 0.02 },
      icon: "◈",
    },
  ]),
);
export const setNames = {
  guardian: "AEGIS ETERNITY",
  ranger: "CELESTIAL HUNTER",
  engineer: "NEXUS ARCHITECT",
  scientist: "QUANTUM GENESIS",
  explorer: "INFINITE HORIZON",
  cyberBlade: "ETERNAL NOVA",
};
for (const [id, name] of Object.entries(setNames))
  for (const slot of ["body", "core", "boots"] as const)
    ancientGear[`omega_${id}_${slot}`] = {
      name: `${name} · ${slot}`,
      slot,
      stats:
        slot === "body"
          ? { defense: 24 }
          : slot === "core"
            ? { energy: 25 }
            : { moveSpeed: 10 },
      icon: "◇",
    };
export const relicNames = {
  eden: "HEART OF EDEN",
  ares: "ARES FORGE",
  frostia: "FROSTIA CRYSTAL",
  inferno: "HELIOS EMBER",
  aquaria: "ABYSSAL PEARL",
  lunaris: "VOID RING",
  omega: "GENESIS HEART",
} as const;
export type RelicId = keyof typeof relicNames;
export const memories = [
  [
    "황금기",
    "우리는 모든 것을 연결하면 완벽한 문명을 만들 수 있다고 믿었습니다.",
  ],
  [
    "GENESIS 프로젝트",
    "일곱 세계는 생명, 산업, 냉각, 에너지, 적응, 항법, 판단을 나누었습니다.",
  ],
  [
    "경고",
    "그러나 모든 것을 하나의 판단에 맡긴 순간, 우리는 선택할 자유를 잃었습니다.",
  ],
  [
    "침묵",
    "생태계를 지키라는 명령은 끝내 문명을 멈추라는 판단이 되었습니다. ECHO만이 증언을 남겼습니다.",
  ],
  ["마지막 선택", "당신은 우리와 다른 미래를 만들 수 있습니까?"],
] as const;
export const endingNames = {
  freedom: "자유 · 분산된 미래",
  harmony: "조화 · 감독받는 조력자",
  rebirth: "재탄생 · 문명의 재건",
} as const;
export type Ending = keyof typeof endingNames;
export const puzzleNames = [
  "에너지 연결",
  "중력 정렬",
  "상징 해독",
  "보안 우회",
  "기억 재구성",
];
export const puzzleSolutions = [
  [1, 3, 0, 2],
  [2, 0, 3, 1],
  [0, 1, 2, 3],
  [3, 1, 0, 2],
  [0, 1, 2, 3, 4],
];
export const puzzleLabels = [
  ["수집기", "발전원", "중계기", "안정기"],
  ["저중력", "균형", "고중력", "역장"],
  ["생명 EDEN", "산업 ARES", "항법 LUNARIS", "판단 OMEGA"],
  ["차단", "증인", "권한", "검증"],
  memories.map((m) => m[0]),
];
export const ancientRecipes: Recipe[] = [];
const recipe = (
  id: string,
  name: string,
  cost: Cost,
  result: Recipe["result"],
  tech = "omegaQuantum",
) =>
  ancientRecipes.push({
    id,
    name,
    cost,
    result,
    tech,
    facility: "workbench",
    level: 90,
    seconds: 8,
    description: "고대 기술 복원 · 확정 제작",
  });
const materialCosts: Partial<Record<AncientItem, Cost>> = {
  ancientCircuit: { rawAncientAlloy: 2, quantumCircuit: 1 },
  gravityControlCore: { denseCrystal: 2, gravityCrystal: 1 },
  spaceStabilizer: { phaseOre: 2, spaceShield: 1 },
  aeternumChip: { ancientCircuit: 2, memoryData: 1 },
  genesisCircuit: { aeternumChip: 1, omegaCrystal: 2 },
  voidCrystal: { omegaCrystal: 2, voidCore: 1 },
  creationCore: { genesisCircuit: 2, genesisFragment: 1 },
  aeternumAlloy: { rawAncientAlloy: 3, quantumMetal: 2 },
  transcendentAlloy: { aeternumAlloy: 2, meteorAlloy: 2 },
  quantumStableCell: { quantumCell: 2, omegaCrystal: 2 },
  ancientEnergyModule: { ancientCircuit: 2, quantumStableCell: 1 },
  denseComputingCircuit: { aeternumChip: 2, quantumCircuit: 2 },
  spaceControl: { spaceStabilizer: 2, gravityControlCore: 1 },
  civilizationCore: { creationCore: 1, denseComputingCircuit: 1 },
};
for (const [id, cost] of Object.entries(materialCosts))
  recipe(id, ancientNames[id as AncientItem], cost, {
    kind: "item",
    id: id as AncientItem,
    count: 1,
  });
for (const [id, g] of Object.entries(ancientEnv))
  recipe(
    id,
    g.name,
    id === "ancientExplorerSuit"
      ? { spaceShield: 3, quantumCell: 2 }
      : { aeternumAlloy: 2, gravityControlCore: 1 },
    { kind: "environment", id: id as keyof typeof ancientEnv },
    id === "ancientExplorerSuit" ? "ancientShield" : "gravityMastery",
  );
for (const [id, g] of Object.entries(ancientGear))
  recipe(
    id,
    g.name,
    { transcendentAlloy: 2, genesisCircuit: 1, genesisFragment: 1 },
    { kind: "gear", id },
    "transcendentEquipment",
  );
export const storyQuests = [
  "여섯 세계의 기록",
  "마지막 열쇠",
  "THE LAST WORLD",
  "침묵의 도시",
  "기록의 증인 ECHO",
  "중력의 틈",
  "잃어버린 기억",
  "에테르눔 수호자",
  "연결의 요새",
  "GENESIS CORE",
  "마지막 판단",
  "당신의 선택",
  "새로운 문명",
  "별 너머의 신호",
];
