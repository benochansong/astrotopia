import type { InputFrame, Player } from "../src/core/types";
import type { RegionId, EnemyKind } from "../src/data/content";
import type { ClassId } from "../src/classes/catalog";
export const PROTOCOL = 1;
export const CLASSES: ClassId[] = [
  "guardian",
  "ranger",
  "engineer",
  "scientist",
  "explorer",
  "cyberBlade",
];
export const ROLES = [
  "OWNER",
  "ADMIN",
  "BUILDER",
  "OPERATOR",
  "MEMBER",
  "VISITOR",
] as const;
export type Role = (typeof ROLES)[number];
export type Bag = Record<string, number>;
export type Permission =
  | "build"
  | "demolish"
  | "upgrade"
  | "deposit"
  | "withdraw"
  | "configure"
  | "research"
  | "trade"
  | "ship"
  | "settings";
export interface Character {
  id: string;
  name: string;
  color: string;
  classId: ClassId;
  role: Role;
  permissions: Partial<Record<Permission, boolean>>;
  body: Player;
  region: RegionId;
  instance: string;
  party: string | null;
  ready: boolean;
  inventory: Bag;
  storage: Bag;
  pendingLoot?: Bag;
  credits: number;
  skillAt: number;
  shieldUntil: number;
  downUntil: number;
  revives: number;
  checkpoint: { region: RegionId; x: number };
  supportUntil: number;
  kills: number;
  quests: number[];
  rewards: string[];
  uniqueRewards?: string[];
  shieldFrom?: string;
  connected: boolean;
  lastSeen: number;
  muted: string[];
  tutorial: number[];
  tutorialSkipped?: boolean;
  cooldowns?: Record<string, number>;
  droneUntil?: number;
  droneAt?: number;
  repairUntil?: number;
  fieldAt?: number;
  fieldX?: number;
  fieldY?: number;
  hasteUntil?: number;
}
export interface Mob {
  id: string;
  kind: EnemyKind;
  region: RegionId;
  instance: string;
  x: number;
  y: number;
  homeX: number;
  hp: number;
  maxHp: number;
  target: string;
  nextAttack: number;
  telegraph: number;
  attackX: number;
  contributors: Record<string, number>;
  encounter: number;
  boss: boolean;
  scale: number;
  respawnAt: number;
  phase: number;
  stunUntil?: number;
  pattern?: "laser" | "shock" | "gravity" | "overload";
  attackTargets?: number[];
  cycles?: number;
}
export interface Party {
  id: string;
  leader: string;
  members: string[];
  mission: string;
}
export interface Chat {
  id: number;
  at: number;
  from: string;
  name: string;
  text: string;
  channel: "world" | "party";
  party: string | null;
}
export interface OnlineState {
  version: 1;
  id: string;
  name: string;
  owner: string;
  limit: number;
  invite: string;
  inviteExpires: number;
  clock: number;
  savedAt: number;
  characters: Record<string, Character>;
  parties: Record<string, Party>;
  mobs: Mob[];
  harvested: Record<string, number>;
  chats: Chat[];
  serial: number;
  logs: { at: number; actor: string; text: string }[];
  banned: string[];
  pings?: {
    id: number;
    from: string;
    region: RegionId;
    instance: string;
    x: number;
    y: number;
    until: number;
  }[];
}
export interface View {
  type: "state";
  now: number;
  ack: number;
  world: { id: string; name: string; invite?: string; limit: number };
  self: Character;
  players: Character[];
  mobs: Mob[];
  members: Pick<
    Character,
    | "id"
    | "name"
    | "role"
    | "classId"
    | "connected"
    | "region"
    | "party"
    | "ready"
  >[];
  parties: Party[];
  chat: Chat[];
  logs: OnlineState["logs"];
  tickMs: number;
  extension?: Record<string, unknown>;
  pings?: OnlineState["pings"];
}
export type Command = {
  type: "command";
  id: string;
  action: string;
  args: Record<string, unknown>;
};
export type ClientMessage =
  | Command
  | { type: "input"; seq: number; frame: InputFrame }
  | { type: "ping"; at: number };
export type ServerMessage =
  | View
  | { type: "result"; id: string; ok: boolean; message: string; data?: unknown }
  | { type: "pong"; at: number };
export const rolePermissions: Record<Role, Permission[]> = {
  OWNER: [
    "build",
    "demolish",
    "upgrade",
    "deposit",
    "withdraw",
    "configure",
    "research",
    "trade",
    "ship",
    "settings",
  ],
  ADMIN: [
    "build",
    "demolish",
    "upgrade",
    "deposit",
    "withdraw",
    "configure",
    "research",
    "trade",
    "ship",
  ],
  BUILDER: ["build", "upgrade", "deposit", "trade"],
  OPERATOR: ["configure", "research", "deposit", "trade", "ship"],
  MEMBER: ["deposit", "trade"],
  VISITOR: [],
};
export const permitted = (c: Character, p: Permission) =>
  c.role === "OWNER" ||
  (c.permissions[p] ?? rolePermissions[c.role].includes(p));
export const onlineAbilities: Record<ClassId, string[]> = {
  guardian: ["AEGIS FIELD", "GUARDIAN LINK", "FORTRESS", "SHIELD WAVE"],
  ranger: ["FOCUS SHOT", "SCATTER SHOT", "SUPPRESSIVE FIRE", "ORBITAL BURST"],
  engineer: ["SUPPORT DRONE", "REPAIR FIELD", "SUPPORT TURRET", "OVERCLOCK"],
  scientist: ["GENESIS BLOOM", "ADAPTIVE FIELD", "GRAVITY WELL", "RENEWAL"],
  explorer: ["ENERGY LINK", "PATHFINDER", "FIELD ANALYSIS", "EXPEDITION SURGE"],
  cyberBlade: ["COMBO BREAKER", "DASH STRIKE", "BLADE STORM", "CYBER NOVA"],
};
