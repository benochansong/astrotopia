import { Endgame } from "./Endgame";
import type { World } from "../core/world";
import type { Landmark, ItemId } from "../data/content";
import type { InputFrame } from "../core/types";
import type { Stats } from "../combat/types";
import { StorageSystem } from "../survival/StorageSystem";
import {
  ancientGear,
  endingNames,
  keyCost,
  moduleCosts,
  moduleNames,
  puzzleSolutions,
  relicNames,
  type AncientModule,
  type Ending,
  type RelicId,
} from "./catalog";
import { newAncient } from "./types";
import { AncientCombat } from "./AncientCombat";
import { createEnemy } from "../combat/EnemyAI";
export class AncientSystem {
  state = newAncient();
  combat: AncientCombat;
  endgame: Endgame;
  openTab = "journey";
  puzzle = -1;
  hint = false;
  storm = 24;
  relicClock = 0;
  procClock = 0;
  constructor(private w: World) {
    this.combat = new AncientCombat(w);
    this.endgame = new Endgame(w);
  }
  fail(text: string) {
    this.w.toast(text);
    return false;
  }
  get records() {
    const w = this.w;
    return [
      w.battle.bossKills > 0 && !!w.progress.counters.coreAnalysis,
      w.space.state.kills > 0 && !!w.progress.counters.foundryArchive,
      ...["leviathan", "helios", "emperor", "archon"].map(
        (id, i) =>
          !!w.extreme.state.kills[id] &&
          w.extreme.state.archives.includes(
            ["frostia", "inferno", "aquaria", "lunaris"][i],
          ),
      ),
    ];
  }
  entryReason() {
    if (!this.records.every(Boolean) || !this.w.progress.counters.genesis)
      return "여섯 보스 처치·행성 기록과 GENESIS 상징 분석 필요";
    if (!this.state.key) return "GENESIS KEY 제작 필요";
    if (!this.w.extreme.state.horizon) return "HORIZON 선체 필요";
    if (this.state.modules.length < 3)
      return "고대 항법·차폐·중력 모듈 3종 필요";
    if (!this.w.survival.state.equipped.includes("ancientExplorerSuit"))
      return "고대 탐험복 장착 필요";
    return "";
  }
  craftKey() {
    const w = this.w;
    if (
      !w.survival.inBase ||
      this.state.key ||
      !this.records.every(Boolean) ||
      !w.progress.counters.genesis ||
      !w.survival.state.technologies.includes("ancientShield")
    )
      return this.fail(
        "안전 기지 · 여섯 기록 · 상징 분석 · 고대 기술 연구 필요",
      );
    if (!w.survival.storage.spend(keyCost))
      return this.fail("열쇠 제작 소재 부족");
    this.state.key = true;
    w.emit("save", "genesis-key");
    return true;
  }
  install(id: string) {
    if (
      !Object.hasOwn(moduleNames, id) ||
      !this.w.survival.inBase ||
      !this.state.key
    )
      return false;
    const key = id as AncientModule;
    if (
      this.state.modules.includes(key) ||
      !this.w.survival.storage.spend(moduleCosts[key])
    )
      return false;
    this.state.modules.push(key);
    this.w.emit("save", "ancient-module");
    return true;
  }
  arrive() {
    if (this.state.visited) return;
    this.state.visited = true;
    this.state.cinematic = { id: "landing", elapsed: 0, replay: false };
    this.w.emit("save", "omega-landing");
  }
  reward(id: ItemId, n: number) {
    const w = this.w;
    if (
      !StorageSystem.add(w.survival.state.warehouse, id, n, w.colony.capacity)
    ) {
      if (!w.collect(id, n)) w.combat.loot.place(w.player.x, w.player.y, id, n);
    }
  }
  get gravity() {
    if (
      this.w.region === "omegaFracture" ||
      this.w.region === "omegaLabyrinth" ||
      (this.combat.phase === 3 && this.combat.boss?.kind === "genesisZero")
    ) {
      const x = this.w.player.x;
      return x < 1800
        ? 0.2
        : x < 3000
          ? this.w.survival.state.equipped.includes("gravityControlBoots")
            ? 1
            : 1.8
          : x < 4000
            ? 0.1
            : 0.7;
    }
    return 0.8;
  }
  localTime(x: number) {
    return this.w.region === "omegaArchive" && x > 1800 && x < 3000 ? 0.55 : 1;
  }
  get sheltered() {
    return (
      this.w.isColonyRegion &&
      this.w.colony.state.buildings.some(
        (b) =>
          b.kind === "gravityField" &&
          this.w.colony.statuses.get(b.id)?.powered &&
          Math.hypot(b.x + 80 - this.w.player.x, b.y - this.w.player.y) < 320,
      )
    );
  }
  get safe() {
    return (
      this.sheltered ||
      this.w.player.x < 650 ||
      this.w.planetId !== "omega" ||
      this.w.region === "ship"
    );
  }
  portalReason(target: string) {
    if (target === "omegaCitadel" && !this.state.kills.aeternumGuardian)
      return "수호자 처치 필요";
    if (target === "omegaCore" && !this.state.kills.nexusOverlord)
      return "넥서스 오버로드 정지 필요";
    return "";
  }
  interact(l: Landmark) {
    const w = this.w;
    if (w.planetId !== "omega") return false;
    if (l.kind === "portal" && l.target) {
      const why = this.portalReason(l.target);
      if (why) this.fail(why);
      else {
        w.enterRegion(l.target);
        w.progress.checkpoint = { region: l.target, x: 350 };
        w.emit("save", "omega-checkpoint");
      }
      return true;
    }
    if (l.id.startsWith("omega-boss-")) {
      this.combat.start(l.id.slice(11));
      return true;
    }
    if (l.id.startsWith("omega-feed-")) {
      if (!this.combat.feed())
        this.fail("전투 중 18초마다 공급 장치를 차단할 수 있습니다.");
      return true;
    }
    if (l.id === "omega-rift") {
      w.player.x = 3600;
      w.player.y = 716;
      w.player.vx = w.player.vy = 0;
      w.player.invulnerable = 2;
      return true;
    }
    if (l.id.startsWith("omega-puzzle-")) {
      this.puzzle = Number(l.id.slice(13));
      this.openTab = "puzzles";
      this.hint = false;
      w.emit("facility", "ancient");
      return true;
    }
    if (l.id.endsWith("-terminal")) {
      this.openTab = "journey";
      if (w.region === "omegaArchive" && !this.state.memories.includes(2))
        this.unlockMemory(2);
      w.emit("facility", "ancient");
      return true;
    }
    return false;
  }
  solve(index: number) {
    const id = this.puzzle;
    if (
      id < 0 ||
      id > 4 ||
      this.state.puzzles.includes(id) ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= puzzleSolutions[id].length
    )
      return false;
    const a = this.state.attempts[id];
    a.push(index);
    if (index !== puzzleSolutions[id][a.length - 1]) {
      this.state.attempts[id] = [];
      this.w.toast("연결 불일치 · 처음부터 다시 시도할 수 있습니다.");
      return false;
    }
    if (a.length === puzzleSolutions[id].length) {
      this.state.puzzles.push(id);
      this.unlockMemory(id);
      this.w.addXp(2400);
      this.reward("memoryData", 2);
      this.w.toast("고대 장치 복구 · 기억 재생 가능");
    }
    this.w.emit("save", "omega-puzzle");
    return true;
  }
  unlockMemory(id: number) {
    if (!this.state.memories.includes(id)) this.state.memories.push(id);
  }
  play(id: string) {
    if (id === "landing" && !this.state.visited) return false;
    if (
      id.startsWith("memory-") &&
      !this.state.memories.includes(Number(id.slice(7)))
    )
      return false;
    if (id.startsWith("ending-") && !this.state.ending) return false;
    if (
      id !== "landing" &&
      !/^memory-[0-4]$/.test(id) &&
      !/^ending-(freedom|harmony|rebirth)$/.test(id)
    )
      return false;
    this.state.cinematic = { id, elapsed: 0, replay: true };
    return true;
  }
  finishFilm() {
    this.state.cinematic = null;
    this.w.emit("save", "omega-film");
  }
  choose(id: string, confirm = false) {
    if (
      !Object.hasOwn(endingNames, id) ||
      !this.state.kills.genesisZero ||
      this.state.ending
    )
      return false;
    if (!confirm) {
      this.state.pending = id as Ending;
      return true;
    }
    if (this.state.pending !== id) return false;
    this.state.ending = id as Ending;
    this.state.pending = null;
    this.state.cinematic = { id: "ending-" + id, elapsed: 0, replay: false };
    this.w.emit("save", "omega-ending");
    return true;
  }
  claimQuest(i: number) {
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i > 13 ||
      this.state.quests.includes(i) ||
      !this.questReady(i)
    )
      return false;
    this.state.quests.push(i);
    this.w.addXp(i < 2 ? 100 : 1000);
    this.w.survival.state.researchPoints += 3;
    this.w.emit("save", "ancient-quest");
    return true;
  }
  questReady(i: number) {
    const s = this.state,
      w = this.w;
    return (
      [
        this.records.every(Boolean) && !!w.progress.counters.genesis,
        s.key && s.modules.length === 3,
        s.visited,
        w.progress.discovered.includes("omegaCity"),
        s.memories.length > 0,
        s.puzzles.includes(1),
        s.memories.length === 5,
        !!s.kills.aeternumGuardian,
        !!s.kills.nexusOverlord,
        w.progress.discovered.includes("omegaCore"),
        !!s.kills.genesisZero,
        !!s.ending,
        !!s.ending && !s.cinematic,
        s.restoration.length === 7,
      ][i] ?? false
    );
  }
  relic(id: string) {
    if (!Object.hasOwn(relicNames, id) || !this.state.visited) return false;
    const key = id as RelicId;
    if (!this.state.relics.includes(key)) {
      if (
        !(key === "omega"
          ? this.state.kills.genesisZero
          : this.records[Object.keys(relicNames).indexOf(key)])
      )
        return false;
      if (
        !this.w.survival.inBase ||
        !this.w.survival.storage.spend({ aeternumAlloy: 2, memoryData: 1 })
      )
        return false;
      this.state.relics.push(key);
    }
    const pos = this.state.equipped.indexOf(key);
    if (pos >= 0) this.state.equipped.splice(pos, 1);
    else if (this.state.equipped.length < 2) this.state.equipped.push(key);
    else return this.fail("유물은 최대 2개 장착할 수 있습니다.");
    this.w.emit("save", "relic");
    return true;
  }
  applyStats(s: Stats) {
    const r = this.state.equipped,
      w = this.w;
    if (r.includes("frostia")) s.regen += 1;
    if (r.includes("omega")) s.regen += 2;
    if (
      r.includes("ares") &&
      ["hammer", "cannon"].includes(w.combat.weapons.id)
    )
      s.attack *= 1.06;
    if (r.includes("lunaris") && !w.player.grounded) s.attack *= 1.06;
    if (r.includes("inferno")) s.elementResist += 0.08;
    const id = w.classes.state.classId;
    if (
      id &&
      Object.values(w.battle.equipment).filter((gid) =>
        w.battle.gear
          .find((g) => g.id === gid)
          ?.template.startsWith("omega_" + id + "_"),
      ).length >= 3
    ) {
      s.attack *= 1.06;
      s.regen += 1;
    }
    if (this.state.ascended) s.regen += 1;
    return s;
  }
  ascend() {
    if (
      this.w.player.level !== 100 ||
      !this.state.ending ||
      this.state.ascended
    )
      return false;
    this.state.ascended = true;
    this.w.emit("save", "ascended-pioneer");
    return true;
  }
  transcend(id: string) {
    const w = this.w,
      g = w.battle.gear.find((g) => g.id === id);
    if (
      !g ||
      !Object.hasOwn(ancientGear, g.template) ||
      !this.state.ending ||
      !w.survival.inBase ||
      g.rarity === "transcendent" ||
      !w.survival.storage.spend({ transcendentAlloy: 3, genesisFragment: 1 })
    )
      return false;
    g.rarity = "transcendent";
    w.emit("save", "transcendent-gear");
    return true;
  }
  restore(id: string) {
    if (
      !Object.hasOwn(relicNames, id) ||
      !this.state.ending ||
      id !== this.w.planetId ||
      !this.w.survival.inBase ||
      this.state.restoration.includes(id as RelicId) ||
      !this.w.survival.state.technologies.includes("civilizationRestoration") ||
      !this.w.survival.storage.spend({ civilizationCore: 1, ironBar: 5 })
    )
      return false;
    this.state.restoration.push(id as RelicId);
    this.w.survival.state.researchPoints += 10;
    this.w.emit("save", "planet-restored");
    return true;
  }
  update(dt: number, input: InputFrame) {
    const w = this.w,
      s = this.state;
    if (s.cinematic) {
      s.cinematic.elapsed += dt;
      const duration =
        s.cinematic.id === "landing"
          ? 30
          : s.cinematic.id.startsWith("ending-")
            ? 75
            : 15;
      if (input.interact || s.cinematic.elapsed >= duration) this.finishFilm();
      return true;
    }
    this.combat.update(dt);
    this.relicClock += dt;
    this.procClock = Math.max(0, this.procClock - dt);
    if (this.relicClock >= 5) {
      this.relicClock = 0;
      if (s.equipped.includes("eden") && !w.dead)
        w.player.hp = Math.min(w.stats.hp, w.player.hp + w.stats.hp * 0.015);
      if (s.equipped.includes("aquaria"))
        w.survival.state.oxygen = Math.min(
          w.survival.oxygen.maximum,
          w.survival.state.oxygen + 3,
        );
    }
    if (w.planetId !== "omega" || this.safe || w.dead) return false;
    if (
      (w.region === "omegaFracture" || w.region === "omegaLabyrinth") &&
      w.player.x > 3000 &&
      w.player.x < 4000
    ) {
      if (input.jumpHeld) w.player.vy = Math.max(-160, w.player.vy - 400 * dt);
      w.player.y = Math.max(-60, w.player.y);
    }
    this.storm -= dt;
    if (this.storm <= 0) {
      this.storm = 24;
      if (!this.combat.boss) {
        this.combat.hazard(
          "양자 폭풍 · 차폐 구역으로 이동",
          w.player.x - 130,
          350,
          260,
          430,
          "electric",
          2.5,
        );
        if (w.enemies.filter((e) => e.hp > 0).length < 10) {
          const d = createEnemy(
            "ancientWatcher",
            Math.min(4900, w.player.x + 500),
            650,
            29700 + Math.floor(w.time),
          );
          d.noLoot = true;
          w.enemies.push(d);
        }
      }
    }
    if (
      w.survival.environment.grace <= 0 &&
      !w.survival.state.equipped.includes("quantumShieldCore") &&
      !w.survival.state.equipped.includes("phaseStabilizer")
    )
      w.player.energy = Math.max(0, w.player.energy - dt * 1.5);
    return false;
  }
}
