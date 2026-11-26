import { colonyPanel } from "./colony-ui";
import {
  survivalHud,
  survivalHub,
  environmentPanel,
  inventoryToolbar,
  filterInventory,
  mapEnvironment,
  type HubTab,
} from "./survival-ui";
import { ResourceSystem } from "../survival/DiscoverySystem";
import type { World } from "../core/world";
import {
  items,
  questData,
  regionOrder,
  regions,
  type ItemId,
} from "../data/content";
import { maxHp, xpRequired } from "../physics/movement";
import { inventorySlots, occupiedSlots } from "../systems/inventory";
import type { Settings } from "../core/types";
import { ko } from "./strings";
import {
  statNames,
  battleControls,
  battleHud,
  characterPanel,
  skillsPanel,
  gearDetail,
} from "./battle-ui";
import { gearTemplates, rarities } from "../data/battle";
export type Modal =
  | "colony"
  | "hub"
  | "character"
  | "skills"
  | "pause"
  | "settings"
  | "controls"
  | "credits"
  | "inventory"
  | "map"
  | "confirm"
  | "ending"
  | null;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const portrait =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#304b60" d="M8 64V50Q8 34 32 34T56 50V64Z"/><path fill="#b7d2ce" d="M16 64V48Q32 37 48 48V64Z"/><rect x="24" y="48" width="17" height="9" rx="2" fill="#274b5f"/><rect x="27" y="50" width="11" height="3" fill="#9de7d7"/><ellipse cx="32" cy="27" rx="22" ry="23" fill="#d1e1d7"/><path d="M20 13Q49 7 50 26Q51 42 28 42Q19 40 19 30Z" fill="#244c65"/><path d="M25 16Q40 11 45 19L42 24L24 25Z" fill="#73afb9"/><rect x="9" y="22" width="7" height="12" rx="3" fill="#7ca4ad"/></svg>';
