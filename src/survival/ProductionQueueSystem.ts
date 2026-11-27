import { gearTemplates } from "../data/battle";
import type { World } from "../core/world";
import { items, type ItemId } from "../data/content";
import { occupiedSlots } from "../systems/inventory";
import {
  recipes,
  technologies,
  environmentGear,
  type Cost,
  type Product,
} from "./catalog";
import { StorageSystem } from "./StorageSystem";
import type { ProductionJob } from "./types";
export class ProductionQueueSystem {
  constructor(private w: World) {}
  researchPoints(points: number) {
    return Math.ceil(
      points *
        (this.w.classes.state.classId === "scientist"
          ? 1 - this.w.classes.bonus
          : 1),
    );
  }
  reason(id: string, kind: "craft" | "research", quantity = 1): string {
    const w = this.w,
      s = w.survival.state,
      d = kind === "craft" ? recipes[id] : technologies[id];
    if (id === "space_replicaCore" && !w.battle.bossKills)
      return "EDEN TITAN 코어 분석 기록 필요";
    if (!d) return "알 수 없는 작업";
    if (!w.survival.inBase)
      return "불시착 기지의 작업 시설 근처에서 시작하세요.";
    if (s.jobs.length >= 12) return "작업 대기열이 가득 찼습니다.";
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      (kind === "research" && quantity !== 1)
    )
      return "수량은 1~10개입니다.";
    const facility = kind === "craft" ? recipes[id].facility : "research";
    if (
      !s.facilities.includes(facility) &&
      !w.colony.state.buildings.some(
        (b) =>
          (b.kind === (facility === "research" ? "lab" : facility) ||
            (facility === "research" &&
              ["quantumLab", "ancientResearch", "genesisNetwork"].includes(
                b.kind,
              )) ||
            (facility === "workbench" && b.kind === "relicFabricator")) &&
          b.remaining <= 0,
      )
    )
      return "시설을 먼저 수리하세요.";
    if (kind === "craft") {
      const r = recipes[id];
      if (r.tech && !s.technologies.includes(r.tech))
        return `선행 연구: ${technologies[r.tech].name}`;
      if (w.player.level < r.level) return `필요 레벨 ${r.level}`;
      if (r.result.kind !== "item" && r.result.kind !== "gear") {
        if (quantity !== 1) return "영구 장비는 한 개씩 제작합니다.";
        if (s.jobs.some((j) => j.kind === "craft" && j.recipe === id))
          return "이미 제작 중입니다.";
        if (
          (r.result.kind === "tool" && s.tools.includes(r.result.id)) ||
          (r.result.kind === "environment" && s.owned.includes(r.result.id)) ||
          (r.result.kind === "pack" && s.capacity > 24)
        )
          return "이미 보유하고 있습니다.";
      }
    } else {
      const t = technologies[id];
      if (s.technologies.includes(id)) return "연구 완료";
      if (s.jobs.some((j) => j.kind === "research" && j.recipe === id))
        return "연구 진행 중";
      if (t.requires.some((x) => !s.technologies.includes(x)))
        return (
          "선행 기술: " +
          t.requires
            .filter((x) => !s.technologies.includes(x))
            .map((x) => technologies[x].name)
            .join(", ")
        );
      if (id === "explorer" && !s.sentinelBlueprint)
        return "심연의 파수꾼 첫 처치 설계도 필요";
      if (id === "colony" && !w.progress.counters.ancientAnalysis)
        return "생존 터미널에서 고대 기술 분석 필요";
      if (s.researchPoints < this.researchPoints(t.points))
        return "연구 포인트 부족 · 탐험 또는 연구 자료 변환";
    }
    const missing = w.survival.storage.missing(d.cost, quantity);
    return missing.length ? "재료 부족 · " + missing.join(" · ") : "";
  }
  enqueue(id: string, kind: "craft" | "research", quantity = 1) {
    const reason = this.reason(id, kind, quantity);
    if (reason) {
      this.w.toast(reason);
      return false;
    }
    const s = this.w.survival.state,
      d = kind === "craft" ? recipes[id] : technologies[id],
      points =
        kind === "research" ? this.researchPoints(technologies[id].points) : 0;
    if (!this.w.survival.storage.spend(d.cost, quantity)) return false;
    s.researchPoints -= points;
    const cost = Object.fromEntries(
      Object.entries(d.cost).map(([id, n]) => [id, n! * quantity]),
    ) as Cost;
    s.jobs.push({
      id: ++s.serial,
      kind,
      recipe: id,
      quantity,
      remaining: d.seconds * quantity,
      total: d.seconds * quantity,
      state: "working",
      cost,
      points,
      startedAt: Date.now(),
    });
    s.lastClock = Math.max(s.lastClock, Date.now());
    this.w.emit("save", "production-start");
    return true;
  }
  tick(dt: number) {
    const s = this.w.survival.state,
      lanes = new Set<string>();
    let changed = false;
    for (const j of s.jobs) {
      if (j.state !== "working") continue;
      const lane =
        j.kind === "research" ? "research" : recipes[j.recipe].facility;
      if (
        lanes.has(lane) ||
        !this.w.colony.facilityPowered(lane as import("./catalog").Facility)
      )
        continue;
      lanes.add(lane);
      j.remaining = Math.max(
        0,
        j.remaining -
          Math.max(0, dt) *
            this.w.colony.facilitySpeed(lane as import("./catalog").Facility),
      );
      if (j.remaining === 0) {
        j.state = "ready";
        changed = true;
        this.w.toast(
          `${j.kind === "research" ? technologies[j.recipe].name : recipes[j.recipe].name} 완료 · L에서 회수`,
        );
        this.w.sound(
          j.kind === "research" ? "researchComplete" : "craftComplete",
        );
      }
    }
    s.lastClock = Math.max(s.lastClock, Date.now());
    if (changed) this.w.emit("save", "production-ready");
  }
  offline(now = Date.now()) {
    const s = this.w.survival.state;
    let dt = Math.max(0, Math.min(14400, (now - s.lastClock) / 1000));
    while (dt > 0 && s.jobs.some((j) => j.state === "working")) {
      const step = Math.min(dt, 1);
      this.tick(step);
      dt -= step;
    }
    s.lastClock = Math.max(s.lastClock, now);
  }
  cancel(id: number) {
    const j = this.w.survival.state.jobs.find((j) => j.id === id);
    if (!j || j.state !== "working" || !this.w.survival.inBase) return false;
    j.state = "refund";
    j.remaining = 0;
    this.w.emit("save", "cancel");
    return true;
  }
  claim(id: number) {
    const w = this.w,
      s = w.survival.state,
      j = s.jobs.find((j) => j.id === id);
    if (!j || j.state === "working" || !w.survival.inBase) return false;
    const inv = { ...w.inventory },
      wh = { ...s.warehouse };
    const rewards: Cost = j.state === "refund" ? j.cost : {};
    let product: Product | undefined;
    if (j.state === "ready" && j.kind === "craft") {
      product = recipes[j.recipe].result;
      if (product.kind === "item")
        rewards[product.id] = product.count * j.quantity;
    }
    if (j.state === "ready" && j.kind === "research" && j.recipe === "colony")
      rewards.blueprint = 1;
    for (const [id, n] of Object.entries(rewards) as [ItemId, number][]) {
      if (
        !StorageSystem.add(inv, id, n, s.capacity - w.battle.gear.length) &&
        !StorageSystem.add(wh, id, n, w.colony.capacity)
      ) {
        w.toast("완료품 보관 공간이 부족합니다. 작업함에 안전하게 보관합니다.");
        return false;
      }
    }
    if (
      product?.kind === "gear" &&
      occupiedSlots(inv) + w.battle.gear.length + j.quantity > s.capacity
    ) {
      w.toast("장비 보관 공간이 부족합니다. 완성품은 작업함에 남습니다.");
      return false;
    }
    // Commit all inventory changes and remove the job before emitting rewards or saves.
    w.inventory = inv;
    s.warehouse = wh;
    s.jobs = s.jobs.filter((x) => x.id !== id);
    if (j.state === "refund") {
      s.researchPoints += j.points;
      w.toast("투입 재료와 연구 포인트를 전부 반환했습니다.");
    } else if (j.kind === "research") {
      s.technologies.push(j.recipe);
      w.count("research_" + j.recipe);
      if (j.recipe === "colony") {
        s.blueprint = true;

        w.survival.discovery.resource("blueprint");
        w.count("blueprint");
      }
      w.sound("researchComplete");
    } else {
      if (product?.kind === "gear")
        for (let i = 0; i < j.quantity; i++) {
          const g = w.combat.loot.gear(
            product.id.startsWith("omega_") ||
              [
                "genesisBlaster",
                "eternityBlade",
                "omegaCannon",
                "quantumDestroyer",
                "aeternumStaff",
                "nexusCommander",
                "voidHammer",
              ].includes(product.id)
              ? "legendary"
              : "uncommon",
            product.id,
          );
          w.battle.gear.push(g);
          const weapon = gearTemplates[g.template].weapon;
          if (weapon && !w.battle.ownedWeapons.includes(weapon))
            w.battle.ownedWeapons.push(weapon);
        }
      if (product?.kind === "tool") {
        s.tools.push(product.id);
        s.tool = product.id;
      }
      if (product?.kind === "environment") {
        s.owned.push(product.id);
        w.survival.equip(product.id);
      }
      if (product?.kind === "pack") s.capacity = 36;
      for (const [id, n] of Object.entries(rewards) as [ItemId, number][]) {
        w.survival.discovery.resource(id);
        w.count(id, n);
      }
      w.count("craft_" + j.recipe, j.quantity);
      w.sound("craftComplete");
    }
    w.emit("save", "production-claim");
    return true;
  }
}
