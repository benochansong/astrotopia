import { extremeGear } from "../extreme/catalog";
import type { World } from "../core/world";
import type { ItemId, Landmark } from "../data/content";
import { EnvironmentSystem, OxygenSystem } from "./EnvironmentSystem";
import { ScannerSystem } from "./ScannerSystem";
import { MiningSystem } from "./MiningSystem";
import { ProductionQueueSystem } from "./ProductionQueueSystem";
import { StorageSystem } from "./StorageSystem";
import { ResearchSystem } from "./ResearchSystem";
import {
  CraftingSystem,
  RefinerySystem,
  EquipmentUpgradeSystem,
} from "./CraftingSystem";
import { DiscoverySystem } from "./DiscoverySystem";
import { SentinelSystem } from "./SentinelSystem";
import {
  environmentGear,
  facilities,
  type EnvGearId,
  type Facility,
} from "./catalog";
import { newSurvival, type SurvivalSave } from "./types";
import type { InputFrame } from "../core/types";
export class SurvivalSystem {
  state: SurvivalSave = newSurvival();
  environment: EnvironmentSystem;
  oxygen: OxygenSystem;
  scanner: ScannerSystem;
  mining: MiningSystem;
  production: ProductionQueueSystem;
  storage: StorageSystem;
  research: ResearchSystem;
  crafting: CraftingSystem;
  refinery: RefinerySystem;
  upgrade: EquipmentUpgradeSystem;
  discovery: DiscoverySystem;
  sentinel: SentinelSystem;
  useCooldown = 0;
  constructor(private w: World) {
    this.environment = new EnvironmentSystem(w);
    this.oxygen = new OxygenSystem(w);
    this.scanner = new ScannerSystem(w);
    this.mining = new MiningSystem(w);
    this.production = new ProductionQueueSystem(w);
    this.storage = new StorageSystem(w);
    this.research = new ResearchSystem(w);
    this.crafting = new CraftingSystem(w);
    this.refinery = new RefinerySystem(w);
    this.upgrade = new EquipmentUpgradeSystem(w);
    this.discovery = new DiscoverySystem(w);
    this.sentinel = new SentinelSystem(w);
  }
  get inBase() {
    return (
      (this.w.isColonyRegion || this.w.region === "ship") &&
      (this.w.player.x < 2000 || this.w.colony.unlocked) &&
      !this.w.combat.training &&
      this.w.dead <= 0
    );
  }
  get resistance() {
    const r = {
      toxic: 0,
      radiation: 0,
      unstable: 0,
      oxygen: 0,
      defense: 0,
      efficiency: 0,
      cold: 0,
      heat: 0,
      pressure: 0,
    };
    for (const id of this.state.equipped) {
      const g = environmentGear[id];
      for (const key of [
        "toxic",
        "radiation",
        "unstable",
        "oxygen",
        "defense",
        "efficiency",
      ] as const)
        r[key] += g[key];
      const extreme = extremeGear[id as keyof typeof extremeGear];
      if (extreme) {
        r.cold += extreme.cold;
        r.heat += extreme.heat;
        r.pressure += extreme.pressure;
      }
      if (id === "advanced") {
        r.cold += 25;
        r.heat += 25;
        r.pressure += 25;
      }
    }
    r.efficiency = Math.min(0.7, r.efficiency);
    return r;
  }
  equip(id: EnvGearId) {
    if (!this.state.owned.includes(id) || this.w.combat.training) return false;
    const slot = environmentGear[id].slot;
    this.state.equipped = this.state.equipped.filter(
      (x) => environmentGear[x].slot !== slot,
    );
    this.state.equipped.push(id);
    this.w.emit("save", "environment-gear");
    return true;
  }
  toggle(id: EnvGearId) {
    if (this.w.combat.training) return;
    if (this.state.equipped.includes(id))
      this.state.equipped = this.state.equipped.filter((x) => x !== id);
    else this.equip(id);
    this.state.oxygen = Math.min(this.state.oxygen, this.oxygen.maximum);
    this.w.emit("save", "environment-gear");
  }
  activate(id: Facility) {
    if (!this.inBase) return false;
    if (!this.state.facilities.includes(id)) {
      if (!this.storage.spend(facilities[id].cost)) {
        this.w.toast(
          "시설 수리 재료가 부족합니다. B에서 필요한 재료를 확인하세요.",
        );
        return false;
      }
      this.state.facilities.push(id);
      this.w.count("facility_" + id);
      this.w.sound("craftComplete");
    }
    this.w.count(id);
    if (id === "terminal") {
      this.w.player.hp = this.w.stats.hp;
      this.w.player.energy = this.w.stats.energy;
      this.state.oxygen = this.oxygen.maximum;
      this.state.exposure = { toxic: 0, radiation: 0, unstable: 0 };
      this.w.progress.checkpoint = { region: this.w.baseRegion, x: 300 };
      if (!this.state.scanner) {
        this.state.scanner = true;
        this.state.warehouse.data = 4;
        this.state.warehouse.gel = 2;
        this.state.warehouse.fiber = 6;
        this.w.toast(
          "PIONEER SCANNER · G · 기초 채굴기 T1 확보 · 제작 재료는 창고에 보관했습니다.",
        );
      }
      if (
        this.state.sentinelKills > 0 &&
        !this.w.progress.counters.ancientAnalysis
      ) {
        this.w.count("ancientAnalysis");
        this.discovery.record("고대 기술 분석", 6);
      }
    }
    this.w.emit("save", "facility");
    return true;
  }
  interact(l: Landmark) {
    if (l.kind === "facility") {
      this.w.emit("facility", l.facility ?? "terminal");
      if (l.facility === "terminal" || l.facility === "workbench")
        this.activate(l.facility);
      return true;
    }
    if (l.kind === "portal") {
      if (l.target === "abyss" && !this.w.progress.counters.ruinsRelay) {
        this.w.toast(
          "유적 상층의 첫 신호와 출구 앞 두 번째 신호를 순서대로 정렬하세요.",
        );
        return true;
      }
      if (l.target) {
        this.w.enterRegion(l.target);
        this.environment.grace = 10;
      }
      return true;
    }
    if (l.kind === "relay") {
      if (l.id.endsWith("-a")) {
        this.w.count("relayFirst");
        this.w.toast("첫 신호 정렬 완료 · 출구 앞 두 번째 장치로 연결하세요.");
      } else if (this.w.progress.counters.relayFirst) {
        this.w.count("ruinsRelay");
        this.w.toast("고대 회로 연결 · 심층 에너지 지대 경로 개방");
      } else this.w.toast("상층 첫 신호부터 정렬하세요.");
      return true;
    }
    if (l.kind === "sentinel") {
      this.sentinel.start();
      return true;
    }
    if (l.kind === "beaconSite") {
      this.use("portableBeacon");
      return true;
    }
    return false;
  }
  update(dt: number, input: InputFrame) {
    this.useCooldown = Math.max(0, this.useCooldown - dt);
    this.scanner.update(dt);
    if (input.scan) this.scanner.activate();
    if (input.quick !== undefined) this.use(this.state.quick[input.quick]);
    if (this.w.combat.training) return;
    this.environment.update(dt);
    this.oxygen.update(dt);
    this.sentinel.update(dt);
    if (
      this.w.player.x > 1000 &&
      !this.w.progress.counters["explore_" + this.w.region]
    )
      this.w.count("explore_" + this.w.region);
  }
  use(id: ItemId) {
    const w = this.w,
      s = this.state;
    if (
      this.useCooldown > 0 ||
      w.dead > 0 ||
      w.combat.training ||
      !w.inventory[id]
    )
      return false;
    let used = true;
    if (id === "medicalGel") {
      if (w.player.hp >= w.stats.hp) return false;
      w.player.hp = Math.min(w.stats.hp, w.player.hp + 65);
    } else if (id === "energyCell") {
      if (w.player.energy >= w.stats.energy) return false;
      w.player.energy = Math.min(w.stats.energy, w.player.energy + 60);
    } else if (id === "oxygenCan") {
      if (s.oxygen >= this.oxygen.maximum) return false;
      s.oxygen = Math.min(this.oxygen.maximum, s.oxygen + 90);
    } else if (id === "antitoxin") {
      s.exposure.toxic = Math.max(0, s.exposure.toxic - 65);
      w.combat.playerStatuses = w.combat.playerStatuses.filter(
        (x) => x.id !== "poison",
      );
    } else if (id === "purifier")
      s.exposure.radiation = Math.max(0, s.exposure.radiation - 65);
    else if (id === "recall") {
      if (w.combat.boss.active || this.sentinel.active) {
        w.toast("보스 전투 중에는 긴급 귀환을 사용할 수 없습니다.");
        return false;
      }
      w.inventory[id]!--;
      w.enterRegion(w.baseRegion, 300);
      s.oxygen = this.oxygen.maximum;
      this.environment.grace = 10;
      this.useCooldown = 3;
      w.emit("save", "recall");
      return true;
    } else if (id === "portableBeacon") {
      const l = w.map.landmarks.find(
        (l) => l.kind === "beaconSite" && Math.abs(l.x - w.player.x - 17) < 95,
      );
      if (!l || this.sentinel.active || w.combat.boss.active) {
        w.toast("지도에 표시된 지정 비콘 위치에서만 설치할 수 있습니다.");
        return false;
      }
      s.beacon = { region: w.region, x: l.x };
      w.progress.checkpoint = { ...s.beacon };
      w.toast("임시 체크포인트 설정 · 이전 비콘은 교체됩니다.");
    } else used = false;
    if (!used) return false;
    w.inventory[id]!--;
    this.useCooldown = 3;
    w.sound("heal");
    w.emit("save", "consume");
    return true;
  }
}
