// Game state machine: title, playing, caught, and complete screens plus the full sim.
// The frame itself is delegated to render.js; this module owns state and the update step.
import { LEVELS, buildLevel } from './levels.js';
import { updateGuard, guardCaughtPlayer } from './guards.js';
import { moveCircle, dist, inShadow } from './geometry.js';
import { moveAxis, mousePos } from './input.js';
import { drawFrame } from './render.js';
import { PLAYER_SPEED, PLAYER_CROUCH_SPEED, PLAYER_RADIUS, NOISE_DECAY,
         NOISE_GAIN_RUN, NOISE_GAIN_CROUCH, NOISE_MAX, GRAB_RADIUS,
         NOISE_ALERT_THRESHOLD, TILE } from './config.js';

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const game = {
    canvas,
    ctx,
    scene: 'title', // title | play | caught | complete
    levelIndex: 0,
    level: null,
    player: { x: 0, y: 0, facing: 0 },
    cam: { x: 0, y: 0 },
    noise: 0,
    sneaking: false,
    time: 0,
    intelHave: 0,
    intelTotal: 0,
    msg: '',
  };

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  game.startLevel = function (i) {
    this.levelIndex = i;
    this.level = buildLevel(JSON.parse(JSON.stringify(LEVELS[i])));
    this.player.x = this.level.start.x * TILE + TILE / 2;
    this.player.y = this.level.start.y * TILE + TILE / 2;
    this.noise = 0;
    this.intelTotal = this.level.intel ? 1 : 0;
    this.intelHave = 0;
    this.scene = 'play';
    this.msg = this.level.hint;
    centerCam();
  };

  function centerCam() {
    game.cam.x = game.player.x - canvas.width / 2;
    game.cam.y = game.player.y - canvas.height / 2;
    game.cam.x = Math.max(0, Math.min(game.level.w * TILE - canvas.width, game.cam.x));
    game.cam.y = Math.max(0, Math.min(game.level.h * TILE - canvas.height, game.cam.y));
  }

  game.update = function (dt) {
    this.time += dt;
    if (this.scene !== 'play') return;
    const lvl = this.level;

    // Player movement.
    const ax = moveAxis();
    this.sneaking = ax.sneak;
    const speed = (ax.sneak ? PLAYER_CROUCH_SPEED : PLAYER_SPEED) * TILE;
    const len = Math.hypot(ax.dx, ax.dy);
    const moving = len > 0;
    if (moving) {
      const ux = ax.dx / len, uy = ax.dy / len;
      const p = moveCircle(lvl, this.player.x, this.player.y, ux * speed * dt, uy * speed * dt, PLAYER_RADIUS * TILE);
      this.player.x = p.x;
      this.player.y = p.y;
      this.player.facing = Math.atan2(uy, ux);
    } else {
      const m = mousePos();
      this.player.facing = Math.atan2(m.y + this.cam.y - this.player.y, m.x + this.cam.x - this.player.x);
    }

    // Noise meter: running is loud, crouching is quiet, standing still decays.
    if (moving && !ax.sneak) this.noise = Math.min(NOISE_MAX, this.noise + NOISE_GAIN_RUN * dt);
    else if (moving) this.noise = Math.min(NOISE_MAX, this.noise + NOISE_GAIN_CROUCH * dt);
    else this.noise = Math.max(0, this.noise - NOISE_DECAY * dt);

    // Guards.
    for (const g of lvl.guards) updateGuard(g, lvl, this.player, this.noise, dt);

    // Intel pickup.
    if (lvl.intel && !lvl.intel.taken && dist(this.player.x, this.player.y, lvl.intel.x, lvl.intel.y) < GRAB_RADIUS * TILE) {
      lvl.intel.taken = true;
      this.intelHave = 1;
      this.msg = 'Intel acquired. Now reach the exit!';
    }

    // Caught?
    for (const g of lvl.guards) {
      if (guardCaughtPlayer(g, this.player)) {
        this.scene = 'caught';
        return;
      }
    }

    // Exit: requires intel on levels that carry it.
    const ex = lvl.exit.x * TILE + TILE / 2, ey = lvl.exit.y * TILE + TILE / 2;
    if (dist(this.player.x, this.player.y, ex, ey) < GRAB_RADIUS * TILE) {
      if (this.intelTotal > 0 && this.intelHave < this.intelTotal) {
        this.msg = 'The exit is locked — grab the intel first.';
      } else if (this.levelIndex + 1 < LEVELS.length) {
        this.startLevel(this.levelIndex + 1);
        return;
      } else {
        this.scene = 'complete';
        return;
      }
    }

    // Quiet-in-shadow hint.
    if (inShadow(lvl, this.player.x, this.player.y) && this.noise < NOISE_ALERT_THRESHOLD) {
      this.msg = 'Hidden in shadow — guards barely notice you.';
    }

    centerCam();
  };

  game.playerRef = function () {
    return this.player;
  };

  game.draw = function () {
    if (this.scene === 'title') { drawTitle(this); return; }
    if (this.scene === 'complete') { drawComplete(this); return; }
    drawFrame(this.ctx, this.canvas, this);
    if (this.scene === 'caught') drawOverlay(this, 'CAUGHT', '#ff5040', 'A guard spotted you. Press ENTER to retry the level.');
    if (this.scene === 'play' && this.msg) drawStatusLine(this);
  };

  return game;
}

