import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { enemyData, type ItemId } from "../data/content";
import { gearTemplates, rarities, weapons } from "../data/battle";
import { occupiedSlots } from "../systems/inventory";
import type { Gear, Rarity } from "./types";
export class LootSystem {
  private notices = new Map<string, number>();
  constructor(
    private w: World,
    public random: () => number = Math.random,
  ) {}
  gear(rarity: Rarity, template?: string): Gear {
    const candidates = Object.keys(gearTemplates).filter(
      (id) =>
        id !== "titan" &&
        (!gearTemplates[id].weapon ||
          weapons[gearTemplates[id].weapon!].level <= this.w.player.level),
    );
    return {
      id: `gear-${++this.w.battle.serial}`,
      template:
        template ?? candidates[Math.floor(this.random() * candidates.length)],
      rarity,
    };
  }
  place(x: number, y: number, item?: ItemId, count = 1, gear?: Gear) {
    const w = this.w;
    let floor = w.map.platforms
      .filter((p) => p.x <= x && p.x + p.w >= x && p.y >= y)
      .sort((a, b) => a.y - b.y)[0];
    if (!floor) {
      floor = w.map.platforms
        .filter((p) => !p.oneWay)
        .sort(
          (a, b) => Math.abs(a.x + a.w / 2 - x) - Math.abs(b.x + b.w / 2 - x),
        )[0];
      x = Math.max(floor.x + 25, Math.min(floor.x + floor.w - 25, x));
    }
    w.battle.groundLoot.push({
      id: `loot-${++w.battle.serial}`,
      region: w.region,
      x,
      y: floor.y - 15,
      item,
      count,
      gear,
    });
  }
  drop(e: Enemy) {
    if (e.kind === "dummy" || e.noLoot || this.w.combat.training) return;
    const w = this.w,
      d = enemyData[e.kind];
    w.addXp(Math.round(d.xp * (e.elite ? 3 : 1)));
    w.battle.credits += Math.round(d.xp * (e.elite ? 2 : 0.45));
    w.count(e.kind);
    this.place(e.x + d.w / 2, e.y, d.drop, e.elite ? 3 : 1);
    if (this.random() < 0.14) this.place(e.x + 15, e.y, "medkit");
    if (e.elite) {
      w.count("eliteKill");
      this.place(e.x + 30, e.y, "fragment", 2);
      this.place(
        e.x,
        e.y,
        undefined,
        1,
        this.gear(this.random() < 0.25 ? "epic" : "rare"),
      );
    } else if (this.random() < 0.09)
      this.place(
        e.x,
        e.y,
        undefined,
        1,
        this.gear(this.random() < 0.65 ? "common" : "uncommon"),
      );
    w.emit("save", "loot");
  }
  boss() {
    const w = this.w,
      first = w.battle.bossKills === 0;
    w.battle.bossKills++;
    w.count("titanKill");
    w.addXp(first ? 900 : 250);
    w.battle.credits += first ? 1200 : 250;
    this.place(4650, 700, "ancientCrystal", first ? 5 : 2);
    this.place(
      4680,
      700,
      undefined,
      1,
      this.gear(first ? "epic" : "rare", first ? "titan" : undefined),
    );
    if (first) {
      w.battle.story.push("titanCore");
      w.battle.titles.push("개척자");
      if (!w.collect("titanCore", 1)) this.place(4200, 700, "titanCore");
      w.toast(
        "EDEN TITAN 격파 · 개척자 칭호 획득 · 핵심 보상은 첫 처치에만 지급됩니다.",
      );
    }
    w.sound("bossVictory");
    w.emit("save", "boss-victory");
  }
  update(dt: number) {
    const w = this.w;
    if (w.combat.training) return;
    for (let i = w.battle.groundLoot.length - 1; i >= 0; i--) {
      const l = w.battle.groundLoot[i];
      if (
        l.region !== w.region ||
        Math.abs(l.x - w.player.x - 17) > 75 ||
        Math.abs(l.y - w.player.y - 40) > 100
      )
        continue;
      const wait = (this.notices.get(l.id) ?? 0) - dt;
      if (wait > 0) {
        this.notices.set(l.id, wait);
        continue;
      }
      let collected = false;
      if (l.gear) {
        if (occupiedSlots(w.inventory) + w.battle.gear.length < 24) {
          w.battle.gear.push(l.gear);
          const t = gearTemplates[l.gear.template];
          if (t.weapon && !w.battle.ownedWeapons.includes(t.weapon))
            w.battle.ownedWeapons.push(t.weapon);
          w.toast(`${rarities[l.gear.rarity].name} 장비 획득 · ${t.name}`);
          w.sound(
            l.gear.rarity === "rare" || l.gear.rarity === "epic"
              ? "rareLoot"
              : "pickup",
          );
          collected = true;
        } else
          w.toast(
            "장비 보관함이 가득 찼습니다. C에서 불필요한 장비를 분해하세요. 드롭은 지역 이동·저장 후에도 유지됩니다.",
          );
      } else collected = w.collect(l.item!, l.count);
      if (collected) {
        w.battle.groundLoot.splice(i, 1);
        this.notices.delete(l.id);
        w.emit("save", "pickup");
      } else this.notices.set(l.id, 3);
    }
  }
}
