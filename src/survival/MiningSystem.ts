import type { World } from "../core/world";
import { items, type Resource } from "../data/content";
import { ResourceSystem } from "./DiscoverySystem";
import { toolsData } from "./catalog";
import type { InputFrame } from "../core/types";
export class MiningSystem {
  constructor(private w: World) {}
  duration(n: Resource) {
    return ResourceSystem.seconds(n, this.w.survival.state.tool);
  }
  start(n: Resource) {
    const w = this.w,
      t = w.survival.state.tool,
      required = n.tier ?? 1;
    if (t < required) {
      w.toast(
        `T${required} ${toolsData[required - 1].name} 필요 · B에서 연구 및 제작`,
      );
      return false;
    }
    if (w.player.energy < toolsData[t - 1].energy) {
      w.toast("채굴 에너지가 부족합니다.");
      return false;
    }
    w.mining = { node: n, elapsed: 0 };
    w.sound("mine" + t);
    return true;
  }
  update(dt: number, input: InputFrame) {
    const w = this.w,
      p = w.player,
      m = w.mining;
    if (!m) return;
    if (
      input.left ||
      input.right ||
      input.jump ||
      input.dash ||
      input.attack ||
      input.special ||
      p.animation === "Hit" ||
      Math.abs(p.x + 17 - m.node.x) > 100 ||
      Math.abs(p.y + p.h - m.node.y) > 80
    ) {
      w.mining = null;
      return;
    }
    const t = w.survival.state.tool;
    m.elapsed += dt;
    p.animation = "Mining";
    if (Math.floor(m.elapsed * 8) !== Math.floor((m.elapsed - dt) * 8))
      w.burst(m.node.x, m.node.y - 20, toolsData[t - 1].color, 3);
    if (m.elapsed < this.duration(m.node)) return;
    if (p.energy < toolsData[t - 1].energy) {
      w.toast("채굴 에너지가 부족합니다.");
      w.mining = null;
      return;
    }
    if (w.collect(m.node.item, m.node.count)) {
      p.energy -= toolsData[t - 1].energy;
      w.cooldowns[m.node.id] = m.node.respawn;
      w.survival.state.miningCooldowns[m.node.id] = m.node.respawn;
      if (t === 4 && Math.random() < (m.node.rareChance ?? 0.12)) {
        if (!w.collect("rareQuartz", 1))
          w.combat.loot.place(m.node.x, m.node.y, "rareQuartz");
        w.sound("rareLoot");
      }
      w.emit("save", "mining");
    }
    w.mining = null;
  }
}
