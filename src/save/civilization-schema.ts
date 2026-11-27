import { workforceNames } from "../civilization/workforce";
import { items } from "../data/content";
import { planetIds } from "../space/catalog";
import { occupiedSlots } from "../systems/inventory";
import { contracts, marketPrices } from "../civilization/catalog";
import type { CivilizationSave } from "../civilization/types";
const obj = (v: any) => v && typeof v === "object" && !Array.isArray(v);
const number = (v: any, max = 1e9) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const int = (v: any, max = 1e9) => number(v, max) && Number.isSafeInteger(v);
const array = (v: any, max: number) => Array.isArray(v) && v.length <= max;
const bag = (v: any, slots: number) =>
  obj(v) &&
  Object.entries(v).every(
    ([k, n]) => Object.hasOwn(items, k) && int(n, slots * 99),
  ) &&
  occupiedSlots(v) <= slots;
const unique = (v: any[], max: number) =>
  v.every((n) => int(n, max)) && new Set(v).size === v.length;
export function validCivilization(s: any, space: any): s is CivilizationSave {
  if (
    !obj(s) ||
    s.owner !== "pioneer-local" ||
    !int(s.serial) ||
    !int(s.elapsed) ||
    !number(s.lastClock, 1e15) ||
    typeof s.advanced !== "boolean" ||
    typeof s.odyssey !== "boolean" ||
    !int(s.reputation, 10000) ||
    !obj(s.station) ||
    !int(s.station.stage, 3) ||
    typeof s.station.visited !== "boolean" ||
    !bag(s.station.warehouse, s.station.stage * 300) ||
    !obj(s.stats) ||
    !["bought", "sold", "delivered", "contracts"].every((k) => int(s.stats[k]))
  )
    return false;
  const endpoints = [
    ...planetIds.filter((id) => space?.planets?.[id]),
    ...(s.station.stage ? ["station"] : []),
  ];
  if (
    !array(s.routes, 50) ||
    !array(s.ships, 30) ||
    !array(s.rules, 50) ||
    !array(s.logs, 80) ||
    !array(s.samples, 120) ||
    !array(s.quests, 13) ||
    !unique(s.quests, 12) ||
    !array(s.restored, 7) ||
    new Set(s.restored).size !== s.restored.length ||
    !s.restored.every(
      (p: any) => planetIds.includes(p) && endpoints.includes(p),
    ) ||
    !array(s.contracts, 40) ||
    new Set(s.contracts).size !== s.contracts.length ||
    !s.contracts.every((x: any) =>
      endpoints.some((p) =>
        Object.keys(contracts).some((k) => x === k + "-" + p),
      ),
    ) ||
    !array(s.milestones, 160) ||
    new Set(s.milestones).size !== s.milestones.length ||
    !s.milestones.every((x: any) => typeof x === "string" && x.length <= 50)
  )
    return false;
  const ids = [...s.ships, ...s.routes, ...s.rules, ...s.logs].map(
    (x) => x?.id,
  );
  if (!unique(ids, s.serial) || ids.some((x) => x === 0)) return false;
  for (const r of s.routes)
    if (
      !obj(r) ||
      typeof r.name !== "string" ||
      r.name.length > 40 ||
      !endpoints.includes(r.from) ||
      !endpoints.includes(r.to) ||
      r.from === r.to ||
      !Object.hasOwn(items, r.item) ||
      !int(r.amount, 9900) ||
      r.amount < 1 ||
      !int(r.minimum, 99999) ||
      !int(r.target, 99999) ||
      r.target < 1 ||
      !int(r.interval, 3600) ||
      r.interval < 5 ||
      !int(r.priority, 4) ||
      r.priority < 1 ||
      typeof r.repeat !== "boolean" ||
      typeof r.enabled !== "boolean" ||
      !int(r.delivered)
    )
      return false;
  const assigned: number[] = [];
  for (const f of s.ships) {
    const r = s.routes.find((r: any) => r.id === f?.route);
    if (
      !obj(f) ||
      f.owner !== s.owner ||
      ![1, 2].includes(f.tier) ||
      !endpoints.includes(f.at) ||
      ![
        "Idle",
        "Loading",
        "Departing",
        "InTransit",
        "Arrived",
        "Unloading",
        "Returning",
        "Refueling",
        "Maintenance",
        "Waiting",
      ].includes(f.state) ||
      !number(f.remaining, 3600) ||
      !int(f.fuel, 20) ||
      !int(f.condition, 100) ||
      !bag(f.cargo, f.tier === 1 ? 100 : 300) ||
      typeof f.reason !== "string" ||
      f.reason.length > 100 ||
      typeof f.returning !== "boolean" ||
      (f.route !== null && (!r || assigned.includes(f.route))) ||
      (["Idle", "Refueling", "Maintenance"].includes(f.state) &&
        occupiedSlots(f.cargo) > 0) ||
      (["Loading", "Departing", "InTransit", "Arrived"].includes(f.state) &&
        occupiedSlots(f.cargo) === 0) ||
      (f.route === null && (f.state !== "Idle" || occupiedSlots(f.cargo) > 0))
    )
      return false;
    if (r) {
      assigned.push(r.id);
      if (![r.from, r.to].includes(f.at)) return false;
    }
  }
  for (const r of s.rules)
    if (
      !obj(r) ||
      !endpoints.includes(r.at) ||
      !Object.hasOwn(marketPrices, r.item) ||
      !["buy", "sell"].includes(r.side) ||
      !["threshold", "target", "batch", "price", "reserve", "budget"].every(
        (k) => int(r[k], 1e6),
      ) ||
      r.batch < 1 ||
      r.batch > 1000 ||
      r.price < 1 ||
      r.budget < 1 ||
      typeof r.enabled !== "boolean"
    )
      return false;
  if (
    !obj(s.markets) ||
    !Object.entries(s.markets).every(
      ([p, m]) =>
        endpoints.includes(p as any) &&
        obj(m) &&
        Object.entries(m as object).length ===
          Object.keys(marketPrices).length &&
        Object.entries(m as object).every(
          ([k, n]) => Object.hasOwn(marketPrices, k) && int(n, 10000),
        ),
    )
  )
    return false;
  if (
    !obj(s.cities) ||
    !Object.entries(s.cities).every(
      ([p, c]: [string, any]) =>
        planetIds.includes(p as any) &&
        endpoints.includes(p as any) &&
        obj(c) &&
        int(c.population, 5000) &&
        int(c.wellbeing, 100) &&
        typeof c.supplied === "boolean" &&
        Object.hasOwn(workforceNames, c.focus),
    )
  )
    return false;
  if (
    !s.logs.every(
      (l: any) =>
        obj(l) &&
        int(l.time, s.elapsed) &&
        typeof l.text === "string" &&
        l.text.length <= 200,
    ) ||
    !s.samples.every(
      (t: any) =>
        obj(t) &&
        int(t.time, s.elapsed) &&
        int(t.credits) &&
        int(t.population, 35000) &&
        int(t.delivered),
    )
  )
    return false;
  return true;
}
