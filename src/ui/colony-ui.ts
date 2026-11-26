import type { World } from "../core/world";
import type { Interface } from "./interface";
import type { Settings } from "../core/types";
import { items, type ItemId } from "../data/content";
import {
  buildings,
  definition,
  categories,
  colonyTech,
  partNames,
  type PartId,
  type BuildingKind,
  type Category,
} from "../colony/catalog";
import type { Building, Role, Robot } from "../colony/types";
import { occupiedSlots } from "../systems/inventory";
export type ColonyTab =
  | "overview"
  | "energy"
  | "production"
  | "storage"
  | "personnel"
  | "defense"
  | "research"
  | "ship";
export const colonyView = {
  tab: "overview" as ColonyTab,
  category: "structure" as Category,
};
export function refreshColonyStatus(w: World) {
  const c = w.colony,
    b = c.find(c.selected),
    el = document.querySelector(".facility-status");
  if (b && el) {
    const s = c.statuses.get(b.id);
    el.textContent = `${s?.reason ?? "대기"} · ${s?.connected ? "중앙 창고 연결" : "물류 미연결"} · HP ${Math.ceil(b.hp)}/${c.maxHp(b)} · ${b.job ? b.job.remaining.toFixed(1) + "초 남음" : "생산 대기"}`;
  }
  document
    .querySelectorAll<HTMLButtonElement>('[data-action="cb-research"]')
    .forEach((b) => {
      const done = c.state.technologies.includes(b.dataset.value!);
      b.disabled = done || !!c.state.research;
      b.textContent = done
        ? "연구 완료"
        : c.state.research && c.state.research.id === b.dataset.value
          ? `${c.state.research.remaining.toFixed(1)}초 남음`
          : "연구 시작";
    });
}
export function colonyHud(w: World) {
  const c = w.colony;
  if (!c.state.enabled) return "";
  return `<div class="colony-live"><span>SECTOR 01 · Lv.${c.level}</span><span>${c.night ? "☾" : "☀"} ${c.networks.reduce((n, p) => n + p.generation, 0).toFixed(0)} EU / 부하 ${c.networks.reduce((n, p) => n + p.demand, 0).toFixed(0)}</span>${c.siege ? `<strong>⚠ ${c.siege.phase === "preparing" ? "오른쪽 접근 · 방어 준비" : "COLONY SIEGE"} ${Math.ceil(c.siege.remaining)}s</strong>` : ""}</div>`;
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const btn = (label: string, action: string, value = "", disabled = false) =>
  `<button data-action="cb-${action}" data-value="${value}" ${disabled ? "disabled" : ""}>${label}</button>`;
const cost = (w: World, cost: Partial<Record<ItemId, number>>) =>
  Object.entries(cost)
    .map(
      ([id, n]) =>
        `<span class="${w.survival.storage.available(id as ItemId) < n! ? "shortage" : ""}">${items[id as ItemId].name} ${w.survival.storage.available(id as ItemId)}/${n}</span>`,
    )
    .join(" · ");
const table = (headers: string[], rows: string[][]) =>
  `<div class="colony-table-wrap"><table class="colony-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
export function colonyMetrics(w: World) {
  const c = w.colony;
  return `<div class="colony-metrics"><div><small>COLONY LEVEL</small><strong>0${c.level}</strong></div><div><small>GENERATION / LOAD</small><strong>${c.networks.reduce((n, p) => n + p.generation, 0).toFixed(0)} / ${c.networks.reduce((n, p) => n + p.demand, 0).toFixed(0)} <em>EU</em></strong></div><div><small>STORAGE</small><strong>${occupiedSlots(w.survival.state.warehouse)} <em>/ ${c.capacity}</em></strong></div><div><small>EDEN LOCAL TIME</small><strong>${c.night ? "☾ NIGHT" : "☀ DAY"} <em>${Math.floor(c.state.day / 60)}:${String(Math.floor(c.state.day % 60)).padStart(2, "0")}</em></strong></div></div>`;
}
function facility(w: World, b: Building) {
  const c = w.colony,
    d = definition(b.kind),
    s = c.statuses.get(b.id),
    list = c.recipeList(b);
  return `<article class="facility-detail"><p class="eyebrow">FACILITY ${b.id} / ${categories[d.category]}</p><h3>${d.name} <small>Lv.${b.level}</small></h3><p>${d.description}</p><p class="facility-status">${s?.reason ?? "상태 계산 중"} · ${s?.connected ? "중앙 창고 연결" : "물류 미연결"} · HP ${Math.ceil(b.hp)}/${c.maxHp(b)}</p><progress value="${b.hp}" max="${c.maxHp(b)}"></progress><div class="colony-controls">${btn(b.enabled ? "일시정지" : "작동 재개", "toggle", String(b.id), b.kind === "terminal")}${btn("철괴 1 → 내구도 +300", "repair", String(b.id), b.hp >= c.maxHp(b))}${btn("시설 위치 보기", "locate", String(b.id))}</div><p>Lv.${b.level} → ${Math.min(3, b.level + 1)} : 생산 속도 +30% / 발전 +35% / 창고 +기본 용량 / 소비 전력 −8% / 내구도 +50%</p><p>${cost(w, { ironBar: b.level * 3, electronics: b.level })} · ${b.level === 1 ? "산업 자동화" : "첨단 개척"} 연구 필요</p>${btn("시설 업그레이드", "upgrade", String(b.id), b.level >= 3)}<label>전력·생산 우선순위 <select id="building-priority">${[1, 2, 3, 4].map((i) => `<option value="${i}" ${i === b.priority ? "selected" : ""}>${i}순위</option>`).join("")}</select></label>${btn("우선순위 적용", "priority", String(b.id))}${
    list.length
      ? `<hr><h4>중앙 창고 자동 생산</h4><p>연결 범위 480 · 관리소 작동 시 기지 전체 연결. 재료는 작업 시작 때 보관하고 완성품은 창고에 저장합니다.</p><label>생산 레시피 <select id="auto-recipe">${list
          .map(
            (r) =>
              `<option value="${r.id}" ${r.id === b.recipe ? "selected" : ""}>${r.name} · ${r.seconds}s · ${Object.entries(
                r.cost,
              )
                .map(([id, n]) => items[id as ItemId].name + " " + n)
                .join(", ")}</option>`,
          )
          .join(
            "",
          )}</select></label><div class="colony-controls"><label>목표 수량 <input id="auto-target" type="number" min="1" max="999" value="${b.target}"></label><label>방식 <select id="auto-repeat"><option value="yes" ${b.repeat ? "selected" : ""}>창고 목표까지 반복 보충</option><option value="no" ${!b.repeat ? "selected" : ""}>이번 생산 목표만</option></select></label>${btn("자동 생산 적용", "configure", String(b.id))}</div><p>이번 설정 생산량 ${b.produced} · ${b.job ? `작업 ${b.job.remaining.toFixed(1)}초 남음` : "대기"} · 재설정 시 진행 중 자재 전액 반환</p>`
      : ""
  }${!b.legacy ? `<hr><p>철거: 건설 중 또는 완료 후 15초까지 전액, 이후 80% 반환(소수점 버림). 작업 재료는 전액 반환합니다.</p>${btn("시설 철거 및 환불", "demolish", String(b.id))}` : "<p>기존 복구 시설 · 보호됨 / 철거 불가</p>"}</article>`;
}
export function colonyPanel(w: World) {
  const c = w.colony;
  if (!c.unlocked)
    return '<p>Phase 3의 개척 기술 연구와 기지 건설 설계도를 확보하면 SECTOR 01이 열립니다.</p><button data-action="hub">작업실 · 연구 확인</button>';
  c.initialize();
  const tabs: Record<ColonyTab, string> = {
    overview: "기지 현황",
    energy: "전력",
    production: "생산",
    storage: "창고",
    personnel: "인원",
    defense: "방어",
    research: "개척 연구",
    ship: "ASTRA-01",
  };
  let body = "";
  const b = c.find(c.selected);
  if (colonyView.tab === "overview")
    body = `<div class="colony-hero"><div><p class="eyebrow">FROM SURVIVOR TO PIONEER</p><h3>${escape(c.state.name)}</h3><p>시설 ${c.state.buildings.length} · 정착민 ${c.state.settlers.length}/10 · 로봇 ${c.state.robots.length}/20</p><p>Lv.2 채굴·연구·산소·포탑 → Lv.3 공장·자동화·결정 전력·거주 → Lv.4 의료·온실·분석·정착민 → Lv.5 코어 발전·우주항·항법·납품</p></div><div class="colony-orbit">⌬<span>SECTOR 01</span></div></div><div class="colony-controls">${btn("B · 건설 시작", "build")}${btn("개척 구역으로 이동", "travel")}${btn("현황 새로고침", "refresh")}${btn("비상 수동 정제 · 잔해 3 → 철괴 1", "emergency")}</div>${c.offlineReport ? `<p class="notice">${escape(c.offlineReport)}</p>` : ""}<p>20분 주기 · 낮 12분 / 밤 8분. 일시정지 메뉴에서는 시간이 멈춥니다.</p>`;
  if (colonyView.tab === "energy")
    body = `<p>반경으로 연결된 전력망을 각각 계산합니다. 전력 부족 시 낮은 숫자 순위부터 공급합니다.</p>${table(
      ["전력망", "발전 / 수요 / 공급", "축전지", "시설 수"],
      c.networks.map((p) => [
        "NET " + (p.id + 1),
        `${p.generation.toFixed(0)} / ${p.demand.toFixed(0)} / ${p.used.toFixed(0)} EU`,
        `${p.stored.toFixed(0)} / ${p.capacity} EU·s`,
        String(p.members.length),
      ]),
    )}<p>축전지 200 EU·s / Lv.당 충·방전 20 EU. 결정 발전기: 결정 1개/60초. 플라즈마: 고밀도 셀 1개/120초. 태양광 야간 정지.</p>`;
  if (colonyView.tab === "production")
    body = `<p>자동 생산은 중앙 창고만 사용합니다. 최소 보유량은 연료와 자동 작업에도 적용됩니다.</p>${table(
      ["시설", "품목 / 목표", "작업", "상태"],
      c.state.buildings
        .filter((b) => b.kind.startsWith("miner") || c.recipeList(b).length)
        .map((b) => [
          btn(definition(b.kind).name, "select", String(b.id)),
          `${b.recipe || "매장 광물 / 미설정"} · ${b.target}`,
          b.job ? `${b.job.remaining.toFixed(1)}초` : `생산 ${b.produced}`,
          c.statuses.get(b.id)?.reason ?? "대기",
        ]),
    )}`;
  if (colonyView.tab === "production")
    body +=
      "<h4>가동 시 예상 자원 흐름 / 분</h4>" +
      table(
        ["자원", "생산", "소비", "순생산"],
        Object.entries(c.projectedFlows()).map(([id, f]) => [
          items[id as ItemId].name,
          f!.output.toFixed(1),
          f!.input.toFixed(1),
          (f!.output - f!.input).toFixed(1),
        ]),
      ) +
      "<p>현재 연결·전력·레시피의 기본 예상치입니다. 정착민·로봇 보너스, 충전 연료와 수동 작업은 제외합니다. 재료 부족·목표 도달 시 0으로 표시합니다.</p>";
  if (colonyView.tab === "storage")
    body = `<p>개인 창고와 동일한 중앙 자원입니다. 새 창고는 실제 저장 용량을 늘립니다. 수리·건설용 최소 보유량을 지정하세요.</p><div class="colony-controls"><input id="colony-search" placeholder="자원 검색" aria-label="창고 자원 검색"><button data-action="cb-filter">검색</button><button data-action="hub-tab" data-value="storage">가방 ↔ 창고 이동</button></div><div id="colony-stock">${table(
      ["자원", "보유", "최소 보유", "설정"],
      Object.entries(w.survival.state.warehouse)
        .filter(([, n]) => n! > 0)
        .map(([id, n]) => [
          items[id as ItemId].name,
          String(n),
          String(c.state.reserve[id as ItemId] ?? 0),
          `<input aria-label="${items[id as ItemId].name} 최소 보유량" id="reserve-${id}" type="number" min="0" max="9999" value="${c.state.reserve[id as ItemId] ?? 0}">${btn("적용", "reserve", id)}`,
        ]),
    )}</div>`;
  if (colonyView.tab === "personnel")
    body = `<p>EDEN 외부 공기는 호흡 가능합니다. 정착민은 전력·산소가 연결된 거주 모듈이 필요합니다. 시설을 선택한 뒤 알맞은 직업을 배치하세요.</p><div class="colony-controls">${btn("구조 신호 수신 · Lv.3", "rescue")}${(["engineer", "scientist", "miner", "medic", "security"] as Role[]).map((r, i) => btn(["엔지니어", "과학자", "채굴 전문가", "의무관", "보안 담당자"][i] + " 맞이하기", "recruit", r)).join("")}</div>${table(
      ["정착민 / 직업", "거주", "담당 시설", "배치"],
      c.state.settlers.map((s) => [
        escape(s.name) + " / " + s.role,
        c.habitable(s.home) ? "거주 가능 · 22°C" : "전력·산소 공급 필요",
        c.find(s.assigned)
          ? definition(c.find(s.assigned)!.kind).name
          : "미배치",
        btn("선택 시설에 배치", "assign", String(s.id)),
      ]),
    )}<p>산업·채굴·연구·보안 +15% / 의무관 회복 +2 HP/s. 거주 환경 중단 시 보너스도 정지합니다.</p><h4>지원 로봇</h4><p>선택한 정거장에서 제작: 철괴 2 + 전자 부품 2. 지상 장애물 위를 이동하는 호버 로봇이며 충전소로 자동 복귀합니다.</p><div class="colony-controls">${(["miner", "repair", "explorer"] as Robot["role"][]).map((r, i) => btn(["채굴 보조", "수리", "탐사"][i] + " 로봇 제작", "robot", r)).join("")}</div>${table(
      ["로봇", "상태", "충전", "역할"],
      c.state.robots.map((r) => [
        String(r.id),
        r.state,
        r.charge.toFixed(0) + "%",
        r.role,
      ]),
    )}<p>컨베이어·분배기·물류 드론 운송은 후속 확장 항목입니다. 현재 중앙 창고 물류를 사용합니다.</p>`;
  if (colonyView.tab === "defense")
    body = `<div class="colony-hero"><div><p class="eyebrow">COLONY SIEGE</p><h3>${c.siege ? `${c.siege.phase === "preparing" ? "오른쪽 접근 · 준비" : "방어 전투"} ${Math.ceil(c.siege.remaining)}s` : c.lastSiege}</h3><p>수동으로 시작하며 기지를 떠나거나 사망하면 안전하게 종료됩니다. 오프라인 침공 없음. 손상 시설은 철괴로 수리할 수 있습니다.</p></div></div><div class="colony-controls">${btn("30초 후 침공 시작", "siege")}${btn(c.state.siegeEnabled ? "반복 침공 끄기" : "반복 침공 켜기", "siege-setting")}${btn("침공 중단", "siege-abort", undefined, !c.siege)}</div><p>첫 승리: 500 크레딧·연구 자료 5·생체 물질 8. 반복 승리에는 경험치·자원 보상이 없습니다.</p>`;
  if (colonyView.tab === "research")
    body = `<p>기존 개척 기술을 이어받는 6개 분야 · ${w.survival.state.researchPoints} RP · ${c.state.research ? colonyTech[c.state.research.id].name + " " + c.state.research.remaining.toFixed(1) + "초" : "연구 대기"}</p><div class="colony-tech">${Object.entries(
      colonyTech,
    )
      .map(
        ([id, t]) =>
          `<article><small>${t.branch}</small><h4>${t.name}</h4><p>${t.description}</p><p>선행: ${t.requires.map((id) => colonyTech[id].name).join(", ") || "기지 설계도"}</p><p>${cost(w, t.cost)} · ${t.points} RP · ${t.seconds}초</p>${btn(c.state.technologies.includes(id) ? "연구 완료" : "연구 시작", "research", id, c.state.technologies.includes(id) || !!c.state.research)}</article>`,
      )
      .join("")}</div>`;
  if (colonyView.tab === "ship")
    body = `<div class="colony-hero"><div><p class="eyebrow">ASTRA-01 / REPAIR PROTOCOL</p><h3>다음 세계를 향한 준비</h3><p>부품 납품은 한 번만 이루어집니다. 고대 코어 분석에는 타이탄 코어와 파수꾼 코어 조각을 사용하며 분석 기록이 저장됩니다.</p>${btn("잔해 조사", "inspect")}${btn(c.state.coreAnalyzed ? "고대 코어 분석 완료" : "고대 코어 분석", "analyze", "", c.state.coreAnalyzed)}</div><div class="colony-orbit">△<span>ASTRA-01</span></div></div>${table(
      ["수리 부품", "중앙 창고 + 가방", "진행"],
      Object.entries(partNames).map(([id, name]) => [
        name,
        String(w.survival.storage.available(id as PartId)),
        btn(
          c.state.ship.includes(id as PartId) ? "납품 완료" : "부품 납품",
          "deliver",
          id,
          c.state.ship.includes(id as PartId),
        ),
      ]),
    )}<p>우주항 관제소 전력이 필요합니다. 착륙 장치는 선체 패널에 포함됩니다. 실제 발사·다른 행성 이동은 Phase 5 콘텐츠입니다.</p>`;
  return `<nav class="colony-tabs">${Object.entries(tabs)
    .map(
      ([id, label]) =>
        `<button class="${colonyView.tab === id ? "active" : ""}" data-action="cb-tab" data-value="${id}">${label}</button>`,
    )
    .join(
      "",
    )}${btn("↻ 새로고침", "refresh")}</nav><div id="colony-metrics">${colonyMetrics(w)}</div>${body}<details ${b ? "open" : ""} class="colony-facilities"><summary>시설 선택 및 관리 · ${b ? definition(b.kind).name : "시설을 선택하세요"}</summary><div class="colony-facility-list">${c.state.buildings.map((b) => `<button class="${b.id === c.selected ? "active" : ""}" data-action="cb-select" data-value="${b.id}">#${b.id} ${definition(b.kind).name} <small>${c.statuses.get(b.id)?.reason ?? "대기"}</small></button>`).join("")}</div>${b ? facility(w, b) : ""}</details>`;
}
export function builderPanel(w: World) {
  const c = w.colony,
    kind = c.blueprint,
    d = kind ? definition(kind) : null;
  return `<div class="build-top"><div><p class="eyebrow">COLONY RISING / SECTOR 01</p><strong>새로운 세계에, 첫 번째 집을.</strong></div><div>${btn("전력망", "overlay", "power")}${btn("물류망", "overlay", "logistics")}${btn("−", "zoom", "out")}${btn("+", "zoom", "in")}${btn("전체 보기", "zoom", "all")}${btn("ESC · 탐험 복귀", "exit")}</div></div><aside class="build-palette"><p class="eyebrow">CONSTRUCTION LIBRARY</p><nav>${Object.entries(
    categories,
  )
    .map(
      ([id, name]) =>
        `<button class="${colonyView.category === id ? "active" : ""}" data-action="cb-category" data-value="${id}">${name}</button>`,
    )
    .join("")}</nav><div class="build-list">${Object.entries(buildings)
    .filter(
      ([id, b]) => b.category === colonyView.category && id !== "terminal",
    )
    .map(
      ([id, d]) =>
        `<button data-action="cb-blueprint" data-value="${id}" class="${kind === id ? "active" : ""}"><span>${d.name}</span><small>${d.tech && !c.state.technologies.includes(d.tech) ? "🔒 " + colonyTech[d.tech].name : `${d.w / 40}×${Math.ceil(d.h / 40)} · ${d.seconds}s · ${d.generation ? "+" + d.generation : d.power ? "-" + d.power : 0} EU`}</small></button>`,
    )
    .join(
      "",
    )}</div><div class="build-spec">${d ? `<h3>${d.name}</h3><p>${d.description}</p><p>${cost(w, d.cost)}</p>` : "<h3>시설 선택</h3><p>건물을 클릭하면 관리 화면이 열립니다.</p>"}</div><div class="colony-controls">${btn("선택", "blueprint", "none")}${btn(c.demolishing ? "철거 켜짐" : "X · 철거", "demolition")}${btn("O · 관리", "command")}</div></aside><div class="build-bottom"><strong id="build-validity">격자 위에서 건설 위치를 선택하세요.</strong><p>왼쪽 클릭 배치 · 오른쪽 클릭 취소 · 화살표 / 화면 가장자리 이동 · 휠 확대 · X 철거 · ESC 나가기</p></div>`;
}
export function colonyAction(
  w: World,
  ui: Interface,
  action: string,
  value: string | undefined,
  settings: Settings,
  renderBuilder: () => void,
) {
  if (!action.startsWith("cb-")) return false;
  const c = w.colony,
    a = action.slice(3),
    id = Number(value);
  const read = (id: string) =>
    (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)
      ?.value ?? "";
  if (
    !w.survival.inBase &&
    ![
      "tab",
      "select",
      "refresh",
      "build",
      "exit",
      "command",
      "category",
      "blueprint",
      "demolition",
      "overlay",
      "zoom",
      "travel",
      "filter",
    ].includes(a)
  ) {
    w.toast("시설 변경은 기지에 돌아온 뒤 가능합니다.");
    return true;
  }
  switch (a) {
    case "tab":
      colonyView.tab = value as ColonyTab;
      break;
    case "select":
      c.selected = id;
      break;
    case "emergency":
      c.emergencyRefine();
      break;
    case "refresh":
      break;
    case "build":
      if (!c.unlocked || w.region !== "crash" || w.dead || c.siege) {
        w.toast(
          "설계도 확보 후 기지에서 건설할 수 있습니다. 침공 중에는 건설 모드가 제한됩니다.",
        );
        return true;
      }
      c.initialize();
      c.buildMode = true;
      c.view.x = Math.max(0, w.player.x - 500);
      if (w.player.x < 3200) c.view.x = 3200;
      c.view.y = 180;
      c.view.zoom = 1;
      w.count("colonyOpen");
      ui.close();
      renderBuilder();
      return true;
    case "exit":
      c.buildMode = false;
      renderBuilder();
      return true;
    case "command":
      c.buildMode = false;
      renderBuilder();
      ui.open("colony", w, settings);
      return true;
    case "category":
      colonyView.category = value as Category;
      renderBuilder();
      return true;
    case "blueprint":
      c.blueprint = value === "none" ? null : (value as BuildingKind);
      c.demolishing = false;
      renderBuilder();
      return true;
    case "demolition":
      c.demolishing = !c.demolishing;
      c.blueprint = null;
      renderBuilder();
      return true;
    case "overlay":
      c.overlay = value as "power" | "logistics";
      return true;
    case "zoom": {
      const old = c.view.zoom;
      const z =
        value === "all"
          ? 0.16
          : Math.max(0.16, Math.min(1.6, old * (value === "in" ? 1.25 : 0.8)));
      c.view.x += 640 / old - 640 / z;
      c.view.y += 360 / old - 360 / z;
      c.view.zoom = z;
      if (value === "all") {
        c.view.x = 2600;
        c.view.y = -1600;
      }
      return true;
    }
    case "travel":
      if (c.siege) {
        w.toast("침공 중에는 이동할 수 없습니다.");
        return true;
      }
      w.enterRegion("crash", 3400);
      ui.close();
      return true;
    case "locate": {
      const b = c.find(id);
      if (b) {
        c.buildMode = true;
        c.blueprint = null;
        c.view = { x: Math.max(0, b.x - 500), y: 180, zoom: 1 };
        ui.close();
        renderBuilder();
      }
      return true;
    }
    case "toggle":
      c.toggle(id);
      break;
    case "repair":
      c.repair(id);
      break;
    case "upgrade":
      c.upgrade(id);
      break;
    case "demolish":
      c.demolish(id);
      break;
    case "priority": {
      const b = c.find(id);
      if (b)
        b.priority = Math.max(
          1,
          Math.min(4, Number(read("building-priority"))),
        );
      w.emit("save", "priority");
      break;
    }
    case "configure":
      c.configure(
        id,
        read("auto-recipe"),
        read("auto-repeat") === "yes",
        Number(read("auto-target")),
      );
      break;
    case "reserve":
      c.setReserve(value as ItemId, Number(read("reserve-" + value)));
      break;
    case "filter": {
      const search = read("colony-search").toLowerCase();
      document
        .querySelectorAll<HTMLTableRowElement>("#colony-stock tbody tr")
        .forEach(
          (r) =>
            (r.hidden = !r.cells[0].textContent
              ?.toLowerCase()
              .includes(search)),
        );
      return true;
    }
    case "research":
      c.startResearch(value!);
      break;
    case "rescue":
      c.rescue();
      break;
    case "recruit":
      c.recruit(value as Role);
      break;
    case "assign":
      c.assign(id, c.selected);
      break;
    case "robot":
      c.addRobot(value as Robot["role"], c.selected);
      break;
    case "siege":
      if (c.startSiege()) ui.close();
      return true;
    case "siege-setting":
      c.state.siegeEnabled = !c.state.siegeEnabled;
      w.emit("save", "siege-settings");
      break;
    case "siege-abort":
      c.abortSiege();
      break;
    case "inspect":
      c.inspectShip();
      break;
    case "analyze":
      c.analyzeCore();
      break;
    case "deliver":
      c.deliverPart(value as PartId);
      break;
  }
  if (c.buildMode) renderBuilder();
  else ui.open("colony", w, settings);
  return true;
}
