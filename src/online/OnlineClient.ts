import { expeditionPanel, expeditionCommand } from "./expedition-panel";
import type { ExpeditionView } from "../../shared/expedition-online";
import { colonyPanel, colonyCommand } from "./colony-panel";
import type { ColonyView } from "../../shared/colony-online";
import { Art } from "../scenes/art";
import { World } from "../core/world";
import { createEnemy } from "../combat/EnemyAI";
import { regions, items } from "../data/content";
import { emptyInput, type InputFrame } from "../core/types";
import { maxHp, movePlayer } from "../physics/movement";
import {
  CLASSES,
  ROLES,
  onlineAbilities,
  type View,
  type ServerMessage,
} from "../../shared/online";
import { classes } from "../classes/catalog";
import "./online.css";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const button = (label: string, action: string, value = "") =>
  `<button data-online="${action}" data-value="${esc(value)}">${label}</button>`;
const sessionKey = "astrotopia.online.session.v1";
export class OnlineClient {
  root = document.createElement("section");
  view: View | null = null;
  socket: WebSocket | null = null;
  private landscape = document.createElement("canvas");
  private landscapeKey = "";
  private lastVisualView: View | null = null;
  private visual = new World();
  private art = new Art();
  private session: { token: string; name: string; id: string } | null = null;
  private worlds: { id: string; name: string; count: number; limit: number }[] =
    [];
  private status = "서버 확인 중";
  private notice = "";
  private origin =
    import.meta.env.VITE_COOP_ORIGIN ||
    (import.meta.env.DEV ? "http://127.0.0.1:5190" : "");
  private active = false;
  private panel = "";
  private sequence = 0;
  private clock = 0;
  private uiClock = 0;
  private ping = 0;
  private retries = 0;
  private reconnectTimer = 0;
  private worldId = "";
  private pending = emptyInput();
  private remotes = new Map<string, { x: number; y: number }>();
  private history: { seq: number; frame: InputFrame }[] = [];
  private outbox = new Map<
    string,
    { type: string; id: string; action: string; args: Record<string, unknown> }
  >();
  private received = 0;
  private samples: number[] = [];
  private lastFrame = 0;
  private renderedFrames = 0;
  constructor(
    private exit: () => void,
    private clearInput: () => void,
  ) {
    this.landscape.width = 1280;
    this.landscape.height = 720;
    this.root.id = "online-ui";
    this.root.hidden = true;
    document.getElementById("game-frame")!.append(this.root);
    try {
      this.session = JSON.parse(localStorage.getItem(sessionKey) || "null");
    } catch {
      /* Corrupt online credentials never affect solo saves. */
    }
    this.root.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-online]");
      if (b) void this.click(b.dataset.online!, b.dataset.value ?? "");
    });
    this.root.addEventListener("focusin", () => this.clearInput());
    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      const typing = (e.target as HTMLElement)?.matches(
        "input,select,textarea",
      );
      if (e.code === "Escape") {
        this.panel = "";
        this.clearInput();
        this.render();
        return;
      }
      if (typing) {
        if (e.code === "Enter" && (e.target as HTMLElement).id === "on-chat")
          void this.click("chat", "");
        return;
      }
      if (["Enter", "KeyP", "KeyL", "KeyY", "Tab"].includes(e.code)) {
        e.preventDefault();
        this.panel =
          e.code === "Enter"
            ? "chat"
            : e.code === "KeyL"
              ? "world"
              : e.code === "KeyY"
                ? "quick"
                : "party";
        this.clearInput();
        this.render();
        if (e.code === "Enter")
          this.root.querySelector<HTMLInputElement>("#on-chat")?.focus();
      }
    });
  }
  metrics() {
    return {
      frames: this.renderedFrames,
      samples: [...this.samples],
      ping: this.ping,
      serverMs: this.view?.tickMs ?? 0,
      region: this.view?.self.region,
      connected: this.view?.members.filter((m) => m.connected).length ?? 0,
    };
  }
  async open() {
    this.active = true;
    this.root.hidden = false;
    this.render();
    try {
      await this.api("/health");
      this.status = "개발 협동 서버 연결 가능";
      if (this.session) await this.refreshWorlds();
    } catch (e) {
      this.status = "서버 오프라인";
      this.notice = String(e);
    }
    this.render();
  }
  close() {
    this.active = false;
    clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.view = null;
    this.root.hidden = true;
    this.clearInput();
    this.exit();
  }
  private value(id: string) {
    return this.root.querySelector<HTMLInputElement>(`#on-${id}`)?.value ?? "";
  }
  private async api(path: string, body?: unknown) {
    if (!this.origin)
      throw new Error(
        "온라인 서버 주소가 설정되지 않았습니다. VITE_COOP_ORIGIN을 설정하세요.",
      );
    const res = await fetch(this.origin + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        ...(this.session
          ? { authorization: `Bearer ${this.session.token}` }
          : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000),
    });
    const value = await res.json();
    if (!res.ok) throw new Error(value.error || "서버 요청 실패");
    return value;
  }
  private async refreshWorlds() {
    this.worlds = await this.api("/worlds");
  }
  private async connect(id: string) {
    if (this.worldId !== id) {
      this.outbox.clear();
      try {
        const saved = JSON.parse(
          localStorage.getItem(
            "astrotopia.online.outbox." + this.session?.id + "." + id,
          ) || "[]",
        );
        for (const command of saved.slice(-10))
          this.outbox.set(command.id, command);
      } catch {}
    }
    this.worldId = id;
    this.status = "접속 중";
    this.render();
    const { ticket } = await this.api("/ticket", { world: id });
    if (!this.active) return;
    const url = new URL("/socket", this.origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("ticket", ticket);
    const previous = this.socket;
    this.socket = null;
    previous?.close();
    const ws = new WebSocket(url);
    this.socket = ws;
    this.sequence = 0;
    this.history = [];
    ws.onopen = () => {
      for (const command of this.outbox.values())
        ws.send(JSON.stringify(command));
    };
    ws.onmessage = (e) => {
      if (this.socket !== ws) return;
      const m = JSON.parse(e.data) as ServerMessage;
      if (m.type === "state") {
        if (!m.extension && this.view) m.extension = this.view.extension;
        this.view = m;
        this.history = this.history.filter((h) => h.seq > m.ack).slice(-8);
        this.status = "연결됨";
        this.retries = 0;
        this.received = performance.now();
      } else if (m.type === "pong") this.ping = Date.now() - m.at;
      else {
        this.outbox.delete(m.id);
        this.persistOutbox();
        this.notice = m.message;
        if (m.ok && this.panel === "world") this.render();
      }
    };
    ws.onclose = (e) => {
      if (this.socket !== ws || !this.active) return;
      this.socket = null;
      this.clearInput();
      this.status = "연결 끊김";
      this.render();
      if (![4001, 4002, 4003].includes(e.code) && this.retries < 8) {
        this.scheduleReconnect(id);
      } else
        this.notice = "로그인 또는 월드 접근 상태를 확인한 뒤 다시 접속하세요.";
    };
    ws.onerror = () => {
      this.notice = "협동 서버 연결을 확인하세요.";
    };
  }
  private scheduleReconnect(id: string) {
    if (!this.active || this.retries >= 8) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(
      () => {
        this.retries++;
        void this.connect(id).catch((e) => {
          this.notice = String(e);
          this.status = "재접속 대기 (" + this.retries + "/8)";
          this.render();
          this.scheduleReconnect(id);
        });
      },
      Math.min(10000, 1000 * 2 ** this.retries),
    );
  }
  private persistOutbox() {
    try {
      localStorage.setItem(
        "astrotopia.online.outbox." + this.session?.id + "." + this.worldId,
        JSON.stringify([...this.outbox.values()]),
      );
      return true;
    } catch {
      this.notice = "요청 기록을 저장할 공간이 없습니다.";
      return false;
    }
  }
  send(action: string, args: Record<string, unknown> = {}) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.notice = "연결이 끊어졌습니다. 재접속 후 다시 시도하세요.";
      return;
    }
    if (this.outbox.size >= 10) {
      this.notice = "이전 요청의 응답을 기다려 주세요.";
      return;
    }
    const command = { type: "command", id: crypto.randomUUID(), action, args };
    this.outbox.set(command.id, command);
    if (!this.persistOutbox()) {
      this.outbox.delete(command.id);
      return;
    }
    this.socket.send(JSON.stringify(command));
  }
  private async click(action: string, value: string) {
    this.clearInput();
    this.notice = "";
    try {
      if (action === "exit") {
        this.close();
        return;
      }
      if (action === "login") {
        this.session = await this.api("/auth/guest", {
          name: this.value("name") || "탐험가",
        });
        localStorage.setItem(sessionKey, JSON.stringify(this.session));
        await this.refreshWorlds();
      } else if (action === "logout") {
        try {
          await this.api("/auth/logout", {});
        } catch {
          /* Local logout remains available after session expiration. */
        }
        this.socket?.close();
        this.socket = null;
        this.view = null;
        this.session = null;
        this.worldId = "";
        this.outbox.clear();
        localStorage.removeItem(sessionKey);
      } else if (action === "refresh") {
        await this.api("/health");
        this.status = "서버 연결 가능";
        if (this.session) await this.refreshWorlds();
      } else if (action === "create") {
        const r = await this.api("/worlds", {
          name: this.value("world-name") || "새로운 개척지",
          limit: Number(this.value("limit")),
        });
        await this.connect(r.id);
        this.panel = "";
      } else if (action === "join") {
        const r = await this.api("/join", { invite: this.value("invite") });
        await this.connect(r.id);
        this.panel = "";
      } else if (action === "connect")
        await this.connect(value || this.worldId);
      else if (action === "lobby") {
        this.socket?.close();
        this.socket = null;
        this.view = null;
        await this.refreshWorlds();
      } else if (action === "panel")
        this.panel = this.panel === value ? "" : value;
      else if (action === "copy" || action === "copyLink") {
        const link = new URL(window.location.href);
        link.searchParams.set("invite", this.view?.world.invite ?? "");
        await navigator.clipboard.writeText(
          action === "copy" ? (this.view?.world.invite ?? "") : link.href,
        );
        this.notice = "초대를 복사했습니다.";
      } else if (action === "profile")
        this.send("profile", {
          classId: this.value("class"),
          color: this.value("color"),
        });
      else if (action === "region") this.send("region", { region: value });
      else if (action === "partyJoin") this.send(action, { party: value });
      else if (action === "role")
        this.send("role", {
          target: this.value("member"),
          role: this.value("role"),
        });
      else if (["kick", "mute", "revive"].includes(action))
        this.send(action, { target: value });
      else if (action === "report")
        this.send("report", {
          target: value,
          reason: "게임 내 신고: 운영자 검토 요청",
        });
      else if (action === "chat") {
        this.send("chat", {
          text: this.value("chat"),
          channel: this.value("channel"),
        });
        const field = this.root.querySelector<HTMLInputElement>("#on-chat");
        if (field) field.value = "";
        return;
      } else if (action === "quick")
        this.send("chat", {
          text: value,
          channel: this.view?.self.party ? "party" : "world",
        });
      else {
        const command =
          colonyCommand(action, value, (id) => this.value(id)) ??
          expeditionCommand(action, value, (id) => this.value(id));
        if (command) this.send(command.action, command.args);
        else this.send(action);
      }
    } catch (e) {
      this.notice = e instanceof Error ? e.message : String(e);
    }
    this.render();
  }
  frame(c: CanvasRenderingContext2D, dt: number, frame: InputFrame) {
    if (!this.view) {
      this.art.title(c, performance.now() / 1000);
      return;
    }
    const focused = document.activeElement?.matches("input,select,textarea"),
      blocked =
        !!this.panel || focused || this.socket?.readyState !== WebSocket.OPEN;
    if (blocked) this.pending = emptyInput();
    const f = blocked ? emptyInput() : frame;
    for (const k of [
      "jump",
      "dash",
      "heal",
      "interact",
      "special",
      "ultimate",
    ] as const)
      f[k] = !!f[k] || !!this.pending[k];
    if (f.skillSlot === undefined) f.skillSlot = this.pending.skillSlot;
    this.pending = f;
    this.clock += dt;
    this.uiClock += dt;
    if (this.clock >= 0.05) {
      this.clock %= 0.05;
      if (this.socket?.readyState === WebSocket.OPEN) {
        const seq = ++this.sequence;
        this.history.push({ seq, frame: { ...this.pending } });
        this.history = this.history.slice(-8);
        this.socket.send(
          JSON.stringify({ type: "input", seq, frame: this.pending }),
        );
      }
      this.pending = emptyInput();
    }
    if (this.uiClock >= 1) {
      this.uiClock = 0;
      if (this.socket?.readyState === WebSocket.OPEN)
        this.socket.send(JSON.stringify({ type: "ping", at: Date.now() }));
      if (!this.panel || (this.panel !== "chat" && !focused)) this.render();
      else this.updateLive();
    }
    const v = this.view,
      w = this.visual;
    w.region = v.self.region;
    w.player = { ...v.self.body };
    w.time = v.now + Math.min(0.1, (performance.now() - this.received) / 1000);
    w.transition = 0;
    w.regionNotice = 0;
    if (v.extension && this.lastVisualView !== v) {
      const ext = v.extension as unknown as ColonyView;
      const exp = ext as ExpeditionView;
      if (exp.planet) w.space.state.location = exp.planet;
      if (v.extension.civilization)
        w.civilization.state = structuredClone(
          v.extension.civilization,
        ) as typeof w.civilization.state;
      w.colony.state = structuredClone(ext.colony);
      w.survival.state.warehouse = { ...ext.warehouse };
      w.colony.initialize();
    }
    if (!v.self.downUntil && this.socket?.readyState === WebSocket.OPEN) {
      const speed =
          (v.self.classId === "explorer" ? 280 : 250) *
          ((v.self.hasteUntil ?? 0) > v.now ? 1.15 : 1),
        g = (v.extension as unknown as ExpeditionView)?.gravity ?? 0.9;
      for (const packet of this.history)
        for (let t = 0; t < 0.05; t += 1 / 120)
          movePlayer(
            w.player,
            {
              ...packet.frame,
              jump: t === 0 && packet.frame.jump,
              dash: t === 0 && packet.frame.dash,
            },
            1 / 120,
            w.map.platforms,
            g,
            { speed, energy: 100, regen: 12 },
          );
      w.player.x = Math.max(0, Math.min(w.map.width - w.player.w, w.player.x));
    }
    w.camera.x = Math.max(0, Math.min(w.map.width - 1280, w.player.x - 600));
    w.camera.y = 170;
    w.enemies = v.mobs
      .filter((m) => m.hp > 0)
      .map((m) => ({
        ...createEnemy(m.kind, m.x, m.y, Number(m.id)),
        hp: m.hp,
        maxHp: m.maxHp,
        state: m.telegraph ? ("PrepareAttack" as const) : ("Idle" as const),
      }));
    const landscapeKey =
      w.region + ":" + Math.round(w.camera.x) + ":" + Math.floor(v.now * 4);
    if (this.landscapeKey !== landscapeKey) {
      this.art.world(this.landscape.getContext("2d")!, w, true, false);
      this.landscapeKey = landscapeKey;
    }
    c.drawImage(this.landscape, 0, 0);
    this.lastVisualView = v;
    c.save();
    c.translate(-w.camera.x, -w.camera.y);
    for (const enemy of w.enemies)
      if (Math.abs(enemy.x - w.camera.x - 640) < 800)
        this.art.enemy(c, enemy, w.time);
    this.art.player(
      c,
      w.player,
      w.time,
      v.self.classId === "cyberBlade"
        ? "blade"
        : v.self.classId === "ranger"
          ? "rifle"
          : "pulse",
    );
    for (const p of [v.self, ...v.players]) {
      let pos = this.remotes.get(p.id);
      if (
        !pos ||
        Math.abs(pos.x - p.body.x) > 300 ||
        Math.abs(pos.y - p.body.y) > 300
      )
        pos = { x: p.body.x, y: p.body.y };
      pos.x += (p.body.x - pos.x) * Math.min(1, dt * 15);
      pos.y += (p.body.y - pos.y) * Math.min(1, dt * 15);
      this.remotes.set(p.id, pos);
      if (p.id !== v.self.id) this.art.player(c, { ...p.body, ...pos }, v.now);
      c.fillStyle = p.color;
      c.font = "bold 13px sans-serif";
      c.textAlign = "center";
      c.fillText(
        `${classes[p.classId].icon} ${p.name}${p.downUntil ? " · 소생 대기" : ""}`,
        p.body.x + 17,
        p.body.y - 20,
      );
      c.fillStyle = "#102b3b";
      c.fillRect(p.body.x - 8, p.body.y - 12, 50, 4);
      c.fillStyle = p.color;
      c.fillRect(
        p.body.x - 8,
        p.body.y - 12,
        (50 * p.body.hp) / maxHp(p.body.level),
        4,
      );
      if ((p.droneUntil ?? 0) > v.now) {
        c.fillStyle = "#9cdddf";
        c.fillRect(
          p.body.x + 45 + Math.sin(v.now * 3) * 8,
          p.body.y - 25,
          18,
          9,
        );
      }
      if ((p.repairUntil ?? 0) > v.now) {
        c.strokeStyle = "#a7e0ad77";
        c.beginPath();
        c.ellipse(
          p.fieldX ?? p.body.x,
          (p.fieldY ?? p.body.y) + 60,
          220,
          25,
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
      if (p.shieldUntil > v.now) {
        c.strokeStyle = "#b9e7ff";
        c.beginPath();
        c.arc(p.body.x + 17, p.body.y + 32, 49, 0, Math.PI * 2);
        c.stroke();
      }
    }
    for (const m of v.mobs)
      if (m.telegraph > v.now) {
        c.fillStyle = "#ff765b66";
        const range =
          m.pattern === "shock"
            ? 520
            : m.pattern === "laser"
              ? 320
              : m.pattern === "gravity"
                ? 180
                : m.boss
                  ? 260
                  : 80;
        for (const x of m.pattern === "overload"
          ? (m.attackTargets ?? [])
          : [m.attackX])
          c.fillRect(
            x - (m.pattern === "overload" ? 110 : range),
            m.y - 12,
            m.pattern === "overload" ? 220 : range * 2,
            12,
          );
        if (m.pattern) {
          c.font = "bold 17px sans-serif";
          c.fillStyle = "#ffd7a9";
          c.fillText(
            "PHASE " + m.phase + " · " + m.pattern.toUpperCase(),
            m.x,
            440,
          );
        }
      }
    const expedition = v.extension as unknown as ExpeditionView;
    const mission = expedition?.exploration?.missions.find(
      (m) => !m.done && m.kind === "rescue" && m.region === v.self.region,
    );
    if (mission) {
      c.fillStyle = "#f3d09b";
      c.font = "bold 16px sans-serif";
      c.fillText("⌖ 구조 신호 · 응급 키트 필요", 1500, 680);
    }
    const raid = expedition?.exploration?.instances.find(
      (i) => i.id === v.self.instance && i.kind === "raid",
    );
    if (raid) {
      const count = raid.roster.length === 4 ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const x = count === 4 ? 1800 + i * 400 : 2100 + i * 800;
        c.fillStyle = raid.exposedUntil > v.now ? "#adf3c4" : "#af9ee4";
        c.fillRect(x - 20, 710, 40, 70);
        c.font = "bold 14px sans-serif";
        c.fillText("보조 장치 " + (i + 1), x, 690);
      }
      c.font = "bold 22px sans-serif";
      c.fillStyle = "#f0d4b2";
      c.fillText("STELLAR COLOSSUS", 2500, 400);
    }
    for (const ping of v.pings ?? []) {
      c.fillStyle = "#f2d493";
      c.font = "bold 18px sans-serif";
      c.fillText(
        "⌖ " + (v.members.find((m) => m.id === ping.from)?.name ?? ""),
        ping.x,
        ping.y - 75,
      );
    }
    c.restore();
    this.renderedFrames++;
    const now = performance.now();
    if (this.lastFrame) this.samples.push(now - this.lastFrame);
    this.lastFrame = now;
    this.samples = this.samples.slice(-600);
  }
  private updateLive() {
    const e = this.root.querySelector("#on-live");
    if (e)
      e.textContent = `${this.status} · ${this.ping} ms · 서버 ${this.view?.tickMs.toFixed(1)} ms`;
    const chat = this.root.querySelector("#on-chat-log");
    if (chat) chat.innerHTML = this.chatHtml();
  }
  private chatHtml() {
    return (
      this.view?.chat
        .map((m) => `<p><b>${esc(m.name)}</b> ${esc(m.text)}</p>`)
        .join("") ?? ""
    );
  }
  private tutorialHtml(v: View) {
    const c = v.self;
    const steps: [string, boolean][] = [
      ["초대로 같은 월드에 참가하기", true],
      ["A D / SPACE / SHIFT로 이동하기", c.tutorial.includes(2)],
      ["P에서 파티 구성하기", !!c.party],
      ["J로 생명체 공동 조사하기", c.kills > 0],
      [
        "Q E R T 클래스 스킬 사용하기",
        Object.keys(c.cooldowns ?? {}).length > 0,
      ],
      ["개척 화면에서 공동 자원 납품하기", c.tutorial.includes(6)],
      ["권한을 받아 공동 시설 건설하기", c.quests.includes(95)],
      ["전력·생산·연구를 함께 완성하기", c.quests.includes(96)],
      ["준비를 확인한 뒤 행성 원정하기", c.quests.includes(97)],
      ["파티 던전 완료하기", c.quests.includes(98)],
    ];
    return (
      "<ol>" +
      steps
        .map(
          ([label, done], i) =>
            "<li>" +
            (done || c.tutorialSkipped ? "✓ " : "◇ ") +
            (i + 1) +
            ". " +
            label +
            "</li>",
        )
        .join("") +
      "</ol><p>온라인 세계는 메뉴를 열어도 멈추지 않습니다. 공동 창고 출금·건설 권한은 소유자가 정합니다. 소생은 근처의 같은 파티원에게 요청하세요.</p>" +
      button("안내 건너뛰기", "tutorialSkip")
    );
  }
  private render() {
    if (!this.active) return;
    const v = this.view;
    if (!v) {
      this.root.innerHTML = `<div class="online-lobby"><header><span class="online-orbit">✧</span><div><p class="eyebrow">PHASE 10 · UNITED EXPLORERS</p><h1>함께 남기는 첫 발자국.</h1><p>초대받은 탐험가들과 하나의 세계를 공유하세요.</p></div>${button("싱글플레이로 돌아가기", "exit")}</header><div class="online-lobby-grid"><article class="online-identity"><p class="eyebrow">COOPERATIVE EXPEDITION</p><h2>EXPLORE TOGETHER.<br>BUILD TOGETHER.</h2><p class="online-status">● ${esc(this.status)}</p><p>최대 4명 · 비공개 초대 · PvP 없음</p><p>개발용 게스트 계정입니다. 온라인 캐릭터와 싱글플레이 저장은 분리됩니다. 게스트 세션은 8시간 유지됩니다.</p>${button("연결 다시 확인", "refresh")}</article><article>${this.session ? `<h2>${esc(this.session.name)}의 탐험</h2><label>월드 이름<input id="on-world-name" maxlength="40" value="새로운 개척지"></label><label>최대 인원<select id="on-limit"><option>4</option><option>3</option><option>2</option></select></label>${button("새 협동 월드 만들기", "create")}<div class="online-divider"></div><label>초대 코드<input id="on-invite" maxlength="64" value="${esc(new URL(location.href).searchParams.get("invite") ?? "")}" placeholder="소유자가 공유한 초대 코드를 입력하세요"></label>${button("초대로 참가", "join")}<h3>내 월드</h3>${this.worlds.map((w) => button(`${esc(w.name)} <small>${w.count}/${w.limit}</small>`, "connect", w.id)).join("") || "<p>아직 참가한 월드가 없습니다.</p>"}${button("게스트 로그아웃", "logout")}` : `<h2>탐험가 등록</h2><label>호출명<input id="on-name" maxlength="24" placeholder="함께할 탐험가의 이름" value="탐험가"></label>${button("개발용 게스트로 시작", "login")}<p>이 브라우저에 발급된 세션으로 다시 접속할 수 있습니다. 서버가 실행 중이어야 합니다.</p>`}</article></div><p role="status" class="online-notice">${esc(this.notice)}</p><footer>SERVER AUTHORITY · PRIVATE WORLDS · SEPARATE SAVES</footer></div>`;
      return;
    }
    const me = v.self,
      party = v.parties.find((p) => p.id === me.party);
    this.root.innerHTML = `<header class="online-top"><div><span class="eyebrow">UNITED EXPLORERS / ${esc(v.world.name)}</span><h3>${esc(me.name)} <small>Lv.${me.body.level} · ${classes[me.classId].name}</small></h3><div class="online-hp"><i style="width:${(100 * me.body.hp) / maxHp(me.body.level)}%"></i></div><span>HP ${Math.ceil(me.body.hp)} / ${maxHp(me.body.level)} · EP ${Math.floor(me.body.energy)}</span></div><div><span id="on-live">${esc(this.status)} · ${this.ping} ms · 서버 ${v.tickMs.toFixed(1)} ms</span><strong>${regions[me.region].en}</strong><nav>${button("파티 P", "panel", "party")}${button("월드 L", "panel", "world")}${button("개척", "panel", "colony")}${button("원정", "panel", "expedition")}${button("대화 ↵", "panel", "chat")}</nav></div></header><aside class="online-party">${v.members
      .filter((p) => p.party === me.party && me.party)
      .map(
        (p) =>
          `<p><i class="${p.connected ? "connected" : ""}"></i>${esc(p.name)} <small>${p.ready ? "✓ 준비" : esc(p.region)}</small></p>`,
      )
      .join(
        "",
      )}</aside><div class="online-controls"><span>A D 이동 · SPACE 점프 · SHIFT 대시 · J 공격 · Q E R T 클래스 스킬 · F 채집/캠프 회복 · H 응급 키트</span><p role="status">${esc(this.notice)}</p></div>${me.downUntil ? `<div class="online-downed"><h2>구조 신호 전송 중</h2><p>${Math.ceil(me.downUntil - v.now)}초 후 체크포인트 복귀 · 파티원이 근처에서 3초간 소생 가능</p></div>` : ""}${
      this.panel
        ? `<div class="online-panel"><div class="online-panel-head"><h2>${({ party: "탐험대", world: "월드 관리", chat: "통신 채널", quick: "빠른 신호", colony: "공동 개척", expedition: "행성과 공동 원정", tutorial: "함께하는 탐험 안내" } as Record<string, string>)[this.panel]}</h2>${button("닫기 ESC", "panel", this.panel)}</div>${
            this.panel === "party"
              ? `<p>월드 멤버십과 파티는 별도입니다.</p>${party ? `<p>대장: ${esc(v.members.find((p) => p.id === party.leader)?.name)}</p>${button(me.ready ? "준비 취소" : "준비 완료", "ready")}${button("파티 떠나기", "partyLeave")}` : `${button("새 파티 만들기", "partyCreate")}${v.parties.map((p) => button(`${esc(v.members.find((m) => m.id === p.leader)?.name)}의 파티 (${p.members.length}/4)`, "partyJoin", p.id)).join("")}`}<h3>접속한 탐험가</h3>${v.members
                  .filter((p) => p.connected)
                  .map(
                    (p) =>
                      `<div class="online-member"><b>${esc(p.name)}</b><span>${classes[p.classId].name} · ${p.role}</span>${p.id !== me.id ? `${button("소생", "revive", p.id)}${button("음소거", "mute", p.id)}${button("신고", "report", p.id)}` : ""}</div>`,
                  )
                  .join(
                    "",
                  )}${button("협동 탐험 10단계 안내", "panel", "tutorial")}<h3>클래스 · EDEN 기지에서 변경</h3><select id="on-class">${CLASSES.map((id) => `<option value="${id}" ${id === me.classId ? "selected" : ""}>${classes[id].name}</option>`).join("")}</select><input type="color" id="on-color" value="${me.color}">${button("프로필 적용", "profile")}<p>${onlineAbilities[me.classId].map((name, i) => `${["Q", "E", "R", "T"][i]} · ${name} (${Math.max(0, Math.ceil((me.cooldowns?.[i] ?? 0) - v.now))}초)`).join("<br>")}</p>`
              : this.panel === "world"
                ? `${v.world.invite ? `<label>초대 코드 · 24시간 유효<input readonly value="${esc(v.world.invite)}"></label>${button("초대 복사", "copy")}${button("초대 링크 복사", "copyLink")}${button("초대 폐기·재발급", "invite")}` : "<p>소유자가 공유한 초대로 참가한 비공개 월드입니다.</p>"}<h3>EDEN 지역 출입구</h3>${["crash", "forest", "valley"].map((id) => button(regions[id as keyof typeof regions].name, "region", id)).join("")}${me.region === "valley" ? button("EDEN TITAN 호출", "boss") : ""}${
                    me.role === "OWNER"
                      ? `<h3>멤버 권한</h3><select id="on-member">${v.members
                          .filter((p) => p.id !== me.id)
                          .map(
                            (p) =>
                              `<option value="${p.id}">${esc(p.name)}</option>`,
                          )
                          .join(
                            "",
                          )}</select><select id="on-role">${ROLES.filter(
                          (r) => r !== "OWNER",
                        )
                          .map((r) => `<option>${r}</option>`)
                          .join(
                            "",
                          )}</select>${button("권한 적용", "role")}${v.members
                          .filter((p) => p.id !== me.id)
                          .map((p) =>
                            button(`${esc(p.name)} 추방`, "kick", p.id),
                          )
                          .join("")}`
                      : ""
                  }<h3>개인 가방 · ${me.credits} CR</h3><p>${Object.entries(
                    me.inventory,
                  )
                    .filter(([, n]) => n > 0)
                    .map(
                      ([id, n]) =>
                        `${esc(items[id as keyof typeof items]?.name ?? id)} ${n}`,
                    )
                    .join(
                      " · ",
                    )}</p><p>완료 퀘스트: ${me.quests.join(", ") || "아직 없음"}</p>${button("월드 목록으로", "lobby")}${button("재접속", "connect")}${button("싱글플레이 타이틀", "exit")}`
                : this.panel === "chat"
                  ? `<div id="on-chat-log" class="online-chat-log">${this.chatHtml()}</div><select id="on-channel"><option value="world">월드</option><option value="party">파티</option></select><input id="on-chat" maxlength="200" placeholder="메시지 · 입력 중에는 이동/공격이 멈춥니다">${button("보내기", "chat")}`
                  : this.panel === "quick"
                    ? button("현재 위치에 신호 보내기", "ping") +
                      [
                        "집결해 주세요",
                        "도움이 필요합니다",
                        "회복이 필요합니다",
                        "보스 발견",
                        "자원 발견",
                        "기지로 돌아갑니다",
                        "준비 완료",
                        "잠시 기다려 주세요",
                        "출발합시다",
                        "고맙습니다",
                      ]
                        .map((t) => button(t, "quick", t))
                        .join("")
                    : this.panel === "tutorial"
                      ? this.tutorialHtml(v)
                      : this.panel === "expedition"
                        ? expeditionPanel(v)
                        : colonyPanel(v)
          }</div>`
        : ""
    }`;
  }
}
