import type { World } from "../core/world";
import {
  ancientGear,
  endingNames,
  keyCost,
  memories,
  moduleCosts,
  moduleNames,
  puzzleLabels,
  puzzleNames,
  puzzleSolutions,
  relicNames,
  storyQuests,
} from "../ancient/catalog";
import { ancientEnemies, type AncientEnemy } from "../ancient/regions";
import { items, type ItemId } from "../data/content";
const button = (text: string, action: string, value = "", disabled = false) =>
  `<button data-action="an-${action}" data-value="${value}" ${disabled ? "disabled" : ""}>${text}</button>`;
const cost = (c: object) =>
  Object.entries(c)
    .map(([id, n]) => `${items[id as ItemId].name} ×${n}`)
    .join(" · ");
const card = (title: string, text: string, actions = "") =>
  `<article class="ancient-card"><h3>${title}</h3><p>${text}</p>${actions}</article>`;
export function ancientPanel(w: World) {
  const o = w.omega,
    s = o.state;
  let body = "";
  const tab = o.openTab;
  if (tab === "journey")
    body =
      `<div class="ancient-banner"><span>SEVEN WORLDS. ONE ORIGIN.</span><h2>ANCIENT SECRETS</h2><p>ECHO · ${s.ending === "freedom" ? "우리의 미래는 이제 각자의 선택으로 만들어집니다." : s.ending === "harmony" ? "모든 판단은 당신에게 공개되며, 인간의 감독을 받습니다." : s.ending === "rebirth" ? "새로운 복원망에 첫 기록을 남깁니다." : "우리는 모든 것을 연결하면 완벽한 문명을 만들 수 있다고 믿었습니다."}</p></div><div class="ancient-grid">` +
      card(
        "여섯 세계의 증언",
        ["EDEN", "ARES", "FROSTIA", "INFERNO", "AQUARIA", "LUNARIS"]
          .map((n, i) => `${o.records[i] ? "✓" : "○"} ${n}`)
          .join(" · "),
      ) +
      card(
        "GENESIS KEY",
        s.key ? "인증 완료 · 소비되지 않는 영구 기록" : cost(keyCost),
        button("영구 열쇠 제작", "key", "", s.key),
      ) +
      Object.entries(moduleNames)
        .map(([id, name]) =>
          card(
            name,
            cost(moduleCosts[id as keyof typeof moduleCosts]),
            button(
              s.modules.includes(id as never) ? "설치 완료" : "모듈 설치",
              "module",
              id,
              s.modules.includes(id as never),
            ),
          ),
        )
        .join("") +
      card(
        "OMEGA 항로",
        o.entryReason() || "항로 인증 완료 · U → 항성계 지도에서 이동",
        `<p>고대 기술 연구 → 탐험복 제작·장착 → HORIZON + 3개 모듈</p>`,
      ) +
      `</div><h3>기록 임무 65–78</h3><div class="ancient-grid">` +
      storyQuests
        .map((q, i) =>
          card(
            `${65 + i} · ${q}`,
            s.quests.includes(i)
              ? "기록 보상 수령 완료"
              : o.questReady(i)
                ? "완료 · 보상 수령 가능"
                : "탐험과 ECHO 기록을 이어가세요.",
            button(
              "보상 수령",
              "quest",
              String(i),
              !o.questReady(i) || s.quests.includes(i),
            ),
          ),
        )
        .join("") +
      "</div>";
  if (tab === "puzzles") {
    const p = o.puzzle,
      at = p >= 0 && p < 5;
    body =
      "<p>현장의 고대 장치에서 F를 눌러 연결하세요. 진행은 즉시 저장됩니다.</p>" +
      puzzleNames
        .map((n, i) =>
          card(
            n,
            s.puzzles.includes(i)
              ? "✓ 복원 완료"
              : i === p
                ? "현재 접속한 장치"
                : "미복원 · 현장 방문 필요",
          ),
        )
        .join("");
    if (at && !s.puzzles.includes(p))
      body =
        `<section class="ancient-puzzle"><h3>${puzzleNames[p]}</h3><p>${s.attempts[p].length} / ${puzzleSolutions[p].length} 연결 · 순서가 틀리면 초기화됩니다.</p><p>${["에너지의 흐름: 발전 → 안정화 → 수집 → 중계", "중력의 흐름: 무거움 → 가벼움 → 역장 → 균형", "여섯 세계의 기록: 생명의 탄생 → 산업 → 항해 → 중앙 판단", "안전한 권한 이양: 검증 → 증인 → 차단 → 권한", "AETERNUM 역사를 시간순으로 복원하세요."][p]}</p>${puzzleLabels[p].map((label, i) => button(label, "solve", String(i))).join("")}${button("ECHO 도움말", "hint")}<p>${o.hint ? "연결 순서: " + puzzleSolutions[p].map((i) => puzzleLabels[p][i]).join(" → ") : "실패해도 자원과 생명력을 잃지 않습니다."}</p></section>` +
        body;
  }
  if (tab === "archive")
    body =
      '<div class="ancient-grid">' +
      memories
        .map(([name, text], i) =>
          card(
            s.memories.includes(i) ? name : "미확인 기억",
            s.memories.includes(i)
              ? text
              : "고대 장치를 복구하면 기록을 확인할 수 있습니다.",
            button(
              "기억 재생 · 15초",
              "film",
              "memory-" + i,
              !s.memories.includes(i),
            ),
          ),
        )
        .join("") +
      card(
        "THE LAST WORLD",
        "최초 착륙 기록",
        button("착륙 재생 · 30초", "film", "landing", !s.visited),
      ) +
      card(
        "일곱 세계",
        "EDEN 생명 · ARES 산업 · FROSTIA 초전도 · INFERNO 에너지 · AQUARIA 적응 · LUNARIS 항법 · OMEGA 중앙 판단",
      ) +
      "</div>";
  if (tab === "ending")
    body = s.ending
      ? `<h2>${endingNames[s.ending]}</h2><p>선택은 저장되었습니다. 세 결말 모두 일곱 행성 자유 탐험과 같은 성장 기회를 제공합니다.</p>` +
        Object.entries(endingNames)
          .map(([id, name]) =>
            card(
              name,
              "기록 재생은 실제 선택을 변경하지 않습니다.",
              button("엔딩 재생 · 75초", "film", "ending-" + id),
            ),
          )
          .join("")
      : !s.kills.genesisZero
        ? "<p>GENESIS ZERO를 정지시키고 마지막 판단을 마주하세요.</p>"
        : `<h2>마지막 판단은 당신의 몫입니다</h2><p>중앙 코어는 정지되었습니다. 기록을 지키며 새로운 문명을 선택하세요.</p>` +
          Object.entries(endingNames)
            .map(([id, name], i) =>
              card(
                name,
                [
                  "중앙 통제를 분산하고 기록을 보존합니다.",
                  "GENESIS를 감독 가능한 제한된 조력자로 남깁니다.",
                  "중앙 통제를 해체하고 분산 복원망을 만듭니다.",
                ][i],
                button("이 미래 선택", "choose", id),
              ),
            )
            .join("") +
          (s.pending
            ? `<div class="ancient-confirm"><h3>${endingNames[s.pending]}을 확정할까요?</h3><p>확정하면 이 세계의 결말로 저장됩니다.</p>${button("선택 확정 및 엔딩", "confirm", s.pending)}${button("다시 생각하기", "cancel")}</div>`
            : "");
  if (tab === "equipment")
    body =
      card(
        "ASCENDED PIONEER",
        "Lv.100 + 엔딩 · 에너지 재생 +1. 이후 XP는 현재 직업 숙련도로 전환됩니다.",
        button(
          s.ascended ? "승격 완료" : "승격",
          "ascend",
          "",
          s.ascended || w.player.level < 100 || !s.ending,
        ),
      ) +
      '<h3>고대 제작</h3><p>L 제작 화면에서 연구 후 7종 무기와 6직업 3부위 세트를 제작합니다. 같은 직업 세 부위: 공격 +6%, 에너지 재생 +1. 강화 수치는 초월 승급 후에도 유지됩니다.</p><div class="ancient-grid">' +
      w.battle.gear
        .filter((g) => Object.hasOwn(ancientGear, g.template))
        .map((g) =>
          card(
            ancientGear[g.template].name,
            `${g.rarity} · +${g.upgrade ?? 0} · 초월 합금 ×3 / 제네시스 파편 ×1`,
            button(
              "초월 승급",
              "transcend",
              g.id,
              g.rarity === "transcendent" || !s.ending,
            ),
          ),
        )
        .join("") +
      '</div><h3>유물 · 최대 2개</h3><div class="ancient-grid">' +
      Object.entries(relicNames)
        .map(([id, name], i) =>
          card(
            name,
            [
              "5초마다 HP 1.5% 회복",
              "중화기 공격 +6%",
              "에너지 재생 +1",
              "원소 피해 저항 +8%",
              "5초마다 산소 +3",
              "공중 공격 +6%",
              "에너지 재생 +2",
            ][i] + " · 최초 복원: 에테르눔 합금 ×2, 기억 데이터 ×1",
            button(
              s.equipped.includes(id as never)
                ? "해제"
                : s.relics.includes(id as never)
                  ? "장착"
                  : "복원 및 장착",
              "relic",
              id,
              !s.visited,
            ),
          ),
        )
        .join("") +
      "</div>";
  if (tab === "endgame")
    body =
      card(
        "INFINITY NEXUS · 10층",
        "처치 / 장치 / 생존 목표 · 5층 체크포인트 · 최고 " +
          s.nexus.best +
          "층",
        button("넥서스 도전", "run", "nexus", !s.ending),
      ) +
      card(
        "GALACTIC TRIAL · 7연전",
        "TITAN → COLOSSUS → LEVIATHAN → HELIOS → EMPEROR → ARCHON → GENESIS ZERO · 각 전투 후 회복",
        button("연속 보스전", "run", "galactic", !s.ending),
      ) +
      card(
        "초월 TITAN",
        "지연 교차 균열이 추가됩니다. 본편 자원과 장비는 보존됩니다.",
        button("초월 타이탄", "run", "transcendent", !s.ending),
      ) +
      "<h3>최근 완료 기록</h3>" +
      s.records
        .map((r) =>
          card(
            r.mode,
            `${r.seconds.toFixed(1)}초 · 피해 ${Math.round(r.damage)} · 사망 ${r.deaths} · ${r.classId} · ${r.rarity} · 구간 ${r.bossTimes.map((n) => n.toFixed(1)).join(" / ")}초`,
          ),
        )
        .join("") +
      card(
        "일곱 행성 복원",
        s.restoration.map((id) => id.toUpperCase()).join(" · ") ||
          "복원 기록 없음",
        `<p>문명 복원 연구 후 각 행성 기지에서 문명 복원 코어 ×1 + 철 주괴 ×5를 전달하세요.</p>${button("현재 행성 복원", "restore", w.planetId, !s.ending)}`,
      ) +
      card(
        "새로운 신호",
        s.restoration.length === 7
          ? "먼 항성에서 응답이 도착했습니다. 다음 여정의 기록이 열립니다."
          : "일곱 복원망이 연결되면 새로운 신호를 해독합니다.",
      ) +
      card(
        "초월 GENESIS ZERO",
        "엔딩 후 코어 현장에서 시작. 지연 추적 광선이 추가되며 보상은 제네시스 파편 ×2입니다.",
        button(
          "초월 전투 시작",
          "boss",
          "genesisZero",
          !s.ending || w.region !== "omegaCore" || w.player.x < 3500,
        ),
      );
  return `<nav class="ancient-tabs">${[
    ["journey", "여정"],
    ["puzzles", "고대 장치"],
    ["archive", "기록 보관소"],
    ["equipment", "성장·유물"],
    ["ending", "마지막 선택"],
    ["endgame", "문명 복원"],
  ]
    .map(([id, name]) => button(name, "tab", id))
    .join("")}</nav><div class="ancient-panel">${body}</div>`;
}
export function ancientAction(w: World, action: string, value = "") {
  if (!action.startsWith("an-")) return false;
  const o = w.omega;
  switch (action.slice(3)) {
    case "tab":
      if (
        [
          "journey",
          "puzzles",
          "archive",
          "equipment",
          "ending",
          "endgame",
        ].includes(value)
      )
        o.openTab = value;
      break;
    case "key":
      o.craftKey();
      break;
    case "module":
      o.install(value);
      break;
    case "solve":
      o.solve(Number(value));
      break;
    case "hint":
      o.hint = true;
      break;
    case "quest":
      o.claimQuest(Number(value));
      break;
    case "film":
      o.play(value);
      break;
    case "choose":
      o.choose(value);
      break;
    case "confirm":
      o.choose(value, true);
      break;
    case "cancel":
      o.state.pending = null;
      break;
    case "skip":
      o.finishFilm();
      break;
    case "relic":
      o.relic(value);
      break;
    case "ascend":
      o.ascend();
      break;
    case "transcend":
      o.transcend(value);
      break;
    case "restore":
      o.restore(value);
      break;
    case "boss":
      o.combat.start(value, true);
      break;
  }
  return true;
}
export function ancientHud(w: World) {
  const o = w.omega,
    b = o.combat.boss;
  return (
    (o.endgame.original
      ? `<div class="ancient-challenge"><b>${o.endgame.mode.toUpperCase()} · ${o.endgame.floor}층</b><p>${o.endgame.failed ? "도전 종료" : o.endgame.complete ? "도전 완료" : o.endgame.ready ? "회복 구간" : o.endgame.objective}</p><span>${o.endgame.elapsed.toFixed(1)}초 · 피해 ${Math.round(o.endgame.damage)}</span>${o.endgame.ready ? button("회복 후 다음 구간", "next") : ""}${button("기록 저장 · 본편 귀환", "exit")}</div>`
      : "") +
    (w.planetId === "omega"
      ? `<button class="ancient-open" data-action="ancient">ECHO · 고대 기록</button><aside class="ancient-quest"><span>AETERNUM LOG</span><p>${storyQuests.find((_, i) => !o.state.quests.includes(i)) ?? "새 문명의 시대"}</p><small>기록 메뉴에서 진행과 보상을 확인하세요.</small></aside>`
      : "") +
    (b
      ? `<div class="space-boss"><b>${ancientEnemies[b.kind as AncientEnemy].name} · PHASE ${o.combat.phase}</b><progress max="${b.maxHp}" value="${b.hp}"></progress><small>${o.combat.core > 0 ? "코어 반격 창" : "공격 예고를 확인하세요"} · F 공급 장치 ${Math.ceil(o.combat.feedCooldown)}초</small></div>`
      : "") +
    (o.state.cinematic
      ? `<button class="ancient-skip" data-action="an-skip">F · 장면 건너뛰기</button>`
      : "")
  );
}
