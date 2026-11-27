import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { extremePlanets, type ExtremePlanet } from "../extreme/catalog";
import { extremeEnemies } from "../extreme/regions";
export function extremeBackground(
  c: CanvasRenderingContext2D,
  w: World,
  low = false,
) {
  if (!w.extreme.active) return false;
  if (w.planetId === "aquaria" || w.planetId === "lunaris")
    return oceanMoonBackground(c, w, low);
  if (w.planetId === "inferno") return infernoBackground(c, w, low);
  const p = extremePlanets[w.planetId as ExtremePlanet],
    g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, p.sky[0]);
  g.addColorStop(0.6, p.sky[1]);
  g.addColorStop(1, p.sky[2]);
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = "#d7edff77";
    c.fillRect(
      (i * 191 - w.camera.x * 0.03 + 10000) % 1280,
      (i * 97) % 350,
      1.5,
      1.5,
    );
  }
  c.strokeStyle = "#9affd329";
  c.lineWidth = 25;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    for (let x = 0; x < 1350; x += 30)
      c.lineTo(x, 100 + i * 23 + Math.sin(x * 0.006 + w.time * 0.2 + i) * 55);
    c.stroke();
  }
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = ["#40647b", "#6d9dad", "#99c4c9"][layer];
    for (let i = 0; i < 12; i++) {
      const x =
          ((i * 220 - w.camera.x * (0.08 + layer * 0.12) + 5000) % 2000) - 400,
        top = 300 + layer * 95 - (i % 3) * 50;
      c.beginPath();
      c.moveTo(x, 720);
      c.lineTo(x + 70, top);
      c.lineTo(x + 120, top + 35);
      c.lineTo(x + 185, 720);
      c.fill();
      c.fillStyle = layer === 2 ? "#d8e9df" : "#b2d1dc66";
      c.beginPath();
      c.moveTo(x + 70, top);
      c.lineTo(x + 120, top + 35);
      c.lineTo(x + 95, top + 130);
      c.fill();
      c.fillStyle = ["#40647b", "#6d9dad", "#99c4c9"][layer];
    }
  }
  if (w.region.endsWith("Depths")) {
    c.fillStyle = "#102835bb";
    c.fillRect(0, 0, 1280, 170);
    for (let i = 0; i < 12; i++) {
      c.fillStyle = "#69d1e966";
      const x = i * 120 - ((w.camera.x * 0.2) % 120);
      c.beginPath();
      c.moveTo(x, 120);
      c.lineTo(x + 40, 280 + (i % 3) * 35);
      c.lineTo(x + 80, 120);
      c.fill();
    }
  }
  if (w.region.endsWith("Ruins"))
    for (let i = 0; i < 6; i++) {
      const x = i * 330 - ((w.camera.x * 0.3) % 330);
      c.fillStyle = "#2b4d64";
      c.fillRect(x, 320, 220, 350);
      c.strokeStyle = "#afdfe1";
      c.strokeRect(x + 15, 335, 190, 320);
      c.fillStyle = "#96dbed";
      c.fillRect(x + 40, 375, 140, 8);
      c.font = "40px monospace";
      c.fillText("◇", x + 80, 460);
    }
  if (w.extreme.environment.weather.active) {
    c.fillStyle = "rgba(208,232,233," + 0.13 * (w.settings.fog ?? 1) + ")";
    c.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < (low ? 25 : 90); i++) {
      c.fillStyle = "#e9f4f1aa";
      c.fillRect(
        ((i * 137 + w.time * 130) % 1360) - 40,
        (i * 79 + w.time * 50) % 720,
        3,
        3,
      );
    }
  }
  return true;
}
export function extremeTerrain(c: CanvasRenderingContext2D, w: World) {
  if (!w.extreme.active) return false;
  if (w.planetId === "aquaria" || w.planetId === "lunaris")
    return oceanMoonTerrain(c, w);
  if (w.planetId === "inferno") return infernoTerrain(c, w);
  for (const p of w.map.platforms) {
    if (p.x + p.w < w.camera.x || p.x > w.camera.x + 1300) continue;
    c.fillStyle = "#416879";
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle = "#d3e4df";
    c.fillRect(p.x, p.y, p.w, 8);
    c.strokeStyle = "#a9dce688";
    c.lineWidth = 2;
    for (
      let x = Math.max(p.x, Math.floor(w.camera.x / 100) * 100);
      x < Math.min(p.x + p.w, w.camera.x + 1400);
      x += 100
    ) {
      c.beginPath();
      c.moveTo(x, p.y + 8);
      c.lineTo(x + 35, p.y + 70);
      c.lineTo(x + 80, p.y + 30);
      c.stroke();
    }
  }
  return true;
}
export function extremeEnemy(c: CanvasRenderingContext2D, e: Enemy, t: number) {
  if (!Object.hasOwn(extremeEnemies, e.kind)) return false;
  if (e.hp <= 0) return true;
  if (
    [
      "glowJelly",
      "coralHunter",
      "hydroManta",
      "abyssShark",
      "crystalOctopus",
      "deepWraith",
      "pressureCrab",
      "atlantisGuardian",
      "emperor",
      "voidWisp",
      "meteorCrawler",
      "gravityHunter",
      "cosmicManta",
      "phasePhantom",
      "lunarGolem",
      "quantumDrone",
      "nexusGuardian",
      "archon",
    ].includes(e.kind)
  )
    return oceanMoonEnemy(c, e, t);
  const d = extremeEnemies[e.kind as keyof typeof extremeEnemies];
  if (
    [
      "magmaSlime",
      "obsidianCrawler",
      "lavaSerpent",
      "ashPhantom",
      "infernalBeast",
      "thermalGolem",
      "heliosDrone",
      "reactorGuardian",
      "helios",
    ].includes(e.kind)
  )
    return infernoEnemy(c, e, t);
  c.save();
  c.translate(e.x + d.w / 2, e.y + d.h / 2);
  c.scale(e.facing, 1);
  c.fillStyle = e.flash ? "#ffffff" : d.color;
  c.beginPath();
  c.ellipse(0, 0, d.w * 0.42, d.h * 0.35, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * d.w * 0.15;
    c.fillStyle = i % 2 ? "#d2f2ed" : "#6db1d5";
    c.beginPath();
    c.moveTo(x - 15, -d.h * 0.2);
    c.lineTo(x, -d.h * (0.5 + Math.sin(i) * 0.1));
    c.lineTo(x + 15, -d.h * 0.2);
    c.fill();
  }
  c.fillStyle = "#244b6d";
  c.fillRect(d.w * 0.15, -5, 18, 7);
  if (e.kind === "auroraWisp") {
    c.strokeStyle = "#c2f7e8";
    c.beginPath();
    c.ellipse(0, 0, d.w * 0.7, d.h * 0.15, Math.sin(t), 0, Math.PI * 2);
    c.stroke();
  }
  if (e.kind === "cryoSentinel") {
    c.strokeStyle = "#37596b";
    c.lineWidth = 8;
    c.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
  }
  c.restore();
  c.fillStyle = "#101c2d";
  c.fillRect(e.x, e.y - 15, d.w, 5);
  c.fillStyle = "#a3e0e4";
  c.fillRect(e.x, e.y - 15, (d.w * e.hp) / e.maxHp, 5);
  return true;
}

