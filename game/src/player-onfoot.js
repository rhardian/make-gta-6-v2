// Articulated 3D humanoid characters (Valeria "Val" Reyes, Rico Vega, civilians, SBPD officers,
// Syndicate enforcers), held 3D weapons, on-foot locomotion, and seamless vehicle carjacking.

import * as THREE from 'three';
import { SERVICE_POIS, WEAPONS, WORLD } from './config.js';
import { getGroundHeightAt, isWaterAt, resolveBuildingCollision } from './world-city.js';

export function buildWeaponPropMesh(weaponId) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#1e2430', roughness: 0.35, metalness: 0.7 });
  const accent = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.3, metalness: 0.8 });
  const wood = new THREE.MeshStandardMaterial({ color: '#854d27', roughness: 0.7 });

  if (weaponId === 'fists') return g;
  if (weaponId === 'viper_9mm') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.34), dark);
    slide.position.set(0, 0.04, 0.16);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.09), dark);
    grip.position.set(0, -0.05, 0.04);
    g.add(slide, grip);
  } else if (weaponId === 'stinger_smg') {
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.56), dark);
    rec.position.set(0, 0.03, 0.24);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.08), accent);
    mag.position.set(0, -0.13, 0.28);
    g.add(rec, mag);
  } else if (weaponId === 'coral_shotgun') {
    const brl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.92), dark);
    brl.position.set(0, 0.04, 0.38);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.28), wood);
    pump.position.set(0, 0.01, 0.45);
    g.add(brl, pump);
  } else if (weaponId === 'cobre_launcher') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.25, 8), new THREE.MeshStandardMaterial({ color: '#3f6212', roughness: 0.6 }));
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.08, 0.25);
    const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 8), new THREE.MeshStandardMaterial({ color: '#dc2626' }));
    warhead.rotation.x = Math.PI / 2;
    warhead.position.set(0, 0.08, 0.96);
    g.add(tube, warhead);
  } else if (weaponId === 'sol_grenade') {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: '#16a34a' }));
    orb.position.set(0, 0, 0.14);
    g.add(orb);
  } else {
    // Helios Carbine / Mirage Sniper
    const long = weaponId === 'mirage_sniper' ? 1.18 : 0.92;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, long), dark);
    body.position.set(0, 0.04, long * 0.4);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 7), accent);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.14, 0.25);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.09), dark);
    mag.position.set(0, -0.1, 0.32);
    g.add(body, scope, mag);
  }
  return g;
}

export function createCharacterRig(opts = {}) {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: opts.skin || '#d9a17c', roughness: 0.62 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: opts.jacket || '#ff4d6d', roughness: 0.48 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: opts.inner || '#f8fafc', roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: opts.pants || '#1e293b', roughness: 0.72 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hair || '#1c1512', roughness: 0.78 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.55 });

  // Smooth anatomical rounded legs (CylinderGeometry / CapsuleGeometry silhouettes)
  const legL = new THREE.Group();
  legL.position.set(-0.135, 0.86, 0);
  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.078, 0.78, 10), pantsMat);
  thighL.position.y = -0.39;
  thighL.castShadow = true;
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.27), shoeMat);
  shoeL.position.set(0, -0.81, 0.045);
  legL.add(thighL, shoeL);

  const legR = legL.clone();
  legR.position.x = 0.135;

  // Tapered athletic torso + jacket lapels & belt
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.66, 12), jacketMat);
  torso.scale.set(1.12, 1, 0.68);
  torso.position.set(0, 1.2, 0);
  torso.castShadow = true;
  const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.56, 0.28), shirtMat);
  lapel.position.set(0, 1.22, 0.03);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.08, 12), shoeMat);
  belt.scale.set(1.12, 1, 0.7);
  belt.position.set(0, 0.89, 0);

  // Smooth rounded Head + Neck + Sculpted Hair / Shades / Police Cap
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.69, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.14, 8), skinMat);
  neck.position.y = -0.14;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 12), skinMat);
  head.scale.set(0.92, 1.06, 0.96);
  head.castShadow = true;
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.178, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hairTop.position.set(0, 0.02, -0.015);
  headGroup.add(neck, head, hairTop);

  if (opts.longHair) {
    const hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.34, 10), hairMat);
    hairBack.position.set(0, -0.1, -0.09);
    headGroup.add(hairBack);
  }
  if (opts.isPolice) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.1, 12), new THREE.MeshStandardMaterial({ color: '#0f172a' }));
    cap.position.set(0, 0.15, 0.02);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.14), new THREE.MeshStandardMaterial({ color: '#090d16' }));
    brim.position.set(0, 0.11, 0.16);
    headGroup.add(cap, brim);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.03), new THREE.MeshBasicMaterial({ color: '#fbbf24' }));
    badge.position.set(0.12, 1.32, 0.16);
    root.add(badge);
  }
  if (opts.sunglasses) {
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.065, 0.05), new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.12, metalness: 0.8 }));
    shades.position.set(0, 0.01, 0.145);
    headGroup.add(shades);
  }

  // Smooth articulated Arms + Hands + Right-Hand Weapon Mount
  const armL = new THREE.Group();
  armL.position.set(-0.31, 1.46, 0);
  const shL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), jacketMat);
  const limbL = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.058, 0.56, 8), jacketMat);
  limbL.position.y = -0.28;
  limbL.castShadow = true;
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), skinMat);
  handL.position.y = -0.57;
  armL.add(shL, limbL, handL);

  const armR = new THREE.Group();
  armR.position.set(0.31, 1.46, 0);
  const shR = shL.clone();
  const limbR = limbL.clone();
  const handR = handL.clone();
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.54, 0.04);
  weaponMount.rotation.x = Math.PI * 0.5;
  armR.add(shR, limbR, handR, weaponMount);

  root.add(legL, legR, torso, lapel, belt, headGroup, armL, armR);
  return { root, legL, legR, armL, armR, torso, headGroup, weaponMount, weaponId: '' };
}

