import type { World } from "../core/world";
import { environments, regionEnvironment } from "./catalog";
export class EnvironmentSystem {
  grace = 8;
  warning = 0;
  damageClock = 0;
  pulse = 10;
  last = "safe";
  constructor(private w: World) {}
  get kind() {
    return regionEnvironment(this.w.region, this.w.player.x, this.w.player.y);
  }
  get data() {
    return environments[this.kind];
  }
  get deficit() {
    const r = this.w.survival.resistance;
    return Math.max(
      0,
      this.data.resistance -
        (this.kind === "toxic"
          ? r.toxic
          : this.kind === "radiation"
            ? r.radiation
            : this.kind === "unstable"
              ? r.unstable
              : 0),
    );
  }
  update(dt: number) {
    const w = this.w,
      s = w.survival.state,
      k = this.kind;
    this.grace = Math.max(0, this.grace - dt);
    this.warning = Math.max(0, this.warning - dt);
    if (k !== this.last) {
      this.last = k;
      if (k !== "safe") {
        this.grace = Math.max(this.grace, 6);
        w.toast(
          `${this.data.icon} ${this.data.name} · 권장: ${this.data.hint} · 보호 유예 6초`,
        );
        w.sound("environmentWarning");
      }
      w.survival.discovery.record("환경 분석 · " + this.data.name, 2);
    }
    for (const id of ["toxic", "radiation", "unstable"] as const) {
      const rate = id === k && this.grace === 0 ? this.deficit * 0.16 : -9;
      s.exposure[id] = Math.max(0, Math.min(100, s.exposure[id] + rate * dt));
    }
    if (k === "unstable" && this.grace === 0) {
      this.pulse -= dt;
      if (this.pulse <= 2 && this.pulse + dt > 2 && this.deficit > 0)
        w.toast("ϟ 에너지 폭발 예고 · 표시 범위를 벗어나세요.");
      if (this.pulse <= 0) {
        this.pulse = 12;
        if (this.deficit > 0)
          w.combat.hazard(
            {
              kind: "circle",
              x: w.player.x + 17,
              y: 750,
              radius: 90,
              w: 0,
              h: 0,
              facing: 1,
            },
            10 + this.deficit * 0.25,
            "electric",
            1.8,
            0.3,
            "환경 에너지 폭발",
          );
      }
      w.player.energy = Math.max(0, w.player.energy - dt * this.deficit * 0.09);
    }
    this.damageClock -= dt;
    if (this.damageClock <= 0) {
      this.damageClock = 2.5;
      if (s.exposure.toxic >= 65 || s.exposure.radiation >= 65)
        w.damage(6 + w.stats.defense, w.player.x, "toxic");
    }
    if (this.warning === 0 && Object.values(s.exposure).some((n) => n >= 50)) {
      this.warning = 15;
      w.toast("환경 노출 증가 · 안전 지대 또는 대응 장비를 확인하세요.");
      w.sound("environmentWarning");
    }
  }
}
export class OxygenSystem {
  clock = 0;
  warn = 0;
  constructor(private w: World) {}
  get maximum() {
    return 100 + this.w.survival.resistance.oxygen;
  }
  update(dt: number) {
    const s = this.w.survival.state,
      k = this.w.survival.environment.kind;
    this.warn = Math.max(0, this.warn - dt);
    const rate =
      k === "hypoxia"
        ? -(1 - this.w.survival.resistance.efficiency) * 1.1
        : k === "toxic" && this.w.survival.environment.deficit > 0
          ? -0.45
          : 8;
    if (rate < 0 && this.w.survival.environment.grace > 0) return;
    s.oxygen = Math.max(0, Math.min(this.maximum, s.oxygen + rate * dt));
    if (s.oxygen / this.maximum <= 0.2 && this.warn === 0) {
      this.warn = 15;
      this.w.toast("O₂ 산소 20% 이하 · 산소통 사용 또는 안전 지대로 귀환");
      this.w.sound("oxygenWarning");
    }
    this.clock -= dt;
    if (s.oxygen === 0 && this.clock <= 0) {
      this.clock = 2.5;
      this.w.damage(8 + this.w.stats.defense, this.w.player.x, "physical");
    }
  }
}
