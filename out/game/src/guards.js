// Guard AI: waypoint patrols, vision cones, suspicion, chase and search states.
// Positions are in pixels; config distances/speeds are in tiles and scaled by TILE.
import { dist, angleLerp, hasLineOfSight, inShadow, moveCircle } from './geometry.js';
import { TILE, GUARD_SPEED, GUARD_CHASE_SPEED, VIEW_DISTANCE, VIEW_HALF_ANGLE,
         HEARING_RADIUS, ALERT_TIME, SUSPICION_RATE, SUSPICION_DECAY, SHADOW_BONUS,
         CAUGHT_DISTANCE, NOISE_ALERT_THRESHOLD } from './config.js';

const GUARD_RADIUS = 12; // px — collision radius for wall-sliding

// March toward a pixel-space target, sliding along walls. Returns true on arrival.
function stepToward(g, tx, ty, speed, level, dt) {
  const d = dist(g.px, g.py, tx, ty);
  if (d < 4) return true;
  const ux = (tx - g.px) / d, uy = (ty - g.py) / d;
  const p = moveCircle(level, g.px, g.py, ux * speed * dt, uy * speed * dt, GUARD_RADIUS);
  g.px = p.x;
  g.py = p.y;
  g.facing = angleLerp(g.facing, Math.atan2(uy, ux), 8 * dt);
  return false;
}

export function updateGuard(g, level, player, noise, dt) {
  const sees = canGuardSee(g, level, player);
  const hears = noise > NOISE_ALERT_THRESHOLD &&
    dist(g.px, g.py, player.x, player.y) < HEARING_RADIUS * TILE;

  // Suspicion climbs while seen (slower in shadow) and cools while hidden.
  if (sees) {
    g.suspicion += dt * (inShadow(level, player.x, player.y) ? SUSPICION_RATE * SHADOW_BONUS : SUSPICION_RATE);
  } else {
    g.suspicion = Math.max(0, g.suspicion - dt * SUSPICION_DECAY);
  }

  // A loud noise near an unaware guard sends it to investigate.
  if (hears && (g.state === 'patrol' || g.state === 'wait')) {
    g.state = 'search';
    g.timer = ALERT_TIME;
    g.lastSeen = { x: player.x, y: player.y };
  }

  // Being seen long enough escalates to a chase.
  if (g.suspicion >= SUSPICION_RATE && g.state !== 'chase') {
    g.state = 'chase';
    g.timer = ALERT_TIME;
    g.lastSeen = { x: player.x, y: player.y };
  }

  if (g.state === 'patrol') {
    const wp = g.route[g.wp];
    const tx = wp[0] * TILE + TILE / 2, ty = wp[1] * TILE + TILE / 2;
    if (stepToward(g, tx, ty, GUARD_SPEED * TILE, level, dt)) {
      g.wp = (g.wp + 1) % g.route.length;
      g.timer = 0.6;
      g.state = 'wait';
    }
  } else if (g.state === 'wait') {
    g.timer -= dt;
    if (g.timer <= 0) g.state = 'patrol';
  } else if (g.state === 'search') {
    g.timer -= dt;
    const t = g.lastSeen;
    if (t && stepToward(g, t.x, t.y, GUARD_SPEED * TILE, level, dt)) {
      g.facing += dt * 1.8; // sweep in place once at the last-seen spot
    }
    if (g.timer <= 0) {
      g.state = 'patrol';
      g.lastSeen = null;
    }
  } else if (g.state === 'chase') {
    if (sees) {
      g.lastSeen = { x: player.x, y: player.y };
      g.timer = ALERT_TIME;
    } else {
      g.timer -= dt;
    }
    const t = g.lastSeen || { x: player.x, y: player.y };
    const arrived = stepToward(g, t.x, t.y, GUARD_CHASE_SPEED * TILE, level, dt);
    if (arrived && !sees) {
      g.state = 'search';
      g.timer = ALERT_TIME;
    }
    if (g.timer <= 0) {
      g.state = 'search';
      g.timer = ALERT_TIME;
    }
  }
}

export function canGuardSee(g, level, player) {
  const d = dist(g.px, g.py, player.x, player.y);
  if (d > VIEW_DISTANCE * TILE) return false;
  const ang = Math.atan2(player.y - g.py, player.x - g.px);
  const diff = Math.abs(((ang - g.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  if (diff > VIEW_HALF_ANGLE) return false;
  return hasLineOfSight(level, g.px, g.py, player.x, player.y);
}

export function guardCaughtPlayer(g, player) {
  return dist(g.px, g.py, player.x, player.y) < CAUGHT_DISTANCE * TILE;
}