export class Interface {
  root: HTMLElement;
  hud: HTMLElement;
  screen: HTMLElement;
  dialog: HTMLElement;
  toasts: HTMLElement;
  action: (name: string, value?: string) => void = () => {};
  setting: (key: string, value: string) => void = () => {};
  modal: Modal = null;
  hubTab: HubTab = "facilities";
  recipe = "medicalGel";
  quantity = 1;
  private previousFocus: HTMLElement | null = null;
  private lastHud = "";
  constructor() {
    this.root = document.querySelector("#ui")!;
    this.root.innerHTML =
      '<div id="hud" hidden></div><div id="screen"></div><div id="dialog-layer" hidden></div><div id="toasts" role="status" aria-live="polite"></div>';
    this.hud = this.root.querySelector("#hud")!;
    this.screen = this.root.querySelector("#screen")!;
    this.dialog = this.root.querySelector("#dialog-layer")!;
    this.toasts = this.root.querySelector("#toasts")!;
    this.root.addEventListener("click", (event) => {
      const b = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-action]",
      );
      if (b && !b.disabled) {
        b.blur();
        this.action(b.dataset.action!, b.dataset.value);
      }
    });
    this.root.addEventListener("input", (event) => {
      const el = event.target as HTMLInputElement;
      if (el.dataset.filter) filterInventory(this.dialog);
      if (el.dataset.setting) this.setting(el.dataset.setting, el.value);
    });
    window.addEventListener("keydown", (e) => {
      if (e.code !== "Tab" || !this.modal) return;
      e.preventDefault();
      const buttons = Array.from(
        this.dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select",
        ),
      );
      const i = buttons.indexOf(document.activeElement as HTMLElement);
      buttons[
        (i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
    });
  }
  title(canContinue: boolean, error = "") {
    this.hud.hidden = true;
    this.screen.hidden = false;
    this.close();
    this.screen.innerHTML = `<section class="title-screen"><div class="brand-top"><span class="orbit-mark">✧</span> INTERSTELLAR EXPLORATION PROGRAM <span class="phase-tag">PHASE 04</span></div><div class="title-copy"><p class="eyebrow">COLONY RISING</p><h1>ASTRO<span>TOPIA</span></h1><p class="tagline">FROM SURVIVOR TO PIONEER.</p><p class="title-description">낯선 별에 남기는, 당신의 첫 번째 발자국.<br>아무도 기록하지 않은 세계가 기다립니다.</p></div><nav class="main-menu" aria-label="메인 메뉴"><button class="primary start" data-action="new"><span class="button-glyph">✦</span>${ko.newGame}<span class="button-end">NEW EXPEDITION</span></button><button class="continue" data-action="continue" ${canContinue ? "" : "disabled"}><span class="button-glyph">⌁</span>${ko.continue}<span class="button-end">${canContinue ? "RESUME EXPEDITION" : "저장된 탐험 없음"}</span></button><div class="menu-links"><button data-action="settings">${ko.settings}</button><span></span><button data-action="controls">${ko.controls}</button><span></span><button data-action="credits">${ko.credits}</button></div></nav><div class="planet-label"><span class="crosshair">+</span><p>DESTINATION 001</p><h2>EDEN</h2><div>미탐사 생명체 행성</div><dl><dt>중력</dt><dd>0.9 G</dd><dt>대기</dt><dd>호흡 가능</dd></dl></div><footer class="title-footer"><span><i></i> EXPLORATION SYSTEMS ONLINE</span><span>2478 CE <b> / </b> PROJECT ASTROTOPIA</span><span>키보드 · PC 브라우저 권장</span></footer>${error ? `<p class="storage-error">${escape(error)}</p>` : ""}</section>`;
  }
  game() {
    this.screen.hidden = true;
    this.hud.hidden = false;
    this.lastHud = "";
    this.close();
  }
  opening(step: number, heading: string, text: string) {
    this.hud.hidden = true;
    this.screen.hidden = false;
    this.screen.innerHTML = `<div class="opening-screen"><p class="opening-index">FLIGHT RECORDER · ${String(step + 1).padStart(2, "0")} / 08</p><div class="opening-copy"><p class="eyebrow">${heading}</p><h2>${text}</h2><div class="story-progress">${Array.from({ length: 8 }, (_, i) => `<i class="${i <= step ? "active" : ""}"></i>`).join("")}</div></div><button class="skip" data-action="skip">오프닝 건너뛰기 <kbd>SPACE</kbd></button></div>`;
  }
  update(w: World) {
    if (this.hud.hidden) return;
    const p = w.player,
      q = questData[w.progress.quest],
      hp = Math.max(0, (p.hp / w.stats.hp) * 100),
      xp = p.level === 15 ? 100 : (p.xp / xpRequired(p.level)) * 100;
    const nearby = w.nearby();
    const html = `<div class="player-panel glass"><div class="portrait">${portrait}<span>${p.level}</span></div><div class="vitals"><div class="player-heading">EXPLORER <small>탐험가</small></div><div class="stat-line"><span>HP</span><div class="bar health"><i style="width:${hp}%"></i></div><b>${Math.ceil(p.hp)}<small> / ${w.stats.hp}</small></b></div><div class="stat-line"><span>EN</span><div class="bar energy"><i style="width:${(100 * p.energy) / w.stats.energy}%"></i></div><b>${Math.floor(p.energy)}<small> / ${Math.round(w.stats.energy)}</small></b></div></div></div><div class="location glass"><div class="location-top"><span>✧ EDEN</span><button aria-label="일시정지" title="일시정지 (ESC)" data-action="pause">Ⅱ</button></div><strong>${w.combat.zone.name}</strong><small>${w.map.en}</small><div class="environment"><span>0.9 G</span><span>Lv.${w.combat.zone.level} · O₂</span></div><button class="minimap" aria-label="지역 지도 열기" data-action="map">${this.minimap(w)}<span>M · 지역 지도</span></button></div><aside class="quest-panel"><p class="eyebrow">${q ? `MISSION ${String(w.progress.quest + 1).padStart(2, "0")}` : "EXPEDITION LOG"}</p><h3>${q ? q.name : "계속되는 모험"}</h3>${
      q
        ? `<p>${q.story}</p><ul>${q.goals
            .map(([id, label, n]) => {
              const v = Math.min(n, w.progress.counters[id] ?? 0);
              return `<li class="${v >= n ? "complete" : ""}"><span>${v >= n ? "✓" : "◇"} ${label}</span><b>${v} / ${n}</b></li>`;
            })
            .join("")}</ul>`
        : "<p>고대의 신호를 기록했습니다.<br>EDEN을 자유롭게 탐험하세요.</p>"
    }</aside><div class="bottom-hud">${battleControls(w)}<div class="experience"><span>LV. ${p.level}</span><div><i style="width:${xp}%"></i></div><span>${p.level === 15 ? "MAX LEVEL" : `${p.xp} / ${xpRequired(p.level)} XP`}</span></div></div><div class="world-hint">${w.region === "crash" && !w.progress.counters.move ? "<kbd>A</kbd><kbd>D</kbd> 이동 <span>·</span> <kbd>SPACE</kbd> 점프" : w.region === "valley" ? "협곡 주의 · 점프 중 SHIFT로 긴 거리를 건너세요." : ""}</div>${nearby ? `<div class="interaction" style="left:${Math.max(110, Math.min(1170, nearby.x - w.camera.x))}px;top:${Math.max(150, Math.min(590, nearby.y - w.camera.y - 110))}px"><kbd>F</kbd> ${w.mining ? "채집 중…" : nearby.label}</div>` : ""}${w.regionNotice > 0 ? `<div class="region-notice"><span>PLANET EDEN / REGION 0${regionOrder.indexOf(w.region) + 1}</span><h2>${w.map.name}</h2><p>${w.map.subtitle}</p></div>` : ""}${w.dead > 0 ? '<div class="death-screen"><p class="eyebrow">EXPLORATION INTERRUPTED</p><h2>탐험 신호가 끊어졌습니다</h2><p>회복 지점으로 귀환 중 · 자원과 경험치 유지</p></div>' : ""}`;
    const finalHtml = html + battleHud(w) + survivalHud(w);
    if (this.lastHud !== finalHtml) {
      this.hud.innerHTML = finalHtml;
      this.lastHud = finalHtml;
    }
  }
  minimap(w: World) {
    return `<svg viewBox="0 0 260 65" aria-hidden="true">${w.map.platforms.map((p) => `<rect x="${(p.x / w.map.width) * 260}" y="${(p.y / 1000) * 58}" width="${(p.w / w.map.width) * 260}" height="${p.oneWay ? 2 : 6}" fill="#80b9ab" opacity=".65"/>`).join("")}${w.map.landmarks.map((l) => `<circle cx="${(l.x / w.map.width) * 260}" cy="${(l.y / 1000) * 58 - 4}" r="2" fill="#d5c994"/>`).join("")}<circle cx="${(w.player.x / w.map.width) * 260}" cy="${(w.player.y / 1000) * 58}" r="3" fill="#f0f6d7"/></svg>`;
  }
  open(modal: Exclude<Modal, null>, w: World | null, s: Settings) {
    if (!this.modal) this.previousFocus = document.activeElement as HTMLElement;
    this.modal = modal;
    this.dialog.hidden = false;
    let heading = "",
      eyebrow = "",
      content = "";
    if (modal === "pause") {
      heading = "잠시, 숨을 고르세요";
      eyebrow = "EXPEDITION PAUSED";
      content =
        '<p class="muted">이곳의 시간은 잠시 멈춥니다.</p><div class="vertical-actions"><button class="primary" data-action="close">탐험 계속하기</button><button data-action="save">진행 상황 저장</button><button data-action="settings">설정</button><button data-action="controls">조작 방법</button><button data-action="title">저장 후 타이틀로</button></div>';
    }
    if (modal === "settings") {
      heading = "탐험 환경 설정";
      eyebrow = "SYSTEM CONFIGURATION";
      content = `<div class="settings-grid"><label for="music">배경음</label><input id="music" aria-label="배경음" type="range" min="0" max="1" step="0.05" value="${s.music}" data-setting="music"><label for="sfx">효과음</label><input id="sfx" aria-label="효과음" type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-setting="sfx"><label for="effects">그래픽 효과</label><select id="effects" data-setting="effects"><option value="high" ${s.effects === "high" ? "selected" : ""}>높음</option><option value="low" ${s.effects === "low" ? "selected" : ""}>낮음 · 입자 및 전경 감소</option></select></div><button class="wide" data-action="fullscreen">전체 화면 전환</button><p class="muted">설정은 자동으로 이 브라우저에 저장됩니다.</p>`;
    }
    if (modal === "colony" && w) {
      heading = "기지 관제 센터";
      eyebrow = "COLONY COMMAND CENTER";
      content = colonyPanel(w);
    }
    if (modal === "hub" && w) {
      heading = "개척자의 작업실";
      eyebrow = "SURVIVAL & TECHNOLOGY";
      content = survivalHub(w, this.hubTab, this.recipe, this.quantity);
    }
    if (modal === "character" && w) {
      heading = "탐험가 · 장비와 성장";
      eyebrow = "EXPLORER LOADOUT";
      content = characterPanel(w) + environmentPanel(w);
    }
    if (modal === "skills" && w) {
      heading = "스킬 관리";
      eyebrow = "COMBAT PROTOCOLS";
      content = skillsPanel(w);
    }
    if (modal === "pause" && w?.combat.boss.active)
      content +=
        '<button class="wide" data-action="boss-leave">보스 전투 이탈 · 재도전 가능</button>';
    if (modal === "settings")
      content = content.replace(
        '<button class="wide" data-action="fullscreen">',
        `<div class="settings-grid"><label for="shake">화면 흔들림</label><input id="shake" data-setting="shake" type="range" min="0" max="1" step=".1" value="${s.shake}"><label for="damageNumbers">피해 숫자</label><select id="damageNumbers" data-setting="damageNumbers"><option value="true" ${s.damageNumbers ? "selected" : ""}>표시</option><option value="false" ${!s.damageNumbers ? "selected" : ""}>숨김</option></select><label for="difficulty">난이도</label><select id="difficulty" data-setting="difficulty"><option value="explorer" ${s.difficulty === "explorer" ? "selected" : ""}>탐험가</option><option value="normal" ${s.difficulty === "normal" ? "selected" : ""}>일반</option><option value="veteran" ${s.difficulty === "veteran" ? "selected" : ""}>베테랑</option></select></div><button class="wide" data-action="fullscreen">`,
      );
    if (modal === "controls") {
      heading = "탐험가의 기본 조작";
      eyebrow = "EXPLORER FIELD GUIDE";
      content = `<div class="controls-grid">${ko.controlsList.map(([key, label]) => `<kbd>${key}</kbd><span>${label}</span>`).join("")}</div><p class="muted">움직임으로 채집을 취소할 수 있습니다. 회복 지점에서 F를 누르면 체력이 회복되고 귀환 위치가 기록됩니다.</p>`;
    }
    if (modal === "credits") {
      heading = "작은 발자국에서 시작된 세계";
      eyebrow = "PROJECT ASTROTOPIA";
      content =
        '<p>기획 · ASTROTOPIA</p><p>게임 엔진 · Phaser 3<br>개발 · TypeScript / Vite<br>아트 · 자체 제작 절차적 벡터 그래픽<br>사운드 · Web Audio 합성</p><p class="muted">외부 상용 게임의 이미지, 캐릭터, 음악을 사용하지 않았습니다.<br>THE FIRST LANDING · DEVELOPMENT PHASE 02</p>';
    }
    if (modal === "confirm") {
      heading = "새로운 모험을 시작할까요?";
      eyebrow = "NEW EXPEDITION";
      content =
        '<p>현재 브라우저에 저장된 탐험 기록을 덮어씁니다.</p><div class="confirm-actions"><button data-action="close">돌아가기</button><button class="primary" data-action="start-confirmed">새로운 모험 시작</button></div>';
    }
    if (modal === "ending") {
      heading = "오래된 별의 새로운 비밀";
      eyebrow = "THE FIRST LANDING · COMPLETE";
      content =
        '<div class="ending-glyph">◇</div><blockquote>“이 행성에는 우리가 생각했던 것보다<br>훨씬 오래된 비밀이 존재한다.”</blockquote><p class="muted">고대의 문 너머로 희미한 에너지 신호가 흐릅니다.<br>첫 번째 탐험 기록이 완성되었습니다. 자유 탐험을 계속할 수 있습니다.</p><button class="primary wide" data-action="close">EDEN 탐험 계속하기</button>';
    }
    if (modal === "ending" && w && w.progress.quest >= 10) {
      heading = "새로운 개척의 시작";
      eyebrow = "BATTLE EVOLUTION · COMPLETE";
      content =
        '<div class="ending-glyph">✦</div><blockquote>수호자의 코어에서 새로운 가능성을 발견했다.</blockquote><p>고대 문명의 에너지 변환 데이터를 확보했습니다. 정제·제작·생존 프로토콜을 구축할 차례입니다.</p><button class="primary wide" data-action="close">탐험 계속하기</button>';
    }
    if (modal === "ending" && w && w.progress.quest >= 18) {
      heading = "개척의 가능성";
      eyebrow = "COLONY RISING · COMPLETE";
      content =
        '<div class="ending-glyph">⌬</div><blockquote>이제 우리는 단순한 생존자가 아니다. 이 세계에 새로운 문명을 건설할 준비가 되었다.</blockquote><p>기지 건설 설계도를 확보했습니다. B로 건설 모드를 열고 O에서 기지를 관리하세요.</p><button class="primary wide" data-action="close">탐험 계속하기</button>';
    }
    if (modal === "ending" && w && w.progress.quest >= 28) {
      heading = "첫 번째 집, 다음 세계";
      eyebrow = "COLONY RISING / COMPLETE";
      content =
        '<div class="ending-glyph">⌬</div><blockquote>우리는 이 세계에 첫 번째 집을 세웠다.<br>이제 별들 사이의 다음 세계가 우리를 기다린다.</blockquote><p>우주선 수리 준비와 성계 항법 연구를 완료했습니다. 실제 발사는 다음 단계에서 이어집니다.</p><button class="primary wide" data-action="close">기지 운영 계속하기</button>';
    }
    if (modal === "inventory" && w) {
      heading = "탐험가의 보관함";
      eyebrow = `EXPLORER INVENTORY · ${occupiedSlots(w.inventory) + w.battle.gear.length} / ${w.survival.state.capacity}`;
      const slots = inventorySlots(w.inventory);
      content = `${inventoryToolbar()}<div class="inventory-grid">${Array.from(
        { length: w.survival.state.capacity },
        (_, i) => {
          const slot = slots[i];
          if (!slot) {
            const gear = w.battle.gear[i - slots.length];
            if (gear)
              return `<button class="item-slot filterable" data-name="${gearTemplates[gear.template].name}" data-type="${gearTemplates[gear.template].weapon ? "무기" : "방어구"}" data-rarity="${rarities[gear.rarity].mult}" data-action="gear-open" data-value="${gear.id}"><span class="item-icon" style="color:${rarities[gear.rarity].color}">${gearTemplates[gear.template].icon}</span><span class="item-name">${gearTemplates[gear.template].name}</span></button>`;
            return '<div class="item-slot empty"></div>';
          }
          const item = items[slot.id];
          return `<button class="item-slot filterable" data-name="${item.name}" data-type="${item.type}" data-count="${slot.count}" data-rarity="${ResourceSystem.info(slot.id).rarity}" data-action="item" data-value="${slot.id}" aria-label="${item.name} ${slot.count}개"><span class="item-icon" style="color:${item.color}">${item.icon}</span><span class="item-name">${item.name}</span><b>${slot.count}</b></button>`;
        },
      ).join(
        "",
      )}</div><div id="item-detail" class="item-detail"><span>아이템을 선택하면 정보를 볼 수 있습니다.</span><small>동일 자원은 99개씩 중첩됩니다.</small></div><p class="muted">장비를 선택하거나 C를 누르면 착용·비교·판매할 수 있습니다.</p>`;
    }
    if (modal === "map" && w) {
      heading = "EDEN 탐사 지도";
      eyebrow = "PLANETARY SURVEY · 0.9 G";
      content = `<div class="map-regions">${regionOrder.map((id, i) => `<div class="map-region ${w.region === id ? "current" : ""} ${!w.progress.discovered.includes(id) ? "unexplored" : ""}"><span>REGION 0${i + 1}</span><div class="map-illustration ${id}">${id === "crash" ? "⌁" : id === "forest" ? "❧" : "◇"}</div><h3>${regions[id].name}</h3><small>${w.region === id ? "현재 위치" : w.progress.discovered.includes(id) ? "탐사 완료" : "미탐사"}</small></div>`).join('<div class="map-connector">···</div>')}</div><div class="large-map">${this.minimap(w)}</div><p class="muted">기존 세 지역은 좌우 경계, 신규 구역은 F 연결 표지로 이동합니다.<br>밝은 점: 탐험가 · 금색 점: 조사 및 회복 지점 · 선: 지형과 발판</p>`;
    }
    if (modal === "map" && w) content += mapEnvironment(w);
    if (modal === "pause" && w?.survival.sentinel.active)
      content +=
        '<button data-action="sentinel-leave">파수꾼 전투 이탈</button>';
    this.dialog.innerHTML = `<section class="modal ${modal === "colony" || modal === "hub" || modal === "inventory" || modal === "map" || modal === "character" || modal === "skills" ? "large" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><button class="close" data-action="close" aria-label="닫기">×</button><p class="eyebrow">${eyebrow}</p><h2 id="modal-heading">${heading}</h2>${content}</section>`;
    this.screen.inert = true;
    this.hud.inert = true;
    this.dialog
      .querySelector<HTMLElement>(
        modal === "confirm" ? '[data-action="close"]' : "button,input,select",
      )
      ?.focus();
  }
  gear(w: World, id: string, confirm = false) {
    const el = this.dialog.querySelector("#gear-detail");
    if (el) {
      const g = w.battle.gear.find((g) => g.id === id),
        p = w.survival.upgrade.preview(id);
      el.innerHTML =
        gearDetail(w, id, confirm) +
        (g && p
          ? `<div class="upgrade-detail"><button data-action="gear-lock" data-value="${id}">${g.locked ? "잠금 해제" : "장비 잠금 · 분해 방지"}</button><h4>확정 강화 +${p.level} → +${Math.min(5, p.level + 1)}</h4><p>${Object.entries(
              p.after,
            )
              .filter(([k, v]) => v !== (p.before as Record<string, number>)[k])
              .map(
                ([k, v]) =>
                  `${statNames[k as keyof typeof statNames]} ${(p.before as Record<string, number>)[k]?.toFixed(2)} → ${Number(v).toFixed(2)}`,
              )
              .join(
                " · ",
              )}</p><small>철괴 ${p.cost.ironBar} · 정제 에너지 셀 ${p.cost.refinedCell} · ${p.credits} CR · 실패/파괴 없음</small><button data-action="gear-upgrade" data-value="${id}" ${p.level >= 5 || !w.survival.inBase || !w.survival.state.technologies.includes("upgrade") ? "disabled" : ""}>강화 실행</button><small>기지 장비 작업소와 장비 강화 연구가 필요합니다.</small></div>`
          : "");
      el.scrollIntoView({ block: "nearest" });
    }
  }
  detail(id: ItemId) {
    const el = this.dialog.querySelector("#item-detail");
    if (!el) return;
    const item = items[id];
    el.innerHTML = `<div><strong>${item.name}</strong><small>${item.type}</small></div><p>${item.description}</p>${["medicalGel", "energyCell", "oxygenCan", "antitoxin", "purifier", "portableBeacon", "recall"].includes(id) ? `<button data-action="consume" data-value="${id}">사용</button><div>${[0, 1, 2].map((i) => `<button data-action="quick-assign" data-value="${i}:${id}">${i + 3}번 슬롯 배치</button>`).join("")}</div>` : ""}${id === "medkit" ? '<button data-action="heal">사용 · 체력 50 회복</button>' : ""}`;
  }
  close() {
    this.modal = null;
    this.dialog.hidden = true;
    this.dialog.innerHTML = "";
    this.screen.inert = false;
    this.hud.inert = false;
    this.previousFocus?.focus();
    this.previousFocus = null;
  }
  toast(text: string) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    this.toasts.append(el);
    while (this.toasts.children.length > 4)
      this.toasts.firstElementChild?.remove();
    setTimeout(() => el.remove(), 4500);
  }
}
