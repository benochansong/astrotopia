import { classGear } from "../classes/catalog";
import { extremePlanets, type ExtremePlanet } from "../extreme/catalog";
import { extremeRegions } from "../extreme/regions";
import { craftedGear } from "../survival/catalog";
import type {
  BattleSave,
  GearSlot,
  Rarity,
  SkillId,
  Stats,
  WeaponData,
  WeaponId,
} from "../combat/types";
const base = {
  power: 1,
  speed: 0.3,
  range: 700,
  projectileSpeed: 720,
  crit: 0,
  critDamage: 0,
  knockback: 140,
  energy: 0,
  cooldown: 4,
  element: "plasma" as const,
  pierce: false,
  statusChance: 0,
  animation: "Attack",
  sound: "pulse",
  effect: "pulse",
};
export const weapons: Record<WeaponId, WeaponData> = {
  pulse: {
    ...base,
    id: "pulse",
    name: "펄스 블래스터",
    en: "PULSE BLASTER",
    level: 1,
    color: "#bcebd4",
    speed: 0.25,
    description:
      "가볍고 안정적인 에너지 권총. 기본 공격은 에너지를 소모하지 않습니다.",
    special: "K · 관통 과충전 탄 (에너지 14)",
    power: 1,
  },
  rifle: {
    ...base,
    id: "rifle",
    name: "플라즈마 소총",
    en: "PLASMA RIFLE",
    level: 5,
    color: "#efbc84",
    power: 0.9,
    speed: 0.14,
    range: 1050,
    projectileSpeed: 1000,
    energy: 2,
    description: "빠른 연사. 사격 중 이동 속도가 20% 감소합니다.",
    special: "K · 3발 확산 점사 (에너지 18)",
    sound: "rifle",
  },
  blade: {
    ...base,
    id: "blade",
    name: "에너지 블레이드",
    en: "ENERGY BLADE",
    level: 3,
    color: "#8fe9e1",
    power: 1.7,
    speed: 0.28,
    range: 98,
    knockback: 170,
    description:
      "3단 연속 베기. 마지막 참격은 적을 띄웁니다. 공중·대시 공격 지원.",
    special: "K · 전방 돌파 참격 (에너지 20)",
    sound: "blade",
    effect: "arc",
    element: "plasma",
  },
  cannon: {
    ...base,
    id: "cannon",
    name: "이온 캐논",
    en: "ION CANNON",
    level: 10,
    color: "#f2c296",
    power: 2.2,
    speed: 1.1,
    range: 1100,
    projectileSpeed: 560,
    knockback: 300,
    energy: 14,
    description: "J를 누르면 충전, 놓으면 폭발탄 발사. 충전 중 이동 속도 감소.",
    special: "K · 즉시 최대 충전탄 (에너지 38)",
    sound: "cannon",
    element: "electric",
    status: "shock",
    statusChance: 0.7,
    cooldown: 8,
  },
  cryo: {
    ...base,
    id: "cryo",
    name: "크라이오 런처",
    en: "CRYO LAUNCHER",
    level: 7,
    color: "#a8dcff",
    power: 1.2,
    speed: 0.48,
    range: 650,
    projectileSpeed: 540,
    energy: 3,
    description:
      "냉각을 3회 누적하면 잠시 빙결합니다. 보스는 빙결에 면역입니다.",
    special: "K · 냉각 지대 (에너지 22)",
    sound: "cryo",
    element: "cryo",
    status: "chill",
    statusChance: 1,
  },
  hammer: {
    ...base,
    id: "hammer",
    name: "그래비티 해머",
    en: "GRAVITY HAMMER",
    level: 10,
    color: "#c3a6ee",
    power: 3.2,
    speed: 0.95,
    range: 145,
    knockback: 350,
    energy: 6,
    description: "지상 충격파. 공중 공격은 낙하 강타로 이어집니다.",
    special: "K · 중력 붕괴 (에너지 28)",
    sound: "hammer",
    element: "gravity",
    status: "stun",
    statusChance: 0.4,
    effect: "shockwave",
    cooldown: 6,
  },
};
export const skills: Record<
  SkillId,
  {
    name: string;
    level: number;
    energy: number;
    cooldown: number;
    icon: string;
    description: string;
  }
