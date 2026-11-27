import type { World } from "../core/world";
import { gearStats } from "../combat/EquipmentSystem";
export class CraftingSystem {
  constructor(protected w: World) {}
  start(id: string, n = 1) {
    return this.w.survival.production.enqueue(id, "craft", n);
  }
}
export class RefinerySystem extends CraftingSystem {}
export class EquipmentUpgradeSystem {
  constructor(private w: World) {}
  preview(id: string) {
    const g = this.w.battle.gear.find((g) => g.id === id);
    if (!g) return null;
    const level = g.upgrade ?? 0;
    return {
      level,
      before: gearStats(g),
      after: gearStats({ ...g, upgrade: Math.min(10, level + 1) }),
      cost:
        level < 5
          ? { ironBar: level + 1, refinedCell: Math.ceil((level + 1) / 2) }
          : { quantumCell: level - 3, ultraAlloy: level - 2 },
      credits: 50 * (level + 1),
    };
  }
  upgrade(id: string) {
    const w = this.w,
      g = w.battle.gear.find((g) => g.id === id),
      p = this.preview(id);
    if (
      !g ||
      !p ||
      p.level >= 10 ||
      (p.level >= 5 &&
        !w.survival.state.technologies.includes("quantumEngineering")) ||
      !w.survival.inBase ||
      !w.survival.state.facilities.includes("equipment") ||
      !w.survival.state.technologies.includes("upgrade")
    )
      return false;
    if (w.battle.credits < p.credits || !w.survival.storage.spend(p.cost)) {
      w.toast("강화 재료 또는 크레딧이 부족합니다.");
      return false;
    }
    w.battle.credits -= p.credits;
    g.upgrade = p.level + 1;
    w.sound("craftComplete");
    w.emit("save", "upgrade");
    return true;
  }
}
