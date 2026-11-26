import {
  enemyData,
  items,
  planets,
  questData,
  regionOrder,
  regions,
  type ItemId,
  type RegionId,
  type Resource,
} from "../data/content";
import {
  type Bullet,
  type Drop,
  type Enemy,
  type FloatingText,
  type InputFrame,
  type Particle,
  type Player,
  type Progress,
  type SaveData,
  type Settings,
} from "./types";
import {
  attackPower,
  maxHp,
  MAX_STEP,
  movePlayer,
  xpRequired,
} from "../physics/movement";
import { addItem, type Inventory } from "../systems/inventory";
import { newProgress } from "../save/storage";
export type WorldEvent = {
  type: "sound" | "toast" | "save" | "ending";
  text: string;
};
export function createPlayer(x = 360, y = 716): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    w: 34,
    h: 64,
    facing: 1,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    drop: 0,
    dash: 0,
    dashCooldown: 0,
    shotCooldown: 0,
    invulnerable: 2,
    hp: 100,
    energy: 100,
    level: 1,
    xp: 0,
    animation: "Idle",
    animationTime: 0,
  };
}
export class World {
  player = createPlayer();
  region: RegionId = "crash";
  progress: Progress = newProgress();
  inventory: Inventory = { medkit: 2 };
  enemies: Enemy[] = [];
  bullets: Bullet[] = Array.from({ length: 32 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    life: 0,
    damage: 0,
  }));
  particles: Particle[] = Array.from({ length: 180 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    color: "",
    size: 0,
  }));
  drops: Drop[] = [];
  texts: FloatingText[] = [];
  cooldowns: Record<string, number> = {};
  events: WorldEvent[] = [];
  mining: { node: Resource; elapsed: number } | null = null;
  camera = { x: 0, y: 170, shake: 0 };
  time = 0;
  dead = 0;
  transition = 0;
  regionNotice = 5;
  safe = { x: 360, y: 716 };
  private autosave = 0;
  private moved = false;
  constructor(save?: SaveData) {
    if (save) {
      this.region = save.region;
      this.player = createPlayer(save.x, save.y);
      Object.assign(this.player, {
        level: save.level,
        xp: save.xp,
        hp: save.hp || maxHp(save.level),
        energy: save.energy,
      });
      this.inventory = structuredClone(save.inventory);
      this.progress = structuredClone(save.progress);
      if (save.hp === 0) {
        this.region = this.progress.checkpoint.region;
        this.player.x = this.progress.checkpoint.x;
        this.player.y = 716;
        this.player.invulnerable = 4;
      }
      this.ensureSafePosition();
    }
    this.safe = { x: this.player.x, y: this.player.y };
    this.spawnEnemies();
    this.camera.x = Math.max(0, this.player.x - 500);
  }
  get map() {
    return regions[this.region];
  }
  emit(type: WorldEvent["type"], text: string) {
    this.events.push({ type, text });
  }
  toast(text: string) {
    this.emit("toast", text);
  }
  sound(name: string) {
    this.emit("sound", name);
  }
  ensureSafePosition() {
    const p = this.player;
    const surface = this.map.platforms.find(
      (t) =>
        p.x >= t.x && p.x + p.w <= t.x + t.w && Math.abs(p.y + p.h - t.y) < 4,
    );
    if (!surface) {
      p.x = this.map.spawn;
      p.y = 716;
    }
  }
  spawnEnemies() {
    this.enemies = this.map.enemies.map((e, id) => ({
      id,
      kind: e.kind,
      x: e.x,
      y: e.y - enemyData[e.kind].h,
      homeX: e.x,
      homeY: e.y - enemyData[e.kind].h,
      vx: 0,
      vy: 0,
      hp: enemyData[e.kind].hp,
      state: "Idle",
      timer: 0.3 + id * 0.2,
      facing: -1,
      attackX: 0,
      attackY: 0,
    }));
  }
  count(key: string, n = 1) {
    this.progress.counters[key] = (this.progress.counters[key] ?? 0) + n;
    this.checkQuests();
  }
  checkQuests() {
    while (this.progress.quest < questData.length) {
      const q = questData[this.progress.quest];
      if (!q.goals.every(([id, , n]) => (this.progress.counters[id] ?? 0) >= n))
        break;
      this.progress.quest++;
      this.addXp(q.xp);
      this.toast(`임무 완료 · ${q.name}  +${q.xp} XP`);
      this.sound("quest");
      this.emit("save", "quest");
      if (this.progress.quest === 4)
        this.emit(
          "ending",
          "이 행성에는 우리가 생각했던 것보다 훨씬 오래된 비밀이 존재한다.",
        );
    }
  }
  addXp(amount: number) {
    const p = this.player;
    if (p.level >= 15) return;
    p.xp += amount;
    while (p.level < 15 && p.xp >= xpRequired(p.level)) {
      p.xp -= xpRequired(p.level);
      p.level++;
      p.hp = maxHp(p.level);
      this.burst(p.x + 17, p.y + 30, "#e8df98", 40);
      this.toast(`LEVEL UP · 탐험가 Lv.${p.level}`);
      this.sound("level");
      this.emit("save", "level");
    }
    if (p.level === 15) p.xp = 0;
  }
  collect(item: ItemId, count: number) {
    if (!addItem(this.inventory, item, count)) {
      this.toast(
        "인벤토리가 가득 찼습니다. 회복 키트를 사용해 공간을 확보하세요.",
      );
      return false;
    }
    this.count(item, count);
    this.toast(`${items[item].name} +${count}`);
    this.sound("pickup");
    return true;
  }
  burst(x: number, y: number, color: string, n = 12) {
    for (let i = 0; i < n; i++) {
      const p = this.particles.find((p) => !p.active);
      if (!p) break;
      const angle = Math.random() * Math.PI * 2,
        speed = 25 + Math.random() * 130;
      Object.assign(p, {
        active: true,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.3 + Math.random() * 0.6,
        max: 0.9,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }
  damage(amount: number, fromX: number) {
    const p = this.player;
    if (p.invulnerable > 0 || this.dead > 0) return;
    p.hp = Math.max(0, p.hp - Math.max(1, amount - 5));
    p.invulnerable = 1.1;
    p.vx = (p.x < fromX ? -1 : 1) * 280;
    p.vy = -150;
    p.animation = "Hit";
    p.animationTime = 0.25;
    this.camera.shake = 7;
    this.sound("hit");
    this.burst(p.x + 17, p.y + 32, "#ffad99");
    this.texts.push({
      x: p.x,
      y: p.y,
      text: `−${Math.max(1, amount - 5)}`,
      color: "#ffb29c",
      life: 1,
    });
    if (p.hp === 0) {
      this.dead = 2.8;
      p.animation = "Death";
      this.sound("death");
      this.mining = null;
    }
  }
  respawn() {
    const { region, x } = this.progress.checkpoint;
    this.enterRegion(region, x);
    this.player.hp = maxHp(this.player.level);
    this.player.energy = 100;
    this.player.invulnerable = 4;
    this.dead = 0;
    this.toast("회복 지점에서 깨어났습니다 · 자원과 경험치는 유지됩니다.");
    this.emit("save", "respawn");
  }
  enterRegion(id: RegionId, x?: number) {
    this.region = id;
    const p = this.player;
    p.x = x ?? regions[id].spawn;
    p.y = 716;
    p.vx = 0;
    p.vy = 0;
    p.invulnerable = 2;
    p.grounded = false;
    p.dash = 0;
    p.drop = 0;
    this.ensureSafePosition();
    this.safe = { x: p.x, y: p.y };
    this.camera.x = Math.max(0, p.x - 500);
    this.camera.y = 170;
    this.spawnEnemies();
    this.bullets.forEach((b) => (b.active = false));
    this.particles.forEach((p) => (p.active = false));
    this.texts = [];
    this.drops = [];
    this.mining = null;
    this.transition = 0.65;
    this.regionNotice = 4.5;
    if (!this.progress.discovered.includes(id)) {
      this.progress.discovered.push(id);
      this.addXp(25);
      this.count(id);
      this.toast(`새로운 지역 발견 · ${regions[id].name} +25 XP`);
    }
    this.emit("save", "region");
  }
  nearby() {
    const p = this.player,
      cx = p.x + p.w / 2,
      cy = p.y + p.h;
    const candidates = [
      ...this.map.resources
        .filter((n) => !(this.cooldowns[n.id] > 0))
        .map((n) => ({
          id: n.id,
          label: `${items[n.item].name} 채집`,
          x: n.x,
          y: n.y,
          node: n,
        })),
      ...this.map.landmarks
        .filter(
          (l) => l.kind !== "chest" || !this.progress.opened.includes(l.id),
        )
        .map((l) => ({
          id: l.id,
          label: l.label,
          x: l.x,
          y: l.y,
          landmark: l,
        })),
    ];
    return candidates
      .filter((n) => Math.abs(n.y - cy) < 75 && Math.abs(n.x - cx) < 95)
      .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
  }
  interact() {
    if (this.mining) return;
    const target = this.nearby();
    if (!target) return;
    if ("node" in target) {
      this.mining = { node: target.node, elapsed: 0 };
      this.sound("mine");
      return;
    }
    const l = target.landmark;
    if (l.kind === "heal") {
      this.player.hp = maxHp(this.player.level);
      this.player.energy = 100;
      this.progress.checkpoint = { region: this.region, x: l.x };
      this.emit("save", "checkpoint");
      this.toast("회복 완료 · 이곳에 귀환 신호를 남겼습니다.");
      this.burst(l.x, l.y - 40, "#b5f4d4", 20);
      this.sound("heal");
    } else if (l.kind === "chest") {
      if (this.collect("medkit", 2)) {
        this.progress.opened.push(l.id);
        this.addXp(15);
        this.emit("save", "chest");
      }
    } else {
      if (!this.progress.counters[l.id]) {
        this.count(l.id);
        this.addXp(10);
        this.burst(l.x, l.y - 50, "#a1ebef", 15);
        this.emit("save", "discovery");
      }
      this.toast(
        l.kind === "ship"
          ? "ASTRA-01 · 선체 손상. 생존 캡슐과 통신 장치를 확인하세요."
          : l.kind === "capsule"
            ? "생존 캡슐 활성화 · 당신의 생체 신호가 기록되었습니다."
            : l.kind === "beacon"
              ? "통신 장치 · 잔해 3개와 에너지 결정 3개가 필요합니다."
              : "고대의 문은 잠겨 있습니다. 저 너머에서 알 수 없는 신호가 감지됩니다.",
      );
      this.sound("ui");
    }
  }
  heal() {
    if (this.player.hp >= maxHp(this.player.level)) {
      this.toast("체력이 이미 가득 찼습니다.");
      return;
    }
    if (!this.inventory.medkit) {
      this.toast("회복 키트가 없습니다. 회복 지점을 찾아보세요.");
      return;
    }
    this.inventory.medkit--;
    this.player.hp = Math.min(maxHp(this.player.level), this.player.hp + 50);
    this.sound("heal");
    this.burst(this.player.x, this.player.y, "#b1f3bd");
    this.toast("체력 +50");
  }
  update(dt: number, input: InputFrame) {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    this.transition = Math.max(0, this.transition - dt);
    this.regionNotice = Math.max(0, this.regionNotice - dt);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 25);
    if (this.dead > 0) {
      this.dead -= dt;
      this.player.animation = "Death";
      if (this.dead <= 0) this.respawn();
      this.effects(dt);
      return;
    }
    const p = this.player;
    if (input.interact) this.interact();
    if (input.heal) this.heal();
    if (input.left || input.right) this.moved = true;
    if (input.jump && this.moved && !this.progress.counters.move)
      this.count("move");
    let remaining = dt,
      first = true;
    while (remaining > 0) {
      const step = Math.min(remaining, MAX_STEP);
      const landed = movePlayer(
        p,
        { ...input, jump: first && input.jump, dash: first && input.dash },
        step,
        this.map.platforms,
        planets[0].gravity,
      );
      if (landed) {
        p.animation = "Land";
        p.animationTime = 0.13;
        this.burst(p.x + 17, p.y + p.h, "#b7d3b8", 7);
        this.sound("land");
        this.camera.shake = 1.5;
      }
      first = false;
      remaining -= step;
    }
    p.x = Math.max(0, Math.min(this.map.width - p.w, p.x));
    if (p.grounded) this.safe = { x: p.x, y: p.y };
    if (p.y > 1100) {
      p.invulnerable = 0;
      this.damage(1000, p.x);
    }
    p.animationTime = Math.max(0, p.animationTime - dt);
    if (p.animationTime <= 0)
      p.animation =
        p.dash > 0
          ? "Dash"
          : !p.grounded
            ? p.vy < 0
              ? "Jump"
              : "Fall"
            : Math.abs(p.vx) > 200
              ? "Run"
              : Math.abs(p.vx) > 15
                ? "Walk"
                : "Idle";
    if (p.dash > 0) {
      this.burst(p.x + 17, p.y + 40, "#77e5df", 2);
      if (input.dash) this.sound("dash");
    }
    if (input.attack && p.shotCooldown === 0) {
      const b = this.bullets.find((b) => !b.active);
      if (b) {
        Object.assign(b, {
          active: true,
          x: p.x + 17 + p.facing * 30,
          y: p.y + 30,
          vx: p.facing * 720,
          life: 1.4,
          damage: attackPower(p.level),
        });
        p.shotCooldown = 0.24;
        p.animation = "Attack";
        p.animationTime = 0.16;
        this.sound("shoot");
        this.burst(b.x, b.y, "#e5fcb7", 3);
      }
    }
    if (this.mining) {
      const { node } = this.mining;
      if (
        Math.abs(p.x + 17 - node.x) > 100 ||
        Math.abs(p.y + p.h - node.y) > 80 ||
        input.attack ||
        p.dash > 0
      ) {
        this.mining = null;
      } else {
        this.mining.elapsed += dt;
        p.animation = "Mining";
        if (
          Math.floor(this.mining.elapsed * 8) !==
          Math.floor((this.mining.elapsed - dt) * 8)
        )
          this.burst(node.x, node.y - 20, items[node.item].color, 2);
        if (this.mining.elapsed >= 1.1) {
          if (this.collect(node.item, node.count)) {
            this.cooldowns[node.id] = node.respawn;
            this.emit("save", "mining");
          }
          this.mining = null;
        }
      }
    }
    for (const id in this.cooldowns)
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
    this.updateEnemies(dt);
    for (const b of this.bullets) {
      if (!b.active) continue;
      const from = b.x;
      b.x += b.vx * dt;
      b.life -= dt;
      if (b.life <= 0 || Math.abs(b.x - p.x) > 1300) {
        b.active = false;
        continue;
      }
      for (const e of this.enemies) {
        const d = enemyData[e.kind];
        if (e.state === "Death" || b.y < e.y - 4 || b.y > e.y + d.h + 4)
          continue;
        if (Math.max(from, b.x) >= e.x && Math.min(from, b.x) <= e.x + d.w) {
          e.hp -= b.damage;
          e.vx = Math.sign(b.vx) * 180;
          e.state = "Hit";
          e.timer = 0.2;
          b.active = false;
          this.sound("impact");
          this.burst(b.x, b.y, d.color, 9);
          this.texts.push({
            x: e.x + d.w / 2,
            y: e.y,
            text: String(b.damage),
            color: "#fff1b2",
            life: 0.8,
          });
          if (e.hp <= 0) {
            e.state = "Death";
            e.timer = 24;
            this.addXp(d.xp);
            this.count(e.kind);
            this.drops.push({
              x: e.x + d.w / 2,
              y: e.homeY + d.h - 15,
              item: d.drop,
              count: 1,
              time: 0,
            });
            this.texts.push({
              x: e.x,
              y: e.y - 20,
              text: `+${d.xp} XP`,
              color: "#b8e8d5",
              life: 1.2,
            });
          }
          break;
        }
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.time += dt;
      if (
        Math.abs(d.x - p.x - 17) < 70 &&
        Math.abs(d.y - p.y - 40) < 100 &&
        d.time > 0.3
      ) {
        if (this.collect(d.item, d.count)) this.drops.splice(i, 1);
        else d.time = -2;
      }
    }
    this.effects(dt);
    const targetX = Math.max(
      0,
      Math.min(this.map.width - 1280, p.x - 600 + p.facing * 100),
    );
    const targetY = Math.max(0, Math.min(350, p.y - 490));
    const ease = 1 - Math.exp(-dt * 5);
    this.camera.x += (targetX - this.camera.x) * ease;
    this.camera.y += (targetY - this.camera.y) * ease;
    const index = regionOrder.indexOf(this.region);
    if (p.x > this.map.width - p.w - 5 && index < 2)
      this.enterRegion(regionOrder[index + 1]);
    else if (p.x < 3 && index > 0)
      this.enterRegion(
        regionOrder[index - 1],
        regions[regionOrder[index - 1]].width - 110,
      );
    this.autosave += dt;
    if (this.autosave > 15) {
      this.autosave = 0;
      this.emit("save", "auto");
    }
  }
  private updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      const d = enemyData[e.kind];
      e.timer -= dt;
      if (e.state === "Death") {
        if (e.timer <= 0) {
          e.hp = d.hp;
          e.x = e.homeX;
          e.y = e.homeY;
          e.state = "Idle";
          e.timer = 1;
        }
        continue;
      }
      if (Math.abs(e.x - p.x) > 1500) continue;
      const dx = p.x - e.x,
        dy = p.y - e.y,
        distance = Math.hypot(dx, dy);
      const chaseRange = e.kind === "manta" ? 400 : 300;
      if (e.state === "Hit") {
        e.x += e.vx * dt;
        if (e.timer <= 0) e.state = "Chase";
        continue;
      }
      if (e.state === "Idle" && e.timer <= 0) {
        e.state = "Patrol";
        e.timer = 2;
      }
      if (
        (e.state === "Patrol" || e.state === "Idle") &&
        distance < chaseRange
      ) {
        e.state = "Detect";
        e.timer = 0.6;
        e.facing = Math.sign(dx) || 1;
      }
      if (e.state === "Detect" && e.timer <= 0) {
        e.state = "Chase";
        e.timer = 0.5;
      }
      if (e.state === "Chase") {
        e.facing = Math.sign(dx) || 1;
        if (Math.abs(e.x - e.homeX) > 500 || distance > 600) {
          e.state = "Return";
        } else if (distance < (e.kind === "manta" ? 330 : 180)) {
          e.state = "Attack";
          e.timer = e.kind === "slime" ? 0.9 : 1.2;
          e.attackX = p.x;
          e.attackY = p.y + 20;
          e.vx = e.facing * (e.kind === "crawler" ? 260 : 95);
          if (e.kind === "slime") e.vy = -220;
        }
      }
      if (e.state === "Patrol" && e.timer <= 0) {
        e.facing *= -1;
        e.timer = 2;
      }
      if (e.state === "Return") {
        e.facing = Math.sign(e.homeX - e.x) || 1;
        if (Math.abs(e.homeX - e.x) < 10) {
          e.state = "Idle";
          e.timer = 1;
        }
      }
      if (e.kind === "manta") {
        if (e.state === "Attack") {
          if (e.timer < 0.7) {
            const angle = Math.atan2(e.attackY - e.y, e.attackX - e.x);
            e.x += Math.cos(angle) * 300 * dt;
            e.y += Math.sin(angle) * 300 * dt;
          }
          if (e.timer <= 0) {
            e.state = "Return";
          }
        } else {
          e.y +=
            (e.homeY + Math.sin(this.time * 1.6 + e.id) * 27 - e.y) *
            Math.min(1, dt * 2);
          if (e.state !== "Detect") e.x += e.facing * d.speed * dt;
        }
      } else {
        let speed =
          e.state === "Patrol" || e.state === "Return"
            ? d.speed
            : e.state === "Chase"
              ? d.speed * 1.3
              : 0;
        if (e.state === "Attack" && (e.kind === "slime" || e.timer < 0.65))
          speed = Math.abs(e.vx);
        const next = e.x + e.facing * speed * dt;
        const floor = this.map.platforms.find(
          (t) => !t.oneWay && next >= t.x && next + d.w <= t.x + t.w,
        );
        if (floor) {
          e.x = next;
          e.vy += 990 * dt;
          e.y = Math.min(floor.y - d.h, e.y + e.vy * dt);
          if (e.y >= floor.y - d.h) e.vy = 0;
        } else {
          e.facing *= -1;
          e.state = "Return";
        }
        if (e.state === "Attack" && e.timer <= 0) {
          e.state = "Idle";
          e.timer = 0.55;
        }
      }
      if (
        e.x < p.x + p.w &&
        e.x + d.w > p.x &&
        e.y < p.y + p.h &&
        e.y + d.h > p.y
      )
        this.damage(d.damage, e.x + d.w / 2);
    }
  }
  private effects(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
    }
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= dt * 30;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
  snapshot(settings: Settings): SaveData {
    return {
      version: 1,
      savedAt: Date.now(),
      region: this.region,
      x: this.safe.x,
      y: this.safe.y,
      level: this.player.level,
      xp: this.player.xp,
      hp: this.player.hp,
      energy: this.player.energy,
      inventory: structuredClone(this.inventory),
      progress: structuredClone(this.progress),
      settings: { ...settings },
    };
  }
}
