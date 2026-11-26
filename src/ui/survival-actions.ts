import type { World } from "../core/world";
import type { Settings } from "../core/types";
import type { Interface } from "./interface";
import type { ItemId } from "../data/content";
import {
  environmentGear,
  type EnvGearId,
  type Facility,
} from "../survival/catalog";
import { hubTabs, type HubTab } from "./survival-ui";
export const facilityTab = (f: string): HubTab =>
  f === "refinery"
    ? "refine"
    : f === "research"
      ? "research"
      : f === "warehouse"
        ? "storage"
        : f === "terminal"
          ? "facilities"
          : "craft";
export function survivalAction(
  w: World,
  ui: Interface,
  action: string,
  value: string | undefined,
  settings: Settings,
) {
  const s = w.survival.state;
  let handled = true,
    refresh = true;
  switch (action) {
    case "hub":
      ui.hubTab = "facilities";
      ui.open("hub", w, settings);
      return true;
    case "database":
      ui.hubTab = "codex";
      ui.open("hub", w, settings);
      return true;
    case "hub-tab":
      if (value && Object.hasOwn(hubTabs, value)) ui.hubTab = value as HubTab;
      break;
    case "recipe-select":
      ui.recipe = value!;
      break;
    case "production-quantity":
      ui.quantity = Number(value);
      break;
    case "facility-activate":
      if (w.survival.activate(value as Facility))
        ui.hubTab = facilityTab(value!);
      break;
    case "produce":
      w.survival.crafting.start(value!, ui.quantity);
      break;
    case "research-start":
      w.survival.research.start(value!);
      break;
    case "research-convert":
      w.survival.research.convert();
      break;
    case "job-cancel":
      w.survival.production.cancel(Number(value));
      break;
    case "job-claim":
      w.survival.production.claim(Number(value));
      break;
    case "deposit-all":
      w.survival.storage.depositAll();
      break;
    case "deposit":
    case "withdraw": {
      const n = Number(
        (document.getElementById("transfer-" + value) as HTMLInputElement)
          ?.value,
      );
      w.survival.storage.transfer(value as ItemId, n, action === "deposit");
      break;
    }
    case "env-equip":
      if (value && Object.hasOwn(environmentGear, value))
        w.survival.toggle(value as EnvGearId);
      break;
    case "tool-select":
      if (s.tools.includes(Number(value))) {
        s.tool = Number(value);
        w.mining = null;
        w.emit("save", "tool");
      }
      break;
    case "consume":
      w.survival.use(value as ItemId);
      refresh = !!ui.modal;
      break;
    case "scan":
      if (!ui.modal) w.survival.scanner.activate();
      refresh = false;
      break;
    case "quick-assign": {
      const [slot, id] = value!.split(":");
      if (
        [
          "medicalGel",
          "energyCell",
          "oxygenCan",
          "antitoxin",
          "purifier",
          "portableBeacon",
          "recall",
        ].includes(id) &&
        [0, 1, 2].includes(Number(slot))
      ) {
        s.quick[Number(slot)] = id as ItemId;
        w.emit("save", "quick");
      }
      break;
    }
    case "gear-lock": {
      const g = w.battle.gear.find((g) => g.id === value);
      if (g) {
        g.locked = !g.locked;
        w.emit("save", "gear-lock");
        ui.gear(w, g.id);
      }
      return true;
    }
    case "gear-upgrade":
      w.survival.upgrade.upgrade(value!);
      ui.gear(w, value!);
      return true;
    case "sentinel-leave":
      w.survival.sentinel.abort();
      w.combat.hazards = [];
      w.enterRegion("abyss", 2700);
      ui.close();
      return true;
    default:
      handled = false;
  }
  if (handled && refresh) ui.open(ui.modal ?? "hub", w, settings);
  return handled;
}
