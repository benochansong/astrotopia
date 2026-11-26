import { gearTemplates, rarities } from "../data/battle";
import { attackPower, maxHp } from "../physics/movement";
import type { BattleSave, Gear, GearSlot, Stats } from "./types";
export function baseStats(level: number): Stats {
  return {
    hp: maxHp(level),
    energy: 100,
    attack: attackPower(level),
    defense: 5 + Math.floor((level - 1) / 3),
    crit: 0.06,
    critDamage: 1.65,
    attackSpeed: 1,
    moveSpeed: 250,
    regen: 12,
    statusResist: 0,
    elementResist: 0,
  };
}
export function gearStats(gear: Gear): Partial<Stats> {
  const t = gearTemplates[gear.template],
    m = rarities[gear.rarity].mult * (1 + (gear.upgrade ?? 0) * 0.12);
  return Object.fromEntries(
    Object.entries(t.stats).map(([k, v]) => [k, v * m]),
  );
}
export class EquipmentSystem {
  static stats(level: number, b: BattleSave): Stats {
    const result = baseStats(level);
    for (const [slot, id] of Object.entries(b.equipment)) {
      if (
        (slot === "primary" && b.activeSlot !== 0) ||
        (slot === "secondary" && b.activeSlot !== 1)
      )
        continue;
      const gear = b.gear.find((g) => g.id === id);
      if (!gear) continue;
      for (const [key, value] of Object.entries(gearStats(gear)))
        result[key as keyof Stats] += value;
    }
    result.crit = Math.min(0.65, result.crit);
    result.statusResist = Math.min(0.6, result.statusResist);
    result.elementResist = Math.min(0.6, result.elementResist);
    return result;
  }
  static equip(b: BattleSave, id: string, slot?: GearSlot): boolean {
    const gear = b.gear.find((g) => g.id === id);
    if (!gear) return false;
    const t = gearTemplates[gear.template],
      target = slot ?? t.slot;
    if (t.weapon) {
      if (target !== "primary" && target !== "secondary") return false;
    } else if (target !== t.slot) return false;
    for (const key of Object.keys(b.equipment) as GearSlot[])
      if (b.equipment[key] === id) delete b.equipment[key];
    b.equipment[target] = id;
    if (t.weapon) {
      if (!b.ownedWeapons.includes(t.weapon)) b.ownedWeapons.push(t.weapon);
      b.weaponSlots[target === "secondary" ? 1 : 0] = t.weapon;
    }
    return true;
  }
  static unequip(b: BattleSave, slot: GearSlot) {
    delete b.equipment[slot];
  }
  static compare(level: number, b: BattleSave, id: string, slot?: GearSlot) {
    const copy = structuredClone(b),
      before = this.stats(level, b);
    if (!this.equip(copy, id, slot)) return {};
    const after = this.stats(level, copy);
    return Object.fromEntries(
      Object.keys(before).map((k) => [
        k,
        after[k as keyof Stats] - before[k as keyof Stats],
      ]),
    );
  }
}
