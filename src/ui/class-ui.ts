import type { World } from "../core/world";
import {
  classIds,
  classes,
  classSkills,
  paths,
  type ClassId,
} from "../classes/catalog";
import { canRematch, rematches } from "../classes/TrainingArena";
import { baseStats, EquipmentSystem } from "../combat/EquipmentSystem";
import { weapons } from "../data/battle";
let tab = "academy";
const button = (action: string, value: string, label: string, reason = "") =>
  `<button data-action="cl-${action}" data-value="${value}" ${reason ? "disabled" : ""} title="${reason}">${label}</button>`;
const grades = ["미완료", "BRONZE", "SILVER", "GOLD", "PLATINUM"];
export function classPortrait(id: ClassId) {
  const color = classes[id].color;
  const accessory =
    id === "guardian"
      ? '<path d="M12 36 L30 32 V70 L19 80 L8 68 Z"/>'
      : id === "ranger"
        ? '<path d="M46 40 H86 V47 H63 V60 H56 V47 H46 Z"/><circle cx="71" cy="34" r="5"/>'
        : id === "engineer"
          ? '<rect x="69" y="20" width="18" height="10"/><path d="M65 17 H91 M78 25 L67 38"/>'
          : id === "scientist"
            ? '<circle cx="77" cy="40" r="11"/><ellipse cx="77" cy="40" rx="18" ry="5"/>'
            : id === "explorer"
              ? '<path d="M24 32 H14 V63 H25 M14 62 L11 80 L23 70"/><circle cx="70" cy="50" r="9"/>'
              : '<path d="M67 60 L92 10 L85 52 L74 66 Z"/><path d="M23 42 L7 30 L16 69 L28 74 Z"/>';
  return `<svg class="class-portrait" viewBox="0 0 100 100" role="img" aria-label="${classes[id].name} 장비 실루엣"><g fill="${color}22" stroke="${color}" stroke-width="2"><path d="M31 35 Q50 25 64 35 L67 68 H29 Z"/><rect x="34" y="9" width="26" height="27" rx="10"/><path d="M35 20 H59 M34 68 L30 92 H43 L49 69 L54 92 H67 L62 68"/>${accessory}</g></svg>`;
}
export function classPanel(w: World) {
  const c = w.classes,
    s = c.state,
    d = c.definition;
  const nav = `<div class="class-header"><div><small>PIONEER ACADEMY / PATH OF THE EXPLORER</small><h2>${d?.icon ?? "✦"} ${c.name}</h2><p>Lv.${w.player.level} · ${s.tier}차 전직 · 숙련 ${c.mastery}/20 · SP <b>${c.sp}</b> / 누적 ${s.granted}</p></div><div>${d ? classPortrait(s.classId!) : ""}</div></div><nav class="class-tabs">${[
    ["academy", "직업과 전직"],
    ["tree", "스킬 트리"],
    ["progress", "숙련과 프리셋"],
    ["arena", "훈련과 재도전"],
  ]
    .map(
      ([id, name]) =>
        `<button class="${tab === id ? "selected" : ""}" data-action="cl-tab" data-value="${id}">${name}</button>`,
    )
    .join("")}</nav>`;
  if (c.trialReturn)
    return (
      nav +
      `<section class="class-trial-card"><h3>${c.trial ? "교관의 실전 시험" : "행성 보스 재도전"}</h3>${trialStatus(w)}<p>모든 임시 장비·자원·경험치는 종료 시 제거됩니다. 시험 통과 기록과 최초 등급 향상 보상만 반영됩니다.</p>${button("finish", "", "체험 종료 · 원래 캐릭터 복원")}</section>` +
      tree(w)
    );
  if (tab === "tree") return nav + tree(w);
  if (tab === "progress") return nav + progress(w);
  if (tab === "arena") return nav + arena(w);
  return (
    nav +
    `<p class="class-note">통신망으로 합류한 여섯 교관. 첫 전직은 Lv.10부터 무료 터미널에서 가능합니다. 기지의 아카데미는 다른 행성에도 건설할 수 있습니다. ${c.safeReason || "현재 안전 구역 · 전직 가능"}</p><div class="class-grid">${classIds
      .map((id) => {
        const data = classes[id],
          selected = s.classId === id;
        return `<article class="class-card ${selected ? "selected" : ""}" style="--class-color:${data.color}">${classPortrait(id)}<small>${data.mentor}</small><h3>${data.icon} ${data.name}</h3><p>${data.description}</p><blockquote>“${data.motto}”</blockquote><p class="class-meta">난이도 ${data.difficulty} · ${data.weapons.map((id) => weapons[id].name).join(" / ")}<br>고유 게이지 ${data.gauge}<br>${data.paths.map((p) => paths[p].name).join(" / ")}</p><details><summary>기본 스킬 4종</summary>${[0, 1, 2, 3].map((i) => `<p><b>${classSkills[`${id}_${i}`].name}</b><br>${classSkills[`${id}_${i}`].description}</p>`).join("")}</details><div class="class-actions">${button("mentor", id, "교관과 대화")}${button("trial", `${id}:1:trial`, "직업 체험", c.safeReason || (w.player.level < 10 ? "Lv.10 필요" : ""))}${button("choose", id, selected ? "현재 직업" : s.classId ? "변경 · 100 CR" : "1차 전직 · 무료", selected ? "현재 직업" : c.safeReason || (!s.trials[id] ? "체험 시험 통과 필요" : ""))}</div><small>시험 기록: ${grades[s.trials[id] ?? 0]}</small></article>`;
      })
      .join(
        "",
      )}</div>${d ? `<h3>전문화 방향 · Lv.30</h3><div class="class-grid two">${d.paths.map((id) => `<article class="class-card"><h3>${paths[id].name}</h3><p>→ ${paths[id].final}</p><p>${paths[id].description}</p><p>궁극기: ${paths[id].ultimate}</p>${button("specialize", id, s.path === id ? "현재 전문화" : "전문화 선택 · 변경 50 CR", c.safeReason || (w.player.level < 30 ? "Lv.30 필요" : ""))}</article>`).join("")}</div><div class="class-actions">${button("trial", `${s.classId}:2:trial`, "2차 시험", c.safeReason || (w.player.level < 30 ? "Lv.30 필요" : ""))}${button("trial", `${s.classId}:3:trial`, "3차 시험", c.safeReason || (w.player.level < 60 ? "Lv.60 필요" : ""))}${button("advance", "", "3차 전직 · 궁극기 해금", c.safeReason || (s.tier !== 2 || w.player.level < 60 || !s.trials[`${s.classId}_tier3`] ? "Lv.60 / 2차 전직 / 3차 시험 필요" : ""))}</div>` : ""}`
  );
}
function tree(w: World) {
  const c = w.classes,
    s = c.state;
  if (!s.classId)
    return '<p class="class-note">직업 선택 후 스킬 트리가 열립니다. 아래의 기존 공통 스킬은 계속 사용할 수 있습니다.</p>';
  return `<p class="class-note">기본 액티브 4종은 전직 시 무료 Lv.1. 강화는 단계당 1 SP. 전직·레벨 보상은 한 번만 지급됩니다. 궁극기 <kbd>6</kbd> · 우주선 <kbd>U</kbd> · 기존 스킬은 아래에서 슬롯에 배치할 수 있습니다.</p><div class="class-actions">${button("reset", "", s.resets ? "스킬 초기화 · 50 CR" : "첫 스킬 초기화 · 무료", c.safeReason)}</div>${(
    ["combat", "mastery", "pioneer"] as const
  )
    .map(
      (branch) =>
        `<h3 class="class-branch">${{ combat: "A / COMBAT · 전투", mastery: "B / MASTERY · 숙련", pioneer: "C / PIONEER · 개척" }[branch]}</h3><div class="class-skill-grid">${Object.values(
          classSkills,
        )
          .filter(
            (d) =>
              d.classId === s.classId &&
              (!d.path || d.path === s.path) &&
              d.branch === branch,
          )
          .map((d) => {
            const rank = s.ranks[d.id] ?? 0,
              reason = c.learnReason(d.id),
              ready = c.usable(d.id);
            return `<article class="class-skill ${ready ? "learned" : ""}"><small>${d.ultimate ? "ULTIMATE / 6" : d.passive ? "PASSIVE" : "ACTIVE"} · Lv.${d.level} · ${d.tier}차</small><h4>${d.name}</h4><strong>${rank} / ${d.max}</strong><p>${d.description}</p><small>${d.passive ? "상시 적용" : `EP ${c.energyCost(d)} · 게이지 ${d.gauge} · ${d.cooldown}초`}<br>선행: ${d.prerequisite ? classSkills[d.prerequisite].name : "없음"}<br>다음 단계: ${d.passive ? d.description : d.power ? "위력 +8%" : "EP 비용 감소 · 최소 8 EP"}</small>${button("learn", d.id, rank >= d.max ? "최대 단계" : "성장 · 1 SP", reason)}${!d.passive && !d.ultimate ? `<div class="class-slots">${["Q", "E", "R", "T"].map((key, i) => button("assign", `${i}:${d.id}`, `${key}${s.slots[i] === d.id ? " ✓" : ""}`, ready ? "" : "먼저 학습하세요")).join("")}</div>` : ""}</article>`;
          })
          .join("")}</div>`,
    )
    .join("")}`;
}
function progress(w: World) {
  const c = w.classes,
    s = c.state;
  return `<div class="class-grid two"><section><h3>직업 숙련 기록</h3>${classIds.map((id) => `<p>${classes[id].name} <b>Lv.${Math.min(20, 1 + Math.floor((s.mastery[id] ?? 0) / 200))}</b> · ${Math.floor(s.mastery[id] ?? 0)} XP</p>`).join("")}<p>실제 적에게 피해를 준 직업 스킬, 최초 도전 등급 향상, 직업 퀘스트로 획득합니다.</p><h3>전용 장비 설계</h3><p>${c.definition?.set ?? "직업 선택 필요"} · 2차: 희귀 / 철 8·회로 2 · 3차: 영웅 / 초합금 4·초전도 회로 2</p>${button("gear", "body", "전투복 제작", c.safeReason || (s.tier < 2 ? "2차 전직 필요" : ""))}${button("gear", "core", "코어 제작", c.safeReason || (s.tier < 2 ? "2차 전직 필요" : ""))}</section><section><h3>장비·스킬·환경 프리셋</h3><p>같은 직업의 보유 장비만 적용합니다. 쿨다운·체력·게이지는 복구하지 않습니다.</p>${[
    ["boss", "보스 공략"],
    ["hunt", "일반 사냥"],
    ["defense", "기지 방어"],
    ["mining", "자원 채굴"],
    ["water", "수중 탐험"],
    ["space", "초저중력 탐험"],
  ]
    .map(
      ([id, name]) =>
        `<div class="class-preset"><b>${name}</b>${button("preset-save", id, "저장", c.safeReason)}${button("preset-load", id, "적용", c.safeReason || (!s.presets[id] ? "저장된 프리셋 없음" : ""))}</div>`,
    )
    .join(
      "",
    )}</section></div><h3>개척자 퀘스트 · 메인 진행과 독립</h3><div class="class-grid two">${["개척자의 길", "나의 첫 번째 선택", "새로운 힘", "전문성을 향하여", "개척자의 숙련", "극한을 넘어", "별들의 시험", "최후의 신호"].map((name, i) => `<article class="class-skill"><h4>QUEST ${57 + i} · ${name}</h4><p>${["교관 대화 및 직업 체험", "1차 전직", "SP 사용·직업 스킬 명중·3 HIT 연계", "2차 전직", "숙련 Lv.2·직업 도전 통과·전용 장비 제작", "3차 전직 및 궁극기 사용", "행성 보스 재도전 성공", "LUNARIS GENESIS 기록 및 3차 전직"][i]}</p>${button("quest", String(57 + i), s.quests.includes(57 + i) ? "보상 수령 완료" : "SP 2 · 숙련 50 수령", s.quests.includes(57 + i) ? "이미 수령" : c.questReady(57 + i) ? "" : "목표 미달성")}</article>`).join("")}</div><p class="class-note">${s.quests.includes(64) ? "GENESIS: “문명의 미래는 가장 강한 자가 아니라, 서로 다른 능력을 하나로 연결하는 자에게 달려 있다.” · OMEGA 항법 분석 준비 완료" : "최후의 신호는 기존 LUNARIS 기록과 연결됩니다."}</p>`;
}
function arena(w: World) {
  const c = w.classes,
    m = c.metrics;
  return `<h3>교관의 도전</h3><p>180초 제한 · 직업 스킬 3종, 6회 명중, 1기 격파. Guardian/Cyber Blade는 반격 1회, Explorer는 350px 이동과 스캔도 필요합니다. 시간에 따라 BRONZE–PLATINUM. 같은 등급 보상은 반복 지급하지 않습니다.</p>${c.state.classId ? button("trial", `${c.state.classId}:${Math.max(1, c.state.tier)}:challenge`, "현재 직업 도전 시작", c.safeReason) : "직업을 먼저 선택하세요."}<h3>행성 보스 재도전</h3><p>처치한 보스만 선택 가능. HARD는 예고된 추적 중력장, MASTERY는 추가 교차 광선을 사용합니다. 원래 환경 장비를 준비하세요.</p><div class="class-grid two">${rematches.map(([id, name]) => `<article class="class-skill"><h4>${name}</h4>${["NORMAL", "HARD", "MASTERY"].map((mode, i) => button("rematch", `${id}:${i}`, mode, c.safeReason || (!canRematch(w, id) ? "스토리 첫 처치 필요" : ""))).join("")}</article>`).join("")}</div><h3>현재 세션 전투 분석</h3><div class="class-metrics">${Object.entries(
    {
      "누적 피해": Math.round(m.damage),
      DPS: Math.round(m.damage / Math.max(1, m.elapsed)),
      명중: m.hits,
      "치명타 %": Math.round((100 * m.critical) / Math.max(1, m.hits)),
      "EP 소비": m.spentEP,
      "게이지 획득": Math.round(m.gaugeEarned),
      궁극기: m.ultimates,
      "피해 감소": Math.round(m.prevented),
      회복: Math.round(m.healing),
      "소환 피해": Math.round(m.summonDamage),
    },
  )
    .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
    .join(
      "",
    )}</div><p>비교할 때 같은 전직 단계의 체험을 선택하세요. DPS는 현재 세션 경과 시간 기준입니다.</p>`;
}
export function trialStatus(w: World) {
  const t = w.classes.trial,
    r = w.classes.rematch;
  if (r)
    return `<p>${["NORMAL", "HARD", "MASTERY"][r.difficulty]} · ${r.enemy.hp <= 0 ? "격파 성공" : `${Math.ceil(r.enemy.hp)} HP`} · ${Math.floor(r.elapsed)}초</p>`;
  return t
    ? `<p>${Math.max(0, 180 - Math.floor(t.elapsed))}초 · 스킬 ${t.skills.length}/3 · 명중 ${t.hits}/6 · 격파 ${t.kills}/1 ${t.classId === "guardian" || t.classId === "cyberBlade" ? `· 반격 ${t.defended}/1` : t.classId === "explorer" ? `· 이동 ${Math.round(t.distance)}/350 · 스캔 ${t.scanned ? "✓" : "—"}` : ""} · ${grades[t.grade]}</p>`
    : "";
}
export function classHud(w: World) {
  const c = w.classes,
    s = c.state,
    d = c.definition,
    id = s.path ? `${s.path}_ultimate` : null,
    ult = id ? classSkills[id] : null;
  return `${d ? `<div class="class-gauge" style="--class-color:${d.color}"><span>${d.icon} ${d.gauge}</span><progress value="${s.gauge}" max="100"></progress><b>${Math.floor(s.gauge)}</b><button data-action="cl-ultimate" title="${id ? c.castReason(id) : "3차 전직 필요"}" class="${id && !c.castReason(id) ? "ready" : ""}"><kbd>6</kbd> ${ult?.name ?? "궁극기 · 3차 전직"} ${id && (s.cooldowns[id] ?? 0) > 0 ? Math.ceil(s.cooldowns[id]) + "s" : ""}</button></div>` : ""}${c.trialReturn ? `<div class="class-trial-hud"><b>${c.trial ? "ACADEMY TRIAL" : "BOSS REMATCH"}</b>${trialStatus(w)}${button("finish", "", "체험 종료")}</div>` : ""}`;
}
export function classStats(w: World) {
  const base = baseStats(w.player.level),
    gear = EquipmentSystem.stats(w.player.level, w.battle),
    final = w.stats;
  return `<section class="class-detail"><h3>${w.classes.name} · 숙련 ${w.classes.mastery} · SP ${w.classes.sp}</h3><p>직업 개척 보조 ${(w.classes.bonus * 100).toFixed(1)}% · ${w.classes.definition?.description ?? "Lv.10부터 V에서 직업 체험을 시작하세요."}</p><details><summary>기본 / 장비 / 직업·연구·환경 합산</summary>${(["hp", "energy", "attack", "defense", "moveSpeed"] as const).map((k) => `<p>${k}: ${base[k].toFixed(1)} + ${(gear[k] - base[k]).toFixed(1)} + ${(final[k] - gear[k]).toFixed(1)} = ${final[k].toFixed(1)}</p>`).join("")}</details></section>`;
}
export function classAction(w: World, action: string, value = "") {
  if (!action.startsWith("cl-")) return false;
  const c = w.classes;
  switch (action) {
    case "cl-tab":
      if (["academy", "tree", "progress", "arena"].includes(value)) tab = value;
      break;
    case "cl-mentor":
      if (classIds.includes(value as ClassId)) {
        c.record("mentor");
        w.toast(classes[value as ClassId].motto);
      }
      break;
    case "cl-choose":
      c.choose(value as ClassId);
      break;
    case "cl-specialize":
      c.specialize(value);
      break;
    case "cl-advance":
      c.advance();
      break;
    case "cl-learn":
      c.learn(value);
      break;
    case "cl-assign": {
      const [slot, id] = value.split(":");
      c.assign(Number(slot), id);
      break;
    }
    case "cl-reset":
      c.resetSkills();
      break;
    case "cl-gear":
      c.craftGear(value as "body" | "core");
      break;
    case "cl-preset-save":
      c.preset(value, true);
      break;
    case "cl-preset-load":
      c.preset(value, false);
      break;
    case "cl-quest":
      c.claimQuest(Number(value));
      break;
  }
  return true;
}
