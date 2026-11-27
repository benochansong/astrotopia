import { ancientEnv, ancientRecipes, ancientTech } from "../ancient/catalog";
import {
  extremeGear,
  installExtremeRecipes,
  extremeTech,
} from "../extreme/catalog";
import {
  desertGear,
  installSpaceRecipes,
  spaceTechRows,
} from "../space/catalog";
import type { GearTemplate } from "../data/battle";
import type { ItemId, RegionId } from "../data/content";
import type { WeaponId } from "../combat/types";
export const resourceRows = {
  coal: ["석탄", "광물", "#788a99", "⬡", 1, "crash"],
  silicon: ["실리콘 광석", "광물", "#aec9db", "⬡", 1, "forest"],
  titanium: ["티타늄 광석", "광물", "#94cfea", "⬡", 2, "caverns"],
  rareQuartz: ["희귀 수정", "광물", "#caadff", "◈", 2, "caverns"],
  ancientMetal: ["고대 금속 파편", "광물", "#c0af8e", "▱", 3, "ruins"],
  denseCrystal: ["고밀도 에너지 결정", "광물", "#81b5ff", "◇", 3, "caverns"],
  radiant: ["라디언트 결정", "광물", "#d0a0ef", "✧", 3, "ruins"],
  coreCrystal: ["코어 결정", "광물", "#edabf5", "✦", 4, "abyss"],
  strongFiber: ["강화 식물 섬유", "식물", "#abc990", "❧", 1, "marsh"],
  spores: ["독성 포자", "생체 물질", "#b2d980", "☣", 1, "marsh"],
  resin: ["외계 수지", "생체 물질", "#d6b181", "◉", 1, "forest"],
  enzyme: ["생체 효소", "생체 물질", "#d8d987", "◉", 1, "forest"],
  circuit: ["외계 회로", "부품", "#b9a6f0", "▤", 3, "ruins"],
  electronics: ["전자 부품", "부품", "#a4e3d1", "▤", 1, "crash"],
  alloy: ["고대 합금", "정제 소재", "#c3b3de", "▰", 3, "ruins"],
  coreShard: ["고대 에너지 코어 조각", "스토리", "#e9bae8", "✦", 4, "abyss"],
  rareAlloy: ["희귀 합금", "정제 소재", "#c1a8ea", "▰", 4, "abyss"],
  data: ["일반 연구 데이터", "연구 데이터", "#b8d7ef", "▧", 1, "crash"],
  ecology: ["외계 생태 데이터", "연구 데이터", "#a7d4a2", "▧", 1, "marsh"],
  advancedData: ["고급 연구 데이터", "연구 데이터", "#d3b3e7", "▧", 3, "ruins"],
  ancientData: ["고대 문명 데이터", "연구 데이터", "#e4cda0", "▧", 4, "abyss"],
  ironBar: ["철괴", "정제 소재", "#aebfce", "▰", 1, "crash"],
  copperBar: ["구리괴", "정제 소재", "#e6aa81", "▰", 1, "crash"],
  wafer: ["실리콘 웨이퍼", "정제 소재", "#bacfe8", "▥", 1, "crash"],
  titaniumBar: ["티타늄괴", "정제 소재", "#aaddeb", "▰", 2, "crash"],
  refinedCell: ["정제 에너지 셀", "정제 소재", "#97e8e1", "▣", 1, "crash"],
  wovenFiber: ["강화 섬유", "정제 소재", "#abd4a2", "▥", 1, "crash"],
  polymer: ["생체 폴리머", "정제 소재", "#bdd4a2", "⬢", 1, "crash"],
  denseCell: ["고밀도 에너지 셀", "정제 소재", "#b2b6ed", "▣", 3, "crash"],
  medicalGel: ["의료 젤", "소비 아이템", "#e9aba1", "✚", 1, "crash"],
  energyCell: ["에너지 셀", "소비 아이템", "#93d8d7", "ϟ", 1, "crash"],
  oxygenCan: ["휴대용 산소통", "소비 아이템", "#afd8ed", "O₂", 1, "crash"],
  antitoxin: ["해독제", "소비 아이템", "#b8db91", "☣", 1, "crash"],
  purifier: ["방사능 정화제", "소비 아이템", "#d3b6f2", "☢", 2, "crash"],
  portableBeacon: [
    "휴대용 탐험 비콘",
    "소비 아이템",
    "#dcc899",
    "⌖",
    1,
    "crash",
  ],
  recall: ["긴급 귀환 장치", "소비 아이템", "#a6d9e2", "↩", 1, "crash"],
  blueprint: ["기지 건설 설계도", "스토리", "#eddba3", "▧", 4, "crash"],
  colonyData: ["개척 기술 데이터", "연구 데이터", "#dfcfaa", "▧", 4, "abyss"],
} as const;
export type NewItemId = keyof typeof resourceRows;
export const extraItems = Object.fromEntries(
  Object.entries(resourceRows).map(([id, r]) => [
    id,
    {
      name: r[0],
      type: r[1],
      color: r[2],
      icon: r[3],
      description: `${r[0]}. 탐험·정제·연구에 사용하는 ${r[1]}. B 메뉴의 레시피와 도감에서 활용법을 확인하세요.`,
    },
  ]),
) as Record<
  NewItemId,
  {
    name: string;
    type: string;
    color: string;
    icon: string;
    description: string;
  }
