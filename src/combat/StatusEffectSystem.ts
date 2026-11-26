import type { Status, StatusId } from "./types";
export class StatusEffectSystem {
  static apply(
    list: Status[],
    id: StatusId,
    power = 4,
    elite = false,
    boss = false,
    immune = 0,
  ): boolean {
    if ((id === "freeze" || id === "stun") && (boss || immune > 0))
      return false;
    const durations = {
      chill: 3,
      freeze: elite ? 0.25 : 0.7,
      shock: 3,
      poison: 4,
      stun: elite ? 0.2 : 0.45,
      shred: 4,
    };
    const existing = list.find((s) => s.id === id);
    if (existing) {
      existing.time = Math.max(existing.time, durations[id]);
      existing.stacks = Math.min(3, existing.stacks + 1);
      existing.power = Math.max(existing.power, power);
    } else list.push({ id, time: durations[id], stacks: 1, tick: 0, power });
    const chill = list.find((s) => s.id === "chill");
    if (id === "chill" && chill && chill.stacks >= 3 && !boss && immune <= 0) {
      chill.stacks = 0;
      this.apply(list, "freeze", power, elite, boss, immune);
    }
    return true;
  }
  static tick(
    list: Status[],
    dt: number,
    onDamage: (damage: number, id: StatusId) => void,
  ) {
    for (const s of list) {
      s.time -= dt;
      s.tick += dt;
      if ((s.id === "shock" || s.id === "poison") && s.tick >= 0.75) {
        s.tick -= 0.75;
        onDamage(s.power, s.id);
      }
    }
    for (let i = list.length - 1; i >= 0; i--)
      if (list[i].time <= 0) list.splice(i, 1);
  }
  static speed(list: Status[], boss = false) {
    if (list.some((s) => s.id === "freeze" || s.id === "stun")) return 0;
    return list.some((s) => s.id === "chill") ? (boss ? 0.9 : 0.55) : 1;
  }
}
