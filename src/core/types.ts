import type { EnemyKind, ItemId, RegionId } from "../data/content";
import type {
  BattleSave,
  Element,
  EliteAffix,
  Status,
  StatusId,
} from "../combat/types";
export type Animation =
  | "Idle"
  | "Walk"
  | "Run"
  | "Jump"
  | "Fall"
  | "Land"
  | "Dash"
  | "Attack"
  | "Hit"
  | "Mining"
  | "Death";
export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: number;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  drop: number;
  dash: number;
  dashCooldown: number;
  shotCooldown: number;
  invulnerable: number;
  hp: number;
  energy: number;
  level: number;
  xp: number;
  animation: Animation;
  animationTime: number;
}
export interface Settings {
  music: number;
  sfx: number;
  effects: "high" | "low";
  shake: number;
  damageNumbers: boolean;
  difficulty: "explorer" | "normal" | "veteran";
}
export interface Progress {
  counters: Record<string, number>;
  quest: number;
  discovered: RegionId[];
  opened: string[];
  checkpoint: { region: RegionId; x: number };
}
export interface SaveData {
  version: 2;
  battle: BattleSave;
  savedAt: number;
  region: RegionId;
  x: number;
  y: number;
  level: number;
  xp: number;
  hp: number;
  energy: number;
  inventory: Partial<Record<ItemId, number>>;
  progress: Progress;
  settings: Settings;
}
export type EnemyState =
  | "Alert"
  | "PrepareAttack"
  | "Recover"
  | "Retreat"
  | "Idle"
  | "Patrol"
  | "Detect"
  | "Chase"
  | "Attack"
  | "Hit"
  | "Return"
  | "Death";
export interface Enemy {
  maxHp: number;
  statuses: Status[];
  elite?: EliteAffix;
  ccImmunity: number;
  staggerGuard?: number;
  flash: number;
  shield: number;
  regenBudget: number;
  action: number;
  launched: number;
  noLoot?: boolean;
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  hp: number;
  state: EnemyState;
  timer: number;
  facing: number;
  attackX: number;
  attackY: number;
}
export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
export interface Bullet {
  vy?: number;
  radius?: number;
  element?: Element;
  pierce?: boolean;
  blast?: number;
  status?: StatusId;
  statusChance?: number;
  crit?: number;
  critDamage?: number;
  knockback?: number;
  special?: boolean;
  hits?: number[];
  color?: string;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  life: number;
  damage: number;
}
export interface Drop {
  x: number;
  y: number;
  item: ItemId;
  count: number;
  time: number;
}
export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}
export interface InputFrame {
  special?: boolean;
  weaponSlot?: 0 | 1;
  skillSlot?: number;
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpHeld: boolean;
  dash: boolean;
  down: boolean;
  attack: boolean;
  interact: boolean;
  heal: boolean;
}
export const emptyInput = (): InputFrame => ({
  left: false,
  right: false,
  jump: false,
  jumpHeld: false,
  dash: false,
  down: false,
  attack: false,
  interact: false,
  heal: false,
});
