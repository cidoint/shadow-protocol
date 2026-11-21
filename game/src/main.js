// Entry point: canvas bootstrap, input wiring, main loop, scene transitions.
import { initInput } from './input.js';
import { createGame } from './game.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
initInput(canvas);

const game = createGame(canvas);
window.game = game; // debug hook, harmless in production

function onKey(e) {
  if (e.code !== 'Enter') return;
  if (game.scene === 'title') game.startLevel(0);
  else if (game.scene === 'caught') { game.noise = 0; game.startLevel(game.levelIndex); }
  else if (game.scene === 'complete') game.startLevel(0);
}
window.addEventListener('keydown', onKey);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw();
  if (status) {
    status.textContent = game.scene === 'play'
      ? `Level ${game.levelIndex + 1}. Noise ${Math.round(game.noise)} percent. ${game.msg}`
      : `Scene: ${game.scene}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
