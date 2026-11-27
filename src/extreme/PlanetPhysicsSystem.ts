import type { World } from "../core/world";
import type { InputFrame } from "../core/types";
export class PlanetPhysicsSystem {
  aim = 0;
  constructor(private w: World) {}
  get jetTier() {
    const gear = this.w.survival.state.equipped;
    return gear.includes("zeroGPack")
      ? 4
      : gear.includes("jetpack3")
        ? 3
        : gear.includes("advancedJetCore")
          ? 2
          : gear.includes("jetpack1")
            ? 1
            : 0;
  }
  get airControl() {
    return this.w.planetId === "lunaris"
      ? this.jetTier >= 3
        ? 900
        : 420
      : 1100;
  }
  get swimming() {
    const w = this.w;
    return (
      w.planetId === "aquaria" &&
      w.region !== "ship" &&
      w.player.x > 650 &&
      w.player.y > 380
    );
  }
  get depth() {
    return this.swimming
      ? Math.max(0, Math.round((this.w.player.y - 380) * 0.7))
      : 0;
  }
  get speedFactor() {
    const w = this.w,
      v = w.extreme.state.vehicle;
    return v?.mounted
      ? v.kind === "rover"
        ? 1.65
        : 1.5
      : this.swimming
        ? w.survival.state.equipped.includes("hydroPropulsor")
          ? 1.05
          : 0.7
        : 1;
  }
  get jumpSpeed() {
    return this.w.planetId === "inferno" &&
      this.w.survival.state.equipped.includes("exoskeleton")
      ? 610
      : 520;
  }
  get extraPlatforms() {
    const w = this.w;
    return w.region === "infernoWilds"
      ? [
          {
            x: 1180 + Math.sin(w.time * 0.5) * 110,
            y: 670,
            w: 180,
            h: 25,
            oneWay: true,
          },
        ]
      : [];
  }
  beforeStep(dt: number, input: InputFrame) {
    const w = this.w,
      p = w.player,
      s = w.extreme.state;
    this.aim = Number(input.down) - Number(input.up);
    if (this.swimming) {
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      const boost = input.jumpHeld && p.energy > 10,
        vertical =
          (Number(input.down) - Number(input.up || boost)) *
          (boost ? 320 : 180);
      p.vy += (vertical - p.vy) * Math.min(1, dt * 4);
      if (boost) p.energy = Math.max(0, p.energy - dt * 20);
      const current = w.extreme.environment.weather.active ? 65 : 18;
      p.x += Math.sin(w.time * 0.5 + p.y * 0.003) * current * dt;
      w.space.once("swim_aquaria");
    }
    if (w.planetId === "lunaris" && w.region !== "ship") {
      if (w.space.protectedBy("gravityAnchor")) {
        s.jetEnergy = Math.min(100, s.jetEnergy + dt * 20);
        p.vx *= Math.exp(-dt * 4);
      }
      if (p.grounded) s.jetEnergy = Math.min(100, s.jetEnergy + dt * 24);
      if (input.jumpHeld && s.jetEnergy > 0 && this.jetTier > 0) {
        p.vy = Math.max(
          this.jetTier >= 3 ? -360 : -300,
          p.vy - (this.jetTier >= 3 ? 1100 : 850) * dt,
        );
        s.jetEnergy = Math.max(
          0,
          s.jetEnergy - dt * [0, 20, 14, 12, 9][this.jetTier],
        );
        w.space.once("jet_lunaris");
      }
      if (input.down) p.vy = Math.min(500, p.vy + dt * 500);
      if (
        input.anchor ||
        (this.jetTier === 4 &&
          !input.left &&
          !input.right &&
          !input.jumpHeld) ||
        (w.settings.jetAssist &&
          !input.left &&
          !input.right &&
          !input.jumpHeld) ||
        (w.survival.state.equipped.includes("zeroGStabilizer") &&
          !input.left &&
          !input.right)
      ) {
        p.vx *= Math.exp(-dt * 14);
        p.vy *= Math.exp(-dt * 8);
      }
      if (
        w.extreme.combat.boss?.kind === "archon" &&
        w.extreme.combat.phase >= 2
      ) {
        p.vx += Math.sin(w.time * 0.4) * dt * 60;
      }
    }
  }
  afterStep() {
    const p = this.w.player;
    if (p.y < -80) {
      p.y = -80;
      p.vy = Math.max(0, p.vy);
    }
    if (this.swimming && p.y < 395) {
      p.y = 395;
      p.vy = Math.max(0, p.vy);
    }
    const v = this.w.extreme.state.vehicle;
    if (v?.mounted) {
      v.x = Math.max(0, Math.min(this.w.map.width - p.w, p.x));
      v.y = Math.max(0, p.y);
    }
  }
}
