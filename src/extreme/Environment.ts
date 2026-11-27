import type { World } from "../core/world";
import {
  extremeGear,
  extremeIds,
  extremePlanets,
  type ExtremePlanet,
} from "./catalog";
export interface PlanetEnvironment {
  gravity: number;
  atmosphericDensity: number;
  oxygenLevel: number;
  temperature: number;
  windStrength: number;
  windDirection: number;
  radiation: number;
  toxicity: number;
  surfaceFriction: number;
  waterDensity: number;
  waterPressure: number;
  visibility: number;
  energyInterference: number;
}
export const planetEnvironment: Record<string, PlanetEnvironment> = {};
for (const [id, g, temp, o2, friction, water] of [
  ["eden", 0.9, 22, 1, 1, 0],
  ["ares", 0.65, 55, 0.1, 0.85, 0],
  ["frostia", 1.2, -80, 0, 0.15, 0],
  ["inferno", 1.5, 180, 0.05, 0.95, 0],
  ["aquaria", 1, 12, 0.1, 0.7, 1],
  ["lunaris", 0.2, -40, 0, 0.65, 0],
] as const)
  planetEnvironment[id] = {
    gravity: g,
    atmosphericDensity: o2,
    oxygenLevel: o2,
    temperature: temp,
    windStrength: 0,
    windDirection: 1,
    radiation: id === "lunaris" ? 45 : 0,
    toxicity: id === "inferno" ? 30 : 0,
    surfaceFriction: friction,
    waterDensity: water,
    waterPressure: 0,
    visibility: 1,
    energyInterference: 0,
  };
