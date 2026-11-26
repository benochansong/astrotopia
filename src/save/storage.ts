import { items, regionOrder, regions, type ItemId } from "../data/content";
import type { Progress, SaveData, Settings } from "../core/types";
import { occupiedSlots } from "../systems/inventory";
import { maxHp, xpRequired } from "../physics/movement";
export const SAVE_KEY = "astrotopia.save.v1";
export const SETTINGS_KEY = "astrotopia.settings.v1";
export const defaultSettings = (): Settings => ({
  music: 0.35,
  sfx: 0.6,
  effects: "high",
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
    finite(s.music, 0, 1) &&
    finite(s.sfx, 0, 1) &&
    (s.effects === "high" || s.effects === "low")
  );
}
export function parseSave(raw: string | null): SaveData | null {
  try {
    if (!raw || raw.length > 100000) return null;
    const s = JSON.parse(raw);
    if (
      !object(s) ||
      s.version !== 1 ||
      !regionOrder.includes(s.region as never) ||
      !finite(s.savedAt, 0, 1e15) ||
      !finite(s.level, 1, 15) ||
      !Number.isInteger(s.level)
    )
      return null;
    if (
      !finite(s.x, 0, 4000) ||
      !finite(s.y, -100, 1000) ||
      !finite(s.xp, 0, xpRequired(s.level)) ||
      !finite(s.hp, 0, maxHp(s.level)) ||
      !finite(s.energy, 0, 100)
    )
      return null;
    if (
      !object(s.inventory) ||
      Object.entries(s.inventory).some(
        ([id, n]) =>
          !Object.hasOwn(items, id) ||
          !finite(n, 0, 2376) ||
          !Number.isInteger(n),
      ) ||
      occupiedSlots(s.inventory) > 24
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
      !finite(p.quest, 0, 4) ||
      !Number.isInteger(p.quest) ||
      !Array.isArray(p.discovered) ||
      p.discovered.some((r) => !regionOrder.includes(r)) ||
      p.discovered.length > 3
    )
      return null;
    const landmarkIds = Object.values(regions).flatMap((r) =>
      r.landmarks.map((l) => l.id),
    );
    if (
      !Array.isArray(p.opened) ||
      p.opened.length > 30 ||
      p.opened.some((id) => !landmarkIds.includes(id))
    )
      return null;
    if (
      !object(p.checkpoint) ||
      !regionOrder.includes(p.checkpoint.region as never) ||
      !finite(p.checkpoint.x, 50, 3800) ||
      !validSettings(s.settings)
    )
      return null;
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
      return validSettings(s) ? s : defaultSettings();
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
