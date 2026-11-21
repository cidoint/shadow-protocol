// Entry point: canvas bootstrap, input wiring, scene transitions, main loop.
import { initInput } from './input.js';
import { createGame } from './game.js';
import { NOISE_MAX } from './config.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
initInput(canvas);

const game = createGame(canvas);

function onEnter(e) {
  if (e.code !== 'Enter') return;
  if (game.scene === 'title') game.startLevel(0);
  else if (game.scene === 'caught') game.startLevel(game.levelIndex);
  else if (game.scene === 'complete') game.startLevel(0);
}
window.addEventListener('keydown', onEnter);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw();
  if (status) {
    status.textContent = game.scene === 'play'
      ? `Level ${game.levelIndex + 1}. Noise ${Math.round((game.noise / NOISE_MAX) * 100)}%. ${game.msg}`
      : `Scene: ${game.scene}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
