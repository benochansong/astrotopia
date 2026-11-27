import { defaultBindings, bindingCodes } from "../systems/bindings";
import { newExtreme } from "../extreme/types";
import { validExtreme } from "./extreme-schema";
import { newSpace } from "../space/types";
import { validSpace } from "./space-schema";
import { newColony } from "../colony/types";
import { validColony, savedColonyCapacity } from "./colony-schema";
import { newSurvival } from "../survival/types";
import { validSurvival } from "./survival-schema";
import { items, regionOrder, regions, type ItemId } from "../data/content";
import type { Progress, SaveData, Settings } from "../core/types";
import { occupiedSlots } from "../systems/inventory";
import { maxHp, xpRequired } from "../physics/movement";
import { newBattle } from "../data/battle";
import { validBattle } from "./battle-schema";
import { EquipmentSystem } from "../combat/EquipmentSystem";
export const SAVE_KEY = "astrotopia.save.v1";
export const SETTINGS_KEY = "astrotopia.settings.v1";
export const defaultSettings = (): Settings => ({
  fog: 1,
  glow: true,
  waterMotion: true,
  cameraSpeed: 1,
  jetAssist: false,
  iceAssist: false,
  bindings: { ...defaultBindings },
  music: 0.35,
  sfx: 0.6,
  effects: "high",
  shake: 0.65,
  damageNumbers: true,
  difficulty: "normal",
});
export const newProgress = (): Progress => ({
  counters: {},
  quest: 0,
  discovered: ["crash"],
  opened: [],
  checkpoint: { region: "crash", x: 300 },
});
const finite = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validSettings(s: unknown): s is Settings {
  return (
    object(s) &&
    (s.fog === undefined || finite(s.fog, 0, 1)) &&
    (s.cameraSpeed === undefined || finite(s.cameraSpeed, 0.4, 2)) &&
    ["glow", "waterMotion", "jetAssist", "iceAssist"].every(
      (k) => s[k] === undefined || typeof s[k] === "boolean",
    ) &&
    (s.bindings === undefined ||
      (object(s.bindings) &&
        Object.keys(s.bindings).length ===
          Object.keys(defaultBindings).length &&
        Object.entries(s.bindings).every(
          ([k, v]) =>
            Object.hasOwn(defaultBindings, k) &&
            bindingCodes.includes(String(v)),
        ) &&
        new Set(Object.values(s.bindings)).size ===
          Object.keys(defaultBindings).length)) &&
    finite(s.music, 0, 1) &&
    finite(s.sfx, 0, 1) &&
    finite(s.shake, 0, 1) &&
    typeof s.damageNumbers === "boolean" &&
    ["explorer", "normal", "veteran"].includes(String(s.difficulty)) &&
    (s.effects === "high" || s.effects === "low")
  );
}
export function parseSave(raw: string | null): SaveData | null {
  try {
    if (!raw || raw.length > 2000000) return null;
    const s = JSON.parse(raw);
    if (
      !object(s) ||
      ![1, 2, 3, 4, 5, 6].includes(Number(s.version)) ||
      !regionOrder.includes(s.region as never) ||
      !finite(s.savedAt, 0, 1e15) ||
      !finite(s.level, 1, s.version === 6 ? 90 : s.version === 5 ? 30 : 15) ||
      !Number.isInteger(s.level)
    )
      return null;
    if (
      !finite(s.x, 0, Number(s.version) >= 4 ? 10000 : 5200) ||
      !finite(s.y, -100, 3000) ||
      !finite(s.xp, 0, xpRequired(s.level)) ||
      !finite(s.hp, 0, 3000) ||
      !finite(s.energy, 0, 1000)
    )
      return null;
    if (
      !object(s.inventory) ||
      Object.entries(s.inventory).some(
        ([id, n]) =>
          !Object.hasOwn(items, id) ||
          !finite(n, 0, Number(s.version) >= 3 ? 3564 : 2376) ||
          !Number.isInteger(n),
      ) ||
      occupiedSlots(s.inventory) > (Number(s.version) >= 3 ? 36 : 24)
    )
      return null;
    const p = s.progress;
    if (
      !object(p) ||
      !object(p.counters) ||
      Object.entries(p.counters).some(
        ([k, n]) => k.length > 40 || !finite(n, 0, 1e9) || !Number.isInteger(n),
      )
    )
      return null;
    if (
      !finite(
        p.quest,
        0,
        s.version === 1
          ? 4
          : s.version === 2
            ? 10
            : s.version === 3
              ? 18
              : s.version === 4
                ? 28
                : s.version === 5
                  ? 38
                  : 56,
      ) ||
      !Number.isInteger(p.quest) ||
      !Array.isArray(p.discovered) ||
      p.discovered.some((r) => !regionOrder.includes(r)) ||
      p.discovered.length > regionOrder.length
    )
      return null;
    const landmarkIds = [
      "colony-forest",
      ...Object.values(regions).flatMap((r) => r.landmarks.map((l) => l.id)),
    ];
    if (
      !Array.isArray(p.opened) ||
      p.opened.length > 60 ||
      p.opened.some((id) => !landmarkIds.includes(id))
    )
      return null;
    if (
      !object(p.checkpoint) ||
      !regionOrder.includes(p.checkpoint.region as never) ||
      !finite(p.checkpoint.x, 50, 5100)
    )
      return null;
    if (s.version === 1) {
      s.battle = newBattle(s.level);
      if (!object(s.settings)) return null;
      s.settings = { ...defaultSettings(), ...s.settings };
      s.version = 2;
    }
    if (s.version === 2) {
      s.survival = newSurvival();
      s.version = 3;
    }
    if (s.version === 3) {
      s.colony = newColony();
      s.version = 4;
    }
    if (
      !validColony(s.colony) ||
      !validSurvival(s.survival, savedColonyCapacity(s.colony))
    )
      return null;
    if (
      !validSettings(s.settings) ||
      !validBattle(s.battle) ||
      occupiedSlots(s.inventory) + s.battle.gear.length > s.survival.capacity
    )
      return null;
    const stats = EquipmentSystem.stats(s.level, s.battle);
    if (Number(s.hp) > stats.hp || Number(s.energy) > stats.energy) return null;
    // A boss encounter is never resumed mid-pattern; return to the staging area.
    if (s.region === "valley" && Number(s.x) > 3990) {
      s.x = 3820;
      s.y = 716;
    }
    if (s.version === 4) {
      s.space = newSpace();
      s.version = 5;
    }
    if (
      !validSpace(
        s.space,
        s.survival,
        String(s.region),
        Boolean((s.extreme as any)?.horizon),
      )
    )
      return null;
    if (s.version === 5) {
      s.extreme = newExtreme();
      s.version = 6;
    }
    if (!validExtreme(s.extreme)) return null;
    return s as unknown as SaveData;
  } catch {
    return null;
  }
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class SaveStore {
  error = "";
  constructor(private storage: StorageLike) {}
  load(): SaveData | null {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      const result = parseSave(raw);
      this.error =
        raw && !result
          ? "저장 데이터가 손상되었거나 지원하지 않는 버전입니다. 새로운 모험을 시작할 수 있습니다."
          : "";
      return result;
    } catch {
      this.error =
        "저장소에 접근할 수 없습니다. 브라우저 저장 권한을 확인하세요.";
      return null;
    }
  }
  save(data: SaveData): boolean {
    try {
      const previous = this.storage.getItem(SAVE_KEY);
      let legacy = false;
      try {
        legacy = !!previous && JSON.parse(previous)?.version === 1;
      } catch {
        /* A confirmed new game may replace a corrupt save. */
      }
      if (legacy && !this.storage.getItem(SAVE_KEY + ".backup"))
        this.storage.setItem(SAVE_KEY + ".backup", previous!);
      if (previous) {
        try {
          if (
            [2, 3, 4, 5].includes(JSON.parse(previous).version) &&
            !this.storage.getItem(
              SAVE_KEY + ".backup.v" + JSON.parse(previous).version,
            )
          )
            this.storage.setItem(
              SAVE_KEY + ".backup.v" + JSON.parse(previous).version,
              previous,
            );
        } catch {}
      }
      this.storage.setItem(SAVE_KEY, JSON.stringify(data));
      this.error = "";
      return true;
    } catch {
      this.error =
        "저장하지 못했습니다. 브라우저 저장 공간 또는 권한을 확인하세요.";
      return false;
    }
  }
  loadSettings(): Settings {
    try {
      const s = JSON.parse(this.storage.getItem(SETTINGS_KEY) ?? "null");
      const merged = { ...defaultSettings(), ...(object(s) ? s : {}) };
      return validSettings(merged) ? merged : defaultSettings();
    } catch {
      return defaultSettings();
    }
  }
  saveSettings(s: Settings): boolean {
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(s));
      return true;
    } catch {
      return false;
    }
  }
}
export const knownItemIds = Object.keys(items) as ItemId[];