function infernoBackground(
  c: CanvasRenderingContext2D,
  w: World,
  low: boolean,
) {
  const g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, "#1d142c");
  g.addColorStop(0.65, "#713938");
  g.addColorStop(1, "#bf6043");
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 6; i++) {
    const x = ((i * 390 - w.camera.x * 0.18 + 5000) % 2400) - 500,
      top = 250 + (i % 3) * 60;
    c.fillStyle = "#302334";
    c.beginPath();
    c.moveTo(x - 200, 720);
    c.lineTo(x + 20, top);
    c.lineTo(x + 100, top);
    c.lineTo(x + 300, 720);
    c.fill();
    c.strokeStyle = "#ed8f5d";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(x + 45, top);
    c.lineTo(x + 80, top + 120);
    c.lineTo(x + 30, top + 180);
    c.lineTo(x + 140, 720);
    c.stroke();
    for (let j = 0; j < 5; j++) {
      c.fillStyle = "#5a3f4c77";
      c.beginPath();
      c.ellipse(
        x + 65 + Math.sin(w.time * 0.2 + j) * 20,
        top - 25 - j * 27,
        35 + j * 8,
        22,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
  if (w.region.endsWith("Ruins"))
    for (let i = 0; i < 6; i++) {
      const x = i * 300 - ((w.camera.x * 0.3) % 300);
      c.fillStyle = "#292634";
      c.fillRect(x, 210, 180, 500);
      c.strokeStyle = "#b67c6a";
      c.lineWidth = 12;
      c.strokeRect(x + 25, 260, 130, 300);
      c.fillStyle = "#ec9d5d";
      c.fillRect(x + 75, 340, 30, 230);
    }
  for (let i = 0; i < (low ? 15 : 55); i++) {
    c.fillStyle = "#e9ac7766";
    c.fillRect(
      (i * 151 + w.time * 30) % 1280,
      (i * 83 - w.time * 50 + 10000) % 720,
      2,
      3,
    );
  }
  if (w.extreme.environment.weather.active) {
    c.fillStyle = "#594e6044";
    c.fillRect(0, 0, 1280, 720);
  }
  return true;
}
function infernoTerrain(c: CanvasRenderingContext2D, w: World) {
  for (const p of w.map.platforms) {
    if (p.x + p.w < w.camera.x || p.x > w.camera.x + 1300) continue;
    c.fillStyle = "#292733";
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle = "#74676c";
    c.fillRect(p.x, p.y, p.w, 7);
    for (
      let x = Math.max(p.x, Math.floor(w.camera.x / 110) * 110);
      x < Math.min(p.x + p.w, w.camera.x + 1400);
      x += 110
    ) {
      c.strokeStyle = "#cf765c";
      c.beginPath();
      c.moveTo(x, p.y + 12);
      c.lineTo(x + 40, p.y + 50);
      c.lineTo(x + 25, p.y + 85);
      c.stroke();
    }
  }
  if (w.region.endsWith("Wilds") || w.region.endsWith("Depths"))
    for (const x of [1050, 2350]) {
      c.fillStyle = "#eaa16a";
      c.fillRect(x, 775, 500, 16);
      c.fillStyle = "#c45b41";
      c.fillRect(x, 791, 500, 70);
      for (let i = 0; i < 12; i++) {
        c.fillStyle = "#f7c185";
        c.fillRect(x + i * 40, 784 + Math.sin(w.time * 2 + i) * 5, 25, 3);
      }
    }
  return true;
}
function infernoEnemy(c: CanvasRenderingContext2D, e: Enemy, t: number) {
  const d = extremeEnemies[e.kind as keyof typeof extremeEnemies];
  c.save();
  c.translate(e.x + d.w / 2, e.y + d.h / 2);
  c.scale(e.facing, 1);
  c.fillStyle = e.flash ? "#ffeccc" : "#3c3442";
  if (e.kind === "magmaSlime" || e.kind === "lavaSerpent") {
    c.beginPath();
    c.ellipse(0, Math.sin(t * 5) * 5, d.w * 0.5, d.h * 0.35, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    c.fillRect(-d.w * 0.38, -d.h * 0.4, d.w * 0.76, d.h * 0.8);
    c.fillRect(-d.w * 0.6, -d.h * 0.15, d.w * 0.25, d.h * 0.5);
    c.fillRect(d.w * 0.35, -d.h * 0.15, d.w * 0.25, d.h * 0.5);
  }
  c.strokeStyle = "#b77569";
  c.lineWidth = 5;
  c.strokeRect(-d.w * 0.3, -d.h * 0.3, d.w * 0.6, d.h * 0.6);
  c.fillStyle = "#f3ae66";
  c.beginPath();
  c.arc(0, -d.h * 0.05, Math.min(d.w, d.h) * 0.16, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f0c08a";
  c.fillRect(d.w * 0.15, -d.h * 0.28, 14, 6);
  c.restore();
  c.fillStyle = "#151525";
  c.fillRect(e.x, e.y - 15, d.w, 5);
  c.fillStyle = "#ecb17f";
  c.fillRect(e.x, e.y - 15, (d.w * e.hp) / e.maxHp, 5);
  return true;
}

function oceanMoonBackground(
  c: CanvasRenderingContext2D,
  w: World,
  low: boolean,
) {
  const water = w.planetId === "aquaria",
    g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, water ? "#123e52" : "#070b1e");
  g.addColorStop(1, water ? "#061c30" : "#34324c");
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  if (water) {
    for (let i = 0; i < (w.settings.glow === false ? 0 : 7); i++) {
      c.fillStyle = "#89efd20b";
      c.beginPath();
      c.moveTo(i * 230 - 150, 0);
      c.lineTo(i * 230 + 70, 0);
      c.lineTo(i * 230 + 400 + Math.sin(w.time * 0.2) * 40, 720);
      c.lineTo(i * 230 + 210, 720);
      c.fill();
    }
    for (let layer = 0; layer < 3; layer++)
      for (let i = 0; i < 14; i++) {
        const x =
            ((i * 170 - w.camera.x * (0.1 + layer * 0.1) + 10000) % 1700) - 200,
          y = 650 - layer * 80 - Math.sin(i) * 70 - w.camera.y * 0.07;
        c.strokeStyle = ["#164559", "#256575", "#508d8a"][layer];
        c.lineWidth = 8 - layer * 2;
        c.beginPath();
        c.moveTo(x, y + 170);
        c.bezierCurveTo(x + 20, y + 50, x - 40, y + 40, x, y);
        c.moveTo(x, y + 70);
        c.lineTo(x + 50, y + 30);
        c.moveTo(x, y + 110);
        c.lineTo(x - 45, y + 60);
        c.stroke();
        c.fillStyle = "#80e5c055";
        c.beginPath();
        c.arc(x, y, 6, 0, Math.PI * 2);
        c.fill();
      }
    for (let i = 0; i < (low ? 12 : 35); i++) {
      c.strokeStyle = "#93d6de44";
      c.beginPath();
      c.arc(
        (i * 191 - w.camera.x * 0.4 + 10000) % 1280,
        (i * 173 -
          (w.settings.waterMotion === false ? 0 : w.time) * 24 +
          100000) %
          720,
        2 + (i % 4),
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    if (w.region.endsWith("Ruins"))
      for (let i = 0; i < 6; i++) {
        const x = i * 300 - ((w.camera.x * 0.3) % 300);
        c.fillStyle = "#234c5e";
        c.fillRect(x, 160, 45, 550);
        c.fillRect(x - 20, 155, 85, 35);
        c.fillStyle = "#70b4b577";
        c.fillRect(x + 12, 220, 6, 360);
      }
    c.fillStyle =
      "#000d21" +
      Math.round(
        Math.min(0.6, w.extreme.physics.depth / 2500) *
          (w.settings.fog ?? 1) *
          255,
      )
        .toString(16)
        .padStart(2, "0");
    c.fillRect(0, 0, 1280, 720);
  } else {
    for (let i = 0; i < (low ? 65 : 150); i++) {
      c.fillStyle = i % 7 ? "#a9b6d788" : "#f4d9c6";
      c.fillRect(
        (i * 191 - w.camera.x * 0.025 + 10000) % 1280,
        (i * 137) % 640,
        i % 7 ? 1 : 2,
        i % 7 ? 1 : 2,
      );
    }
    const pg = c.createRadialGradient(990, 120, 20, 1040, 190, 180);
    pg.addColorStop(0, "#c5c6d4");
    pg.addColorStop(0.55, "#777d9f");
    pg.addColorStop(1, "#262d54");
    c.fillStyle = pg;
    c.beginPath();
    c.arc(1040, 190, 170, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#b5a2ce55";
    c.lineWidth = 12;
    c.beginPath();
    c.ellipse(1040, 190, 240, 40, -0.3, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 9; i++) {
      const x = ((i * 220 - w.camera.x * 0.15 + 10000) % 1800) - 200;
      c.fillStyle = "#4d4b64";
      c.beginPath();
      c.ellipse(x, 690, 170, 100 + (i % 3) * 30, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#78728c";
      c.beginPath();
      c.ellipse(x + 20, 640, 45, 12, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (w.region.endsWith("Ruins") || w.region.endsWith("Depths")) {
      c.strokeStyle = "#afa4da66";
      c.lineWidth = 6;
      c.beginPath();
      c.ellipse(600, 280, 180, 150, w.time * 0.03, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(600, 280, 80, 190, -w.time * 0.05, 0, Math.PI * 2);
      c.stroke();
    }
  }
  return true;
}
function oceanMoonTerrain(c: CanvasRenderingContext2D, w: World) {
  const water = w.planetId === "aquaria";
  for (const p of w.map.platforms) {
    if (
      p.x + p.w < w.camera.x ||
      p.x > w.camera.x + 1300 ||
      p.y > w.camera.y + 750 ||
      p.y + p.h < w.camera.y
    )
      continue;
    c.fillStyle = water ? "#31585b" : "#615d73";
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle = water ? "#8fc7ac" : "#b7afbf";
    c.fillRect(p.x, p.y, p.w, 6);
    for (
      let x = Math.max(p.x, Math.floor(w.camera.x / 100) * 100);
      x < Math.min(p.x + p.w, w.camera.x + 1400);
      x += 100
    ) {
      c.strokeStyle = water ? "#6ec7a488" : "#9690ac";
      c.beginPath();
      c.ellipse(x + 45, p.y + 24, 20, 7, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
  return true;
}
function oceanMoonEnemy(c: CanvasRenderingContext2D, e: Enemy, t: number) {
  const d = extremeEnemies[e.kind as keyof typeof extremeEnemies],
    water = [
      "glowJelly",
      "coralHunter",
      "hydroManta",
      "abyssShark",
      "crystalOctopus",
      "deepWraith",
      "pressureCrab",
      "atlantisGuardian",
      "emperor",
    ].includes(e.kind),
    tentacles = ["emperor", "glowJelly", "crystalOctopus"].includes(e.kind);
  c.save();
  c.translate(e.x + d.w / 2, e.y + d.h / 2);
  c.scale(e.facing, 1);
  c.fillStyle = e.flash ? "#fff5e5" : water ? "#5fabb5" : "#8878b4";
  c.strokeStyle = water ? "#97efda" : "#d2b1ff";
  c.lineWidth = 3;
  if (tentacles) {
    c.beginPath();
    c.ellipse(0, -d.h * 0.18, d.w * 0.42, d.h * 0.3, 0, Math.PI, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * d.w * 0.13;
      c.beginPath();
      c.moveTo(x, -5);
      c.bezierCurveTo(
        x + Math.sin(t * 2 + i) * 30,
        30,
        x - 25,
        d.h * 0.3,
        x + Math.sin(t * 2 + i) * 30,
        d.h * 0.5,
      );
      c.stroke();
    }
  } else if (e.kind.includes("Manta") || e.kind === "abyssShark") {
    c.beginPath();
    c.moveTo(d.w * 0.5, 0);
    c.lineTo(-d.w * 0.3, -d.h * 0.45);
    c.lineTo(-d.w * 0.15, 0);
    c.lineTo(-d.w * 0.3, d.h * 0.45);
    c.closePath();
    c.fill();
  } else {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      c.lineTo(Math.cos(a) * d.w * 0.4, Math.sin(a) * d.h * 0.45);
    }
    c.closePath();
    c.fill();
    c.stroke();
    if (!water) {
      c.beginPath();
      c.ellipse(
        0,
        0,
        d.w * 0.6,
        d.h * 0.15,
        Math.sin(t * 0.8) * 0.5,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
  }
  c.fillStyle = water ? "#d7fff2" : "#ecdbff";
  c.beginPath();
  c.arc(d.w * 0.15, -d.h * 0.15, Math.max(5, d.w * 0.04), 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.fillStyle = "#0b182c";
  c.fillRect(e.x, e.y - 15, d.w, 5);
  c.fillStyle = water ? "#94e2d0" : "#c9a4ef";
  c.fillRect(e.x, e.y - 15, (d.w * e.hp) / e.maxHp, 5);
  return true;
}
export function extremePlayerEffects(c: CanvasRenderingContext2D, w: World) {
  const p = w.player,
    v = w.extreme.state.vehicle;
  if (v && v.region === w.region) {
    c.save();
    c.translate(v.mounted ? 0 : v.x - p.x, v.mounted ? 0 : v.y - p.y);
    c.fillStyle = v.kind === "pod" ? "#559da9" : "#9b967e";
    c.strokeStyle = "#d8e3da";
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(p.x + 17, p.y + 40, 65, 35, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    if (v.kind === "rover")
      for (const x of [-27, 60]) {
        c.fillStyle = "#263a45";
        c.beginPath();
        c.arc(p.x + x, p.y + 65, 18, 0, Math.PI * 2);
        c.fill();
      }
    c.restore();
  }
  if (w.extreme.physics.swimming) {
    c.strokeStyle = "#a0eee9aa";
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(
        p.x - 10 + Math.sin(w.time * 2 + i) * 8,
        p.y + 30 - i * 15 - ((w.time * 25) % 15),
        2 + (i % 2),
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
  }
  if (w.planetId === "lunaris" && p.vy < -20 && w.extreme.state.jetEnergy > 0) {
    c.fillStyle = "#96d7f9bb";
    c.beginPath();
    c.moveTo(p.x + 5, p.y + 45);
    c.lineTo(p.x + 15, p.y + 85 + Math.sin(w.time * 30) * 10);
    c.lineTo(p.x + 22, p.y + 45);
    c.fill();
  }
}
