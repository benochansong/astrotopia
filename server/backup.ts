import { backup, DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
export async function copyDatabase(source: string, target: string) {
  source = resolve(source);
  target = resolve(target);
  if (!existsSync(source) || existsSync(target) || source === target)
    throw new Error(
      "Choose an existing source and a new, unused destination. Live databases are never overwritten.",
    );
  mkdirSync(dirname(target), { recursive: true });
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    if (db.prepare("PRAGMA quick_check").get()?.quick_check !== "ok")
      throw new Error("Source database integrity check failed.");
    await backup(db, target);
  } finally {
    db.close();
  }
  const restored = new DatabaseSync(target, { readOnly: true });
  try {
    if (restored.prepare("PRAGMA quick_check").get()?.quick_check !== "ok")
      throw new Error("Backup integrity check failed.");
  } finally {
    restored.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const source =
    process.argv[2] ?? process.env.COOP_DATABASE ?? "server/data/worlds.sqlite";
  const target =
    process.argv[3] ??
    `server/data/backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`;
  await copyDatabase(source, target);
  console.log(`Verified database copy: ${resolve(target)}`);
}
