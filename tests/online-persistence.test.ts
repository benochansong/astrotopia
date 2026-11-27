import { it, expect } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { WebSocket } from "ws";
import { copyDatabase } from "../server/backup";
import { Store } from "../server/database";
const pause = (n: number) => new Promise((r) => setTimeout(r, n));
const origin = "http://127.0.0.1:5180";
async function launch(file: string) {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        COOP_PORT: "0",
        COOP_DATABASE: file,
        APP_ORIGIN: origin,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let output = "",
    errors = "";
  child.stdout!.on("data", (b) => {
    output += b;
  });
  child.stderr!.on("data", (b) => {
    errors += b;
  });
  for (let i = 0; i < 200; i++) {
    const found = /port (\d+)/.exec(output);
    if (found)
      return {
        child,
        base: `http://127.0.0.1:${found[1]}`,
        port: Number(found[1]),
      };
    if (child.exitCode !== null) throw new Error(errors);
    await pause(50);
  }
  child.kill();
  throw new Error("server start timeout " + errors);
}
async function terminate(child: ChildProcess) {
  if (child.exitCode !== null) return;
  const exit = new Promise<void>((r) => child.once("exit", () => r()));
  child.kill("SIGKILL");
  await exit;
}
it("recovers committed state and pending escrow after abrupt process death; backup restores the same ledger", async () => {
  const root = resolve("server/data");
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "restart-")),
    file = resolve(dir, "world.sqlite");
  let app = await launch(file);
  const connections: WebSocket[] = [];
  const api = async (path: string, data: unknown, token = "") => {
    const r = await fetch(app.base + path, {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  };
  const connect = async (token: string, world: string) => {
    const { ticket } = await api("/ticket", { world }, token),
      ws = new WebSocket(`ws://127.0.0.1:${app.port}/socket?ticket=${ticket}`, {
        origin,
      });
    connections.push(ws);
    let latest: any;
    const results = new Map<string, any>();
    ws.on("error", () => {});
    ws.on("message", (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.type === "state") latest = m;
      else if (m.type === "result") results.set(m.id, m);
    });
    await new Promise<void>((r, j) => {
      ws.once("open", () => r());
      ws.once("error", j);
    });
    return {
      get latest() {
        return latest;
      },
      async cmd(
        action: string,
        args: Record<string, unknown>,
        id: string = crypto.randomUUID(),
      ) {
        ws.send(JSON.stringify({ type: "command", id, action, args }));
        for (let i = 0; i < 100; i++) {
          if (results.has(id)) return results.get(id);
          await pause(20);
        }
        throw new Error("result timeout");
      },
    };
  };
  try {
    const a = await api("/auth/guest", { name: "Persistent A" }),
      b = await api("/auth/guest", { name: "Persistent B" }),
      world = await api(
        "/worlds",
        { name: "Durable colony", limit: 4 },
        a.token,
      );
    await api("/join", { invite: world.invite }, b.token);
    const one = await connect(a.token, world.id),
      two = await connect(b.token, world.id);
    await pause(150);
    const transfer = {
      item: "iron",
      count: 3,
      from: "inventory",
      to: "shared",
    };
    expect((await one.cmd("transfer", transfer, "durable-transfer")).ok).toBe(
      true,
    );
    await one.cmd("tradeRequest", { target: b.id });
    await pause(150);
    const trade = one.latest.extension.trades[0].id;
    await two.cmd("tradeAccept", { trade });
    expect(
      (await one.cmd("tradeOffer", { trade, items: { iron: 2 }, credits: 4 }))
        .ok,
    ).toBe(true);
    await copyDatabase(file, resolve(dir, "snapshot.sqlite"));
    await terminate(app.child);
    app = await launch(file);
    const resumed = await connect(a.token, world.id);
    await pause(180);
    expect(resumed.latest.self.inventory.iron).toBe(7);
    expect(resumed.latest.self.credits).toBe(100);
    expect(resumed.latest.extension.trades).toHaveLength(0);
    expect(resumed.latest.extension.warehouse.iron).toBe(3);
    expect(
      (await resumed.cmd("transfer", transfer, "durable-transfer")).ok,
    ).toBe(true);
    await pause(150);
    expect(resumed.latest.self.inventory.iron).toBe(7);
    const backup = new Store(resolve(dir, "snapshot.sqlite"));
    try {
      expect(backup.receipt(world.id, a.id, "durable-transfer")).toBeTruthy();
      expect(backup.all()[0].characters[a.id].inventory.iron).toBe(5);
    } finally {
      backup.close();
    }
    await expect(
      copyDatabase(file, resolve(dir, "snapshot.sqlite")),
    ).rejects.toThrow("unused destination");
  } finally {
    for (const ws of connections) ws.terminate();
    await terminate(app.child);
    if (dirname(resolve(dir)) !== root)
      throw new Error("Unsafe temporary directory");
    rmSync(dir, { recursive: true, force: true });
  }
}, 25000);
