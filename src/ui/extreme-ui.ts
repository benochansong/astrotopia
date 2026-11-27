import type { World } from "../core/world";
import { planetIds, type PlanetId } from "../space/catalog";
import { environmentGear } from "../survival/catalog";
import { items, type ItemId } from "../data/content";
import { exploration } from "../extreme/progress";
const btn = (name: string, action: string, value = "") =>
  '<button data-action="ext-' +
  action +
  '" data-value="' +
  value +
  '">' +
  name +
  "</button>";
export function extremePanel(w: World) {
  const v = w.extreme.state.vehicle;
  return (
    '<h3>탐험 진행도</h3><p>기지 건설률과 별도로 지역·자원·생명체·보스·기록을 집계합니다. 100%는 다음 행성 진입 조건이 아닙니다.</p><div class="space-grid">' +
    planetIds
      .map((id) => {
        const p = exploration(w, id);
        return (
          "<article><h4>" +
          id.toUpperCase() +
          " · " +
          p.percent +
          '%</h4><progress max="100" value="' +
          p.percent +
          '"></progress><p>지역 ' +
          p.found +
          "/" +
          p.regions +
          " · 자원 " +
          p.known +
          "/" +
          p.resources +
          " · 생명체 " +
          p.seen +
          "/" +
          p.creatures +
          " · 보스 " +
          (p.boss ? "완료" : "미완료") +
          " · 기록 " +
          (p.archive ? "확보" : "미확보") +
          "</p>" +
          btn(
            w.progress.counters["surveyReward_" + id]
              ? "보상 수령 완료"
              : "100% 보상 수령",
            "survey",
            id,
          ) +
          "</article>"
        );
      })
      .join("") +
    '</div><h3>환경 대응 프리셋</h3><p>안전한 기지·우주선에서만 적용됩니다. 보유 중인 환경·전투 장비와 무기 슬롯을 장착하며 위험도나 산소를 초기화하지 않습니다.</p><div class="space-grid">' +
    planetIds
      .map(
        (id) =>
          "<article><h4>" +
          id.toUpperCase() +
          "</h4><p>" +
          (w.extreme.state.presets[id]
            ?.map((g) => environmentGear[g].name)
            .join(" · ") ?? "저장된 구성 없음") +
          (w.extreme.state.combatPresets?.[id]
            ? " · 전투 장비 " +
              Object.keys(w.extreme.state.combatPresets[id]!.equipment).length +
              "칸"
            : "") +
          "</p>" +
          btn("현재 구성 저장", "preset-save", id) +
          btn("구성 적용", "preset-load", id) +
          "</article>",
      )
      .join("") +
    "</div><h3>HORIZON · 중형 개척선</h3><p>빙하의 거수 처치 + 극한 온도 공학 · 극저온 합금 4 + 초전도 회로 2 + 고급 배터리 2 + 티타늄괴 4. 화물 320칸, INFERNO 이후의 선체·항해 지원.</p>" +
    btn(
      w.extreme.state.horizon
        ? "HORIZON 업그레이드 완료"
        : "HORIZON 업그레이드",
      "horizon",
    ) +
    btn("에너지 셀 1 → 추진 +50%", "jet-charge") +
    "<h3>탐험 차량 · Z 승하차</h3><p>활성 차량 1대 · 적재 20칸. 정지·파손 시 도보 탐험 및 기지 회수가 가능합니다. 구역 이동 시 자동 주차됩니다.</p>" +
    (v
      ? "<p>" +
        v.kind.toUpperCase() +
        " · " +
        v.region +
        " · 내구 " +
        Math.round(v.hp) +
        "% · 에너지 " +
        Math.round(v.energy) +
        "%</p>" +
        btn("승하차", "vehicle-toggle") +
        btn("기지로 회수", "vehicle-recover") +
        btn("배터리 1 + 철괴 2 정비", "vehicle-service") +
        btn("빈 차량 해체 (재료 반환 없음)", "vehicle-dismantle") +
        '<div class="space-grid"><article><h4>가방 → 차량 (1개)</h4>' +
        Object.entries(w.inventory)
          .filter(([, n]) => n)
          .map(([id]) => btn(items[id as ItemId].name, "vehicle-in", id))
          .join("") +
        "</article><article><h4>차량 → 가방 (1개)</h4>" +
        Object.entries(v.cargo)
          .map(([id, n]) =>
            btn(items[id as ItemId].name + " ×" + n, "vehicle-out", id),
          )
          .join("") +
        "</article></div>"
      : "<p>로버: 극저온 합금 4 + 엔진 부품 2 + 고급 배터리 2. 잠수정: 고압 합금 4 + 수중 추진 모듈 2 + 고급 배터리 2.</p>" +
        btn("지상 로버 제작", "vehicle-create", "rover") +
        btn("심해 탐사정 제작", "vehicle-create", "pod")) +
    "<h3>GENESIS 기록</h3><p>" +
    w.extreme.state.archives.map((id) => id.toUpperCase()).join(" · ") +
    "</p><p>" +
    (w.progress.counters.genesis
      ? "우리는 아직 끝나지 않았다. OMEGA 좌표 확인 · 착륙은 후속 단계에서 해금됩니다."
      : "네 고대 기록과 공허의 코어가 다음 항로를 가리킵니다.") +
    "</p>"
  );
}
export function extremeAction(w: World, action: string, value = "") {
  if (!action.startsWith("ext-")) return false;
  let ok = false;
  if (action === "ext-jet-charge") ok = w.extreme.rechargeJet();
  if (action === "ext-horizon") ok = w.extreme.upgradeHorizon();
  if (action === "ext-preset-save" || action === "ext-preset-load")
    ok = w.extreme.preset(value as PlanetId, action === "ext-preset-save");
  if (action === "ext-vehicle-create")
    ok = w.extreme.vehicles.create(value as "rover" | "pod");
  if (action === "ext-vehicle-toggle") ok = w.extreme.vehicles.toggle();
  if (action === "ext-vehicle-recover") ok = w.extreme.vehicles.recover();
  if (action === "ext-vehicle-dismantle") ok = w.extreme.vehicles.dismantle();
  if (action === "ext-vehicle-service") ok = w.extreme.vehicles.service();
  if (action === "ext-vehicle-in" || action === "ext-vehicle-out")
    ok = w.extreme.vehicles.transfer(
      value as ItemId,
      action === "ext-vehicle-in",
    );
  if (
    action === "ext-survey" &&
    planetIds.includes(value as PlanetId) &&
    exploration(w, value as PlanetId).percent === 100 &&
    !w.progress.counters["surveyReward_" + value]
  ) {
    w.space.once("surveyReward_" + value);
    w.survival.state.researchPoints += 15;
    w.battle.credits += 3000;
    w.emit("save", "survey");
    ok = true;
  }
  w.toast(
    ok
      ? "탐험 관리 작업을 완료했습니다."
      : "안전 지역·연구·재료·보유 장비·탐험 조건을 확인하세요.",
  );
  return true;
}
