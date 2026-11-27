import type { World } from "../core/world";
import { items, enemyData } from "../data/content";
import { ResourceSystem } from "./DiscoverySystem";
export class ScannerSystem {
  remaining = 0;
  cooldown = 0;
  constructor(private w: World) {}
  activate() {
    const w = this.w;
    if (!w.survival.state.scanner) {
      w.toast("생존 터미널에서 PIONEER SCANNER를 확보하세요.");
      return false;
    }
    if (this.cooldown > 0) return false;
    this.remaining = 7;
    this.cooldown = 10;
    w.count("scanner");
    if (w.survival.sentinel.active) {
      w.count("conduitScan");
      w.toast("공급 장치 2개를 공격하면 파수꾼의 보호막이 해제됩니다.");
    }
    w.sound("scanner");
    return true;
  }
  update(dt: number) {
    this.remaining = Math.max(0, this.remaining - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
  }
  readings() {
    const w = this.w,
      r = w.survival.state.equipped.includes("genesisScanner")
        ? 1400
        : w.survival.state.technologies.includes("rareScan")
          ? 950
          : 600;
    const nearby = w.map.resources.filter(
      (n) => Math.abs(n.x - w.player.x) < r && !w.cooldowns[n.id],
    );
    return [
      ...new Set(
        nearby.map(
          (n) =>
            `${items[n.item].icon} ${items[n.item].name} · T${n.tier ?? ResourceSystem.info(n.item).tier} · 매장량 ${n.reserve ?? n.count * 3}`,
        ),
      ),
      ...w.enemies
        .filter((e) => e.state !== "Death" && Math.abs(e.x - w.player.x) < 450)
        .map((e) => `생명 신호 · ${enemyData[e.kind].name}`),
    ].slice(0, 5);
  }
}
