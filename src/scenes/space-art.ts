import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { spaceEnemies } from "../space/regions";
export function spaceBackground(
  c: CanvasRenderingContext2D,
  w: World,
  low = false,
) {
  if (w.region !== "ship" && w.planetId !== "ares") return false;
  const ship = w.region === "ship";
  const g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, ship ? "#07121f" : "#352a3c");
  g.addColorStop(0.6, ship ? "#21374b" : "#b16c50");
  g.addColorStop(1, ship ? "#122430" : "#e2b38a");
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 50; i++) {
    c.fillStyle = "#fce5bd80";
    c.fillRect(
      (i * 173.3 - w.camera.x * 0.03 + 10000) % 1280,
      (i * 79.1) % 280,
      1.5,
      1.5,
    );
  }
  if (ship) {
    for (let i = 0; i < 6; i++) {
      const x = i * 500 - w.camera.x;
      c.fillStyle = "#384e5f";
      c.fillRect(x, 140, 20, 580);
      c.strokeStyle = "#96bdc950";
      c.strokeRect(x + 40, 230, 380, 230);
      c.fillStyle = "#0b1728";
      c.fillRect(x + 43, 233, 374, 224);
      c.fillStyle = "#bdd7da";
      c.font = "18px monospace";
      c.fillText(
        ["COCKPIT", "LIVING QUARTERS", "CARGO HOLD", "ENGINE ROOM", "WORKSHOP"][
          i
        ] ?? "ASTRA-01",
        x + 65,
        515,
      );
      for (let j = 0; j < 7; j++) {
        c.fillStyle = j % 2 ? "#a6c7cb" : "#8caa8a";
        c.fillRect(x + 60 + j * 45, 550, 22, 4);
      }
    }
    return true;
  }
  c.fillStyle = "#f2d6a7";
  c.beginPath();
  c.arc(1040 - w.camera.x * 0.01, 125, 43, 0, Math.PI * 2);
  c.fill();
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = ["#63434d", "#8b584e", "#ac7056"][layer];
    c.beginPath();
    c.moveTo(0, 720);
    for (let x = 0; x <= 1320; x += 40) {
      const wx = x + w.camera.x * (0.08 + layer * 0.08);
      const y =
        360 +
        layer * 100 +
        Math.sin(wx * 0.004 + layer) * 55 +
        Math.sin(wx * 0.011) * 22;
      c.lineTo(x, y);
    }
    c.lineTo(1320, 720);
    c.fill();
  }
  if (w.region === "aresCanyon")
    for (let i = 0; i < 9; i++) {
      const x = ((i * 260 - w.camera.x * 0.35 + 5000) % 2000) - 300;
      c.fillStyle = "#503b3e";
      c.beginPath();
      c.moveTo(x, 720);
      c.lineTo(x + 35, 260 + (i % 3) * 70);
      c.lineTo(x + 130, 235 + (i % 3) * 70);
      c.lineTo(x + 190, 720);
      c.fill();
      c.fillStyle = "#a16f58";
      c.fillRect(x + 90, 380, 10, 280);
    }
  if (w.region === "aresFoundry")
    for (let i = 0; i < 9; i++) {
      const x = ((i * 300 - w.camera.x * 0.3 + 5000) % 2400) - 400;
      c.fillStyle = "#34303a";
      c.fillRect(x, 230 + (i % 3) * 40, 150, 440);
      c.fillStyle = "#dd8a55";
      c.fillRect(x + 25, 300 + (i % 3) * 40, 100, 8);
      c.fillRect(x + 50, 440, 50, 150);
      c.strokeStyle = "#b77b5c";
      c.strokeRect(x - 15, 410, 180, 40);
    }
  if (w.space.storm) {
    c.fillStyle = w.survival.state.equipped.includes("dustHelmet")
      ? "#d9a36a15"
      : "#d9a36a55";
    c.fillRect(0, 0, 1280, 720);
    c.strokeStyle = "#f3d1a65a";
    for (let i = 0; i < (low ? 20 : 70); i++) {
      const x = ((i * 123 + w.time * 380) % 1400) - 100,
        y = (i * 91 + w.time * 25) % 720;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 60, y - 10);
      c.stroke();
    }
  }
  return true;
}
export function spaceEnemy(c: CanvasRenderingContext2D, e: Enemy, t: number) {
  if (!Object.hasOwn(spaceEnemies, e.kind)) return false;
  const d = spaceEnemies[e.kind as keyof typeof spaceEnemies];
  if (e.hp <= 0) return true;
  c.save();
  c.translate(e.x + d.w / 2, e.y + d.h / 2);
  c.scale(e.facing, 1);
  c.fillStyle = e.flash > 0 ? "#fff4d4" : d.color;
  c.strokeStyle = "#edc494";
  c.lineWidth = 4;
  const w = d.w,
    h = d.h;
  if (e.kind === "dustManta") {
    c.beginPath();
    c.moveTo(-w / 2, -Math.sin(t * 5) * 20);
    c.quadraticCurveTo(0, h / 2, w / 2, -Math.sin(t * 5) * 20);
    c.lineTo(0, -h / 2);
    c.fill();
  } else if (e.kind === "ancientDrone" || e.kind === "foundryGuardian") {
    c.fillStyle = "#595963";
    c.fillRect(-w / 2, -h / 2, w, h);
    c.fillStyle = "#f0c483";
    c.fillRect(-w * 0.3, -h * 0.2, w * 0.6, 12);
    c.strokeRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16);
  } else {
    c.beginPath();
    c.ellipse(0, 0, w * 0.38, h * 0.32, 0, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo((i - 1.5) * w * 0.17, side * h * 0.12);
        c.lineTo(
          (i - 1.5) * w * 0.23 + Math.sin(t * 6 + i) * 5,
          side * h * 0.48,
        );
        c.lineTo((i - 1.5) * w * 0.24 + 12, side * h * 0.5);
        c.stroke();
      }
    }
    if (e.kind === "crimsonScorpion" || e.kind === "colossus") {
      c.beginPath();
      c.moveTo(-w * 0.3, 0);
      c.quadraticCurveTo(-w * 0.7, -h * 0.7, 0, -h * 0.7);
      c.stroke();
      c.fillStyle = "#f4b16d";
      c.beginPath();
      c.arc(0, -h * 0.7, 12, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#552d2d";
    c.fillRect(w * 0.15, -10, w * 0.2, 8);
  }
  c.restore();
  c.fillStyle = "#151e2c";
  c.fillRect(e.x, e.y - 15, d.w, 5);
  c.fillStyle = "#e2bb8a";
  c.fillRect(e.x, e.y - 15, (d.w * e.hp) / e.maxHp, 5);
  return true;
}

export function spaceTerrain(c: CanvasRenderingContext2D, w: World) {
  if (w.region !== "ship" && w.planetId !== "ares") return false;
  for (const p of w.map.platforms) {
    if (p.x + p.w < w.camera.x || p.x > w.camera.x + 1280) continue;
    c.fillStyle =
      w.region === "ship"
        ? "#253746"
        : w.region === "aresFoundry"
          ? "#3c343a"
          : "#774c3d";
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle = w.region === "ship" ? "#79989f" : "#cd9872";
    c.fillRect(p.x, p.y, p.w, 7);
    c.strokeStyle = w.region === "ship" ? "#92b9c240" : "#d9aa7a38";
    for (
      let x = Math.max(p.x, Math.floor(w.camera.x / 80) * 80);
      x < p.x + p.w && x < w.camera.x + 1360;
      x += 80
    ) {
      c.beginPath();
      c.moveTo(x, p.y + 18);
      c.lineTo(x + 40, p.y + 32);
      c.lineTo(x + 25, p.y + 60);
      c.stroke();
    }
  }
  return true;
}
