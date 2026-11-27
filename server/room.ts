import { occupiedSlots } from "../src/systems/inventory";
import { performance } from "node:perf_hooks";
import { createPlayer } from "../src/core/world";
import {
  regions,
  enemyData,
  type RegionId,
  type EnemyKind,
} from "../src/data/content";
import { emptyInput, type InputFrame } from "../src/core/types";
import {
  movePlayer,
  maxHp,
  attackPower,
  xpRequired,
} from "../src/physics/movement";
import { weapons } from "../src/data/battle";
import {
  CLASSES,
  permitted,
  ROLES,
  type Character,
  type Mob,
  type OnlineState,
  type View,
  type Command,
  type Permission,
} from "../shared/online";
import { Store, opaque, hash } from "./database";
import { requireThat as need, integer, text, keys, record } from "./validation";

export class Room {
  inputs = new Map<string, { frame: InputFrame; at: number; seq: number }>();
  processed = new Map<string, number>();
  reviving = new Map<string, { target: string; time: number; hp: number }>();
  tickMs = 0;
  dirty = false;
  private saveTimer = 0;
  constructor(
    public state: OnlineState,
    public store: Store,
  ) {
    for (const c of Object.values(state.characters)) {
      c.connected = false;
      c.ready = false;
      c.droneUntil = c.repairUntil = c.hasteUntil = 0;
      c.shieldUntil = 0;
      c.supportUntil = 0;
      c.uniqueRewards ??= [];
    }
  }
  static create(
    store: Store,
    account: { id: string; name: string },
    name: string,
    limit: number,
  ) {
    const room = new Room(
      {
        version: 1,
        id: opaque(),
        name,
        owner: account.id,
        limit,
        invite: opaque(),
        inviteExpires: Date.now() + 86400000,
        clock: 0,
        savedAt: Date.now(),
        characters: {},
        parties: {},
        mobs: [],
        harvested: {},
        chats: [],
        serial: 0,
        logs: [],
        banned: [],
      },
      store,
    );
    room.join(account);
    room.store.save(room.state);
    return room;
  }
  join(account: { id: string; name: string }) {
    const s = this.state;
    need(!s.banned.includes(account.id), "이 월드에서 추방되었습니다.");
    need(
      s.characters[account.id] ||
        Object.values(s.characters).filter((c) => c.connected).length < s.limit,
      "월드가 가득 찼습니다.",
    );
    if (!s.characters[account.id]) {
      need(Object.keys(s.characters).length < 100, "월드 멤버 한도입니다.");
      s.characters[account.id] = {
        id: account.id,
        name: account.name,
        color: "#8ce2da",
        classId: "explorer",
        role: account.id === s.owner ? "OWNER" : "MEMBER",
        permissions: {},
        body: createPlayer(),
        region: "crash",
        instance: "",
        party: null,
        ready: false,
        inventory: { iron: 10, copper: 10, medkit: 3 },
        storage: {},
        credits: 100,
        skillAt: 0,
        shieldUntil: 0,
        downUntil: 0,
        revives: 0,
        checkpoint: { region: "crash", x: 360 },
        supportUntil: 0,
        kills: 0,
        quests: [],
        rewards: [],
        connected: false,
        lastSeen: s.clock,
        muted: [],
        tutorial: [],
      };
    }
    return s.characters[account.id];
  }
  connect(id: string) {
    const c = this.state.characters[id];
    need(c && !this.state.banned.includes(id), "월드 접근 권한이 없습니다.");
    need(
      c.connected ||
        Object.values(this.state.characters).filter((p) => p.connected).length <
          this.state.limit,
      "접속 인원이 가득 찼습니다.",
    );
    this.inputs.delete(id);
    this.processed.delete(id);
    c.connected = true;
    c.lastSeen = this.state.clock;
    this.ensureRegion(c.region, c.instance);
    this.dirty = true;
  }
  disconnect(id: string) {
    const c = this.state.characters[id];
    if (!c) return;
    c.connected = false;
    c.ready = false;
    c.droneUntil = c.repairUntil = c.hasteUntil = 0;
    for (const p of Object.values(this.state.characters))
      if (p.shieldFrom === id) p.shieldUntil = 0;
    c.supportUntil = 0;
    c.shieldUntil = 0;
    this.inputs.delete(id);
    this.reviving.delete(id);
    this.dirty = true;
    this.store.save(this.state);
  }
  audit(c: Character, message: string) {
    this.state.logs.push({
      at: this.state.clock,
      actor: c.name,
      text: message,
    });
    this.state.logs = this.state.logs.slice(-100);
  }
  member(value: unknown) {
    const id = text(value);
    need(Object.hasOwn(this.state.characters, id), "멤버를 찾을 수 없습니다.");
    return this.state.characters[id];
  }
  same(a: Character, b: Pick<Character, "region" | "instance">) {
    return a.region === b.region && a.instance === b.instance;
  }
  near(a: Character, b: Character, range = 140) {
    return (
      this.same(a, b) &&
      Math.hypot(a.body.x - b.body.x, a.body.y - b.body.y) < range
    );
  }
  ensureRegion(region: RegionId, instance = "") {
    if (
      this.state.mobs.some(
        (m) => m.region === region && m.instance === instance,
      )
    )
      return;
    for (const e of regions[region].enemies.slice(0, 18))
      this.spawn(e.kind, region, e.x, e.y, instance);
  }
  spawn(
    kind: EnemyKind,
    region: RegionId,
    x: number,
    y: number,
    instance = "",
    boss = false,
  ) {
    const m: Mob = {
      id: String(++this.state.serial),
      kind,
      region,
      instance,
      x,
      y,
      homeX: x,
      hp: enemyData[kind].hp,
      maxHp: enemyData[kind].hp,
      target: "",
      nextAttack: 0,
      telegraph: 0,
      attackX: 0,
      contributors: {},
      encounter: 1,
      boss,
      scale: 0,
      respawnAt: 0,
      phase: 1,
    };
    this.state.mobs.push(m);
    return m;
  }
  receiveInput(id: string, seq: number, frame: InputFrame) {
    const last = this.inputs.get(id);
    if (last && seq <= last.seq) return;
    // Preserve one-shot edges arriving between simulation ticks; never accept client transforms.
    if (last)
      for (const k of [
        "jump",
        "dash",
        "heal",
        "interact",
        "special",
        "ultimate",
      ] as const)
        frame[k] = !!frame[k] || !!last.frame[k];
    if (last?.frame.skillSlot !== undefined)
      frame.skillSlot = last.frame.skillSlot;
    this.inputs.set(id, { seq, frame, at: this.state.clock });
  }
  command(id: string, cmd: Command) {
    const fingerprint = hash(
      JSON.stringify({ action: cmd.action, args: cmd.args }),
    );
    const old = this.store.receipt(this.state.id, id, cmd.id);
    if (old)
      return old.fingerprint === fingerprint
        ? JSON.parse(old.result)
        : {
            type: "result",
            id: cmd.id,
            ok: false,
            message: "같은 요청 ID에 다른 내용은 허용되지 않습니다.",
          };
    const before = structuredClone(this.state);
    let result: {
      type: string;
      id: string;
      ok: boolean;
      message: string;
      data?: unknown;
    };
    try {
      const c = this.state.characters[id];
      need(c?.connected, "접속 상태를 확인하세요.");
      const data = this.action(c, cmd.action, cmd.args);
      result = {
        type: "result",
        id: cmd.id,
        ok: true,
        message: "반영했습니다.",
        data,
      };
    } catch (e) {
      this.state = before;
      result = {
        type: "result",
        id: cmd.id,
        ok: false,
        message: e instanceof Error ? e.message : "요청 실패",
      };
    }
    try {
      this.store.commit(this.state, id, cmd.id, fingerprint, result);
    } catch {
      this.state = before;
      return {
        type: "result",
        id: cmd.id,
        ok: false,
        message: "저장 실패 — 작업을 반영하지 않았습니다.",
      };
    }
    return result;
  }
  action(c: Character, action: string, a: Record<string, unknown>): unknown {
    const s = this.state;
    switch (action) {
      case "profile": {
        keys(a, ["classId", "color"]);
        need(
          c.region === "crash" && !c.instance && !c.downUntil,
          "EDEN 기지에서 변경하세요.",
        );
        const cls = text(a.classId);
        need(
          CLASSES.includes(cls as Character["classId"]),
          "알 수 없는 클래스",
        );
        const color = text(a.color, 7);
        need(/^#[0-9a-f]{6}$/i.test(color), "색상 오류");
        c.classId = cls as Character["classId"];
        c.color = color;
        return;
      }
      case "invite":
        keys(a, []);
        need(c.id === s.owner, "월드 소유자만 초대를 갱신할 수 있습니다.");
        s.invite = opaque();
        s.inviteExpires = Date.now() + 86400000;
        return s.invite;
      case "role": {
        keys(a, ["target", "role", "permissions"]);
        need(c.id === s.owner, "소유자 권한이 필요합니다.");
        const target = this.member(a.target);
        need(
          target && target.id !== s.owner,
          "소유자의 권한은 변경할 수 없습니다.",
        );
        const role = text(a.role);
        need(
          ROLES.includes(role as Character["role"]) && role !== "OWNER",
          "권한 오류",
        );
        target.role = role as Character["role"];
        if (a.permissions !== undefined) {
          const p = record(a.permissions);
          keys(p, [
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
          ]);
          need(
            Object.values(p).every((v) => typeof v === "boolean"),
            "권한 형식 오류",
          );
          target.permissions = p;
        }
        this.audit(c, `${target.name} 권한 → ${role}`);
        return;
      }
      case "kick": {
        keys(a, ["target"]);
        need(
          c.role === "OWNER" || c.role === "ADMIN",
          "관리 권한이 필요합니다.",
        );
        const target = this.member(a.target);
        need(
          target &&
            target.role !== "OWNER" &&
            (c.role === "OWNER" || target.role !== "ADMIN"),
          "추방할 수 없습니다.",
        );
        s.banned.push(target.id);
        this.disconnect(target.id);
        this.audit(c, `${target.name} 추방`);
        return;
      }
      case "partyCreate": {
        keys(a, []);
        need(!c.party, "이미 파티에 속해 있습니다.");
        const id = opaque();
        s.parties[id] = { id, leader: c.id, members: [c.id], mission: "" };
        c.party = id;
        c.tutorial.push(1);
        return;
      }
      case "partyJoin": {
        keys(a, ["party"]);
        const p = s.parties[text(a.party)];
        need(
          p && !c.party && p.members.length < 4,
          "파티에 참가할 수 없습니다.",
        );
        p.members.push(c.id);
        c.party = p.id;
        c.tutorial.push(1);
        this.quest(c, 92);
        for (const id of p.members) this.quest(s.characters[id], 92);
        return;
      }
      case "partyLeave": {
        keys(a, []);
        if (c.party) {
          const p = s.parties[c.party];
          p.members = p.members.filter((id) => id !== c.id);
          if (p.leader === c.id) p.leader = p.members[0];
          if (!p.members.length) delete s.parties[p.id];
        }
        c.party = null;
        c.ready = false;
        return;
      }
      case "ready":
        keys(a, []);
        need(c.party, "파티가 필요합니다.");
        c.ready = !c.ready;
        return;
      case "region": {
        keys(a, ["region"]);
        need(
          !c.downUntil && !c.instance,
          "전투 인스턴스에서 이동할 수 없습니다.",
        );
        const target = text(a.region) as RegionId;
        need(
          ["crash", "forest", "valley"].includes(target),
          "목적지가 아직 해금되지 않았습니다.",
        );
        need(
          Math.abs(c.body.x - regions[c.region].spawn) < 180 ||
            Math.abs(c.body.x - 360) < 180 ||
            c.body.x > regions[c.region].width - 200,
          "지역 출입구에서 이동하세요.",
        );
        need(
          target !== "valley" || c.kills >= 2,
          "발광 숲 생명체 2마리를 조사하세요.",
        );
        this.changeRegion(c, target);
        return;
      }
      case "boss": {
        keys(a, []);
        need(
          c.region === "valley" && !c.instance && !c.downUntil,
          "수정 계곡에서 호출하세요.",
        );
        need(
          !s.mobs.some((m) => m.region === c.region && m.boss && m.hp > 0),
          "이미 보스가 출현했습니다.",
        );
        const m = this.spawn(
          "titan",
          c.region,
          Math.min(regions[c.region].width - 300, c.body.x + 550),
          780,
          "",
          true,
        );
        m.maxHp = m.hp = 600;
        return;
      }
      case "ping": {
        keys(a, []);
        const pings = (s.pings ??= []);
        need(
          !pings.some((p) => p.from === c.id && p.until > s.clock + 3),
          "위치 신호는 2초마다 보낼 수 있습니다.",
        );
        pings.push({
          id: ++s.serial,
          from: c.id,
          region: c.region,
          instance: c.instance,
          x: c.body.x,
          y: c.body.y,
          until: s.clock + 5,
        });
        s.pings = pings.slice(-20);
        return;
      }
      case "chat": {
        keys(a, ["text", "channel"]);
        const message = text(a.text, 200);
        const channel = a.channel === "party" ? "party" : "world";
        need(channel !== "party" || c.party, "파티가 필요합니다.");
        need(
          !s.chats.some((m) => m.from === c.id && s.clock - m.at < 1),
          "채팅은 1초마다 보낼 수 있습니다.",
        );
        s.chats.push({
          id: ++s.serial,
          at: s.clock,
          from: c.id,
          name: c.name,
          text: message,
          channel,
          party: c.party,
        });
        s.chats = s.chats.slice(-60);
        return;
      }
      case "mute": {
        keys(a, ["target"]);
        const id = text(a.target);
        need(Object.hasOwn(s.characters, id), "멤버 없음");
        c.muted = c.muted.includes(id)
          ? c.muted.filter((v) => v !== id)
          : [...c.muted, id].slice(-100);
        return;
      }
      case "report":
        keys(a, ["target", "reason"]);
        need(this.member(a.target), "멤버 없음");
        this.audit(
          c,
          `신고 ${s.characters[String(a.target)].name}: ${text(a.reason, 100)}`,
        );
        return;
      case "revive": {
        keys(a, ["target"]);
        const target = this.member(a.target);
        need(
          target &&
            target.downUntil &&
            target.revives < 2 &&
            !c.downUntil &&
            this.near(c, target, 110) &&
            c.party &&
            c.party === target.party,
          "대상 근처에서 같은 파티원이 소생할 수 있습니다.",
        );
        this.reviving.set(c.id, { target: target.id, time: 0, hp: c.body.hp });
        return;
      }
      case "claimLoot": {
        keys(a, []);
        need(
          c.region === "crash" && !c.downUntil,
          "EDEN 기지에서 보류 보상을 회수하세요.",
        );
        const pending = (c.pendingLoot ??= {});
        for (const [item, n] of Object.entries(pending)) {
          const next = { ...c.inventory, [item]: (c.inventory[item] ?? 0) + n };
          if (next[item] <= 99999 && occupiedSlots(next) <= 200) {
            c.inventory = next;
            delete pending[item];
          }
        }
        return;
      }
      case "tutorialSkip":
        keys(a, []);
        c.tutorialSkipped = true;
        c.tutorial = Array.from({ length: 10 }, (_, i) => i + 1);
        return;
      default:
        throw new Error("지원하지 않는 명령입니다.");
    }
  }
  quest(c: Character, q: number) {
    if (!c.quests.includes(q)) c.quests.push(q);
  }
  changeRegion(c: Character, region: RegionId, instance = "") {
    c.region = region;
    c.instance = instance;
    c.body.x = regions[region].spawn;
    c.body.y = 716;
    c.body.vx = c.body.vy = 0;
    c.droneUntil = c.repairUntil = c.hasteUntil = 0;
    c.shieldUntil = c.supportUntil = 0;
    this.inputs.delete(c.id);
    this.reviving.delete(c.id);
    if (!instance && region !== "ship" && region !== "station")
      c.checkpoint = { region, x: c.body.x };
    this.ensureRegion(region, instance);
    this.dirty = true;
  }
  movementGravity(c: Character) {
    return 0.9;
  }
  terrain(c: Character) {
    return regions[c.region];
  }
  tick(dt: number) {
    const start = performance.now(),
      s = this.state,
      online = Object.values(s.characters).filter((c) => c.connected);
    if (!online.length) return;
    s.clock += dt;
    for (const c of online) {
      if (c.downUntil) {
        if (s.clock >= c.downUntil) {
          c.downUntil = 0;
          c.body.hp = maxHp(c.body.level) * 0.5;
          this.changeRegion(c, c.checkpoint.region);
          c.body.x = c.checkpoint.x;
          c.body.invulnerable = 3;
        }
        continue;
      }
      const packet = this.inputs.get(c.id),
        f = packet && s.clock - packet.at < 0.3 ? packet.frame : emptyInput();
      if (packet) this.processed.set(c.id, packet.seq);
      const map = this.terrain(c);
      const speed =
        (c.classId === "explorer" ? 280 : 250) *
        (c.hasteUntil && c.hasteUntil > s.clock ? 1.15 : 1);
      for (let t = 0; t < dt; t += 1 / 120) {
        movePlayer(
          c.body,
          { ...f, jump: t === 0 && f.jump, dash: t === 0 && f.dash },
          Math.min(1 / 120, dt - t),
          map.platforms,
          this.movementGravity(c),
          { speed, energy: 100, regen: 12 },
        );
      }
      c.body.x = Math.max(0, Math.min(map.width - c.body.w, c.body.x));
      if (
        Math.abs(c.body.x - regions[c.region].spawn) > 120 &&
        !c.tutorial.includes(2)
      )
        c.tutorial.push(2);
      c.body.animation =
        c.body.dash > 0
          ? "Dash"
          : !c.body.grounded
            ? "Jump"
            : Math.abs(c.body.vx) > 10
              ? "Run"
              : "Idle";
      if (c.body.y > 1150) {
        c.body.hp = Math.max(1, c.body.hp - 20);
        this.changeRegion(c, c.checkpoint.region);
      }
      if (f.attack && c.body.shotCooldown <= 0 && c.role !== "VISITOR")
        this.attack(c);
      const slot = f.ultimate ? 3 : f.skillSlot;
      if (
        slot !== undefined &&
        s.clock >= (c.cooldowns?.[slot] ?? (slot === 0 ? c.skillAt : 0)) &&
        c.body.energy >= 25 + slot * 5 &&
        c.role !== "VISITOR"
      )
        this.skill(c, slot);
      this.effects(c);
      if (f.heal && c.inventory.medkit > 0 && c.body.hp < maxHp(c.body.level)) {
        c.inventory.medkit--;
        c.body.hp = Math.min(maxHp(c.body.level), c.body.hp + 50);
        this.dirty = true;
      }
      if (f.interact) this.interact(c);
      f.jump = f.dash = f.heal = f.interact = f.special = f.ultimate = false;
      delete f.skillSlot;
    }
    for (const [id, r] of this.reviving) {
      const c = s.characters[id],
        target = s.characters[r.target];
      if (
        !c?.connected ||
        c.downUntil ||
        !target?.downUntil ||
        !this.near(c, target, 110) ||
        c.body.hp < r.hp
      ) {
        this.reviving.delete(id);
        continue;
      }
      r.time += dt;
      if (r.time >= 3) {
        target.downUntil = 0;
        target.body.hp = maxHp(target.body.level) * 0.3;
        target.body.invulnerable = 2;
        target.revives++;
        this.reviving.delete(id);
        this.dirty = true;
      }
    }
    for (const m of s.mobs) this.enemy(m, online, dt);
    this.saveTimer += dt;
    if (this.dirty || this.saveTimer >= 2) {
      s.savedAt = Date.now();
      this.store.save(s);
      this.dirty = false;
      this.saveTimer = 0;
    }
    this.tickMs = Math.max(performance.now() - start, this.tickMs * 0.95);
  }
  attack(c: Character, multiplier = 1) {
    const weapon =
      weapons[
        c.classId === "cyberBlade"
          ? "blade"
          : c.classId === "ranger"
            ? "rifle"
            : "pulse"
      ];
    if (c.body.energy < weapon.energy) return;
    c.body.energy -= weapon.energy;
    c.body.shotCooldown = weapon.speed;
    c.body.animation = "Attack";
    const candidates = this.state.mobs.filter(
      (m) =>
        m.hp > 0 &&
        this.same(c, m) &&
        Math.abs(m.y - (c.body.y + c.body.h)) < 140 &&
        (m.x - c.body.x) * c.body.facing >= -40 &&
        Math.abs(m.x - c.body.x) <= weapon.range,
    );
    const m = candidates.sort(
      (a, b) => Math.abs(a.x - c.body.x) - Math.abs(b.x - c.body.x),
    )[0];
    if (m)
      this.hit(c, m, attackPower(c.body.level) * weapon.power * multiplier);
  }
  hit(c: Character, m: Mob, damage: number) {
    const s = this.state;
    if (!m.scale) {
      m.scale = m.boss
        ? [1, 1.6, 2.2, 2.8][
            Math.min(
              3,
              Object.values(s.characters).filter(
                (p) =>
                  p.connected &&
                  !p.downUntil &&
                  this.same(p, m) &&
                  Math.abs(p.body.x - m.x) < 1300,
              ).length - 1,
            )
          ]
        : 1;
      m.maxHp = Math.round(m.maxHp * m.scale);
      m.hp = m.maxHp;
    }
    m.hp = Math.max(0, m.hp - damage);
    m.contributors[c.id] = s.clock + 30;
    m.target = c.id;
    if (m.hp === 0) {
      m.respawnAt = s.clock + (m.boss ? 180 : 45);
      this.dirty = true;
      for (const p of Object.values(s.characters)) {
        if (
          !p.connected ||
          !this.same(p, m) ||
          Math.abs(p.body.x - m.x) > 1400 ||
          !(
            (m.contributors[p.id] ?? -1) >= s.clock ||
            (p.supportUntil > s.clock && p.party && p.party === c.party)
          )
        )
          continue;
        const reward = `${m.id}:${m.encounter}`;
        if (p.rewards.includes(reward)) continue;
        p.rewards.push(reward);
        p.rewards = p.rewards.slice(-300);
        const item = enemyData[m.kind].drop;
        this.loot(p, item, m.boss ? 5 : 2);
        this.credit(p, m.boss ? 100 : 10);
        p.kills++;
        p.body.xp += enemyData[m.kind].xp;
        while (p.body.level < 100 && p.body.xp >= xpRequired(p.body.level)) {
          p.body.xp -= xpRequired(p.body.level);
          p.body.level++;
        }
        if (p.party) this.quest(p, 93);
        this.audit(p, `${m.boss ? "보스" : "생명체"} 조사 · 개인 보상`);
      }
    }
  }
  credit(c: Character, n: number) {
    c.credits = Math.min(1e9, c.credits + n);
  }
  loot(c: Character, item: string, n: number) {
    const next = { ...c.inventory, [item]: (c.inventory[item] ?? 0) + n };
    if (next[item] <= 99999 && occupiedSlots(next) <= 200) c.inventory = next;
    else {
      const pending = (c.pendingLoot ??= {});
      pending[item] = (pending[item] ?? 0) + n;
    }
  }
  add(bag: Record<string, number>, item: string, n: number) {
    need((bag[item] ?? 0) + n <= 99999, "아이템 상한입니다.");
    bag[item] = (bag[item] ?? 0) + n;
  }
  skill(c: Character, slot = 0) {
    const s = this.state;
    c.body.energy -= 25 + slot * 5;
    (c.cooldowns ??= {})[slot] = s.clock + [12, 18, 25, 30][slot];
    if (slot === 0) c.skillAt = c.cooldowns[slot];
    const allies = Object.values(s.characters).filter(
      (p) =>
        p.connected &&
        !p.downUntil &&
        (p.id === c.id || (c.party && p.party === c.party)) &&
        this.near(c, p, slot === 3 ? 450 : 360),
    );
    const heal = (amount: number) => {
      for (const p of allies)
        if (p.body.hp < maxHp(p.body.level)) {
          p.body.hp = Math.min(maxHp(p.body.level), p.body.hp + amount);
          c.supportUntil = s.clock + 10;
          if (p.id !== c.id) this.quest(c, 94);
        }
    };
    const shield = (duration: number, targets = allies) => {
      for (const p of targets) {
        p.shieldUntil = Math.max(p.shieldUntil, s.clock + duration);
        p.shieldFrom = c.id;
      }
    };
    const nearby = this.state.mobs.filter(
      (m) =>
        m.hp > 0 &&
        this.same(c, m) &&
        Math.abs(m.x - c.body.x) < (c.classId === "cyberBlade" ? 160 : 400),
    );
    if (c.classId === "guardian") {
      if (slot === 1)
        shield(
          8,
          allies
            .filter((p) => p.id !== c.id)
            .sort(
              (a, b) =>
                a.body.hp / maxHp(a.body.level) -
                b.body.hp / maxHp(b.body.level),
            )
            .slice(0, 1),
        );
      else shield(slot === 2 ? 8 : 5);
      for (const m of nearby) {
        m.target = c.id;
        m.contributors[c.id] = s.clock + 30;
      }
      if (slot === 3) this.attack(c, 3);
    } else if (c.classId === "scientist") {
      if (slot === 1) shield(8);
      else if (slot === 2) {
        for (const m of nearby) {
          m.stunUntil = s.clock + (m.boss ? 0.5 : 3);
          m.contributors[c.id] = s.clock + 30;
        }
        if (nearby.length) {
          c.supportUntil = s.clock + 10;
          if (c.party) this.quest(c, 94);
        }
      } else heal(slot === 3 ? 50 : 30);
    } else if (c.classId === "engineer") {
      c.fieldX = c.body.x;
      c.fieldY = c.body.y;
      if (slot === 1) {
        heal(18);
        c.repairUntil = s.clock + 6;
        c.fieldAt = s.clock + 1;
      } else {
        c.droneUntil = s.clock + (slot === 2 ? 15 : 10);
        c.droneAt = s.clock;
      }
    } else if (c.classId === "explorer") {
      for (const p of allies) {
        if (slot === 1) p.hasteUntil = s.clock + 8;
        else if (p.body.energy < 100) {
          p.body.energy = Math.min(100, p.body.energy + (slot === 3 ? 30 : 15));
          if (p.id !== c.id) {
            c.supportUntil = s.clock + 10;
            this.quest(c, 94);
          }
        }
      }
      if (slot === 2)
        for (const m of nearby) {
          m.stunUntil = s.clock + (m.boss ? 0.3 : 2);
          m.contributors[c.id] = s.clock + 30;
        }
    } else if (c.classId === "ranger") {
      this.attack(c, slot === 3 ? 3 : 2.5);
      if (slot === 1)
        for (const m of nearby.slice(0, 2))
          this.hit(c, m, attackPower(c.body.level));
      if (slot === 2)
        for (const m of nearby) m.stunUntil = s.clock + (m.boss ? 0.3 : 2);
    } else {
      if (slot === 1 && c.body.dashCooldown <= 0) {
        c.body.dash = 0.17;
        c.body.dashCooldown = 2;
        c.body.invulnerable = 0.2;
      }
      if (slot >= 2)
        for (const m of nearby)
          this.hit(c, m, attackPower(c.body.level) * (slot === 3 ? 4 : 2));
      else this.attack(c, 2.5);
    }
    this.dirty = true;
  }
  effects(c: Character) {
    const now = this.state.clock;
    if ((c.droneUntil ?? 0) > now && (c.droneAt ?? 0) <= now) {
      c.droneAt = now + 1;
      const m = this.state.mobs
        .filter(
          (m) => m.hp > 0 && this.same(c, m) && Math.abs(m.x - c.body.x) < 500,
        )
        .sort((a, b) => Math.abs(a.x - c.body.x) - Math.abs(b.x - c.body.x))[0];
      if (m) this.hit(c, m, attackPower(c.body.level) * 1.25);
    }
    if ((c.repairUntil ?? 0) > now && (c.fieldAt ?? 0) <= now) {
      c.fieldAt = now + 1;
      for (const p of Object.values(this.state.characters))
        if (
          p.connected &&
          !p.downUntil &&
          (p.id === c.id || (c.party && p.party === c.party)) &&
          this.same(c, p) &&
          Math.hypot(p.body.x - (c.fieldX ?? 0), p.body.y - (c.fieldY ?? 0)) <
            220 &&
          p.body.hp < maxHp(p.body.level)
        ) {
          p.body.hp = Math.min(maxHp(p.body.level), p.body.hp + 5);
          c.supportUntil = now + 10;
          if (p.id !== c.id) this.quest(c, 94);
        }
    }
  }
  interact(c: Character) {
    if (c.role === "VISITOR") return;
    const s = this.state,
      map = regions[c.region];
    if (Math.abs(c.body.x - map.spawn) < 160 && !c.instance) {
      c.body.hp = maxHp(c.body.level);
      c.revives = 0;
      c.checkpoint = { region: c.region, x: c.body.x };
      return;
    }
    const node = map.resources.find(
      (n) => Math.hypot(n.x - c.body.x, n.y - c.body.y - c.body.h) < 120,
    );
    if (!node) return;
    const key = `${c.region}:${c.instance}:${node.id}`;
    if ((s.harvested[key] ?? 0) > s.clock) return;
    this.loot(c, node.item, 2);
    s.harvested[key] = s.clock + 15;
    this.dirty = true;
  }
  enemy(m: Mob, players: Character[], dt: number) {
    if ((m.stunUntil ?? 0) > this.state.clock) return;
    const s = this.state,
      candidates = players.filter((c) => !c.downUntil && this.same(c, m));
    if (!candidates.length) {
      m.target = "";
      m.telegraph = 0;
      if (m.hp > 0) {
        m.hp = m.maxHp;
        m.x = m.homeX;
        m.contributors = {};
      }
      return;
    }
    if (m.hp <= 0) {
      if (s.clock >= m.respawnAt && !m.boss) {
        m.hp = m.maxHp;
        m.encounter++;
        m.contributors = {};
        m.x = m.homeX;
      }
      return;
    }
    let target = candidates.find(
      (c) => c.id === m.target && Math.abs(c.body.x - m.homeX) < 1600,
    );
    if (!target)
      target = candidates
        .filter((c) => Math.abs(c.body.x - m.x) < 600)
        .sort((a, b) => Math.abs(a.body.x - m.x) - Math.abs(b.body.x - m.x))[0];
    if (!target) {
      m.target = "";
      return;
    }
    m.target = target.id;
    const d = enemyData[m.kind],
      range = m.boss ? 260 : 80;
    if (m.telegraph) {
      if (s.clock >= m.telegraph) {
        for (const p of candidates)
          if (
            Math.abs(p.body.x - m.attackX) < range &&
            Math.abs(p.body.y + 64 - m.y) < 130 &&
            p.body.invulnerable <= 0
          ) {
            if (
              p.shieldUntil > s.clock &&
              p.shieldFrom &&
              this.state.characters[p.shieldFrom]?.connected
            ) {
              const supporter = this.state.characters[p.shieldFrom];
              supporter.supportUntil = s.clock + 10;
              if (supporter.id !== p.id) this.quest(supporter, 94);
            }
            p.body.hp = Math.max(
              0,
              p.body.hp - d.damage * (p.shieldUntil > s.clock ? 0.5 : 1),
            );
            p.body.invulnerable = 0.6;
            if (!p.body.hp) {
              p.downUntil = s.clock + 25;
              this.inputs.delete(p.id);
              this.dirty = true;
            }
          }
        m.telegraph = 0;
        m.nextAttack = s.clock + (m.boss ? 2 : 1.5);
      }
      return;
    }
    if (Math.abs(target.body.x - m.x) > range * 0.75)
      m.x += Math.sign(target.body.x - m.x) * Math.min(100, d.speed) * dt;
    else if (s.clock >= m.nextAttack) {
      m.attackX = target.body.x;
      m.telegraph = s.clock + (m.boss ? 1.2 : 0.6);
    }
    m.phase = m.boss
      ? Math.min(4, 1 + Math.floor(4 * (1 - m.hp / m.maxHp)))
      : 1;
  }
  view(id: string): View {
    const s = this.state,
      c = s.characters[id];
    return {
      type: "state",
      now: s.clock,
      ack: this.processed.get(id) ?? -1,
      world: {
        id: s.id,
        name: s.name,
        limit: s.limit,
        ...(c.id === s.owner ? { invite: s.invite } : {}),
      },
      self: c,
      players: Object.values(s.characters)
        .filter((p) => p.connected && p.id !== id && this.same(c, p))
        .map((p) => ({
          ...p,
          inventory: {},
          storage: {},
          pendingLoot: {},
          uniqueRewards: [],
          credits: 0,
          rewards: [],
          muted: [],
        })),
      mobs: s.mobs.filter((m) => this.same(c, m)),
      members: Object.values(s.characters).map(
        ({ id, name, role, classId, connected, region, party, ready }) => ({
          id,
          name,
          role,
          classId,
          connected,
          region,
          party,
          ready,
        }),
      ),
      pings: (s.pings ?? []).filter(
        (p) => p.until > s.clock && this.same(c, p),
      ),
      parties: Object.values(s.parties),
      chat: s.chats
        .filter(
          (m) =>
            !c.muted.includes(m.from) &&
            (m.channel === "world" || (c.party && m.party === c.party)),
        )
        .slice(-20),
      logs: s.logs.slice(-15),
      tickMs: this.tickMs,
    };
  }
}
