import { EquipmentSystem } from "../combat/EquipmentSystem";
import type { GearSlot } from "../combat/types";
import { VehicleSystem } from "./VehicleSystem";
import { PlanetPhysicsSystem } from "./PlanetPhysicsSystem";
import { environmentGear, type EnvGearId } from "../survival/catalog";
import { planetIds, type PlanetId } from "../space/catalog";
import type { World } from "../core/world";
import type { InputFrame } from "../core/types";
import type { Landmark } from "../data/content";
import { newExtreme, type ExtremeSave } from "./types";
import { PlanetEnvironmentSystem } from "./Environment";
import { ExtremeCombat } from "./ExtremeCombat";
import { extremeIds, extremePlanets, type ExtremePlanet } from "./catalog";
export class ExtremeSystem {
  state = newExtreme();
  vehicles: VehicleSystem;
  environment: PlanetEnvironmentSystem;
  physics: PlanetPhysicsSystem;
  combat: ExtremeCombat;
  constructor(private w: World) {
    this.vehicles = new VehicleSystem(w);
    this.physics = new PlanetPhysicsSystem(w);
    this.environment = new PlanetEnvironmentSystem(w);
    this.combat = new ExtremeCombat(w);
  }
  initialize(save?: ExtremeSave) {
    if (save) this.state = structuredClone(save);
    this.state.temperature = Math.min(30, this.state.temperature);
    this.state.pressure = 0;
    if (this.state.vehicle) this.state.vehicle.mounted = false;
    this.state.jetEnergy = Math.max(50, this.state.jetEnergy);
  }
  get active() {
    return (
      extremeIds.includes(this.w.planetId as ExtremePlanet) &&
      this.w.region !== "ship"
    );
  }
  get friction() {
    return this.w.planetId === "frostia" &&
      !this.w.survival.state.equipped.includes("iceBoots")
      ? this.w.settings.iceAssist
        ? 0.6
        : 0.15
      : 1;
  }
  update(dt: number, input: InputFrame) {
    this.environment.update(dt);
    this.vehicles.update(dt);
    if (input.vehicle) this.vehicles.toggle();
    if (!this.active) return;
    this.combat.update(dt);
    if (
      this.state.archives.length === 4 &&
      this.state.kills.archon &&
      !this.w.progress.counters.genesis
    ) {
      this.w.space.once("genesis");
      this.w.toast(
        "GENESIS · 우리는 아직 끝나지 않았다. OMEGA 좌표가 확인되었습니다.",
      );
    }
    if (input.jump && this.w.planetId === "lunaris") this.w.sound("jet");
    if (input.jump && this.w.planetId === "aquaria") this.w.sound("swim");
    if (input.jump) this.w.space.once("move_" + this.w.planetId);
  }
  rechargeJet() {
    const w = this.w;
    if (
      w.planetId !== "lunaris" ||
      this.state.jetEnergy >= 100 ||
      !w.survival.storage.spend({ energyCell: 1 })
    )
      return false;
    this.state.jetEnergy = Math.min(100, this.state.jetEnergy + 50);
    w.emit("save", "jet-charge");
    return true;
  }
  upgradeHorizon() {
    const w = this.w;
    if (
      !w.space.docked ||
      this.state.horizon ||
      !this.state.kills.leviathan ||
      !w.survival.state.technologies.includes("thermalEngineering")
    )
      return false;
    if (
      !w.survival.storage.spend({
        cryoAlloy: 4,
        superCircuit: 2,
        advancedBattery: 2,
        titaniumBar: 4,
      })
    )
      return false;
    this.state.horizon = true;
    w.space.once("horizon");
    w.emit("save", "horizon");
    return true;
  }
  preset(id: PlanetId, save: boolean) {
    const w = this.w;
    if (
      !planetIds.includes(id) ||
      !(
        (w.survival.inBase && (!this.active || this.environment.sheltered)) ||
        w.region === "ship"
      ) ||
      w.space.state.trip ||
      this.combat.boss ||
      w.space.combat.boss ||
      w.colony.siege
    )
      return false;
    if (save) {
      this.state.presets[id] = [...w.survival.state.equipped];
      (this.state.combatPresets ??= {})[id] = {
        equipment: { ...w.battle.equipment },
        weapons: [...w.battle.weaponSlots],
      };
    } else {
      const wanted = this.state.presets[id];
      if (!wanted) return false;
      w.survival.state.equipped = wanted.filter((g) =>
        w.survival.state.owned.includes(g),
      );
      const combat = this.state.combatPresets?.[id];
      if (combat) {
        w.battle.equipment = {};
        w.battle.weaponSlots = [
          w.battle.ownedWeapons.includes(combat.weapons[0])
            ? combat.weapons[0]
            : "pulse",
          combat.weapons[1] && w.battle.ownedWeapons.includes(combat.weapons[1])
            ? combat.weapons[1]
            : null,
        ];
        for (const [slot, gear] of Object.entries(combat.equipment))
          EquipmentSystem.equip(w.battle, gear!, slot as GearSlot);
      }
      w.player.hp = Math.min(w.player.hp, w.stats.hp);
      w.player.energy = Math.min(w.player.energy, w.stats.energy);
      w.survival.state.oxygen = Math.min(
        w.survival.state.oxygen,
        w.survival.oxygen.maximum,
      );
    }
    w.emit("save", "preset");
    return true;
  }
  interact(l: Landmark) {
    if (l.id.startsWith("gravity-switch-")) {
      this.w.space.once("gravity_" + l.id.slice(-1));
      this.w.toast("중력 안정화 제어 장치를 활성화했습니다.");
      this.w.emit("save", "gravity");
      return true;
    }
    if (l.id === "cooling-helios") {
      if (this.combat.coolingCooldown > 0) {
        this.w.toast("냉각 장치 재충전 중");
        return true;
      }
      this.combat.coolingCooldown = 18;
      this.combat.cooling = 10;
      this.combat.core = 3;
      this.state.temperature = 0;
      this.w.toast("냉각 장치 활성화 · 10초간 열 공격 약화");
      return true;
    }
    if (l.id.startsWith("archive-")) {
      const id = l.id.slice(8);
      if (!this.state.archives.includes(id)) {
        this.state.archives.push(id);
        this.w.survival.state.researchPoints += 5;
        this.w.addXp(600);
        this.w.space.once("archive_" + id);
      }
      if (this.state.archives.length === 4 && this.state.kills.archon) {
        this.w.space.once("genesis");
        this.w.toast(
          "GENESIS · 우리는 아직 끝나지 않았다. OMEGA 좌표는 항성 지도에 기록되었습니다.",
        );
      }
      this.w.toast(
        "GENESIS SYMBOL · " +
          extremePlanets[id as ExtremePlanet].archive +
          "를 기록했습니다.",
      );
      this.w.emit("save", "archive");
      return true;
    }
    if (l.id.startsWith("boss-")) {
      this.combat.start(l.id.slice(5));
      return true;
    }
    if (l.id.startsWith("shelter-")) {
      this.state.temperature = 0;
      this.state.pressure = 0;
      this.state.jetEnergy = 100;
      this.state.radiation = 0;
      this.w.survival.state.oxygen = this.w.survival.oxygen.maximum;
      this.w.toast("보호 시설 · 체온·산소·추진 에너지 회복");
      return true;
    }
    return false;
  }
}