> = {
  dash: {
    name: "부스트 대시",
    level: 1,
    energy: 18,
    cooldown: 2,
    icon: "»",
    description: "짧은 대시와 0.18초 회피 무적. SHIFT로도 사용합니다.",
  },
  burst: {
    name: "에너지 버스트",
    level: 3,
    energy: 24,
    cooldown: 7,
    icon: "◉",
    description: "반경 170px 충격파와 넉백. 포위에서 탈출합니다.",
  },
  wave: {
    name: "플라즈마 웨이브",
    level: 5,
    energy: 22,
    cooldown: 5,
    icon: "≋",
    description: "전방으로 넓은 관통 파동을 발사합니다.",
  },
  aerial: {
    name: "공중 추진",
    level: 7,
    energy: 16,
    cooldown: 4,
    icon: "↑",
    description:
      "공중에서 한 번 더 상승합니다. 착지하면 다시 사용할 수 있습니다.",
  },
  shield: {
    name: "에너지 보호막",
    level: 9,
    energy: 28,
    cooldown: 13,
    icon: "⬡",
    description:
      "6초 동안 피해의 65%를 흡수합니다. 흡수량에는 한도가 있습니다.",
  },
  orbital: {
    name: "궤도 에너지 강타",
    level: 12,
    energy: 45,
    cooldown: 20,
    icon: "✧",
    description: "휴대용 송신기로 전방에 강력한 에너지 기둥을 호출합니다.",
  },
};
export const rarities: Record<
  Rarity,
  { name: string; color: string; mult: number }
