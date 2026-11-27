import type { Region, EnemyData, ItemId } from "../data/content";
import { extremePlanets, type ExtremeRegion } from "./catalog";
export type ExtremeEnemy =
  | "glowJelly"
  | "coralHunter"
  | "hydroManta"
  | "abyssShark"
  | "crystalOctopus"
  | "deepWraith"
  | "pressureCrab"
  | "atlantisGuardian"
  | "emperor"
  | "voidWisp"
  | "meteorCrawler"
  | "gravityHunter"
  | "cosmicManta"
  | "phasePhantom"
  | "lunarGolem"
  | "quantumDrone"
  | "nexusGuardian"
  | "archon"
  | "magmaSlime"
  | "obsidianCrawler"
  | "lavaSerpent"
  | "ashPhantom"
  | "infernalBeast"
  | "thermalGolem"
  | "heliosDrone"
  | "reactorGuardian"
  | "helios"
  | "frostSlime"
  | "iceCrawler"
  | "glacialWolf"
  | "auroraWisp"
  | "frozenGolem"
  | "cryoSentinel"
  | "leviathan";
const enemy = (
  name: string,
  hp: number,
  damage: number,
  speed: number,
  drop: ItemId,
  w = 75,
  h = 65,
  flying = false,
): EnemyData => ({
  name,
  hp,
  damage,
  speed,
  drop,
  w,
  h,
  flying,
  xp: hp * 0.35,
  color: "#aaddeb",
  range: 520,
  resists: { cryo: 0.55, plasma: 1.3 },
});
export const extremeEnemies: Record<ExtremeEnemy, EnemyData> = {
  glowJelly: {
    ...enemy("GLOW JELLY", 2800, 55, 65, "luminousCoral", 70, 90, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  coralHunter: {
    ...enemy("CORAL HUNTER", 3200, 60, 130, "aquaFiber", 110, 70, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  hydroManta: {
    ...enemy("HYDRO MANTA", 3000, 65, 150, "seaTitanium", 150, 50, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  abyssShark: {
    ...enemy("ABYSS SHARK", 4200, 75, 210, "deepEnzyme", 160, 75, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  crystalOctopus: {
    ...enemy("CRYSTAL OCTOPUS", 3800, 60, 80, "alienPearl", 110, 120, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  deepWraith: {
    ...enemy("DEEP WRAITH", 3000, 65, 100, "deepCrystal", 70, 100, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  pressureCrab: {
    ...enemy("PRESSURE CRAB", 5200, 75, 50, "pressureCrystal", 130, 100, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  atlantisGuardian: {
    ...enemy("ATLANTIS GUARDIAN", 4800, 75, 90, "marineAlloy", 120, 160, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  emperor: {
    ...enemy("ABYSSAL EMPEROR", 36000, 85, 70, "abyssalCore", 310, 240, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  voidWisp: {
    ...enemy("VOID WISP", 4000, 70, 100, "moonCrystal", 70, 80, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  meteorCrawler: {
    ...enemy("METEOR CRAWLER", 5000, 80, 80, "meteorAlloy", 100, 70, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  gravityHunter: {
    ...enemy("GRAVITY HUNTER", 5000, 80, 160, "gravityCrystal", 110, 100, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  cosmicManta: {
    ...enemy("COSMIC MANTA", 4600, 75, 140, "helium", 150, 60, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  phasePhantom: {
    ...enemy("PHASE PHANTOM", 4200, 80, 100, "voidCore", 80, 110, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  lunarGolem: {
    ...enemy("LUNAR GOLEM", 6500, 90, 45, "denseCosmicOre", 150, 170, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  quantumDrone: {
    ...enemy("QUANTUM DRONE", 4500, 80, 120, "quantumCircuit", 100, 90, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  nexusGuardian: {
    ...enemy("NEXUS GUARDIAN", 6000, 90, 70, "gravityPart", 140, 180, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  archon: {
    ...enemy("VOID ARCHON", 48000, 95, 80, "voidArchonCore", 240, 260, true),
    resists: { electric: 1.25, cryo: 1, plasma: 1 },
  },
  magmaSlime: {
    ...enemy("MAGMA SLIME", 1700, 45, 80, "volcanicTissue"),
    resists: { cryo: 1.6, plasma: 0.5 },
  },
  obsidianCrawler: {
    ...enemy("OBSIDIAN CRAWLER", 2200, 50, 75, "obsidian"),
    defense: 35,
    resists: { cryo: 1.3 },
  },
  lavaSerpent: enemy("LAVA SERPENT", 2100, 50, 90, "magmaCore", 120, 65),
  ashPhantom: enemy("ASH PHANTOM", 1800, 46, 100, "ceramicOre", 75, 100, true),
  infernalBeast: enemy("INFERNAL BEAST", 2500, 56, 150, "iridium", 130, 90),
  thermalGolem: {
    ...enemy("THERMAL GOLEM", 3600, 65, 30, "tungsten", 160, 160),
    resists: { cryo: 1.7, plasma: 0.6 },
  },
  heliosDrone: enemy(
    "HELIOS DRONE",
    1900,
    48,
    70,
    "reactorCircuit",
    90,
    90,
    true,
  ),
  reactorGuardian: enemy(
    "REACTOR GUARDIAN",
    3200,
    60,
    35,
    "heliosAlloy",
    125,
    150,
  ),
  helios: {
    ...enemy("HELIOS DESTROYER", 26000, 65, 40, "heliosCore", 260, 260),
    resists: { cryo: 1.4, plasma: 0.7 },
  },
  frostSlime: enemy("FROST SLIME", 950, 35, 70, "iceTissue"),
  iceCrawler: enemy("ICE CRAWLER", 1000, 38, 150, "cryoOre"),
  glacialWolf: enemy("GLACIAL WOLF", 1400, 40, 180, "pureMetal", 110, 70),
  auroraWisp: enemy("AURORA WISP", 900, 34, 80, "blueCrystal", 65, 80, true),
  frozenGolem: {
    ...enemy("FROZEN GOLEM", 2200, 50, 40, "superconductor", 140, 140),
    defense: 25,
  },
  cryoSentinel: enemy("CRYO SENTINEL", 1800, 45, 50, "coolantCore", 90, 125),
  leviathan: enemy("GLACIAL LEVIATHAN", 18000, 55, 65, "glacialCore", 330, 170),
};
export const extremeRegions = {} as Record<ExtremeRegion, Region>;
export const extremeRegionIds: ExtremeRegion[] = [];
const suffix = ["Landing", "Wilds", "Depths", "Ruins"] as const;
const drops: ItemId[] = [
  "glacierCrystal",
  "cryoOre",
  "blueCrystal",
  "coolantCore",
  "pureMetal",
  "iceTissue",
  "superconductor",
  "ancientResearch",
];
for (let i = 0; i < 4; i++) {
  const id = ("frostia" + suffix[i]) as ExtremeRegion,
    p = extremePlanets.frostia,
    width = i === 0 ? 10000 : i === 3 ? 5000 : 4000;
  const r: Region = {
    id,
    name: p.names[i],
    en: p.en[i],
    subtitle: [
      "오로라 아래 새로운 개척지",
      "빙판에서는 천천히 방향을 전환하세요",
      "발열 코어를 준비하고 깊은 얼음으로",
      "잊힌 연구 기록이 다음 행성을 가리킵니다",
    ][i],
    width,
    spawn: 300,
    palette: [...p.sky],
    platforms: [{ x: 0, y: 780, w: width, h: 300 }],
    resources: [],
    landmarks: [],
    enemies: [],
  };
  for (let n = 0; n < 8; n++)
    r.resources.push({
      id: id + "-node-" + n,
      item: drops[(n + i * 2) % drops.length],
      x: 700 + n * 300,
      y: 780,
      count: 3,
      respawn: 40,
      tier: 2,
      seconds: 2,
    });
  if (i > 0) {
    r.landmarks.push({
      id: id + "-back",
      kind: "portal",
      target: ("frostia" + suffix[i - 1]) as ExtremeRegion,
      x: 180,
      y: 780,
      label: "이전 구역 이동",
    });
    for (let n = 0; n < 6; n++) {
      r.platforms.push({
        x: 700 + n * 450,
        y: 650 - (n % 2) * 75,
        w: 240,
        h: 30,
        oneWay: true,
      });
      r.enemies.push({
        kind: (
          [
            "frostSlime",
            "iceCrawler",
            "glacialWolf",
            "auroraWisp",
            "frozenGolem",
            "cryoSentinel",
          ] as ExtremeEnemy[]
        )[n % 6],
        x: 1000 + n * 450,
        y: 780,
      });
    }
  }
  if (i < 3)
    r.landmarks.push({
      id: id + "-next",
      kind: "portal",
      target: ("frostia" + suffix[i + 1]) as ExtremeRegion,
      x: i === 0 ? 2900 : 3700,
      y: 780,
      label: p.names[i + 1] + " 이동",
    });
  if (i === 0) {
    r.landmarks.push({
      id: "frostia-ship",
      kind: "ship",
      x: 360,
      y: 780,
      label: "우주선 탑승",
    });
    for (const [f, x] of [
      ["terminal", 600],
      ["workbench", 850],
      ["warehouse", 1100],
    ] as const)
      r.landmarks.push({
        id: "frostia-" + f,
        kind: "facility",
        facility: f,
        x,
        y: 780,
        label: "보온 캠프 " + f,
      });
  }
  if (i === 3)
    r.landmarks.push(
      {
        id: "archive-frostia",
        kind: "ruin",
        x: 3200,
        y: 780,
        label: "고대 연구 자료 · GENESIS 문양",
      },
      {
        id: "boss-leviathan",
        kind: "ruin",
        x: 3850,
        y: 780,
        label: "GLACIAL LEVIATHAN 호출",
      },
      {
        id: "shelter-frostia",
        kind: "heal",
        x: 4150,
        y: 780,
        label: "발열 장치 · F 체온/산소 회복",
      },
    );
  extremeRegions[id] = r;
  extremeRegionIds.push(id);
}
export const extremeDeposits = (planet: string) =>
  (planet === "aquaria"
    ? [
        "luminousCoral",
        "deepCrystal",
        "pressureOre",
        "seaTitanium",
        "aquaFiber",
        "pressureCrystal",
      ]
    : planet === "lunaris"
      ? [
          "moonCrystal",
          "cosmicMetal",
          "helium",
          "gravityCrystal",
          "denseCosmicOre",
          "navCrystal",
        ]
      : planet === "inferno"
        ? [
            "obsidian",
            "iridium",
            "geothermalCrystal",
            "tungsten",
            "ceramicOre",
            "denseThermal",
          ]
        : [
            "glacierCrystal",
            "cryoOre",
            "pureMetal",
            "blueCrystal",
            "superconductor",
            "coolantCore",
          ]
  ).map((item, i) => ({
    id: planet + "-" + item,
    name: item,
    x: 3600 + i * 800,
    item: item as ItemId,
    seconds: 12 + i * 2,
  }));

const infernoDrops: ItemId[] = [
  "obsidian",
  "iridium",
  "tungsten",
  "geothermalCrystal",
  "denseThermal",
  "ceramicOre",
  "reactorCircuit",
  "heliosAlloy",
];
for (let i = 0; i < 4; i++) {
  const id = ("inferno" + suffix[i]) as ExtremeRegion,
    p = extremePlanets.inferno,
    width = i === 0 ? 10000 : i === 3 ? 5000 : 4000;
  const r: Region = {
    id,
    name: p.names[i],
    en: p.en[i],
    subtitle: [
      "냉각 캠프에서 새로운 중력에 적응하세요",
      "용암 위 바위와 분출 주기를 관찰하세요",
      "깊어지는 열기 · 냉각 코어 권장",
      "폭주한 발전 장치 · 냉각 시설을 사용하세요",
    ][i],
    width,
    spawn: 300,
    palette: [...p.sky],
    platforms: [{ x: 0, y: 780, w: width, h: 300 }],
    resources: [],
    landmarks: [],
    enemies: [],
  };
  for (let n = 0; n < 8; n++)
    r.resources.push({
      id: id + "-node-" + n,
      item: infernoDrops[(n + i) % infernoDrops.length],
      x: 700 + n * 300,
      y: 780,
      count: 3,
      respawn: 40,
      tier: 2,
      seconds: 2,
    });
  if (i > 0) {
    r.landmarks.push({
      id: id + "-back",
      kind: "portal",
      target: ("inferno" + suffix[i - 1]) as ExtremeRegion,
      x: 180,
      y: 780,
      label: "이전 구역 이동",
    });
    for (let n = 0; n < 8; n++)
      r.enemies.push({
        kind: (
          [
            "magmaSlime",
            "obsidianCrawler",
            "lavaSerpent",
            "ashPhantom",
            "infernalBeast",
            "thermalGolem",
            "heliosDrone",
            "reactorGuardian",
          ] as ExtremeEnemy[]
        )[n],
        x: 850 + n * 330,
        y: 780,
      });
    r.platforms.push(
      { x: 1060, y: 700, w: 240, h: 25, oneWay: true },
      { x: 1390, y: 660, w: 200, h: 25, oneWay: true },
      { x: 2320, y: 700, w: 260, h: 25, oneWay: true },
      { x: 2680, y: 650, w: 220, h: 25, oneWay: true },
    );
  }
  if (i < 3)
    r.landmarks.push({
      id: id + "-next",
      kind: "portal",
      target: ("inferno" + suffix[i + 1]) as ExtremeRegion,
      x: i === 0 ? 2900 : 3700,
      y: 780,
      label: p.names[i + 1] + " 이동",
    });
  if (i === 0) {
    r.landmarks.push({
      id: "inferno-ship",
      kind: "ship",
      x: 360,
      y: 780,
      label: "우주선 탑승",
    });
    for (const [f, x] of [
      ["terminal", 600],
      ["workbench", 850],
      ["warehouse", 1100],
    ] as const)
      r.landmarks.push({
        id: "inferno-" + f,
        kind: "facility",
        facility: f,
        x,
        y: 780,
        label: "냉각 캠프 " + f,
      });
  }
  if (i === 3)
    r.landmarks.push(
      {
        id: "archive-inferno",
        kind: "ruin",
        x: 3200,
        y: 780,
        label: "고대 발전 기록 · GENESIS 문양",
      },
      {
        id: "boss-helios",
        kind: "ruin",
        x: 3850,
        y: 780,
        label: "HELIOS DESTROYER 호출",
      },
      {
        id: "cooling-helios",
        kind: "heal",
        x: 4150,
        y: 780,
        label: "냉각 제어 장치 · F 과열 억제",
      },
      {
        id: "shelter-inferno",
        kind: "heal",
        x: 4780,
        y: 780,
        label: "냉각 보호 구역",
      },
    );
  extremeRegions[id] = r;
  extremeRegionIds.push(id);
}

for (const id of [
  "magmaSlime",
  "obsidianCrawler",
  "lavaSerpent",
  "ashPhantom",
  "infernalBeast",
  "heliosDrone",
  "reactorGuardian",
] as ExtremeEnemy[])
  extremeEnemies[id].resists = { cryo: 1.4, plasma: 0.65 };

export const aquaticEnemies = [
  "glowJelly",
  "coralHunter",
  "hydroManta",
  "abyssShark",
  "crystalOctopus",
  "deepWraith",
  "pressureCrab",
  "atlantisGuardian",
] as ExtremeEnemy[];
export const lunarEnemies = [
  "voidWisp",
  "meteorCrawler",
  "gravityHunter",
  "cosmicManta",
  "phasePhantom",
  "lunarGolem",
  "quantumDrone",
  "nexusGuardian",
] as ExtremeEnemy[];

for (const planet of ["aquaria", "lunaris"] as const)
  for (let i = 0; i < 4; i++) {
    const id = (planet + suffix[i]) as ExtremeRegion,
      p = extremePlanets[planet],
      water = planet === "aquaria",
      width = i === 0 ? 10000 : i === 3 ? 5000 : 4000;
    const r: Region = {
      id,
      name: p.names[i],
      en: p.en[i],
      subtitle: water
        ? "W/S 수영 · SPACE 상승 추진 · SHIFT 회피 · 심해에서는 수압을 확인하세요"
        : "SPACE 제트팩 · S 하강 · X 자세 제동 · 착지하면 추진 에너지 회복",
      width,
      spawn: 300,
      palette: [...p.sky],
      platforms: water
        ? [
            { x: 0, y: 780, w: 650, h: 200 },
            { x: 0, y: 2600, w: width, h: 300 },
            ...(i === 0 ? [{ x: 3360, y: 780, w: 6640, h: 400 }] : []),
          ]
        : [{ x: 0, y: 780, w: width, h: 300 }],
      resources: [],
      landmarks: [],
      enemies: [],
    };
    const drops: ItemId[] = water
      ? [
          "luminousCoral",
          "deepCrystal",
          "pressureOre",
          "seaTitanium",
          "alienPearl",
          "aquaFiber",
          "deepEnzyme",
          "pressureCrystal",
          "marineAlloy",
          "seaCore",
        ]
      : [
          "moonCrystal",
          "cosmicMetal",
          "helium",
          "gravityCrystal",
          "meteorAlloy",
          "denseCosmicOre",
          "quantumCircuit",
          "gravityPart",
          "navCrystal",
          "voidCore",
        ];
    for (let n = 0; n < 10; n++)
      r.resources.push({
        id: id + "-node-" + n,
        item: drops[(n + i) % 10],
        x: 750 + n * 235,
        y: water ? 850 + (n % 4) * 430 : 780 - (n % 3) * 150,
        count: 3,
        respawn: 40,
        tier: 2,
        seconds: 2,
      });
    if (i > 0) {
      r.landmarks.push({
        id: id + "-back",
        kind: "portal",
        target: (planet + suffix[i - 1]) as ExtremeRegion,
        x: 180,
        y: 780,
        label: "이전 구역 이동",
      });
      for (let n = 0; n < 8; n++)
        r.enemies.push({
          kind: (water ? aquaticEnemies : lunarEnemies)[n],
          x: 850 + n * 330,
          y: water ? 1000 + (n % 4) * 360 : 600 - (n % 3) * 110,
        });
    }
    if (!water)
      for (let n = 0; n < 8; n++)
        r.platforms.push({
          x: 700 + n * 360,
          y: 630 - (n % 3) * 150,
          w: 220,
          h: 25,
          oneWay: true,
        });
    if (i < 3)
      r.landmarks.push({
        id: id + "-next",
        kind: "portal",
        target: (planet + suffix[i + 1]) as ExtremeRegion,
        x: i === 0 ? 2900 : 3700,
        y: 780,
        label: p.names[i + 1] + " 이동",
      });
    if (i === 0) {
      r.landmarks.push({
        id: planet + "-ship",
        kind: "ship",
        x: 360,
        y: 780,
        label: "우주선 탑승",
      });
      for (const [f, x] of [
        ["terminal", 600],
        ["workbench", 850],
        ["warehouse", 1100],
      ] as const)
        r.landmarks.push({
          id: planet + "-" + f,
          kind: "facility",
          facility: f,
          x,
          y: 780,
          label: "탐험 캠프 " + f,
        });
    }
    for (let n = 0; n < 3; n++)
      r.landmarks.push({
        id: "shelter-" + id + n,
        kind: "heal",
        x: 1500 + n * 1200,
        y: water ? 1250 + (n % 2) * 800 : 780,
        label: water ? "산소 안전 포켓 · F 회복" : "추진 충전 장치 · F 회복",
      });
    if (i === 3) {
      const y = water ? 2100 : 780;
      r.landmarks.push(
        {
          id: "archive-" + planet,
          kind: "ruin",
          x: 3200,
          y,
          label: "GENESIS · " + p.archive,
        },
        {
          id: "boss-" + p.boss,
          kind: "ruin",
          x: 3850,
          y,
          label: p.boss.toUpperCase() + " 호출",
        },
        {
          id: "shelter-" + planet + "-boss",
          kind: "heal",
          x: 4150,
          y,
          label: "비상 생명 유지 장치 · F 회복",
        },
      );
      if (!water)
        for (let n = 0; n < 3; n++)
          r.landmarks.push({
            id: "gravity-switch-" + n,
            kind: "ruin",
            x: 2600 + n * 350,
            y: 780,
            label: "중력 제어 스위치 " + (n + 1),
          });
    }
    extremeRegions[id] = r;
    extremeRegionIds.push(id);
  }