>;
export type EnvironmentKind =
  "safe" | "toxic" | "hypoxia" | "radiation" | "unstable";
export const environments: Record<
  EnvironmentKind,
  {
    name: string;
    icon: string;
    color: string;
    resistance: number;
    hint: string;
  }
> = {
  safe: {
    name: "안전한 대기",
    icon: "◎",
    color: "#a6d1b7",
    resistance: 0,
    hint: "별도 장비 불필요",
  },
  toxic: {
    name: "독성 포자",
    icon: "☣",
    color: "#c0d79a",
    resistance: 25,
    hint: "정화 마스크",
  },
  hypoxia: {
    name: "산소 부족",
    icon: "O₂",
    color: "#99c7ea",
    resistance: 0,
    hint: "산소 공급 모듈 · 탐험용 조명",
  },
  radiation: {
    name: "방사능",
    icon: "☢",
    color: "#c7a9ec",
    resistance: 40,
    hint: "방사능 차폐복",
  },
  unstable: {
    name: "에너지 간섭",
    icon: "ϟ",
    color: "#edb3ed",
    resistance: 45,
    hint: "에너지 안정화 장치",
  },
};
export const toolsData = [
  { id: 1, name: "기초 채굴기", speed: 1, energy: 0, color: "#c5ddc5" },
  { id: 2, name: "레이저 절삭기", speed: 1.5, energy: 1, color: "#8ad6fa" },
  { id: 3, name: "플라즈마 드릴", speed: 2, energy: 4, color: "#d2a7f4" },
  { id: 4, name: "양자 추출기", speed: 2.7, energy: 6, color: "#f4d699" },
] as const;
export const environmentGear = {
  ...desertGear,
  ...ancientEnv,
  ...extremeGear,
  mask: {
    name: "정화 마스크",
    slot: "mask",
    toxic: 32,
    oxygen: 0,
    radiation: 0,
    unstable: 0,
    defense: 0,
    efficiency: 0,
  },
  oxygen: {
    name: "산소 공급 모듈",
    slot: "oxygen",
    toxic: 0,
    oxygen: 100,
    radiation: 0,
    unstable: 0,
    defense: 0,
    efficiency: 0.3,
  },
  light: {
    name: "탐험용 조명",
    slot: "light",
    toxic: 0,
    oxygen: 0,
    radiation: 0,
    unstable: 0,
    defense: 0,
    efficiency: 0,
  },
  radiation: {
    name: "방사능 차폐복",
    slot: "suit",
    toxic: 10,
    oxygen: 0,
    radiation: 48,
    unstable: 5,
    defense: 4,
    efficiency: 0,
  },
  stabilizer: {
    name: "에너지 안정화 장치",
    slot: "stabilizer",
    toxic: 0,
    oxygen: 0,
    radiation: 0,
    unstable: 55,
    defense: 0,
    efficiency: 0,
  },
  advanced: {
    name: "고급 탐험복",
    slot: "suit",
    toxic: 25,
    oxygen: 40,
    radiation: 55,
    unstable: 25,
    defense: 8,
    efficiency: 0.2,
  },
} as const;
export type EnvGearId = keyof typeof environmentGear;
export type Cost = Partial<Record<ItemId, number>>;
export type Facility =
  | "terminal"
  | "workbench"
  | "refinery"
  | "research"
  | "equipment"
  | "warehouse";
