import type { World } from "../core/world";
import type { Platform, ItemId } from "../data/content";
import { createEnemy } from "../combat/EnemyAI";
import { StatusEffectSystem } from "../combat/StatusEffectSystem";
import { extremeEnemies, type ExtremeEnemy } from "./regions";
import type { Enemy } from "../core/types";
const bosses = ["leviathan", "helios", "emperor", "archon"];
const tactics: Record<
  string,
  {
    name: string;
    mode?: string;
    count?: number;
    wait?: number;
    dash?: number;
    teleport?: boolean;
    shield?: boolean;
  }
> = {
  glowJelly: { name: "발광 전기 구체", mode: "orb" },
  coralHunter: { name: "산호 돌진", dash: 200 },
  hydroManta: { name: "해류 충격파", mode: "beam" },
  abyssShark: { name: "심해 연속 돌진", dash: 300, count: 2 },
  crystalOctopus: { name: "수정 촉수", count: 3 },
  deepWraith: { name: "심해 위상탄", mode: "orb", teleport: true },
  pressureCrab: { name: "고압 방어막", mode: "orb", shield: true },
  atlantisGuardian: { name: "아틀란티스 광선", mode: "beam", count: 2 },
  voidWisp: { name: "공허 구체", mode: "orb" },
  meteorCrawler: { name: "운석 파편", count: 3 },
  gravityHunter: { name: "중력 추격", dash: 250 },
  cosmicManta: { name: "우주 에너지 파동", mode: "beam" },
  phasePhantom: { name: "위상 전이", teleport: true, mode: "orb" },
  lunarGolem: { name: "월면 충격파", count: 4 },
  quantumDrone: { name: "양자 교차 광선", mode: "beam", count: 2 },
  nexusGuardian: { name: "중력 보호막", shield: true, mode: "orb", count: 3 },
  frostSlime: { name: "냉기 도약", dash: 110 },
  iceCrawler: { name: "얼음 미끄럼 돌진", dash: 190 },
  glacialWolf: { name: "연속 추격", count: 2, wait: 0.9 },
  auroraWisp: { name: "오로라 구체", mode: "orb" },
  frozenGolem: { name: "빙하 강타", count: 3, wait: 1.8 },
  cryoSentinel: { name: "냉각 광선", mode: "beam", shield: true },
  magmaSlime: { name: "열에너지 도약", dash: 130 },
  obsidianCrawler: { name: "흑요석 돌진", dash: 300, wait: 1.7 },
  lavaSerpent: { name: "용암 기습", teleport: true },
  ashPhantom: { name: "화산재 위상탄", teleport: true, mode: "orb" },
  infernalBeast: { name: "화염 연속파", dash: 150, count: 3, wait: 1.6 },
  thermalGolem: { name: "대지 과열", count: 4, wait: 2 },
  heliosDrone: { name: "발전 광선", mode: "beam", wait: 1.5 },
  reactorGuardian: {
    name: "보호막 코어 폭발",
    mode: "orb",
    count: 2,
    shield: true,
    wait: 1.8,
  },
};
export class ExtremeCombat {
  boss: Enemy | null = null;
  pattern = 0;
  phase = 1;
  timer = 2;
  core = 0;
  cooling = 0;
  coolingCooldown = 0;
  platforms: Platform[] = [];
  private coreDelay = 0;
  constructor(private w: World) {}
  start(id: string) {
    const w = this.w;
    if (
      this.boss ||
      !w.region.endsWith("Ruins") ||
      w.player.x < 3700 ||
      !Object.hasOwn(extremeEnemies, id) ||
      !bosses.includes(id)
    )
      return false;
    if (
      id === "archon" &&
      [0, 1, 2].some((n) => !w.progress.counters["gravity_" + n])
    ) {
      w.toast("중력 제어 스위치 3개를 활성화하세요.");
      return false;
    }
    this.boss = createEnemy(
      id as ExtremeEnemy,
      4300,
      w.planetId === "aquaria" ? 2100 : 780,
      19000,
      undefined,
      w.settings.difficulty,
    );
    w.enemies.push(this.boss);
    this.pattern = 0;
    this.timer = 2;
    w.space.once("seen_" + id);
    return true;
  }
  abort() {
    this.boss = null;
    this.platforms = [];
    this.core = 0;
    this.coreDelay = 0;
    this.cooling = 0;
  }
  attack(e: Enemy, label: string, mode = "ground", count = 1, delay = 1.2) {
    const w = this.w,
      element =
        w.planetId === "inferno"
          ? "plasma"
          : w.planetId === "aquaria" || w.planetId === "lunaris"
            ? "electric"
            : "cryo";
    for (let i = 0; i < count; i++)
      w.combat.hazard(
        {
          kind: mode === "orb" ? "circle" : "rect",
          x:
            mode === "beam"
              ? Math.min(w.player.x, e.x)
              : w.player.x - 40 + (i - (count - 1) / 2) * 180,
          y:
            mode === "ground" &&
            w.planetId !== "aquaria" &&
            w.planetId !== "lunaris"
              ? 730
              : w.player.y + 20,
          w: mode === "beam" ? Math.abs(e.x - w.player.x) + 150 : 150,
          h: mode === "ground" ? 50 : 40,
          radius: mode === "orb" ? 90 : 0,
          facing: e.facing,
        },
        extremeEnemies[e.kind as ExtremeEnemy].damage *
          (this.cooling > 0 && e.kind === "helios" ? 0.55 : 1),
        element,
        delay + i * 0.2,
        0.4,
        label,
        element === "cryo" ? "chill" : undefined,
      );
  }
  enemy(e: Enemy, dt: number) {
    if (!Object.hasOwn(extremeEnemies, e.kind)) return false;
    if (e === this.boss || bosses.includes(e.kind)) return true;
    const d = extremeEnemies[e.kind as ExtremeEnemy],
      w = this.w;
    if (e.hp <= 0) {
      e.timer -= dt;
      if (e.timer <= 0 && !e.noLoot)
        Object.assign(
          e,
          createEnemy(
            e.kind,
            e.homeX,
            e.homeY + d.h,
            e.id,
            e.elite,
            w.settings.difficulty,
          ),
        );
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
    if (StatusEffectSystem.speed(e.statuses) === 0) return true;
    const distance = Math.hypot(w.player.x - e.x, w.player.y - e.y);
    if (distance > 1200) return true;
    if (distance < 500 && !w.battle.discovered.includes(e.kind)) {
      w.battle.discovered.push(e.kind);
      w.space.once("creature_" + w.planetId);
    }
    e.facing = Math.sign(w.player.x - e.x) || 1;
    const t = tactics[e.kind];
    if (!t) return true;
    if (e.timer > 0) {
      if (e.state === "Chase") {
        e.x += e.facing * d.speed * dt * StatusEffectSystem.speed(e.statuses);
        if (w.planetId === "aquaria" || w.planetId === "lunaris")
          e.y += Math.sign(w.player.y - e.y) * d.speed * 0.65 * dt;
        else if (d.flying) e.y = e.homeY - 80 + Math.sin(w.time * 2) * 60;
      }
      return true;
    }
    if (e.state === "PrepareAttack") {
      e.state = "Chase";
      e.timer = e.kind === "glacialWolf" ? 1.4 : 2.8;
      e.x = Math.max(
        500,
        Math.min(w.map.width - 180, e.x + e.facing * (t.dash ?? 0)),
      );
      if (t.teleport) {
        e.x = Math.max(
          500,
          Math.min(w.map.width - 180, w.player.x + e.facing * 160),
        );
        w.burst(e.x, e.y, d.color, 12);
      }
      if (t.shield) e.shield = 0;
      return true;
    }
    e.y = d.flying ? e.y : e.homeY;
    e.state = "PrepareAttack";
    e.timer = t.wait ?? 1.3;
    this.attack(e, t.name, t.mode ?? "ground", t.count ?? 1, e.timer);
    if (t.shield) e.shield = 150;
    return true;
  }
  update(dt: number) {
    this.cooling = Math.max(0, this.cooling - dt);
    this.coolingCooldown = Math.max(0, this.coolingCooldown - dt);
    const e = this.boss,
      w = this.w;
    if (!e) return;
    if (w.dead || !w.region.endsWith("Ruins")) {
      this.abort();
      return;
    }
    if (e.hp <= 0) {
      const first = !w.extreme.state.kills[e.kind];
      w.extreme.state.kills[e.kind] = (w.extreme.state.kills[e.kind] ?? 0) + 1;
      w.space.once("kill_" + e.kind);
      const rewards: Record<string, [ItemId, ItemId, ItemId, ItemId]> = {
        leviathan: [
          "glacialCore",
          "superconductor",
          "infernoNav",
          "ancientResearch",
        ],
        helios: ["heliosCore", "ultraAlloy", "deepData", "engineParts"],
        emperor: [
          "abyssalCore",
          "pressureAlloy",
          "zeroGBlueprint",
          "marineAlloy",
        ],
        archon: [
          "voidArchonCore",
          "quantumCell",
          "omegaCoordinates",
          "longNav",
        ],
      };
      const r = rewards[e.kind];
      w.combat.loot.place(
        4450,
        e.y + extremeEnemies[e.kind as ExtremeEnemy].h / 2,
        r[0],
      );
      w.combat.loot.place(
        4490,
        e.y + extremeEnemies[e.kind as ExtremeEnemy].h / 2,
        r[1],
        first ? 8 : 3,
      );
      if (first && e.kind === "archon") {
        w.battle.titles.push("극한 세계의 개척자");
        w.battle.story.push("omegaCoordinates");
      }
      if (first) {
        w.combat.loot.place(
          4520,
          e.y + extremeEnemies[e.kind as ExtremeEnemy].h / 2,
          r[2],
        );
        w.combat.loot.place(
          4550,
          e.y + extremeEnemies[e.kind as ExtremeEnemy].h / 2,
          r[3],
          4,
        );
        w.combat.loot.place(
          4580,
          e.y + extremeEnemies[e.kind as ExtremeEnemy].h / 2,
          undefined,
          1,
          w.combat.loot.gear(e.kind === "archon" ? "legendary" : "epic"),
        );
      }
      w.addXp(first ? (e.kind === "helios" ? 6000 : 4000) : 800);
      this.abort();
      w.emit("save", "extreme-boss");
      return;
    }
    e.flash = Math.max(0, e.flash - dt);
    this.core = Math.max(0, this.core - dt);
    if (this.coreDelay > 0) {
      this.coreDelay -= dt;
      if (this.coreDelay <= 0) this.core = 2.5;
    }
    this.phase = e.hp / e.maxHp > 0.7 ? 1 : e.hp / e.maxHp > 0.35 ? 2 : 3;
    this.timer -= dt;
    if (this.timer > 0) return;
    if (e.kind === "helios") {
      const names = [
        "기계 팔 강타",
        "열에너지 탄막",
        "대지 충격파",
        "짧은 플라즈마 광선",
        "용암 분출",
        "화산재 장막",
        "과열 에너지 광선",
        "냉각 장치 과부하",
        "기계 드론 호출",
        "광역 열 폭발",
        "연속 플라즈마",
        "지면 융해",
        "코어 대방출",
      ];
      const from = this.phase === 1 ? 0 : this.phase === 2 ? 4 : 9,
        n = from + (this.pattern++ % (this.phase === 2 ? 5 : 4));
      this.attack(
        e,
        names[n],
        [3, 6, 10].includes(n) ? "beam" : n === 12 ? "orb" : "ground",
        [1, 2, 4, 9, 11].includes(n) ? 3 : 1,
        n >= 9 ? 2 : 1.4,
      );
      if (n === 5) w.extreme.state.weather.inferno = 140;
      if (n === 7) this.cooling = Math.max(0, this.cooling - 4);
      if (n === 8 && w.enemies.filter((e) => e.hp > 0).length < 14)
        w.enemies.push(
          createEnemy("heliosDrone", 4100, 640, 20000 + this.pattern),
        );
      this.coreDelay = 2.6;
    } else if (e.kind === "emperor" || e.kind === "archon") {
      const water = e.kind === "emperor",
        names = water
          ? [
              "촉수 연타",
              "음파 방출",
              "심해 돌진",
              "심해 구체",
              "해류 반전",
              "심해 소용돌이",
              "다중 촉수",
              "수호 생물 호출",
              "고압 충격파",
              "폭풍 해류",
              "심해 코어 방출",
            ]
          : [
              "중력 충격파",
              "공허 탄막",
              "위상 돌진",
              "궤도 구체",
              "중력장 변화",
              "부유 지형 이동",
              "양자 수호자 호출",
              "중력 흡인",
              "확장 중력 고리",
              "다중 궤도탄",
              "공허 코어 방출",
            ];
      const n =
        (this.phase === 1 ? 0 : this.phase === 2 ? 4 : 8) +
        (this.pattern++ % (this.phase === 1 || this.phase === 2 ? 4 : 3));
      this.attack(
        e,
        names[n],
        n % 3 === 0 ? "beam" : "orb",
        n >= 8 ? 3 : 2,
        1.8,
      );
      if (n === 2) {
        e.x = Math.max(3900, Math.min(4700, w.player.x + 250));
        e.y = w.player.y - 100;
      }
      if (n === 4) w.extreme.state.weather[w.planetId] = 140;
      if (n === 6 && !water)
        this.platforms = [
          { x: 3900, y: 540, w: 220, h: 25, oneWay: true },
          { x: 4350, y: 380, w: 200, h: 25, oneWay: true },
        ];
      if (n === 7 && w.enemies.filter((e) => e.hp > 0).length < 14)
        w.enemies.push(
          createEnemy(
            water ? "glowJelly" : "quantumDrone",
            4100,
            w.player.y,
            21000 + this.pattern,
          ),
        );
      this.coreDelay = 2.6;
    } else {
      const n = this.pattern++ % 6;
      this.attack(
        e,
        [
          "빙정 탄막",
          "지면 빙결",
          "얼음 기둥",
          "눈보라",
          "냉기 광선",
          "빙하 균열",
        ][n],
        n === 4 ? "beam" : n === 0 ? "orb" : "ground",
        n === 0 || n === 5 ? 3 : 1,
        this.phase === 3 ? 1.1 : 1.5,
      );
      if (n === 2)
        this.platforms = [
          { x: 3900, y: 625, w: 180, h: 25, oneWay: true },
          { x: 4300, y: 570, w: 160, h: 25, oneWay: true },
        ];
      if (n === 3) w.extreme.state.weather[w.planetId] = 140;
      if (n === 5) this.platforms = [];
      this.coreDelay = 2.1;
    }
    this.timer = this.phase === 1 ? 5.5 : 4.5;
  }
}
