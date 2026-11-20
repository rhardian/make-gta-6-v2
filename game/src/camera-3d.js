// 3D perspective camera & projection engine for Solaria Bay: chase camera, helicopter camera,
// tactical overhead camera, Sutherland-Hodgman 3D near-plane polygon clipping, 3D box face
// extraction, backface culling, depth sorting and screen-to-ground raycasting.

export const CAMERA_MODES = [
  { id: 'chase_low', name: 'Action Chase 3D', dist: 112, height: 48, pitch: 0.36, fovScale: 0.88 },
  { id: 'chase_high', name: 'Panoramic Follow 3D', dist: 155, height: 82, pitch: 0.48, fovScale: 0.84 },
  { id: 'tactical_top', name: 'Tactical Helicopter 3D', dist: 190, height: 165, pitch: 0.74, fovScale: 0.82 },
];

const NEAR_PLANE = 10;

export function createCamera3D() {
  return {
    x: 240,
    y: 120,
    z: 48,
    yaw: -Math.PI * 0.5,
    pitch: 0.36,
    fovScale: 0.88,
    modeIndex: 0,
    targetX: 240,
    targetY: 0,
    targetZ: 10,
    shakeTimer: 0,
    shakeIntensity: 0,
    viewportWidth: 1280,
    viewportHeight: 720,
    centerX: 640,
    centerY: 446,
    focalLength: 633,
    horizonY: 205,
  };
}

export function cycleCameraMode(camera) {
  camera.modeIndex = (camera.modeIndex + 1) % CAMERA_MODES.length;
  const mode = CAMERA_MODES[camera.modeIndex];
  camera.pitch = mode.pitch;
  camera.fovScale = mode.fovScale;
  return mode;
}

export function triggerCameraShake(camera, intensity = 6, duration = 0.28) {
  camera.shakeIntensity = Math.max(camera.shakeIntensity, intensity);
  camera.shakeTimer = Math.max(camera.shakeTimer, duration);
}

export function updateCameraFollow(camera, target, dt, viewportW = 1280, viewportH = 720) {
  const mode = CAMERA_MODES[camera.modeIndex];
  camera.viewportWidth = viewportW;
  camera.viewportHeight = viewportH;
  camera.centerX = viewportW * 0.5;
  camera.centerY = viewportH * 0.62;
  camera.focalLength = viewportH * mode.fovScale;

  // Smoothly align camera yaw behind target angle
  const desiredYaw = target.angle ?? camera.yaw;
  let angleDiff = desiredYaw - camera.yaw;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const yawLerp = target.inVehicle ? Math.min(1, dt * 6.5) : Math.min(1, dt * 9.0);
  camera.yaw += angleDiff * yawLerp;
  camera.pitch += (mode.pitch - camera.pitch) * Math.min(1, dt * 8);

  const speedBonus = target.speed ? Math.min(28, Math.abs(target.speed) * 0.08) : 0;
  const dist = mode.dist + speedBonus;
  const desiredX = target.x - Math.cos(camera.yaw) * dist;
  const desiredY = target.y - Math.sin(camera.yaw) * dist;
  const desiredZ = mode.height + speedBonus * 0.22;

  const posLerp = Math.min(1, dt * 11);
  camera.x += (desiredX - camera.x) * posLerp;
  camera.y += (desiredY - camera.y) * posLerp;
  camera.z += (desiredZ - camera.z) * posLerp;

  if (camera.shakeTimer > 0) {
    camera.shakeTimer = Math.max(0, camera.shakeTimer - dt);
    const s = camera.shakeIntensity * (camera.shakeTimer / 0.3);
    camera.x += (Math.sin(camera.shakeTimer * 95) * s);
    camera.z += (Math.cos(camera.shakeTimer * 110) * s * 0.5);
  } else {
    camera.shakeIntensity = 0;
  }

  camera.horizonY = camera.centerY - camera.focalLength * Math.tan(camera.pitch);
}

export function worldToCameraSpace(camera, wx, wy, wz) {
  const dx = wx - camera.x;
  const dy = wy - camera.y;
  const dz = wz - camera.z;

  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const forward = dx * cosYaw + dy * sinYaw;
  const right = -dx * sinYaw + dy * cosYaw;

  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const camZ = forward * cosPitch - dz * sinPitch;
  const camY = forward * sinPitch + dz * cosPitch;
  const camX = right;

  return { camX, camY, camZ, forward };
}

