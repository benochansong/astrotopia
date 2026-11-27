import type { World } from "../core/world";
import { technologies } from "./catalog";
export class TechnologyTreeSystem {
  static branches = [
    "물류",
    "거대 산업",
    "도시",
    "궤도",
    "복원",
    "성간",
    "채굴",
    "소재",
    "생존",
    "무기",
    "개척",
    "극한 환경",
    "우주",
    "탐사",
    "물류",
  ];
  static nodes(branch: string) {
    return Object.values(technologies).filter((t) => t.branch === branch);
  }
}
export class ResearchSystem {
  constructor(private w: World) {}
  start(id: string) {
    return this.w.survival.production.enqueue(id, "research");
  }
  convert() {
    const w = this.w;
    if (
      !w.survival.inBase ||
      !w.survival.state.facilities.includes("research") ||
      !w.survival.storage.spend({ data: 1 })
    )
      return false;
    w.survival.state.researchPoints += 2;
    w.emit("save", "research-points");
    return true;
  }
}
