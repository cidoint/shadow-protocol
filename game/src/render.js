// Shadow Protocol — canvas renderer. Draws the dark top-down world under a camera
// offset, then vision cones, guards, the player, and finally the HUD + message line
// in screen space.
import { TILE, COLORS, VIEW_DISTANCE, VIEW_HALF_ANGLE, NOISE_MAX,
         NOISE_ALERT_THRESHOLD, PLAYER_RADIUS, SUSPICION_RATE } from './config.js';
import { hasLineOfSight, isOpaque } from './geometry.js';

const SHADOW = 'rgba(4,6,10,0.55)';
const EXIT_COLOR = '#ffd166';
const INTEL_COLOR = '#22d3ee';
const PLAYER_COLOR = '#4ade80';
const GUARD_R = 12; // matches the collision radius used in guards.js

export function drawFrame(ctx, canvas, game) {
  const level = game.level;

  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-game.cam.x, -game.cam.y);

  drawFloor(ctx, level);
  drawWalls(ctx, level);
  drawCrates(ctx, level);
  drawPillars(ctx, level);
  drawExit(ctx, level, game.time);
  drawIntel(ctx, level, game.time);
  drawDarkness(ctx, game);
  drawCones(ctx, level);
  drawGuards(ctx, level);
  drawPlayer(ctx, game);

  ctx.restore();

  drawVignette(ctx, canvas);
  drawHud(ctx, canvas, game);
  drawMessage(ctx, canvas, game);
}

function drawFloor(ctx, level) {
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      if (level.grid[y][x] === '#') continue;
      ctx.fillStyle = tileNearCover(level, x, y) ? COLORS.floorDark : COLORS.floorLit;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

// Floor darkens against walls and cover so crates/pillars read as shadowed pockets.
function tileNearCover(level, x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const tx = x + dx, ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) continue;
      const c = level.grid[ty][tx];
      if (c === 'C' || c === 'P' || c === '#') return true;
    }
  }
  return false;
}

function drawWalls(ctx, level) {
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      if (level.grid[y][x] !== '#') continue;
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(px, py, TILE, 3);
      ctx.fillRect(px, py, 3, TILE);
    }
  }
}

function drawCrates(ctx, level) {
  for (const c of level.crates) {
    const px = c.x * TILE, py = c.y * TILE;
    ctx.fillStyle = COLORS.crate;
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
  }
}