export function projectPoint3D(camera, wx, wy, wz) {
  const { camX, camY, camZ } = worldToCameraSpace(camera, wx, wy, wz);
  if (camZ < NEAR_PLANE) return null;
  const invZ = camera.focalLength / camZ;
  return {
    x: camera.centerX + camX * invZ,
    y: camera.centerY - camY * invZ,
    depth: camZ,
    scale: invZ,
  };
}

export function clipAndProjectPolygon3D(camera, vertices3D) {
  const camVerts = [];
  for (let i = 0; i < vertices3D.length; i += 1) {
    const v = vertices3D[i];
    camVerts.push(worldToCameraSpace(camera, v[0], v[1], v[2]));
  }

  // Sutherland-Hodgman clip against camZ >= NEAR_PLANE
  const clipped = [];
  const count = camVerts.length;
  for (let i = 0; i < count; i += 1) {
    const prev = camVerts[(i + count - 1) % count];
    const curr = camVerts[i];
    const prevIn = prev.camZ >= NEAR_PLANE;
    const currIn = curr.camZ >= NEAR_PLANE;

    if (prevIn && currIn) {
      clipped.push(curr);
    } else if (prevIn && !currIn) {
      const t = (NEAR_PLANE - prev.camZ) / (curr.camZ - prev.camZ);
      clipped.push({
        camX: prev.camX + (curr.camX - prev.camX) * t,
        camY: prev.camY + (curr.camY - prev.camY) * t,
        camZ: NEAR_PLANE,
      });
    } else if (!prevIn && currIn) {
      const t = (NEAR_PLANE - prev.camZ) / (curr.camZ - prev.camZ);
      clipped.push({
        camX: prev.camX + (curr.camX - prev.camX) * t,
        camY: prev.camY + (curr.camY - prev.camY) * t,
        camZ: NEAR_PLANE,
      });
      clipped.push(curr);
    }
  }

  if (clipped.length < 3) return null;

  const screenPts = [];
  let depthSum = 0;
  for (let i = 0; i < clipped.length; i += 1) {
    const c = clipped[i];
    const invZ = camera.focalLength / c.camZ;
    screenPts.push({
      x: camera.centerX + c.camX * invZ,
      y: camera.centerY - c.camY * invZ,
    });
    depthSum += c.camZ;
  }

  return {
    points: screenPts,
    depth: depthSum / clipped.length,
  };
}

export function buildOrientedBoxVertices(x, y, zBase, length, width, height, angle = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hl = length * 0.5;
  const hw = width * 0.5;
  const zTop = zBase + height;

  const corners2D = [
    [x + hl * cos - (-hw) * sin, y + hl * sin + (-hw) * cos], // 0: Front-Left
    [x + hl * cos - hw * sin, y + hl * sin + hw * cos],       // 1: Front-Right
    [x - hl * cos - hw * sin, y - hl * sin + hw * cos],       // 2: Back-Right
    [x - hl * cos - (-hw) * sin, y - hl * sin + (-hw) * cos], // 3: Back-Left
  ];

  return [
    [corners2D[0][0], corners2D[0][1], zBase],
    [corners2D[1][0], corners2D[1][1], zBase],
    [corners2D[2][0], corners2D[2][1], zBase],
    [corners2D[3][0], corners2D[3][1], zBase],
    [corners2D[0][0], corners2D[0][1], zTop],
    [corners2D[1][0], corners2D[1][1], zTop],
    [corners2D[2][0], corners2D[2][1], zTop],
    [corners2D[3][0], corners2D[3][1], zTop],
  ];
}

export function screenRayToGround(camera, screenX, screenY) {
  const ndcX = (screenX - camera.centerX) / camera.focalLength;
  const ndcY = (camera.centerY - screenY) / camera.focalLength;

  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const rayForward = cosPitch + ndcY * sinPitch;
  const rayUp = -sinPitch + ndcY * cosPitch;
  const rayRight = ndcX;

  if (rayUp >= -0.02) {
    // Ray points above or near horizon: project 320 units ahead along ray direction
    const cosYaw = Math.cos(camera.yaw);
    const sinYaw = Math.sin(camera.yaw);
    const wx = camera.x + (rayForward * cosYaw - rayRight * sinYaw) * 320;
    const wy = camera.y + (rayForward * sinYaw + rayRight * cosYaw) * 320;
    return { x: wx, y: wy };
  }

  const t = -camera.z / rayUp;
  const forwardDist = rayForward * t;
  const rightDist = rayRight * t;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);

  return {
    x: camera.x + forwardDist * cosYaw - rightDist * sinYaw,
    y: camera.y + forwardDist * sinYaw + rightDist * cosYaw,
  };
}
