import { drawColony } from './colony-art';
import {
  frontierBackground,
  frontierStructures,
  frontierResource,
  frontierEnemy,
  miningTool,
  explorationOverlay,
} from "./survival-art";
import {
  drawWeapon,
  drawCreature,
  enemyMarks,
  drawCombat,
  drawTitan,
} from "./battle-art";
import type { WeaponId } from "../combat/types";
import {
  enemyData,
  items,
  regions,
  type EnemyKind,
  type RegionId,
} from "../data/content";
import type { Enemy, Player } from "../core/types";
import type { World } from "../core/world";
const TAU = Math.PI * 2;
const rand = (seed: number) => {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function poly(
  c: CanvasRenderingContext2D,
  points: number[],
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  rotation = 0,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rotation, 0, TAU);
  c.fillStyle = color;
  c.fill();
}
function line(
  c: CanvasRenderingContext2D,
  points: number[],
  color: string,
  width = 1,
) {
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function box(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  r = 0,
) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function glow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}
export function crystal(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color = "#89e4e6",
) {
  c.save();
  c.translate(x, y);
  for (const [dx, angle, s] of [
    [-size * 0.3, -0.28, 0.65],
    [size * 0.28, 0.3, 0.72],
    [0, 0, 1],
  ]) {
    c.save();
    c.translate(dx, 0);
    c.rotate(angle);
    poly(
      c,
      [
        -s * size * 0.19,
        0,
        -s * size * 0.25,
        -s * size * 0.68,
        0,
        -s * size,
        s * size * 0.22,
        -s * size * 0.67,
        s * size * 0.15,
        0,
      ],
      color,
    );
    poly(
      c,
      [
        0,
        -s * size,
        s * size * 0.22,
        -s * size * 0.67,
        s * size * 0.15,
        0,
        0,
        -s * size * 0.1,
      ],
      "#ffffff45",
    );
    line(c, [0, -s * size, 0, -s * size * 0.1], "#eaffff99");
    c.restore();
  }
  c.restore();
}
function fern(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  seed = 1,
) {
  c.save();
  c.translate(x, y);
  for (let i = -2; i <= 2; i++) {
    const lean = i * 0.3;
    const length = size * (0.6 + rand(seed + i) * 0.4);
    const endX = Math.sin(lean) * length,
      endY = -Math.cos(lean) * length;
    line(c, [0, 0, endX, endY], color, 1.4);
    for (let k = 2; k < 7; k++) {
      const t = k / 7,
        bx = endX * t,
        by = endY * t,
        s = length * 0.14 * (1 - t) + 3;
      poly(
        c,
        [
          bx,
          by,
          bx - s,
          by - s * 0.6,
          bx - s * 0.65,
          by - s * 1.25,
          bx + endX * 0.08,
          by - 5,
        ],
        color,
      );
      poly(
        c,
        [
          bx,
          by,
          bx + s,
          by - s * 0.6,
          bx + s * 0.55,
          by - s * 1.2,
          bx + endX * 0.08,
          by - 5,
        ],
        color,
      );
    }
  }
  c.restore();
}
function alienTree(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
  leaf: string,
  seed: number,
) {
  c.save();
  c.translate(x, y);
  const bend = (rand(seed) - 0.5) * 100;
  c.beginPath();
  c.moveTo(-h * 0.065, 0);
  c.bezierCurveTo(h * 0.03, -h * 0.3, -h * 0.12, -h * 0.65, bend, -h);
  c.lineTo(bend + 8, -h);
  c.bezierCurveTo(-h * 0.01, -h * 0.5, h * 0.12, -h * 0.1, h * 0.1, 0);
  c.fillStyle = color;
  c.fill();
  for (let i = 0; i < 7; i++) {
    const t = 0.42 + i * 0.075,
      side = i % 2 ? 1 : -1,
      bx = bend * t,
      by = -h * t,
      ex = bx + side * h * (0.25 - rand(seed + i) * 0.09),
      ey = by - h * 0.14;
    c.beginPath();
    c.moveTo(bx, by + 25);
    c.quadraticCurveTo(ex * 0.6, ey, ex, ey);
    c.quadraticCurveTo(ex * 0.5, ey + 18, bx, by + 40);
    c.fillStyle = color;
    c.fill();
    for (let j = 0; j < 7; j++) {
      const a = -2.8 + j * 0.42;
      c.save();
      c.translate(ex, ey);
      c.rotate(a + (side < 0 ? -0.3 : 0.3));
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(
        -h * 0.035,
        -h * 0.07,
        h * 0.015,
        -h * 0.16,
        h * 0.035,
        -h * 0.2,
      );
      c.bezierCurveTo(h * 0.065, -h * 0.09, h * 0.045, -h * 0.035, 0, 0);
      c.fillStyle = leaf;
      c.fill();
      line(
        c,
        [0, 0, h * 0.018, -h * 0.09, h * 0.035, -h * 0.19],
        "#b8e1b013",
        0.7,
      );
      c.restore();
    }
    if (i % 2 === 0) {
      line(c, [ex, ey, ex + side * 3, ey + 35], leaf);
      ellipse(c, ex + side * 3, ey + 38, 3, 5, "#9be4c876");
    }
  }
  c.restore();
}
export class Art {
  private cache = new Map<string, HTMLCanvasElement>();
  private layer(id: RegionId, depth: number) {
    const key = id + depth;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1000;
    const c = canvas.getContext("2d")!;
    const valley = id === "valley",
      forest = id === "forest";
    if (depth === 0) {
      for (let i = 0; i < 12; i++) {
        const x = i * 185 - 100,
          y = 650 + rand(i + 5) * 110,
          h = 120 + rand(i + 2) * 210;
        poly(
          c,
          [
            x - 250,
            1000,
            x - 160,
            y + 50,
            x - 35,
            y - h + 65,
            x,
            y - h,
            x + 65,
            y - 65,
            x + 230,
            1000,
          ],
          valley ? "#39436c" : "#315866",
        );
        poly(
          c,
          [x, y - h, x + 65, y - 65, x + 230, 1000, x - 10, 1000],
          valley ? "#2c375b" : "#254959",
        );
        line(
          c,
          [x, y - h, x - 5, y - h + 100, x + 30, y - 60, x + 12, y + 30],
          "#b1d2d01f",
          2,
        );
      }
      // Distant ribbons of water remain separate from the playable terrain.
      for (const x of [340, 1080, 1540]) {
        const g = c.createLinearGradient(x, 470, x + 35, 900);
        g.addColorStop(0, "#b3e8e130");
        g.addColorStop(0.6, "#b6ede86a");
        g.addColorStop(1, "#a0dbd900");
        c.fillStyle = g;
        c.fillRect(x, 470, 18, 430);
        line(c, [x + 8, 470, x + 8, 870], "#d7ffff44", 2);
      }
    } else if (depth === 1) {
      poly(
        c,
        [
          0, 650, 120, 590, 290, 670, 440, 560, 620, 640, 800, 570, 1000, 620,
          1170, 560, 1390, 680, 1600, 580, 1800, 640, 1800, 1000, 0, 1000,
        ],
        valley ? "#2c395e" : "#244c50",
      );
      for (let i = 0; i < (forest ? 16 : 12); i++) {
        const x = i * 155 + rand(i) * 50,
          y = 820 + rand(i + 30) * 100,
          h = 150 + rand(i + 40) * (forest ? 300 : 210);
        if (valley) crystal(c, x, y, h, "#57669170");
        else alienTree(c, x, y, h, "#153c44", "#2e6264", i + 1);
      }
    } else {
      for (let i = 0; i < 9; i++) {
        const x = i * 230 + 60,
          y = 950,
          h = 180 + rand(i + 21) * (forest ? 380 : 280);
        if (valley) {
          crystal(c, x, y, h, "#668ca041");
          crystal(c, x + 55, y, h * 0.35, "#809bcc55");
        } else
          alienTree(
            c,
            x,
            y,
            h,
            forest ? "#102f38" : "#19434a",
            forest ? "#2c6560" : "#3c7568",
            i + 30,
          );
      }
    }
    this.cache.set(key, canvas);
    return canvas;
  }
  background(
    c: CanvasRenderingContext2D,
    id: RegionId,
    camera: { x: number; y: number },
    time: number,
    low = false,
  ) {
    const colors = regions[id].palette;
    const sky = c.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, colors[0]);
    sky.addColorStop(0.65, colors[1]);
    sky.addColorStop(1, colors[2]);
    c.fillStyle = sky;
    c.fillRect(0, 0, 1280, 720);
    glow(c, 860, 270, 500, id === "valley" ? "#9c9be929" : "#dcf3bd24");
    for (let i = 0; i < 70; i++) {
      const x = rand(i + 2) * 1280,
        y = rand(i + 8) * 400;
      ellipse(
        c,
        x,
        y,
        rand(i) * 1.3 + 0.3,
        rand(i) * 1.3 + 0.3,
        `rgba(220,242,239,${0.15 + rand(i + 1) * 0.45})`,
      );
    }
    this.planet(
      c,
      910 - camera.x * 0.025,
      165 - camera.y * 0.04,
      id === "valley" ? 115 : 105,
    );
    ellipse(c, 630 - camera.x * 0.015, 115, 14, 14, "#cedbc8b3");
    ellipse(c, 1100 - camera.x * 0.01, 322, 7, 7, "#d9e7d2a8");
    for (let i = 0; i < 5; i++) {
      const x = ((i * 340 + time * 3 - camera.x * 0.04) % 1700) - 200;
      glow(c, x, 250 + (i % 2) * 50, 180, "#e5f4dc08");
    }
    [0, 1, 2].forEach((depth) => {
      const speed = [0.12, 0.3, 0.55][depth];
      const image = this.layer(id, depth),
        offset = -((camera.x * speed) % 1800),
        y = -camera.y * (0.2 + depth * 0.2) - 100;
      c.drawImage(image, offset, y);
      c.drawImage(image, offset + 1800, y);
    });
    const fog = c.createLinearGradient(0, 400, 0, 720);
    fog.addColorStop(0, "transparent");
    fog.addColorStop(1, id === "valley" ? "#7d9bb327" : "#b8d6b027");
    c.fillStyle = fog;
    c.fillRect(0, 400, 1280, 320);
    // A long, subtle ambient light cycle; visual only, never changes visibility of collisions.
    c.fillStyle = `rgba(14,25,58,${0.035 + (Math.sin(time / 40) + 1) * 0.025})`;
    c.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < (low ? 12 : 45); i++) {
      const x =
          ((((rand(i + 70) * 1450 +
            Math.sin(time * 0.2 + i) * 20 -
            camera.x * 0.65) %
            1450) +
            1450) %
            1450) -
          85,
        y = (rand(i + 120) * 650 - time * (2 + rand(i) * 5) + 10000) % 650;
      ellipse(c, x, y, 1 + rand(i), 1 + rand(i), "#d3ffc789");
    }
  }
  planet(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.28);
    c.strokeStyle = "#d1dac844";
    c.lineWidth = 14;
    c.beginPath();
    c.ellipse(0, 0, r * 1.95, r * 0.38, 0, 0, TAU);
    c.stroke();
    c.strokeStyle = "#cfe1d322";
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(0, 0, r * 2.15, r * 0.42, 0, 0, TAU);
    c.stroke();
    const g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, "#c9dac1");
    g.addColorStop(0.4, "#8eafa4");
    g.addColorStop(1, "#24485b");
    ellipse(c, 0, 0, r, r, g as unknown as string);
    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.clip();
    for (let i = 0; i < 18; i++) {
      c.strokeStyle = i % 2 ? "#c2d5ba13" : "#274e5c13";
      c.lineWidth = 3 + rand(i) * 8;
      c.beginPath();
      c.ellipse(0, -r + i * r * 0.13, r * 1.2, r * 0.15, 0, 0, TAU);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = "#d8e4c88c";
    c.lineWidth = 9;
    c.beginPath();
    c.ellipse(0, 0, r * 1.95, r * 0.38, 0, 0, Math.PI);
    c.stroke();
    c.strokeStyle = "#e5edd055";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, r * 2.1, r * 0.41, 0, 0, Math.PI);
    c.stroke();
    c.restore();
  }
  terrain(c: CanvasRenderingContext2D, w: World) {
    const valley = ["valley", "caverns", "ruins", "abyss"].includes(w.region);
    for (const t of w.map.platforms) {
      if (t.x + t.w < w.camera.x - 80 || t.x > w.camera.x + 1360) continue;
      const bottom = t.oneWay ? t.y + 30 : t.y + 300;
      const g = c.createLinearGradient(0, t.y, 0, bottom);
      g.addColorStop(0, valley ? "#4b6472" : "#354f48");
      g.addColorStop(0.22, valley ? "#293b50" : "#263d39");
      g.addColorStop(1, "#0a1e2a");
      const pts = [
        t.x,
        t.y + 5,
        t.x + 10,
        t.y,
        t.x + t.w - 10,
        t.y,
        t.x + t.w,
        t.y + 6,
        t.x + t.w - 14,
        bottom - 9,
        t.x + t.w * 0.7,
        bottom,
        t.x + t.w * 0.4,
        bottom - 9,
        t.x + 15,
        bottom - 3,
      ];
      poly(c, pts, g as unknown as string);
      const start = Math.max(t.x, Math.floor(w.camera.x / 22) * 22);
      for (let x = start; x < t.x + t.w && x < w.camera.x + 1320; x += 22) {
        const r = rand(x);
        poly(
          c,
          [
            x,
            t.y + 3,
            x + 12,
            t.y + r * 3,
            x + 25,
            t.y + 3,
            x + 20,
            t.y + 7 + r * 7,
            x + 5,
            t.y + 8,
          ],
          valley ? "#8abbb5" : "#8fb899",
        );
        if (r > 0.35) {
          line(
            c,
            [x + 5, t.y + 2, x + 3 - r * 5, t.y - 4 - r * 7],
            valley ? "#9ac6c7" : "#b1cc9c",
            1,
          );
          line(
            c,
            [x + 8, t.y + 3, x + 12, t.y - 3 - r * 4],
            valley ? "#7eaca9" : "#7da78a",
            1,
          );
        }
        if (!t.oneWay) {
          poly(
            c,
            [
              x,
              t.y + 20 + r * 70,
              x + 15,
              t.y + 29 + r * 70,
              x + 7,
              t.y + 36 + r * 70,
              x - 8,
              t.y + 33 + r * 70,
            ],
            valley ? "#a1bcd013" : "#b4b88b12",
          );
          if (r > 0.65)
            line(
              c,
              [x, t.y + 22, x + 5, t.y + 46, x - 5, t.y + 65, x + 14, t.y + 95],
              "#071c292c",
              1,
            );
        }
      }
      if (t.oneWay) {
        for (let x = t.x + 25; x < t.x + t.w; x += 55) {
          const length = 15 + rand(x) * 36;
          line(
            c,
            [x, t.y + 25, x + 4, t.y + length + 25, x - 3, t.y + length + 30],
            valley ? "#729bbd66" : "#66a68b99",
            2,
          );
          ellipse(c, x + 4, t.y + length + 20, 3, 5, "#9fe7bc77");
        }
      }
    }
    for (
      let x = Math.floor((w.camera.x - 100) / 100) * 100;
      x < w.camera.x + 1400;
      x += 100
    ) {
      const floor = w.map.platforms.find(
        (t) => !t.oneWay && x > t.x + 10 && x < t.x + t.w - 10,
      );
      if (!floor) continue;
      const seed = x + 19;
      if (rand(seed) > 0.35)
        fern(
          c,
          x,
          floor.y,
          18 + rand(seed + 1) * 30,
          valley ? "#71a2aa" : "#588e73",
          seed,
        );
      if (rand(seed) > 0.72) {
        const sway = Math.sin(w.time * 1.3 + x) * 2;
        line(c, [x + 26, floor.y, x + 30 + sway, floor.y - 38], "#77b69b", 2);
        ellipse(c, x + 30 + sway, floor.y - 38, 10, 5, "#9bdfbb");
        ellipse(c, x + 30 + sway, floor.y - 40, 4, 3, "#e0ffc8");
        glow(c, x + 30 + sway, floor.y - 40, 25, "#a3ecc51b");
      }
    }
  }
  ship(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale = 1,
    flight = false,
  ) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.rotate(flight ? -0.08 : 0.08);
    if (flight) {
      glow(c, -110, 0, 60, "#8feeea75");
      poly(c, [-100, -12, -190, 0, -100, 12], "#a8f3e9aa");
      poly(c, [-100, -5, -160, 0, -100, 6], "#f4ffe3");
    }
    poly(
      c,
      [-85, -12, -45, -58, 20, -42, 80, -17, 115, 2, 78, 29, -72, 25, -112, 5],
      "#becdce",
      "#304956",
    );
    poly(c, [-85, -12, -45, -58, -24, -20, -35, 7, -100, 6], "#6f8c98");
    poly(
      c,
      [-23, -36, 18, -34, 69, -14, 33, -5, -32, -8],
      "#163b4d",
      "#93c9c9",
    );
    poly(c, [-17, -31, 13, -30, 43, -16, -24, -13], "#81bfc166");
    poly(
      c,
      [-15, 10, 50, 6, 79, 29, -5, 28, -55, 55, -79, 48],
      "#526e7b",
      "#263d4a",
    );
    line(c, [-87, 10, 47, 13, 87, 4], "#f3e7bb", 3);
    line(c, [35, -37, 27, -11], "#e9e9d7", 2);
    box(c, -95, -5, 23, 25, "#263c4b", 4);
    box(c, -94, 2, 18, 7, "#73c9cb", 2);
    c.font = "8px monospace";
    c.fillStyle = "#304b58";
    c.fillText("ASTRA—01", -36, 3);
    if (!flight) {
      line(c, [30, -35, 17, -18, 32, -10, 12, 2], "#314654", 2);
      poly(c, [100, 20, 124, 13, 142, 32, 111, 35], "#879da0");
    }
    c.restore();
  }
  landmarks(c: CanvasRenderingContext2D, w: World) {
    if (w.region === "forest" || w.region === "valley") {
      const x = w.region === "forest" ? 2020 : 2910,
        y = 780,
        scale = w.region === "forest" ? 1 : 1.65;
      if (Math.abs(x - w.camera.x - 640) < 900) {
        c.save();
        c.translate(x, y);
        c.scale(scale, scale);
        poly(
          c,
          [
            -100, 0, -95, -55, -75, -105, -29, -134, 23, -130, 70, -92, 100,
            -33, 106, 0,
          ],
          w.region === "forest" ? "#31534e" : "#3a5064",
        );
        c.beginPath();
        c.moveTo(-61, 0);
        c.bezierCurveTo(-72, -100, 43, -125, 63, 0);
        c.fillStyle = "#102934";
        c.fill();
        poly(
          c,
          [-88, -47, -70, -88, -34, -116, -49, -87, -64, -40],
          "#7c98912f",
        );
        if (w.region === "forest") {
          fern(c, -75, -50, 40, "#588d76", 3);
          fern(c, 67, -42, 49, "#6f9c7c", 5);
        } else {
          crystal(c, -65, -20, 45, "#79a6bf");
          crystal(c, 56, -10, 37, "#89afcd");
        }
        glow(c, 0, -28, 40, w.region === "forest" ? "#84d8a216" : "#85b2f01d");
        c.restore();
      }
    }
    for (const l of w.map.landmarks) {
      if (Math.abs(l.x - w.camera.x - 640) > 850) continue;
      const x = l.x,
        y = l.y;
      if (l.kind === "ship") {
        this.ship(c, x, y - 45, 1.1);
        for (let i = 0; i < 5; i++) {
          const rise = (w.time * 14 + i * 27) % 160;
          ellipse(
            c,
            x - 70 + Math.sin(i + rise * 0.01) * 15,
            y - 65 - rise,
            10 + rise * 0.12,
            14 + rise * 0.15,
            "#15313a35",
          );
        }
      }
      if (l.kind === "capsule") {
        ellipse(c, x, y - 7, 31, 8, "#0c243b88");
        box(c, x - 21, y - 70, 42, 65, "#bacdcc", 20);
        box(c, x - 15, y - 62, 30, 37, "#31576a", 14);
        box(c, x - 10, y - 56, 20, 21, "#79bec2a0", 8);
        box(c, x - 15, y - 19, 30, 5, "#719da2", 2);
        line(c, [x - 11, y - 36, x + 11, y - 36], "#b7f5cf", 2);
      }
      if (l.kind === "beacon") {
        poly(
          c,
          [x - 25, y, x - 16, y - 14, x + 16, y - 14, x + 25, y],
          "#708d92",
        );
        box(c, x - 6, y - 67, 12, 56, "#a5b7b3");
        box(c, x - 23, y - 70, 46, 23, "#243f50", 4);
        box(c, x - 17, y - 65, 34, 10, "#d1b876", 2);
        line(c, [x, y - 70, x, y - 108, x + 18, y - 118], "#a9c4bf", 3);
        ellipse(c, x + 18, y - 118, 3, 3, "#e6cd88");
      }
      if (l.kind === "heal") {
        glow(c, x, y - 20, 70, "#a6e9b72b");
        ellipse(c, x, y - 5, 36, 10, "#5f9b9b");
        ellipse(c, x, y - 7, 27, 6, "#b6ecd8");
        poly(
          c,
          [x - 12, y - 12, x - 9, y - 45, x + 9, y - 45, x + 12, y - 12],
          "#9bbfb8",
        );
        const f = Math.sin(w.time * 2) * 4;
        poly(
          c,
          [
            x,
            y - 83 + f,
            x + 15,
            y - 65 + f,
            x,
            y - 49 + f,
            x - 15,
            y - 65 + f,
          ],
          "#a8efd6",
        );
        poly(
          c,
          [x, y - 77 + f, x + 8, y - 65 + f, x, y - 55 + f, x - 8, y - 65 + f],
          "#2b7f83",
        );
      }
      if (l.kind === "chest") {
        const opened = w.progress.opened.includes(l.id);
        box(c, x - 22, y - 28, 44, 27, "#597e83", 4);
        box(c, x - 24, y - 34 - (opened ? 13 : 0), 48, 12, "#a3b6a5", 3);
        box(c, x - 16, y - 23, 32, 6, opened ? "#35565e" : "#cae2ac", 1);
        line(c, [x, y - 33, x, y - 3], "#183a48", 5);
      }
      if (l.kind === "ruin") {
        glow(c, x, y - 140, 170, "#9ca9fd20");
        poly(
          c,
          [
            x - 90,
            y,
            x - 80,
            y - 228,
            x - 44,
            y - 270,
            x + 45,
            y - 270,
            x + 80,
            y - 228,
            x + 92,
            y,
          ],
          "#314354",
          "#6c8491",
        );
        poly(
          c,
          [
            x - 54,
            y,
            x - 50,
            y - 207,
            x - 22,
            y - 230,
            x + 23,
            y - 230,
            x + 51,
            y - 208,
            x + 55,
            y,
          ],
          "#152b3e",
          "#8494a1",
        );
        line(c, [x, y - 224, x, y], "#8adbe177", 2);
        for (let i = 0; i < 5; i++) {
          poly(
            c,
            [
              x - 68,
              y - 40 - i * 37,
              x - 62,
              y - 47 - i * 37,
              x - 57,
              y - 40 - i * 37,
              x - 62,
              y - 33 - i * 37,
            ],
            "#add6da",
          );
          poly(
            c,
            [
              x + 62,
              y - 40 - i * 37,
              x + 68,
              y - 47 - i * 37,
              x + 73,
              y - 40 - i * 37,
              x + 68,
              y - 33 - i * 37,
            ],
            "#add6da",
          );
        }
        ellipse(c, x, y - 190, 12, 12, "#677d8b");
        poly(
          c,
          [x, y - 201, x + 7, y - 190, x, y - 179, x - 7, y - 190],
          "#b3e6e7",
        );
      }
    }
  }
  player(
    c: CanvasRenderingContext2D,
    p: Player,
    time: number,
    weapon: WeaponId = "pulse",
    charge = 0,
    combo = 0,
  ) {
    if (p.invulnerable > 0 && Math.floor(time * 14) % 2 === 0)
      c.globalAlpha = 0.6;
    c.save();
    c.translate(p.x + p.w / 2, p.y + p.h);
    c.scale(p.facing, 1);
    const running = p.animation === "Walk" || p.animation === "Run",
      stride = running ? Math.sin(time * (p.animation === "Run" ? 17 : 10)) : 0;
    if (p.animation === "Death") {
      c.rotate(-1.4);
      c.translate(20, 0);
    }
    if (p.animation === "Dash") c.rotate(0.2);
    const bob = running ? Math.abs(stride) * 2 : Math.sin(time * 2) * 0.7;
    c.translate(0, -bob);
    // Boots and articulated legs.
    for (const [side, phase] of [
      [-1, stride],
      [1, -stride],
    ]) {
      c.save();
      c.translate(side * 7, -22);
      c.rotate(phase * 0.55 + (p.animation === "Jump" ? side * 0.35 : 0));
      box(c, -5, 0, 10, 18, "#172c41", 3);
      box(c, -5, 2, 10, 7, "#b7cbc9", 2);
      box(c, -6, 15, 15, 8, "#b9cfcd", 3);
      box(c, -6, 21, 16, 3, "#213b4b", 1);
      c.restore();
    }
    box(c, -19, -47, 12, 27, "#344f63", 4);
    box(c, -20, -43, 4, 14, "#8ce2da", 2);
    if (p.animation === "Dash" || p.animation === "Jump") {
      poly(c, [-19, -25, -26, -5 - Math.random() * 8, -12, -25], "#83e4dd");
      poly(c, [-18, -25, -19, -11, -14, -25], "#e5ffcf");
    }
    box(c, -12, -45, 25, 26, "#d2e0d8", 7);
    box(c, -12, -26, 25, 6, "#314d62", 2);
    box(c, -6, -41, 15, 12, "#294960", 3);
    box(c, -3, -38, 9, 3, "#89e6dc", 1);
    box(c, -10, -22, 7, 7, "#92aab3", 2);
    // Transparent visor and asymmetric exploration light.
    ellipse(c, 0, -57, 14, 13, "#21384b");
    ellipse(c, 0, -57, 13, 12, "#d6e4db");
    ellipse(c, 4, -56, 10, 8, "#244b63");
    ellipse(c, 6, -58, 7, 5, "#518496");
    ellipse(c, 8, -60, 3, 2, "#b6e0d180");
    line(c, [-3, -63, 8, -62], "#b8f4e1", 1.5);
    box(c, -15, -60, 5, 8, "#7ea4ad", 2);
    ellipse(c, -12, -58, 1.5, 1.5, "#b0f5dd");
    // Far arm, near arm, and pulse blaster.
    box(c, -15, -41, 8, 19, "#acbfbe", 4);
    c.save();
    c.translate(10, -37);
    if (p.animation === "Mining") c.rotate(-0.5 + Math.sin(time * 18) * 0.45);
    else if (p.animation === "Attack") c.translate(-2, 0);
    box(c, -2, -3, 14, 9, "#d6e1d7", 4);
    box(c, 8, 1, 7, 8, "#304d62", 2);
    drawWeapon(c, weapon, time, p.animation === "Attack", charge, combo);
    c.restore();
    c.restore();
    c.globalAlpha = 1;
  }
  enemy(c: CanvasRenderingContext2D, e: Enemy, time: number) {
    if (frontierEnemy(c, e, time, false)) return;
    if (!["slime", "crawler", "manta"].includes(e.kind)) {
      drawCreature(c, e, time);
      return;
    }
    const d = enemyData[e.kind];
    c.save();
    c.translate(e.x + d.w / 2, e.y + d.h);
    c.scale(e.facing * (e.elite ? 1.25 : 1), e.elite ? 1.25 : 1);
    if (e.flash > 0) c.filter = "brightness(1.9)";
    const wiggle = Math.sin(time * 6 + e.id) * 2;
    if (e.kind === "slime") {
      const g = c.createLinearGradient(0, -40, 0, 0);
      g.addColorStop(0, "#b9f0b8");
      g.addColorStop(0.5, "#69bca3");
      g.addColorStop(1, "#327d80");
      c.beginPath();
      c.moveTo(-25, -3);
      c.bezierCurveTo(-27, -12, -20, -18, -18, -25 + wiggle);
      c.bezierCurveTo(-12, -42, 13, -42, 19, -24 + wiggle);
      c.bezierCurveTo(23, -15, 27, -10, 24, -3);
      c.quadraticCurveTo(0, 7, -25, -3);
      c.fillStyle = g;
      c.fill();
      ellipse(c, -7, -26, 5, 8, "#e7ffe873", 0.4);
      ellipse(c, 9, -15, 3, 4, "#204b57");
      ellipse(c, 20, -15, 2, 3, "#204b57");
      ellipse(c, 15, -9, 2, 1, "#214956");
      ellipse(c, 0, -12, 4, 5, "#baffc64d");
    } else if (e.kind === "crawler") {
      for (let i = 0; i < 4; i++) {
        const x = -22 + i * 13,
          step = Math.sin(time * 12 + i) * 3;
        line(c, [x, -16, x - 10, -9, x - 12 + step, 1], "#67766a", 4);
        line(c, [x, -13, x + 7, -6, x + 9 - step, 2], "#bd9871", 3);
      }
      for (let i = 0; i < 4; i++) {
        ellipse(
          c,
          -20 + i * 12,
          -20 + wiggle,
          12,
          13,
          i % 2 ? "#ad8e67" : "#d6b281",
        );
        poly(
          c,
          [
            -27 + i * 12,
            -25,
            -22 + i * 12,
            -44 - (i % 2) * 4,
            -16 + i * 12,
            -26,
          ],
          "#d7c99a",
        );
      }
      ellipse(c, 25, -17, 10, 9, "#486c65");
      ellipse(c, 31, -20, 3, 3, "#ffdc94");
      line(c, [29, -15, 38, -9, 33, -5], "#d8c493", 2);
    } else {
      const flap = Math.sin(time * 4) * 14;
      c.beginPath();
      c.moveTo(-7, -17);
      c.bezierCurveTo(-26, -38 - flap, -43, -34 - flap, -50, -13 - flap);
      c.quadraticCurveTo(-29, -15, 0, 4);
      c.quadraticCurveTo(29, -15, 50, -13 - flap);
      c.bezierCurveTo(43, -34 - flap, 26, -38 - flap, 7, -17);
      c.fillStyle = "#8e95c9";
      c.fill();
      line(c, [-43, -19 - flap, 0, -6, 43, -19 - flap], "#a9d9dd", 2);
      ellipse(c, 0, -12, 10, 18, "#c1cde0");
      line(c, [0, 0, -9, 18, -3, 32], "#9fafd2", 3);
      ellipse(c, 6, -20, 3, 3, "#efffc1");
    }
    c.restore();
    enemyMarks(c, e);
  }
  world(c: CanvasRenderingContext2D, w: World, low = false) {
    if (!frontierBackground(c, w, low))
      this.background(c, w.region, w.camera, w.time, low);
    if(w.region==='crash'&&w.colony.state.enabled&&w.colony.night){c.fillStyle='#08172a55';c.fillRect(0,0,1280,720);}
    c.save();
    c.translate(
      -w.camera.x + (Math.random() - 0.5) * w.camera.shake * w.settings.shake,
      -w.camera.y + (Math.random() - 0.5) * w.camera.shake * w.settings.shake,
    );
    this.terrain(c, w);
    this.landmarks(c, w);
    frontierStructures(c, w);
    drawColony(c,w);
    drawCombat(c, w);
    drawTitan(c, w);
    for (const l of w.map.landmarks)
      if (l.kind === "training" || l.kind === "boss") {
        box(c, l.x - 20, l.y - 65, 40, 65, "#314c63", 6);
        box(
          c,
          l.x - 14,
          l.y - 58,
          28,
          30,
          l.kind === "boss" ? "#bb8ad8" : "#9bd9cd",
          3,
        );
        c.font = "13px sans-serif";
        c.fillStyle = "#e4eee3";
        c.textAlign = "center";
        c.fillText(
          l.kind === "boss" ? "TITAN · F" : "TRAINING · F",
          l.x,
          l.y - 80,
        );
      }
    for (const n of w.map.resources) {
      if (w.cooldowns[n.id] > 0 || Math.abs(n.x - w.camera.x - 640) > 750)
        continue;
      const col = items[n.item].color;
      if (frontierResource(c, n, w.time)) continue;
      if (n.item === "fiber") fern(c, n.x, n.y, 55, col, n.x);
      else if (n.item === "scrap") {
        poly(
          c,
          [
            n.x - 22,
            n.y - 4,
            n.x - 19,
            n.y - 24,
            n.x + 9,
            n.y - 29,
            n.x + 23,
            n.y - 5,
          ],
          col,
        );
        line(c, [n.x - 11, n.y - 22, n.x + 14, n.y - 7], "#516e7c", 3);
      } else crystal(c, n.x, n.y, n.item === "crystal" ? 51 : 32, col);
      ellipse(c, n.x, n.y - 65 + Math.sin(w.time * 2 + n.x) * 3, 2, 2, col);
    }
    for (const d of w.drops) {
      glow(c, d.x, d.y, 22, items[d.item].color + "44");
      crystal(c, d.x, d.y + Math.sin(w.time * 3) * 3, 16, items[d.item].color);
    }
    for (const e of w.enemies)
      if (e.state !== "Death" && Math.abs(e.x - w.camera.x - 640) < 800)
        this.enemy(c, e, w.time);
    for (const b of w.bullets)
      if (b.active) {
        line(
          c,
          [b.x - Math.sign(b.vx) * 19, b.y, b.x, b.y],
          b.color ?? "#97edda",
          Math.min(12, b.radius ?? 4),
        );
        ellipse(c, b.x, b.y, 5, 2, "#efffd3");
      }
    this.player(
      c,
      w.player,
      w.time,
      w.combat.weapons.id,
      w.combat.weapons.charge,
      w.combat.weapons.comboStep,
    );
    if (w.mining) miningTool(c, w);
    for (const p of w.particles)
      if (p.active) {
        c.globalAlpha = Math.min(1, p.life * 2);
        ellipse(c, p.x, p.y, p.size, p.size, p.color);
      }
    c.globalAlpha = 1;
    c.textAlign = "center";
    c.font = 'bold 17px "Segoe UI",sans-serif';
    for (const t of w.settings.damageNumbers ? w.texts : []) {
      c.globalAlpha = Math.min(1, t.life * 2);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;
    if (w.mining) {
      const n = w.mining.node;
      box(c, n.x - 30, n.y - 87, 60, 5, "#173542", 2);
      box(
        c,
        n.x - 30,
        n.y - 87,
        (60 * w.mining.elapsed) / w.survival.mining.duration(n),
        5,
        "#bfeacb",
        2,
      );
    }
    if (["crash", "forest"].includes(w.region)) {
      const x = w.region==="crash"&&w.colony.unlocked?3050:w.map.width-130;
      line(c, [x, 690, x, 775], "#9bccc4", 2);
      poly(
        c,
        [x, 695, x + 48, 695, x + 57, 706, x + 48, 717, x, 717],
        "#294a54",
      );
      c.font = "12px sans-serif";
      c.fillStyle = "#d3ece3";
      c.fillText("NEXT", x + 25, 711);
    }
    c.restore();
    explorationOverlay(c, w, low);
    // Foreground leaves provide a fourth depth layer, confined to the corners.
    if (!low) {
      fern(c, -10, 760, 170, w.region === "valley" ? "#163044" : "#0e3037");
      fern(c, 1295, 755, 140, "#0c2935", 4);
    }
    const shade = c.createLinearGradient(0, 0, 0, 720);
    shade.addColorStop(0, "#07162555");
    shade.addColorStop(0.18, "transparent");
    shade.addColorStop(0.8, "transparent");
    shade.addColorStop(1, "#07162666");
    c.fillStyle = shade;
    c.fillRect(0, 0, 1280, 720);
    if (w.transition > 0) {
      c.fillStyle = `rgba(8,23,36,${Math.min(1, w.transition * 1.5)})`;
      c.fillRect(0, 0, 1280, 720);
    }
  }
  title(c: CanvasRenderingContext2D, time: number) {
    this.background(c, "crash", { x: time * 3, y: 80 }, time);
    // An elevated, fern-lined promontory frames the expedition's silhouette.
    poly(
      c,
      [
        650, 720, 757, 637, 845, 626, 918, 593, 1035, 607, 1120, 584, 1280, 622,
        1280, 720,
      ],
      "#163541",
    );
    line(
      c,
      [757, 637, 845, 626, 918, 593, 1035, 607, 1120, 584, 1280, 622],
      "#78a394",
      4,
    );
    for (let i = 0; i < 14; i++)
      fern(
        c,
        780 + i * 40,
        630 - Math.sin(i * 0.3) * 20,
        18 + rand(i) * 30,
        "#476f63",
        i,
      );
    this.ship(
      c,
      890 + Math.sin(time * 0.2) * 35,
      360 + Math.sin(time * 0.5) * 8,
      0.48,
      true,
    );
    this.player(
      c,
      {
        x: 1020,
        y: 540,
        w: 34,
        h: 64,
        facing: -1,
        animation: "Idle",
        invulnerable: 0,
      } as Player,
      time,
    );
    fern(c, 1200, 735, 155, "#0a2934", 9);
    fern(c, 1260, 735, 220, "#0d2c35", 3);
    const veil = c.createLinearGradient(0, 0, 1100, 0);
    veil.addColorStop(0, "#071625dd");
    veil.addColorStop(0.4, "#091d2a77");
    veil.addColorStop(1, "transparent");
    c.fillStyle = veil;
    c.fillRect(0, 0, 1280, 720);
  }
  opening(c: CanvasRenderingContext2D, time: number) {
    this.background(c, "crash", { x: time * 15, y: 0 }, time);
    const step = Math.min(7, Math.floor(time / 3));
    if (step < 5)
      this.ship(
        c,
        450 + time * 18,
        260 + Math.sin(time * 2) * (step > 1 ? 15 : 3),
        1,
        true,
      );
    if (step >= 2 && step <= 4) {
      c.fillStyle = `rgba(140,185,230,${Math.max(0, Math.sin(time * 15)) * 0.2})`;
      c.fillRect(0, 0, 1280, 720);
      for (let i = 0; i < 9; i++)
        line(
          c,
          [
            100 + i * 170,
            0,
            80 + i * 170,
            130,
            130 + i * 170,
            180,
            40 + i * 170,
            400,
          ],
          "#95cbd955",
          2,
        );
    }
    if (step === 5) {
      c.fillStyle = "#05101de8";
      c.fillRect(0, 0, 1280, 720);
    }
    if (step >= 6) {
      poly(c, [0, 580, 1280, 580, 1280, 720, 0, 720], "#1d3d43");
      this.ship(c, 500, 540);
      this.player(
        c,
        {
          x: 665,
          y: 516,
          w: 34,
          h: 64,
          facing: 1,
          animation: "Idle",
          invulnerable: 0,
        } as Player,
        time,
      );
    }
  }
}
