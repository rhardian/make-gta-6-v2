// Keyboard and mouse controller for Solaria Bay: Sun & Syndicate.
// Supports WASD/Arrows driving and walking, mouse 3D ground raycast aiming, carjacking (F/Enter),
// handbrake/shoot (Space), nitro/sprint (Shift), weapon selection (Q/E/1-5), camera toggle (V),
// radio tuning (R), landmark service interaction (N), map/save tablet (M/Esc) and quick-save (F5/F9).

import { screenRayToGround } from './camera-3d.js';

export function createInputController(canvas) {
  const keysDown = new Set();
  const triggers = new Set();

  let mouseX = 640;
  let mouseY = 360;
  let mouseDown = false;
  let mouseMovedRecently = 0;

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (!keysDown.has(code)) {
      triggers.add(code);
    }
    keysDown.add(code);

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'F5', 'F9'].includes(code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
  });

  window.addEventListener('blur', () => {
    keysDown.clear();
    mouseDown = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      mouseMovedRecently = 3.5;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouseDown = true;
      triggers.add('MouseLeft');
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      mouseDown = false;
    }
  });

  function pollInputState(camera, dt) {
    mouseMovedRecently = Math.max(0, mouseMovedRecently - dt);

    const up = keysDown.has('KeyW') || keysDown.has('ArrowUp');
    const down = keysDown.has('KeyS') || keysDown.has('ArrowDown');
    const left = keysDown.has('KeyA') || keysDown.has('ArrowLeft');
    const right = keysDown.has('KeyD') || keysDown.has('ArrowRight');
    const shift = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');
    const space = keysDown.has('Space');

    const throttle = (up ? 1 : 0) - (down ? 1 : 0);
    const steer = (right ? 1 : 0) - (left ? 1 : 0);

    const aimWorldPoint = camera ? screenRayToGround(camera, mouseX, mouseY) : null;

    return {
      throttle,
      steer,
      handbrake: space,
      nitro: shift,
      moveForward: throttle,
      moveRight: 0,
      turnInput: steer,
      sprint: shift,
      firing: mouseDown || space,
      mouseAimActive: mouseDown || mouseMovedRecently > 0,
      aimWorldPoint,
    };
  }

  function consumeTrigger(code) {
    if (triggers.has(code)) {
      triggers.delete(code);
      return true;
    }
    return false;
  }

  function clearTriggers() {
    triggers.clear();
  }

  return {
    pollInputState,
    consumeTrigger,
    clearTriggers,
  };
}
