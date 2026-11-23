// Smooth third-person vehicle chase camera, over-the-shoulder on-foot combat camera,
// panoramic title-screen flyover camera, and screen-shake impulses.

import * as THREE from 'three';

export function createCameraController(aspect = 1280 / 720) {
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.4, 2400);
  camera.position.set(240, 6, -102);

  return {
    camera,
    mode: 'gameplay', // gameplay | panorama | fixed
    yaw: 0,
    pitch: -0.06,
    orbitOffset: 0,
    shake: 0,
    smoothPos: new THREE.Vector3(240, 6, -102),
    smoothLook: new THREE.Vector3(240, 2, -80),
    fixedPos: null,
    fixedLook: null,
    fixedFov: 58,
  };
}

export function setFixedCamera(ctrl, pos, lookAt, fov = 58) {
  ctrl.mode = 'fixed';
  ctrl.fixedPos = new THREE.Vector3(pos[0], pos[1], pos[2]);
  ctrl.fixedLook = new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]);
  ctrl.fixedFov = fov;
  ctrl.camera.fov = fov;
  ctrl.camera.position.copy(ctrl.fixedPos);
  ctrl.camera.lookAt(ctrl.fixedLook);
  ctrl.camera.updateProjectionMatrix();
}

export function addCameraShake(ctrl, amount) {
  ctrl.shake = Math.min(1.4, ctrl.shake + amount);
}

export function updateCameraController(ctrl, player, input, dt, elapsed) {
  if (ctrl.mode === 'fixed' && ctrl.fixedPos && ctrl.fixedLook) {
    ctrl.camera.position.copy(ctrl.fixedPos);
    ctrl.camera.lookAt(ctrl.fixedLook);
    return;
  }

  if (ctrl.mode === 'panorama') {
    // Sweeping golden-hour elevated coastal panorama for Start / Title Screen
    const sway = Math.sin(elapsed * 0.14) * 14;
    ctrl.camera.fov = 52;
    ctrl.camera.updateProjectionMatrix();
    ctrl.camera.position.set(288 + sway * 0.4, 46, -178 + sway * 0.5);
    ctrl.camera.lookAt(272, 11, 22);
    return;
  }

  const delta = input ? input.consumeMouseDelta() : { dx: 0, dy: 0 };

  if (player.inVehicle && player.vehicle) {
    const v = player.vehicle;
    ctrl.orbitOffset = THREE.MathUtils.clamp(ctrl.orbitOffset - delta.dx * 0.004, -1.35, 1.35);
    if (Math.abs(delta.dx) < 0.01 && Math.abs(v.speed) > 4) {
      ctrl.orbitOffset = THREE.MathUtils.lerp(ctrl.orbitOffset, 0, Math.min(1, dt * 2.2));
    }

    // Smooth yaw follow with subtle drift trail lag so supercar side profile stays heroic
    const targetYaw = v.yaw + ctrl.orbitOffset;
    let diff = targetYaw - ctrl.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ctrl.yaw += diff * Math.min(1, dt * 6.5);

    const dist = v.spec.isBoat ? 13.5 : (9.8 + Math.min(3.2, v.speed * 0.045));
    const height = v.spec.isBoat ? 4.8 : 3.9;
    const desiredPos = new THREE.Vector3(
      v.x - Math.sin(ctrl.yaw) * dist,
      v.y + height,
      v.z - Math.cos(ctrl.yaw) * dist,
    );
    const desiredLook = new THREE.Vector3(
      v.x + Math.sin(v.yaw) * 7.5,
      v.y + 1.55,
      v.z + Math.cos(v.yaw) * 7.5,
    );

    ctrl.smoothPos.lerp(desiredPos, Math.min(1, dt * 9));
    ctrl.smoothLook.lerp(desiredLook, Math.min(1, dt * 11));
    const targetFov = 58 + Math.min(12, v.speed * 0.16) + (v.nitroActive ? 5 : 0);
    ctrl.camera.fov = THREE.MathUtils.lerp(ctrl.camera.fov, targetFov, Math.min(1, dt * 5));
  } else {
    // Crisp over-the-shoulder third-person on-foot exploration & combat camera
    ctrl.yaw -= delta.dx * 0.0045;
    ctrl.pitch = THREE.MathUtils.clamp(ctrl.pitch - delta.dy * 0.0035, -0.45, 0.42);
    const aimZoom = Boolean(input && input.rightMouseDown);
    const dist = aimZoom ? 3.2 : 4.6;
    const shoulder = aimZoom ? 0.95 : 0.78;

    const fx = Math.sin(ctrl.yaw);
    const fz = Math.cos(ctrl.yaw);
    const rx = -Math.cos(ctrl.yaw);
    const rz = Math.sin(ctrl.yaw);

    const desiredPos = new THREE.Vector3(
      player.x - fx * dist + rx * shoulder,
      player.y + 2.15 - Math.sin(ctrl.pitch) * 1.4,
      player.z - fz * dist + rz * shoulder,
    );
    const desiredLook = new THREE.Vector3(
      player.x + fx * 18 + rx * shoulder * 0.35,
      player.y + 1.48 + Math.sin(ctrl.pitch) * 8,
      player.z + fz * 18 + rz * shoulder * 0.35,
    );

    ctrl.smoothPos.lerp(desiredPos, Math.min(1, dt * 14));
    ctrl.smoothLook.lerp(desiredLook, Math.min(1, dt * 16));
    ctrl.camera.fov = THREE.MathUtils.lerp(ctrl.camera.fov, aimZoom ? 48 : 58, Math.min(1, dt * 8));
  }

  ctrl.shake = Math.max(0, ctrl.shake - dt * 2.8);
  const shX = ctrl.shake > 0 ? (Math.random() - 0.5) * ctrl.shake * 0.65 : 0;
  const shY = ctrl.shake > 0 ? (Math.random() - 0.5) * ctrl.shake * 0.65 : 0;

  ctrl.camera.position.set(ctrl.smoothPos.x + shX, Math.max(0.8, ctrl.smoothPos.y + shY), ctrl.smoothPos.z);
  ctrl.camera.lookAt(ctrl.smoothLook);
  ctrl.camera.updateProjectionMatrix();
}
