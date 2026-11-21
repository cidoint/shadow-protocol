// Keyboard + mouse input: WASD/arrows move, Shift sneaks, mouse aims flashlight-free look.
const keys = Object.create(null);
const mouse = { x: 0, y: 0, down: false };

export function initInput(canvas) {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  window.addEventListener('mousedown', e => { mouse.down = true; });
  window.addEventListener('mouseup', e => { mouse.down = false; });
}

export function moveAxis() {
  let dx = 0, dy = 0;
  if (keys.KeyA || keys.ArrowLeft) dx -= 1;
  if (keys.KeyD || keys.ArrowRight) dx += 1;
  if (keys.KeyW || keys.ArrowUp) dy -= 1;
  if (keys.KeyS || keys.ArrowDown) dy += 1;
  return { dx, dy, sneak: !!(keys.ShiftLeft || keys.ShiftRight) };
}

export function mousePos() { return { x: mouse.x, y: mouse.y, down: mouse.down }; }

export function consumeAction() {
  if (keys.Space) { keys.Space = false; return true; }
  return false;
}
