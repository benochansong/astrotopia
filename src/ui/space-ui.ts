import type { World } from "../core/world";
import { items, type ItemId } from "../data/content";
import {
  shipSystems,
  upgrades,
  starPlanets,
  type ShipSystemId,
  type ShipUpgrade,
  type PlanetId,
} from "../space/catalog";
import { occupiedSlots } from "../systems/inventory";
const button = (name: string, action: string, value = "", disabled = false) =>
  '<button data-action="sp-' +
  action +
  '" data-value="' +
  value +
  '" ' +
  (disabled ? "disabled" : "") +
  ">" +
  name +
  "</button>";
const cost = (c: object) =>
  Object.entries(c)
    .map(([id, n]) => items[id as ItemId].name + " ×" + n)
    .join(" · ");
export let spaceTab = "ship";
export let cargoSearch = "";
export function spacePanel(w: World) {
  const s = w.space,
    state = s.state;
  const nav =
    '<nav class="colony-controls">' +
    [
      ["ship", "우주선"],
      ["map", "항성계 지도"],
      ["cargo", "화물 운송"],
      ["bases", "행성 기지"],
    ]
      .map(([id, name]) => button(name, "tab", id))
      .join("") +
    "</nav>";
  let body = "";
  if (state.trip)
    return (
      nav +
      '<div class="flight-panel"><p class="eyebrow">' +
      (state.trip.kind === "ascent"
        ? "FIRST ASCENT"
        : "INTERPLANETARY TRANSIT") +
      "</p><h2>" +
      state.trip.from.toUpperCase() +
      " → " +
      state.trip.to.toUpperCase() +
      "</h2><p>항해 중 · 연료 " +
      state.trip.cost +
      ' 사용 · 중단 후 계속 가능</p><p id="flight-time">' +
      Math.ceil(state.trip.remaining) +
      "초</p>" +
      button("연출 건너뛰기 · 도착", "skip") +
      "</div>"
    );
  if (spaceTab === "ship")
    body =
      '<div class="space-status"><h2>' +
      (state.upgrades.length ? "PATHFINDER" : "ASTRA-01") +
      "</h2><p>" +
      state.location.toUpperCase() +
      " · " +
      (w.region === "ship" ? "선내" : "지상") +
      " · 연료 " +
      state.fuel +
      "/100 · 수리 " +
      state.repaired.length +
      "/7</p>" +
      button("이전 납품 기록 점검", "inspect") +
      button(
        w.region === "ship" ? "지상으로 내리기" : "우주선 탑승",
        "board",
        "",
        !s.docked,
      ) +
      button("항해 연료 충전", "fuel", "", !s.docked) +
      button("현지 광물로 비상 연료 +5", "manual", "", !s.docked) +
      '</div><p>비상 연료: EDEN 결정 1 + 구리 1 / ARES 사막 결정 1 + 붉은 철 1. 선내에서 전력 없이 제작 가능.</p><div class="space-grid">' +
      Object.entries(shipSystems)
        .map(
          ([id, d]) =>
            "<article><h3>" +
            d.name +
            "</h3><p>" +
            cost(d.cost) +
            "</p>" +
            button(
              state.repaired.includes(id as ShipSystemId)
                ? "복구 완료"
                : "복구",
              "repair",
              id,
              state.repaired.includes(id as ShipSystemId) || !s.docked,
            ) +
            "</article>",
        )
        .join("") +
      "</div><p>U 우주선 관리 · F 탑승 / 조종실 · 생활실 자동 회복 · L 연구·제작</p><h3>개별 장치 강화 · PATHFINDER 연구 필요</h3>" +
      Object.entries(upgrades)
        .map(
          ([id, d]) =>
            "<article><b>" +
            d.name +
            "</b><p>" +
            d.effect +
            "</p><small>" +
            cost(d.cost) +
            "</small>" +
            button(
              state.upgrades.includes(id as ShipUpgrade) ? "강화 완료" : "강화",
              "upgrade",
              id,
              state.upgrades.includes(id as ShipUpgrade),
            ) +
            "</article>",
        )
        .join("");
  if (spaceTab === "map")
    body =
      '<div class="stellar-map">' +
      starPlanets
        .map(
          (p, i) =>
            '<div class="star-node" style="--planet:' +
            p.color +
            ";--orbit:" +
            i +
            '"><span class="planet-disc"></span><b>' +
            p.name +
            "</b><small>" +
            p.type +
            " · " +
            (p.gravity ?? "?") +
            " G</small></div>",
        )
        .join("") +
      "</div><p>EDEN ↔ ARES 편도 " +
      s.fuelCost +
      " / 왕복 " +
      s.fuelCost * 2 +
      " 연료 · 최초 이륙 5 연료 · ARES 최초 착륙 비상 귀환 연료 15 제공</p>" +
      (!state.launched
        ? button("첫 이륙 · 20초", "ascent", "", !!s.reason("eden", true)) +
          "<p>" +
          s.reason("eden", true) +
          "</p>"
        : "") +
      '<div class="space-grid">' +
      starPlanets
        .map(
          (p) =>
            "<article><h3>" +
            p.name +
            "</h3><p>Lv." +
            p.level +
            " · " +
            p.hazard +
            "</p>" +
            button(
              p.id === "ares" ? "ARES 신호 조사" : "좌표 확인",
              "scan",
              p.id,
            ) +
            button(
              p.available ? "항해 시작" : "후속 콘텐츠",
              "travel",
              p.id,
              !p.available || !!s.reason(p.id as PlanetId),
            ) +
            "<small>" +
            (p.available ? s.reason(p.id as PlanetId) : "현재 탐험 불가") +
            "</small></article>",
        )
        .join("") +
      "</div>";
  if (spaceTab === "cargo") {
    const rows = (inv: typeof state.cargo, mode: string) =>
      Object.entries(inv)
        .filter(
          ([id, n]) => n && items[id as ItemId].name.includes(cargoSearch),
        )
        .map(
          ([id, n]) =>
            '<div class="cargo-row"><span>' +
            items[id as ItemId].name +
            " ×" +
            n +
            "</span>" +
            button("1개", "cargo", mode + ":" + id + ":1") +
            button("전체", "cargo", mode + ":" + id + ":" + n) +
            "</div>",
        )
        .join("");
    body =
      '<input id="cargo-search" placeholder="자원 검색" aria-label="화물 검색"><p>정박 중 운송 · 화물 ' +
      occupiedSlots(state.cargo) +
      " / " +
      s.capacity +
      '칸 · 행성 창고는 서로 독립적입니다.</p><div class="space-grid"><article><h3>인벤토리 → 화물</h3>' +
      rows(w.inventory, "load") +
      "</article><article><h3>현지 창고 → 화물</h3>" +
      rows(w.survival.state.warehouse, "store") +
      "</article><article><h3>화물 → 인벤토리</h3>" +
      rows(state.cargo, "unload") +
      "</article><article><h3>화물 → 현지 창고</h3>" +
      rows(state.cargo, "deliver") +
      "</article></div>";
  }
  if (spaceTab === "bases") {
    s.capture();
    body =
      "<p>방문한 행성의 생산은 연료·전력·창고 공간을 사용해 계속됩니다. 오프라인 최대 4시간. 원격 건설·수리는 지원하지 않습니다.</p>" +
      Object.entries(state.planets)
        .map(
          ([id, p]) =>
            "<article><h3>" +
            id.toUpperCase() +
            " · 시설 " +
            p!.colony.buildings.length +
            "</h3><p>창고 " +
            occupiedSlots(p!.local.warehouse) +
            "칸 · " +
            (id === state.location ? "현재 행성" : "원격 생산 중") +
            "</p>" +
            p!.colony.buildings
              .filter((b) => !b.legacy)
              .map(
                (b) =>
                  "<p>#" +
                  b.id +
                  " " +
                  b.kind +
                  " " +
                  (b.enabled ? "가동" : "정지") +
                  " " +
                  button(
                    "가동 전환",
                    "remote",
                    id + ":" + b.id,
                    !w.survival.state.technologies.includes("planetComms"),
                  ) +
                  "</p>",
              )
              .join("") +
            "</article>",
        )
        .join("");
  }
  return nav + body;
}
export function spaceAction(w: World, action: string, value = "") {
  if (!action.startsWith("sp-")) return false;
  const a = action.slice(3),
    s = w.space;
  if (a === "tab") spaceTab = value;
  else if (a === "inspect") s.inspect();
  else if (a === "board") s.board();
  else if (a === "fuel") s.refuel();
  else if (a === "manual") s.emergencyFuel();
  else if (a === "repair") s.repair(value as ShipSystemId);
  else if (a === "upgrade") s.upgrade(value as ShipUpgrade);
  else if (a === "ascent") s.launch("eden", true);
  else if (a === "travel") s.launch(value as PlanetId);
  else if (a === "skip") s.arrive();
  else if (a === "scan" && value === "ares") {
    s.once("aresScan");
    w.toast("ARES 탐사 좌표 기록");
  } else if (a === "cargo") {
    const [mode, id, n] = value.split(":");
    s.transfer(
      id as ItemId,
      Number(n),
      mode === "load" || mode === "store",
      mode === "store" || mode === "deliver",
    );
  } else if (
    a === "remote" &&
    w.survival.state.technologies.includes("planetComms")
  ) {
    const [id, n] = value.split(":");
    if (s.state.planets[id as PlanetId])
      s.withPlanet(id as PlanetId, () => {
        const b = w.colony.state.buildings.find((b) => b.id === Number(n));
        if (b) {
          b.enabled = !b.enabled;
          w.colony.invalidate();
        }
      });
    w.emit("save", "remote");
  }
  return true;
}
