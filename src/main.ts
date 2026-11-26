import { survivalAction, facilityTab } from "./ui/survival-actions";
import { productionQueue } from "./ui/survival-ui";
import Phaser from "phaser";
import "./ui/style.css";
import { World } from "./core/world";
import { Art } from "./scenes/art";
import { Input } from "./systems/input";
import { AudioSystem } from "./systems/audio";
import { SaveStore } from "./save/storage";
import { Interface, type Modal } from "./ui/interface";
import { opening, type ItemId } from "./data/content";
import type { Settings } from "./core/types";
import { EquipmentSystem } from "./combat/EquipmentSystem";
import { difficulties, rarities } from "./data/battle";
import type { GearSlot, SkillId, WeaponId } from "./combat/types";

const storage = new SaveStore({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
let settings = storage.loadSettings();
const audio = new AudioSystem(settings),
  ui = new Interface(),
  input = new Input(),
  art = new Art();
let world: World | null = null,
  mode: "title" | "opening" | "game" = "title",
  storyTime = 0,
  lastStory = -1,
  hudClock = 0,
  ambientTime = 0,
  stepTime = 0;
let modalReturn: Modal = null;
const save = () => {
  if (!world) return false;
  const ok = storage.save(world.snapshot(settings));
  if (!ok) ui.toast(storage.error);
  return ok;
};
function showTitle() {
  mode = "title";
  world = null;
  input.clear();
  const data = storage.load();
  ui.title(!!data, storage.error);
  audio.region("crash");
}
function startGame(continuing = false) {
  const data = continuing ? storage.load() : null;
  if (continuing && !data) {
    ui.toast(storage.error || "저장된 탐험이 없습니다.");
    return;
  }
  world = new World(data ?? undefined);
  world.settings = settings;
  mode = "game";
  input.clear();
  ui.game();
  ui.update(world);
  audio.region(world.region);
  if (!continuing) save();
}
function startOpening() {
  ui.close();
  mode = "opening";
  storyTime = 0;
  lastStory = -1;
  input.clear();
}
function openModal(modal: Exclude<Modal, null>) {
  if (mode === "opening") return;
  modalReturn =
    ui.modal === "pause" && (modal === "settings" || modal === "controls")
      ? "pause"
      : null;
  input.clear();
  ui.open(modal, world, settings);
}
function closeModal() {
  input.clear();
  if (modalReturn) {
    const target = modalReturn;
    modalReturn = null;
    ui.open(target, world, settings);
  } else ui.close();
}
ui.action = (action, value) => {
  audio.start();
  audio.play("ui");
  if (
    [
      "settings",
      "controls",
      "credits",
      "inventory",
      "map",
      "pause",
      "character",
      "skills",
    ].includes(action)
  ) {
    if (
      (action === "inventory" || action === "map" || action === "pause") &&
      !world
    )
      return;
    openModal(action as Exclude<Modal, null>);
    return;
  }
  if (world && survivalAction(world, ui, action, value, settings)) {
    input.clear();
    return;
  }
  switch (action) {
    case "weapon-switch":
      world?.combat.weapons.switch(Number(value) as 0 | 1);
      break;
    case "cast":
      if (world && !ui.modal && world.dead <= 0) {
        const id = world.battle.skillSlots[Number(value)];
        if (id) world.combat.skills.cast(id);
      }
      break;
    case "training-end":
      world?.combat.endTraining();
      break;
    case "trial":
      if (world) {
        world.combat.trial(value as WeaponId);
        closeModal();
      }
      break;
    case "boss-skip":
      world?.combat.boss.skip();
      break;
    case "boss-leave":
      if (world) {
        world.combat.boss.abort();
        world.enterRegion("valley", 3780);
        closeModal();
        save();
      }
      break;
    case "gear-open":
      if (world) {
        openModal("character");
        ui.gear(world, value!);
      }
      break;
    case "gear":
      if (world) ui.gear(world, value!);
      break;
    case "sell":
      if (world) ui.gear(world, value!, true);
      break;
    case "sell-confirm":
      if (
        !world?.combat.training &&
        world &&
        !Object.values(world.battle.equipment).includes(value!)
      ) {
        const g = world.battle.gear.find((g) => g.id === value);
        if (g && !g.locked) {
          world.battle.credits += Math.round(rarities[g.rarity].mult * 20);
          world.battle.gear = world.battle.gear.filter((g) => g.id !== value);
          ui.open("character", world, settings);
          save();
        }
      }
      break;
    case "equip":
      if (!world?.combat.training && world && value) {
        const [slot, id] = value.split(":");
        EquipmentSystem.equip(world.battle, id, slot as GearSlot);
        world.player.hp = Math.min(world.player.hp, world.stats.hp);
        world.player.energy = Math.min(world.player.energy, world.stats.energy);
        ui.open("character", world, settings);
        save();
      }
      break;
    case "unequip":
      if (!world?.combat.training && world) {
        EquipmentSystem.unequip(world.battle, value as GearSlot);
        world.player.hp = Math.min(world.player.hp, world.stats.hp);
        world.player.energy = Math.min(world.player.energy, world.stats.energy);
        ui.open("character", world, settings);
        save();
      }
      break;
    case "loadout":
      if (!world?.combat.training && world && value) {
        const [slot, id] = value.split(":");
        if (world.battle.ownedWeapons.includes(id as WeaponId)) {
          world.battle.weaponSlots[Number(slot) as 0 | 1] = id as WeaponId;
          delete world.battle.equipment[slot === "0" ? "primary" : "secondary"];
          ui.open("character", world, settings);
          save();
        }
      }
      break;
    case "skill-clear":
      if (world) {
        world.battle.skillSlots[Number(value)] = null;
        ui.open("skills", world, settings);
        save();
      }
      break;
    case "skill-assign":
      if (world && value) {
        const [slot, id] = value.split(":"),
          index = Number(slot),
          skill = id as SkillId;
        if (
          world.battle.unlockedSkills.includes(skill) ||
          world.combat.training
        ) {
          const previous = world.battle.skillSlots.indexOf(skill),
            old = world.battle.skillSlots[index];
          if (previous >= 0) world.battle.skillSlots[previous] = old;
          world.battle.skillSlots[index] = skill;
          ui.open("skills", world, settings);
          save();
        }
      }
      break;
    case "new":
      if (storage.load()) openModal("confirm");
      else startOpening();
      break;
    case "start-confirmed":
      startOpening();
      break;
    case "continue":
      startGame(true);
      break;
    case "skip":
      startGame();
      break;
    case "close":
      closeModal();
      break;
    case "save":
      if (save()) ui.toast("탐험 기록이 저장되었습니다.");
      break;
    case "title":
      if (save()) showTitle();
      break;
    case "heal":
      if (world && world.dead <= 0) {
        world.heal();
        if (ui.modal === "inventory") ui.open("inventory", world, settings);
        ui.update(world);
      }
      break;
    case "item":
      ui.detail(value as ItemId);
      break;
    case "fullscreen":
      void (
        document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen()
      ).catch(() =>
        ui.toast("이 브라우저에서는 전체 화면을 사용할 수 없습니다."),
      );
      break;
  }
};
ui.setting = (key, value) => {
  if (key === "shake") settings.shake = Number(value);
  if (key === "damageNumbers") settings.damageNumbers = value === "true";
  if (key === "difficulty") {
    const next = value as Settings["difficulty"],
      ratio = difficulties[next].hp / difficulties[settings.difficulty].hp;
    if (world)
      for (const e of world.combat.targets) {
        e.hp *= ratio;
        e.maxHp = Math.round(e.maxHp * ratio);
      }
    settings.difficulty = next;
  }
  if (key === "effects") settings.effects = value as Settings["effects"];
  else if (key === "music" || key === "sfx") settings[key] = Number(value);
  audio.set(settings);
  if (!storage.saveSettings(settings))
    ui.toast("설정을 저장하지 못했습니다. 브라우저 저장 권한을 확인하세요.");
};
input.onMenu = (key) => {
  audio.start();
  if (mode !== "game" || !world || world.dead > 0) return;
  if (key === "KeyN") ui.hubTab = "codex";
  const target =
    key === "KeyB" || key === "KeyN"
      ? "hub"
      : key === "KeyI"
        ? "inventory"
        : key === "KeyM"
          ? "map"
          : key === "KeyC"
            ? "character"
            : key === "KeyV"
              ? "skills"
              : "pause";
  if (ui.modal) closeModal();
  else openModal(target);
};
window.addEventListener("blur", () => {
  input.clear();
  if (mode === "game" && !ui.modal && world && world.dead <= 0)
    openModal("pause");
  audio.suspend();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    input.clear();
    if (mode === "game" && !ui.modal && world) openModal("pause");
    audio.suspend();
  }
});
window.addEventListener("pagehide", () => save());
window.addEventListener("keydown", () => audio.start(), { once: true });
function fit() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  document.querySelector<HTMLElement>("#game-frame")!.style.transform =
    `scale(${scale})`;
}
window.addEventListener("resize", fit);
fit();
class ExpeditionScene extends Phaser.Scene {
  private surface!: Phaser.Textures.CanvasTexture;
  create() {
    this.surface = this.textures.createCanvas("expedition", 1280, 720)!;
    this.add.image(0, 0, "expedition").setOrigin(0);
    showTitle();
    this.game.canvas.setAttribute(
      "aria-label",
      "ASTROTOPIA 게임 화면. A와 D로 이동, Space로 점프, J로 공격, F로 상호작용합니다.",
    );
    this.game.canvas.setAttribute("role", "img");
    if (import.meta.env.DEV) {
      Object.assign(window, {
        __ASTRO__: {
          get world() {
            return world;
          },
          get mode() {
            return mode;
          },
          get modal() {
            return ui.modal;
          },
          save,
          storage,
        },
      });
    }
  }
  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    ambientTime += dt;
    const c = this.surface.getContext();
    if (mode === "title") art.title(c, ambientTime);
    else if (mode === "opening") {
      storyTime += dt;
      const step = Math.min(7, Math.floor(storyTime / 3));
      if (step !== lastStory) {
        ui.opening(step, opening[step][0], opening[step][1]);
        lastStory = step;
        if (step === 2) audio.play("hit");
        if (step === 5) audio.play("death");
      }
      art.opening(c, storyTime);
      if (
        storyTime >= 24 ||
        input.pressed.has("Space") ||
        input.pressed.has("Escape")
      )
        startGame();
    } else if (world) {
      if (!ui.modal) {
        world.update(dt, input.frame());
        stepTime += dt;
        if (
          world.player.grounded &&
          Math.abs(world.player.vx) > 100 &&
          stepTime > 0.28
        ) {
          stepTime = 0;
          audio.play("step");
        }
      }
      if (ui.modal) world.survival.production.tick(dt);
      if (
        ui.modal === "hub" &&
        Math.floor(ambientTime * 2) !== Math.floor((ambientTime - dt) * 2)
      ) {
        const queue = ui.dialog.querySelector("#production-queue");
        if (queue) queue.innerHTML = productionQueue(world);
      }
      for (const event of world.events.splice(0)) {
        if (event.type === "facility") {
          ui.hubTab = facilityTab(event.text);
          openModal("hub");
        }
        if (event.type === "toast") ui.toast(event.text);
        if (event.type === "sound") audio.play(event.text);
        if (event.type === "save") save();
        if (event.type === "ending") {
          save();
          openModal("ending");
        }
      }
      audio.region(
        world.combat.boss.active || world.survival.sentinel.active
          ? "boss" + world.combat.boss.phase
          : world.region,
      );
      art.world(c, world, settings.effects === "low");
      hudClock += dt;
      if (hudClock > 0.1) {
        ui.update(world);
        hudClock = 0;
      }
    }
    input.flush();
  }
}
new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "canvas",
  width: 1280,
  height: 720,
  backgroundColor: "#0a1c2a",
  scene: ExpeditionScene,
  banner: false,
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: false },
  // Target 60Hz; leave headroom for high-refresh displays without unlimited CPU work.
  fps: { target: 60, limit: 120, smoothStep: true },
});
