import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash } from "node:crypto";
import type { OnlineState } from "../shared/online";
export const opaque = () => randomBytes(24).toString("base64url");
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class Store {
  db: DatabaseSync;
  constructor(file: string) {
    this.db = new DatabaseSync(file);
    const version = Number(
      this.db.prepare("PRAGMA user_version").get()?.user_version ?? 0,
    );
    if (version > 1) {
      this.db.close();
      throw new Error(
        "Database schema is newer than this server. Restore a compatible backup or update the server.",
      );
    }
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, name TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, account TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS worlds(id TEXT PRIMARY KEY, snapshot TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts(world TEXT NOT NULL, actor TEXT NOT NULL, id TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(world, actor, id));
      PRAGMA user_version=1;`);
  }
  guest(name: string) {
    const id = opaque(),
      token = opaque(),
      now = Date.now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO accounts VALUES(?,?,?)").run(id, name, now);
      this.db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run(hash(token), id, now + 8 * 3600000);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return { id, token, name, expires: now + 8 * 3600000 };
  }
  account(token: string) {
    return this.db
      .prepare(
        "SELECT accounts.id, accounts.name FROM sessions JOIN accounts ON accounts.id=sessions.account WHERE token=? AND expires>?",
      )
      .get(hash(token), Date.now()) as { id: string; name: string } | undefined;
  }
  logout(token: string) {
    this.db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
  }
  all() {
    return this.db
      .prepare("SELECT snapshot FROM worlds")
      .all()
      .map((r) => JSON.parse(String(r.snapshot)) as OnlineState);
  }
  save(state: OnlineState) {
    this.db
      .prepare(
        "INSERT INTO worlds VALUES(?,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot",
      )
      .run(state.id, JSON.stringify(state));
  }
  receipt(world: string, actor: string, id: string) {
    return this.db
      .prepare(
        "SELECT fingerprint, result FROM receipts WHERE world=? AND actor=? AND id=?",
      )
      .get(world, actor, id) as
      { fingerprint: string; result: string } | undefined;
  }
  commit(
    state: OnlineState,
    actor: string,
    id: string,
    fingerprint: string,
    result: unknown,
  ) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.save(state);
      this.db
        .prepare("INSERT INTO receipts VALUES(?,?,?,?,?)")
        .run(state.id, actor, id, fingerprint, JSON.stringify(result));
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