export function setCharacterWeapon(rig, weaponId) {
  if (rig.weaponId === weaponId) return;
  rig.weaponId = weaponId;
  while (rig.weaponMount.children.length > 0) {
    rig.weaponMount.remove(rig.weaponMount.children[0]);
  }
  rig.weaponMount.add(buildWeaponPropMesh(weaponId));
}

export function animateCharacterRig(rig, moveSpeed, aiming, phase, alive = true) {
  if (!alive) {
    rig.root.rotation.x = -Math.PI / 2;
    rig.root.position.y = Math.max(0.22, rig.root.position.y);
    return;
  }
  rig.root.rotation.x = 0;
  const swing = Math.sin(phase) * Math.min(0.75, moveSpeed * 0.09);
  rig.legL.rotation.x = swing;
  rig.legR.rotation.x = -swing;
  if (aiming) {
    rig.armR.rotation.x = -Math.PI * 0.48;
    rig.armL.rotation.x = -Math.PI * 0.34;
    rig.armL.rotation.y = 0.25;
  } else {
    rig.armL.rotation.x = -swing * 0.85;
    rig.armL.rotation.y = 0;
    rig.armR.rotation.x = swing * 0.85;
  }
}

export function createPlayer(scene) {
  // Valeria "Val" Reyes — coral-crimson coastal jacket, dark denim, sunglasses
  const rig = createCharacterRig({
    skin: '#d99e78',
    jacket: '#e11d48',
    pants: '#1e293b',
    hair: '#1a1210',
    longHair: true,
    sunglasses: true,
  });
  setCharacterWeapon(rig, 'stinger_smg');
  scene.add(rig.root);

  const ammo = {};
  for (let i = 0; i < WEAPONS.length; i += 1) {
    ammo[WEAPONS[i].id] = WEAPONS[i].ammo;
  }

  return {
    name: 'Valeria "Val" Reyes',
    rig,
    x: 240, y: 0.16, z: -90,
    vx: 0, vy: 0, vz: 0,
    yaw: 0,
    speed: 0,
    gaitPhase: 0,
    health: 100,
    maxHealth: 100,
    armor: 85,
    maxArmor: 100,
    cash: 48500,
    respect: 420,
    inVehicle: false,
    vehicle: null,
    nearbyVehicle: null,
    nearbyPoi: null,
    weaponIndex: 2, // Stinger SMG default
    ammo,
    fireCooldown: 0,
    aiming: false,
    stats: {
      missionsCompleted: 0,
      activitiesCompleted: 0,
      carsHijacked: 4,
      eliminations: 12,
      copsEvaded: 3,
      stuntJumps: 2,
      totalEarnings: 48500,
      distanceKm: 4.8,
    },
  };
}

