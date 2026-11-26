import type { World } from "../core/world";
import type { Building } from "../colony/types";
import { definition, GRID, GROUND, BASE_END } from "../colony/catalog";
import { items } from "../data/content";
const line = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
) => {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
};
const rect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  r = 0,
) => {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};
const circle = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) => {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};
const text = (
  c: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size = 12,
  color = "#d3e6e2",
) => {
  c.font = `${size}px "Segoe UI", sans-serif`;
  c.textAlign = "center";
  c.fillStyle = color;
  c.fillText(s, x, y);
};
export function buildingArt(
  c: CanvasRenderingContext2D,
  b: Building,
  w: World,
  ghost = false,
) {
  const d = definition(b.kind),
    active =
      w.colony.statuses.get(b.id)?.powered &&
      b.enabled &&
      b.hp > 0 &&
      b.remaining <= 0;
  const light = active ? "#8ce9cc" : "#586c77",
    accent =
      d.category === "energy"
        ? "#f2cf83"
        : d.category === "defense"
          ? "#e99886"
          : d.category === "research"
            ? "#c2b1ef"
            : light;
  const x = b.x,
    y = b.y,
    ww = d.w,
    h = d.h,
    t = w.colony.state.day;
  c.save();
  if (b.remaining > 0 && !ghost) c.globalAlpha = 0.45;
  rect(c, x + 6, y - 8, ww - 12, 8, "#112631", 3);
  if (b.kind === "floor") {
    rect(c, x, y - 16, ww, 16, "#718c97", 3);
    for (let i = 0; i < ww; i += 40)
      line(c, x + i, y - 15, x + i + 20, y - 2, "#c6ba85");
  } else if (b.kind === "relay" || b.kind === "lamp") {
    rect(c, x + ww / 2 - 5, y - h + 10, 10, h - 10, "#7196a4");
    rect(c, x + ww / 2 - 25, y - h, 50, 20, "#254656", 5);
    circle(c, x + ww / 2, y - h + 10, 6, accent);
    if (b.kind === "lamp" && active) {
      const g = c.createRadialGradient(
        x + ww / 2,
        y - h,
        0,
        x + ww / 2,
        y - h,
        180,
      );
      g.addColorStop(0, "#f8dfa530");
      g.addColorStop(1, "#f8dfa500");
      rect(c, x - 120, y - h - 100, 320, 260, "transparent");
      c.fillStyle = g;
      c.fillRect(x - 120, y - h - 100, 320, 260);
    }
  } else if (b.kind === "solar") {
    rect(c, x + ww * 0.46, y - 75, 12, 70, "#8ca9ac");
    c.save();
    c.translate(x + ww / 2, y - 70);
    c.rotate(active ? -0.2 + Math.sin(t / 120) * 0.08 : 0.05);
    rect(c, -ww / 2 + 5, -37, ww - 10, 60, "#1a4763", 3);
    for (let i = 1; i < 5; i++)
      line(
        c,
        -ww / 2 + (i * ww) / 5,
        -36,
        -ww / 2 + (i * ww) / 5,
        22,
        "#80b4c0",
        1,
      );
    line(c, -ww / 2 + 6, -7, ww / 2 - 6, -7, "#80b4c0", 1);
    c.restore();
  } else if (b.kind.includes("Turret") || b.kind === "turret") {
    rect(c, x + 15, y - 24, ww - 30, 24, "#627b82", 5);
    c.save();
    c.translate(x + ww / 2, y - 45);
    c.rotate(Math.sin(t * 0.2) * 0.16);
    rect(c, -25, -20, 50, 40, "#355063", 12);
    rect(
      c,
      0,
      -10,
      ww * 0.55,
      15,
      b.kind === "cryoTurret" ? "#85cfea" : "#b7c9b9",
      3,
    );
    circle(c, -10, -3, 6, accent);
    c.restore();
  } else if (b.kind === "radar") {
    rect(c, x + ww / 2 - 10, y - 65, 20, 65, "#597c8b");
    c.save();
    c.translate(x + ww / 2, y - 70);
    c.rotate(active ? Math.sin(t * 0.4) * 0.65 : -0.5);
    c.fillStyle = "#a9c1c0";
    c.beginPath();
    c.arc(0, 0, 44, Math.PI, Math.PI * 2);
    c.closePath();
    c.fill();
    line(c, 0, 0, 0, -65, accent, 4);
    c.restore();
  } else if (b.kind === "wall") {
    rect(c, x + 10, y - h, ww - 20, h, "#4f6d7a", 4);
    for (let i = 0; i < 3; i++)
      rect(
        c,
        x + 16,
        y - h + 12 + i * 22,
        ww - 32,
        8,
        active ? "#8dc7c1" : "#788c91",
      );
  } else if (b.kind === "greenhouse") {
    c.fillStyle = "#4b8c8960";
    c.strokeStyle = "#8cbeb5";
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(x + ww / 2, y - 10, ww / 2 - 8, h - 15, 0, Math.PI, Math.PI * 2);
    c.closePath();
    c.fill();
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const xx = x + 30 + i * 34,
        hh = 20 + Math.max(0, b.progress) * 35;
      line(c, xx, y - 12, xx, y - 12 - hh, "#9ebf78", 4);
      circle(c, xx - 7, y - hh + 1, 9, "#75ab7b");
      circle(c, xx + 7, y - hh - 10, 8, "#b7cf81");
    }
  } else {
    const roof =
      d.category === "habitat"
        ? "#73959d"
        : d.category === "industry"
          ? "#70838d"
          : "#4d6f84";
    rect(c, x + 8, y - h + 18, ww - 16, h - 25, "#193647", 10);
    rect(c, x + 14, y - h + 10, ww - 28, 22, roof, 6);
    rect(c, x + 20, y - 20, ww - 40, 12, "#355568");
    if (b.kind.startsWith("miner")) {
      rect(c, x + ww / 2 - 12, y - 68, 24, 65, "#b6ad8c");
      for (let i = 0; i < 5; i++)
        line(
          c,
          x + ww / 2 - 15,
          y - 60 + i * 12 + (active ? Math.sin(t * 10) * 3 : 0),
          x + ww / 2 + 15,
          y - 70 + i * 12,
          accent,
          4,
        );
      rect(c, x + 20, y - h + 30, ww - 40, 23, "#2d5160", 5);
      circle(c, x + ww / 2, y - h + 41, 6, light);
    } else if (b.kind === "battery") {
      rect(c, x + 25, y - h + 35, ww - 50, h - 60, "#0a2332", 3);
      rect(
        c,
        x + 25,
        y - 25 - ((h - 60) * b.battery) / (200 * b.level),
        ww - 50,
        ((h - 60) * b.battery) / (200 * b.level),
        accent,
        3,
      );
    } else if (b.kind.endsWith("Gen") || b.kind === "shield") {
      circle(c, x + ww / 2, y - h / 2 + 4, 30, "#385d78");
      circle(
        c,
        x + ww / 2,
        y - h / 2 + 4,
        active ? 22 + Math.sin(t * 3) * 3 : 19,
        accent,
      );
      line(c, x + 25, y - 30, x + ww / 2, y - h / 2, light, 3);
      line(c, x + ww - 25, y - 30, x + ww / 2, y - h / 2, light, 3);
    } else if (b.kind === "lab" || b.kind === "analysis" || b.kind === "port") {
      rect(c, x + ww / 2 - 32, y - 65, 64, 45, "#234c65", 3);
      c.fillStyle = active ? "#a2dace60" : "#627c8c40";
      c.beginPath();
      c.moveTo(x + ww / 2 - 32, y - 70);
      c.lineTo(x + ww / 2 - 44, y - h - 30);
      c.lineTo(x + ww / 2 + 44, y - h - 30);
      c.lineTo(x + ww / 2 + 32, y - 70);
      c.fill();
      text(
        c,
        b.kind === "port" ? "△" : "⌬",
        x + ww / 2,
        y - h + 10,
        35,
        accent,
      );
    } else if (b.kind === "warehouse" || b.kind === "largeWarehouse") {
      for (let i = 0; i < 3; i++) {
        rect(
          c,
          x + 22 + (i * (ww - 40)) / 3,
          y - h + 40,
          (ww - 55) / 3,
          h - 70,
          "#3f5e6a",
          3,
        );
        line(
          c,
          x + 30 + (i * (ww - 40)) / 3,
          y - h + 50,
          x + 30 + (i * (ww - 40)) / 3,
          y - 35,
          accent,
          3,
        );
      }
    } else if (
      b.kind === "habitat" ||
      b.kind === "medical" ||
      b.kind === "oxygen"
    ) {
      for (let i = 0; i < 3; i++)
        rect(c, x + 23 + i * 40, y - h + 43, 26, 24, light, 4);
      rect(c, x + ww / 2 - 15, y - 45, 30, 37, "#385b6e", 4);
      if (b.kind === "medical")
        text(c, "+", x + ww / 2, y - h + 5, 28, "#f3a99b");
      if (b.kind === "oxygen") text(c, "O₂", x + ww / 2, y - h + 5, 24, accent);
    } else {
      for (let i = 0; i < 3; i++) {
        circle(c, x + 40 + i * 40, y - 60, 14, "#69818b");
        line(
          c,
          x + 40 + i * 40,
          y - 60,
          x + 40 + i * 40 + Math.cos(active ? t * 3 + i : 0) * 12,
          y - 60 + Math.sin(active ? t * 3 + i : 0) * 12,
          accent,
          4,
        );
      }
      rect(c, x + 24, y - 32, ww - 48, 8, light, 2);
    }
  }
  if (b.level > 1)
    for (let i = 0; i < b.level; i++)
      circle(c, x + 14 + i * 9, y - 10, 2, "#e6cd97");
  if (!ghost) {
    text(c, d.name, x + ww / 2, y - d.h - 12, 11);
    if (b.remaining > 0) {
      rect(c, x + 15, y - d.h - 7, ww - 30, 3, "#284851");
      rect(
        c,
        x + 15,
        y - d.h - 7,
        (ww - 30) * (1 - b.remaining / d.seconds),
        3,
        "#8de2cc",
      );
    }
    if (b.hp < w.colony.maxHp(b))
      rect(
        c,
        x + 12,
        y + 3,
        ((ww - 24) * b.hp) / w.colony.maxHp(b),
        3,
        "#d99981",
      );
  }
  c.restore();
}
export function drawColony(
  c: CanvasRenderingContext2D,
  w: World,
  builder = false,
) {
  if (!w.isColonyRegion || !w.colony.state.enabled) return;
  const col = w.colony;
  for (const p of w.deposits) {
    rect(c, p.x - 110, GROUND + 8, 220, 32, items[p.item].color + "55");
    for (let i = 0; i < 8; i++)
      circle(
        c,
        p.x - 90 + i * 26,
        GROUND + 24 + Math.sin(i) * 8,
        5,
        items[p.item].color,
      );
    text(
      c,
      p.name + " · " + items[p.item].name,
      p.x,
      GROUND + 64,
      12,
      items[p.item].color,
    );
  }
  if (builder && col.overlay !== "none")
    for (const b of col.state.buildings) {
      const d = definition(b.kind);
      const radius =
        col.overlay === "logistics"
          ? ["warehouse", "largeWarehouse"].includes(b.kind)
            ? 480
            : 0
          : d.generation || b.kind === "relay"
            ? (d.range ?? 0)
            : 0;
      if (radius) {
        c.strokeStyle = col.overlay === "power" ? "#c9b87b55" : "#82dfbc55";
        c.fillStyle = col.overlay === "power" ? "#c9b87b08" : "#82dfbc08";
        c.lineWidth = 2;
        c.beginPath();
        c.arc(b.x + d.w / 2, b.y, radius, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
    }
  if (builder && col.overlay === "power")
    for (const b of col.state.buildings) {
      const status = col.statuses.get(b.id);
      if (!status || status.network < 0) continue;
      const d = definition(b.kind),
        cx = b.x + d.w / 2;
      const supplier = col.state.buildings
        .filter(
          (s) =>
            s.id !== b.id &&
            (definition(s.kind).generation || s.kind === "relay") &&
            col.statuses.get(s.id)?.network === status.network &&
            Math.hypot(s.x + definition(s.kind).w / 2 - cx, s.y - b.y) <=
              (definition(s.kind).range ?? 0),
        )
        .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
      if (supplier)
        line(
          c,
          cx,
          b.y - 8,
          supplier.x + definition(supplier.kind).w / 2,
          supplier.y - 8,
          "#d7c39145",
          1,
        );
    }
  for (const b of col.state.buildings) {
    if (
      !builder &&
      (b.x + definition(b.kind).w < w.camera.x - 100 || b.x > w.camera.x + 1380)
    )
      continue;
    if (!builder && b.legacy) continue;
    buildingArt(c, b, w);
    if (builder) {
      const s = col.statuses.get(b.id);
      circle(
        c,
        b.x + definition(b.kind).w - 15,
        b.y - 20,
        4,
        s?.powered ? "#9fe3b2" : "#e6a18a",
      );
      if (b.id === col.selected) {
        c.strokeStyle = "#f2d39a";
        c.lineWidth = 2;
        c.strokeRect(
          b.x - 4,
          b.y - definition(b.kind).h - 4,
          definition(b.kind).w + 8,
          definition(b.kind).h + 8,
        );
        if (
          definition(b.kind).category === "defense" &&
          definition(b.kind).range
        ) {
          c.strokeStyle = "#eea49066";
          c.beginPath();
          c.arc(
            b.x + definition(b.kind).w / 2,
            b.y - 50,
            definition(b.kind).range!,
            0,
            Math.PI * 2,
          );
          c.stroke();
        }
      }
    }
  }
  for (const r of col.state.robots) {
    const yy = GROUND - 160 + Math.sin(col.state.day * 3 + r.id) * 4;
    line(c, r.x - 16, yy + 10, r.x + 16, yy + 10, "#8ea9ac", 3);
    rect(c, r.x - 12, yy - 8, 24, 17, "#b6cec9", 5);
    circle(c, r.x + 4, yy, 4, "#81e1da");
    if (builder) text(c, r.state, r.x, yy - 18, 10);
  }
  for (const s of col.state.settlers) {
    const home = col.find(s.home)!,
      work = col.find(s.assigned);
    const x = work
      ? work.x + Math.sin(col.state.day * 0.05 + s.id) * (work.x - home.x) * 0.1
      : home.x + 40;
    circle(c, x, GROUND - 43, 7, "#c6c5aa");
    rect(
      c,
      x - 7,
      GROUND - 35,
      14,
      25,
      s.role === "medic" ? "#d9aea0" : "#8dafa9",
      4,
    );
    line(c, x - 4, GROUND - 10, x - 7, GROUND, "#b8c6bc", 3);
    line(c, x + 4, GROUND - 10, x + 7, GROUND, "#b8c6bc", 3);
  }
  for (const b of col.beams) line(c, b.x, b.y, b.tx, b.ty, b.color, 3);
}
export function builderArt(c: CanvasRenderingContext2D, w: World) {
  const col = w.colony,
    v = col.view;
  const g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, col.night ? "#06131e" : "#102f41");
  g.addColorStop(1, "#274b50");
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 75; i++)
    circle(
      c,
      (i * 237) % 1280,
      (i * i * 17) % 420,
      1,
      i % 3 ? "#b9d5c03a" : "#c6e9d389",
    );
  circle(c, 1040, 160, 55, "#adccbd14");
  c.save();
  c.scale(v.zoom, v.zoom);
  c.translate(-v.x, -v.y);
  rect(c, 0, GROUND, BASE_END + 240, 1000, "#1a343a");
  line(c, 0, GROUND, BASE_END, GROUND, "#85a49a", 3);
  if (v.zoom >= 0.35) {
    const left = Math.floor(v.x / GRID) * GRID,
      right = v.x + 1280 / v.zoom;
    for (let x = Math.max(0, left); x < Math.min(BASE_END, right); x += GRID)
      line(c, x, 300, x, GROUND, "#a9d6c314", 1 / v.zoom);
    for (let y = GROUND; y >= 300; y -= GRID)
      line(
        c,
        Math.max(0, left),
        y,
        Math.min(BASE_END, right),
        y,
        "#a9d6c314",
        1 / v.zoom,
      );
  }
  drawColony(c, w, true);
  circle(c, w.player.x + 17, w.player.y + 35, 14, "#d8e9cc");
  if (col.pointer.inside && col.blueprint && !col.demolishing) {
    const d = definition(col.blueprint),
      x = Math.floor((v.x + col.pointer.x / v.zoom) / GRID) * GRID,
      y =
        GROUND -
        Math.round((GROUND - v.y - col.pointer.y / v.zoom) / GRID) * GRID;
    const reason = col.placement(col.blueprint, x, y);
    const b = {
      id: -1,
      kind: col.blueprint,
      x,
      y,
      level: 1,
      hp: d.hp,
      remaining: 0,
      battery: 0,
      enabled: true,
    } as Building;
    c.globalAlpha = 0.65;
    buildingArt(c, b, w, true);
    c.globalAlpha = 1;
    c.fillStyle = reason ? "#ef8d8c30" : "#87edbb30";
    c.fillRect(x, y - d.h, d.w, d.h);
    c.strokeStyle = reason ? "#ef8d8c" : "#87edbb";
    c.lineWidth = 2 / v.zoom;
    c.strokeRect(x, y - d.h, d.w, d.h);
    const el = document.getElementById("build-validity");
    if (el) {
      el.textContent = reason
        ? "× " + reason
        : `✓ 배치 가능 · ${d.name} · ${x}, ${y}`;
      el.className = reason ? "invalid" : "valid";
    }
  }
  c.restore();
  rect(c, 972, 112, 280, 52, "#102b3bcc", 5);
  line(c, 985, 145, 1239, 145, "#8dad9a", 1);
  for (const b of col.state.buildings)
    rect(
      c,
      985 + (b.x / 10000) * 254,
      140 - (780 - b.y) / 20,
      Math.max(2, (definition(b.kind).w / 10000) * 254),
      5,
      col.statuses.get(b.id)?.powered ? "#b3d7b7" : "#c59b8a",
    );
  c.strokeStyle = "#f2dc9c";
  c.lineWidth = 1;
  c.strokeRect(
    985 + (v.x / 10000) * 254,
    130,
    (1280 / v.zoom / 10000) * 254,
    20,
  );
  text(
    c,
    "SECTOR 01  /  " + Math.round(v.zoom * 100) + "%",
    1100,
    102,
    12,
    "#bed8ce",
  );
}
