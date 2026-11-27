import { colonyHud } from "./colony-ui";
import { statNames } from "./battle-ui";
import type { World } from "../core/world";
import { items, regions, type ItemId } from "../data/content";
import {
  recipes,
  technologies,
  environmentGear,
  environments,
  toolsData,
  facilities,
  regionEnvironment,
  type Recipe,
  type Facility,
} from "../survival/catalog";
import { TechnologyTreeSystem } from "../survival/ResearchSystem";
import { ResourceSystem, CodexSystem } from "../survival/DiscoverySystem";
import { occupiedSlots } from "../systems/inventory";
import { gearTemplates } from "../data/battle";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export type HubTab =
  | "facilities"
  | "craft"
  | "refine"
  | "research"
  | "storage"
  | "codex"
  | "environment";
export const hubTabs: Record<HubTab, string> = {
  facilities: "작업 시설",
  craft: "제작",
  refine: "정제",
  research: "기술 연구",
  storage: "개인 창고",
  codex: "도감",
  environment: "환경 분석",
};
const icon = (id: ItemId) =>
  `<span class="resource-icon" style="--resource:${items[id].color}">${items[id].icon}</span>`;
function product(r: Recipe) {
  const p = r.result;
  return p.kind === "item"
    ? `${icon(p.id)}<b>${items[p.id].name} ×${p.count}</b>`
    : p.kind === "gear"
      ? `<span class="resource-icon">⌁</span><b>${gearTemplates[p.id].name}</b>`
      : `<span class="resource-icon">${p.kind === "tool" ? "⚒" : "⬡"}</span><b>${r.name}</b>`;
}
function cost(w: World, c: Record<string, number | undefined>, n = 1) {
  return Object.entries(c)
    .map(([id, value]) => {
      const item = id as ItemId,
        have = w.survival.storage.available(item),
        need = value! * n,
        info = ResourceSystem.info(item);
      const source = info.regions.join(" · ") || "기지 정제·제작";
      return `<li class="${have < need ? "missing" : "available"}">${items[item].icon} ${items[item].name}<b>${have} / ${need}</b><small>${source}</small></li>`;
    })
    .join("");
}
export function productionQueue(w: World) {
  return `<div class="queue-heading"><h3>작업 대기열 <small>${w.survival.state.jobs.length}/12</small></h3><span>시설별 순차 생산 · 탐험·오프라인 유지</span></div>${w.survival.state.jobs.length ? w.survival.state.jobs.map((j) => `<div class="production-job"><span>${j.kind === "craft" ? recipes[j.recipe].name : technologies[j.recipe].name} ×${j.quantity}<small>${j.state === "working" ? (!w.colony.facilityPowered(j.kind === "research" ? "research" : recipes[j.recipe].facility) ? "전력 부족 · 일시정지" : Math.ceil(j.remaining) + "초 남음") : j.state === "ready" ? "완료 · 회수 대기" : "취소 · 재료 반환 대기"}</small></span><progress max="${j.total}" value="${j.total - j.remaining}"></progress><button data-action="${j.state === "working" ? "job-cancel" : "job-claim"}" data-value="${j.id}" ${!w.survival.inBase ? "disabled" : ""}>${j.state === "working" ? "취소" : "회수"}</button></div>`).join("") : '<p class="muted">진행 중인 작업이 없습니다. 완성품은 회수 전까지 보관됩니다.</p>'}<p class="fineprint">작업 취소 시 투입 재료·연구 포인트 100% 반환. 완성 후 취소 불가. 가방·창고가 가득 차면 결과물은 작업함에 남습니다.</p>`;
}
export function survivalHub(
  w: World,
  tab: HubTab,
  selected: string,
  quantity: number,
) {
  const s = w.survival.state;
  let body = "";
  if (tab === "facilities")
    body = `<div class="facility-grid">${Object.entries(facilities)
      .map(
        ([id, f]) =>
          `<article class="facility-card ${s.facilities.includes(id as Facility) ? "online" : "offline"}"><span>${f.icon}</span><h3>${f.name}</h3><small>${s.facilities.includes(id as Facility) ? "ONLINE · 사용 가능" : "OFFLINE · 수리 필요"}</small><ul class="material-list">${cost(w, s.facilities.includes(id as Facility) ? {} : f.cost)}</ul><button data-action="facility-activate" data-value="${id}" ${!w.survival.inBase ? "disabled" : ""}>${s.facilities.includes(id as Facility) ? (id === "terminal" ? "회복 · 분석 · 저장" : "시설 열기") : "수리 및 활성화"}</button></article>`,
      )
      .join(
        "",
      )}</div><p>생존 터미널에서 스캐너와 기초 채굴기를 확보하세요. 광물 정제소 → 연구 터미널 → 장비 작업소 순서로 수리하면 탐험 장비를 제작할 수 있습니다.</p>`;
  if (tab === "craft" || tab === "refine") {
    const list = Object.values(recipes).filter((r) =>
        tab === "refine"
          ? r.facility === "refinery"
          : r.facility !== "refinery",
      ),
      r = list.find((r) => r.id === selected) ?? list[0],
      reason = w.survival.production.reason(r.id, "craft", quantity);
    body = `<div class="recipe-layout"><nav class="recipe-list">${list.map((x) => `<button data-action="recipe-select" data-value="${x.id}" class="${r.id === x.id ? "selected" : ""}">${x.name}<small>${x.tech && !s.technologies.includes(x.tech) ? "잠김 · " + technologies[x.tech].name : facilities[x.facility].name}</small></button>`).join("")}</nav><article class="recipe-detail"><p class="eyebrow">FABRICATION BLUEPRINT</p><div class="product-preview">${product(r)}</div><p>${r.description || "탐험을 위한 보급품과 중간 소재입니다."}</p><dl><dt>필요 시설</dt><dd>${facilities[r.facility].name}</dd><dt>필요 연구</dt><dd>${r.tech ? technologies[r.tech].name : "기초 프로토콜"}</dd><dt>레벨 / 작업 시간</dt><dd>Lv.${r.level} / ${r.seconds * quantity}초</dd></dl>${
      r.result.kind === "environment"
        ? `<p class="stats-preview">${Object.entries(
            environmentGear[r.result.id],
          )
            .filter(([k, v]) => typeof v === "number" && v > 0)
            .map(
              ([k, v]) =>
                `${({ toxic: "독성 저항", radiation: "방사능 저항", unstable: "간섭 저항", oxygen: "최대 산소", defense: "방어력", efficiency: "산소 효율" } as Record<string, string>)[k]} +${k === "efficiency" ? Number(v) * 100 + "%" : v}`,
            )
            .join(" · ")}</p>`
        : ""
    }${
      r.result.kind === "gear"
        ? `<p class="stats-preview">${Object.entries(
            gearTemplates[r.result.id].stats,
          )
            .map(
              ([k, v]) =>
                `${statNames[k as keyof typeof statNames]} +${Number(v).toFixed(2)}`,
            )
            .join(" · ")} · 고급 등급 배율 1.5</p>`
        : ""
    }<ul class="material-list">${cost(w, r.cost, quantity)}</ul><div class="quantity"><span>제작 수량</span>${[1, 5, 10].map((n) => `<button class="${quantity === n ? "selected" : ""}" data-action="production-quantity" data-value="${n}">${n}</button>`).join("")}</div><button class="primary wide" data-action="produce" data-value="${r.id}" ${reason ? "disabled" : ""}>${tab === "refine" ? "정제" : "제작"} 시작</button><p class="reason">${reason || "인벤토리와 창고에서 재료를 함께 사용합니다."}</p></article></div>`;
  }
  if (tab === "research")
    body = `<div class="research-balance"><b>연구 포인트 ${s.researchPoints}</b><span>새 자원·지역·생명체 분석으로 획득</span><button data-action="research-convert" ${!w.survival.inBase ? "disabled" : ""}>연구 데이터 1 → 2포인트</button></div><div class="technology-tree">${TechnologyTreeSystem.branches
      .map(
        (branch) =>
          `<section><h3>${branch}</h3>${TechnologyTreeSystem.nodes(branch)
            .map((t) => {
              const done = s.technologies.includes(t.id),
                pending = s.jobs.some(
                  (j) => j.kind === "research" && j.recipe === t.id,
                ),
                reason = w.survival.production.reason(t.id, "research");
              return `<article class="technology ${done ? "done" : pending ? "working" : reason ? "locked" : "available"}"><span>${done ? "✓" : pending ? "◷" : reason ? "◇" : "⌬"}</span><h4>${t.name}</h4><small>${done ? "연구 완료" : pending ? "연구 진행 중" : reason ? "조건 미충족" : "연구 가능"}</small><p>${t.description}</p><p class="fineprint">선행: ${t.requires.map((id) => technologies[id].name).join(" → ") || "없음"}</p><p class="fineprint">해금: ${
                Object.values(recipes)
                  .filter((r) => r.tech === t.id)
                  .map((r) => r.name)
                  .join(" · ") || t.description
              }</p>${!done ? `<ul class="material-list">${cost(w, t.cost)}</ul><small>${t.points}포인트 · ${t.seconds}초</small><button data-action="research-start" data-value="${t.id}" ${reason ? "disabled" : ""}>연구</button><p class="reason">${reason}</p>` : ""}${branch === "개척" ? "<em>건설 실행은 Phase 4</em>" : ""}</article>`;
            })
            .join("")}</section>`,
      )
      .join("")}</div>`;
  if (tab === "storage") {
    const ids = [
      ...new Set([...Object.keys(w.inventory), ...Object.keys(s.warehouse)]),
    ].filter(
      (id) =>
        (w.inventory[id as ItemId] ?? 0) + (s.warehouse[id as ItemId] ?? 0) > 0,
    ) as ItemId[];
    body = `<div class="storage-summary"><span>가방 ${occupiedSlots(w.inventory) + w.battle.gear.length}/${s.capacity}</span><span>창고 ${occupiedSlots(s.warehouse)}/${w.colony.capacity}</span><button data-action="deposit-all" ${!w.survival.inBase ? "disabled" : ""}>일반 자원 모두 보관</button></div>${inventoryToolbar()}<div class="storage-table"><div class="storage-row headings"><span>아이템</span><b>가방</b><b>창고</b><span>수량</span><span>이동</span></div>${ids.map((id) => `<div class="storage-row filterable" data-name="${items[id].name}" data-type="${items[id].type}" data-count="${(w.inventory[id] ?? 0) + (s.warehouse[id] ?? 0)}" data-rarity="${ResourceSystem.info(id).rarity}"><span>${icon(id)}${items[id].name}</span><b>${w.inventory[id] ?? 0}</b><b>${s.warehouse[id] ?? 0}</b><input aria-label="${items[id].name} 이동 수량" type="number" min="1" max="999" value="1" id="transfer-${id}"><div><button data-action="deposit" data-value="${id}" ${!w.survival.inBase || !w.inventory[id] ? "disabled" : ""}>보관 →</button><button data-action="withdraw" data-value="${id}" ${!w.survival.inBase || !s.warehouse[id] ? "disabled" : ""}>← 출고</button></div></div>`).join("")}</div><p class="muted">동일 자원은 자동으로 합쳐집니다. 스토리 핵심 아이템을 삭제·판매하는 기능은 제공하지 않습니다.</p>`;
  }
  if (tab === "codex")
    body = `<div class="database-summary"><h3>PIONEER DATABASE</h3><p>EDEN · 중력 0.9G · 일반 대기 호흡 가능 · 기온 온화</p><p>발견 자원 ${s.discovered.length}/${Object.keys(items).length} · 지역 ${w.progress.discovered.length}/7 · 생명체 ${w.battle.discovered.length}종</p></div>${inventoryToolbar()}<div class="codex-grid">${CodexSystem.resources(
      w,
    )
      .map(
        (r) =>
          `<article class="filterable ${r.known ? "known" : "unknown"}" data-name="${r.known ? items[r.id].name : "미발견"}" data-type="${items[r.id].type}" data-rarity="${r.rarity}">${r.known ? icon(r.id) : '<span class="resource-icon">?</span>'}<h4>${r.known ? items[r.id].name : "미발견 자원"}</h4><small>${r.known ? items[r.id].type + " · 등급 " + r.rarity : "탐험 중 발견하세요"}</small>${r.known ? `<p>${r.regions.join(" · ") || "기지 제작 또는 전투 보상"}</p><small>도구 T${r.tier} · 최대 중첩 ${r.stack} · 기준 가치 ${r.value} CR</small><p class="fineprint">활용: ${r.recipes.join(" · ") || "전투·탐험·스토리"}</p>` : ""}</article>`,
      )
      .join(
        "",
      )}</div><h3>발견 기록</h3><p>${s.records.slice(-20).map(esc).join(" · ") || "아직 기록이 없습니다."}</p>`;
  if (tab === "environment")
    body = `${environmentPanel(w)}<div class="environment-cards">${Object.entries(
      environments,
    )
      .map(
        ([id, e]) =>
          `<article><h3 style="color:${e.color}">${e.icon} ${e.name}</h3><p>필요 저항 ${e.resistance} · ${e.hint}</p><small>${id === "safe" ? "산소 소모 없음 · 노출 감소" : "진입 경고와 보호 유예 후 위험이 적용됩니다."}</small></article>`,
      )
      .join("")}</div>`;
  return `<div class="hub-heading"><span class="${w.survival.inBase ? "online" : "offline"}">${w.survival.inBase ? "BASE LINK · 기지 시설 연결" : "REMOTE VIEW · 탐험 중 열람 / 작업 회수는 기지에서"}</span><b>${s.researchPoints} RP · ${w.battle.credits} CR</b></div><nav class="hub-tabs">${Object.entries(
    hubTabs,
  )
    .map(
      ([id, name]) =>
        `<button data-action="hub-tab" data-value="${id}" class="${id === tab ? "selected" : ""}">${name}</button>`,
    )
    .join(
      "",
    )}</nav><div class="hub-body">${body}</div><section id="production-queue">${productionQueue(w)}</section>`;
}
export function environmentPanel(w: World) {
  const s = w.survival.state,
    r = w.survival.resistance;
  return `<section class="environment-loadout"><h3>환경 장비 · 채굴 도구</h3><p>독성 ${r.toxic} · 방사능 ${r.radiation} · 간섭 ${r.unstable} · 산소 ${w.survival.oxygen.maximum} · 산소 효율 +${Math.round(r.efficiency * 100)}%</p><p class="fineprint">저온 ${r.cold} · 고온 ${r.heat} · 압력 ${r.pressure} · EDEN 일반 기온·기압에서는 피해 없음</p><div class="env-gear">${Object.entries(
    environmentGear,
  )
    .map(
      ([id, g]) =>
        `<button data-action="env-equip" data-value="${id}" ${!s.owned.includes(id as never) ? "disabled" : ""} class="${s.equipped.includes(id as never) ? "selected" : ""}">${g.name}<small>${s.equipped.includes(id as never) ? "착용 중" : s.owned.includes(id as never) ? "보유" : "제작 필요"}</small></button>`,
    )
    .join(
      "",
    )}</div><div class="tool-slots">${toolsData.map((t) => `<button data-action="tool-select" data-value="${t.id}" class="${t.id === s.tool ? "selected" : ""}" ${!s.tools.includes(t.id) ? "disabled" : ""}><span style="color:${t.color}">T${t.id}</span> ${t.name}<small>속도 ×${t.speed} · 에너지 ${t.energy}</small></button>`).join("")}</div></section>`;
}
export function survivalHud(w: World) {
  const s = w.survival.state,
    e = w.survival.environment,
    k = e.kind,
    scanner = w.survival.scanner,
    b = w.survival.sentinel;
  return `${w.extreme.combat.boss || w.space.combat.boss ? "" : colonyHud(w)}<nav class="survival-shortcuts"><button data-action="hub">L 제작·연구</button>${w.colony.unlocked ? `<button data-action="cb-build">B 건설</button><button data-action="cb-command">O 기지</button>` : ""}<button data-action="database">N 도감</button><button data-action="scan">G 스캐너 ${scanner.cooldown > 0 ? Math.ceil(scanner.cooldown) + "s" : ""}</button><div>${s.quick.map((id, i) => `<button data-action="consume" data-value="${id}"><kbd>${i + 3}</kbd> ${items[id].icon} ${w.inventory[id] ?? 0}</button>`).join("")}</div></nav>${
    k !== "safe" || s.oxygen < w.survival.oxygen.maximum - 1
      ? `<section class="survival-hud" style="--risk:${e.data.color}"><strong>${e.data.icon} ${e.data.name}</strong>${k === "hypoxia" || s.oxygen < w.survival.oxygen.maximum - 1 ? `<label>O₂ ${Math.ceil(s.oxygen)} / ${w.survival.oxygen.maximum}<progress max="${w.survival.oxygen.maximum}" value="${s.oxygen}"></progress></label>` : ""}${(
          ["toxic", "radiation", "unstable"] as const
        )
          .filter((id) => id === k || s.exposure[id] > 10)
          .map(
            (id) =>
              `<label>${environments[id].icon} 노출 ${Math.ceil(s.exposure[id])}%<progress max="100" value="${s.exposure[id]}"></progress></label>`,
          )
          .join(
            "",
          )}<small>${e.grace > 0 ? "보호 유예 " + Math.ceil(e.grace) + "s" : e.deficit > 0 ? "저항 부족 " + e.deficit + " · " + e.data.hint : "환경 보호 적용"}</small></section>`
      : ""
  }${
    scanner.remaining > 0
      ? `<section class="scanner-readings"><b>PIONEER SCANNER · ${Math.ceil(scanner.remaining)}s</b><span>${e.data.icon} ${e.data.name} · 필요 저항 ${e.data.resistance} · 부족 ${e.deficit}</span>${scanner
          .readings()
          .map((t) => `<small>${t}</small>`)
          .join(
            "",
          )}${b.active ? "<strong>공급 장치 2개 → 보호막 해제 → 코어 공격</strong>" : ""}</section>`
      : ""
  }${w.mining ? `<div class="mining-hud">T${s.tool} ${toolsData[s.tool - 1].name} · ${items[w.mining.node.item].name}<progress max="${w.survival.mining.duration(w.mining.node)}" value="${w.mining.elapsed}"></progress></div>` : ""}${b.active && b.enemy ? `<section class="boss-hud sentinel-hud"><div><span>ANCIENT MACHINE</span><strong>ABYSS SENTINEL</strong><b>${b.conduits.length ? "공급 장치 " + b.conduits.length + "개" : "코어 노출 " + Math.ceil(b.vulnerable) + "s"}</b></div><div class="boss-health"><i style="width:${(100 * b.enemy.hp) / b.enemy.maxHp}%"></i></div><p>${Math.ceil(b.enemy.hp)} / ${b.enemy.maxHp} · ${b.pattern || "공급 장치를 공격하세요"} · G 분석</p></section>` : ""}`;
}
export function inventoryToolbar() {
  return `<div class="inventory-toolbar"><input data-filter="search" aria-label="아이템 검색" placeholder="이름으로 검색"><select data-filter="type" aria-label="아이템 분류"><option value="">모든 아이템</option>${["광물", "정제 소재", "식물", "생체 물질", "부품", "소비 아이템", "연구 데이터", "스토리", "무기", "방어구"].map((s) => `<option>${s}</option>`).join("")}</select><select data-filter="sort" aria-label="아이템 정렬"><option value="name">이름순</option><option value="rarity">희귀도순</option><option value="count">수량순</option></select></div>`;
}
export function filterInventory(root: HTMLElement) {
  const query =
      (
        root.querySelector('[data-filter="search"]') as HTMLInputElement
      )?.value.toLowerCase() ?? "",
    type =
      (root.querySelector('[data-filter="type"]') as HTMLSelectElement)
        ?.value ?? "",
    sort = (root.querySelector('[data-filter="sort"]') as HTMLSelectElement)
      ?.value;
  const els = Array.from(root.querySelectorAll<HTMLElement>(".filterable"));
  for (const el of els)
    el.hidden =
      !(el.dataset.name ?? "").toLowerCase().includes(query) ||
      (!!type && el.dataset.type !== type);
  els.sort((a, b) =>
    sort === "name"
      ? (a.dataset.name ?? "").localeCompare(b.dataset.name ?? "", "ko")
      : Number(b.dataset[sort ?? "rarity"] ?? 0) -
        Number(a.dataset[sort ?? "rarity"] ?? 0),
  );
  for (const el of els) {
    const parent = el.parentElement;
    if (parent?.classList.contains("inventory-grid"))
      parent.insertBefore(el, parent.querySelector(".empty"));
    else parent?.append(el);
  }
  root
    .querySelectorAll<HTMLElement>(".item-slot.empty")
    .forEach((el) => (el.hidden = !!query || !!type));
}
export function mapEnvironment(w: World) {
  return `<div class="map-environments">${Object.values(regions)
    .map((r) => {
      const e = environments[regionEnvironment(r.id, 1200, 716)],
        known = w.progress.discovered.includes(r.id);
      return `<article><b>${known ? r.name : "미탐사 · " + r.en}</b><span style="color:${e.color}">${e.icon} ${e.name}</span><small>${e.hint}</small><small>${
        known
          ? r.resources
              .slice(0, 3)
              .map((n) => items[n.item].name)
              .join(" · ")
          : "자원 정보 미발견"
      }</small><small>${r.id === "crash" ? "고정 작업 시설 · 개인 창고" : r.id === "marsh" ? "상층 안전 경로 · 입구 대피소" : "입구 안전 대피소"}${w.progress.checkpoint.region === r.id ? " · 활성 체크포인트" : ""}</small></article>`;
    })
    .join(
      "",
    )}</div><p>불시착 ↔ 발광 숲 ↔ 수정 계곡 · 발광 숲의 F 표지 → 독성 습지 → 심층 수정 동굴 → 방사능 유적 → 심층 에너지 지대. 신규 구역의 연결 표지에서 F로 이동합니다. 희귀 자원과 비밀 통로는 직접 탐험하세요.</p>`;
}
