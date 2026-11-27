import { regions, items } from "../data/content";
import { planetForRegion, baseForPlanet } from "../space/catalog";
import { recipes, technologies } from "../survival/catalog";
import { marketPrices } from "../civilization/catalog";
import type { View } from "../../shared/online";
import {
  campaign,
  dungeonDefinitions,
  type ExpeditionView,
} from "../../shared/expedition-online";
import type { ProductionJob } from "../survival/types";
import type { CivilizationSave } from "../civilization/types";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const btn = (label: string, action: string, value = "", locked = "") =>
  `<button data-online="${action}" data-value="${esc(value)}" ${locked ? `disabled title="${esc(locked)}"` : ""}>${label}${locked ? ` · 잠금: ${esc(locked)}` : ""}</button>`;
const select = (id: string, rows: [string, string][]) =>
  `<select id="on-${id}" aria-label="${id}">${rows.map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select>`;
const number = (id: string, n: number) =>
  `<input id="on-${id}" type="number" min="0" value="${n}" aria-label="${id}">`;
export function expeditionPanel(v: View) {
  const x = v.extension as unknown as ExpeditionView & {
    jobs: ProductionJob[];
    civilization: CivilizationSave;
  };
  if (!x?.exploration) return "<p>원정 상태를 기다리는 중입니다.</p>";
  const e = x.exploration,
    gear = e.gear[v.self.id],
    boss = campaign.find((b) => b.region === v.self.region);
  const names = {
    resources: "자원 공동 납품",
    science: "생명체 3종 분석",
    rescue: "실종 탐험가 구조",
    industry: "자동 생산 실증",
    ruins: "유적 보스 조사",
  };
  const atBase = v.self.region === baseForPlanet(x.planet) && !v.self.instance;
  const partyGate = !v.self.party
    ? "파티 필요"
    : !atBase
      ? "착륙 기지 필요"
      : "";
  const mission = e.missions.find((m) => !m.done),
    instance = e.instances.find((i) => i.id === v.self.instance);
  return `<p class="eyebrow">${x.planet.toUpperCase()} · ${x.gravity} G · 비공개 원정</p><h3>탐사단 ${esc(e.corps.name)}</h3><p>${esc(e.corps.goal)} · 명성 ${e.corps.reputation} · 보스 기록 ${e.corps.bosses}</p>
  <h3>행성 항해</h3><p>목적지 제안 → 각자 탑승 → 각자 준비 → 대장 출발. 탑승한 탐험가만 이동하며 연료는 공동 창고에서 한 번 사용됩니다.</p>${select(
    "planet",
    x.available.filter((p) => p !== x.planet).map((p) => [p, p.toUpperCase()]),
  )}${btn("항해 제안", "shipPropose", "", x.available.length < 2 ? "다음 행성 조사 필요" : partyGate)}
  ${e.voyages.map((s) => `<article class="online-facility"><b>${s.from.toUpperCase()} → ${s.to.toUpperCase()}</b><p>${items[s.fuelItem ?? "crystal"].name} ${s.cost}개 · ${s.arrive ? `${Math.max(0, Math.ceil(s.arrive - v.now))}초 후 도착` : "탑승 대기"}</p><p>${s.boarded.map((id) => `${esc(v.members.find((m) => m.id === id)?.name)} ${s.ready.includes(id) ? "✓ 준비" : ""}`).join(" · ") || "탑승자 없음"}</p>${!s.arrive ? `${btn("탑승", "shipBoard", s.id)}${btn("준비 확인", "shipReady", s.id)}${btn("내리기", "shipLeave", s.id)}${btn("출발", "shipDepart", s.id)}${btn("계획 취소", "shipCancel", s.id)}` : ""}</article>`).join("")}
  <h3>현지 출입구</h3>${Object.values(regions)
    .filter(
      (r) =>
        !["ship", "station"].includes(r.id) &&
        planetForRegion(r.id) === x.planet,
    )
    .map((r) => btn(r.name, "region", r.id))
    .join(
      "",
    )}${boss ? btn(`${boss.kind.toUpperCase()} 호출 · Lv.${boss.level}+`, "boss") : ""}<p>보스 조사 기록: ${e.campaign.join(" · ") || "없음"}<br>다음 행성은 이전 행성의 보스 조사 후 해금됩니다.</p>
  <h3>개인 장비 · 무기 ${gear?.weapon ?? 0} / 환경 슈트 ${gear?.suit ?? 0}</h3><p>단계당 철광석 5×단계, 결정 3×단계, 개인 크레딧 30×단계. 선행 행성 기록이 필요합니다. 착륙 기지 밖의 환경 피해는 슈트 단계로 줄어듭니다.</p>${btn("무기 제작·강화", "gear", "weapon")}${btn("환경 슈트 제작·강화", "gear", "suit")}
  <h3>협동 임무</h3>${
    mission
      ? `<p>${names[mission.kind]} · ${regions[mission.region].name} · ${mission.progress}/${mission.goal}</p><p>${mission.kind === "resources" ? `현지 ${items[regions[mission.region].resources[0]?.item ?? "iron"].name} 2개씩 납품` : mission.kind === "science" ? "300px 이내의 서로 다른 살아 있는 생명체를 분석하세요." : mission.kind === "rescue" ? "X=1500의 구조 신호를 찾아 개인 응급 키트 1개를 사용하세요." : mission.kind === "industry" ? "임무 시작 후 자동 생산품 3개를 만들고 기지에서 보고하세요." : "협동 보스 또는 던전을 완료하세요."}</p>${btn("임무 상호작용 / 납품", "missionInteract")}`
      : Object.entries(names)
          .map(([id, name]) => btn(name, "mission", id))
          .join("")
  }
  <h3>인스턴스 원정</h3><p>같은 기지의 파티원 2–4명, 각자의 준비가 필요합니다. 다른 파티와 적·보상·장치를 공유하지 않습니다.</p>${Object.entries(
    dungeonDefinitions,
  )
    .map(([id, d]) =>
      btn(
        `${d.name} · Lv.${d.level}+`,
        "dungeon",
        id,
        x.planet !== d.planet
          ? `${d.planet.toUpperCase()} 기지 필요`
          : v.self.body.level < d.level
            ? `Lv.${d.level} 필요`
            : partyGate,
      ),
    )
    .join(
      "",
    )}${btn("STELLAR COLOSSUS · 엔딩 후 Lv.90+", "raid", "", !e.ending ? "엔딩 필요" : v.self.body.level < 90 ? "Lv.90 필요" : partyGate)}${v.self.instance ? btn("인스턴스에서 귀환", "instanceLeave") : ""}
  ${instance ? `<p>${instance.kind === "raid" ? "STELLAR DEFENSE PLATFORM" : dungeonDefinitions[instance.kind].name} · ${instance.cleared ? "원정 완료" : "진행 중"}</p>${instance.kind === "raid" ? `<p>각자 다른 보조 장치를 5초 안에 작동하면 코어가 10초간 노출됩니다.</p>${Array.from({ length: instance.roster.length === 4 ? 4 : 2 }, (_, i) => btn(`장치 ${i + 1} · X=${instance.roster.length === 4 ? 1800 + i * 400 : 2100 + i * 800}`, "raidDevice", String(i))).join("")}` : ""}` : ""}
  <h3>연구·공동 제작 대기열</h3>${select(
    "science",
    Object.entries(technologies)
      .filter(
        ([id, t]) =>
          !x.technologies.includes(id) &&
          t.requires.every((k) => x.technologies.includes(k)),
      )
      .map(([id, t]) => [id, t.name]),
  )}${btn("세계 기술 연구", "scienceResearch")}${select(
    "craft",
    Object.entries(recipes)
      .filter(
        ([, r]) =>
          r.result.kind === "item" &&
          (!r.tech || x.technologies.includes(r.tech)),
      )
      .map(([id, r]) => [id, r.name]),
  )}${btn("공동 자원 1개 제작", "craftShared")}
  ${(x.jobs ?? []).map((j) => `<p>${esc(j.kind === "research" ? technologies[j.recipe]?.name : recipes[j.recipe]?.name)} · ${j.state} · ${Math.ceil(j.remaining)}초 ${btn("완료품 회수", "collectJob", String(j.id))}</p>`).join("")}
  <h3>공동 산업 · 화물 운송</h3><p>기존 물류 연구, 가동 중인 우주항, 건조 자재 조건을 사용합니다.</p>${btn("MK-I 화물선 건조", "freighter", "1")}${btn("MK-II 화물선 건조", "freighter", "2")}${select(
    "freight-ship",
    (x.civilization?.ships ?? []).map((s) => [
      String(s.id),
      `#${s.id} ${s.at} / ${s.state}`,
    ]),
  )}${select(
    "freight-to",
    x.available.map((p) => [p, p.toUpperCase()]),
  )}${select(
    "freight-item",
    Object.keys(x.warehouse).map((id) => [
      id,
      items[id as keyof typeof items]?.name ?? id,
    ]),
  )}${number("freight-count", 10)}${number("freight-target", 100)}${btn("반복 항로 설정", "route")}
  ${(x.civilization?.ships ?? []).map((s) => `<p>#${s.id} ${s.at.toUpperCase()} · ${s.state} · ${Math.ceil(s.remaining)}초 · 화물 ${Object.values(s.cargo).reduce((n, v) => n + (v ?? 0), 0)} ${btn("연료·정비", "shipService", String(s.id))}${btn("귀환", "shipRecall", String(s.id))}</p>`).join("")}${(x.civilization?.routes ?? []).map((r) => btn(`#${r.id} ${r.from} → ${r.to} ${r.enabled ? "일시정지" : "재개"}`, "routeToggle", String(r.id))).join("")}
  <h3>공동 자금 시장</h3>${select(
    "market-item",
    Object.keys(marketPrices).map((id) => [
      id,
      items[id as keyof typeof items].name,
    ]),
  )}${number("market-count", 1)}${btn("공동 매입", "market", "buy")}${btn("공동 매각", "market", "sell")}${btn("우주 정거장 건설·확장", "stationBuild")}${btn("정거장 방문", "stationVisit", "", !x.civilization?.station.stage ? "정거장 건설 필요" : !atBase ? "착륙 기지 필요" : "")}${v.self.region === "station" && !v.self.instance ? btn("정거장에서 귀환", "stationLeave") : ""}${btn("ODYSSEY 공동 개조", "odyssey")}${btn("현지 문명 복원", "restorePlanet")}<p>정거장 창고: ${
    Object.entries(x.civilization?.station.warehouse ?? {})
      .map(
        ([id, n]) => `${esc(items[id as keyof typeof items]?.name ?? id)} ${n}`,
      )
      .join(" · ") || "비어 있음"
  }</p>${
    v.self.region === "station" && !v.self.instance
      ? `${select(
          "station-item",
          [
            ...new Set([
              ...Object.keys(v.self.inventory),
              ...Object.keys(x.civilization.station.warehouse),
            ]),
          ].map((id) => [id, items[id as keyof typeof items]?.name ?? id]),
        )}${number("station-count", 1)}${btn("정거장 납품", "stationTransfer", "in")}${btn("정거장 회수", "stationTransfer", "out")}`
      : ""
  }
  <h3>엔딩 합의 · ${e.ending ? esc(e.ending) : "아직 결정되지 않음"}</h3><p>GENESIS 실제 참여자 투표 · 과반수 필요 · 동률/미달은 재투표 · 소유자가 결과를 최종 확인한 뒤 영구 반영합니다.</p>${e.vote ? `<p>${e.vote.result ? `집계: ${e.vote.result}` : `남은 시간 ${Math.max(0, Math.ceil(e.vote.until - v.now))}초`}</p>${["freedom", "harmony", "rebirth"].map((id) => btn(id, "endingVote", id)).join("")}${btn("결과 영구 확정", "endingConfirm")}` : !e.ending ? btn("엔딩 투표 시작", "endingStart", "", !e.campaign.includes("genesisZero") ? "GENESIS 조사 필요" : v.self.role !== "OWNER" ? "소유자 권한 필요" : "") : ""}
  ${v.self.role === "OWNER" ? `<h3>탐사단 설정</h3><input id="on-corps-name" maxlength="30" value="${esc(e.corps.name)}" aria-label="탐사단 이름"><input id="on-corps-goal" maxlength="80" value="${esc(e.corps.goal)}" aria-label="탐사단 목표"><input id="on-corps-color" type="color" value="${e.corps.banner}" aria-label="탐사단 색상">${btn("탐사단 기록 저장", "corps")}` : ""}`;
}
export function expeditionCommand(
  action: string,
  value: string,
  get: (id: string) => string,
) {
  const n = (id: string) => Number(get(id));
  let args: Record<string, unknown>;
  if (action === "stationTransfer")
    args = {
      item: get("station-item"),
      count: n("station-count"),
      deposit: value === "in",
    };
  else if (action === "shipPropose") args = { planet: get("planet") };
  else if (
    [
      "shipBoard",
      "shipReady",
      "shipLeave",
      "shipDepart",
      "shipCancel",
    ].includes(action)
  )
    args = { voyage: value };
  else if (action === "mission") args = { kind: value };
  else if (action === "dungeon") args = { dungeon: value };
  else if (action === "gear") args = { kind: value };
  else if (action === "raidDevice") args = { device: Number(value) };
  else if (action === "endingVote") args = { ending: value };
  else if (action === "scienceResearch") args = { technology: get("science") };
  else if (action === "craftShared") args = { recipe: get("craft"), count: 1 };
  else if (action === "collectJob") args = { job: Number(value) };
  else if (action === "freighter") args = { tier: Number(value) };
  else if (action === "route")
    args = {
      ship: n("freight-ship"),
      to: get("freight-to"),
      item: get("freight-item"),
      amount: n("freight-count"),
      target: n("freight-target"),
    };
  else if (action === "routeToggle") args = { route: Number(value) };
  else if (["shipService", "shipRecall"].includes(action))
    args = { ship: Number(value) };
  else if (action === "market")
    args = { item: get("market-item"), count: n("market-count"), side: value };
  else if (action === "corps")
    args = {
      name: get("corps-name"),
      goal: get("corps-goal"),
      banner: get("corps-color"),
    };
  else return null;
  return { action, args };
}
