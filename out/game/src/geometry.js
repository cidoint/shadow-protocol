// Geometry + collision helpers shared by AI, rendering and the physics step.
import { TILE } from './config.js';

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleLerp(a, b, t) {
  const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * Math.min(1, t);
}

export function tileAt(level, px, py) {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return '#';
  return level.grid[y][x];
}

export function isOpaque(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'C';
}

export function isSolid(level, px, py) {
  return isOpaque(level, px, py) || tileAt(level, px, py) === 'P';
}

// Ray march for line of sight between two points, sampling every 8px.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1);
  const steps = Math.ceil(d / 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isOpaque(level, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

// Circle-vs-grid collision, resolved axis by axis so the circle slides along walls.
export function moveCircle(level, px, py, dx, dy, r) {
  let nx = px + dx;
  if (!circleHits(level, nx, py, r)) px = nx;
  let ny = py + dy;
  if (!circleHits(level, px, ny, r)) py = ny;
  return { x: px, y: py };
}

function circleHits(level, cx, cy, r) {
  const x0 = Math.floor((cx - r) / TILE), x1 = Math.floor((cx + r) / TILE);
  const y0 = Math.floor((cy - r) / TILE), y1 = Math.floor((cy + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) return true;
      if (level.grid[ty][tx] === '.') continue;
      // Nearest point on the tile rectangle to the circle centre.
      const rx = Math.max(tx * TILE, Math.min(cx, tx * TILE + TILE));
      const ry = Math.max(ty * TILE, Math.min(cy, ty * TILE + TILE));
      if (dist(cx, cy, rx, ry) < r) return true;
    }
  }
  return false;
}

// A point is in shadow when it is within 52px of a crate 'C' or pillar 'P' tile.
export function inShadow(level, px, py) {
  const x0 = Math.floor((px - 52) / TILE), x1 = Math.floor((px + 52) / TILE);
  const y0 = Math.floor((py - 52) / TILE), y1 = Math.floor((py + 52) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) continue;
      const c = level.grid[ty][tx];
      if (c !== 'C' && c !== 'P') continue;
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
      if (dist(px, py, cx, cy) < 52) return true;
    }
  }
  return false;
}