export const facilities: Record<
  Facility,
  { name: string; icon: string; cost: Cost }
> = {
  terminal: { name: "생존 터미널", icon: "✚", cost: {} },
  workbench: { name: "기초 제작대", icon: "⚒", cost: {} },
  refinery: {
    name: "광물 정제소",
    icon: "♨",
    cost: { scrap: 3, iron: 3, copper: 3 },
  },
  research: {
    name: "연구 터미널",
    icon: "⌬",
    cost: { ironBar: 2, copperBar: 1 },
  },
  equipment: {
    name: "장비 작업소",
    icon: "⬢",
    cost: { ironBar: 3, copperBar: 2, electronics: 2 },
  },
  warehouse: { name: "개인 창고", icon: "▤", cost: {} },
};
export type Product =
  | { kind: "item"; id: ItemId; count: number }
  | { kind: "gear"; id: string }
  | { kind: "tool"; id: number }
  | { kind: "environment"; id: EnvGearId }
  | { kind: "pack"; id: "expansion" };
export interface Recipe {
  id: string;
  name: string;
  facility: Facility;
  cost: Cost;
  tech?: string;
  level: number;
  seconds: number;
  result: Product;
  description: string;
}
export const recipes: Record<string, Recipe> = {};
const recipe = (
  id: string,
  name: string,
  cost: Cost,
  result: Product,
  facility: Facility = "workbench",
  tech?: string,
  seconds = 3,
  level = 1,
  description = "",
) =>
  (recipes[id] = {
    id,
    name,
    cost,
    result,
    facility,
    tech,
    seconds,
    level,
    description,
  });
const refine = (id: ItemId, cost: Cost, tech = "metal", seconds = 3) =>
  recipe(
    "refine_" + id,
    extraItems[id as NewItemId]?.name ?? id,
    cost,
    { kind: "item", id, count: 1 },
    "refinery",
    tech,
    seconds,
    1,
    "원석을 중간 소재로 정제합니다.",
  );
refine("ironBar", { iron: 3 });
refine("copperBar", { copper: 3 });
refine("wafer", { silicon: 2 });
refine("titaniumBar", { titanium: 4 }, "alloy", 6);
refine("refinedCell", { crystal: 3 });
refine("wovenFiber", { fiber: 3 });
refine("polymer", { resin: 2, enzyme: 1 }, "bio", 5);
refine("alloy", { ancientMetal: 3 }, "ancient", 9);
refine("denseCell", { denseCrystal: 3 }, "density", 8);
recipe(
  "medicalGel",
  "의료 젤",
  { fiber: 1, gel: 1 },
  { kind: "item", id: "medicalGel", count: 2 },
);
recipe(
  "energyCell",
  "에너지 셀",
  { crystal: 1, copper: 1 },
  { kind: "item", id: "energyCell", count: 2 },
);
recipe(
  "oxygenCan",
  "휴대용 산소통",
  { iron: 2, fiber: 1 },
  { kind: "item", id: "oxygenCan", count: 2 },
);
recipe(
  "antitoxin",
  "해독제",
  { enzyme: 1, fiber: 1 },
  { kind: "item", id: "antitoxin", count: 2 },
);
recipe(
  "purifier",
  "방사능 정화제",
  { refinedCell: 1, polymer: 1 },
  { kind: "item", id: "purifier", count: 2 },
  "workbench",
  "shielding",
);
recipe(
  "portableBeacon",
  "휴대용 탐험 비콘",
  { electronics: 1, ironBar: 1 },
  { kind: "item", id: "portableBeacon", count: 1 },
);
recipe(
  "recall",
  "긴급 귀환 장치",
  { electronics: 1, crystal: 2 },
  { kind: "item", id: "recall", count: 1 },
);
recipe(
  "electronics",
  "전자 부품",
  { scrap: 1, copper: 1 },
  { kind: "item", id: "electronics", count: 2 },
);
recipe(
  "researchData",
  "연구 자료 분석",
  { biomass: 1, crystal: 1 },
  { kind: "item", id: "data", count: 3 },
  "research",
  undefined,
  4,
);
recipe(
  "fieldData",
  "탐사 기록 정리",
  { scrap: 1, fiber: 1 },
  { kind: "item", id: "data", count: 2 },
  "workbench",
  undefined,
  3,
);
for (const [id, tech, cost] of [
  [2, "laser", { ironBar: 2, copperBar: 2 }],
  [3, "plasma", { titaniumBar: 2, refinedCell: 2 }],
  [4, "quantum", { alloy: 2, denseCell: 2, circuit: 2 }],
] as [number, string, Cost][])
  recipe(
    "tool" + id,
    toolsData[id - 1].name,
    cost,
    { kind: "tool", id },
    "equipment",
    tech,
    5,
  );
