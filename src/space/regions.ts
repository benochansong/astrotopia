import type { Region, EnemyData, ItemId } from "../data/content";
import type { SpaceRegion } from "./catalog";
export type SpaceEnemy =
  | "sandCrawler"
  | "duneStalker"
  | "crimsonScorpion"
  | "dustManta"
  | "ironBeast"
  | "magmaBurrower"
  | "ancientDrone"
  | "foundryGuardian"
  | "colossus";
const row = (
  name: string,
  hp: number,
  damage: number,
  speed: number,
  drop: ItemId,
  w = 64,
  h = 55,
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
  xp: Math.round(hp / 4),
  color: "#dba478",
  range: 400,
});
export const spaceEnemies: Record<SpaceEnemy, EnemyData> = {
  sandCrawler: row("SAND CRAWLER", 380, 22, 110, "desertFiber"),
  duneStalker: row("DUNE STALKER", 480, 25, 150, "redIron", 80, 60),
  crimsonScorpion: row("CRIMSON SCORPION", 600, 28, 65, "heatOre", 100, 70),
  dustManta: row("DUST MANTA", 450, 24, 100, "desertFiber", 100, 45, true),
  ironBeast: {
    ...row("IRON BEAST", 900, 35, 55, "pureTitanium", 140, 100),
    defense: 18,
  },
  magmaBurrower: row("MAGMA BURROWER", 700, 30, 90, "thermalCrystal", 95, 65),
  ancientDrone: row("ANCIENT DRONE", 700, 32, 60, "powerCircuit", 65, 80, true),
  foundryGuardian: {
    ...row("FOUNDRY GUARDIAN", 1300, 40, 35, "industrialAlloy", 100, 140),
    defense: 20,
  },
  colossus: {
    ...row("DUNE COLOSSUS", 12000, 42, 40, "heatAlloy", 280, 190),
    defense: 16,
  },
};
const ids: SpaceRegion[] = [
  "aresLanding",
  "aresDunes",
  "aresCanyon",
  "aresFoundry",
];
const names = ["착륙 분지", "붉은 모래언덕", "강철 협곡", "고대 제련소"];
const ens = [
  "LANDING BASIN",
  "CRIMSON DUNES",
  "IRON CANYON",
  "ANCIENT FOUNDRY",
];
const drops: ItemId[][] = [
  ["redIron", "desertCrystal", "desertFiber"],
  ["cobalt", "magnesium", "thermalCrystal"],
  ["pureTitanium", "heatOre", "industrialAlloy"],
  ["powerCircuit", "heatOre", "thermalCrystal"],
];
export const spaceRegions = {} as Record<SpaceRegion, Region>;
for (let i = 0; i < 4; i++) {
  const id = ids[i],
    width = i === 0 ? 10000 : i === 3 ? 4800 : 3800;
  const r: Region = {
    id,
    name: names[i],
    en: ens[i],
    subtitle: [
      "두 번째 세계의 첫 발자국",
      "바람을 읽고 이동하세요",
      "저중력을 이용해 암벽을 오르세요",
      "과열된 산업 문명의 흔적",
    ][i],
    width,
    spawn: 300,
    palette: ["#372a32", "#a35d48", "#ddac80"],
    platforms: [{ x: 0, y: 780, w: width, h: 300 }],
    resources: [],
    landmarks: [],
    enemies: [],
  };
  if (i > 0)
    r.landmarks.push({
      id: id + "-back",
      kind: "portal",
      target: ids[i - 1],
      x: 180,
      y: 780,
      label: "이전 구역으로",
    });
  if (i < 3)
    r.landmarks.push({
      id: id + "-next",
      kind: "portal",
      target: ids[i + 1],
      x: i === 0 ? 2900 : 3500,
      y: 780,
      label: names[i + 1] + " 이동",
    });
  for (let n = 0; n < 9; n++)
    r.resources.push({
      id: id + "-node-" + n,
      item: drops[i][n % 3],
      x: 650 + n * 270,
      y: 780,
      count: 3,
      respawn: 35,
      tier: 1,
      seconds: 1.5,
    });
  if (i > 0) {
    for (let n = 0; n < 6; n++)
      r.platforms.push({
        x: 800 + n * 360,
        y: 640 - (i === 2 ? (n % 3) * 110 : (n % 2) * 80),
        w: 220,
        h: 25,
        oneWay: true,
      });
    for (let n = 0; n < 6; n++)
      r.enemies.push({
        kind: (Object.keys(spaceEnemies) as SpaceEnemy[])[(i * 2 + n) % 8],
        x: 900 + n * 420,
        y: 780,
      });
  }
  if (i === 0) {
    r.landmarks.push({
      id: "ares-ship",
      kind: "ship",
      x: 360,
      y: 780,
      label: "ASTRA-01 탑승 · U 우주선 관리",
    });
    for (const [f, x] of [
      ["terminal", 600],
      ["workbench", 850],
      ["warehouse", 1100],
    ] as const)
      r.landmarks.push({
        id: "ares-" + f,
        kind: "facility",
        facility: f,
        x,
        y: 780,
        label: "착륙 캠프 " + f,
      });
  }
  if (i === 3) {
    r.landmarks.push(
      {
        id: "foundry-archive",
        kind: "ruin",
        x: 3150,
        y: 780,
        label: "고대 산업 기록 분석",
      },
      {
        id: "colossus-arena",
        kind: "ruin",
        x: 3850,
        y: 780,
        label: "DUNE COLOSSUS 호출",
      },
    );
  }
  spaceRegions[id] = r;
}
spaceRegions.ship = {
  id: "ship",
  name: "ASTRA-01 내부",
  en: "HOME BETWEEN WORLDS",
  subtitle: "조종실 · 생활실 · 화물실 · 기관실 · 작업실",
  width: 2800,
  spawn: 300,
  palette: ["#101b2b", "#24364b", "#879b9d"],
  platforms: [{ x: 0, y: 780, w: 2800, h: 300 }],
  resources: [],
  enemies: [],
  landmarks: [
    "조종실 / 항성계 지도",
    "생활실 / 회복·저장",
    "화물실 / 수동 운송",
    "기관실 / 연료·강화",
    "작업실 / 비상 연료",
  ].map((name, i) => ({
    id: "ship-zone-" + i,
    kind: "ship",
    x: 300 + i * 500,
    y: 780,
    label: name,
  })),
};
