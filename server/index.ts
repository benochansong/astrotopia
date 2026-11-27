import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { WebSocketServer, WebSocket } from "ws";
import { Store, opaque, hash } from "./database";
import { ExpeditionRoom as Room } from "./expedition-room";
import {
  requireThat as need,
  record,
  keys,
  text,
  integer,
  input,
} from "./validation";
import { PROTOCOL, type Command } from "../shared/online";

export interface ServerOptions {
  port?: number;
  host?: string;
  file?: string;
  origins?: string[];
}
export async function startServer(options: ServerOptions = {}) {
  // Guest credentials deliberately cannot become a public production identity system.
  need(
    process.env.NODE_ENV !== "production",
    "Production authentication provider is not configured. Development guest access is disabled in production.",
  );
  const port = options.port ?? Number(process.env.COOP_PORT ?? 5190),
    host = options.host ?? process.env.COOP_HOST ?? "127.0.0.1";
  const origins =
    options.origins ??
    (process.env.APP_ORIGIN ?? "http://127.0.0.1:5180")
      .split(",")
      .map((v) => new URL(v.trim()).origin);
  const file =
    options.file ??
    process.env.COOP_DATABASE ??
    resolve("server/data/worlds.sqlite");
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const store = new Store(file),
    rooms = new Map(store.all().map((s) => [s.id, new Room(s, store)]));
  const tickets = new Map<
    string,
    { id: string; world: string; expires: number; session: string }
  >();
  const sockets = new Map<string, WebSocket>(),
    limits = new Map<string, { count: number; until: number }>();
  const rate = (key: string, max: number, seconds = 60) => {
    let b = limits.get(key);
    if (!b || b.until < Date.now()) {
      b = { count: 0, until: Date.now() + seconds * 1000 };
      limits.set(key, b);
    }
    need(++b.count <= max, "요청이 너무 많습니다. 잠시 후 다시 시도하세요.");
  };
  const send = (res: ServerResponse, status: number, value: unknown) => {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(JSON.stringify(value));
  };
  const body = async (req: IncomingMessage) => {
    let data = "";
    for await (const chunk of req) {
      data += chunk;
      need(Buffer.byteLength(data) <= 8192, "요청이 너무 큽니다.");
    }
    return record(JSON.parse(data || "{}"));
  };
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin))
      return send(res, 403, { error: "허용되지 않은 출처입니다." });
    if (origin) res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-headers", "authorization,content-type");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    try {
      rate(`http:${req.socket.remoteAddress}`, 180);
      const path = new URL(req.url ?? "/", "http://localhost").pathname;
      if (req.method === "GET" && path === "/health")
        return send(res, 200, {
          ok: true,
          protocol: PROTOCOL,
          mode: "development-guests",
          connections: sockets.size,
        });
      if (req.method === "POST" && path === "/auth/guest") {
        rate(`guest:${req.socket.remoteAddress}`, 12);
        const b = await body(req);
        keys(b, ["name"]);
        return send(res, 201, store.guest(text(b.name, 24)));
      }
      const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
      const account = store.account(token);
      need(account, "로그인이 만료되었습니다.");
      if (req.method === "POST" && path === "/auth/logout") {
        store.logout(token);
        for (const [key, ws] of sockets)
          if (key.endsWith(":" + account.id)) ws.close(4001, "logout");
        return send(res, 200, { ok: true });
      }
      if (req.method === "GET" && path === "/worlds")
        return send(
          res,
          200,
          [...rooms.values()]
            .filter(
              (r) =>
                r.state.characters[account.id] &&
                !r.state.banned.includes(account.id),
            )
            .map((r) => ({
              id: r.state.id,
              name: r.state.name,
              count: Object.values(r.state.characters).filter(
                (c) => c.connected,
              ).length,
              limit: r.state.limit,
            })),
        );
      if (req.method === "POST" && path === "/worlds") {
        const b = await body(req);
        keys(b, ["name", "limit"]);
        need(
          [...rooms.values()].filter((r) => r.state.owner === account.id)
            .length < 5,
          "계정당 월드 한도는 5개입니다.",
        );
        const r = Room.create(
          store,
          account,
          text(b.name, 40),
          integer(b.limit ?? 4, 2, 4),
        );
        rooms.set(r.state.id, r);
        return send(res, 201, { id: r.state.id, invite: r.state.invite });
      }
      if (req.method === "POST" && path === "/join") {
        rate(`join:${account.id}`, 10);
        const b = await body(req);
        keys(b, ["invite"]);
        const invite = text(b.invite, 64);
        const r = [...rooms.values()].find(
          (r) =>
            r.state.invite === invite && r.state.inviteExpires > Date.now(),
        );
        need(r, "초대 코드가 없거나 만료되었습니다.");
        r.join(account);
        store.save(r.state);
        return send(res, 200, { id: r.state.id });
      }
      if (req.method === "POST" && path === "/ticket") {
        const b = await body(req);
        keys(b, ["world"]);
        const r = rooms.get(text(b.world));
        need(
          r?.state.characters[account.id] &&
            !r.state.banned.includes(account.id),
          "월드 접근 권한이 없습니다.",
        );
        const ticket = opaque();
        tickets.set(hash(ticket), {
          id: account.id,
          world: r.state.id,
          expires: Date.now() + 15000,
          session: token,
        });
        return send(res, 200, { ticket });
      }
      send(res, 404, { error: "경로를 찾을 수 없습니다." });
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : "요청 실패" });
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 8192,
    perMessageDeflate: false,
  });
  server.on("upgrade", (req, socket, head) => {
    try {
      need(origins.includes(req.headers.origin ?? ""), "출처 오류");
      rate(`ws:${req.socket.remoteAddress}`, 60);
      const url = new URL(req.url ?? "/", "http://localhost");
      need(url.pathname === "/socket", "경로 오류");
      const key = hash(url.searchParams.get("ticket") ?? ""),
        ticket = tickets.get(key);
      tickets.delete(key);
      need(
        ticket && ticket.expires > Date.now() && store.account(ticket.session),
        "접속 티켓이 만료되었습니다.",
      );
      const room = rooms.get(ticket.world)!;
      room.connect(ticket.id);
      const socketKey = `${ticket.world}:${ticket.id}`;
      sockets.get(socketKey)?.close(4002, "session replaced");
      wss.handleUpgrade(req, socket, head, (ws) => {
        sockets.set(socketKey, ws);
        let alive = true,
          budget = 0,
          last = Date.now(),
          sessionCheck = 0;
        const heartbeat = setInterval(() => {
          if (!alive) {
            ws.terminate();
            return;
          }
          alive = false;
          ws.ping();
          if (++sessionCheck % 2 === 0 && !store.account(ticket.session))
            ws.close(4001, "session expired");
        }, 15000);
        ws.on("pong", () => {
          alive = true;
        });
        ws.on("error", () => {});
        ws.on("message", (raw) => {
          try {
            if (Date.now() - last > 1000) {
              last = Date.now();
              budget = 0;
            }
            need(++budget <= 65, "메시지 전송 한도");
            need(!room.state.banned.includes(ticket.id), "추방되었습니다.");
            const m = record(JSON.parse(raw.toString()));
            if (m.type === "ping") {
              keys(m, ["type", "at"]);
              integer(m.at, 0, Number.MAX_SAFE_INTEGER);
              ws.send(JSON.stringify({ type: "pong", at: m.at }));
            } else if (m.type === "input") {
              keys(m, ["type", "seq", "frame"]);
              room.receiveInput(
                ticket.id,
                integer(m.seq, 0, Number.MAX_SAFE_INTEGER),
                input(m.frame),
              );
            } else {
              keys(m, ["type", "id", "action", "args"]);
              need(m.type === "command", "메시지 종류 오류");
              rate(`cmd:${socketKey}`, 20, 1);
              const cmd: Command = {
                type: "command",
                id: text(m.id, 64),
                action: text(m.action, 32),
                args: record(m.args),
              };
              ws.send(JSON.stringify(room.command(ticket.id, cmd)));
            }
          } catch (e) {
            ws.send(
              JSON.stringify({
                type: "result",
                id: "",
                ok: false,
                message: e instanceof Error ? e.message : "메시지 오류",
              }),
            );
            if (budget > 65) ws.close(4008, "rate limit");
          }
        });
        ws.on("close", () => {
          clearInterval(heartbeat);
          if (sockets.get(socketKey) === ws) {
            sockets.delete(socketKey);
            room.disconnect(ticket.id);
          }
        });
        ws.send(JSON.stringify(room.view(ticket.id)));
      });
    } catch {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
    }
  });
  let step = 0,
    tickP95 = 0;
  const tickSamples: number[] = [];
  const timer = setInterval(() => {
    const started = performance.now();
    for (const room of rooms.values()) {
      room.tick(0.05);
      room.tickMs = tickP95;
    }
    if (++step % 2 === 0)
      for (const [key, ws] of sockets) {
        const split = key.indexOf(":"),
          room = rooms.get(key.slice(0, split))!,
          id = key.slice(split + 1);
        if (room.state.banned.includes(id)) {
          ws.close(4003, "kicked");
          continue;
        }
        if (ws.readyState === WebSocket.OPEN) {
          if (ws.bufferedAmount > 256000) ws.close(4009, "slow client");
          else ws.send(JSON.stringify(room.view(id)));
        }
      }
    tickSamples.push(performance.now() - started);
    if (tickSamples.length > 200) tickSamples.shift();
    if (step % 20 === 0) {
      const sorted = [...tickSamples].sort((a, b) => a - b);
      tickP95 =
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ??
        0;
    }
  }, 50);
  const cleanup = setInterval(() => {
    for (const [k, t] of tickets) if (t.expires < Date.now()) tickets.delete(k);
    for (const [k, b] of limits) if (b.until < Date.now()) limits.delete(k);
  }, 30000);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  const actualPort =
    typeof address === "object" && address ? address.port : port;
  let closed = false;
  return {
    server,
    store,
    rooms,
    port: actualPort,
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      clearInterval(cleanup);
      for (const ws of sockets.values()) ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      for (const r of rooms.values()) {
        for (const c of Object.values(r.state.characters)) c.connected = false;
        store.save(r.state);
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
      store.close();
    },
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const app = await startServer();
  console.log(`ASTROTOPIA cooperative development server · port ${app.port}`);
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      void app.close().then(() => process.exit(0));
    });
}