> = {
  common: { name: "일반", color: "#d0d5d8", mult: 1 },
  uncommon: { name: "고급", color: "#9cdbac", mult: 1.5 },
  rare: { name: "희귀", color: "#83baff", mult: 2.2 },
  epic: { name: "영웅", color: "#c99bf5", mult: 3 },
  legendary: { name: "전설 · 후속 콘텐츠", color: "#f9b26e", mult: 4 },
  transcendent: { name: "초월 · 후속 콘텐츠", color: "#f1edb0", mult: 5 },
};
export const slotNames: Record<GearSlot, string> = {
  primary: "주무기",
  secondary: "보조 무기",
  helmet: "헬멧",
  body: "상체 우주복",
  legs: "하체 우주복",
  gloves: "장갑",
  boots: "부츠",
  core: "에너지 코어",
  accessory: "액세서리",
};
export interface GearTemplate {
  name: string;
  slot: GearSlot;
  weapon?: WeaponId;
  stats: Partial<Stats>;
  icon: string;
}
export const gearTemplates: Record<string, GearTemplate> = {
  ...classGear,
  ...craftedGear,
  ...Object.fromEntries(
    Object.values(weapons).map((w) => [
      w.id,
      {
        name: w.name,
        slot: "primary" as const,
        weapon: w.id,
        stats: { attack: 4, crit: 0.01 },
        icon: w.id === "blade" ? "╱" : w.id === "hammer" ? "⊤" : "⌁",
      },
    ]),
  ),
  helmet: {
    name: "정찰 헬멧",
    slot: "helmet",
    stats: { hp: 10, defense: 1, statusResist: 0.02 },
    icon: "◒",
  },
  body: {
    name: "강화 탐험복",
    slot: "body",
    stats: { hp: 20, defense: 2 },
    icon: "▣",
  },
  legs: {
    name: "기동 하의",
    slot: "legs",
    stats: { hp: 12, defense: 1, moveSpeed: 5 },
    icon: "Ⅱ",
  },
  gloves: {
    name: "전도성 장갑",
    slot: "gloves",
    stats: { attack: 2, attackSpeed: 0.03 },
    icon: "✋",
  },
  boots: {
    name: "추진 부츠",
    slot: "boots",
    stats: { moveSpeed: 10, defense: 1 },
    icon: "⌑",
  },
  core: {
    name: "순환 에너지 코어",
    slot: "core",
    stats: { energy: 12, regen: 2 },
    icon: "◇",
  },
  accessory: {
    name: "조준 보조 장치",
    slot: "accessory",
    stats: { crit: 0.025, critDamage: 0.08 },
    icon: "⌖",
  },
  titan: {
    name: "타이탄 공명 코어",
    slot: "core",
    stats: { energy: 18, attack: 5, regen: 2, elementResist: 0.035 },
    icon: "✦",
  },
};
export const statusInfo = {
  chill: { name: "냉각", icon: "❄", color: "#96dafa" },
  freeze: { name: "빙결", icon: "❆", color: "#d0f4ff" },
  shock: { name: "감전", icon: "ϟ", color: "#f0df8a" },
  poison: { name: "중독", icon: "☣", color: "#c2d68d" },
  stun: { name: "기절", icon: "✵", color: "#ece1a4" },
  shred: { name: "방어 감소", icon: "⌄", color: "#e7a5a0" },
};
export const difficulties = {
  explorer: { name: "탐험가", hp: 0.8, damage: 0.65, frequency: 1.2 },
  normal: { name: "일반", hp: 1, damage: 1, frequency: 1 },
  veteran: { name: "베테랑", hp: 1.2, damage: 1.3, frequency: 0.9 },
};
export function newBattle(level = 1): BattleSave {
  const unlocked = Object.values(weapons)
    .filter((w) => w.level <= level)
    .map((w) => w.id);
  return {
    ownedWeapons: unlocked,
    weaponSlots: ["pulse", level >= 3 ? "blade" : null],
    activeSlot: 0,
    gear: [],
    equipment: {},
    unlockedSkills: (Object.keys(skills) as SkillId[]).filter(
      (id) => skills[id].level <= level,
    ),
    skillSlots: ["burst", "wave", "aerial", "shield"],
    credits: 0,
    bossKills: 0,
    bossSeen: false,
    titles: [],
    discovered: [],
    story: [],
    groundLoot: [],
    serial: 0,
  };
}
export const subzones = {
  ...Object.fromEntries(
    Object.values(extremeRegions).map((r) => [
      r.id,
      [
        {
          id: r.id,
          start: 0,
          name: r.name,
          level:
            extremePlanets[
              r.id.replace(/Landing|Wilds|Depths|Ruins/, "") as ExtremePlanet
            ].level -
            15 +
            "–" +
            extremePlanets[
              r.id.replace(/Landing|Wilds|Depths|Ruins/, "") as ExtremePlanet
            ].level,
        },
      ],
    ]),
  ),
  ...(Object.fromEntries(
    ["ship", "aresLanding", "aresDunes", "aresCanyon", "aresFoundry"].map(
      (id) => [
        id,
        [
          {
            id,
            start: 0,
            name: id === "ship" ? "ASTRA-01" : "ARES 개척 구역",
            level: "15–30",
          },
        ],
      ],
    ),
  ) as Record<
    import("../space/catalog").SpaceRegion,
    { id: string; start: number; name: string; level: string }[]
  >),
  marsh: [{ id: "marshZone", start: 0, name: "독성 습지", level: "10–15" }],
  caverns: [
    { id: "cavernsZone", start: 0, name: "심층 수정 동굴", level: "12–15" },
  ],
  ruins: [{ id: "ruinsZone", start: 0, name: "방사능 유적", level: "13–15" }],
  abyss: [{ id: "abyssZone", start: 0, name: "심층 에너지 지대", level: "15" }],
  crash: [{ id: "landing", start: 0, name: "불시착 지점", level: "1–3" }],
  forest: [
    { id: "forestOuter", start: 0, name: "발광 숲 · 외곽", level: "3–6" },
    { id: "forestDeep", start: 1800, name: "발광 숲 · 심층", level: "6–9" },
  ],
  valley: [
    { id: "valleyOuter", start: 0, name: "수정 계곡 · 외곽", level: "8–12" },
    {
      id: "ancientRuins",
      start: 2600,
      name: "수정 계곡 · 고대 유적",
      level: "12–15",
    },
  ],
};
