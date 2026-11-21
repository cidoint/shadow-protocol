// Guard AI: waypoint patrols, vision cones, suspicion, chase and search states.
import { dist, angleLerp, hasLineOfSight, inShadow, isSolid, moveCircle } from './geometry.js';
import { GUARD_SPEED, GUARD_CHASE_SPEED, VIEW_DISTANCE, VIEW_HALF_ANGLE,
         HEARING_RADIUS, ALERT_TIME, SUSPICION_RATE, SHADOW_BONUS, CAUGHT_DISTANCE } from './config.js';

// March a guard toward a target point with simple wall-slide movement.
function stepToward(g, tx, ty, speed, level, dt) {
  const d = dist(g.px, g.py, tx, ty);
  if (d < 4) return true;
  const ux = (tx - g.px) / d, uy = (ty - g.py) / d;
  const p = moveCircle(level, g.px, g.py, ux * speed * dt, uy * speed * dt, 12);
  g.px = p.x; g.py = p.y;
  g.facing = angleLerp(g.facing, Math.atan2(uy, ux), 8 * dt);
  return false;
}

// If a direct step is blocked, pick a detour waypoint around the obstacle.
function nudgeAround(g, tx, ty, level) {
  const tries = [[40, 0], [-40, 0], [0, 40], [0, -40], [40, 40], [-40, -40], [40, -40], [-40, 40]];
  for (const [ox, oy] of tries) {
    const cx = g.px + ox, cy = g.py + oy;
    if (!isSolid(level, cx, cy)) return { x: cx, y: cy };
  }
  return { x: g.px, y: g.py };
}

export function updateGuard(g, level, player, noise, dt) {
  const sees = canGuardSee(g, level, player);
  const hears = noise > 45 && dist(g.px, g.py, player.x, player.y) < HEARING_RADIUS;

  if (sees || dist(g.px, g.py, player.x, player.y) < CAUGHT_DISTANCE && sees) {
    g.suspicion += dt * (inShadow(level, player.x, player.y) ? SUSPICION_RATE * SHADOW_BONUS : SUSPICION_RATE) * 1.6;
  } else {
    g.suspicion = Math.max(0, g.suspicion - dt * 0.9);
  }
  if (hears && g.state === 'patrol') {
    g.state = 'search';
    g.timer = ALERT_TIME * 0.7;
    g.lastSeen = { x: player.x, y: player.y };
  }

  if (g.suspicion >= SUSPICION_RATE && g.state !== 'chase') {
    g.state = 'chase';
    g.lastSeen = { x: player.x, y: player.y };
    g.timer = ALERT_TIME;
  }

  if (g.state === 'patrol') {
    const wp = g.route[g.wp];
    const tx = wp[0] * 40 + 20, ty = wp[1] * 40 + 20;
    if (stepToward(g, tx, ty, GUARD_SPEED, level, dt)) {
      g.wp = (g.wp + 1) % g.route.length;
      // Pause a beat at each waypoint.
      g.timer = 0.6; g.state = 'wait';
    }
  } else if (g.state === 'wait') {
    g.timer -= dt;
    if (g.timer <= 0) g.state = 'patrol';
  } else if (g.state === 'search') {
    g.timer -= dt;
    const t = g.lastSeen;
    if (t && stepToward(g, t.x, t.y, GUARD_SPEED, level, dt)) {
      // Sweep: rotate in place while searching.
      g.facing += dt * 1.8;
    }
    if (g.timer <= 0) { g.state = 'patrol'; g.lastSeen = null; }
  } else if (g.state === 'chase') {
    const p = { x: player.x, y: player.y };
    if (sees) { g.lastSeen = p; g.timer = ALERT_TIME; }
    else g.timer -= dt;
    const t = g.lastSeen || p;
    const arrived = stepToward(g, t.x, t.y, GUARD_CHASE_SPEED, level, dt);
    if (arrived && !sees) {
      g.state = 'search'; g.timer = ALERT_TIME;
    }
    if (g.timer <= 0) { g.state = 'search'; g.timer = ALERT_TIME * 0.6; }
  }
}

export function canGuardSee(g, level, player) {
  const d = dist(g.px, g.py, player.x, player.y);
  if (d > VIEW_DISTANCE) return false;
  const ang = Math.atan2(player.y - g.py, player.x - g.px);
  let diff = Math.abs(((ang - g.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  if (diff > VIEW_HALF_ANGLE) return false;
  return hasLineOfSight(level, g.px, g.py, player.x, player.y);
}

export function guardCaughtPlayer(g, player) {
  return dist(g.px, g.py, player.x, player.y) < CAUGHT_DISTANCE;
}

export { nudgeAround };