export class WeatherSystem {
  constructor(private w: World) {}
  get clock() {
    return this.w.extreme.state.weather[this.w.planetId] ?? 0;
  }
  get active() {
    return this.clock >= 140;
  }
  get warning() {
    return this.clock >= 130 && this.clock < 140;
  }
  get name() {
    return (
      extremePlanets[this.w.planetId as ExtremePlanet]?.weather ??
      (this.w.planetId === "eden" ? "발광 포자 비" : "모래폭풍")
    );
  }
  update(dt: number) {
    const w = this.w;
    if (w.region === "ship") return;
    const before = this.clock;
    w.extreme.state.weather[w.planetId] = (before + dt) % 190;
    if (before < 130 && this.clock >= 130) {
      w.toast(this.name + " 접근 · 10초 후 · 안전 지역으로 이동하세요.");
      w.sound("environmentWarning");
    }
  }
}
export class PlanetEnvironmentSystem {
  weather: WeatherSystem;
  private damageClock = 0;
  private lavaClock = 0;
  private ventClock = 10;
  constructor(private w: World) {
    this.weather = new WeatherSystem(w);
  }
  get sheltered() {
    const w = this.w;
    return (
      w.region === "ship" ||
      (w.isColonyRegion && w.player.x < 650 && w.player.y < 850) ||
      w.space.protectedBy("radShieldStation") ||
      w.space.protectedBy("vacuumHabitat") ||
      w.space.protectedBy("sealedHabitat") ||
      w.space.protectedBy("thermalRegulator") ||
      w.space.protectedBy("thermalShieldGen") ||
      w.space.protectedBy("magmaCooling") ||
      w.map.landmarks.some(
        (l) =>
          l.id.startsWith("shelter-") &&
          Math.abs(l.x - w.player.x) < 120 &&
          Math.abs(l.y - w.player.y - w.player.h) < 140,
      )
    );
  }
  get safeDepth() {
    const w = this.w;
    return (
      Math.max(
        150,
        ...w.survival.state.equipped.map(
          (id) => extremeGear[id as keyof typeof extremeGear]?.pressure ?? 0,
        ),
      ) +
      (w.space.protectedBy("pressureShield") ? 1600 : 0) +
      (w.extreme.state.vehicle?.mounted &&
      w.extreme.state.vehicle.kind === "pod"
        ? 500
        : 0)
    );
  }
  get data(): PlanetEnvironment {
    const w = this.w,
      d = { ...planetEnvironment[w.planetId] };
    if (this.weather.active && !this.sheltered) {
      d.windStrength = w.planetId === "lunaris" ? 0 : 40;
      d.visibility = 0.55;
      d.temperature +=
        w.planetId === "frostia" ? -30 : w.planetId === "inferno" ? 60 : 0;
      d.energyInterference = w.planetId === "lunaris" ? 0.3 : 0;
    }
    return d;
  }
  protection(key: "cold" | "heat" | "pressure") {
    return Math.min(
      90,
      (this.w.extreme.state.vehicle?.mounted &&
      this.w.extreme.state.vehicle.kind === "rover"
        ? 15
        : 0) +
        this.w.survival.state.equipped.reduce(
          (n, id) =>
            n + (extremeGear[id as keyof typeof extremeGear]?.[key] ?? 0),
          0,
        ),
    );
  }
  update(dt: number) {
    const w = this.w,
      s = w.extreme.state;
    this.weather.update(dt);
    if (
      !extremeIds.includes(w.planetId as ExtremePlanet) ||
      w.region === "ship"
    ) {
      s.temperature = Math.max(0, s.temperature - dt * 8);
      return;
    }
    const cold = this.data.temperature < 0,
      protection = this.protection(cold ? "cold" : "heat");
    const rate = this.sheltered
      ? -15
      : Math.abs(this.data.temperature) < 35
        ? -5
        : (cold
            ? Math.abs(this.data.temperature) / 55
            : this.data.temperature / 100) *
          (1 - protection / 100);
    const factor =
      w.settings.difficulty === "explorer"
        ? 0.6
        : w.settings.difficulty === "veteran"
          ? 1.2
          : 1;
    s.temperature = Math.max(
      0,
      Math.min(100, s.temperature + rate * dt * factor),
    );
    if (this.sheltered)
      w.survival.state.oxygen = Math.min(
        w.survival.oxygen.maximum,
        w.survival.state.oxygen + dt * 10,
      );
    const depth = w.extreme.physics.depth;
    s.pressure = Math.max(
      0,
      Math.min(
        100,
        s.pressure +
          (depth > this.safeDepth ? (depth - this.safeDepth) / 80 : -18) * dt,
      ),
    );
    if (w.planetId === "lunaris") {
      const protection = w.survival.resistance.radiation;
      s.radiation = Math.max(
        0,
        Math.min(
          100,
          s.radiation +
            (this.sheltered
              ? -20
              : (this.weather.active ? 9 : 4) * (1 - protection / 100)) *
              dt,
        ),
      );
    } else s.radiation = Math.max(0, s.radiation - dt * 10);
    this.damageClock -= dt;
    if (this.damageClock <= 0) {
      this.damageClock = 3;
      if (s.pressure > 60) {
        w.toast("수압 위험 · 상승하거나 내압복을 장착하세요");
        w.damage(12 + w.stats.defense, w.player.x, "physical");
      }
      if (s.radiation > 80)
        w.damage(10 + w.stats.defense, w.player.x, "electric");
      if (s.temperature > 75)
        w.damage(10 + w.stats.defense, w.player.x, cold ? "cryo" : "plasma");
    }
    if (w.planetId === "inferno" && !this.sheltered) {
      this.lavaClock -= dt;
      const lava =
        (w.region.endsWith("Wilds") || w.region.endsWith("Depths")) &&
        ((w.player.x > 1050 && w.player.x < 1550) ||
          (w.player.x > 2350 && w.player.x < 2850)) &&
        w.player.y + w.player.h >= 775;
      if (lava && this.lavaClock <= 0) {
        this.lavaClock = 2;
        w.damage(
          (w.survival.state.equipped.includes("magmaBoots") ? 35 : 65) +
            w.stats.defense,
          w.player.x,
          "plasma",
        );
      }
      this.ventClock -= dt;
      if (this.ventClock <= 0) {
        this.ventClock = 12;
        w.sound("vent");
        for (const x of [1400, 2450])
          w.combat.hazard(
            { kind: "rect", x, y: 620, w: 110, h: 160, radius: 0, facing: 1 },
            45,
            "plasma",
            2,
            1,
            "지열 분출 예고",
          );
      }
    }
    if (this.weather.active && !this.sheltered && w.planetId !== "aquaria")
      w.player.x += Math.sin(w.time * 0.3) * this.data.windStrength * dt;
  }
}
