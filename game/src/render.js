// Canvas renderer: top-down level, lighting, vision cones, HUD.
import { TILE, COLORS, VIEW_DISTANCE, VIEW_HALF_ANGLE } from './config.js';
import { hasLineOfSight, isOpaque, inShadow } from './geometry.js';

export function drawFrame(ctx, canvas, game) {
  const { level, player, cam } = game;
  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawLevel(ctx, level, cam);
  drawExit(ctx, level, cam);
  if (level.intel && !level.intel.taken) drawIntel(ctx, level.intel, cam, game.time);
  drawDarkness(ctx, level, cam, canvas, player);
  drawGuardCones(ctx, level, cam, player);
  drawGuards(ctx, level, cam, game.time);
  drawPlayer(ctx, player, cam, game.sneaking);
  drawHud(ctx, canvas, game);
}

function drawLevel(ctx, level, cam) {
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const c = level.grid[y][x];
      const px = x * TILE - cam.x, py = y * TILE - cam.y;
      if (c === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(px, py, TILE, 3);
        ctx.fillRect(px, py, 3, TILE);
      } else {
        const shadow = nearCover(level, x, y);
        ctx.fillStyle = shadow ? COLORS.floorDark : COLORS.floorLit;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (c === 'C') {
          ctx.fillStyle = COLORS.crate;
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = COLORS.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
          ctx.lineWidth = 1;
        } else if (c === 'P') {
          ctx.fillStyle = COLORS.pillar;
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 0.36, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function nearCover(level, x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const tx = x + dx, ty = y + dy;
    if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) continue;
    const c = level.grid[ty][tx];
    if (c === 'C' || c === 'P' || c === '#') return true;
  }
  return false;
}

function drawExit(ctx, level, cam) {
  const px = level.exit.x * TILE - cam.x, py = level.exit.y * TILE - cam.y;
  ctx.fillStyle = COLORS.exit;
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(Date.now() / 300);
  ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.exit;
  ctx.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5);
  ctx.fillStyle = '#141414';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('EXIT', px + 5, py + TILE / 2 + 4);
}

function drawIntel(ctx, intel, cam, t) {
  const px = intel.x - cam.x, py = intel.y - cam.y;
  const bob = Math.sin(t / 250) * 4;
  ctx.save();
  ctx.translate(px, py + bob);
  ctx.rotate(t / 600);
  ctx.fillStyle = COLORS.intel;
  ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = '#0a2530';
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

// Vision cones drawn as a fan of ray-marched sight lines, alert-tinted.
function drawGuardCones(ctx, level, cam, player) {
  for (const g of level.guards) {
    const alert = g.state === 'chase' || g.suspicion > 1.2;
    ctx.fillStyle = alert ? COLORS.coneAlert : COLORS.coneSafe;
    ctx.beginPath();
    ctx.moveTo(g.px - cam.x, g.py - cam.y);
    const STEPS = 26;
    for (let i = 0; i <= STEPS; i++) {
      const a = g.facing - VIEW_HALF_ANGLE + (2 * VIEW_HALF_ANGLE * i) / STEPS;
      let reach = VIEW_DISTANCE;
      for (let r = 12; r <= VIEW_DISTANCE; r += 10) {
        const sx = g.px + Math.cos(a) * r, sy = g.py + Math.sin(a) * r;
        if (isOpaque(level, sx, sy)) { reach = r; break; }
      }
      ctx.lineTo(g.px - cam.x + Math.cos(a) * reach, g.py - cam.y + Math.sin(a) * reach);
    }
    ctx.closePath();
    ctx.fill();
    // Highlight the cone edge when it touches the player (near-miss readability).
    ctx.strokeStyle = alert ? 'rgba(255,120,90,0.5)' : 'rgba(130,170,230,0.35)';
    ctx.stroke();
  }
}

function drawGuards(ctx, level, cam, t) {
  for (const g of level.guards) {
    const px = g.px - cam.x, py = g.py - cam.y;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(g.facing);
    // Body
    ctx.fillStyle = g.state === 'chase' ? '#ff5040' : COLORS.guard;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    // Facing visor
    ctx.fillStyle = '#2a1512';
    ctx.fillRect(2, -5, 9, 10);
    ctx.restore();
    // State icon
    if (g.state === 'chase') { ctx.fillStyle = '#ff5040'; ctx.fillText('!', px - 4, py - 14); }
    else if (g.state === 'search') { ctx.fillStyle = '#ffb040'; ctx.fillText('?', px - 4, py - 14); }
    // Suspicion pip
    if (g.suspicion > 0.3 && g.state !== 'chase') {
      ctx.strokeStyle = '#ffb040';
      ctx.beginPath();
      ctx.arc(px, py, 15, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 2.6) * Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
}

function drawPlayer(ctx, player, cam, sneaking) {
  const px = player.x - cam.x, py = player.y - cam.y;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.facing);
  ctx.fillStyle = sneaking ? '#5fbf70' : COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d2412';
  ctx.fillRect(1, -4, 8, 8);
  ctx.restore();
  if (sneaking) {
    ctx.strokeStyle = 'rgba(140,242,154,0.5)';
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Vignette darkness: darken tiles with no line of sight to the player.
function drawDarkness(ctx, level, cam, canvas, player) {
  ctx.save();
  ctx.fillStyle = COLORS.shadow;
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
      if (hasLineOfSight(level, player.x, player.y, cx, cy)) continue;
      ctx.fillRect(x * TILE - cam.x, y * TILE - cam.y, TILE, TILE);
    }
  }
  ctx.restore();
  const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.4, canvas.width / 2, canvas.height / 2, canvas.height * 0.85);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHud(ctx, canvas, game) {
  const { level, noise, intelHave, intelTotal } = game;
  ctx.fillStyle = 'rgba(10,13,20,0.85)';
  ctx.fillRect(0, 0, canvas.width, 34);
  ctx.fillStyle = '#cfd6e0';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`SHADOW PROTOCOL  ·  ${level.name}`, 14, 22);
  // Noise meter
  const nx = 14 + ctx.measureText(`SHADOW PROTOCOL  ·  ${level.name}`).width + 30;
  ctx.fillStyle = '#8892a0';
  ctx.fillText('NOISE', nx, 22);
  ctx.fillStyle = '#1a2030';
  ctx.fillRect(nx + 62, 8, 150, 18);
  ctx.fillStyle = noise > 60 ? '#ff5040' : noise > 30 ? '#ffb040' : '#8ef29a';
  ctx.fillRect(nx + 64, 10, Math.max(0, (noise / 100) * 146), 14);
  // Intel count
  ctx.fillStyle = COLORS.intel;
  ctx.fillText(`INTEL ${intelHave}/${intelTotal}`, nx + 232, 22);
  // Controls reminder
  ctx.fillStyle = '#6c7686';
  ctx.font = '13px monospace';
  ctx.fillText('WASD move · SHIFT sneak · reach EXIT unseen', canvas.width - 380, 22);
}
