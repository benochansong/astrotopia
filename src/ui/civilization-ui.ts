import { workforceNames } from "../civilization/workforce";
import type { World } from "../core/world";
import { items, type ItemId } from "../data/content";
import { planetIds, type PlanetId } from "../space/catalog";
import { occupiedSlots } from "../systems/inventory";
import {
  contracts,
  civilizationQuests,
  freightCosts,
  marketPrices,
  restorationNames,
  specialties,
  stars,
  stationStages,
} from "../civilization/catalog";
import type { Endpoint } from "../civilization/types";
export let civilTab = "overview";
let selected: Endpoint = "eden";
let product: ItemId = "starEngine";
const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const button = (
  text: string,
  action: string,
  value: unknown = "",
  disabled = false,
) =>
  `<button data-action="cv-${action}" data-value="${esc(value)}" ${disabled ? "disabled" : ""}>${text}</button>`;
const cost = (c: object) =>
  Object.entries(c)
    .map(([id, n]) => `${items[id as ItemId].name} ${n}`)
    .join(" · ");
const options = (
  values: string[],
  current: string,
  labels?: Record<string, string>,
) =>
  values
    .map(
      (x) =>
        `<option value="${x}" ${x === current ? "selected" : ""}>${esc(labels?.[x] ?? x.toUpperCase())}</option>`,
    )
    .join("");
const input = (
  id: string,
  label: string,
  value: number,
  min = 0,
  max = 99999,
) =>
  `<label>${label}<input id="cv-${id}" type="number" min="${min}" max="${max}" value="${value}"></label>`;
const select = (id: string, label: string, html: string) =>
  `<label>${label}<select id="cv-${id}">${html}</select></label>`;
