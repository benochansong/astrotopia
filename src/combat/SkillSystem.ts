import type { World } from "../core/world";
import type { InputFrame } from "../core/types";
import { skills } from "../data/battle";
import type { SkillId, AttackPayload } from "./types";
export class SkillSystem {
  cooldowns: Partial<Record<SkillId, number>> = {};
  shield = 0;
  shieldTime = 0;
  aerialUsed = false;
  liftTime = 0;
  constructor(private w: World) {}
  ready(id: SkillId) {
    return (
      (id !== "dash" || this.w.player.dashCooldown <= 0) &&
      (this.cooldowns[id] ?? 0) <= 0 &&
      this.w.player.energy >= skills[id].energy &&
      (this.w.battle.unlockedSkills.includes(id) || !!this.w.combat.training)
    );
  }
  update(dt: number, input: InputFrame) {
    for (const key of Object.keys(this.cooldowns) as SkillId[])
      this.cooldowns[key] = Math.max(0, this.cooldowns[key]! - dt);
    this.shieldTime = Math.max(0, this.shieldTime - dt);
    this.liftTime = Math.max(0, this.liftTime - dt);
    if (!this.shieldTime) this.shield = 0;
    if (this.w.player.grounded) this.aerialUsed = false;
    if (input.skillSlot !== undefined) {
      const job = this.w.classes.state.slots[input.skillSlot];
      if (job) {
        this.w.classes.cast(job);
        return;
      }
      const id = this.w.battle.skillSlots[input.skillSlot];
      if (id) this.cast(id, input);
    }
  }
  cast(id: SkillId, input?: InputFrame) {
    const w = this.w,
      p = w.player,
      d = skills[id];
    if (!this.ready(id)) {
      w.toast(
        !w.battle.unlockedSkills.includes(id) && !w.combat.training
          ? `${d.name} · Lv.${d.level}에 해금됩니다.`
          : (this.cooldowns[id] ?? 0) > 0
            ? "스킬 재사용 대기 중입니다."
            : "에너지가 부족합니다.",
      );
      return false;
    }
    if (id === "aerial" && (p.grounded || this.aerialUsed)) {
      w.toast("공중에서 한 번 사용할 수 있습니다.");
      return false;
    }
    if (id === "dash") {
      if (input) input.dash = true;
      else {
        p.energy -= 18;
        p.dash = 0.18;
        p.dashCooldown = 2;
        p.invulnerable = Math.max(p.invulnerable, 0.18);
        w.sound("dash");
      }
      return true;
    }
    p.energy -= d.energy;
    this.cooldowns[id] = d.cooldown;
    const a: AttackPayload = {
      damage: w.stats.attack * 2.6,
      element: "plasma",
      crit: w.stats.crit,
      critDamage: w.stats.critDamage,
      knockback: 310,
      statusChance: 1,
      special: true,
      sourceX: p.x + 17,
    };
    if (id === "burst")
      w.combat.strike(
        {
          kind: "circle",
          x: p.x + 17,
          y: p.y + 32,
          w: 0,
          h: 0,
          radius: 170,
          facing: p.facing,
        },
        a,
        "#c1f0e1",
        0.32,
        true,
      );
    if (id === "wave")
      w.combat.projectiles.fire(
        p.x + 17 + p.facing * 30,
        p.y + 30,
        p.facing * 520,
        0,
        750,
        40,
        "#e8bbf5",
        { ...a, damage: w.stats.attack * 2.2 },
        true,
      );
    if (id === "aerial") {
      p.vy = -480;
      p.grounded = false;
      this.aerialUsed = true;
      this.liftTime = 0.25;
      w.burst(p.x + 17, p.y + 64, "#b9eeef", 20);
    }
    if (id === "shield") {
      this.shield = w.stats.energy * 1.2;
      this.shieldTime = 6;
      w.burst(p.x + 17, p.y + 32, "#a8c9fa", 20);
    }
    if (id === "orbital")
      w.combat.defer(
        {
          kind: "rect",
          x: p.x + 17 + p.facing * 220 - 70,
          y: 160,
          w: 140,
          h: 620,
          radius: 0,
          facing: p.facing,
        },
        {
          ...a,
          damage: w.stats.attack * 7,
          element: "electric",
          status: "shock",
        },
        "#e4d9ff",
        0.65,
      );
    w.sound(id);
    return true;
  }
  absorb(damage: number) {
    if (this.shield <= 0 || this.shieldTime <= 0) return damage;
    const n = Math.min(this.shield, damage * 0.65);
    this.shield -= n;
    return damage - n;
  }
}
