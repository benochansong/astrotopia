import { beginChallenge, finishChallenge } from "./ancient/Endgame";
import { ancientAction } from "./ui/ancient-ui";
import { classAction } from "./ui/class-ui";
import { beginTrial, finishTrial, beginRematch } from "./classes/TrainingArena";
import type { ClassId } from "./classes/catalog";
import { defaultBindings, bindingCodes } from "./systems/bindings";
import { extremeAction } from "./ui/extreme-ui";
import { spaceAction } from "./ui/space-ui";
import {
  colonyAction,
  builderPanel,
  colonyMetrics,
  refreshColonyStatus,
} from "./ui/colony-ui";
import { builderArt } from "./scenes/colony-art";
import { definition, GRID, GROUND, BASE_END } from "./colony/catalog";
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
  input = new Input(() => settings.bindings ?? defaultBindings),
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
  if (world?.colony.buildMode) {
    world.colony.buildMode = false;
    renderBuilder();
  }
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
function renderBuilder() {
  let el = document.getElementById("builder-ui");
  if (!el) {
    el = document.createElement("div");
    el.id = "builder-ui";
    ui.root.append(el);
  }
  el.hidden = !world?.colony.buildMode;
  el.innerHTML = world?.colony.buildMode ? builderPanel(world) : "";
  ui.hud.hidden = !!world?.colony.buildMode;
}
function builderPointer(e: MouseEvent) {
  if (!world?.colony.buildMode) return;
  const rect = document.querySelector("#game-frame")!.getBoundingClientRect();
  world.colony.pointer = {
    x: ((e.clientX - rect.left) * 1280) / rect.width,
    y: ((e.clientY - rect.top) * 720) / rect.height,
    inside: !(e.target as HTMLElement).closest("#builder-ui"),
  };
}
window.addEventListener("mousemove", builderPointer);
window.addEventListener("mousedown", (e) => {
  if (
    ui.modal ||
    !world?.colony.buildMode ||
    (e.target as HTMLElement).closest("#builder-ui")
  )
    return;
  builderPointer(e);
  const c = world.colony,
    v = c.view;
  if (e.button === 2) {
    c.blueprint = null;
    c.demolishing = false;
    renderBuilder();
    return;
  }
  if (e.button !== 0) return;
  const x = v.x + c.pointer.x / v.zoom,
    y = v.y + c.pointer.y / v.zoom;
  if (c.blueprint && !c.demolishing) {
    c.place(
      c.blueprint,
      Math.floor(x / GRID) * GRID,
      GROUND - Math.round((GROUND - y) / GRID) * GRID,
    );
    renderBuilder();
  } else {
    const b = c.state.buildings.find(
      (b) =>
        x >= b.x &&
        x <= b.x + definition(b.kind).w &&
        y <= b.y &&
        y >= b.y - definition(b.kind).h,
    );
    if (b) {
      c.selected = b.id;
      if (c.demolishing) {
        c.demolish(b.id);
        renderBuilder();
      } else ui.action("cb-command");
    }
  }
});
window.addEventListener("contextmenu", (e) => {
  if (world?.colony.buildMode) e.preventDefault();
});
window.addEventListener(
  "wheel",
  (e) => {
    if (
      !world?.colony.buildMode ||
      (e.target as HTMLElement).closest("#builder-ui")
    )
      return;
    e.preventDefault();
    ui.action("cb-zoom", e.deltaY < 0 ? "in" : "out");
  },
  { passive: false },
);
ui.action = (action, value) => {
  if (
    world?.space.state.trip &&
    ![
      "sp-skip",
      "sp-tab",
      "close",
      "pause",
      "save",
      "title",
      "settings",
    ].includes(action)
  )
    return;
  if (world && action.startsWith("cl-")) {
    if (action === "cl-trial") {
      const [id, tier, trialMode] = (value ?? "").split(":");
      const next = beginTrial(
        world,
        id as ClassId,
        trialMode === "challenge" ? "challenge" : "trial",
        Number(tier),
      );
      if (next) {
        world = next;
        closeModal();
        input.clear();
        ui.update(world);
      }
      return;
    }
    if (action === "cl-rematch") {
      const [id, difficulty] = (value ?? "").split(":");
      const next = beginRematch(world, id, Number(difficulty));
      if (next) {
        world = next;
        closeModal();
        input.clear();
        ui.update(world);
      }
      return;
    }
    if (action === "cl-finish") {
      const next = finishTrial(world);
      if (next) {
        world = next;
        openModal("skills");
        save();
      }
      return;
    }
    if (action === "cl-ultimate") {
      if (!ui.modal && world.classes.state.path)
        world.classes.cast(world.classes.state.path + "_ultimate");
      return;
    }
    classAction(world, action, value);
    ui.open("skills", world, settings);
    save();
    return;
  }
  if (world && action === "an-run") {
    const next = beginChallenge(world, value ?? "");
    if (next) {
      world = next;
      closeModal();
      input.clear();
    }
    return;
  }
  if (world && action === "an-exit") {
    const next = finishChallenge(world);
    if (next) {
      world = next;
      openModal("ancient");
      save();
    }
    return;
  }
  if (world && action === "an-next") {
    world.omega.endgame.next();
    closeModal();
    return;
  }
  if (world && ancientAction(world, action, value)) {
    if (
      world.omega.state.cinematic ||
      action === "an-skip" ||
      action === "an-boss"
    )
      closeModal();
    else ui.open("ancient", world, settings);
    save();
    return;
  }
  if (world && extremeAction(world, action, value)) {
    ui.open("space", world, settings);
    return;
  }
  if (world && spaceAction(world, action, value)) {
    ui.open("space", world, settings);
    return;
  }
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
      "ancient",
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
  if (
    world &&
    colonyAction(world, ui, action, value, settings, renderBuilder)
  ) {
    input.clear();
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
        const job = world.classes.state.slots[Number(value)];
        if (job) {
          world.classes.cast(job);
          break;
        }
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
        world.classes.assign(Number(value), null);
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
          world.classes.assign(index, null);
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
  if (["fog", "cameraSpeed"].includes(key))
    (settings as any)[key] = Number(value);
  if (["glow", "waterMotion", "jetAssist", "iceAssist"].includes(key))
    (settings as any)[key] = value === "true";
  if (key.startsWith("bind-") && bindingCodes.includes(value)) {
    const action = key.slice(5),
      map = settings.bindings ?? { ...defaultBindings };
    if (Object.hasOwn(defaultBindings, action)) {
      const old = map[action],
        other = Object.keys(map).find((k) => map[k] === value);
      map[action] = value;
      if (other && other !== action) map[other] = old;
      settings.bindings = map;
      input.clear();
      ui.open("settings", world, settings);
    }
  }

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
  if (key === "KeyU") {
    openModal("space");
    return;
  }
  if (key === "KeyB") {
    ui.action(world.colony.buildMode ? "cb-exit" : "cb-build");
    return;
  }
  if (world.colony.buildMode) {
    if (key === "Escape") {
      ui.action("cb-exit");
      return;
    }
    if (key === "KeyO") {
      ui.action("cb-command");
      return;
    }
    return;
  }
  if (key === "KeyN") ui.hubTab = "codex";
  const target =
    key === "KeyL" || key === "KeyN"
      ? "hub"
      : key === "KeyO"
        ? "colony"
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
      if (world.colony.buildMode) {
        world.colony.tick(dt);
        world.survival.production.tick(dt);
        world.space.tick(dt);
        const c = world.colony,
          v = c.view,
          speed = (650 * dt) / v.zoom;
        if (
          input.held.has("ArrowLeft") ||
          (c.pointer.inside && c.pointer.x < 300)
        )
          v.x -= speed;
        if (
          input.held.has("ArrowRight") ||
          (c.pointer.inside && c.pointer.x > 1240)
        )
          v.x += speed;
        if (input.held.has("ArrowUp")) v.y -= speed;
        if (input.held.has("ArrowDown")) v.y += speed;
        v.x = Math.max(0, Math.min(BASE_END - 1280 / v.zoom, v.x));
        if (input.pressed.has("KeyX")) ui.action("cb-demolition");
      } else if (!ui.modal) {
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
      if (
        ui.modal &&
        ui.modal !== "pause" &&
        ui.modal !== "settings" &&
        ui.modal !== "controls"
      ) {
        if (!world.colony.siege) world.colony.tick(dt);
        world.survival.production.tick(dt);
      }
      if (
        ui.modal === "colony" &&
        Math.floor(ambientTime * 2) !== Math.floor((ambientTime - dt) * 2)
      ) {
        const m = document.getElementById("colony-metrics");
        if (m) m.innerHTML = colonyMetrics(world);
        refreshColonyStatus(world);
      }
      if (
        ui.modal === "hub" &&
        Math.floor(ambientTime * 2) !== Math.floor((ambientTime - dt) * 2)
      ) {
        const queue = ui.dialog.querySelector("#production-queue");
        if (queue) queue.innerHTML = productionQueue(world);
      }
      if (ui.modal === "space") {
        const flight = ui.dialog.querySelector("#flight-time");
        if (flight) {
          if (world.space.state.trip)
            flight.textContent =
              Math.ceil(world.space.state.trip.remaining) + "초";
          else ui.open("space", world, settings);
        }
      }
      for (const event of world.events.splice(0)) {
        if (event.type === "facility") {
          if (event.text === "ancient") openModal("ancient");
          else if (event.text === "space") openModal("space");
          else if (event.text === "colony") openModal("colony");
          else {
            ui.hubTab = facilityTab(event.text);
            openModal("hub");
          }
        }
        if (event.type === "toast") ui.toast(event.text);
        if (event.type === "sound") audio.play(event.text);
        if (event.type === "save") save();
        if (event.type === "ending") {
          save();
          openModal("ending");
        }
      }
      if (world.omega.state.cinematic && ui.modal) closeModal();
      audio.planet(world.planetId);
      audio.region(
        world.omega.combat.boss
          ? "genesis" + world.omega.combat.phase
          : world.extreme.combat.boss
            ? world.extreme.combat.boss.kind
            : world.space.combat.boss
              ? "colossus"
              : world.combat.boss.active || world.survival.sentinel.active
                ? "boss" + world.combat.boss.phase
                : world.region,
      );
      if (world.colony.buildMode) builderArt(c, world);
      else art.world(c, world, settings.effects === "low");
      hudClock += dt;
      if (hudClock > 0.1) {
        ui.update(world);
        ui.hud.hidden = world.colony.buildMode;
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