function drawPillars(ctx, level) {
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      if (level.grid[y][x] !== 'P') continue;
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      ctx.fillStyle = COLORS.pillar;
      ctx.beginPath();
      ctx.arc(cx, cy, TILE * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawExit(ctx, level, time) {
  const x = level.exit.x * TILE, y = level.exit.y * TILE;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(255, 209, 102, ${0.16 + 0.2 * pulse})`;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = EXIT_COLOR;
  ctx.lineWidth = 2 + pulse;
  ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  ctx.fillStyle = EXIT_COLOR;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawIntel(ctx, level, time) {
  if (!level.intel || level.intel.taken) return;
  const x = level.intel.x, y = level.intel.y + Math.sin(time * 2.4) * 5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 1.4);
  const s = 9;
  ctx.fillStyle = INTEL_COLOR;
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-s, -s, s * 2, s * 2);
  ctx.restore();
}

// Darken every tile the player cannot see, leaving a visibility bubble around them.
function drawDarkness(ctx, game) {
  const level = game.level;
  const px = game.player.x, py = game.player.y;
  ctx.fillStyle = SHADOW;
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      if (hasLineOfSight(level, px, py, cx, cy)) continue;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

function drawCones(ctx, level) {
  const STEPS = 26;
  for (const g of level.guards) {
    const alert = g.state === 'chase' || g.state === 'search' ||
      g.suspicion >= SUSPICION_RATE * 0.6;
    ctx.fillStyle = alert ? 'rgba(239,68,68,0.24)' : 'rgba(59,130,246,0.16)';
    ctx.beginPath();
    ctx.moveTo(g.px, g.py);
    for (let i = 0; i <= STEPS; i++) {
      const a = g.facing - VIEW_HALF_ANGLE + (2 * VIEW_HALF_ANGLE * i) / STEPS;
      const reach = rayReach(level, g.px, g.py, a);
      ctx.lineTo(g.px + Math.cos(a) * reach, g.py + Math.sin(a) * reach);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = alert ? 'rgba(239,68,68,0.65)' : 'rgba(59,130,246,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// March a sight line until it hits opaque cover, or reaches the view distance.
function rayReach(level, x0, y0, angle) {
  const maxDist = VIEW_DISTANCE * TILE;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (let r = 8; r <= maxDist; r += 8) {
    if (isOpaque(level, x0 + cos * r, y0 + sin * r)) return r;
  }
  return maxDist;
}

function drawGuards(ctx, level) {
  for (const g of level.guards) {
    const x = g.px, y = g.py;

    // Suspicion arc: a ring growing around the guard as it notices the player.
    if (g.state !== 'chase' && g.suspicion > 0.05) {
      ctx.strokeStyle = '#ffb040';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.min(1, g.suspicion) * Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(g.facing);
    ctx.fillStyle = g.state === 'chase' ? '#ff5040' : COLORS.guard;
    ctx.beginPath();
    ctx.arc(0, 0, GUARD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2a1512'; // visor
    ctx.fillRect(2, -5, 9, 10);
    ctx.restore();

    if (g.state === 'chase') {
      ctx.fillStyle = '#ff5040';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 16);
      ctx.textAlign = 'left';
    } else if (g.state === 'search') {
      ctx.fillStyle = '#ffb040';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', x, y - 16);
      ctx.textAlign = 'left';
    }
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  const r = PLAYER_RADIUS * TILE;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);
  ctx.fillStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#0d2412';
  ctx.fillRect(1, -3, 8, 6);
  ctx.restore();

  if (game.sneaking) {
    ctx.strokeStyle = 'rgba(125,211,252,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawVignette(ctx, canvas) {
  const grad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.4,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.85,
  );
  grad.addColorStop(0, 'rgba(4,6,10,0)');
  grad.addColorStop(1, 'rgba(4,6,10,0.72)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHud(ctx, canvas, game) {
  const H = 40;
  ctx.fillStyle = 'rgba(10,13,20,0.85)';
  ctx.fillRect(0, 0, canvas.width, H);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#cfd6e0';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(game.level.name, 16, H / 2);
  const nameW = ctx.measureText(game.level.name).width;

  const nx = 16 + nameW + 32;
  ctx.fillStyle = '#8892a0';
  ctx.font = '12px monospace';
  ctx.fillText('NOISE', nx, H / 2);
  const barX = nx + 44, barW = 130, barH = 14;
  ctx.fillStyle = '#1a2030';
  ctx.fillRect(barX, H / 2 - barH / 2, barW, barH);
  const frac = Math.max(0, Math.min(1, game.noise / NOISE_MAX));
  const noiseColor = game.noise >= NOISE_MAX ? '#ef4444'
    : game.noise >= NOISE_ALERT_THRESHOLD ? '#f59e0b' : '#4ade80';
  ctx.fillStyle = noiseColor;
  ctx.fillRect(barX + 2, H / 2 - barH / 2 + 2, Math.max(0, (barW - 4) * frac), barH - 4);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#6c7686';
  ctx.font = '12px monospace';
  const controls = 'WASD move · SHIFT sneak · Mouse look';
  ctx.fillText(controls, canvas.width - 16, H / 2);
  const controlsW = ctx.measureText(controls).width;

  ctx.fillStyle = INTEL_COLOR;
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`INTEL ${game.intelHave}/${game.intelTotal}`, canvas.width - 16 - controlsW - 24, H / 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawMessage(ctx, canvas, game) {
  if (!game.msg) return;
  ctx.font = '15px monospace';
  const w = ctx.measureText(game.msg).width + 40;
  ctx.fillStyle = 'rgba(8,10,16,0.75)';
  ctx.fillRect(canvas.width / 2 - w / 2, canvas.height - 64, Math.max(w, 200), 32);
  ctx.fillStyle = '#cfd6e0';
  ctx.textAlign = 'center';
  ctx.fillText(game.msg, canvas.width / 2, canvas.height - 42);
  ctx.textAlign = 'left';
}