const envCosts: Record<
  Exclude<
    EnvGearId,
    keyof typeof desertGear | keyof typeof extremeGear | keyof typeof ancientEnv
  >,
  [string, Cost]
> = {
  mask: ["filter", { wovenFiber: 3, copperBar: 2, polymer: 1 }],
  oxygen: ["oxygen", { ironBar: 4, copperBar: 3, refinedCell: 2 }],
  light: ["oxygen", { copperBar: 2, wafer: 2, refinedCell: 1 }],
  radiation: [
    "shielding",
    { titaniumBar: 5, wovenFiber: 4, polymer: 2, refinedCell: 2 },
  ],
  stabilizer: ["stability", { titaniumBar: 4, circuit: 2, denseCell: 2 }],
  advanced: [
    "explorer",
    { alloy: 4, rareAlloy: 2, coreShard: 1, denseCell: 3 },
  ],
};
for (const id of Object.keys(envCosts) as (keyof typeof envCosts)[])
  recipe(
    id,
    environmentGear[id].name,
    envCosts[id][1],
    { kind: "environment", id },
    "equipment",
    envCosts[id][0],
    6,
    1,
    "착용한 환경 장비의 저항과 산소 효율이 실제 탐험에 적용됩니다.",
  );
recipe(
  "expansion",
  "확장 보관 모듈 · 36칸",
  { ironBar: 3, wovenFiber: 3 },
  { kind: "pack", id: "expansion" },
  "equipment",
  "alloy",
  5,
);
const weaponNames: Record<WeaponId, string> = {
  pulse: "펄스 블래스터",
  rifle: "플라즈마 소총",
  blade: "에너지 블레이드",
  cannon: "이온 캐논",
  cryo: "크라이오 런처",
  hammer: "중력 해머",
};
export const craftedGear: Record<string, GearTemplate> = {};
for (const [id, name] of Object.entries(weaponNames))
  for (let mk = 1; mk <= 5; mk++) {
    const key = id + "_mk" + mk;
    craftedGear[key] = {
      name: name + " MK-" + ["I", "II", "III", "IV", "V"][mk - 1],
      slot: "primary",
      weapon: id as WeaponId,
      icon: id === "blade" ? "╱" : id === "hammer" ? "⊤" : "⌁",
      stats: {
        attack: mk * 4,
        crit: id === "rifle" || id === "pulse" ? mk * 0.015 : 0,
        critDamage: id === "blade" || id === "hammer" ? mk * 0.06 : 0,
        energy: id === "cryo" || id === "cannon" ? mk * 3 : 0,
      },
    };
    recipe(
      key,
      craftedGear[key].name,
      mk === 1
        ? { ironBar: 2, copperBar: 1 }
        : mk === 2
          ? { titaniumBar: 2, refinedCell: 2 }
          : mk === 3
            ? { alloy: 2, denseCell: 2, circuit: 1 }
            : mk === 4
              ? { ultraAlloy: 3, superCircuit: 2, plasmaCell: 2 }
              : { spaceShield: 3, quantumCell: 2, gravityCircuit: 2 },
      { kind: "gear", id: key },
      "equipment",
      mk === 1
        ? "weapons"
        : mk === 2
          ? "power"
          : mk === 3
            ? "advancedWeapons"
            : mk === 4
              ? "geothermalEngineering"
              : "quantumEngineering",
      mk * 3,
      1,
      "원형 무기의 조작과 특수 공격을 유지하며 출력·치명타 또는 에너지 용량을 강화합니다.",
    );
  }

