import type { World } from "../core/world";
import { items, type ItemId } from "../data/content";
import { occupiedSlots, type Inventory } from "../systems/inventory";
import type { Cost } from "./catalog";
export class StorageSystem {
  constructor(private w: World) {}
  available(id: ItemId) {
    return (
      (this.w.inventory[id] ?? 0) +
      (this.w.survival.inBase ? (this.w.survival.state.warehouse[id] ?? 0) : 0)
    );
  }
  missing(cost: Cost, mult = 1) {
    return Object.entries(cost)
      .filter(([id, n]) => this.available(id as ItemId) < n! * mult)
      .map(
        ([id, n]) =>
          `${items[id as ItemId].name} ${this.available(id as ItemId)}/${n! * mult}`,
      );
  }
  spend(cost: Cost, mult = 1) {
    if (this.missing(cost, mult).length) return false;
    const inv = { ...this.w.inventory },
      wh = { ...this.w.survival.state.warehouse };
    for (const [id, n] of Object.entries(cost) as [ItemId, number][]) {
      const take = Math.min(inv[id] ?? 0, n * mult);
      inv[id] = (inv[id] ?? 0) - take;
      wh[id] = (wh[id] ?? 0) - (n * mult - take);
    }
    this.w.inventory = inv;
    this.w.survival.state.warehouse = wh;
    return true;
  }
  transfer(id: ItemId, count: number, toWarehouse: boolean) {
    if (
      !this.w.survival.inBase ||
      !Number.isInteger(count) ||
      count < 1 ||
      !Object.hasOwn(items, id)
    )
      return false;
    const s = this.w.survival.state,
      inv = { ...this.w.inventory },
      wh = { ...s.warehouse },
      from = toWarehouse ? inv : wh,
      to = toWarehouse ? wh : inv;
    if ((from[id] ?? 0) < count) return false;
    to[id] = (to[id] ?? 0) + count;
    from[id] = (from[id] ?? 0) - count;
    if (
      occupiedSlots(wh) > this.w.colony.capacity ||
      occupiedSlots(inv) + this.w.battle.gear.length > s.capacity
    ) {
      this.w.toast("보관 공간이 부족합니다.");
      return false;
    }
    this.w.inventory = inv;
    s.warehouse = wh;
    this.w.emit("save", "transfer");
    return true;
  }
  depositAll() {
    for (const [id, n] of Object.entries(this.w.inventory) as [
      ItemId,
      number,
    ][])
      if (!["스토리", "소비 아이템"].includes(items[id].type) && n)
        this.transfer(id, n, true);
  }
  static add(inv: Inventory, id: ItemId, count: number, capacity: number) {
    const next = { ...inv, [id]: (inv[id] ?? 0) + count };
    if (occupiedSlots(next) > capacity) return false;
    Object.assign(inv, next);
    return true;
  }
}