const table = (head: string[], rows: string[][]) =>
  `<div class="civil-table"><table><thead><tr>${head.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const names = Object.fromEntries(
  Object.entries(items).map(([id, d]) => [id, d.name]),
);
export function civilLive(w: World) {
  const c = w.civilization,
    s = c.state;
  const positions: Record<Endpoint, [number, number]> = {
    eden: [95, 100],
    ares: [275, 60],
    frostia: [470, 90],
    inferno: [650, 65],
    aquaria: [180, 230],
    lunaris: [410, 240],
    omega: [665, 230],
    station: [385, 155],
  };
  return `<div class="civil-metrics"><span><b>${w.battle.credits.toLocaleString()}</b> CR</span><span><b>${s.stats.delivered.toLocaleString()}</b> 운송 완료</span><span><b>${Object.values(s.cities).reduce((n, v) => n + v!.population, 0)}</b> 주민</span><span><b>${s.reputation}</b> ${c.title}</span></div><svg class="civil-network" viewBox="0 0 760 290" role="img" aria-label="현재 항로와 실제 화물선 위치">${s.routes
    .map((r) => {
      const a = positions[r.from],
        b = positions[r.to];
      return `<path d="M${a} L${b}" stroke="${r.enabled ? "#477f92" : "#35414f"}" stroke-width="2" fill="none" stroke-dasharray="5 6"/>`;
    })
    .join("")}${c.endpoints
    .map((id) => {
      const [x, y] = positions[id];
      return `<circle cx="${x}" cy="${y}" r="${id === "station" ? 19 : 27}" fill="${id === "station" ? "#bd9864" : "#2b6276"}" stroke="#8cdad1"/><text x="${x}" y="${y + 43}" text-anchor="middle" fill="#dcefed" font-size="12">${id.toUpperCase()}</text>`;
    })
    .join("")}${s.ships
    .map((ship) => {
      const r = s.routes.find((r) => r.id === ship.route);
      let [x, y] = positions[ship.at];
      if (r && ["InTransit", "Returning"].includes(ship.state)) {
        const a = positions[ship.state === "Returning" ? r.to : r.from],
          b = positions[ship.state === "Returning" ? r.from : r.to],
          t = Math.max(0, Math.min(1, 1 - ship.remaining / 30));
        x = a[0] + (b[0] - a[0]) * t;
        y = a[1] + (b[1] - a[1]) * t;
      }
      return `<g><title>MK${ship.tier} #${ship.id} · ${esc(ship.state + " " + ship.reason)}</title><path d="M${x - 5},${y - 4} L${x + 8},${y} L${x - 5},${y + 4} Z" fill="${ship.reason ? "#efbd77" : "#c8ffe6"}"/></g>`;
    })
    .join(
      "",
    )}</svg><p class="muted">운송 중인 화물선은 남은 항해 시간에 따라 이동합니다. 노란 선체: 대기 사유 있음.</p>`;
}
export function civilizationPanel(w: World) {
  const c = w.civilization,
    s = c.state;
  c.warehouse(w.space.state.location);
  w.space.capture();
  if (!c.endpoints.includes(selected)) selected = w.space.state.location;
  const nav = `<nav class="civil-nav">${Object.entries({
    overview: "문명 개요",
    logistics: "자동 물류",
    economy: "경제 · 무역",
    planets: "행성 · 주민",
    industry: "산업 계획",
    infrastructure: "궤도 인프라",
    technology: "복원 · 기술",
    alerts: "알림 · 통계",
  })
    .map(([id, name]) => button(name, "tab", id))
    .join(
      "",
    )}${button(s.advanced ? "간편 보기" : "상세 보기", "advanced")}</nav>`;
  if (!c.unlocked)
    return `<div class="civil-hero"><p class="eyebrow">GALACTIC CIVILIZATION</p><h3>한 개의 기지에서, 연결된 세계로.</h3><p>작업실 L → 연구 → 물류 자동화를 완료하면 관제 기능이 열립니다. 선행 연구: 기초 우주선 수리.</p><button data-action="hub">연구실 열기</button></div>`;
  const choose = `<div class="civil-picker">${select("endpoint", "관리 창고", options(c.endpoints, selected))}${button("선택", "endpoint")}</div>`;
  let body = "";
  if (civilTab === "overview")
    body = `<div class="civil-hero"><p class="eyebrow">SEVEN WORLDS · ONE FUTURE</p><h3>${s.quests.includes(12) ? "우리가 건설한 세계는 끝이 아니라 시작이다." : "함께 이어지는 일곱 세계"}</h3><p>문명 단계 ${c.level} · ${s.odyssey ? "ODYSSEY" : "HORIZON / ASTRA-01"} · ${w.omega.state.ending ? `선택: ${w.omega.state.ending} · 독립 개척 분석 도구` : "엔딩 이후 문명 임무 79–91 해금"}</p></div><div id="civil-live">${civilLive(w)}</div>${c.offlineSummary ? `<p class="notice">${esc(c.offlineSummary)}</p>` : ""}<div class="civil-cards">${civilizationQuests.map((q, i) => `<article class="${s.quests.includes(i) ? "complete" : ""}"><small>MISSION ${79 + i}</small><b>${q}</b><span>${s.quests.includes(i) ? "완료" : w.omega.state.ending ? "진행 조건 대기" : "엔딩 이후"}</span></article>`).join("")}</div>`;
  if (civilTab === "logistics")
    body =
      choose +
      `<p>화물선 MK1 100칸 / MK2 300칸 · 한 칸 99개. 출항 시 왕복 연료 4를 확보합니다. 모든 입력 수량은 개 단위입니다.</p><div class="civil-actions">${button("MK1 건조", "ship", 1)}${button("MK2 건조", "ship", 2)}</div><p class="muted">MK1: ${cost(freightCosts[1])} / MK2: ${cost(freightCosts[2])}</p><div id="civil-fleet">${civilFleet(w)}</div><h3>새 자동 항로</h3><div class="civil-form">${select(
        "ship",
        "출발지 유휴 화물선",
        s.ships
          .filter((f) => f.route === null && f.at === selected)
          .map((f) => `<option value="${f.id}">MK${f.tier} #${f.id}</option>`)
          .join(""),
      )}${select(
        "destination",
        "목적지",
        options(
          c.endpoints.filter((p) => p !== selected),
          c.endpoints.find((p) => p !== selected) ?? "",
        ),
      )}${select("item", "운송 품목", options(Object.keys(items), "iron", names))}${input("amount", "회당 최대 운송", 50, 1, 9900)}${input("minimum", "출발지 최소 보유", 20)}${input("target", "목적지 목표 재고", 200, 1)}${input("interval", "왕복 후 대기 (초)", 30, 5, 3600)}${input("priority", "우선순위 (4 최고)", 2, 1, 4)}${select("repeat", "반복", options(["yes", "no"], "yes", { yes: "반복 운행", no: "한 번만" }))}</div>${button("항로 등록", "route")}${table(
        ["항로", "목표 / 최소", "완료", "상태"],
        s.routes.map((r) => [
          `${esc(r.name)}<br>${r.from} → ${r.to} · ${items[r.item].name}`,
          `${r.amount}개 / 목적지 ${r.target} / 출발지 ${r.minimum}`,
          String(r.delivered),
          button(r.enabled ? "정지" : "재개", "route-toggle", r.id),
        ]),
      )}`;
  if (civilTab === "economy")
    body =
      choose +
      `<p>NPC 시장 · 60초마다 재고 회복. 매수·매도 가격 차이와 거래량에 따른 가격 변동이 적용됩니다. 고유 코어와 스토리 물품은 거래하지 않습니다.</p><div class="civil-form">${select("market-item", "거래 품목", options(Object.keys(marketPrices), "iron", names))}${input("quantity", "수량", 10, 1, 1000)}</div>${button("구매", "buy")}${button("판매", "sell")}${button("보급 계약 납품 · +500 CR", "contract", "supply")}<p class="muted">계약: 합금 10 + 전자 부품 5 · 창고별 최초 1회 · 시간 제한 없음</p>${table(
        ["품목", "창고 / 시장", "매입 / 매각 단가"],
        Object.keys(marketPrices).map((k) => {
          const id = k as ItemId;
          return [
            items[id].name,
            `${c.warehouse(selected)?.[id] ?? 0} / ${c.market(selected)[id]}`,
            `${c.quote(selected, id, "buy")} / ${c.quote(selected, id, "sell")} CR`,
          ];
        }),
      )}<h3>개척 계약</h3>${table(
        ["계약", "납품", "보상"],
        Object.entries(contracts).map(([id, d]) => [
          d.name,
          cost(d.cost),
          button(
            s.contracts.includes(id + "-" + selected)
              ? "납품 완료"
              : d.reward + " CR · 납품",
            "contract",
            id,
            s.contracts.includes(id + "-" + selected),
          ),
        ]),
      )}<h3>자동 거래 · 60초마다</h3><div class="civil-form">${select("side", "방향", options(["sell", "buy"], "sell", { sell: "초과 재고 매각", buy: "부족 재고 매입" }))}${input("threshold", "실행 기준 재고", 100)}${input("trade-target", "매입 목표", 150)}${input("batch", "회당 최대 수량", 10, 1, 1000)}${input("price", "매입 상한 / 매각 하한 단가", 10, 1, 1000000)}${input("credit-reserve", "보호 크레딧", 1000, 0, 1000000)}${input("budget", "분당 규칙별 한도 CR", 200, 1, 1000000)}</div>${button("위 거래 품목으로 자동 규칙 등록", "rule")}<p>자동 매입은 보호 크레딧과 한도 안에서만 실행됩니다. 비접속 중에는 자동 거래가 실행되지 않습니다.</p>${table(
        ["규칙", "조건", "운영"],
        s.rules.map((r) => [
          `${r.at} · ${items[r.item].name} · ${r.side}`,
          `기준 ${r.threshold} / 목표 ${r.target} / 단가 ${r.price} / ${r.budget} CR`,
          button(r.enabled ? "정지" : "재개", "rule-toggle", r.id),
        ]),
      )}`;
  if (civilTab === "planets")
    body =
      choose +
      `<div class="civil-picker">${select("focus", "우선 배치 직무", options(Object.keys(workforceNames), "industry", workforceNames))}${button("우선순위 적용", "workforce")}</div>${
        selected !== "station"
          ? table(
              ["직무", "배치 / 일자리"],
              c
                .workforce(selected)
                .map((r) => [r.name, r.assigned + " / " + r.capacity]),
            )
          : ""
      }<p>주민은 집계형으로 운영됩니다. 도시 거주 구역, 산소, 식량, 일자리, 의료를 연결하세요. 식량은 60초마다 주민 100명당 1개 소비합니다. 주민 부족으로 기존 플레이어나 정착민이 죽지 않습니다.</p>${table(
        ["행성 / 특화", "주민 · 복지", "일자리 / 단계", "운영"],
        planetIds
          .filter((id) => w.space.state.planets[id])
          .map((id) => {
            const city = c.city(id),
              m = c.cityMetrics(id);
            return [
              `<b>${id.toUpperCase()}</b><br>${specialties[id]}`,
              `${city.population}/${m.capacity} · ${city.wellbeing}%<br>${city.supplied ? "식량 · 산소 공급" : "식량 / 산소 확인"}`,
              `${m.jobs} · 도시 Lv.${c.cityLevel(id) || "1–5"}<br>가동 산업 ${m.industry}`,
              button("산업 집중", "focus", id + ":industry") +
                button("연구 집중", "focus", id + ":science") +
                button("농업 집중", "focus", id + ":agriculture"),
            ];
          }),
      )}<p>Lv.6: 주민 500 · 복지 65 · 산업 2 · 2선석. Lv.7: 주민 2,000 · 복지 80 · 산업 4 · 4선석.</p><p>문명 8: 3개 행성 도시 Lv.6 + 정거장 Lv.3 + ODYSSEY + 3개 복원 + 운송 1,000개.</p>`;
  if (civilTab === "industry")
    body = `<p>읽기 전용 생산 계획입니다. B에서 시설을 건설하고 O의 생산 탭에서 실제 입력·반복 생산을 설정하세요.</p><div class="civil-picker">${select("product", "목표 제품", options(["starEngine", "universalSupport", "transcendentReactor", "robotAssembly", "colonyRation"], product, names))}${button("의존성 분석", "plan")}</div>${table(
      ["필요 소재", "필요 / 보유", "운송 중 / 부족", "생산 경로"],
      c
        .plan(product)
        .map((r) => [
          items[r.item].name,
          `${r.need} / ${r.owned}`,
          `${r.transit} / ${r.missing}`,
          `${esc(r.recipe)} · ${r.seconds}초${r.cycle ? " · 순환 감지" : ""}`,
        ]),
    )}<p class="muted">운송 중 재고는 경로가 다를 수 있어 부족량에서 제외합니다. 생산 보너스와 전력 대기 시간은 표의 기본 제작 시간에 포함되지 않습니다.</p>${table(
      ["행성", "현지 발전 / 소비 EU", "가동 산업 / 항만"],
      planetIds
        .filter((id) => w.space.state.planets[id])
        .map((id) => {
          const sys = w.space.systems[id]!;
          return [
            id,
            `${sys.networks.reduce((n, g) => n + g.generation, 0).toFixed(0)} / ${sys.networks.reduce((n, g) => n + g.used, 0).toFixed(0)}`,
            `${c.cityMetrics(id).industry} / ${c.docks(id)}선석`,
          ];
        }),
    )}`;
  if (civilTab === "infrastructure")
    body = `<div class="civil-hero"><p class="eyebrow">ORBITAL COLONY</p><h3>STELLAR NEXUS · Lv.${s.station.stage}</h3><p>실제 화물 터미널, 독립 창고와 일곱 개의 내부 구역. 항로의 목적지에서 STATION을 선택하세요.</p></div><p>${s.station.stage < 3 ? `다음 단계 납품: ${cost(stationStages[s.station.stage])}` : "정거장 Lv.3 완료"}</p><p>첫 단계는 현재 행성 창고, 이후 단계는 정거장 창고에서 소비합니다.</p><div class="civil-actions">${button("정거장 건설 / 확장", "station", "", s.station.stage >= 3)}${button("정거장 방문", "visit", "", !s.station.stage)}${button("우주선으로 귀환", "leave", "", w.region !== "station")}${button(s.odyssey ? "ODYSSEY 완성" : "ODYSSEY 건조", "odyssey", "", s.odyssey)}</div><p>ODYSSEY: 정거장 Lv.2 · HORIZON · 항성 엔진 3 / 생명 유지 2 / 반응로 1 → 화물 600칸 · 항해 연료 25% 절감.</p><p>정거장 창고 ${occupiedSlots(s.station.warehouse)} / ${s.station.stage * 300}칸</p>${table(
      ["보관 물품", "수량"],
      Object.entries(s.station.warehouse)
        .filter(([, n]) => n! > 0)
        .map(([id, n]) => [items[id as ItemId].name, String(n)]),
    )}<p class="muted">ASTROARK: 차기 탐사선 설계 개념 · 현재 건조 불가</p>`;
  if (civilTab === "technology")
    body = `<p>물류 → 거대 산업 → 도시 / 궤도 → 복원 / 성간 항법의 연구를 L 연구실에서 진행하세요.</p><button data-action="hub">연구실 열기</button>${table(
      ["지역 복원", "필요 조건", "상태"],
      planetIds
        .filter((id) => w.space.state.planets[id])
        .map((id) => [
          `${id.toUpperCase()} · ${restorationNames[id]}`,
          "고대 연구 센터 전력 · 문명 코어 1 · 로봇 3 · 생명 유지 2",
          button(
            s.restored.includes(id) ? "복원 완료" : "지역 복원",
            "restore",
            id,
            s.restored.includes(id),
          ),
        ]),
    )}<h3>먼 별의 신호</h3><p>${c.signals ? stars.join(" · ") + " — 탐지됨. 항성 이동은 후속 탐사 단계입니다." : "성간 항법 연구와 가동 중인 항성 관측소가 필요합니다."}</p><p>복원된 현지 고대 연구 센터 반경 300m에서 환경 노출을 완화합니다. 행성 밖과 바다·중력·고온 지형은 그대로 탐험해야 합니다.</p>`;
  if (civilTab === "alerts")
    body = `<h3>PIONEER ASSISTANT · 현장 분석</h3><ul>${s.ships
      .filter((f) => f.reason)
      .map((f) => `<li>화물선 #${f.id}: ${esc(f.reason)}</li>`)
      .join("")}${planetIds
      .filter((id) => w.space.state.planets[id])
      .map((id) => {
        const m = c.cityMetrics(id),
          city = c.city(id);
        return `<li>${id.toUpperCase()}: ${!c.docks(id) ? "우주항 가동 필요" : city.population && !city.supplied ? "식량·산소 공급 필요" : m.jobs < city.population ? "일자리 부족" : "현재 물류·주민 조건 정상"}</li>`;
      })
      .join(
        "",
      )}</ul><p>분석은 현재 저장 상태로 계산하며 재료를 자동 사용하지 않습니다.</p>${
      s.advanced
        ? table(
            ["운영 시간", "CR", "주민", "누적 운송"],
            s.samples
              .slice(-20)
              .map((t) => [
                String(t.time),
                String(t.credits),
                String(t.population),
                String(t.delivered),
              ]),
          )
        : ""
    }${table(
      ["운영 시간", "거래 · 운송 기록"],
      s.logs
        .slice(-30)
        .reverse()
        .map((l) => [`${l.time}초`, esc(l.text)]),
    )}`;
  return `<div class="civilization">${nav}${body}</div>`;
}
export function civilizationAction(
  w: World,
  action: string,
  value: string | undefined,
  root: HTMLElement,
) {
  if (!action.startsWith("cv-")) return false;
  const c = w.civilization,
    v = value ?? "",
    read = (id: string) =>
      root.querySelector<HTMLInputElement>("#cv-" + id)?.value ?? "",
    num = (id: string) => Number(read(id));
  switch (action.slice(3)) {
    case "tab":
      civilTab = v;
      break;
    case "advanced":
      c.state.advanced = !c.state.advanced;
      break;
    case "endpoint":
      selected = read("endpoint") as Endpoint;
      break;
    case "ship":
      c.buildShip(Number(v) as 1 | 2, selected);
      break;
    case "route":
      c.createRoute(num("ship"), {
        name: selected + " → " + read("destination"),
        from: selected,
        to: read("destination") as Endpoint,
        item: read("item") as ItemId,
        amount: num("amount"),
        minimum: num("minimum"),
        target: num("target"),
        interval: num("interval"),
        priority: num("priority"),
        repeat: read("repeat") === "yes",
      });
      break;
    case "route-toggle":
      c.toggleRoute(Number(v));
      break;
    case "recall":
      c.recall(Number(v));
      break;
    case "service":
      c.service(Number(v));
      break;
    case "buy":
    case "sell":
      c.trade(
        selected,
        read("market-item") as ItemId,
        num("quantity"),
        action === "cv-buy" ? "buy" : "sell",
      );
      break;
    case "rule":
      c.addRule({
        at: selected,
        item: read("market-item") as ItemId,
        side: read("side") as "buy" | "sell",
        threshold: num("threshold"),
        target: num("trade-target"),
        batch: num("batch"),
        price: num("price"),
        reserve: num("credit-reserve"),
        budget: num("budget"),
      });
      break;
    case "rule-toggle": {
      const r = c.state.rules.find((r) => r.id === Number(v));
      if (r) r.enabled = !r.enabled;
      break;
    }
    case "contract":
      c.contract(selected, (v || "supply") as keyof typeof contracts);
      break;
    case "focus": {
      const [p, f] = v.split(":");
      if (
        planetIds.includes(p as PlanetId) &&
        ["industry", "science", "agriculture"].includes(f)
      )
        c.city(p as PlanetId).focus = f as "industry";
      break;
    }
    case "workforce":
      if (
        selected !== "station" &&
        Object.hasOwn(workforceNames, read("focus"))
      )
        c.city(selected).focus = read("focus") as never;
      break;
    case "station":
      c.buildStation();
      break;
    case "odyssey":
      c.buildOdyssey();
      break;
    case "visit":
      c.visitStation();
      break;
    case "leave":
      c.leaveStation();
      break;
    case "restore":
      if (planetIds.includes(v as PlanetId)) c.restore(v as PlanetId);
      break;
    case "plan":
      product = read("product") as ItemId;
      break;
    default:
      return false;
  }
  return true;
}

export function civilFleet(w: World) {
  const s = w.civilization.state;
  return table(
    ["함선", "항로 / 상태", "화물 / 연료", "운영"],
    s.ships.map((f) => [
      `MK${f.tier} #${f.id} · ${f.at}`,
      `${esc(s.routes.find((r) => r.id === f.route)?.name ?? "미배정")}<br>${f.state} ${Math.ceil(f.remaining)}초<br>${esc(f.reason)}`,
      `${cost(f.cargo) || "비어 있음"}<br>연료 ${f.fuel}/20 · 선체 ${f.condition}%`,
      button("급유·정비", "service", f.id) + button("회수", "recall", f.id),
    ]),
  );
}
