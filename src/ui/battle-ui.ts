import type { World } from "../core/world";
import {
  gearTemplates,
  rarities,
  skills,
  slotNames,
  statusInfo,
  weapons,
} from "../data/battle";
import { baseStats, EquipmentSystem } from "../combat/EquipmentSystem";
import type { GearSlot, SkillId, Stats } from "../combat/types";
export const statNames: Record<keyof Stats, string> = {
  hp: "최대 체력",
  energy: "최대 에너지",
  attack: "공격력",
  defense: "방어력",
  crit: "치명타 확률",
  critDamage: "치명타 배율",
  attackSpeed: "공격 속도",
  moveSpeed: "이동 속도",
  regen: "에너지 회복",
  statusResist: "상태 저항",
  elementResist: "속성 저항",
};
const fmt = (k: string, v: number) =>
  ["crit", "statusResist", "elementResist", "attackSpeed"].includes(k)
    ? `${Math.round(v * 100)}%`
    : k === "critDamage"
      ? `${v.toFixed(2)}×`
      : Number(v.toFixed(1)).toString();
export function battleControls(w: World) {
  const b = w.battle,
    c = w.combat;
  return `<div class="battle-quickbar"><div class="weapon-quick">${b.weaponSlots.map((id, i) => `<button data-action="weapon-switch" data-value="${i}" class="${b.activeSlot === i ? "selected" : ""}" ${id ? "" : "disabled"}><kbd>${i + 1}</kbd><span style="color:${id ? weapons[id].color : "#888"}">${id ? weapons[id].name : "빈 무기 슬롯"}</span></button>`).join("")}<span class="weapon-special"><kbd>J</kbd> 공격 <kbd>K</kbd> ${c.weapons.specialCooldown > 0 ? c.weapons.specialCooldown.toFixed(1) + "s" : "특수"}</span></div><div class="skill-quick">${b.skillSlots
    .map((id, i) => {
      const s = id ? skills[id] : null,
        locked = !!id && !b.unlockedSkills.includes(id) && !c.training,
        cd =
          id === "dash"
            ? w.player.dashCooldown
            : id
              ? (c.skills.cooldowns[id] ?? 0)
              : 0;
      return `<button data-action="cast" data-value="${i}" class="${locked ? "locked" : cd > 0 ? "cooldown" : s && w.player.energy < s.energy ? "insufficient" : ""}" title="${s?.description ?? "V에서 스킬 배치"}"><kbd>${["Q", "E", "R", "T"][i]}</kbd><b>${s?.icon ?? "·"}</b><span>${locked ? `Lv.${s!.level}` : cd > 0 ? cd.toFixed(1) + "s" : (s?.name ?? "빈 슬롯")}</span></button>`;
    })
    .join(
      "",
    )}<div class="dash-quick"><kbd>SHIFT</kbd><b>»</b><span>${w.player.dashCooldown > 0 ? w.player.dashCooldown.toFixed(1) + "s" : "회피"}</span></div></div><nav class="battle-menu"><button data-action="heal">H 회복 ${w.inventory.medkit ?? 0}</button><button data-action="inventory">I 보관함</button><button data-action="character">C 장비</button><button data-action="skills">V 스킬</button><button data-action="map">M 지도</button></nav></div>`;
}
export function battleHud(w: World) {
  const c = w.combat,
    boss = c.boss,
    e = boss.enemy;
  return `<div class="battle-status">${c.skills.shieldTime > 0 ? `<span>⬡ 보호막 ${c.skills.shieldTime.toFixed(1)}s · ${Math.ceil(c.skills.shield)}</span>` : ""}${c.playerStatuses.map((s) => `<span style="color:${statusInfo[s.id].color}">${statusInfo[s.id].icon} ${statusInfo[s.id].name} ${s.time.toFixed(1)}s</span>`).join("")}</div>${c.combo > 1 ? `<div class="combo-count ${c.combo >= 20 ? "high" : ""}"><b>${c.combo}</b> HIT<span>${c.combo >= 10 ? "CHAIN REACTION" : "COMBO"}</span></div>` : ""}${boss.active && e ? `<section class="boss-hud"><div><span>ANCIENT GUARDIAN</span><strong>EDEN TITAN</strong><b>${["AWAKENING", "CRYSTAL RAGE", "CORE OVERLOAD"][boss.phase]}</b></div><div class="boss-health"><i style="width:${(100 * e.hp) / e.maxHp}%"></i><em style="left:35%"></em><em style="left:70%"></em></div><p>${Math.ceil(e.hp).toLocaleString()} / ${e.maxHp.toLocaleString()} <span>${boss.coreOpen ? "◇ 코어 노출 · 피해 증가" : boss.stage === "prepare" ? "⚠ 공격 예고 · 위험 영역을 피하세요" : "회피 후 반격 기회를 노리세요"}</span></p>${e.statuses.map((s) => `<small>${statusInfo[s.id].icon} ${s.time.toFixed(1)}s</small>`).join("")}</section>` : ""}${boss.intro > 0 ? '<div class="boss-intro"><p>고대의 수호자가 깨어납니다</p><h2>EDEN TITAN</h2><button data-action="boss-skip">등장 연출 건너뛰기</button></div>' : ""}${boss.victory > 0 ? '<div class="boss-victory"><span>GUARDIAN DEFEATED</span><h2>에덴 타이탄 격파</h2><p>전리품을 회수하고 불시착 지점으로 돌아가세요.</p></div>' : ""}${c.training ? `<div class="training-hud"><b>전투 훈련장</b><span>${weapons[c.training.weapon].name} · ${c.training.hits} HIT · 누적 ${Math.round(c.training.damage)} DMG · ${Math.round(c.training.damage / Math.max(1, c.training.elapsed))} DPS</span><button data-action="character">C 무기 시험</button><button data-action="training-end">훈련 종료</button></div>` : ""}`;
}
export function characterPanel(w: World) {
  const base = baseStats(w.player.level),
    stats = w.stats,
    b = w.battle;
  return `<div class="character-summary"><span>EXPLORER · Lv.${w.player.level}</span><strong>${b.credits.toLocaleString()} CR</strong><span>${b.titles.join(" · ") || "칭호 없음"} · 발견 생명체 ${b.discovered.filter((id) => id !== "dummy" && id !== "titan").length}/10</span></div><div class="character-columns"><section class="stats-panel"><h3>능력치 <small>기본 + 장비</small></h3>${Object.entries(
    stats,
  )
    .map(
      ([k, v]) =>
        `<div><span>${statNames[k as keyof Stats]}</span><b>${fmt(k, base[k as keyof Stats])}<em> +${fmt(k, v - base[k as keyof Stats])}</em></b></div>`,
    )
    .join(
      "",
    )}<p>장착한 무기 슬롯의 능력치만 적용됩니다.</p></section><section class="equipment-panel"><h3>장착 장비</h3><div class="equipment-slots">${Object.entries(
    slotNames,
  )
    .map(([slot, name]) => {
      const gear = b.gear.find((g) => g.id === b.equipment[slot as GearSlot]);
      return `<div><small>${name}</small><span style="color:${gear ? rarities[gear.rarity].color : "#a3bdb6"}">${gear ? gearTemplates[gear.template].name : slot === "primary" ? weapons[b.weaponSlots[0]].name : slot === "secondary" ? (b.weaponSlots[1] ? weapons[b.weaponSlots[1]!].name : "비어 있음") : "비어 있음"}</span>${gear ? `<button data-action="unequip" data-value="${slot}">해제</button>` : ""}</div>`;
    })
    .join(
      "",
    )}</div></section></div><h3 class="panel-section-title">${w.combat.training ? "훈련용 무기 · 소유 여부와 무관하게 시험 가능" : "무기 보급 · 레벨에 따라 자동 해금"}</h3><div class="weapon-library">${Object.values(
    weapons,
  )
    .map((d) => {
      const unlocked = b.ownedWeapons.includes(d.id);
      return `<article><div><strong style="color:${d.color}">${d.name}</strong><small>${unlocked ? "보유" : `Lv.${d.level} 해금`}</small></div><p>${d.description}</p><small>${d.special}</small><div class="weapon-actions">${w.combat.training ? `<button data-action="trial" data-value="${d.id}">시험 사용</button>` : `<button data-action="loadout" data-value="0:${d.id}" ${unlocked ? "" : "disabled"}>1번 배치</button><button data-action="loadout" data-value="1:${d.id}" ${unlocked ? "" : "disabled"}>2번 배치</button>`}</div></article>`;
    })
    .join(
      "",
    )}</div><h3 class="panel-section-title">획득한 장비 · ${b.gear.length}개</h3><div class="gear-bag">${b.gear.length ? b.gear.map((g) => `<button data-action="gear" data-value="${g.id}"><b style="color:${rarities[g.rarity].color}">${gearTemplates[g.template].icon} ${gearTemplates[g.template].name} +${g.upgrade ?? 0} ${g.locked ? "♧" : ""}</b><small>${rarities[g.rarity].name} ${Object.values(b.equipment).includes(g.id) ? "· 장착 중" : ""}</small></button>`).join("") : '<p class="muted">생명체·엘리트·보급품에서 장비를 획득할 수 있습니다.</p>'}</div><div id="gear-detail"></div>`;
}
export function gearDetail(w: World, id: string, confirm = false) {
  const g = w.battle.gear.find((g) => g.id === id);
  if (!g) return "";
  const t = gearTemplates[g.template],
    delta = EquipmentSystem.compare(
      w.player.level,
      w.battle,
      id,
      t.weapon
        ? w.battle.activeSlot === 0
          ? "primary"
          : "secondary"
        : undefined,
    );
  return `<section class="gear-detail"><h3 style="color:${rarities[g.rarity].color}">${rarities[g.rarity].name} · ${t.name} +${g.upgrade ?? 0} ${g.locked ? "· 잠금" : ""}</h3><p>현재 장비와 비교 ${
    Object.entries(delta)
      .filter(([, v]) => v !== 0)
      .map(
        ([k, v]) =>
          `<span class="${v > 0 ? "positive" : "negative"}">${statNames[k as keyof Stats]} ${v > 0 ? "+" : ""}${fmt(k, v)}</span>`,
      )
      .join(" · ") || "동일한 능력치"
  }</p><div>${t.weapon ? `<button data-action="equip" data-value="primary:${id}">주무기 장착</button><button data-action="equip" data-value="secondary:${id}">보조 무기 장착</button>` : `<button data-action="equip" data-value="${t.slot}:${id}">장착</button>`}<button data-action="${confirm ? "sell-confirm" : "sell"}" data-value="${id}" ${g.locked || Object.values(w.battle.equipment).includes(id) ? "disabled" : ""}>${confirm ? "판매 확정 · 되돌릴 수 없음" : `판매 · ${Math.round(rarities[g.rarity].mult * 20)} CR`}</button></div></section>`;
}
export function skillsPanel(w: World) {
  return `<div class="skill-slot-overview">${w.battle.skillSlots.map((id, i) => `<div><kbd>${["Q", "E", "R", "T"][i]}</kbd> ${id ? skills[id].name : "빈 슬롯"}<button data-action="skill-clear" data-value="${i}">비우기</button></div>`).join("")}</div><div class="skill-library">${Object.entries(
    skills,
  )
    .map(([id, s]) => {
      const unlocked =
        w.battle.unlockedSkills.includes(id as SkillId) || !!w.combat.training;
      return `<article class="${unlocked ? "" : "locked"}"><span>${s.icon}</span><div><h3>${s.name}<small>Lv.${s.level}</small></h3><p>${s.description}</p><small>에너지 ${s.energy} · 재사용 ${s.cooldown}초</small><div>${["Q", "E", "R", "T"].map((key, i) => `<button data-action="skill-assign" data-value="${i}:${id}" ${unlocked ? "" : "disabled"}>${key} 배치</button>`).join("")}</div></div></article>`;
    })
    .join(
      "",
    )}</div><p class="muted">SHIFT는 항상 부스트 대시입니다. 스킬을 중복 배치하면 이전 슬롯과 교환합니다. 잠긴 스킬은 훈련장에서만 시험할 수 있습니다.</p>`;
}
