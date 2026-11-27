import { World } from "../core/world";
import { createEnemy } from "../combat/EnemyAI";
import { newBattle } from "../data/battle";
import { classIds, classes, classSkills, type ClassId } from "./catalog";
import { newClass } from "./types";
import type { RegionId } from "../data/content";
export function beginTrial(
  original: World,
  id: ClassId,
  mode: "trial" | "challenge" = "trial",
  tier = 1,
): World | null {
  if (
    !classIds.includes(id) ||
    original.classes.safeReason ||
    original.player.level < 10 ||
    ![1, 2, 3].includes(tier) ||
    original.player.level < [0, 10, 30, 60][tier]
  )
    return null;
  if (tier > 1 && original.classes.state.classId !== id) return null;
  const snapshot = original.snapshot(original.settings),
    w = new World();
  w.classes.trialReturn = snapshot;
  w.settings = { ...original.settings };
  w.player.level = [0, 10, 30, 60][tier];
  w.battle = newBattle(w.player.level);
  w.classes.state = newClass(w.player.level);
  Object.assign(w.classes.state, {
    classId: id,
    tier,
    highestTier: tier,
    path:
      tier > 1 ? (original.classes.state.path ?? classes[id].paths[0]) : null,
  });
  for (const d of Object.values(classSkills))
    if (
      d.classId === id &&
      d.tier <= tier &&
      (!d.path || d.path === w.classes.state.path)
    )
      w.classes.state.ranks[d.id] = 1;
  w.classes.state.slots = [0, 1, 2, 3].map((i) => `${id}_${i}`);
  w.battle.weaponSlots = [classes[id].weapons[0], "pulse"];
  w.enterRegion("forest", 420);
  w.player.facing = 1;
  w.player.hp = w.stats.hp;
  w.player.energy = w.stats.energy;
  w.player.invulnerable = 0;
  w.survival.state.scanner = true;
  w.inventory = { medkit: 2 };
  w.classes.state.gauge = 50;
  w.enemies = [
    createEnemy("slime", 700, 780, 70001),
    createEnemy("crawler", 1000, 780, 70002),
    createEnemy("slime", 1400, 780, 70003),
    createEnemy("drone", 1700, 650, 70004),
  ];
  for (const e of w.enemies)
    e.hp = e.maxHp = tier === 1 ? 280 : tier === 2 ? 650 : 1100;
  w.classes.trial = {
    classId: id,
    elapsed: 0,
    hits: 0,
    skills: [],
    defended: 0,
    distance: 0,
    scanned: false,
    kills: 0,
    startX: 420,
    grade: 0,
    targetHp: 100,
    mode,
    tier,
  };
  w.toast(
    "아카데미 체험 · 180초 · 3개 스킬 / 6회 명중 / 1기 격파 · V에서 목표와 종료",
  );
  return w;
}
export function finishTrial(trial: World): World | null {
  const save = trial.classes.trialReturn;
  if (!save) return null;
  const t = trial.classes.trial,
    rematch = trial.classes.rematch;
  const w = new World(save);
  w.classes.record("mentor");
  w.classes.record("trial");
  if (t && t.grade > 0 && t.elapsed <= 180 && !trial.dead) {
    const key =
      t.mode === "challenge"
        ? `${t.classId}_challenge`
        : t.tier === 1
          ? t.classId
          : `${t.classId}_tier${t.tier}`;
    const old = w.classes.state.trials[key] ?? 0;
    w.classes.state.trials[key] = Math.max(old, t.grade);
    if (t.grade > old) {
      const cid = w.classes.state.classId;
      w.classes.state.classId = t.classId;
      w.classes.awardMastery((t.grade - old) * 50);
      w.classes.state.classId = cid;
    }
    if (t.mode === "challenge") w.classes.record("challenge");
    w.toast(
      `${classes[t.classId].name} 시험 통과 · ${["", "BRONZE", "SILVER", "GOLD", "PLATINUM"][t.grade]}`,
    );
  } else if (rematch && rematch.enemy.hp <= 0) {
    if (!w.classes.state.records.includes("rematch")) {
      w.classes.awardMastery(200);
      w.survival.state.researchPoints += 5;
    }
    w.classes.record("rematch");
    w.toast("보스 재도전 성공 · 스토리 전리품은 원본에 반입되지 않습니다.");
  } else w.toast("체험 종료 · 원래 캐릭터와 장비를 복원했습니다.");
  return w;
}
export const rematches = [
  ["titan", "EDEN TITAN", "valley"],
  ["sentinel", "ABYSS SENTINEL", "abyss"],
  ["colossus", "DUNE COLOSSUS", "aresFoundry"],
  ["leviathan", "GLACIAL LEVIATHAN", "frostiaRuins"],
  ["helios", "HELIOS DESTROYER", "infernoRuins"],
  ["emperor", "ABYSSAL EMPEROR", "aquariaRuins"],
  ["archon", "VOID ARCHON", "lunarisRuins"],
] as const;
export function canRematch(w: World, id: string) {
  return id === "titan"
    ? w.battle.bossKills > 0
    : id === "sentinel"
      ? w.survival.state.sentinelKills > 0
      : id === "colossus"
        ? !!w.progress.counters.colossusKill
        : !!w.extreme.state.kills[id];
}
export function beginRematch(original: World, id: string, difficulty: number) {
  const row = rematches.find((r) => r[0] === id);
  if (
    !row ||
    !canRematch(original, id) ||
    original.classes.safeReason ||
    ![0, 1, 2].includes(difficulty)
  )
    return null;
  const saved = original.snapshot(original.settings),
    w = new World(saved);
  w.classes.trialReturn = saved;
  w.enterRegion(row[2] as RegionId, 4000);
  w.enemies = [];
  if (id === "titan") w.combat.boss.start();
  else if (id === "sentinel") w.survival.sentinel.start();
  else if (id === "colossus") w.space.combat.start();
  else {
    for (let i = 0; i < 3; i++) w.progress.counters[`gravity_${i}`] = 1;
    w.extreme.combat.start(id);
    if (id === "emperor") w.player.y = 1950;
  }
  const enemy =
    w.combat.boss.enemy ??
    w.survival.sentinel.enemy ??
    w.space.combat.boss ??
    w.extreme.combat.boss;
  if (!enemy) return null;
  enemy.hp *= 1 + difficulty * 0.25;
  enemy.maxHp = enemy.hp;
  w.classes.rematch = { enemy, difficulty, elapsed: 0, pulse: 6 };
  w.player.hp = w.stats.hp;
  w.player.energy = w.stats.energy;
  return w;
}
