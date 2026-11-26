import type { World } from "../core/world";
import type { InputFrame } from "../core/types";
import { weapons } from "../data/battle";
import type { AttackPayload, WeaponId } from "./types";
export class WeaponSystem {
  charge = 0;
  comboStep = 0;
  comboWindow = 0;
  specialCooldown = 0;
  switchTime = 0;
  slam = false;
  slamStart = 0;
  private held = false;
  constructor(private w: World) {}
  get id(): WeaponId {
    return (
      this.w.combat.training?.weapon ??
      this.w.battle.weaponSlots[this.w.battle.activeSlot] ??
      "pulse"
    );
  }
  get data() {
    return weapons[this.id];
  }
  switch(slot: 0 | 1) {
    const w = this.w;
    if (!w.battle.weaponSlots[slot]) {
      w.toast("빈 무기 슬롯입니다. C에서 무기를 배치하세요.");
      return;
    }
    w.battle.activeSlot = slot;
    this.charge = 0;
    this.held = false;
    this.comboStep = 0;
    this.switchTime = 0.16;
    w.sound("switch");
    w.burst(w.player.x + 17, w.player.y + 35, this.data.color, 6);
    w.emit("save", "weapon");
  }
  movement(input: InputFrame) {
    return this.id === "cannon" && input.attack
      ? 0.45
      : this.id === "rifle" && input.attack
        ? 0.8
        : 1;
  }
  payload(mult = 1, special = false): AttackPayload {
    const s = this.w.stats,
      d = this.data;
    return {
      damage: s.attack * d.power * mult,
      element: d.element,
      crit: s.crit + d.crit,
      critDamage: s.critDamage + d.critDamage,
      knockback: d.knockback,
      status: d.status,
      statusChance: d.statusChance,
      special,
      sourceX: this.w.player.x + 17,
    };
  }
  update(dt: number, input: InputFrame) {
    const w = this.w,
      p = w.player;
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.switchTime = Math.max(0, this.switchTime - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    if (!this.comboWindow) this.comboStep = 0;
    if (input.weaponSlot !== undefined) this.switch(input.weaponSlot);
    if (this.switchTime > 0) return;
    if (this.slam) {
      p.vy = Math.max(p.vy, 600);
      if (p.grounded) {
        this.slam = false;
        this.area(165 + Math.min(65, (p.y - this.slamStart) * 0.15), 2.2, true);
        w.sound("hammer");
      }
      return;
    }
    if (input.special && this.specialCooldown === 0) {
      if (
        this.pay(
          this.id === "cannon"
            ? 38
            : this.id === "hammer"
              ? 28
              : this.id === "cryo"
                ? 22
                : this.id === "rifle"
                  ? 18
                  : this.id === "blade"
                    ? 20
                    : 14,
        )
      ) {
        this.specialCooldown = this.data.cooldown;
        this.special();
      }
      return;
    }
    if (this.id === "cannon") {
      if (input.attack && p.shotCooldown === 0) {
        if (!this.held) w.sound("charge");
        this.charge = Math.min(1.8, this.charge + dt);
        p.animation = "Attack";
        p.animationTime = 0.1;
      }
      if (!input.attack && this.held && this.charge > 0) {
        const level = this.charge / 1.8;
        if (this.pay(14 + Math.ceil(level * 14))) this.fireCannon(level);
        this.charge = 0;
      }
    } else if (
      input.attack &&
      p.shotCooldown === 0 &&
      this.pay(this.data.energy)
    ) {
      this.primary();
    }
    this.held = input.attack;
  }
  private pay(cost: number) {
    if (this.w.survival.state.equipped.includes("advanced")) cost *= 0.9;
    if (this.w.player.energy < cost) {
      if (this.w.player.shotCooldown === 0)
        this.w.toast("에너지가 부족합니다.");
      this.w.player.shotCooldown = 0.3;
      return false;
    }
    this.w.player.energy -= cost;
    return true;
  }
  private animate() {
    const p = this.w.player;
    p.shotCooldown = this.data.speed / this.w.stats.attackSpeed;
    p.animation = "Attack";
    p.animationTime = this.id === "hammer" ? 0.35 : 0.17;
    this.w.sound(this.data.sound);
  }
  private primary() {
    const w = this.w,
      p = w.player,
      d = this.data;
    this.animate();
    if (this.id === "blade") {
      this.comboStep = (this.comboStep % 3) + 1;
      this.comboWindow = 0.85;
      const finisher = this.comboStep === 3;
      const a = this.payload(finisher ? 1.8 : 1);
      a.knockback *= finisher ? 1.8 : 1;
      if (finisher) {
        a.status = "shred";
        a.statusChance = 1;
      }
      if (p.dash > 0) a.damage *= 1.3;
      this.w.combat.strike(
        {
          kind: "arc",
          x: p.x + 17,
          y: p.y + 32,
          w: 0,
          h: 0,
          radius: d.range + (finisher ? 25 : 0),
          facing: p.facing,
        },
        a,
        d.color,
        0.2,
        finisher,
      );
    } else if (this.id === "hammer") {
      if (!p.grounded) {
        this.slam = true;
        this.slamStart = p.y;
        p.vy = 650;
      } else this.area(d.range, 1, true);
    } else
      w.combat.projectiles.fire(
        p.x + 17 + p.facing * 30,
        p.y + 30,
        p.facing * d.projectileSpeed,
        0,
        d.range,
        this.id === "cryo" ? 12 : 4,
        d.color,
        this.payload(),
      );
  }
  private area(radius: number, mult: number, strong = false) {
    const p = this.w.player;
    this.w.combat.strike(
      {
        kind: "circle",
        x: p.x + 17,
        y: p.y + 50,
        w: 0,
        h: 0,
        radius,
        facing: p.facing,
      },
      this.payload(mult, true),
      this.data.color,
      0.3,
      strong,
    );
  }
  private fireCannon(level: number) {
    const w = this.w,
      p = w.player,
      d = this.data;
    this.animate();
    w.combat.projectiles.fire(
      p.x + 17 + p.facing * 35,
      p.y + 30,
      p.facing * d.projectileSpeed,
      0,
      d.range,
      8 + level * 9,
      d.color,
      this.payload(1 + level * 2, true),
      false,
      65 + level * 95,
    );
  }
  private special() {
    const w = this.w,
      p = w.player,
      d = this.data;
    this.animate();
    if (this.id === "cannon") {
      this.charge = 0;
      this.fireCannon(1);
    } else if (this.id === "blade") {
      p.dash = 0.12;
      p.invulnerable = Math.max(p.invulnerable, 0.12);
      this.area(150, 1.7, true);
    } else if (this.id === "hammer") this.area(220, 1.8, true);
    else if (this.id === "cryo") {
      const a = this.payload(1.8, true);
      a.status = "chill";
      a.statusChance = 1;
      w.combat.defer(
        {
          kind: "circle",
          x: p.x + 17 + p.facing * 140,
          y: p.y + 40,
          w: 0,
          h: 0,
          radius: 140,
          facing: p.facing,
        },
        a,
        d.color,
        0.25,
      );
    } else if (this.id === "rifle") {
      for (const vy of [-85, 0, 85])
        w.combat.projectiles.fire(
          p.x + 17 + p.facing * 30,
          p.y + 30,
          p.facing * 900,
          vy,
          950,
          6,
          d.color,
          this.payload(1.4, true),
          true,
        );
    } else
      w.combat.projectiles.fire(
        p.x + 17 + p.facing * 30,
        p.y + 30,
        p.facing * 900,
        0,
        1100,
        9,
        d.color,
        this.payload(2.6, true),
        true,
      );
  }
}