export function enterOrExitVehicle(player, vehicles, wanted) {
  if (player.inVehicle && player.vehicle) {
    const v = player.vehicle;
    const lx = Math.cos(v.yaw) * (v.spec.w * 0.72 + 0.9);
    const lz = -Math.sin(v.yaw) * (v.spec.w * 0.72 + 0.9);
    v.driverType = 'parked';
    player.inVehicle = false;
    player.vehicle = null;
    player.x = v.x + lx;
    player.z = v.z + lz;
    player.y = getGroundHeightAt(player.x, player.z);
    player.yaw = v.yaw;
    player.rig.root.visible = true;
    player.rig.root.position.set(player.x, player.y, player.z);
    return { action: 'exit', vehicle: v };
  }

  let best = null;
  let bestD = 7.2;
  for (let i = 0; i < vehicles.length; i += 1) {
    const v = vehicles[i];
    if (v.spec.isHeli || v.destroyed) continue;
    const d = Math.hypot(v.x - player.x, v.z - player.z);
    if (d < bestD) { bestD = d; best = v; }
  }
  if (!best) return null;

  const wasNpc = best.driverType === 'traffic' || best.driverType === 'police';
  best.driverType = 'player';
  player.inVehicle = true;
  player.vehicle = best;
  player.x = best.x;
  player.y = best.y;
  player.z = best.z;
  player.yaw = best.yaw;
  player.rig.root.visible = false;
  player.stats.carsHijacked += 1;

  if (wanted && (wasNpc || best.spec.isPolice)) {
    wanted.addHeat(best.spec.isPolice ? 2.2 : 1.0, best.x, best.z);
  }
  return { action: 'enter', vehicle: best };
}

export function updatePlayerOnFoot(player, input, cameraYaw, world, vehicles, dt) {
  // Always detect nearby vehicle & service POI for crisp HUD prompts
  player.nearbyVehicle = null;
  player.nearbyPoi = null;

  if (!player.inVehicle) {
    let bestD = 7.2;
    for (let i = 0; i < vehicles.length; i += 1) {
      const v = vehicles[i];
      if (v.spec.isHeli || v.destroyed) continue;
      const d = Math.hypot(v.x - player.x, v.z - player.z);
      if (d < bestD) { bestD = d; player.nearbyVehicle = v; }
    }
  }

  let bestPoiD = 12;
  for (let i = 0; i < SERVICE_POIS.length; i += 1) {
    const poi = SERVICE_POIS[i];
    const d = Math.hypot(poi.x - player.x, poi.z - player.z);
    if (d < bestPoiD) { bestPoiD = d; player.nearbyPoi = poi; }
  }

  if (player.inVehicle && player.vehicle) {
    player.x = player.vehicle.x;
    player.y = player.vehicle.y;
    player.z = player.vehicle.z;
    player.yaw = player.vehicle.yaw;
    player.speed = player.vehicle.speed;
    player.stats.distanceKm += (player.speed * dt) / 1000;
    return;
  }

  const fwd = (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) - (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0);
  const strafe = (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) - (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0);
  const sprint = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
  const moveSpd = sprint ? 11.2 : 6.4;

  // Camera-relative planar movement (camera looks toward cameraYaw)
  const fx = Math.sin(cameraYaw);
  const fz = Math.cos(cameraYaw);
  const rx = -Math.cos(cameraYaw);
  const rz = Math.sin(cameraYaw);

  let mx = fx * fwd + rx * strafe;
  let mz = fz * fwd + rz * strafe;
  const mag = Math.hypot(mx, mz);
  if (mag > 0.01) {
    mx = (mx / mag) * moveSpd;
    mz = (mz / mag) * moveSpd;
  }

  player.aiming = Boolean(input.mouseDown || input.rightMouseDown);
  if (player.aiming) {
    player.yaw = cameraYaw;
  } else if (mag > 0.05) {
    const targetYaw = Math.atan2(mx, mz);
    let diff = targetYaw - player.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.yaw += diff * Math.min(1, dt * 12);
  }

  const nx = THREE.MathUtils.clamp(player.x + mx * dt, WORLD.minX, WORLD.maxX);
  const nz = THREE.MathUtils.clamp(player.z + mz * dt, WORLD.minZ, WORLD.maxZ);
  if (!isWaterAt(nx, nz)) {
    const col = resolveBuildingCollision(world, nx, nz, 0.55);
    player.x = col.x;
    player.z = col.z;
  }

  const groundY = getGroundHeightAt(player.x, player.z, world.ramps);
  if (input.consumeJump() && player.y <= groundY + 0.08) {
    player.vy = 8.4;
  }
  player.vy -= 22 * dt;
  player.y += player.vy * dt;
  if (player.y < groundY) {
    player.y = groundY;
    player.vy = 0;
  }

  player.speed = Math.hypot(mx, mz);
  player.stats.distanceKm += (player.speed * dt) / 1000;
  if (player.speed > 0.2) player.gaitPhase += dt * (sprint ? 12.5 : 8.5);

  setCharacterWeapon(player.rig, WEAPONS[player.weaponIndex].id);
  player.rig.root.visible = true;
  player.rig.root.position.set(player.x, player.y, player.z);
  player.rig.root.rotation.y = player.yaw;
  animateCharacterRig(player.rig, player.speed, player.aiming, player.gaitPhase, player.health > 0);
}