for (const [id, name, weapon, tech, cost] of [
  [
    "hydroLance",
    "HYDRO LANCE",
    "rifle",
    "pressureEngineering",
    { pressureAlloy: 3, hydroModule: 2 },
  ],
  [
    "sonicCannon",
    "SONIC CANNON",
    "cannon",
    "pressureEngineering",
    { marineCell: 3, pressureUnit: 2 },
  ],
  [
    "abyssBlade",
    "ABYSS BLADE",
    "blade",
    "pressureEngineering",
    { marineAlloy: 3, alienPearl: 2 },
  ],
  [
    "gravityLance",
    "GRAVITY LANCE",
    "rifle",
    "quantumEngineering",
    { gravityCircuit: 3, lightAlloy: 2 },
  ],
  [
    "quantumBlaster",
    "QUANTUM BLASTER",
    "pulse",
    "quantumEngineering",
    { quantumCell: 3, navCrystal: 2 },
  ],
  [
    "orbitalBlade",
    "ORBITAL BLADE",
    "blade",
    "quantumEngineering",
    { spaceShield: 3, advancedDrive: 2 },
  ],
] as const) {
  craftedGear[id] = {
    name,
    slot: "primary",
    weapon,
    icon: "◇",
    stats: {
      attack: tech === "quantumEngineering" ? 28 : 22,
      energy: 10,
      crit: 0.04,
    },
  };
  recipe(
    id,
    name,
    cost,
    { kind: "gear", id },
    "equipment",
    tech,
    15,
    1,
    "기존 무기 조작을 유지하며 관통·광역·공중 공격 특성을 강화합니다.",
  );
}
export interface Technology {
  id: string;
  name: string;
  branch: string;
  requires: string[];
  cost: Cost;
  points: number;
  seconds: number;
  description: string;
  future?: boolean;
}
export const technologies: Record<string, Technology> = {};
const tech = (
  id: string,
  name: string,
  branch: string,
  requires: string[],
  cost: Cost = {},
  points = 2,
  description = "레시피와 탐험 장비를 해금합니다.",
  future = false,
) =>
  (technologies[id] = {
    id,
    name,
    branch,
    requires,
    cost: { data: 1, ...cost },
    points,
    seconds: 4,
    description,
    future,
  });
