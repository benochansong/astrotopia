import type { Element, Stats, WeaponId } from "../combat/types";

import type { GearTemplate } from "../data/battle";

export const classIds = [
  "guardian",
  "ranger",
  "engineer",
  "scientist",
  "explorer",
  "cyberBlade",
] as const;
export type ClassId = (typeof classIds)[number];
export type SkillEffect =
  | "strike"
  | "wave"
  | "burst"
  | "guard"
  | "counter"
  | "mark"
  | "drone"
  | "turret"
  | "repair"
  | "trap"
  | "well"
  | "shift"
  | "analysis"
  | "dash"
  | "jet"
  | "scan"
  | "aerial"
  | "heal"
  | "adapt"
  | "buff"
  | "mech"
  | "swarm";
export interface ClassDefinition {
  name: string;
  icon: string;
  color: string;
  mentor: string;
  motto: string;
  description: string;
  difficulty: string;
  weapons: WeaponId[];
  stats: Partial<Stats>;
  gauge: string;
  set: string;
  paths: string[];
}
export const classes: Record<ClassId, ClassDefinition> = {
  guardian: {
    name: "GUARDIAN",
    icon: "⬡",
    color: "#8ec9ff",
    mentor: "COMMANDER REX",
    motto: "문명을 지키는 힘은 버티는 데서 시작한다.",
    description: "방어와 반격 · 높은 체력, 넉백 저항 · 중화기 숙련",
    difficulty: "쉬움",
    weapons: ["hammer", "cannon"],
    stats: { hp: 0.2, defense: 0.2, moveSpeed: -0.05 },
    gauge: "FORTITUDE",
    set: "TITAN ARMOR",
    paths: ["sentinel", "destroyer"],
  },
  ranger: {
    name: "RANGER",
    icon: "⌖",
    color: "#92e3b8",
    mentor: "CAPTAIN VERA",
    motto: "한 번의 정확한 사격이 원정대를 구한다.",
    description: "표적 지정과 정밀 사격 · 치명타, 탄도 숙련",
    difficulty: "보통",
    weapons: ["pulse", "rifle", "cannon"],
    stats: { crit: 0.06, attack: 0.08 },
    gauge: "FOCUS",
    set: "STAR HUNTER SUIT",
    paths: ["sharpshooter", "gunner"],
  },
  engineer: {
    name: "ENGINEER",
    icon: "⚙",
    color: "#ffc981",
    mentor: "ENGINEER AXEL",
    motto: "우리가 만든 기계가 내일의 도시를 세운다.",
    description: "드론·포탑·함정 · 생산 및 건설 최대 15% 보조",
    difficulty: "보통",
    weapons: ["rifle", "pulse"],
    stats: { energy: 0.15, defense: 0.1 },
    gauge: "TECH CHARGE",
    set: "MECHANIC EXOSUIT",
    paths: ["mechanic", "robotics"],
  },
  scientist: {
    name: "SCIENTIST",
    icon: "◈",
    color: "#c6a4ff",
    mentor: "DR. LYRA",
    motto: "미지의 신호는 두려움이 아니라 질문이다.",
    description: "속성 전환·중력 제어 · 에너지 효율과 연구 보조",
    difficulty: "어려움",
    weapons: ["cannon", "cryo", "hammer"],
    stats: { energy: 0.25, regen: 0.1, elementResist: 0.05 },
    gauge: "ANOMALY",
    set: "QUANTUM LAB SUIT",
    paths: ["physicist", "biotech"],
  },
  explorer: {
    name: "EXPLORER",
    icon: "◇",
    color: "#85e9ee",
    mentor: "SCOUT ORION",
    motto: "아직 지도가 없는 곳에 우리의 길이 있다.",
    description: "고속 기동·탐사 · 환경 노출 및 채굴 시간 감소",
    difficulty: "보통",
    weapons: ["pulse", "blade", "rifle"],
    stats: { moveSpeed: 0.12, statusResist: 0.05 },
    gauge: "MOMENTUM",
    set: "HORIZON SUIT",
    paths: ["pathfinder", "prospector"],
  },
  cyberBlade: {
    name: "CYBER BLADE",
    icon: "✧",
    color: "#ff96ce",
    mentor: "BLADE MASTER KAI",
    motto: "한계를 넘어서는 순간에도 다음 발걸음을 기억하라.",
    description: "참격·공중 연계·반격 · 검 공격 속도와 콤보",
    difficulty: "어려움",
    weapons: ["blade"],
    stats: { attackSpeed: 0.12, moveSpeed: 0.06 },
    gauge: "BLADE RESONANCE",
    set: "NOVA COMBAT SUIT",
    paths: ["duelist", "berserker"],
  },
};
export interface PathDefinition {
  classId: ClassId;
  name: string;
  final: string;
  ultimate: string;
  effect: SkillEffect;
  description: string;
}
export const paths: Record<string, PathDefinition> = {
  sentinel: {
    classId: "guardian",
    name: "SENTINEL",
    final: "AEGIS COMMANDER",
    ultimate: "AEGIS FORTRESS",
    effect: "guard",
    description: "피해 흡수와 보호 영역",
  },
  destroyer: {
    classId: "guardian",
    name: "DESTROYER",
    final: "TITAN VANGUARD",
    ultimate: "TITAN BREAKER",
    effect: "burst",
    description: "방어 파괴와 중화기 충격파",
  },
  sharpshooter: {
    classId: "ranger",
    name: "SHARPSHOOTER",
    final: "STAR SNIPER",
    ultimate: "CELESTIAL STRIKE",
    effect: "wave",
    description: "약점과 단일 대상 관통 사격",
  },
  gunner: {
    classId: "ranger",
    name: "GUNNER",
    final: "PLASMA REAPER",
    ultimate: "PLASMA TEMPEST",
    effect: "burst",
    description: "이동 사격과 다중 탄막",
  },
  mechanic: {
    classId: "engineer",
    name: "MECHANIC",
    final: "MECH ARCHITECT",
    ultimate: "TITAN MECH",
    effect: "mech",
    description: "고출력 포탑과 전투 외골격",
  },
  robotics: {
    classId: "engineer",
    name: "ROBOTICS SPECIALIST",
    final: "DRONE COMMANDER",
    ultimate: "MECHANICAL LEGION",
    effect: "swarm",
    description: "최대 네 기의 드론 지원",
  },
  physicist: {
    classId: "scientist",
    name: "PHYSICIST",
    final: "QUANTUM MASTER",
    ultimate: "QUANTUM COLLAPSE",
    effect: "well",
    description: "중력 제어와 입자 광선",
  },
  biotech: {
    classId: "scientist",
    name: "BIOTECHNOLOGIST",
    final: "GENESIS ALCHEMIST",
    ultimate: "GENESIS BLOOM",
    effect: "heal",
    description: "생체 회복과 독성 반응",
  },
  pathfinder: {
    classId: "explorer",
    name: "PATHFINDER",
    final: "GALACTIC VOYAGER",
    ultimate: "HORIZON BREAKER",
    effect: "jet",
    description: "제트 추진과 공중 회피",
  },
  prospector: {
    classId: "explorer",
    name: "PROSPECTOR",
    final: "COSMIC SEEKER",
    ultimate: "COSMIC DISCOVERY",
    effect: "scan",
    description: "광맥 탐지와 고대 에너지 활용",
  },
  duelist: {
    classId: "cyberBlade",
    name: "DUELIST",
    final: "PHANTOM BLADE",
    ultimate: "PHANTOM ECLIPSE",
    effect: "strike",
    description: "정밀 반격과 연속 잔상 참격",
  },
  berserker: {
    classId: "cyberBlade",
    name: "BERSERKER",
    final: "NOVA SLAYER",
    ultimate: "SUPERNOVA BLADE",
    effect: "burst",
    description: "넓은 참격과 위험을 감수하는 과출력",
  },
};
export interface ClassSkill {
  id: string;
  name: string;
  description: string;
  classId: ClassId;
  path?: string;
  tier: number;
  level: number;
  max: number;
  branch: "combat" | "mastery" | "pioneer";
  prerequisite?: string;
  effect: SkillEffect;
  energy: number;
  gauge: number;
  cooldown: number;
  power: number;
  range: number;
  duration: number;
  element: Element;
  passive?: boolean;
  ultimate?: boolean;
}
export const classSkills: Record<string, ClassSkill> = {};
type Row = [string, SkillEffect, string, number?, number?, Element?];
const basic: Record<ClassId, Row[]> = {
  guardian: [
    ["SHIELD BASH", "strike", "전방 강타와 짧은 기절", 2, 150, "physical"],
    [
      "GRAVITY SMASH",
      "burst",
      "공중·수중에서도 원형 중력 충격파",
      2.8,
      220,
      "gravity",
    ],
    ["FORTRESS MODE", "guard", "6초간 피해 45% 감소 · 이동 25% 감소", 0],
    ["COUNTER IMPACT", "counter", "1초 내 피격 시 피해 감소와 반격", 3.6],
  ],
  ranger: [
    ["PRECISION SHOT", "wave", "치명타 보정 관통 사격", 3, 900],
    ["RAPID BURST", "wave", "전방 3연속 사격", 1.3, 650],
    [
      "EVASIVE FIRE",
      "dash",
      "후방 회피와 정면 사격 · 대시와 대기시간 공유",
      2,
      500,
    ],
    [
      "TARGET MARK",
      "mark",
      "가장 가까운 적 표식 · 8초간 피해 15% 증가",
      0.5,
      750,
    ],
  ],
  engineer: [
    [
      "COMBAT DRONE",
      "drone",
      "플레이어를 따르는 12초 전투 드론",
      0.65,
      650,
      "electric",
    ],
    ["PORTABLE TURRET", "turret", "설치 위치에서 12초간 조준 사격", 0.9, 700],
    ["REPAIR FIELD", "repair", "드론·시설 수리와 본인 체력 8% 회복", 0, 260],
    [
      "ELECTRIC TRAP",
      "trap",
      "적 접근 시 감전 · 보스 제어 저항 적용",
      2,
      200,
      "electric",
    ],
  ],
  scientist: [
    ["ENERGY ORB", "wave", "느린 관통 에너지 구체", 2.6, 650],
    [
      "GRAVITY WELL",
      "well",
      "3초간 일반 적을 끌어당긴 뒤 폭발",
      2.8,
      280,
      "gravity",
    ],
    ["ELEMENTAL SHIFT", "shift", "12초 동안 냉기→전기→독성 순환", 0],
    [
      "ANALYSIS FIELD",
      "analysis",
      "주변 적 저항 분석과 10% 추가 피해",
      0.6,
      420,
    ],
  ],
  explorer: [
    [
      "HYPER DASH",
      "dash",
      "충돌을 유지하는 고속 대시 · 공통 회피와 대기시간 공유",
      1.6,
      160,
    ],
    ["JET BOOST", "jet", "4초 기동 강화 · 공중·수중 수직 추진", 1.2, 180],
    ["SCAN PULSE", "scan", "주변 광맥과 위험 탐지 · 10초 채굴 보조", 1.5, 400],
    ["PIONEER STRIKE", "strike", "이동 중 위력 증가하는 에너지 공격", 2.7, 230],
  ],
  cyberBlade: [
    ["CYBER SLASH", "strike", "전방 에너지 연속 참격", 2.4, 175],
    ["FLASH STEP", "dash", "충돌을 유지하는 대시 참격", 2, 190],
    ["AERIAL BLADE", "aerial", "공중·수중에서 2회 참격", 2.2, 210],
    ["BLADE COUNTER", "counter", "0.8초 반격 창 · 성공하면 공명 충전", 4, 220],
  ],
};
const advanced: Record<string, Row[]> = {
  sentinel: [
    ["AEGIS FIELD", "guard", "영역 보호막과 피해 감소", 0, 350],
    ["GUARDIAN LINK", "repair", "자신과 주변 시설을 수리하고 보호", 0, 420],
    ["ABSOLUTE DEFENSE", "guard", "짧은 절대 방어 태세 · 무적 아님", 0],
  ],
  destroyer: [
    ["TITAN CRUSH", "strike", "전방 방어 파괴 강타", 4, 260, "gravity"],
    ["SHOCKWAVE STORM", "burst", "중력 3연속 충격파", 1.5, 360, "gravity"],
    ["OVERDRIVE CANNON", "buff", "8초 공격력·에너지 출력 강화", 0],
  ],
  sharpshooter: [
    ["STAR PIERCER", "wave", "고출력 장거리 관통 사격", 4.2, 1100],
    ["PERFECT FOCUS", "buff", "8초 치명타 확률과 피해 강화", 0],
    ["WEAK POINT EXPLOIT", "mark", "약점을 분석해 표식 부여", 1, 950],
  ],
  gunner: [
    ["PLASMA RAIN", "wave", "전방 5연속 사격", 1, 800],
    ["MOBILE ASSAULT", "buff", "이동 사격 속도 강화", 0],
    ["OVERHEAT BURST", "burst", "과열 플라즈마 방출", 4, 350],
  ],
  mechanic: [
    ["MECH ARMOR", "mech", "8초 외골격 · 방어 강화 및 주무기 출력 증가", 0],
    ["HEAVY TURRET", "turret", "강화된 고출력 포탑", 1.5, 850],
    ["MACHINE OVERDRIVE", "buff", "기계 공격 및 본체 출력 강화", 0],
  ],
  robotics: [
    ["ASSAULT SWARM", "swarm", "전투 드론 3기 · 전체 상한 4기", 0.55, 700],
    ["SUPPORT DRONE", "repair", "드론 내구도 회복 및 본인 보호막", 0],
    ["DRONE FORMATION", "buff", "8초 드론과 본체 공격 강화", 0],
  ],
  physicist: [
    ["QUANTUM SHIFT", "dash", "충돌 안전 위상 대시", 1.5, 220],
    ["SINGULARITY", "well", "대형 중력 특이점", 4, 340, "gravity"],
    ["PARTICLE BEAM", "wave", "관통 입자 광선", 4, 1000, "electric"],
  ],
  biotech: [
    ["BIO REGENERATION", "heal", "체력 16% 회복 · 재사용 24초", 0],
    ["GENETIC TOXIN", "burst", "독성 에너지 파동", 2.8, 340, "toxic"],
    ["ADAPTIVE FIELD", "adapt", "12초 환경 노출 30% 감소", 0],
  ],
  pathfinder: [
    ["PHASE DASH", "dash", "기동 강화 대시", 2.8, 220],
    ["AERIAL MASTERY", "jet", "6초 공중·수중 추진 강화", 1.8],
    ["EMERGENCY MANEUVER", "counter", "짧은 반격 창과 보호", 2.4],
  ],
  prospector: [
    ["DEEP SCAN", "scan", "심층 광맥 탐지와 광역 에너지", 2.5, 600],
    ["EXTRACTION BOOST", "adapt", "채굴 시간 15% 감소 · 환경 적응", 0],
    ["RELIC RESONANCE", "well", "고대 에너지 공명 폭발", 3.5, 320, "gravity"],
  ],
  duelist: [
    ["PHANTOM STEP", "dash", "잔상 대시 참격", 3, 210],
    ["MIRAGE SLASH", "strike", "3연속 잔상 공격", 1.6, 240],
    ["PERFECT COUNTER", "counter", "정밀 타이밍 반격", 5, 260],
  ],
  berserker: [
    ["NOVA CLEAVE", "strike", "넓은 에너지 참격", 4, 330],
    ["OVERDRIVE BLADE", "buff", "공격력 25% 증가 · 받는 피해 15% 증가", 0],
    ["STARFALL SLASH", "aerial", "수중 충격파 또는 낙하 참격", 4.5, 300],
  ],
};
function addRows(cid: ClassId, rows: Row[], path?: string) {
  rows.forEach(
    (
      [name, effect, description, power = 0, range = 200, element = "plasma"],
      i,
    ) => {
      const id = path ? `${path}_${i}` : `${cid}_${i}`;
      classSkills[id] = {
        id,
        name,
        effect,
        description,
        classId: cid,
        path,
        tier: path ? 2 : 1,
        level: path ? 30 : 10,
        max: 5,
        branch: i === 2 ? "mastery" : i === 3 ? "pioneer" : "combat",
        prerequisite: path ? `${cid}_0` : i ? `${cid}_0` : undefined,
        energy: effect === "heal" ? 35 : 18 + i * 3,
        gauge: path ? 15 : 0,
        cooldown:
          effect === "heal"
            ? 24
            : effect === "drone" || effect === "turret" || effect === "swarm"
              ? 18
              : 6 + i * 2,
        power,
        range,
        duration: path ? 8 : 6,
        element,
      };
    },
  );
}
for (const cid of classIds) {
  addRows(cid, basic[cid]);
  for (const [i, name, branch] of [
    [0, "COMBAT / 전투 훈련", "combat"],
    [1, "MASTER / 고유 능력", "mastery"],
    [2, "PIONEER / 개척 기술", "pioneer"],
  ] as const) {
    const id = `${cid}_passive${i}`;
    classSkills[id] = {
      id,
      name,
      description:
        i === 0
          ? "단계당 공격 2%"
          : i === 1
            ? "단계당 게이지 획득 3% / 재사용 1% 감소"
            : "직업 개척 보너스 단계당 1%, 전체 최대 15%",
      classId: cid,
      tier: 1,
      level: 10,
      max: i === 1 ? 10 : 5,
      branch,
      prerequisite: `${cid}_0`,
      effect: "buff",
      energy: 0,
      gauge: 0,
      cooldown: 0,
      power: 0,
      range: 0,
      duration: 0,
      element: "physical",
      passive: true,
    };
  }
}
for (const [id, path] of Object.entries(paths)) {
  addRows(path.classId, advanced[id], id);
  const key = `${id}_ultimate`;
  classSkills[key] = {
    id: key,
    name: path.ultimate,
    description: `${path.description} · EP 35 / 게이지 100 / 재사용 100초`,
    classId: path.classId,
    path: id,
    tier: 3,
    level: 60,
    max: 5,
    branch: "mastery",
    prerequisite: `${id}_0`,
    effect: path.effect,
    energy: 35,
    gauge: 100,
    cooldown: 100,
    power: 8,
    range: 520,
    duration: 10,
    element: path.classId === "scientist" ? "gravity" : "plasma",
    ultimate: true,
  };
}
export const classGear: Record<string, GearTemplate> = Object.fromEntries(
  classIds.flatMap((cid) =>
    (["body", "core"] as const).map((slot) => [
      `class_${cid}_${slot}`,
      {
        name: `${classes[cid].set} ${slot === "body" ? "슈트" : "코어"}`,
        slot,
        icon: classes[cid].icon,
        stats:
          slot === "body"
            ? {
                hp: 35,
                ...(cid === "guardian"
                  ? { defense: 10 }
                  : cid === "explorer"
                    ? { moveSpeed: 12 }
                    : cid === "cyberBlade"
                      ? { attackSpeed: 0.04 }
                      : { energy: 12 }),
              }
            : {
                attack: 7,
                regen: 1,
                ...(cid === "ranger"
                  ? { crit: 0.02 }
                  : cid === "scientist"
                    ? { elementResist: 0.03 }
                    : { energy: 10 }),
              },
      },
    ]),
  ),
);
