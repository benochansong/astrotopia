import type { World } from "../core/world";
import { items, type ItemId, type Resource, regions } from "../data/content";
import { resourceRows, recipes } from "./catalog";
export class ResourceSystem {
  static info(id: ItemId) {
    const r = resourceRows[id as keyof typeof resourceRows];
    return {
      tier: r?.[4] ?? 1,
      rarity: r?.[4] ?? 1,
      value: (r?.[4] ?? 1) * 8,
      stack: 99,
      regions: Object.values(regions)
        .filter((m) => m.resources.some((n) => n.item === id))
        .map((m) => m.name),
      recipes: Object.values(recipes)
        .filter(
          (r) => r.cost[id] || (r.result.kind === "item" && r.result.id === id),
        )
        .map((r) => r.name),
    };
  }
  static seconds(node: Resource, tier: number) {
    return (node.seconds ?? 1.1) / [1, 1.5, 2, 2.7][tier - 1];
  }
}
export class DiscoverySystem {
  constructor(private w: World) {}
  resource(id: ItemId) {
    const s = this.w.survival.state;
    if (s.discovered.includes(id)) return;
    s.discovered.push(id);
    s.researchPoints += ResourceSystem.info(id).rarity;
    s.records.push(`${items[id].name} 최초 분석`);
    if (s.records.length > 100) s.records.shift();
  }
  record(key: string, points = 2) {
    const s = this.w.survival.state;
    if (s.records.includes(key)) return;
    s.records.push(key);
    s.researchPoints += points;
  }
}
export class CodexSystem {
  static resources(w: World) {
    return Object.keys(items).map((id) => ({
      id: id as ItemId,
      known: w.survival.state.discovered.includes(id as ItemId),
      ...ResourceSystem.info(id as ItemId),
    }));
  }
}