tech("analysis", "기초 광물 분석", "채굴", [], {}, 1);
tech("laser", "레이저 절삭 기술", "채굴", ["analysis", "metal"]);
tech(
  "plasma",
  "플라즈마 채굴 기술",
  "채굴",
  ["laser", "alloy"],
  { titanium: 2 },
  3,
);
tech(
  "quantum",
  "양자 추출 기술",
  "채굴",
  ["plasma", "ancient"],
  { circuit: 1 },
  4,
);
tech(
  "rareScan",
  "희귀 자원 탐지",
  "채굴",
  ["laser"],
  { rareQuartz: 1 },
  2,
  "스캐너 분석 반경 증가. 정확한 비밀 위치는 공개하지 않습니다.",
);
tech("metal", "기초 금속 정제", "소재", [], {}, 1);
tech("alloy", "강화 합금 · 소재 공학", "소재", ["metal"], { ecology: 1 }, 2);
tech("bio", "생체 소재", "소재", ["metal"], { resin: 1 }, 2);
tech("density", "고밀도 에너지 셀", "소재", ["alloy"], { denseCrystal: 1 }, 3);
tech("ancient", "고대 합금 가공", "소재", ["density"], { advancedData: 1 }, 3);
tech("filter", "대기 정화 기술", "생존", ["bio"], {}, 2);
tech("oxygen", "산소 저장 기술", "생존", ["metal"], {}, 2);
tech(
  "shielding",
  "방사능 차폐 기술",
  "생존",
  ["alloy", "bio"],
  { titanium: 1 },
  3,
);
tech(
  "stability",
  "에너지 안정화 기술",
  "생존",
  ["shielding", "density"],
  { circuit: 1 },
  3,
);
tech(
  "explorer",
  "고급 탐험복 기술",
  "생존",
  ["stability"],
  { ancientData: 1 },
  4,
  "심연의 파수꾼 첫 처치 설계도가 필요합니다.",
);
tech("weapons", "에너지 무기 개량", "무기", ["metal"]);
tech(
  "melee",
  "근접 에너지 무기",
  "무기",
  ["weapons"],
  {},
  2,
  "근접 제작 장비 능력치 +5%",
);
tech("power", "고출력 에너지 장치", "무기", ["weapons", "alloy"], {}, 3);
tech("advancedWeapons", "고급 무기 제작", "무기", ["power", "ancient"], {}, 3);
tech(
  "upgrade",
  "장비 강화 기술",
  "무기",
  ["weapons"],
  {},
  2,
  "+0~+5 확정 강화 해금",
);
tech(
  "powerPlan",
  "기초 발전 설계",
  "개척",
  ["stability"],
  { advancedData: 1 },
  2,
  "발전소 설계 기록. 실제 건설은 Phase 4.",
);
tech(
  "productionPlan",
  "자원 생산 설계",
  "개척",
  ["powerPlan"],
  {},
  2,
  "생산 시설 설계 기록. 실제 건설은 Phase 4.",
);
tech(
  "habitatPlan",
  "거주 모듈 설계",
  "개척",
  ["productionPlan"],
  {},
  2,
  "거주지 설계 기록. 실제 건설은 Phase 4.",
);
tech(
  "autoPlan",
  "자동 채굴 설계",
  "개척",
  ["productionPlan"],
  {},
  2,
  "자동 채굴 설계 기록. 실제 설비는 Phase 4.",
);
tech(
  "colony",
  "기지 건설 기술",
  "개척",
  ["habitatPlan", "autoPlan"],
  { colonyData: 1, ancientData: 1 },
  4,
  "기지 건설 설계도 획득. 자유 건설은 Phase 4.",
);
export function regionEnvironment(
  id: RegionId,
  x: number,
  y: number,
): EnvironmentKind {
  if (id.startsWith("omega")) return x < 650 ? "safe" : "radiation";
  if (id.startsWith("inferno"))
    return id.endsWith("Landing") && x < 650 ? "safe" : "toxic";
  if (
    ["frostia", "inferno", "aquaria", "lunaris"].some((p) => id.startsWith(p))
  )
    return id.endsWith("Landing") && x < 650 ? "safe" : "hypoxia";
  if (id.startsWith("ares"))
    return id === "aresLanding" && x < 650 ? "safe" : "hypoxia";
  if (x < 500) return "safe";
  if (id === "marsh") return y < 610 ? "safe" : "toxic";
  return id === "caverns"
    ? "hypoxia"
    : id === "ruins"
      ? "radiation"
      : id === "abyss"
        ? "unstable"
        : "safe";
}

recipe(
  "wovenStrong",
  "강화 식물 섬유 가공",
  { strongFiber: 2 },
  { kind: "item", id: "wovenFiber", count: 2 },
  "refinery",
  "bio",
  3,
);
recipe(
  "sporeAntitoxin",
  "독성 포자 중화",
  { spores: 2, enzyme: 1 },
  { kind: "item", id: "antitoxin", count: 3 },
  "workbench",
  "filter",
  3,
);
recipe(
  "radiantPurifier",
  "라디언트 정화 촉매",
  { radiant: 1, polymer: 1 },
  { kind: "item", id: "purifier", count: 3 },
  "workbench",
  "shielding",
  4,
);
recipes.advanced.cost.coreCrystal = 3;

installSpaceRecipes(recipes);
for (const row of spaceTechRows)
  technologies[row.id] = {
    ...row,
    requires: [...row.requires],
    cost: { ...row.cost },
    seconds: 12,
  };

installExtremeRecipes(recipes);
for (const t of extremeTech) technologies[t.id] = t;

for (const r of ancientRecipes) recipes[r.id] = r;
for (const t of ancientTech) technologies[t.id] = t;
