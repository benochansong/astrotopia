import type { World } from "../core/world";
import { regions, enemyData } from "../data/content";
import { planetForRegion, type PlanetId } from "../space/catalog";
import { extremePlanets, type ExtremePlanet } from "./catalog";
export function exploration(w: World, id: PlanetId) {
  const maps = Object.values(regions).filter(
      (r) => r.id !== "ship" && planetForRegion(r.id) === id,
    ),
    resources = [
      ...new Set(maps.flatMap((r) => r.resources.map((n) => n.item))),
    ],
    creatures = [...new Set(maps.flatMap((r) => r.enemies.map((e) => e.kind)))],
    p = extremePlanets[id as ExtremePlanet];
  const found = maps.filter((r) => w.progress.discovered.includes(r.id)).length,
    known = resources.filter((r) =>
      w.survival.state.discovered.includes(r),
    ).length,
    seen = creatures.filter((e) => w.battle.discovered.includes(e)).length,
    boss = p
      ? !!w.extreme.state.kills[p.boss]
      : id === "ares"
        ? !!w.space.state.kills
        : !!w.battle.bossKills,
    archive = p
      ? w.extreme.state.archives.includes(id)
      : id === "ares"
        ? !!w.progress.counters.foundryArchive
        : w.battle.story.includes("coreAnalysis"),
    total = maps.length + resources.length + creatures.length + 2,
    done = found + known + seen + Number(boss) + Number(archive);
  return {
    percent: Math.floor((done / total) * 100),
    found,
    regions: maps.length,
    known,
    resources: resources.length,
    seen,
    creatures: creatures.length,
    boss,
    archive,
  };
}
