import type { World } from "../core/world";
import type { Enemy } from "../core/types";
import {
  ancientEnemies,
  ancientEnemyIds,
  type AncientEnemy,
} from "../ancient/regions";
import { endingNames, memories, type Ending } from "../ancient/catalog";
export function ancientBackground(
  c: CanvasRenderingContext2D,
  w: World,
  low: boolean,
) {
  if (w.planetId !== "omega" || w.region === "ship") return false;
  const g = c.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, "#070c22");
  g.addColorStop(0.6, "#302148");
  g.addColorStop(
    1,
    w.omega.state.ending === "freedom"
      ? "#426c71"
      : w.omega.state.ending === "harmony"
        ? "#68643d"
        : w.omega.state.ending === "rebirth"
          ? "#5b6d51"
          : "#6e5069",
  );
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  c.strokeStyle = "#dabd9455";
  c.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.ellipse(
      850 - w.camera.x * 0.03,
      190,
      150 + i * 62,
      55 + i * 25,
      -0.3,
      0,
      Math.PI * 2,
    );
    c.stroke();
  }
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = ["#17162e", "#24203c", "#342944"][layer];
    for (let i = 0; i < 18; i++) {
      const x =
          ((((i * 155 - w.camera.x * (0.08 + layer * 0.06)) % 2800) + 2800) %
            2800) -
          400,
        h = 130 + ((i * 73 + layer * 27) % 270);
      c.fillRect(x, 570 - h, 65 + layer * 30, h);
      c.fillStyle = "#d5c29b55";
      for (let j = 0; j < (low ? 2 : 5); j++)
        c.fillRect(x + 18, 590 - h + j * 27, 3, 12);
      c.fillStyle = ["#17162e", "#24203c", "#342944"][layer];
    }
  }
  c.fillStyle = "#eee0b4";
  for (let i = 0; i < (low ? 18 : 45); i++)
    c.fillRect((i * 137 + 31) % 1280, (i * i * 37) % 320, 2, 2);
  c.font = "12px Segoe UI";
  c.fillStyle = "#d6c1ea";
  c.fillText("A E T E R N U M   /   " + w.map.en, 35, 110);
  return true;
}
export function ancientEnemy(
  c: CanvasRenderingContext2D,
  e: Enemy,
  time: number,
) {
  if (!Object.hasOwn(ancientEnemies, e.kind)) return false;
  const d = ancientEnemies[e.kind as AncientEnemy],
    i = ancientEnemyIds.indexOf(e.kind as AncientEnemy),
    boss = i >= 8;
  c.save();
  c.translate(e.x + d.w / 2, e.y + d.h / 2);
  c.globalAlpha = e.state === "Death" ? 0.2 : 1;
  c.fillStyle = e.flash > 0 ? "#fff8dd" : "#242c45";
  c.strokeStyle = d.color;
  c.lineWidth = boss ? 4 : 2;
  c.beginPath();
  if (i % 3 === 0) c.rect(-d.w * 0.4, -d.h * 0.4, d.w * 0.8, d.h * 0.8);
  else if (i % 3 === 1) {
    c.moveTo(0, -d.h * 0.5);
    c.lineTo(d.w * 0.5, 0);
    c.lineTo(0, d.h * 0.5);
    c.lineTo(-d.w * 0.5, 0);
    c.closePath();
  } else c.ellipse(0, 0, d.w * 0.45, d.h * 0.48, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  if (boss || i === 5) {
    for (let j = 0; j < 4; j++) {
      const angle = (j * Math.PI) / 2 + Math.sin(time) * 0.12;
      c.save();
      c.rotate(angle);
      c.fillRect(d.w * 0.35, -12, d.w * 0.3, 24);
      c.strokeRect(d.w * 0.35, -12, d.w * 0.3, 24);
      c.restore();
    }
  }
  if (i === 7 || i === 2) {
    c.beginPath();
    c.arc(0, 0, d.w * 0.7, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = "#f2e4bf";
  c.beginPath();
  c.arc(0, 0, boss ? 22 : 9, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#c0a2fa";
  c.beginPath();
  c.arc(0, 0, boss ? 37 : 18, time, time + Math.PI * 1.5);
  c.stroke();
  if (i === 0) {
    c.strokeStyle = "#e8d9aa";
    c.beginPath();
    c.moveTo(0, -d.h * 0.4);
    c.lineTo(0, -d.h * 0.7);
    c.stroke();
  }
  if (i === 6) {
    for (let n = 0; n < 3; n++)
      c.strokeRect(
        -d.w * 0.65 - n * 5,
        -d.h * 0.4,
        d.w * 1.3 + n * 10,
        d.h * 0.8,
      );
  }
  if (i === 7) {
    for (let n = 0; n < 3; n++) {
      c.fillStyle = "#c9adf1";
      c.fillRect(
        Math.cos(time + n * 2.1) * 70,
        Math.sin(time + n * 2.1) * 55,
        9,
        9,
      );
    }
  }
  if (e.shield > 0) {
    c.strokeStyle = "#99edec88";
    c.beginPath();
    c.arc(0, 0, d.h * 0.65, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  return true;
}
export function ancientTerrain(c: CanvasRenderingContext2D, w: World) {
  if (w.planetId !== "omega" || w.region === "ship") return false;
  for (const p of w.map.platforms) {
    c.fillStyle = p.oneWay ? "#433951" : "#171f35";
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle = "#c1a3da";
    c.fillRect(p.x, p.y, p.w, 3);
    if (!p.oneWay) {
      c.strokeStyle = "#87718a44";
      for (let x = p.x; x < p.x + p.w; x += 90) {
        c.beginPath();
        c.moveTo(x, p.y + 10);
        c.lineTo(x + 40, p.y + 80);
        c.stroke();
      }
    }
  }
  if (["omegaFracture", "omegaLabyrinth"].includes(w.region)) {
    c.fillStyle = "#bba0ed22";
    c.fillRect(3000, 100, 1000, 680);
    c.fillStyle = "#dac6f1";
    c.font = "15px Segoe UI";
    c.fillText("ANTI-GRAVITY · SPACE 부유 · 0.1G", 3040, 400);
  }
  if (w.region === "omegaArchive") {
    c.fillStyle = "#82ddd522";
    c.fillRect(1800, 100, 1200, 680);
    c.fillStyle = "#b7e2df";
    c.font = "15px Segoe UI";
    c.fillText("TEMPORAL FIELD · 발사체·적 55%", 1850, 400);
  }
  if (w.omega.combat.boss) {
    c.fillStyle = "#95ead766";
    c.fillRect(3400, 775, 250, 8);
    c.fillStyle = "#b9ebdf";
    c.font = "14px Segoe UI";
    c.fillText("에너지 충전 안전 발판", 3400, 700);
  }
  return true;
}
export function ancientFilm(c: CanvasRenderingContext2D, w: World) {
  const film = w.omega.state.cinematic;
  if (!film) return;
  const t = film.elapsed,
    ending = film.id.startsWith("ending-"),
    memory = film.id.startsWith("memory-"),
    index = Number(film.id.slice(7));
  c.fillStyle = "#070b20ee";
  c.fillRect(0, 0, 1280, 720);
  c.strokeStyle = "#d5bb8b";
  c.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7 + t * 0.025,
      x = 640 + Math.cos(angle) * 270,
      y = 340 + Math.sin(angle) * 145;
    c.beginPath();
    c.moveTo(640, 340);
    c.lineTo(x, y);
    c.stroke();
    c.fillStyle = [
      "#94d1a9",
      "#d99f7d",
      "#afdfed",
      "#f4a374",
      "#73cfce",
      "#c5b3e9",
      "#eed8a3",
    ][i];
    c.beginPath();
    c.arc(x, y, 12 + i * 2, 0, Math.PI * 2);
    c.fill();
  }
  c.textAlign = "center";
  c.fillStyle = "#eeddb8";
  c.font = "13px Segoe UI";
  c.fillText("ASTROTOPIA  /  FLIGHT ARCHIVE", 640, 78);
  c.font = "34px Segoe UI";
  const title = ending
    ? endingNames[film.id.slice(7) as Ending]
    : memory
      ? memories[index][0]
      : "THE LAST WORLD";
  c.fillText(title, 640, 145);
  c.font = "19px Segoe UI";
  c.fillStyle = "#e5e0ef";
  let text = memory
    ? memories[index][1]
    : ending
      ? t < 25
        ? "우리는 새로운 세계를 찾기 위해 별들 사이로 떠났다."
        : t < 50
          ? "하지만 우리가 발견한 가장 위대한 세계는 우리가 직접 만들어가는 미래였다."
          : "THE END OF THE FIRST JOURNEY · THE BEGINNING OF A NEW CIVILIZATION"
      : t < 10
        ? "GENESIS KEY 인증 · 일곱 세계의 기록 확인"
        : t < 20
          ? "인증 완료. 문명 유지 프로토콜을 재개합니다."
          : "돌아가라. 아직 늦지 않았다.";
  if (text.length > 65) {
    const middle = text.lastIndexOf(" ", Math.floor(text.length / 2) + 10);
    c.fillText(text.slice(0, middle), 640, 520);
    c.fillText(text.slice(middle + 1), 640, 552);
  } else c.fillText(text, 640, 530);
  if (ending) {
    const bases = Object.values(w.space.state.planets).filter(Boolean).length;
    c.font = "14px Segoe UI";
    c.fillStyle = "#aaa1bc";
    c.fillText(
      `당신의 기록 · 방문한 행성 기지 ${bases} · 복원한 행성 ${w.omega.state.restoration.length}`,
      640,
      590,
    );
  }
  c.textAlign = "left";
}