function drawTitle(game) {
  const { ctx, canvas } = game;
  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8ef29a';
  ctx.font = 'bold 52px monospace';
  ctx.fillText('SHADOW PROTOCOL', canvas.width / 2, canvas.height / 2 - 90);
  ctx.fillStyle = '#cfd6e0';
  ctx.font = '17px monospace';
  ctx.fillText('A top-down stealth heist. Three floors, four sentries, one way out.', canvas.width / 2, canvas.height / 2 - 30);
  ctx.fillStyle = '#8892a0';
  ctx.font = '15px monospace';
  ctx.fillText('WASD / arrows: move     SHIFT: sneak     Mouse: look', canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText('Avoid the vision cones. Crates and pillars cast shadow. Running makes noise.', canvas.width / 2, canvas.height / 2 + 46);
  ctx.fillStyle = '#ffd76b';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('Press ENTER to begin', canvas.width / 2, canvas.height / 2 + 110);
  ctx.textAlign = 'left';
}

function drawComplete(game) {
  const { ctx, canvas } = game;
  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76b';
  ctx.font = 'bold 46px monospace';
  ctx.fillText('HEIST COMPLETE', canvas.width / 2, canvas.height / 2 - 40);
  ctx.fillStyle = '#8ef29a';
  ctx.font = '17px monospace';
  ctx.fillText('All floors cleared. Not a single alarm raised... probably.', canvas.width / 2, canvas.height / 2 + 10);
  ctx.fillStyle = '#8892a0';
  ctx.fillText('Press ENTER to play again', canvas.width / 2, canvas.height / 2 + 60);
  ctx.textAlign = 'left';
}

function drawOverlay(game, text, color, sub) {
  const { ctx, canvas } = game;
  ctx.fillStyle = 'rgba(5,7,11,0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 56px monospace';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = '#cfd6e0';
  ctx.font = '16px monospace';
  ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 34);
  ctx.textAlign = 'left';
}

// Bottom status line drawn on top of the rendered frame.
function drawStatusLine(game) {
  const { ctx, canvas, msg } = game;
  ctx.font = '15px monospace';
  const w = ctx.measureText(msg).width + 40;
  ctx.fillStyle = 'rgba(8,10,16,0.75)';
  ctx.fillRect(canvas.width / 2 - w / 2, canvas.height - 64, Math.max(w, 200), 32);
  ctx.fillStyle = '#cfd6e0';
  ctx.textAlign = 'center';
  ctx.fillText(msg, canvas.width / 2, canvas.height - 42);
  ctx.textAlign = 'left';
}
