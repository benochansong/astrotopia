import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import { enemyData, items } from "../data/content";
import { gearTemplates, rarities, statusInfo, weapons } from "../data/battle";
import { enemySize } from "../combat/DamageSystem";
import type { AttackShape, WeaponId } from "../combat/types";
const TAU = Math.PI * 2;
const ellipse = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  rot = 0,
) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  c.fillStyle = color;
  c.fill();
};
const poly = (c: CanvasRenderingContext2D, pts: number[], color: string) => {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  c.fillStyle = color;
  c.fill();
};
const line = (
  c: CanvasRenderingContext2D,
  pts: number[],
  color: string,
  width = 2,
) => {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
};
const box = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  r = 2,
) => {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};
function gem(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
) {
  poly(
    c,
    [x - 10, y, x - 14, y - h * 0.6, x, y - h, x + 12, y - h * 0.55, x + 8, y],
    color,
  );
  poly(c, [x, y - h, x + 12, y - h * 0.55, x + 8, y, x, y - 5], "#efffff55");
}
export function drawWeapon(
  c: CanvasRenderingContext2D,
  id: WeaponId,
  time: number,
  attacking: boolean,
  charge = 0,
  combo = 0,
) {
  const col = weapons[id].color;
  c.save();
  if (id === "blade") {
    c.rotate(attacking ? -0.9 + combo * 0.45 : 0);
    box(c, 10, -3, 12, 7, "#37556a");
    poly(c, [18, -4, 65, -21, 55, -7, 19, 3], col);
    line(c, [20, -2, 60, -17], "#f3ffe7", 2);
    box(c, 15, -7, 5, 14, "#a2c6c7");
  } else if (id === "hammer") {
    c.rotate(attacking ? Math.sin(time * 16) * 0.6 : 0);
    box(c, 11, -4, 40, 6, "#63808d");
    box(c, 38, -19, 22, 34, "#436074", 5);
    box(c, 39, -16, 9, 27, col, 3);
    line(c, [53, -12, 53, 7], "#e7d7ff", 2);
  } else if (id === "cannon") {
    box(c, 8, -11, 35, 23, "#40566f", 5);
    box(c, 16, -16, 18, 8, "#a5bbc3", 3);
    box(c, 37, -8, 12, 17, "#8faeb7", 3);
    ellipse(c, 48, 0, 6 + charge * 5, 6 + charge * 5, col);
    line(c, [13, -7, 34, -7], "#d4b1e9", 3);
  } else if (id === "rifle") {
    box(c, 8, -6, 43, 12, "#2d485c", 3);
    box(c, 22, -11, 17, 6, "#9eafa8", 2);
    box(c, 25, 6, 9, 13, "#52717b", 2);
    box(c, 49, -3, 10, 5, col);
    line(c, [14, -1, 41, -1], col, 2);
  } else if (id === "cryo") {
    box(c, 10, -9, 32, 17, "#577b91", 4);
    ellipse(c, 21, -6, 10, 9, "#9cd7e7");
    box(c, 31, -5, 18, 10, "#c3ddea", 3);
    line(c, [38, -9, 38, 10], col, 2);
    line(c, [33, 0, 47, 0], "#efffff", 2);
  } else {
    box(c, 12, -5, 24, 10, "#244459", 3);
    box(c, 17, -7, 10, 4, "#9ebbbd", 1);
    box(c, 28, -4, 8, 5, col, 1);
  }
  c.restore();
}
export function enemyMarks(c: CanvasRenderingContext2D, e: Enemy) {
  const s = enemySize(e),
    d = enemyData[e.kind];
  if (
    e.hp < e.maxHp ||
    e.elite ||
    ["Alert", "PrepareAttack"].includes(e.state)
  ) {
    box(c, e.x, e.y - 14, s.w, 4, "#0d2235");
    box(
      c,
      e.x,
      e.y - 14,
      s.w * Math.max(0, e.hp / e.maxHp),
      4,
      e.elite ? "#d5a9e6" : "#b2d0bb",
    );
    if (e.shield > 0)
      box(
        c,
        e.x,
        e.y - 20,
        s.w * Math.min(1, e.shield / e.maxHp),
        3,
        "#8bbde7",
      );
  }
  c.textAlign = "center";
  if (e.elite) {
    const name = {
      fortified: "강화형",
      berserk: "광폭형",
      electric: "전기형",
      regenerating: "재생형",
      splitting: "분열형",
      shielded: "보호막형",
    }[e.elite];
    c.font = "10px sans-serif";
    c.fillStyle = "#e1c5ed";
    c.fillText(`◆ ${name} ${d.name}`, e.x + s.w / 2, e.y - 27);
  }
  if (e.state === "PrepareAttack") {
    c.font = "bold 21px sans-serif";
    c.fillStyle = "#f4ce90";
    c.fillText("!", e.x + s.w / 2, e.y - 38);
  }
  if (e.statuses.length) {
    c.font = "11px sans-serif";
    e.statuses.forEach((st, i) => {
      c.fillStyle = statusInfo[st.id].color;
      c.fillText(
        `${statusInfo[st.id].icon}${st.time.toFixed(1)}`,
        e.x + s.w / 2 + (i - (e.statuses.length - 1) / 2) * 36,
        e.y - 48,
      );
    });
  }
}
export function drawCreature(
  c: CanvasRenderingContext2D,
  e: Enemy,
  time: number,
) {
  const d = enemyData[e.kind],
    s = enemySize(e),
    scale = e.elite ? 1.25 : 1,
    prepare = e.state === "PrepareAttack";
  c.save();
  c.translate(e.x + s.w / 2, e.y + s.h);
  c.scale(e.facing * scale, scale);
  if (e.flash > 0) c.filter = "brightness(1.9)";
  const stride = Math.sin(time * 9 + e.id) * 3;
  if (e.kind === "spore") {
    for (let i = -1; i <= 1; i++)
      line(c, [i * 8, -23, i * 16, -12, i * 23 + stride, 0], "#799e7e", 5);
    box(c, -9, -53, 18, 34, "#7f9f80", 8);
    for (const side of [-1, 1])
      poly(
        c,
        [side * 6, -37, side * 29, -49, side * 27, -27, side * 10, -24],
        "#83ad89",
      );
    ellipse(c, 0, -57, 26, 14, "#b5c78c");
    ellipse(c, 0, -61, 23, 11, "#789b75");
    for (let i = -1; i <= 1; i++)
      ellipse(c, i * 12, -63, 4, 4, prepare ? "#f0da96" : "#d1df99");
    ellipse(c, 7, -45, 5, 7, "#244e4b");
  } else if (e.kind === "beetle") {
    for (let i = -1; i <= 1; i++) {
      line(
        c,
        [i * 18, -17, i * 20 - 12, -8, i * 20 - 15 + stride, 1],
        "#b1c4c7",
        3,
      );
      line(
        c,
        [i * 18, -12, i * 20 + 10, -7, i * 20 + 12 - stride, 0],
        "#7294ab",
        3,
      );
    }
    ellipse(c, -3, -25, 31, 22, "#496f8b");
    poly(c, [-33, -18, -24, -39, 0, -48, 27, -32, 22, -12, -7, -8], "#92b4cb");
    line(c, [-26, -25, 0, -41, 19, -25], "#d0e9ea", 2);
    gem(c, -8, -34, 25, "#b1d8e8");
    ellipse(c, 29, -20, 12, 10, "#527d93");
    ellipse(c, 34, -23, 3, 3, "#e6d7a6");
    ellipse(c, -28, -19, 5, 7, "#b9e5e1");
  } else if (e.kind === "worm") {
    if (e.state === "Retreat") {
      c.globalAlpha = 0.7;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(0, -2, 15 + i * 10, 4 + i * 2, 0, 0, TAU);
        c.strokeStyle = "#d8c7a4";
        c.lineWidth = 1;
        c.stroke();
      }
    } else {
      for (let i = 0; i < 5; i++)
        ellipse(
          c,
          Math.sin(time * 4 + i * 0.5) * 4,
          -10 - i * 12,
          19 - i,
          13,
          i % 2 ? "#ab927d" : "#c1ab90",
        );
      ellipse(c, 5, -68, 18, 16, "#6c7168");
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5;
        poly(
          c,
          [
            5 + Math.cos(a) * 10,
            -68 + Math.sin(a) * 10,
            5 + Math.cos(a) * 23,
            -68 + Math.sin(a) * 23,
            5 + Math.cos(a + 0.7) * 11,
            -68 + Math.sin(a + 0.7) * 11,
          ],
          "#d7c3a5",
        );
      }
      ellipse(c, 5, -68, 8, 8, "#283b43");
    }
  } else if (e.kind === "volt" || e.kind === "stalker") {
    const big = e.kind === "stalker",
      col = big ? "#91adb5" : "#c7bc84";
    for (const side of [-1, 1]) {
      line(c, [side * 20, -23, side * 24, -10, side * 25 + stride, 0], col, 6);
      line(
        c,
        [side * 12, -22, side * 14, -8, side * 16 - stride, 0],
        "#526e7a",
        5,
      );
    }
    poly(c, [-31, -22, -24, -42, 12, -46, 30, -34, 20, -20, -10, -17], col);
    poly(
      c,
      [8, -43, 27, -54, 38, -36, 29, -24, 13, -28],
      big ? "#becdd0" : "#e4d59d",
    );
    ellipse(c, 29, -40, 3, 2, big ? "#e5b8b2" : "#f4f5c5");
    line(c, [-26, -32, -42, -44, -34, -60, -49, -57], col, 3);
    for (let i = 0; i < 3; i++)
      poly(
        c,
        [-22 + i * 12, -38, -16 + i * 12, -59 - (i % 2) * 8, -9 + i * 12, -40],
        big ? "#668d9c" : "#f0e5af",
      );
    if (prepare || e.state === "Attack")
      line(
        c,
        [-18, -48, -5, -54, 0, -42, 14, -50, 20, -41],
        big ? "#f4b6ad" : "#fff4b5",
        2,
      );
  } else if (e.kind === "wisp") {
    c.rotate(Math.sin(time * 2) * 0.08);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-15 + i * 13, -27);
      c.bezierCurveTo(
        -24 + i * 13,
        -9,
        16 - i * 10,
        3,
        Math.sin(time * 3 + i) * 13,
        14,
      );
      c.strokeStyle = ["#c4b8ee", "#8293c2", "#ddc7f1"][i];
      c.lineWidth = 3;
      c.stroke();
    }
    poly(c, [-20, -29, -13, -47, 2, -55, 20, -39, 15, -20, 0, -12], "#7f8cba");
    ellipse(c, 4, -33, 11, 14, "#c7bce7");
    ellipse(c, 8, -34, 5, 8, prepare ? "#fae6aa" : "#405c80");
    for (let i = 0; i < 3; i++) {
      const a = time + (i * TAU) / 3;
      gem(c, Math.cos(a) * 27, -33 + Math.sin(a) * 15, 12, "#cbb5ec");
    }
  } else if (e.kind === "golem") {
    for (const side of [-1, 1]) {
      box(c, side * 21 - 12, -35, 23, 34, "#586e85", 6);
      poly(
        c,
        [
          side * 29 - 13,
          -57,
          side * 42 - 13,
          -65,
          side * 48 + 7,
          -30,
          side * 34 + 8,
          -20,
        ],
        "#7c98b1",
      );
    }
    poly(
      c,
      [-34, -37, -41, -87, -21, -103, 25, -101, 40, -78, 28, -35],
      "#93b1c7",
    );
    poly(c, [-14, -86, 0, -104, 15, -84, 0, -63], "#b5e5e9");
    box(c, -20, -118, 41, 24, "#6b8ca6", 6);
    line(c, [-12, -108, 12, -108], prepare ? "#f2bb9c" : "#b8e9e1", 4);
    gem(c, -28, -78, 35, "#c2d8eb");
    gem(c, 28, -77, 42, "#a4c3dd");
  } else if (e.kind === "dummy") {
    box(c, -6, -30, 12, 29, "#657e88");
    box(c, -22, -7, 44, 7, "#a6beb7");
    box(c, -22, -75, 44, 46, "#8aa6ad", 6);
    ellipse(c, 0, -53, 16, 16, "#243f56");
    ellipse(c, 0, -53, 10, 10, "#c8d7ac");
    ellipse(c, 0, -53, 5, 5, "#588695");
    line(c, [-16, -53, 16, -53], "#dcead7", 1);
    line(c, [0, -69, 0, -37], "#dcead7", 1);
  }
  c.restore();
  enemyMarks(c, e);
}
function shapePath(c: CanvasRenderingContext2D, s: AttackShape) {
  c.beginPath();
  if (s.kind === "rect") c.rect(s.x, s.y, s.w, s.h);
  else if (s.kind === "arc") {
    c.moveTo(s.x, s.y);
    c.arc(
      s.x,
      s.y,
      s.radius,
      s.facing > 0 ? -Math.PI / 2 : Math.PI / 2,
      s.facing > 0 ? Math.PI / 2 : Math.PI * 1.5,
    );
    c.closePath();
  } else c.arc(s.x, s.y, s.radius, 0, TAU);
}
export function drawCombat(c: CanvasRenderingContext2D, w: World) {
  for (const h of w.combat.hazards) {
    const warning = h.delay > 0;
    c.save();
    shapePath(c, h);
    c.fillStyle = h.color + (warning ? "18" : "60");
    c.fill();
    c.strokeStyle = h.color;
    c.lineWidth = warning ? 1.5 : 3;
    if (warning) c.setLineDash([7, 6]);
    c.stroke();
    if (warning && h.vy > 0) {
      box(c, h.x, 770, h.w, 7, "#e9b49b88");
      line(c, [h.x + h.w / 2, h.y + h.h, h.x + h.w / 2, 770], "#e7b99955", 1);
    }
    if (warning) {
      c.font = "11px sans-serif";
      c.fillStyle = "#f2d7b0";
      c.textAlign = "center";
      c.fillText(
        h.label,
        h.kind === "rect" ? h.x + h.w / 2 : h.x,
        h.kind === "rect" ? h.y - 10 : h.y - h.radius - 8,
      );
    }
    c.restore();
  }
  for (const e of w.combat.effects) {
    c.save();
    c.globalAlpha = e.warning ? 0.65 : Math.min(1, e.life / e.maxLife);
    shapePath(c, e);
    c.fillStyle = e.color + (e.warning ? "10" : "32");
    c.fill();
    c.strokeStyle = e.color;
    c.lineWidth = e.warning ? 1.5 : 4;
    if (e.warning) c.setLineDash([5, 5]);
    c.stroke();
    if (e.label) {
      c.font = "11px sans-serif";
      c.fillStyle = e.color;
      c.textAlign = "center";
      c.fillText(
        e.label,
        e.kind === "rect" ? e.x + e.w / 2 : e.x,
        e.kind === "rect" ? e.y - 8 : e.y - e.radius - 5,
      );
    }
    c.restore();
  }
  for (const l of w.battle.groundLoot) {
    if (l.region !== w.region || Math.abs(l.x - w.camera.x - 640) > 750)
      continue;
    const color = l.gear ? rarities[l.gear.rarity].color : items[l.item!].color,
      name = l.gear ? gearTemplates[l.gear.template].name : items[l.item!].name;
    c.save();
    const bob = Math.sin(w.time * 3 + l.x) * 3;
    line(c, [l.x, l.y, l.x, l.y - 48], color + "66", 2);
    gem(c, l.x, l.y + bob, 18, color);
    c.font = "10px sans-serif";
    c.textAlign = "center";
    c.fillStyle = color;
    c.fillText(name, l.x, l.y - 54);
    c.restore();
  }
  const p = w.player;
  if (w.combat.skills.shield > 0) {
    c.save();
    c.strokeStyle = "#b3d8f1a0";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(p.x + 17, p.y + 32, 32, 48, 0, 0, TAU);
    c.stroke();
    c.restore();
  }
  if (w.combat.weapons.charge > 0) {
    box(c, p.x - 9, p.y - 17, 52, 5, "#243c54");
    box(
      c,
      p.x - 9,
      p.y - 17,
      (52 * w.combat.weapons.charge) / 1.8,
      5,
      "#d7b5ed",
    );
  }
}
export function drawTitan(c: CanvasRenderingContext2D, w: World) {
  const boss = w.combat.boss,
    e = boss.enemy;
  if (!e || e.state === "Death") return;
  c.save();
  c.translate(e.x + 150, e.y + 220);
  c.scale(e.facing, 1);
  if (e.flash > 0) c.filter = "brightness(1.6)";
  const rage = boss.phase === 2,
    col = rage ? "#aa8091" : "#6b889e",
    crystal = rage ? "#ebaaad" : "#b1d4e6",
    breath = Math.sin(w.time * 2) * 3;
  for (const side of [-1, 1]) {
    const x = side * 93;
    poly(
      c,
      [
        x - 25,
        -90,
        x + 24,
        -91,
        x + 33,
        -27,
        x + 46,
        0,
        x - 38,
        0,
        x - 28,
        -26,
      ],
      side < 0 ? "#445f77" : col,
    );
    box(c, x - 35, -14, 79, 17, "#93aebc", 7);
    for (let i = 0; i < 3; i++)
      poly(
        c,
        [x - 27 + i * 22, -2, x - 22 + i * 22, 7, x - 9 + i * 22, -2],
        "#d3dfd5",
      );
  }
  c.translate(0, breath);
  poly(
    c,
    [
      -132, -89, -143, -144, -108, -183, -40, -201, 52, -192, 119, -159, 135,
      -100, 78, -65, -63, -60,
    ],
    col,
  );
  poly(
    c,
    [-109, -153, -61, -180, 25, -177, 66, -137, 23, -96, -62, -103],
    "#9ebbc2",
  );
  for (let i = 0; i < 5; i++) {
    gem(
      c,
      -102 + i * 43,
      -152 - Math.sin(i * 0.65) * 33,
      48 + (i % 2) * 31,
      crystal,
    );
  }
  poly(
    c,
    [79, -148, 133, -155, 159, -126, 151, -93, 108, -91, 88, -108],
    "#90aab5",
  );
  line(c, [123, -126, 148, -123], rage ? "#ffbea5" : "#d6f1d9", 5);
  poly(c, [117, -90, 130, -77, 138, -94, 146, -78, 151, -98], "#d6d9c8");
  ellipse(c, 5, -133, 37, 44, "#253c53");
  ellipse(c, 5, -133, 27, 33, boss.coreOpen ? "#f7e5b5" : crystal);
  poly(
    c,
    [5, -159, 24, -134, 5, -106, -14, -134],
    rage ? "#df736f" : boss.coreOpen ? "#fff8dd" : "#5c91aa",
  );
  line(c, [-74, -108, -46, -91, -20, -99], "#c4d9d655", 3);
  line(c, [39, -110, 69, -95, 95, -109], "#c4d9d655", 3);
  if (boss.stage === "prepare") {
    for (let i = 0; i < 4; i++)
      line(
        c,
        [-90 + i * 60, -90, -82 + i * 60, -126, -91 + i * 60, -145],
        rage ? "#f8b7aa" : "#d2e9ee",
        2,
      );
  }
  c.restore();
}
