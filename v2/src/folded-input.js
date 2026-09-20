// Browser input owns capture/fallback state. Game actions and pause policy are
// supplied by the running session; mouse motion never performs scene queries.
export function installFoldedInput({ canvas, settings, keys, pointer, follow, status, actions }) {
  let pointerLockFailed = false;
  let capturePending = false;
  let hadPointerLock = false;
  let orbiting = false;
  let pointerOver = false;
  let looked = false;

  function unavailable() {
    pointerLockFailed = true;
    pointerOver = true;
    actions.captureUnavailable();
  }

  async function capture() {
    if (
      !status.thirdPerson ||
      status.paused ||
      status.mapOpen ||
      status.dead ||
      status.endingTime ||
      status.endingVisible ||
      pointerLockFailed ||
      capturePending
    )
      return;
    if (!canvas.requestPointerLock) {
      unavailable();
      return;
    }
    capturePending = true;
    try {
      try {
        await canvas.requestPointerLock({ unadjustedMovement: true });
      } catch (error) {
        if (error.name !== 'NotSupportedError') throw error;
        await canvas.requestPointerLock();
      }
      if (
        (!status.thirdPerson || status.paused || status.mapOpen || status.endingVisible) &&
        document.pointerLockElement === canvas
      )
        document.exitPointerLock();
    } catch {
      unavailable();
    } finally {
      capturePending = false;
    }
  }

  addEventListener('keydown', (event) => {
    if (status.paused && !status.rebind && event.code !== status.bindings.pause) return;
    if (Object.values(status.bindings).includes(event.code) || status.rebind) {
      event.preventDefault();
      actions.input(event.code, event.repeat);
    }
  });
  addEventListener('keyup', (event) => keys.delete(event.code));
  document.addEventListener('pointerlockerror', () => {
    // Promise failures are handled above, including retry without raw input.
    if (!capturePending && !document.pointerLockElement) unavailable();
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas,
      wasLocked = hadPointerLock;
    hadPointerLock = locked;
    pointerOver = locked;
    keys.clear();
    document.body.classList.toggle('mouse-look', locked);
    if (
      status.thirdPerson &&
      wasLocked &&
      !locked &&
      !status.paused &&
      !status.mapOpen &&
      !status.endingVisible &&
      !status.endingTime &&
      !status.dead
    )
      actions.pause();
  });
  document.addEventListener('mousemove', (event) => {
    if (
      status.thirdPerson &&
      (document.pointerLockElement === canvas || orbiting) &&
      !status.paused &&
      !status.mapOpen &&
      !status.endingTime &&
      !status.dead &&
      !status.stunned
    ) {
      follow.turn(event.movementX, event.movementY);
      if (event.movementX || event.movementY) looked = true;
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!status.thirdPerson && !status.stunned) {
      pointer.set((event.clientX / innerWidth) * 2 - 1, 1 - (event.clientY / innerHeight) * 2);
      pointerOver = true;
    }
  });
  canvas.addEventListener('pointerleave', () => {
    if (!document.pointerLockElement && !orbiting) pointerOver = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    event.preventDefault();
    if (status.dead) return;
    if (status.thirdPerson && event.button === 1 && document.pointerLockElement !== canvas) {
      orbiting = true;
      pointerOver = true;
      return;
    }
    if (status.thirdPerson && !pointerLockFailed && document.pointerLockElement !== canvas) {
      capture();
      return;
    }
    // Preserve fractional PointerEvent coordinates when MouseEvent rounds them.
    if (!status.thirdPerson && !pointerOver)
      pointer.set((event.clientX / innerWidth) * 2 - 1, 1 - (event.clientY / innerHeight) * 2);
    if (status.thirdPerson) actions.updateCamera(0);
    actions.updateAim();
    actions.input(`Mouse${event.button}`);
  });
  addEventListener('mouseup', (event) => {
    keys.delete(`Mouse${event.button}`);
    if (event.button === 1) orbiting = false;
  });
  addEventListener('contextmenu', (event) => event.preventDefault());
  settings.addEventListener('pointerdown', (event) => {
    if (status.rebind) {
      event.preventDefault();
      event.stopPropagation();
      actions.input(`Mouse${event.button}`);
    }
  });
  addEventListener('blur', () => {
    keys.clear();
    actions.pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) actions.pause();
  });

  return {
    capture,
    stopOrbit() {
      orbiting = false;
    },
    get pointerOver() {
      return pointerOver;
    },
    get looked() {
      return looked;
    },
    get dragLook() {
      return pointerLockFailed;
    },
  };
}
