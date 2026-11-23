// Keyboard, mouse look/aim, scroll wheel weapon select, and action bindings for Solaria Bay.

export function createInputController(canvas, callbacks) {
  const keys = {};
  let mouseDown = false;
  let rightMouseDown = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let deltaX = 0;
  let deltaY = 0;
  let jumpQueued = false;

  const onKeyDown = (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    const firstPress = !keys[e.code];
    keys[e.code] = true;
    if (!firstPress) return;

    if (e.code === 'Space') jumpQueued = true;
    if (e.code === 'KeyF') callbacks.onInteract?.();
    if (e.code === 'KeyR') callbacks.onCycleRadio?.();
    if (e.code === 'KeyM' || e.code === 'Escape') callbacks.onToggleAtlas?.();
    if (e.code === 'F5') { e.preventDefault(); callbacks.onQuickSave?.(); }
    if (e.code === 'F9') { e.preventDefault(); callbacks.onQuickLoad?.(); }

    // Crew Favours: Q/Z = Plate Swap, E/X = Roadside Repair, C = Dispatch Jam
    if (e.code === 'KeyQ' || e.code === 'KeyZ') callbacks.onCrewFavour?.('plate_swap');
    if (e.code === 'KeyE' || e.code === 'KeyX') callbacks.onCrewFavour?.('road_repair');
    if (e.code === 'KeyC') callbacks.onCrewFavour?.('dispatch_jam');

    // Weapons 1..8
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 8) callbacks.onSelectWeapon?.(n - 1);
    }
  };

  const onKeyUp = (e) => {
    keys[e.code] = false;
  };

  const onMouseDown = (e) => {
    if (e.target !== canvas) return;
    callbacks.onUserGesture?.();
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) { rightMouseDown = true; dragging = true; }
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onMouseUp = (e) => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) { rightMouseDown = false; dragging = false; }
  };

  const onMouseMove = (e) => {
    if (document.pointerLockElement === canvas) {
      deltaX += e.movementX;
      deltaY += e.movementY;
    } else if (dragging || mouseDown) {
      deltaX += e.clientX - lastX;
      deltaY += e.clientY - lastY;
    }
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onWheel = (e) => {
    if (e.target !== canvas) return;
    callbacks.onWheelWeapon?.(e.deltaY > 0 ? 1 : -1);
  };

  const onContextMenu = (e) => {
    if (e.target === canvas) e.preventDefault();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('contextmenu', onContextMenu);

  return {
    keys,
    get mouseDown() { return mouseDown; },
    get rightMouseDown() { return rightMouseDown; },
    consumeMouseDelta() {
      const out = { dx: deltaX, dy: deltaY };
      deltaX = 0;
      deltaY = 0;
      return out;
    },
    consumeJump() {
      const q = jumpQueued;
      jumpQueued = false;
      return q;
    },
    clearAll() {
      mouseDown = false;
      rightMouseDown = false;
      dragging = false;
      for (const k of Object.keys(keys)) keys[k] = false;
    },
  };
}
