import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import type { Element } from "../combat/types";
import { createEnemy } from "../combat/EnemyAI";
import { StatusEffectSystem } from "../combat/StatusEffectSystem";
import { ancientEnemies, type AncientEnemy } from "./regions";
export class AncientCombat {
  boss: Enemy | null = null;
  phase = 1;
  core = 0;
  timer = 2;
  pattern = 0;
  elapsed = 0;
  transcendent = false;
  feedCooldown = 0;
  coreDelay = 0;
  constructor(private w: World) {}
  get platforms() {
    return this.boss?.kind === "nexusOverlord" && this.phase >= 2
      ? [
          {
            x: 3700 + Math.sin(this.w.time) * 80,
            y: 610,
            w: 200,
            h: 18,
            oneWay: true,
          },
          {
            x: 4200 + Math.sin(this.w.time + 2) * 80,
            y: 470,
            w: 200,
            h: 18,
            oneWay: true,
          },
        ]
      : [];
  }
  start(id: string, transcendent = false) {
    const w = this.w,
      o = w.omega;
    const required: Record<string, string> = {
      aeternumGuardian: "omegaCity",
      nexusOverlord: "omegaCitadel",
      genesisZero: "omegaCore",
    };
    if (
      this.boss ||
      w.dead ||
      w.region !== required[id] ||
      w.player.x < 3500 ||
      o.state.cinematic
    )
      return false;
    if (
      id === "nexusOverlord" &&
      (!o.state.kills.aeternumGuardian || o.state.puzzles.length < 5)
    )
      return o.fail("수호자와 다섯 고대 장치의 기록이 필요합니다.");
    if (id === "genesisZero" && !o.state.kills.nexusOverlord)
      return o.fail("넥서스 오버로드를 먼저 정지시키세요.");
    if (transcendent && !o.state.ending) return false;
    this.abort();
    this.transcendent = transcendent;
    this.boss = createEnemy(
      id as AncientEnemy,
      4400,
      780,
      29000,
      undefined,
      w.settings.difficulty,
    );
    this.boss.shield = this.boss.maxHp * 0.06;
    if (transcendent)
      this.boss.hp = this.boss.maxHp = Math.round(this.boss.maxHp * 1.25);
    w.enemies = w.enemies.filter((e) => e.x < 3300);
    w.enemies.push(this.boss);
    w.progress.checkpoint = { region: w.region, x: 350 };
    w.toast(
      "ECHO · 표시된 공격을 피한 뒤 코어 노출에 반격하세요. F 공급 장치: 보호막 차단",
    );
    return true;
  }
  abort() {
    this.boss = null;
    this.phase = 1;
    this.core = 0;
    this.timer = 2;
    this.pattern = 0;
    this.elapsed = 0;
    this.feedCooldown = 0;
    this.coreDelay = 0;
    this.transcendent = false;
  }
  feed() {
    if (!this.boss || this.feedCooldown > 0) return false;
    this.boss.shield = 0;
    this.core = 4;
    this.feedCooldown = 18;
    this.w.player.energy = Math.min(
      this.w.stats.energy,
      this.w.player.energy + 35,
    );
    return true;
  }
  hazard(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
    element: Element = "electric",
    delay = 1.3,
  ) {
    this.w.combat.hazard(
      { kind: "rect", x, y, w: width, h: height, facing: 1, radius: 0 },
      this.boss ? 125 : 90,
      element,
      delay,
      0.45,
      label,
    );
  }
  update(dt: number) {
    const w = this.w,
      e = this.boss;
    if (!e) return;
    if (w.dead) {
      this.abort();
      return;
    }
    if (e.hp <= 0) {
      const id = e.kind,
        first = !w.omega.state.kills[id];
      w.omega.state.kills[id] = (w.omega.state.kills[id] ?? 0) + 1;
      if (first) {
        w.addXp(id === "genesisZero" ? 14000 : 5000);
        w.survival.state.researchPoints += 15;
        w.omega.reward("genesisFragment", id === "genesisZero" ? 6 : 3);
      } else if (this.transcendent) w.omega.reward("genesisFragment", 2);
      if (id === "genesisZero" && !w.omega.state.ending)
        w.omega.openTab = "ending";
      w.combat.hazards = [];
      w.enemies = w.enemies.filter((n) => !n.noLoot);
      this.abort();
      w.player.hp = w.stats.hp;
      w.player.energy = w.stats.energy;
      w.toast("프로토콜 정지 · 기록과 귀환 지점 저장");
      w.emit("save", "omega-boss");
      if (id === "genesisZero" && !w.omega.state.ending)
        w.emit("facility", "ancient");
      return;
    }
    if (this.coreDelay > 0) {
      this.coreDelay = Math.max(0, this.coreDelay - dt);
      if (!this.coreDelay) this.core = 4;
    }
    this.elapsed += dt;
    this.core = Math.max(0, this.core - dt);
    this.feedCooldown = Math.max(0, this.feedCooldown - dt);
    e.flash = Math.max(0, e.flash - dt);
    const ratio = e.hp / e.maxHp,
      next =
        e.kind === "genesisZero"
          ? ratio > 0.8
            ? 1
            : ratio > 0.6
              ? 2
              : ratio > 0.4
                ? 3
                : ratio > 0.15
                  ? 4
                  : 5
          : e.kind === "nexusOverlord"
            ? ratio > 0.65
              ? 1
              : ratio > 0.3
                ? 2
                : 3
            : ratio > 0.5
              ? 1
              : 2;
    if (next !== this.phase) {
      this.phase = next;
      w.player.energy = Math.min(w.stats.energy, w.player.energy + 30);
      w.player.hp = Math.min(w.stats.hp, w.player.hp + w.stats.hp * 0.1);
      w.combat.hazards = [];
      w.enemies = w.enemies.filter((n) => !n.noLoot);
      this.core = 4;
      this.timer = 4;
      w.toast(`PHASE ${next} · 에너지 회복 발판: x 3450`);
    }
    if (w.player.x < 3650) {
      w.player.energy = Math.min(w.stats.energy, w.player.energy + 12 * dt);
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const n = this.pattern++,
      x = w.player.x,
      phase = this.phase;
    this.timer = 4.6;
    this.core = 0;
    if (e.kind === "aeternumGuardian") {
      for (let j = 0; j < 4; j++)
        this.hazard(
          "수호자의 네 팔 · 지면 강타",
          3550 + j * 350,
          725,
          160,
          55,
          "gravity",
          1.4 + j * 0.2,
        );
      if (n % 3 === 0) e.shield = Math.min(2200, e.shield + 1200);
      this.core = 3;
    } else if (e.kind === "nexusOverlord") {
      this.hazard(
        phase === 1
          ? "방어 광선"
          : phase === 2
            ? "공간 균열"
            : "과부하 · 코어 노출",
        x - 55,
        450,
        130,
        330,
        "gravity",
        1.5,
      );
      if (phase > 1)
        this.hazard("교차 균열", x + 280, 530, 130, 250, "electric", 1.8);
      if (
        phase === 2 &&
        n % 3 === 0 &&
        w.enemies.filter((e) => e.noLoot && e.hp > 0).length < 2
      ) {
        const d = createEnemy("ancientWatcher", 4100, 600, 29600 + n);
        d.noLoot = true;
        d.hp = d.maxHp = 850;
        w.enemies.push(d);
      }
      if (phase === 3) {
        w.player.vx += Math.sign(e.x - x) * 70;
        this.core = 3.3;
      }
    } else {
      if (phase === 1) {
        for (let j = 0; j < 3; j++)
          this.hazard(
            "기동 · 다중 광선",
            x - 250 + j * 250,
            430,
            90,
            350,
            "electric",
            1.3 + j * 0.2,
          );
      }
      if (phase === 2) {
        const element: Element[] = ["toxic", "plasma", "cryo", "electric"];
        this.hazard(
          "행성 원소 재현 · " + element[n % 4],
          x - 140,
          700,
          280,
          80,
          element[n % 4],
          1.6,
        );
      }
      if (phase === 3) {
        this.hazard(
          "중력 붕괴 · 안전 틈으로 이동",
          x - 70,
          350,
          140,
          430,
          "gravity",
          1.6,
        );
        if (n % 2 === 0) e.x = e.x > 4200 ? 4000 : 4500;
      }
      if (phase === 4) {
        e.shield = Math.min(2400, e.shield + 900);
        this.hazard(
          "다중 방어망 · F 공급 차단",
          3500,
          650,
          1250,
          45,
          "electric",
          1.6,
        );
        if (w.enemies.filter((n) => n.noLoot && n.hp > 0).length < 3) {
          const drone = createEnemy(
            "ancientWatcher",
            3900 + (n % 3) * 240,
            600,
            29500 + n,
          );
          drone.noLoot = true;
          drone.hp = drone.maxHp = 850;
          w.enemies.push(drone);
        }
      }
      if (phase === 5) {
        this.hazard(
          "최종 NOVA · 왼쪽 차폐 발판으로 대피",
          3750,
          180,
          1450,
          600,
          "plasma",
          2.5,
        );
        this.timer = 7;
      }
      // Every telegraphed attack has a delayed, predictable counter window.
      if (n % 2 === 1 || phase === 5) {
        this.core = 0;
        this.coreDelay = phase === 5 ? 3 : 1.8;
      }
    }
    if (this.transcendent)
      this.hazard(
        "초월 · 지연 교차 추적",
        x + 180,
        400,
        100,
        380,
        "gravity",
        2.2,
      );
  }
  enemy(e: Enemy, dt: number) {
    if (!Object.hasOwn(ancientEnemies, e.kind)) return false;
    if (
      e === this.boss ||
      ["aeternumGuardian", "nexusOverlord", "genesisZero"].includes(e.kind)
    )
      return true;
    const w = this.w,
      d = ancientEnemies[e.kind as AncientEnemy];
    dt *= w.omega.localTime(e.x);
    if (e.state === "Death") {
      e.timer -= dt;
      if (e.timer <= 0 && !e.noLoot)
        Object.assign(e, createEnemy(e.kind, e.homeX, e.homeY + d.h, e.id));
      return true;
    }
    e.flash = Math.max(0, e.flash - dt);
    e.timer -= dt;
    StatusEffectSystem.tick(e.statuses, dt, (damage, id) =>
      w.combat.hit(
        e,
        {
          damage,
          element: id === "poison" ? "toxic" : "electric",
          crit: 0,
          critDamage: 1,
          knockback: 0,
          statusChance: 0,
          special: true,
          sourceX: w.player.x,
        },
        false,
        true,
      ),
    );
    if (e.hp <= 0 || StatusEffectSystem.speed(e.statuses) === 0) return true;
    const distance = Math.abs(w.player.x - e.x);
    if (distance > 1100) return true;
    if (!w.battle.discovered.includes(e.kind)) w.battle.discovered.push(e.kind);
    e.facing = Math.sign(w.player.x - e.x) || 1;
    if (distance > 230)
      e.x += e.facing * d.speed * dt * StatusEffectSystem.speed(e.statuses);
    if (d.flying) e.y = e.homeY - 65 + Math.sin(w.time * 2 + e.id) * 55;
    if (e.timer > 0) return true;
    e.timer = 3.5;
    e.action++;
    if (e.kind === "phaseStalker") {
      e.x = Math.max(800, Math.min(4900, w.player.x - e.facing * 180));
      w.burst(e.x, e.y, "#c9adf6", 10);
    }
    if (e.kind === "nexusHunter") {
      e.x += e.facing * 120;
      e.timer = 2.5;
    }
    if (e.kind === "quantumWraith" || e.kind === "archiveDefender")
      e.shield = e.action % 3 === 0 ? 700 : 0;
    if (e.kind === "aeternumGolem") e.shield = e.action % 2 ? 500 : 0;
    if (
      e.kind === "genesisEnforcer" &&
      e.action % 3 === 0 &&
      w.enemies.filter((n) => n.noLoot && n.hp > 0).length < 2
    ) {
      const drone = createEnemy(
        "ancientWatcher",
        e.x + 100,
        650,
        29800 + e.action,
      );
      drone.noLoot = true;
      drone.hp = drone.maxHp = 650;
      w.enemies.push(drone);
    }
    const beam = ["archiveDefender", "genesisEnforcer"].includes(e.kind),
      wave = ["gravitySentinel", "aeternumGolem"].includes(e.kind);
    this.hazard(
      e.kind === "genesisEnforcer"
        ? "적응 제압 광선"
        : wave
          ? "중력 파동"
          : beam
            ? "방어 광선"
            : "고대 추적탄",
      beam ? Math.min(e.x, w.player.x) : w.player.x - 55,
      wave ? 725 : w.player.y + 10,
      beam ? distance + 100 : wave ? 240 : 110,
      wave ? 55 : 60,
      e.kind === "gravitySentinel" ? "gravity" : "electric",
      1.2,
    );
    return true;
  }
}
