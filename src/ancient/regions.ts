import type { EnemyData, Region } from "../data/content";
import { omegaRegionIds, type OmegaRegion, type AncientItem } from "./catalog";
export const ancientEnemyIds = [
  "ancientWatcher",
  "phaseStalker",
  "quantumWraith",
  "gravitySentinel",
  "nexusHunter",
  "aeternumGolem",
  "archiveDefender",
  "genesisEnforcer",
  "aeternumGuardian",
  "nexusOverlord",
  "genesisZero",
] as const;
export type AncientEnemy = (typeof ancientEnemyIds)[number];
export const ancientEnemies = Object.fromEntries(
  ancientEnemyIds.map((id, i) => [
    id,
    {
      name: id.replace(/([A-Z])/g, " $1").toUpperCase(),
      hp: i < 8 ? 4200 + i * 380 : [28000, 48000, 420000][i - 8],
      damage: i < 8 ? 85 + i * 3 : 120,
      speed: 60 + (i % 3) * 35,
      drop: i < 8 ? "rawAncientAlloy" : "genesisFragment",
      w: i < 8 ? 70 + (i % 3) * 20 : 220,
      h: i < 8 ? 80 + (i % 3) * 20 : 220,
      flying: [0, 2, 7, 9, 10].includes(i),
      xp: i < 8 ? 1800 : 12000,
      color: i % 2 ? "#c7aff2" : "#ead6a2",
      range: 650,
      defense: i === 5 ? 45 : 15,
      resists: {},
    },
  ]),
) as Record<AncientEnemy, EnemyData>;
const names = [
  "잊힌 착륙 항구",
  "침묵의 대도시",
  "중력 균열 지대",
  "영원의 기록 보관소",
  "연결의 요새",
  "GENESIS CORE",
  "붕괴된 기록 보관소",
  "중력 미궁",
  "넥서스 금고",
];
const en = [
  "FORGOTTEN LANDING PORT",
  "SILENT METROPOLIS",
  "GRAVITY FRACTURE",
  "ARCHIVE OF ETERNITY",
  "NEXUS CITADEL",
  "GENESIS CORE",
  "BROKEN ARCHIVE",
  "GRAVITY LABYRINTH",
  "NEXUS VAULT",
];
export const ancientRegions = {} as Record<OmegaRegion, Region>;
omegaRegionIds.forEach((id, i) => {
  const resources: AncientItem[] = [
    "rawAncientAlloy",
    "omegaCrystal",
    "phaseOre",
    "quantumMetal",
    "denseCrystal",
    "memoryData",
  ];
  ancientRegions[id] = {
    id,
    name: names[i],
    en: en[i],
    subtitle: "AETERNUM · 기억을 지키는 마지막 세계",
    width: 5200,
    spawn: 300,
    palette: ["#080d24", "#272145", "#625175"],
    platforms: [
      { x: 0, y: 780, w: 5200, h: 180 },
      ...Array.from({ length: 7 }, (_, n) => ({
        x: 800 + n * 530,
        y: 620 - (n % 3) * 130,
        w: 230,
        h: 22,
        oneWay: true,
      })),
    ],
    resources: resources.map((item, n) => ({
      id: `${id}-resource-${n}`,
      item,
      x: 800 + n * 450,
      y: 780,
      count: 3,
      respawn: 50,
      tier: 4,
      seconds: 3,
    })),
    enemies:
      i === 0
        ? []
        : Array.from({ length: 6 }, (_, n) => ({
            kind: ancientEnemyIds[(n + i) % 8],
            x: 1100 + n * 430,
            y: 780,
          })),
    landmarks: [
      {
        id: `${id}-camp`,
        label: "차폐 회복소 · 체크포인트",
        x: 350,
        y: 780,
        kind: "heal",
      },
      {
        id: `${id}-terminal`,
        label: "ECHO · 고대 기록",
        x: 550,
        y: 780,
        kind: "ruin",
      },
      ...(!i
        ? [
            {
              id: "omega-ship",
              label: "우주선 탑승",
              x: 150,
              y: 780,
              kind: "ship" as const,
            },
          ]
        : [
            {
              id: `${id}-back`,
              label: "착륙 항구로 귀환",
              x: 100,
              y: 780,
              kind: "portal" as const,
              target: "omegaLanding" as const,
            },
          ]),
      ...(i < 5
        ? [
            {
              id: `${id}-next`,
              label: names[i + 1] + " 진입",
              x: 5000,
              y: 780,
              kind: "portal" as const,
              target: omegaRegionIds[i + 1],
            },
          ]
        : []),
      ...(i === 1
        ? [
            {
              id: "omegaBrokenArchive-gate",
              label: "붕괴된 기록 보관소",
              x: 2800,
              y: 780,
              kind: "portal" as const,
              target: "omegaBrokenArchive" as const,
            },
          ]
        : []),
      ...(i === 2
        ? [
            {
              id: "omegaLabyrinth-gate",
              label: "중력 미궁",
              x: 2800,
              y: 780,
              kind: "portal" as const,
              target: "omegaLabyrinth" as const,
            },
            {
              id: "omega-rift",
              label: "공간 균열 → 안전 출구 3600m",
              x: 1700,
              y: 780,
              kind: "ruin" as const,
            },
          ]
        : []),
      ...(i === 4
        ? [
            {
              id: "omegaVault-gate",
              label: "넥서스 금고",
              x: 2800,
              y: 780,
              kind: "portal" as const,
              target: "omegaVault" as const,
            },
          ]
        : []),
      ...([1, 4, 5].includes(i)
        ? [
            {
              id: `omega-boss-${i === 1 ? "aeternumGuardian" : i === 4 ? "nexusOverlord" : "genesisZero"}`,
              label: "수호 프로토콜 가동",
              x: 3900,
              y: 780,
              kind: "boss" as const,
            },
            {
              id: "omega-feed-" + i,
              label: "보호막 공급 장치 차단 · 4초 취약",
              x: 3650,
              y: 780,
              kind: "ruin" as const,
            },
          ]
        : []),
      ...([2, 3, 6, 7, 8].includes(i)
        ? [
            {
              id: "omega-puzzle-" + { 2: 1, 3: 2, 6: 0, 7: 3, 8: 4 }[i],
              label: "고대 장치 · 퍼즐",
              x: 4100,
              y: 780,
              kind: "ruin" as const,
            },
          ]
        : []),
    ],
  };
});
export const ancientDeposits = [
  {
    id: "omega-alloy",
    name: "고대 합금 광맥",
    x: 4400,
    item: "rawAncientAlloy" as const,
    seconds: 12,
  },
  {
    id: "omega-crystal",
    name: "오메가 수정 광맥",
    x: 6200,
    item: "omegaCrystal" as const,
    seconds: 14,
  },
];
