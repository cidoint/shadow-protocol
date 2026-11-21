// Shadow Protocol — global tuning constants.
export const TILE = 40;               // pixels per tile
export const PLAYER_SPEED = 168;      // px/s walking
export const SNEAK_SPEED = 78;        // px/s sneaking (Shift held)
export const PLAYER_RADIUS = 11;      // collision radius
export const GUARD_SPEED = 118;       // patrol speed
export const GUARD_CHASE_SPEED = 168;
export const GUARD_RADIUS = 12;
export const VIEW_DISTANCE = 230;     // vision cone reach in px
export const VIEW_HALF_ANGLE = Math.PI / 5.2; // ~35 degrees half-angle
export const HEARING_RADIUS = 120;    // running footsteps alert guards
export const ALERT_TIME = 4.5;        // seconds a searching guard stays alarmed
export const CAUGHT_DISTANCE = 26;    // guard touching you = caught
export const SUSPICION_RATE = 2.6;    // seconds of seeing you before chase
export const SHADOW_BONUS = 0.35;     // detection speed multiplier in shadow
export const NOISE_DECAY = 26;        // noise meter units per second
export const NOISE_RUN_GAIN = 55;     // noise per second while running
export const NOISE_WALK_GAIN = 14;    // noise per second while walking
export const NOISE_MAX = 100;
export const GRAB_RADIUS = 30;        // pick up intel distance
export const EXIT_COLOR = '#ffd76b';
export const COLORS = {
  floorLit: '#3d4450',
  floorDark: '#20242e',
  wall: '#10131a',
  wallEdge: '#2c3340',
  crate: '#6e5230',
  crateEdge: '#8a6a3e',
  pillar: '#4a5060',
  exit: '#ffd76b',
  intel: '#7fe0ff',
  player: '#8ef29a',
  guard: '#e06a5a',
  coneSafe: 'rgba(120,180,255,0.16)',
  coneAlert: 'rgba(255,110,80,0.28)',
  shadow: 'rgba(4,6,10,0.55)',
};
