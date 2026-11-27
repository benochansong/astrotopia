import { afterEach, describe, expect, it } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import { startServer } from "../server/index";
import { emptyInput } from "../src/core/types";
import type { ItemId } from "../src/data/content";
import type { View } from "../shared/online";
const origin = "http://127.0.0.1:5180";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const servers: Awaited<ReturnType<typeof startServer>>[] = [];
afterEach(async () => {
  for (const s of servers.splice(0)) await s.close();
});
async function setup() {
  const server = await startServer({
    port: 0,
    file: ":memory:",
    origins: [origin],
  });
  servers.push(server);
  const base = `http://127.0.0.1:${server.port}`;
  const api = async (path: string, body?: unknown, token = "") => {
    const r = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        origin,
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  };
  const a = (await api("/auth/guest", { name: "A" })).data,
    b = (await api("/auth/guest", { name: "B" })).data;
  const world = (
    await api("/worlds", { name: "Independent connections", limit: 4 }, a.token)
  ).data;
  await api("/join", { invite: world.invite }, b.token);
  const connect = async (account: typeof a, socketPort = server.port) => {
    const ticket = (await api("/ticket", { world: world.id }, account.token))
      .data.ticket;
    const ws = new WebSocket(
      `ws://127.0.0.1:${socketPort}/socket?ticket=${ticket}`,
      { origin },
    );
    let state: View;
    const replies = new Map<string, any>();
    ws.on("message", (data) => {
      const m = JSON.parse(data.toString());
      if (m.type === "state") state = m;
      else if (m.type === "result") replies.set(m.id, m);
    });
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    await pause(120);
    return {
      ws,
      get state() {
        return state!;
      },
      async cmd(
        action: string,
        args: Record<string, unknown> = {},
        id: string = crypto.randomUUID(),
      ) {
        ws.send(JSON.stringify({ type: "command", id, action, args }));
        for (let i = 0; i < 100; i++) {
          if (replies.has(id)) {
            const r = replies.get(id);
            replies.delete(id);
            return r;
          }
          await pause(10);
        }
        throw new Error("command timeout");
      },
      input(frame = emptyInput(), seq = Date.now()) {
        ws.send(JSON.stringify({ type: "input", seq, frame }));
      },
    };
  };
  return {
    server,
    api,
    a,
    b,
    world,
    connect,
    room: server.rooms.get(world.id)!,
  };
}
describe("real WebSocket cooperation — stages A+B", () => {
  it("authenticates two independent clients, rejects forged transforms, isolates regions and preserves HP on reconnect", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    expect(a.state.players.map((p) => p.id)).toContain(t.b.id);
    const start = a.state.self.body.x;
    for (let i = 0; i < 12; i++) {
      a.input({ ...emptyInput(), right: true }, i);
      await pause(50);
    }
    await pause(120);
    expect(a.state.self.body.x).toBeGreaterThan(start + 50);
    expect(a.state.self.body.x).toBeLessThan(start + 220);
    expect(b.state.self.body.x).toBeCloseTo(360);
    a.ws.send(
      JSON.stringify({
        type: "input",
        seq: 99,
        frame: { ...emptyInput(), x: 999999 },
      }),
    );
    await pause(80);
    expect(a.state.self.body.x).toBeLessThan(800);
    const actual = t.room.state.characters[t.a.id];
    actual.body.hp = 43;
    actual.body.x = 360;
    expect((await a.cmd("region", { region: "forest" })).ok).toBe(true);
    await pause(150);
    expect(b.state.players).toHaveLength(0);
    expect(a.state.mobs.length).toBeGreaterThan(0);
    a.ws.close();
    await pause(100);
    const again = await t.connect(t.a);
    expect(again.state.self.body.hp).toBe(43);
    expect(again.state.self.region).toBe("forest");
    expect(again.state.players).toHaveLength(0);
  });
  it("requires actual combat/support participation; awards both players once and enforces skill cooldowns", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    await a.cmd("partyCreate");
    await pause(120);
    const party = t.room.state.characters[t.a.id].party!;
    await b.cmd("partyJoin", { party });
    await b.cmd("profile", { classId: "scientist", color: "#aabbcc" });
    await a.cmd("region", { region: "forest" });
    await b.cmd("region", { region: "forest" });
    // Server-side fixture positions an encounter; clients still send only genuine input packets.
    const pa = t.room.state.characters[t.a.id],
      pb = t.room.state.characters[t.b.id];
    pa.body.x = 450;
    pb.body.x = 440;
    pa.body.hp = 50;
    const m = t.room.state.mobs.find((m) => m.region === "forest")!;
    m.hp = m.maxHp = 24;
    m.x = 700;
    m.homeX = 700;
    b.input({ ...emptyInput(), skillSlot: 0 });
    await pause(120);
    expect(pa.body.hp).toBe(80);
    const skillAt = pb.skillAt;
    b.input({ ...emptyInput(), skillSlot: 0 });
    a.input({ ...emptyInput(), attack: true });
    await pause(220);
    a.input({ ...emptyInput(), attack: true });
    await pause(250);
    expect(pb.skillAt).toBe(skillAt);
    expect(m.hp).toBe(0);
    expect(pa.kills).toBe(1);
    expect(pb.kills).toBe(1);
    expect(pb.quests).toContain(94);
    expect(pa.quests).toContain(93);
    const credits = pa.credits;
    a.input({ ...emptyInput(), attack: true });
    await pause(100);
    expect(pa.credits).toBe(credits);
  });
  it("enforces role changes, private invites, command idempotency and ownership", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    expect((await b.cmd("role", { target: t.a.id, role: "VISITOR" })).ok).toBe(
      false,
    );
    const first = await a.cmd("partyCreate", {}, "same-request");
    expect(first.ok).toBe(true);
    expect(await a.cmd("partyCreate", {}, "same-request")).toEqual(first);
    expect(Object.keys(t.room.state.parties)).toHaveLength(1);
    expect((await a.cmd("partyLeave", {}, "same-request")).ok).toBe(false);
    const old = t.world.invite;
    await a.cmd("invite");
    const guest = (await t.api("/auth/guest", { name: "C" })).data;
    expect((await t.api("/join", { invite: old }, guest.token)).status).toBe(
      400,
    );
    await a.cmd("role", { target: t.b.id, role: "VISITOR" });
    expect((await b.cmd("boss")).ok).toBe(false);
    expect(
      (await t.api("/ticket", { world: t.world.id }, "invalid")).status,
    ).toBe(400);
  });
});
it("handles real delayed WebSocket delivery at 20/50/100/200 ms and stops released movement", async () => {
  const measurements: { delay: number; distance: number; serverMs: number }[] =
    [];
  for (const delay of [20, 50, 100, 200]) {
    const t = await setup();
    const proxy = new WebSocketServer({ port: 0, host: "127.0.0.1" });
    await new Promise<void>((r) => proxy.once("listening", () => r()));
    const upstream: WebSocket[] = [],
      timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void) => timers.push(setTimeout(fn, delay / 2));
    proxy.on("connection", (client, req) => {
      const peer = new WebSocket(`ws://127.0.0.1:${t.server.port}${req.url}`, {
        origin,
      });
      upstream.push(peer);
      const queue: Buffer[] = [];
      peer.on("error", () => client.close());
      client.on("error", () => {});
      peer.on("open", () => {
        for (const data of queue)
          later(() => {
            if (peer.readyState === WebSocket.OPEN) peer.send(data);
          });
      });
      client.on("message", (raw) => {
        const data = Buffer.from(raw as Buffer);
        if (peer.readyState === WebSocket.OPEN)
          later(() => {
            if (peer.readyState === WebSocket.OPEN) peer.send(data);
          });
        else queue.push(data);
      });
      peer.on("message", (raw) =>
        later(() => {
          if (client.readyState === WebSocket.OPEN) client.send(raw);
        }),
      );
      client.on("close", () => peer.close());
    });
    try {
      const a = await t.connect(
        t.a,
        (proxy.address() as { port: number }).port,
      );
      await pause(delay + 150);
      const start = a.state.self.body.x;
      for (let i = 0; i < 12; i++) {
        a.input({ ...emptyInput(), right: true }, i);
        await pause(50);
      }
      a.input(emptyInput(), 12);
      await pause(delay + 350);
      const end = a.state.self.body.x;
      await pause(200);
      expect(a.state.self.body.x - end).toBeLessThan(1);
      expect(end - start).toBeGreaterThan(80);
      expect(end - start).toBeLessThan(220);
      measurements.push({
        delay,
        distance: end - start,
        serverMs: t.room.tickMs,
      });
      a.ws.close();
    } finally {
      for (const timer of timers) clearTimeout(timer);
      for (const ws of proxy.clients) ws.terminate();
      for (const ws of upstream) ws.terminate();
      await new Promise<void>((r) => proxy.close(() => r()));
    }
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    "artifacts/phase10-network-latency.json",
    JSON.stringify(
      {
        transport: "real WebSocket delay proxy; half delay per direction",
        measurements,
      },
      null,
      2,
    ),
  );
}, 15000);
describe("shared resources — stage C gate", () => {
  it("serializes competing construction and withdrawals without double spending", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    await a.cmd("role", { target: t.b.id, role: "ADMIN" });
    const before = t.room.engine.survival.state.warehouse.ironBar!;
    const replies = await Promise.all([
      a.cmd("build", { kind: "solar", x: 3400, y: 780 }),
      b.cmd("build", { kind: "solar", x: 3400, y: 780 }),
    ]);
    expect(replies.filter((r) => r.ok)).toHaveLength(1);
    expect(
      t.room.engine.colony.state.buildings.filter((v) => v.kind === "solar"),
    ).toHaveLength(1);
    expect(t.room.engine.survival.state.warehouse.ironBar).toBeLessThan(before);
    t.room.engine.survival.state.warehouse.iron = 5;
    const transfers = await Promise.all([
      a.cmd("transfer", {
        item: "iron",
        count: 4,
        from: "shared",
        to: "inventory",
      }),
      b.cmd("transfer", {
        item: "iron",
        count: 4,
        from: "shared",
        to: "inventory",
      }),
    ]);
    expect(transfers.filter((r) => r.ok)).toHaveLength(1);
    expect(t.room.engine.survival.state.warehouse.iron).toBe(1);
    expect(
      t.room.state.characters[t.a.id].inventory.iron +
        t.room.state.characters[t.b.id].inventory.iron,
    ).toBe(24);
    await a.cmd("role", { target: t.b.id, role: "MEMBER" });
    expect(
      (
        await b.cmd("transfer", {
          item: "iron",
          count: 1,
          from: "shared",
          to: "inventory",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await b.cmd("transfer", {
          item: "iron",
          count: 1,
          from: "inventory",
          to: "shared",
        })
      ).ok,
    ).toBe(true);
  });
  it("escrows trade offers, resets approval on edits, commits once and refunds disconnects", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    await a.cmd("tradeRequest", { target: t.b.id });
    let trade = t.room.state.trades![0].id;
    await b.cmd("tradeAccept", { trade });
    await a.cmd("tradeOffer", { trade, items: { iron: 3 }, credits: 5 });
    expect(t.room.state.characters[t.a.id].inventory.iron).toBe(7);
    await a.cmd("tradeReady", { trade });
    await b.cmd("tradeReady", { trade });
    await a.cmd("tradeConfirm", { trade });
    await b.cmd("tradeOffer", { trade, items: { copper: 2 }, credits: 0 });
    expect(t.room.state.trades![0].confirmed).toEqual([]);
    expect((await b.cmd("tradeConfirm", { trade })).ok).toBe(false);
    await a.cmd("tradeReady", { trade });
    await b.cmd("tradeReady", { trade });
    await a.cmd("tradeConfirm", { trade });
    const result = await b.cmd("tradeConfirm", { trade }, "commit-once");
    expect(result.ok).toBe(true);
    expect(t.room.state.trades).toHaveLength(0);
    expect(t.room.state.characters[t.a.id].inventory.copper).toBe(12);
    expect(t.room.state.characters[t.b.id].inventory.iron).toBe(13);
    expect(await b.cmd("tradeConfirm", { trade }, "commit-once")).toEqual(
      result,
    );
    expect(t.room.state.characters[t.b.id].credits).toBe(105);
    await a.cmd("tradeRequest", { target: t.b.id });
    trade = t.room.state.trades![0].id;
    await b.cmd("tradeAccept", { trade });
    await a.cmd("tradeOffer", { trade, items: { iron: 2 }, credits: 4 });
    a.ws.close();
    await pause(120);
    expect(t.room.state.trades).toHaveLength(0);
    expect(t.room.state.characters[t.a.id].inventory.iron).toBe(7);
    expect(t.room.state.characters[t.a.id].credits).toBe(95);
  });
  it("uses existing powered production and makes research spend once", async () => {
    const t = await setup(),
      a = await t.connect(t.a);
    const w = t.room.engine;
    for (const [kind, x] of [
      ["solar", 3400],
      ["warehouse", 3560],
      ["refinery", 3720],
      ["lab", 3880],
    ] as const) {
      const { buildings } = await import("../src/colony/catalog");
      for (const [item, n] of Object.entries(buildings[kind].cost))
        w.survival.state.warehouse[item as ItemId] =
          (w.survival.state.warehouse[item as ItemId] ?? 0) + n!;
      expect((await a.cmd("build", { kind, x, y: 780 })).ok).toBe(true);
    }
    const { buildings } = await import("../src/colony/catalog");
    for (const [item, n] of Object.entries(buildings.relay.cost))
      w.survival.state.warehouse[item as ItemId] = n!;
    expect((await a.cmd("build", { kind: "relay", x: 4040, y: 780 })).ok).toBe(
      true,
    );
    for (let i = 0; i < 10; i++) w.colony.tick(1, true);
    const refinery = w.colony.state.buildings.find(
      (b) => b.kind === "refinery" && !b.legacy,
    )!;
    const recipe = w.colony.recipeList(refinery)[0];
    for (const [item, n] of Object.entries(recipe.cost))
      w.survival.state.warehouse[item as ItemId] = n! * 3;
    const result = await a.cmd("configure", {
      building: refinery.id,
      recipe: recipe.id,
      repeat: true,
      target: 999,
    });
    expect(result.ok).toBe(true);
    // The power network is real: supply all four consumers from an additional solar array.
    for (const [item, n] of Object.entries(buildings.solar.cost))
      w.survival.state.warehouse[item as ItemId] =
        (w.survival.state.warehouse[item as ItemId] ?? 0) + n!;
    await a.cmd("build", { kind: "solar", x: 4160, y: 780 });
    for (const [item, n] of Object.entries(buildings.solar.cost))
      w.survival.state.warehouse[item as ItemId] =
        (w.survival.state.warehouse[item as ItemId] ?? 0) + n!;
    await a.cmd("build", { kind: "solar", x: 4400, y: 780 });
    for (let i = 0; i < 60; i++) w.colony.tick(1, true);
    expect(refinery.produced).toBeGreaterThan(0);
    const { colonyTech } = await import("../src/colony/catalog");
    const [id, tech] = Object.entries(colonyTech).find(
      ([, t]) => !t.requires.length,
    )!;
    w.survival.state.researchPoints = tech.points;
    for (const [item, n] of Object.entries(tech.cost))
      w.survival.state.warehouse[item as ItemId] =
        (w.survival.state.warehouse[item as ItemId] ?? 0) + n!;
    expect((await a.cmd("research", { technology: id })).ok).toBe(true);
    expect((await a.cmd("research", { technology: id })).ok).toBe(false);
    expect(t.room.engine.survival.state.researchPoints).toBe(0);
  });
});
describe("expedition, instances and agreement — stages D/E", () => {
  it("requires every boarded player to consent, charges fuel once and keeps planetary warehouses separate", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    await a.cmd("partyCreate");
    await b.cmd("partyJoin", { party: t.room.state.characters[t.a.id].party });
    t.room.exploration.campaign.push("titan");
    t.room.engine.survival.state.warehouse.crystal = 20;
    expect((await a.cmd("shipPropose", { planet: "ares" })).ok).toBe(true);
    const voyage = t.room.exploration.voyages[0].id;
    await a.cmd("shipBoard", { voyage });
    await b.cmd("shipBoard", { voyage });
    await a.cmd("shipReady", { voyage });
    expect((await a.cmd("shipDepart", { voyage })).ok).toBe(false);
    expect(t.room.engine.survival.state.warehouse.crystal).toBe(20);
    await b.cmd("shipReady", { voyage });
    expect((await a.cmd("shipDepart", { voyage }, "launch-once")).ok).toBe(
      true,
    );
    expect(t.room.engine.survival.state.warehouse.crystal).toBe(16);
    await a.cmd("shipDepart", { voyage }, "launch-once");
    expect(t.room.engine.survival.state.warehouse.crystal).toBe(16);
    for (let i = 0; i < 260; i++) t.room.tick(0.05);
    await pause(120);
    expect(a.state.self.region).toBe("aresLanding");
    expect(b.state.self.region).toBe("aresLanding");
    const eden = t.room.engine.survival.state.warehouse.ironBar!,
      ares = t.room.engine.space.state.planets.ares!.local.warehouse.ironBar!;
    expect((await a.cmd("build", { kind: "solar", x: 3400, y: 780 })).ok).toBe(
      true,
    );
    expect(t.room.engine.survival.state.warehouse.ironBar).toBe(eden);
    expect(
      t.room.engine.space.state.planets.ares!.local.warehouse.ironBar,
    ).toBe(ares - 2);
    expect((await b.cmd("build", { kind: "solar", x: 3600, y: 780 })).ok).toBe(
      false,
    );
  });
  it("isolates a party dungeon and gives first-clear rewards only to participants", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    await a.cmd("partyCreate");
    await b.cmd("partyJoin", { party: t.room.state.characters[t.a.id].party });
    for (const c of Object.values(t.room.state.characters)) {
      c.body.level = 5;
      c.ready = true;
    }
    expect((await a.cmd("dungeon", { dungeon: "crystal" })).ok).toBe(true);
    const instance = t.room.exploration.instances[0];
    expect(instance.roster).toHaveLength(2);
    const outsider = (await t.api("/auth/guest", { name: "Outside" })).data;
    await t.api("/join", { invite: t.world.invite }, outsider.token);
    const other = await t.connect(outsider);
    expect(other.state.players).toHaveLength(0);
    expect(other.state.mobs.every((m) => m.instance !== instance.id)).toBe(
      true,
    );
    const boss = t.room.state.mobs.find(
      (m) => m.instance === instance.id && m.boss,
    )!;
    boss.hp = boss.maxHp = 25;
    for (const c of Object.values(t.room.state.characters).filter(
      (p) => p.instance === instance.id,
    )) {
      c.body.x = boss.x - 200;
      c.body.y = 716;
      c.body.facing = 1;
    }
    a.input({ ...emptyInput(), attack: true });
    b.input({ ...emptyInput(), attack: true });
    await pause(420);
    expect(t.room.exploration.instances[0].cleared).toBe(true);
    expect(t.room.state.characters[t.a.id].quests).toContain(98);
    expect(t.room.state.characters[t.b.id].inventory.crystal).toBe(10);
    expect(
      t.room.state.characters[outsider.id].storage.crystal,
    ).toBeUndefined();
    expect((await a.cmd("raid")).ok).toBe(false);
    await a.cmd("instanceLeave");
    expect(t.room.state.characters[t.a.id].instance).toBe("");
  });
  it("counts only eligible ending votes, requires majority and owner final confirmation", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    t.room.exploration.campaign.push("genesisZero");
    for (const c of Object.values(t.room.state.characters))
      c.uniqueRewards = ["campaign:genesisZero"];
    expect((await b.cmd("endingStart")).ok).toBe(false);
    expect((await a.cmd("endingStart")).ok).toBe(true);
    await a.cmd("endingVote", { ending: "harmony" });
    await b.cmd("endingVote", { ending: "freedom" });
    t.room.state.clock += 61;
    t.room.tick(0.05);
    expect(t.room.exploration.vote).toBeNull();
    expect(t.room.exploration.ending).toBe("");
    await a.cmd("endingStart");
    await a.cmd("endingVote", { ending: "harmony" });
    await b.cmd("endingVote", { ending: "harmony" });
    t.room.state.clock += 61;
    t.room.tick(0.05);
    expect(t.room.exploration.vote?.result).toBe("harmony");
    expect((await b.cmd("endingConfirm")).ok).toBe(false);
    expect((await a.cmd("endingConfirm")).ok).toBe(true);
    expect(t.room.exploration.ending).toBe("harmony");
    expect(t.room.engine.omega.state.ending).toBe("harmony");
  });
});
describe("combat and protocol boundaries", () => {
  it("keeps station storage separate and enforces its withdrawal permissions", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    t.room.engine.civilization.state.station.stage = 1;
    expect((await a.cmd("stationVisit")).ok).toBe(true);
    expect((await b.cmd("stationVisit")).ok).toBe(true);
    expect(
      (
        await a.cmd("stationTransfer", {
          item: "iron",
          count: 3,
          deposit: true,
        })
      ).ok,
    ).toBe(true);
    expect(t.room.engine.civilization.state.station.warehouse.iron).toBe(3);
    expect(t.room.engine.survival.state.warehouse.iron ?? 0).toBe(0);
    expect(
      (
        await b.cmd("stationTransfer", {
          item: "iron",
          count: 1,
          deposit: false,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await a.cmd("stationTransfer", {
          item: "iron",
          count: 3,
          deposit: false,
        })
      ).ok,
    ).toBe(true);
    expect(t.room.state.characters[t.a.id].inventory.iron).toBe(10);
    expect((await a.cmd("stationLeave")).ok).toBe(true);
    expect(t.room.state.characters[t.a.id].region).toBe("crash");
  });
  it("interrupts out-of-range revival, restores 30% HP and removes the caster shield on disconnect", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    await a.cmd("partyCreate");
    await b.cmd("partyJoin", { party: t.room.state.characters[t.a.id].party });
    await a.cmd("profile", { classId: "guardian", color: "#aabbcc" });
    a.input({ ...emptyInput(), skillSlot: 0 });
    await pause(100);
    expect(t.room.state.characters[t.b.id].shieldUntil).toBeGreaterThan(
      t.room.state.clock,
    );
    const pa = t.room.state.characters[t.a.id],
      pb = t.room.state.characters[t.b.id];
    pb.body.hp = 0;
    pb.downUntil = t.room.state.clock + 25;
    expect((await a.cmd("revive", { target: pb.id })).ok).toBe(true);
    pa.body.x += 200;
    t.room.tick(0.05);
    expect(t.room.reviving.size).toBe(0);
    expect(pb.body.hp).toBe(0);
    pa.body.x = pb.body.x;
    await a.cmd("revive", { target: pb.id });
    for (let i = 0; i < 65; i++) t.room.tick(0.05);
    expect(pb.body.hp).toBe(30);
    expect(pb.downUntil).toBe(0);
    a.ws.close();
    await pause(100);
    expect(pb.shieldUntil).toBe(0);
  });
  it("rejects prototype targets and oversized packets; full inventory rewards remain recoverable", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    expect(
      (await a.cmd("role", { target: "__proto__", role: "ADMIN" })).ok,
    ).toBe(false);
    expect(Object.prototype).not.toHaveProperty("role");
    const c = t.room.state.characters[t.a.id];
    c.inventory.iron = 99999;
    t.room.loot(c, "iron", 2);
    expect(c.pendingLoot?.iron).toBe(2);
    expect(c.inventory.iron).toBe(99999);
    c.inventory.iron = 0;
    await a.cmd("claimLoot");
    expect(t.room.state.characters[t.a.id].inventory.iron).toBe(2);
    const closed = new Promise<number>((r) =>
      b.ws.once("close", (code) => r(code)),
    );
    b.ws.send("x".repeat(9000));
    expect(await closed).toBe(1009);
    expect((await a.cmd("ping")).ok).toBe(true);
  });
  it("requires distinct raid devices and actual party actors; phases expose different attack patterns", async () => {
    const t = await setup(),
      a = await t.connect(t.a),
      b = await t.connect(t.b);
    await a.cmd("partyCreate");
    await b.cmd("partyJoin", { party: t.room.state.characters[t.a.id].party });
    t.room.exploration.ending = "freedom";
    for (const c of Object.values(t.room.state.characters)) {
      c.ready = true;
      c.body.level = 90;
      c.body.hp = 990;
    }
    expect((await a.cmd("raid")).ok).toBe(true);
    let instance = t.room.exploration.instances[0];
    t.room.state.characters[t.a.id].body.x = 2100;
    t.room.state.characters[t.b.id].body.x = 2100;
    await a.cmd("raidDevice", { device: 0 });
    await b.cmd("raidDevice", { device: 0 });
    expect(instance.exposedUntil).toBe(0);
    t.room.state.characters[t.b.id].body.x = 2900;
    await b.cmd("raidDevice", { device: 1 });
    expect(instance.exposedUntil).toBeGreaterThan(t.room.state.clock);
    const boss = t.room.state.mobs.find(
      (m) => m.instance === instance.id && m.boss,
    )!;
    const actors = Object.values(t.room.state.characters);
    for (const [ratio, pattern] of [
      [1, "laser"],
      [0.74, "shock"],
      [0.49, "gravity"],
      [0.24, "overload"],
    ] as const) {
      boss.hp = boss.maxHp * ratio;
      boss.telegraph = 0;
      boss.nextAttack = 0;
      t.room.enemy(boss, actors, 0.05);
      expect(boss.pattern).toBe(pattern);
      expect(boss.telegraph).toBeGreaterThan(t.room.state.clock);
    }
    const max = boss.maxHp;
    t.room.hit(actors[0], boss, 1);
    expect(boss.maxHp).toBe(Math.round(max * 1.6));
    const scaled = boss.maxHp;
    b.ws.close();
    await pause(100);
    t.room.hit(t.room.state.characters[t.a.id], boss, 1);
    expect(boss.maxHp).toBe(scaled);
  });
});
