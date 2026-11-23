// Input for the default camera. Only the projection and journey diagnostics are read.
if (!window.drivingControls) {
  let yaw = -Math.PI / 2;
  const canvas = document.querySelector('#game');
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  function turn(dx, dy) {
    const movementX = Math.round(dx), movementY = Math.round(dy);
    canvas.dispatchEvent(new MouseEvent('mousemove', {movementX, movementY}));
    yaw -= movementX * 0.0075;
  }
  window.drivingControls = {
    async aim([x, y, z]) {
      const p = window.__typedRead();
      const angle = Math.atan2(x - p.x, z - p.z) - yaw;
      canvas.dispatchEvent(new MouseEvent('mousedown', {button: 1}));
      try {
        turn(-Math.atan2(Math.sin(angle), Math.cos(angle)) / 0.0075, 0);
        const focal = innerHeight / (2 * Math.tan(Math.PI / 6));
        for (let i = 0; i < 8; i++) {
          await frame();
          const [sx, sy] = window.__typedProject(x, y, z);
          const dx = sx - innerWidth / 2, dy = sy - innerHeight / 2;
          if (Math.hypot(dx, dy) < 4) break;
          turn(Math.atan2(dx, focal) / 0.0075, Math.atan2(dy, focal) / 0.006);
        }
      } finally {
        window.dispatchEvent(new MouseEvent('mouseup', {button: 1}));
      }
    },
    face([dx, dz]) {
      const angle = Math.atan2(dx, dz) - yaw;
      canvas.dispatchEvent(new MouseEvent('mousedown', {button: 1}));
      turn(-Math.atan2(Math.sin(angle), Math.cos(angle)) / 0.0075, 0);
      window.dispatchEvent(new MouseEvent('mouseup', {button: 1}));
    },
    keys([dx, dz]) {
      const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const right = -dx * Math.cos(yaw) + dz * Math.sin(yaw);
      const limit = Math.max(Math.abs(forward), Math.abs(right)) * Math.tan(Math.PI / 8);
      const keys = [];
      if (Math.abs(forward) > limit) keys.push(forward > 0 ? 'KeyW' : 'KeyS');
      if (Math.abs(right) > limit) keys.push(right > 0 ? 'KeyD' : 'KeyA');
      return keys;
    }
  };
}
