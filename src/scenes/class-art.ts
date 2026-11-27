import type { World } from "../core/world";
export function classArt(c: CanvasRenderingContext2D, w: World) {
  const system = w.classes,
    d = system.definition,
    p = w.player;
  if (!d) return;
  c.save();
  c.strokeStyle = d.color;
  c.fillStyle = d.color;
  c.lineWidth = 2;
  if (w.settings.glow !== false) {
    c.shadowColor = d.color;
    c.shadowBlur = 5;
  }
  const x = p.x + p.w / 2,
    y = p.y;
  c.save();
  c.translate(x, y);
  c.scale(p.facing, 1);
  switch (system.state.classId) {
    case "guardian":
      c.fillStyle = "#304b68";
      c.fillRect(-25, 22, 15, 30);
      c.strokeRect(-25, 22, 15, 30);
      c.beginPath();
      c.moveTo(22, 20);
      c.lineTo(39, 26);
      c.lineTo(35, 52);
      c.lineTo(23, 59);
      c.closePath();
      c.stroke();
      break;
    case "ranger":
      c.fillRect(3, 9, 19, 4);
      c.beginPath();
      c.arc(32, 28, 7, 0, Math.PI * 2);
      c.moveTo(22, 28);
      c.lineTo(42, 28);
      c.stroke();
      break;
    case "engineer":
      c.strokeRect(-26, 27, 14, 23);
      c.fillRect(-23, 31, 8, 5);
      c.fillRect(14, 38, 10, 8);
      break;
    case "scientist":
      c.beginPath();
      c.ellipse(0, 35, 28, 10, w.time * 0.5, 0, Math.PI * 2);
      c.stroke();
      c.fillRect(-4, 29, 8, 8);
      break;
    case "explorer":
      c.fillRect(-22, 23, 9, 28);
      c.beginPath();
      c.moveTo(-22, 50);
      c.lineTo(-18, 62 + Math.sin(w.time * 15) * 6);
      c.lineTo(-13, 50);
      c.stroke();
      c.strokeRect(13, 37, 9, 6);
      break;
    case "cyberBlade":
      c.beginPath();
      c.moveTo(-10, 43);
      c.lineTo(-29, 6);
      c.lineTo(-22, 37);
      c.stroke();
      if (Math.abs(p.vx) > 200) {
        c.globalAlpha = 0.3;
        c.strokeRect(-35, 18, 20, 37);
      }
      break;
  }
  if (system.state.tier === 3) {
    c.beginPath();
    c.arc(0, 0, 23, Math.PI, Math.PI * 2);
    c.stroke();
  }
  if (system.buffs.mech > 0) {
    c.lineWidth = 7;
    c.strokeRect(-30, 16, 60, 58);
    c.fillRect(24, 28, 35, 12);
  }
  c.restore();
  for (const s of system.summons) {
    c.globalAlpha = Math.min(1, s.life);
    c.fillStyle = "#263842";
    c.strokeStyle = d.color;
    if (s.kind === "drone") {
      c.fillRect(s.x - 12, s.y - 6, 24, 12);
      c.strokeRect(s.x - 12, s.y - 6, 24, 12);
      c.beginPath();
      c.moveTo(s.x - 20, s.y - 10);
      c.lineTo(s.x + 20, s.y - 10);
      c.stroke();
    } else if (s.kind === "turret") {
      c.fillRect(s.x - 16, s.y - 8, 32, 24);
      c.strokeRect(s.x - 16, s.y - 8, 32, 24);
      c.fillRect(s.x, s.y - 12, 32, 7);
    } else {
      c.beginPath();
      c.ellipse(s.x, s.y, 30, 10, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
  for (const e of w.combat.targets)
    if (system.marks.has(e.id)) {
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(e.x + 20, e.y - 15, 10, 0, Math.PI * 2);
      c.moveTo(e.x + 5, e.y - 15);
      c.lineTo(e.x + 35, e.y - 15);
      c.stroke();
    }
  c.restore();
}
