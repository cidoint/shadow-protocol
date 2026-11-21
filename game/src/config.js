// Shadow Protocol — shared tuning constants.
// Positions and distances are in tile units; rendering multiplies by TILE.

export const TILE = 40; // pixels per tile

// Movement, in tiles per second.
export const PLAYER_SPEED = 3.5;
export const PLAYER_CROUCH_SPEED = 1.6; // quieter, and less visible in shadows
export const PLAYER_RADIUS = 0.28; // tiles — player collision radius (~11px)
export const GUARD_SPEED = 2.0;
export const GUARD_CHASE_SPEED = 3.5; // chasing is faster than a patrol stroll

// Guard vision: a cone in front of the guard.
export const VIEW_DISTANCE = 6.5; // tiles the guard can see
export const VIEW_HALF_ANGLE = Math.PI / 4; // radians, half the cone's spread
export const CAUGHT_DISTANCE = 0.65; // tiles — a guard this close catches the player

// Guard hearing: the closest a sound may be, in tiles, before it alerts.
export const HEARING_RADIUS = 4.5;

// Suspicion rises while the player is seen and cools while unseen.
export const SUSPICION_RATE = 0.55; // 0..1 gained per second while visible
export const SUSPICION_DECAY = 0.4; // 0..1 lost per second while hidden
export const SHADOW_BONUS = 0.35; // suspicion gain multiplier while the player is in shadow
export const ALERT_TIME = 4.5; // seconds a searching/chasing guard stays alarmed

// Noise meter: actions raise it, it decays over time.
export const NOISE_GAIN_RUN = 2.0; // running adds this much per second
export const NOISE_GAIN_CROUCH = 0.4; // crouching adds this much per second
export const NOISE_DECAY = 1.6; // lost per second when idle
export const NOISE_ALERT_THRESHOLD = 1.0; // a guard notices noise at or above this
export const NOISE_MAX = 3.0; // noise meter cap
export const GRAB_RADIUS = 0.75; // tiles — pick up intel / reach the exit (~30px)

// Palette used by the renderer.
export const COLORS = {
  floorLit: '#28303f',
  floorDark: '#12161e',
  wall: '#3c4456',
  crate: '#8a6d3b',
  pillar: '#4a5368',
  exit: '#33c07a',
  intel: '#ffd166',
  player: '#7dd3fc',
  guard: '#ef4444',
};
