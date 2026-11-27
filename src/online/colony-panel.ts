import { buildings, colonyTech } from "../colony/catalog";
import { items } from "../data/content";
import { permitted, type View } from "../../shared/online";
import type { ColonyView } from "../../shared/colony-online";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const btn = (label: string, action: string, value = "") =>
  `<button data-online="${action}" data-value="${esc(value)}">${label}</button>`;
const choices = (values: [string, string][]) =>
  values
    .map(([id, name]) => `<option value="${esc(id)}">${esc(name)}</option>`)
    .join("");
export function colonyPanel(v: View) {
  const e = v.extension as unknown as ColonyView;
  if (!e) return "<p>서버 상태를 기다리는 중입니다.</p>";
  const bag = (data: Record<string, number>) =>
    Object.entries(data)
      .filter(([, n]) => n > 0)
      .map(
        ([id, n]) =>
          `${esc(items[id as keyof typeof items]?.name ?? id)} <b>${n}</b>`,
      )
      .join(" · ") || "비어 있음";
  return `<nav>${btn("기지 셔틀", "shuttle")}<span>EDEN 캠프 ↔ 건설 구역</span></nav><h3>공동 창고 · ${e.capacity}칸</h3><p>${bag(e.warehouse)}</p><h3>내 가방</h3><p>${bag(v.self.inventory)}</p>${Object.keys(v.self.pendingLoot ?? {}).length ? `<h3>가방 초과 보상 보관</h3><p>${bag(v.self.pendingLoot!)}</p>${btn("EDEN에서 보류 보상 회수", "claimLoot")}` : ""}<h3>내 보관함</h3><p>${bag(v.self.storage)}</p>${Object.keys(e.restricted).length ? `<h3>관리자 보관함</h3><p>${bag(e.restricted)}</p>` : ""}
  <div class="online-form-row"><select id="on-store-from" aria-label="출발 보관함">${choices(
    [
      ["inventory", "내 가방"],
      ["personal", "개인 보관함"],
      ["shared", "공동 창고"],
      ["restricted", "관리자 보관함"],
    ],
  )}</select><span>→</span><select id="on-store-to" aria-label="도착 보관함">${choices(
    [
      ["shared", "공동 창고"],
      ["inventory", "내 가방"],
      ["personal", "개인 보관함"],
      ["restricted", "관리자 보관함"],
    ],
  )}</select></div>
  <select id="on-item" aria-label="이동할 자원">${choices([...new Set([...Object.keys(v.self.inventory), ...Object.keys(v.self.storage), ...Object.keys(e.warehouse), ...Object.keys(e.restricted)])].map((id) => [id, items[id as keyof typeof items]?.name ?? id]))}</select><input id="on-count" type="number" value="1" min="1" max="9999" aria-label="이동 수량" style="width:85px">${btn("자원 이동", "transfer")}
  <h3>건설 · 40px 격자 / 공동 자원 사용</h3>${
    permitted(v.self, "build")
      ? `<select id="on-building-kind" aria-label="건물">${choices(
          Object.entries(buildings)
            .filter(
              ([id, d]) =>
                id !== "terminal" &&
                (!d.tech || e.colony.technologies.includes(d.tech)) &&
                (!d.science || e.technologies.includes(d.science)),
            )
            .map(([id, d]) => [id, d.name]),
        )}</select><label>X 좌표<input id="on-build-x" type="number" step="40" value="3400" min="40" max="9760"></label>${btn("건설 요청", "build")}`
      : "<p>소유자에게 BUILDER 이상의 건설 권한을 요청하세요.</p>"
  }
  <h3>전력 · 생산</h3>${e.buildings
    .map((b) => {
      const state = e.colony.buildings.find((s) => s.id === b.id)!;
      return `<article class="online-facility"><b>#${b.id} ${esc(b.name)} Lv.${state.level}</b><p>${state.remaining > 0 ? `건설 ${Math.ceil(state.remaining)}초` : b.powered ? "● 전력 공급" : "○ 대기"} · ${esc(b.reason)} · 생산 ${state.produced}</p>${btn("전원", "power", String(b.id))}${btn("업그레이드", "upgrade", String(b.id))}${!state.legacy ? btn("철거", "demolish", String(b.id)) : ""}${b.recipes.length ? `<select id="on-recipe-${b.id}" aria-label="${esc(b.name)} 레시피">${choices(b.recipes.map((r) => [r.id, r.name]))}</select>${btn("반복 생산 (목표 20)", "configure", String(b.id))}` : ""}</article>`;
    })
    .join("")}
  <h3>공동 연구 · ${e.points} RP</h3><p>완료: ${e.colony.technologies.map((id) => colonyTech[id]?.name ?? id).join(" · ") || "없음"}</p>${
    e.colony.research
      ? `<p>진행: ${esc(colonyTech[e.colony.research.id]?.name)} · ${Math.ceil(e.colony.research.remaining)}초 (전력 필요)</p>`
      : `<select id="on-research" aria-label="연구">${choices(
          Object.entries(colonyTech)
            .filter(
              ([id, t]) =>
                !e.colony.technologies.includes(id) &&
                t.requires.every((k) => e.colony.technologies.includes(k)),
            )
            .map(([id, t]) => [id, `${t.name} · ${t.points} RP`]),
        )}</select>${btn("연구 시작", "research")}`
  }${btn("개인 결정 1개 → 공동 2 RP", "researchSample")}
  <h3>공동 자금 ${e.funds} CR · 개인 ${v.self.credits} CR</h3><input id="on-funds" type="number" value="10" min="1" aria-label="크레딧 수량">${btn("입금", "funds", "in")}${btn("출금", "funds", "out")}
  <h3>탐험가 간 거래</h3>${v.members
    .filter((p) => p.id !== v.self.id && p.connected)
    .map((p) => btn(`${esc(p.name)}에게 거래 요청`, "tradeRequest", p.id))
    .join("")}${e.trades
    .map(
      (t) =>
        `<article class="online-facility"><p>${esc(v.members.find((p) => p.id === t.from)?.name)} ↔ ${esc(v.members.find((p) => p.id === t.to)?.name)}</p>${Object.entries(
          t.offers,
        )
          .map(
            ([id, o]) =>
              `<p>${esc(v.members.find((p) => p.id === id)?.name)}: ${bag(o.items)} / ${o.credits} CR ${t.ready.includes(id) ? "✓ 준비" : ""} ${t.confirmed.includes(id) ? "✓ 최종 승인" : ""}</p>`,
          )
          .join("")}${
          !t.accepted
            ? btn("거래 수락", "tradeAccept", t.id)
            : `<select id="on-trade-item">${choices(
                Object.entries(v.self.inventory)
                  .filter(([, n]) => n > 0)
                  .map(([id]) => [
                    id,
                    items[id as keyof typeof items]?.name ?? id,
                  ]),
              )}</select><input id="on-trade-count" type="number" value="1" min="0" aria-label="거래 수량"><input id="on-trade-credits" type="number" value="0" min="0" aria-label="거래 크레딧">${btn("제안 갱신", "tradeOffer", t.id)}${btn("준비 확인", "tradeReady", t.id)}${btn("최종 승인", "tradeConfirm", t.id)}`
        }${btn("거래 취소", "tradeCancel", t.id)}<p>제안한 자원은 서버가 보관합니다. 변경 시 양쪽 승인이 초기화되고, 연결 종료 시 반환됩니다.</p></article>`,
    )
    .join("")}
  <h3>공동 작업 기록</h3>${v.logs
    .slice(-12)
    .reverse()
    .map((l) => `<p>${esc(l.actor)} · ${esc(l.text)}</p>`)
    .join("")}`;
}
export function colonyCommand(
  action: string,
  value: string,
  get: (id: string) => string,
): { action: string; args: Record<string, unknown> } | null {
  const number = (id: string) => Number(get(id));
  if (action === "build")
    return {
      action,
      args: { kind: get("building-kind"), x: number("build-x"), y: 780 },
    };
  if (["upgrade", "demolish", "power"].includes(action))
    return { action, args: { building: Number(value) } };
  if (action === "configure")
    return {
      action,
      args: {
        building: Number(value),
        recipe: get("recipe-" + value),
        repeat: true,
        target: 20,
      },
    };
  if (action === "transfer")
    return {
      action,
      args: {
        item: get("item"),
        count: number("count"),
        from: get("store-from"),
        to: get("store-to"),
      },
    };
  if (action === "research")
    return { action, args: { technology: get("research") } };
  if (action === "researchSample") return { action, args: { count: 1 } };
  if (action === "funds")
    return {
      action,
      args: { amount: number("funds"), deposit: value === "in" },
    };
  if (action === "tradeRequest") return { action, args: { target: value } };
  if (action === "tradeOffer") {
    const count = number("trade-count");
    return {
      action,
      args: {
        trade: value,
        items: count ? { [get("trade-item")]: count } : {},
        credits: number("trade-credits"),
      },
    };
  }
  if (
    ["tradeAccept", "tradeReady", "tradeConfirm", "tradeCancel"].includes(
      action,
    )
  )
    return { action, args: { trade: value } };
  return null;
}
