import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { enemyData, items, type Resource } from "../data/content";
import { environmentGear, facilities, toolsData } from "../survival/catalog";
import { enemyMarks } from "./battle-art";
const box = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  col: string,
  r = 0,
) => {
  c.fillStyle = col;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};
const line = (
  c: CanvasRenderingContext2D,
  points: number[],
  color: string,
  width = 2,
) => {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.stroke();
};
const poly = (c: CanvasRenderingContext2D, points: number[], color: string) => {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath();
  c.fill();
};
const orb = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  col: string,
) => {
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};
const glow = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  col: string,
) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, "transparent");
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
};
export function frontierBackground(
  c: CanvasRenderingContext2D,
  w: World,
  low: boolean,
) {
  if (["crash", "forest", "valley"].includes(w.region)) return false;
  const colors = w.map.palette,
    g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  for (let layer = 0; layer < 3; layer++) {
    c.save();
    c.translate(
      -(w.camera.x * (0.12 + layer * 0.15)) % 450,
      -w.camera.y * (0.07 + layer * 0.1),
    );
    for (let i = -1; i < 5; i++) {
      const x = i * 450,
        base = 620 + layer * 75;
      c.globalAlpha = 0.35 + layer * 0.16;
      if (w.region === "marsh") {
        line(
          c,
          [x, 900, x + 50, base - 170, x - 30, base - 420],
          layer === 2 ? "#223f3a" : "#42675c",
          24 - layer * 4,
        );
        for (let j = 0; j < 5; j++) {
          const y = base - 200 - j * 45;
          poly(
            c,
            [x + 30, y, x + 160, y - 55, x + 80, y + 15, x + 25, y + 28],
            colors[2],
          );
          glow(c, x + 45, y, 12, "#b6db8d70");
        }
      } else if (w.region === "ruins") {
        box(c, x, base - 380, 120, 620, layer === 2 ? "#252b42" : "#403f5b", 4);
        line(
          c,
          [
            x + 20,
            base - 350,
            x + 80,
            base - 350,
            x + 80,
            base - 140,
            x + 20,
            base - 140,
          ],
          colors[2],
          2,
        );
        for (let j = 0; j < 6; j++)
          box(c, x + 35 + (j % 2) * 20, base - 320 + j * 40, 13, 5, colors[2]);
      } else {
        poly(
          c,
          [
            x - 100,
            900,
            x + 40,
            base - 400 - (i % 2) * 90,
            x + 140,
            base - 310,
            x + 220,
            900,
          ],
          layer === 2 ? "#263650" : "#354767",
        );
        poly(
          c,
          [x + 45, base - 400, x + 140, base - 310, x + 160, base],
          colors[2],
        );
        poly(
          c,
          [x + 210, -20, x + 280, 160 + layer * 25, x + 340, -20],
          colors[0],
        );
      }
    }
    c.restore();
  }
  c.globalAlpha = 1;
  if (!low)
    for (let i = 0; i < 35; i++) {
      const x =
          (i * 113 +
            w.time * (w.region === "marsh" ? 8 : 2) -
            w.camera.x * 0.2) %
          1340,
        y = (i * 73 + w.time * 5) % 720;
      orb(c, x, y, i % 3 === 0 ? 2 : 1, colors[2] + "66");
    }
  return true;
}
export function frontierStructures(c: CanvasRenderingContext2D, w: World) {
  for (const l of w.map.landmarks) {
    if (Math.abs(l.x - w.camera.x - 640) > 800) continue;
    if (l.kind === "facility") {
      const f = l.facility!,
        online = w.survival.state.facilities.includes(f),
        col = online ? "#8dd7c4" : "#ba9a87";
      c.save();
      c.translate(l.x, l.y);
      box(c, -34, -56, 68, 56, "#273d50", 5);
      box(c, -30, -66, 60, 22, "#4a6571", 4);
      box(c, -24, -59, 48, 9, col, 2);
      line(c, [-25, -40, -25, -8, 25, -8, 25, -40], col, 2);
      if (f === "refinery") {
        poly(
          c,
          [-18, -13, -9, -36, 3, -20, 15, -42, 22, -13],
          online ? "#dfb886" : "#5d6372",
        );
      } else if (f === "research") {
        orb(c, 0, -27, 13, "#88c6cf55");
        line(c, [-17, -27, 0, -40, 17, -27, 0, -14, -17, -27], col);
      } else if (f === "equipment") {
        line(c, [-15, -15, -15, -37, 17, -37, 17, -25], col, 5);
      } else {
        for (let j = 0; j < 3; j++) box(c, -16, -36 + j * 10, 32, 4, col);
      }
      c.font = "11px sans-serif";
      c.textAlign = "center";
      c.fillStyle = col;
      c.fillText(facilities[f].name, 0, -80);
      if (online && w.survival.state.jobs.some((j) => j.state === "working"))
        orb(c, 25, -52, 2 + Math.sin(w.time * 5), col);
      c.restore();
    } else if (["portal", "relay", "beaconSite", "sentinel"].includes(l.kind)) {
      const col =
        l.kind === "portal"
          ? "#a9d5c5"
          : l.kind === "beaconSite"
            ? "#dccc97"
            : "#c7a9e6";
      box(c, l.x - 15, l.y - 53, 30, 53, "#2b4156", 4);
      line(
        c,
        [
          l.x - 25,
          l.y - 58,
          l.x,
          l.y - 82,
          l.x + 25,
          l.y - 58,
          l.x,
          l.y - 34,
          l.x - 25,
          l.y - 58,
        ],
        col,
        2,
      );
      c.font = "12px sans-serif";
      c.textAlign = "center";
      c.fillStyle = col;
      c.fillText(
        l.kind === "portal"
          ? "F · " +
              (l.target ? (w.map.id === l.target ? "귀환" : l.label) : "이동")
          : l.kind === "relay"
            ? "F · 고대 회로"
            : l.kind === "sentinel"
              ? "F · ABYSS SENTINEL"
              : "비콘 지정 위치",
        l.x,
        l.y - 100,
      );
    }
  }
  if (w.region === "marsh")
    for (const x of [950, 1800, 2600]) {
      c.globalAlpha = 0.38;
      box(c, x, 775, 210, 6, "#b5cd84", 3);
      c.globalAlpha = 1;
    }
}
export function frontierResource(
  c: CanvasRenderingContext2D,
  n: Resource,
  time: number,
) {
  if (["iron", "copper", "crystal", "fiber", "scrap"].includes(n.item))
    return false;
  const col = items[n.item].color,
    id = n.item;
  c.save();
  c.translate(n.x, n.y);
  if (["resin", "enzyme", "spores", "strongFiber"].includes(id)) {
    for (let i = -1; i <= 1; i++) {
      line(
        c,
        [i * 12, 0, i * 15 + Math.sin(time + i) * 3, -20, i * 10, -44],
        col,
        3,
      );
      orb(c, i * 10, -40, 9, col);
      orb(c, i * 10 - 2, -43, 3, "#e6e7ce");
    }
  } else if (
    [
      "circuit",
      "data",
      "ecology",
      "advancedData",
      "ancientData",
      "electronics",
      "alloy",
      "rareAlloy",
    ].includes(id)
  ) {
    box(c, -24, -32, 48, 32, "#455263", 4);
    line(c, [-17, -7, -17, -23, 0, -23, 0, -12, 15, -12, 15, -28], col, 3);
    orb(c, 0, -12, 4, col);
  } else if (
    [
      "denseCrystal",
      "radiant",
      "coreCrystal",
      "rareQuartz",
      "coreShard",
    ].includes(id)
  ) {
    for (let i = -1; i <= 1; i++) {
      const h = 45 + (i === 0 ? 20 : 0);
      poly(
        c,
        [
          i * 17 - 8,
          0,
          i * 17 - 12,
          -h + 12,
          i * 17,
          -h,
          i * 17 + 13,
          -h + 15,
          i * 17 + 9,
          0,
        ],
        col,
      );
      line(c, [i * 17, -h, i * 17 + 3, -8], "#e9dcec", 1);
    }
    glow(c, 0, -25, 65, col + "25");
  } else {
    for (let i = -1; i <= 1; i++)
      poly(
        c,
        [
          i * 15 - 10,
          0,
          i * 15 - 15,
          -17,
          i * 15 - 4,
          -28,
          i * 15 + 12,
          -20,
          i * 15 + 15,
          0,
        ],
        i === 0 ? col : "#536778",
      );
  }
  c.restore();
  return true;
}
export function frontierEnemy(
  c: CanvasRenderingContext2D,
  e: Enemy,
  time: number,
  scanner: boolean,
) {
  if (
    ![
      "bloom",
      "lurker",
      "wraith",
      "guardian",
      "devourer",
      "sentinel",
      "conduit",
      "drone",
    ].includes(e.kind)
  )
    return false;
  const d = enemyData[e.kind],
    scale = e.elite ? 1.25 : 1;
  c.save();
  c.translate(e.x + (d.w * scale) / 2, e.y + d.h * scale);
  c.scale(e.facing * scale, scale);
  if (e.flash > 0) c.filter = "brightness(1.7)";
  const color = d.color;
  if (e.kind === "bloom") {
    for (let i = -2; i <= 2; i++) {
      line(
        c,
        [0, 0, i * 15, -30, i * 13 + Math.sin(time * 2 + i) * 4, -60],
        color,
        4,
      );
      orb(c, i * 12, -65 - Math.abs(i) * 2, 14, i % 2 ? "#6d9580" : color);
    }
    orb(c, 0, -65, 13, "#314747");
    orb(c, 0, -65, 6, "#ece4a3");
  }
  if (e.kind === "lurker") {
    if (e.state === "Idle" && !scanner) c.globalAlpha = 0.25;
    for (let i = -2; i <= 2; i++)
      line(c, [i * 10, -30, i * 14, -18, i * 18, 0], color, 4);
    poly(c, [-25, -10, -32, -30, -15, -53, 17, -48, 30, -25, 20, -8], color);
    orb(c, 18, -30, 4, "#e3c7ac");
  }
  if (e.kind === "wraith") {
    c.translate(0, Math.sin(time * 3) * 8);
    for (let i = -2; i <= 2; i++)
      line(
        c,
        [i * 8, -20, i * 12 + Math.sin(time * 4 + i) * 8, -2, i * 10, -15],
        color + "88",
        4,
      );
    poly(c, [-27, -20, -33, -57, 0, -85, 33, -57, 27, -20, 0, -8], color);
    orb(c, 0, -50, 17, "#55486b");
    orb(c, 0, -50, 7, "#f0d9fb");
  }
  if (e.kind === "guardian") {
    box(c, -34, -70, 68, 60, "#60728b", 7);
    box(c, -22, -106, 44, 33, color, 5);
    line(c, [-15, -92, 17, -92], "#e8d2fd", 4);
    for (const side of [-1, 1]) {
      line(c, [side * 23, -19, side * 30, 0], color, 13);
      box(c, side * 45 - 9, -78, 18, 49, color, 4);
    }
    orb(c, 0, -45, 12, e.shield > 0 ? "#d0a9ed" : "#ecc596");
  }
  if (e.kind === "devourer") {
    for (let i = -2; i <= 2; i++)
      line(c, [i * 20, -30, i * 23, -10, i * 25, 0], color, 6);
    box(c, -61, -63, 114, 45, "#7b7795", 20);
    for (let i = -2; i <= 2; i++)
      poly(
        c,
        [i * 20 - 14, -50, i * 20, -105 + Math.abs(i) * 9, i * 20 + 15, -50],
        color,
      );
    orb(c, 55, -38, 24, "#555d78");
    orb(c, 63, -42, 7, "#dec6ee");
    line(c, [50, -22, 69, -20], "#e9dbb7", 3);
  }
  if (e.kind === "conduit") {
    box(c, -20, -15, 40, 15, "#4a4b68", 4);
    poly(c, [-12, -16, -18, -65, 0, -90, 18, -65, 12, -16], color);
    line(c, [0, -80, 0, -25], "#f7dbff", 3);
  }
  if (e.kind === "drone") {
    poly(c, [-18, -12, -10, -35, 10, -35, 18, -12, 0, -4], color);
    orb(c, 0, -23, 5, "#e3c2f2");
    line(c, [-18, -15, -28, -6, 28, -6, 18, -15], color, 2);
  }
  if (e.kind === "sentinel") {
    c.translate(0, Math.sin(time * 1.7) * 5 - 15);
    for (const side of [-1, 1]) {
      poly(
        c,
        [
          side * 35,
          -185,
          side * 82,
          -195,
          side * 109,
          -150,
          side * 80,
          -109,
          side * 57,
          -136,
        ],
        "#a4abc9",
      );
      poly(
        c,
        [side * 82, -102, side * 108, -65, side * 89, -25, side * 65, -55],
        color,
      );
      line(
        c,
        [side * 50, -153, side * 82, -148, side * 85, -120],
        "#d7b6f2",
        4,
      );
    }
    poly(
      c,
      [-60, -45, -65, -150, -35, -210, 35, -210, 65, -150, 60, -45, 0, -15],
      "#5a607d",
    );
    poly(c, [-44, -138, 0, -185, 44, -138, 34, -65, 0, -42, -34, -65], color);
    orb(c, 0, -116, 31, "#33354f");
    orb(c, 0, -116, 20, e.shield > 0 ? "#ac80e1" : "#f1d299");
    glow(c, 0, -116, 65, e.shield > 0 ? "#ba8cf14d" : "#f5db9655");
    for (let i = 0; i < 4; i++) {
      const a = time * 0.5 + (i * Math.PI) / 2;
      line(
        c,
        [
          Math.cos(a) * 85,
          -116 + Math.sin(a) * 85,
          Math.cos(a + 0.35) * 85,
          -116 + Math.sin(a + 0.35) * 85,
        ],
        e.shield > 0 ? "#d3b8fa" : "#8d8da9",
        7,
      );
    }
  }
  if (e.shield > 0 && e.kind !== "sentinel") {
    c.strokeStyle = "#d2b2ea88";
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, -d.h * 0.5, d.w * 0.65, d.h * 0.65, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  enemyMarks(c, e);
  return true;
}
export function miningTool(c: CanvasRenderingContext2D, w: World) {
  const t = toolsData[w.survival.state.tool - 1];
  c.save();
  c.translate(w.player.x + 17, w.player.y + 29);
  c.scale(w.player.facing, 1);
  box(c, 8, -7, 23 + 5 * t.id, 13, "#42596c", 3);
  line(c, [13, -3, 30 + 5 * t.id, -3], t.color, 3);
  if (t.id > 1) orb(c, 28 + 5 * t.id, 0, 4, t.color);
  else poly(c, [34, -8, 45, -12, 43, 10, 36, 9], "#b4c8c1");
  c.restore();
  if (w.mining) {
    const n = w.mining.node;
    line(
      c,
      [w.player.x + 17 + w.player.facing * 40, w.player.y + 30, n.x, n.y - 20],
      t.color,
      t.id === 1 ? 1 : t.id,
    );
    glow(c, n.x, n.y - 20, 15 + t.id * 5, t.color + "77");
  }
}
export function explorationOverlay(
  c: CanvasRenderingContext2D,
  w: World,
  low: boolean,
) {
  const s = w.survival,
    p = w.player;
  if (s.scanner.remaining > 0) {
    c.strokeStyle = "#b4e7d255";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(
      p.x + 17 - w.camera.x,
      p.y + 30 - w.camera.y,
      ((((7 - s.scanner.remaining) * 140) % 650) + 650) % 650,
      0,
      Math.PI * 2,
    );
    c.stroke();
  }
  if (w.region === "caverns") {
    const x = p.x + 17 - w.camera.x,
      y = p.y + 30 - w.camera.y,
      r = s.state.equipped.includes("light") ? 410 : 155,
      g = c.createRadialGradient(x, y, 50, x, y, r);
    g.addColorStop(0, "#04101c00");
    g.addColorStop(1, "#04101cbb");
    c.fillStyle = g;
    c.fillRect(0, 0, 1280, 720);
  }
  if (w.region === "marsh" && !low) {
    c.globalAlpha = 0.13;
    for (let i = 0; i < 4; i++) {
      const y = 500 + i * 55;
      const g = c.createLinearGradient(0, y, 0, y + 60);
      g.addColorStop(0, "transparent");
      g.addColorStop(0.5, i % 2 ? "#bc9dd0" : "#b4cf8b");
      g.addColorStop(1, "transparent");
      c.fillStyle = g;
      c.fillRect(0, y, 1280, 65);
    }
    c.globalAlpha = 1;
  }
  if (s.state.equipped.length) {
    const col = s.state.equipped.includes("advanced")
      ? "#e0cbab"
      : s.state.equipped.includes("radiation")
        ? "#c7b7e2"
        : "#afd7bd";
    line(
      c,
      [
        p.x + 7 - w.camera.x,
        p.y + 35 - w.camera.y,
        p.x + 25 - w.camera.x,
        p.y + 35 - w.camera.y,
      ],
      col,
      3,
    );
  }
}
