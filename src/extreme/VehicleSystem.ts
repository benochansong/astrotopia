import type { World } from "../core/world";
import type { ItemId } from "../data/content";
import { addItem } from "../systems/inventory";
export class VehicleSystem {
  constructor(private w: World) {}
  get near() {
    const w = this.w,
      v = w.extreme.state.vehicle;
    return (
      !!v &&
      v.region === w.region &&
      Math.hypot(v.x - w.player.x, v.y - w.player.y) < 150
    );
  }
  create(kind: "rover" | "pod") {
    const w = this.w;
    if (
      !["rover", "pod"].includes(kind) ||
      !w.survival.inBase ||
      w.region === "ship" ||
      w.extreme.state.vehicle ||
      !w.survival.state.technologies.includes(
        kind === "pod" ? "pressureEngineering" : "thermalEngineering",
      )
    )
      return false;
    if (
      !w.survival.storage.spend(
        kind === "pod"
          ? { pressureAlloy: 4, hydroModule: 2, advancedBattery: 2 }
          : { cryoAlloy: 4, engineParts: 2, advancedBattery: 2 },
      )
    )
      return false;
    w.extreme.state.vehicle = {
      kind,
      region: w.region,
      x: Math.max(0, Math.min(w.map.width - 90, w.player.x + 70)),
      y: Math.max(0, w.player.y),
      energy: 100,
      mounted: false,
      hp: 100,
      cargo: {},
    };
    w.emit("save", "vehicle");
    return true;
  }
  toggle() {
    const w = this.w,
      v = w.extreme.state.vehicle;
    if (!v) return false;
    if (v.mounted) {
      v.mounted = false;
      return true;
    }
    if (
      !this.near ||
      v.hp <= 0 ||
      v.energy <= 0 ||
      w.region === "ship" ||
      (v.kind === "pod") !== (w.planetId === "aquaria")
    )
      return false;
    v.mounted = true;
    w.space.once("vehicle_" + v.kind);
    return true;
  }
  transfer(item: ItemId, into: boolean) {
    const w = this.w,
      v = w.extreme.state.vehicle;
    if (!v || !this.near) return false;
    const from = into ? w.inventory : v.cargo,
      to = into ? v.cargo : w.inventory;
    if (
      (from[item] ?? 0) < 1 ||
      !addItem(
        to,
        item,
        1,
        into ? 20 : w.survival.state.capacity - w.battle.gear.length,
      )
    )
      return false;
    from[item]!--;
    if (!from[item]) delete from[item];
    w.emit("save", "vehicle-cargo");
    return true;
  }
  service() {
    const w = this.w,
      v = w.extreme.state.vehicle;
    if (
      !v ||
      !this.near ||
      !w.survival.inBase ||
      !w.survival.storage.spend({ advancedBattery: 1, ironBar: 2 })
    )
      return false;
    v.energy = 100;
    v.hp = 100;
    w.emit("save", "vehicle-service");
    return true;
  }
  dismantle() {
    const w = this.w,
      v = w.extreme.state.vehicle;
    if (
      !v ||
      !this.near ||
      !w.survival.inBase ||
      v.mounted ||
      Object.values(v.cargo).some((n) => n)
    )
      return false;
    w.extreme.state.vehicle = null;
    w.emit("save", "vehicle-dismantle");
    return true;
  }
  recover() {
    const w = this.w,
      v = w.extreme.state.vehicle;
    if (!v || !w.survival.inBase || v.mounted) return false;
    v.region = w.region;
    v.x = Math.max(0, Math.min(w.map.width - 90, w.player.x + 70));
    v.y = Math.max(0, w.player.y);
    w.emit("save", "vehicle-recover");
    return true;
  }
  update(dt: number) {
    const w = this.w,
      v = w.extreme.state.vehicle;
    if (!v) return;
    if (v.mounted && (v.region !== w.region || w.dead > 0)) {
      v.mounted = false;
      return;
    }
    if (v.mounted) {
      v.energy = Math.max(
        0,
        v.energy - dt * (Math.abs(w.player.vx) > 20 ? 0.5 : 0.12),
      );
      if (v.energy <= 0 || v.hp <= 0) {
        v.mounted = false;
        w.toast(
          "탐험 차량 정지 · Z 하차 · 기지 환경 장비에서 회수·정비할 수 있습니다.",
        );
        w.player.invulnerable = Math.max(w.player.invulnerable, 3);
      }
    }
    if (this.near && w.space.protectedBy("submarineDock"))
      v.energy = Math.min(100, v.energy + dt * 12);
  }
  damage(amount: number) {
    const v = this.w.extreme.state.vehicle;
    if (!v?.mounted) return;
    v.hp = Math.max(0, v.hp - amount * 0.35);
    if (v.hp === 0) {
      v.mounted = false;
      this.w.toast("차량 파손 · 화물은 보존됩니다. 기지에서 회수·수리하세요.");
    }
  }
}
