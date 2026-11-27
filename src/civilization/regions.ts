import type { Region } from "../data/content";
export const stationZones = [
  "중앙 허브",
  "화물 터미널",
  "성간 시장",
  "연구실",
  "조선소",
  "거주 구역",
  "관측 갑판",
];
export const stationRegion: Region = {
  id: "station",
  name: "STELLAR NEXUS",
  en: "A HOME AMONG THE STARS",
  subtitle: "일곱 구역으로 연결된 개척자들의 정거장",
  width: 4400,
  spawn: 300,
  palette: ["#09182c", "#233a51", "#90d4cc"],
  platforms: [{ x: 0, y: 780, w: 4400, h: 300 }],
  resources: [],
  enemies: [],
  landmarks: stationZones.map((label, i) => ({
    id: "nexus-zone-" + i,
    label,
    kind: "ruin",
    x: 300 + i * 600,
    y: 780,
  })),
};
