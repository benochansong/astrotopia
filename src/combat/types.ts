import type { EnemyKind, ItemId, RegionId } from "../data/content";
export type Element =
  "physical" | "plasma" | "electric" | "cryo" | "toxic" | "gravity";
export type WeaponId =
  "pulse" | "rifle" | "blade" | "cannon" | "cryo" | "hammer";
export type SkillId =
  "dash" | "burst" | "wave" | "aerial" | "shield" | "orbital";
export type StatusId =
  "chill" | "freeze" | "shock" | "poison" | "stun" | "shred";
export type Rarity =
  "common" | "uncommon" | "rare" | "epic" | "legendary" | "transcendent";
export type ArmorSlot =
  "helmet" | "body" | "legs" | "gloves" | "boots" | "core" | "accessory";
export type GearSlot = ArmorSlot | "primary" | "secondary";
export type EliteAffix =
  | "fortified"
  | "berserk"
  | "electric"
  | "regenerating"
  | "splitting"
  | "shielded";
export interface Stats {
  hp: number;
  energy: number;
  attack: number;
  defense: number;
  crit: number;
  critDamage: number;
  attackSpeed: number;
  moveSpeed: number;
  regen: number;
  statusResist: number;
  elementResist: number;
}
export interface Gear {
  upgrade?: number;
  locked?: boolean;
  id: string;
  template: string;
  rarity: Rarity;
}
export interface GroundLoot {
  id: string;
  region: RegionId;
  x: number;
  y: number;
  item?: ItemId;
  count: number;
  gear?: Gear;
}
export interface BattleSave {
  ownedWeapons: WeaponId[];
  weaponSlots: [WeaponId, WeaponId | null];
  activeSlot: 0 | 1;
  gear: Gear[];
  equipment: Partial<Record<GearSlot, string>>;
  unlockedSkills: SkillId[];
  skillSlots: (SkillId | null)[];
  credits: number;
  bossKills: number;
  bossSeen: boolean;
  titles: string[];
  discovered: EnemyKind[];
  story: string[];
  groundLoot: GroundLoot[];
  serial: number;
}
export interface Status {
  id: StatusId;
  time: number;
  stacks: number;
  tick: number;
  power: number;
}
export interface AttackData {
  power: number;
  speed: number;
  range: number;
  projectileSpeed: number;
  crit: number;
  critDamage: number;
  knockback: number;
  energy: number;
  cooldown: number;
  element: Element;
  pierce: boolean;
  status?: StatusId;
  statusChance: number;
  animation: string;
  sound: string;
  effect: string;
}
export interface WeaponData extends AttackData {
  id: WeaponId;
  name: string;
  en: string;
  level: number;
  color: string;
  description: string;
  special: string;
}
export interface AttackShape {
  kind: "circle" | "rect" | "arc";
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  facing: number;
}
export interface CombatEffect extends AttackShape {
  life: number;
  maxLife: number;
  color: string;
  warning: boolean;
  label?: string;
}
export interface Hazard extends AttackShape {
  id: number;
  delay: number;
  duration: number;
  damage: number;
  element: Element;
  status?: StatusId;
  vx: number;
  vy: number;
  interval: number;
  clock: number;
  color: string;
  label: string;
}
export interface AttackPayload {
  classSkill?: boolean;
  summon?: boolean;
  damage: number;
  element: Element;
  crit: number;
  critDamage: number;
  knockback: number;
  status?: StatusId;
  statusChance: number;
  special: boolean;
  sourceX: number;
}
