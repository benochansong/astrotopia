import type { World } from "../core/world";
import { stationZones } from "./regions";
export function civilizationBackground(c: CanvasRenderingContext2D, w: World) {
  if (w.region !== "station") return false;
  const g = c.createLinearGradient(0, 0, 1280, 720);
  g.addColorStop(0, "#061022");
  g.addColorStop(1, "#243d56");
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 100; i++) {
    c.fillStyle = i % 4 ? "#a5ccd699" : "#fff2cf";
    c.fillRect(
      (i * 197 - w.camera.x * 0.08 + 6000) % 1280,
      (i * 83) % 470,
      1.5,
      1.5,
    );
  }
  c.fillStyle = "#63c4b433";
  c.beginPath();
  c.arc(990 - w.camera.x * 0.02, 520, 320, 0, Math.PI * 2);
  c.fill();
  return true;
}
export function civilizationTerrain(c: CanvasRenderingContext2D, w: World) {
  if (w.region !== "station") return false;
  c.fillStyle = "#182b3e";
  c.fillRect(0, 780, 4400, 300);
  c.fillStyle = "#72d9d2";
  c.fillRect(0, 780, 4400, 3);
  for (let i = 0; i < 7; i++) {
    const x = i * 600;
    c.fillStyle = "#1b3047";
    c.fillRect(x, 300, 25, 480);
    c.fillRect(x, 300, 600, 30);
    c.fillStyle = "#b9e7e6";
    c.font = "bold 23px sans-serif";
    c.fillText(stationZones[i], x + 70, 380);
    c.fillStyle = "#45647b";
    c.fillRect(x + 220, 690, 150, 90);
    c.fillStyle = "#85dec9";
    c.fillRect(x + 235, 703, 120, 35);
    for (let n = 0; n < 2; n++) {
      const nx = x + 440 + n * 65 + Math.sin(w.time * 0.5 + i + n) * 12;
      c.fillStyle = n ? "#c2a6d8" : "#9cd1c6";
      c.fillRect(nx, 724, 19, 40);
      c.fillStyle = "#d6ddd7";
      c.beginPath();
      c.arc(nx + 10, 715, 10, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#173344";
      c.fillRect(nx + 4, 711, 13, 6);
      c.fillRect(nx, 762, 6, 18);
      c.fillRect(nx + 13, 762, 6, 18);
    }
  }
  return true;
}
export function civilizationStructures(c: CanvasRenderingContext2D, w: World) {
  if (!w.isColonyRegion) return;
  const civ = w.civilization,
    city = civ.state.cities[w.planetId];
  if (city?.population) {
    const homes = w.colony.state.buildings.filter(
      (b) => b.kind === "cityHabitat" && b.remaining === 0,
    );
    for (let i = 0; i < Math.min(12, Math.ceil(city.population / 100)); i++) {
      const home = homes[i % homes.length];
      if (!home) break;
      const x = home.x + 30 + (i % 3) * 45 + Math.sin(w.time * 0.6 + i) * 20;
      c.fillStyle = i % 2 ? "#9dcfc8" : "#c4acd8";
      c.fillRect(x, 735, 16, 32);
      c.fillStyle = "#e0d6ca";
      c.beginPath();
      c.arc(x + 8, 728, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#21394a";
      c.fillRect(x, 767, 5, 13);
      c.fillRect(x + 11, 767, 5, 13);
    }
  }
  if (civ.state.restored.includes(w.planetId)) {
    for (const b of w.colony.state.buildings.filter(
      (b) =>
        b.kind === "ancientResearch" && w.colony.statuses.get(b.id)?.powered,
    )) {
      c.strokeStyle = "#90e0c477";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(b.x + 100, 780, 300, 75, 0, Math.PI, 0);
      c.stroke();
      c.fillStyle = "#b2e6ce";
      c.font = "12px sans-serif";
      c.fillText("RESTORED · LOCAL SANCTUARY", b.x - 20, 560);
    }
  }
}
