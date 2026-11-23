// 7-District Solaria Bay 3D open-world city builder: roads, Art Deco Coral Promenade hotels,
// Solaria Downtown towers, Mirage Strip nightlife, Palma Vista, Little Brisa, Cobre Docks,
// Starlight Isle, iconic Solaria Arch Bridge, Sky-Ring Pier, curved palms, ramps, and collisions.

import * as THREE from 'three';
import { AVENUE_NAMES, DISTRICTS, SERVICE_POIS, STREET_NAMES, WORLD } from './config.js';
import { hash2D, randRange } from './random.js';

export function getDistrictAt(x, z) {
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    const d = DISTRICTS[i];
    if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) return d;
  }
  return x > 320 ? DISTRICTS[6] : DISTRICTS[0];
}

export function getStreetAt(x, z) {
  if (x >= WORLD.bridgeStartX && x <= WORLD.bridgeEndX && Math.abs(z - WORLD.bridgeZ) < 16) {
    return 'Solaria Arch Bridge';
  }
  if (x >= WORLD.pierStartX && x <= WORLD.pierEndX && Math.abs(z - WORLD.pierZ) < 14) {
    return 'Starlight Sky-Ring Pier';
  }
  let bestAx = WORLD.avenuesX[0];
  let bestAd = Infinity;
  const allAv = [...WORLD.avenuesX, 560, 720];
  for (let i = 0; i < allAv.length; i += 1) {
    const d = Math.abs(x - allAv[i]);
    if (d < bestAd) { bestAd = d; bestAx = allAv[i]; }
  }
  let bestSz = WORLD.streetsZ[0];
  let bestSd = Infinity;
  for (let i = 0; i < WORLD.streetsZ.length; i += 1) {
    const d = Math.abs(z - WORLD.streetsZ[i]);
    if (d < bestSd) { bestSd = d; bestSz = WORLD.streetsZ[i]; }
  }
  if (bestAd < 24) return AVENUE_NAMES[String(bestAx)] || 'Solaria Blvd';
  if (bestSd < 24) return STREET_NAMES[String(bestSz)] || 'Bay Crossway';
  if (x >= WORLD.beachStartX && x <= WORLD.shorelineX) return 'Coral Gold Beach';
  return AVENUE_NAMES[String(bestAx)] || 'Solaria Promenade';
}

export function getBridgeElevation(x) {
  if (x < WORLD.bridgeStartX || x > WORLD.bridgeEndX) return 0;
  const u = (x - WORLD.bridgeStartX) / (WORLD.bridgeEndX - WORLD.bridgeStartX);
  return Math.sin(u * Math.PI) * WORLD.bridgePeakY;
}

export function isWaterAt(x, z) {
  if (x >= WORLD.bridgeStartX - 6 && x <= WORLD.bridgeEndX + 6 && Math.abs(z - WORLD.bridgeZ) < 12) return false;
  if (x >= WORLD.pierStartX - 4 && x <= WORLD.pierEndX + 4 && Math.abs(z - WORLD.pierZ) < 11) return false;
  const onIsle = x >= WORLD.isleMinX && x <= WORLD.isleMaxX && z >= WORLD.isleMinZ && z <= WORLD.isleMaxZ;
  if (onIsle) return false;
  const onMainland = x >= -410 && x <= WORLD.shorelineX && z >= -410 && z <= 410;
  return !onMainland;
}

export function getGroundHeightAt(x, z, ramps = []) {
  if (x >= WORLD.bridgeStartX && x <= WORLD.bridgeEndX && Math.abs(z - WORLD.bridgeZ) < 12) {
    return getBridgeElevation(x);
  }
  if (x >= WORLD.pierStartX && x <= WORLD.pierEndX && Math.abs(z - WORLD.pierZ) < 10.5) {
    return 3.1;
  }
  for (let i = 0; i < ramps.length; i += 1) {
    const r = ramps[i];
    const dx = x - r.x;
    const dz = z - r.z;
    const ca = Math.cos(-r.yaw);
    const sa = Math.sin(-r.yaw);
    const lx = dx * ca - dz * sa;
    const lz = dx * sa + dz * ca;
    if (Math.abs(lx) < r.w * 0.55 && lz > -r.l * 0.5 && lz < r.l * 0.5) {
      const frac = (lz + r.l * 0.5) / r.l;
      return Math.max(0, frac * r.h);
    }
  }
  if (x > WORLD.beachStartX && x <= WORLD.shorelineX && Math.abs(z) <= 410) {
    const t = (x - WORLD.beachStartX) / (WORLD.shorelineX - WORLD.beachStartX);
    return THREE.MathUtils.lerp(0.22, -0.35, t);
  }
  if (isWaterAt(x, z)) return -0.35;
  return 0;
}

export function resolveBuildingCollision(world, x, z, radius) {
  let rx = x;
  let rz = z;
  let hit = false;
  const list = world.colliders;
  for (let i = 0; i < list.length; i += 1) {
    const b = list[i];
    const cx = Math.max(b.minX, Math.min(rx, b.maxX));
    const cz = Math.max(b.minZ, Math.min(rz, b.maxZ));
    const dx = rx - cx;
    const dz = rz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = radius - d;
        rx += (dx / d) * push;
        rz += (dz / d) * push;
      } else {
        const penL = Math.abs(rx - b.minX);
        const penR = Math.abs(b.maxX - rx);
        const penT = Math.abs(rz - b.minZ);
        const penB = Math.abs(b.maxZ - rz);
        const m = Math.min(penL, penR, penT, penB);
        if (m === penL) rx = b.minX - radius;
        else if (m === penR) rx = b.maxX + radius;
        else if (m === penT) rz = b.minZ - radius;
        else rz = b.maxZ + radius;
      }
    }
  }
  return { x: rx, z: rz, hit };
}

function addBox(parent, w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function createCurvedPalmTree(x, z, scale, rotY, trunkMat, frondMat) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const segs = 6;
  let px = 0;
  let py = 0;
  const hStep = 2.05 * scale;
  const lean = 0.28 * scale;
  for (let i = 0; i < segs; i += 1) {
    const rBot = (0.32 - i * 0.032) * scale;
    const rTop = (0.29 - i * 0.032) * scale;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, hStep + 0.12, 7), trunkMat);
    const tilt = 0.07 + i * 0.045;
    cyl.position.set(px + Math.sin(tilt) * hStep * 0.5, py + hStep * 0.5, 0);
    cyl.rotation.z = -tilt;
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    g.add(cyl);
    px += Math.sin(tilt) * hStep + lean * 0.14;
    py += Math.cos(tilt) * hStep;
  }

  // Crown cluster of 8 arched layered fronds
  const crown = new THREE.Group();
  crown.position.set(px, py, 0);
  for (let f = 0; f < 8; f += 1) {
    const ang = (f / 8) * Math.PI * 2;
    const frond = new THREE.Group();
    frond.rotation.y = ang;
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.95 * scale, 0.09 * scale, 2.7 * scale), frondMat);
    blade1.position.set(0, 0.3 * scale, 1.3 * scale);
    blade1.rotation.x = 0.24;
    blade1.castShadow = true;
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.72 * scale, 0.08 * scale, 2.3 * scale), frondMat);
    blade2.position.set(0, -0.35 * scale, 3.35 * scale);
    blade2.rotation.x = 0.68;
    blade2.castShadow = true;
    frond.add(blade1, blade2);
    crown.add(frond);
  }
  g.add(crown);
  return g;
}

function buildSolariaArchBridge(group, textures) {
  const startX = WORLD.bridgeStartX;
  const endX = WORLD.bridgeEndX;
  const span = endX - startX;
  const segs = 28;
  const redMat = new THREE.MeshStandardMaterial({ color: '#d92638', roughness: 0.34, metalness: 0.52 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.36, metalness: 0.35 });
  const deckRoadTex = textures.road.clone();
  deckRoadTex.needsUpdate = true;
  deckRoadTex.rotation = Math.PI / 2;
  deckRoadTex.center.set(0.5, 0.5);
  deckRoadTex.repeat.set(1, 1);
  const deckMat = new THREE.MeshStandardMaterial({ map: deckRoadTex, roughness: 0.8 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.72 });
  const cableMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#94a3b8', emissiveIntensity: 0.25, roughness: 0.25, metalness: 0.6 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: '#fde68a' });

  for (let i = 0; i < segs; i += 1) {
    const x0 = startX + (i / segs) * span;
    const x1 = startX + ((i + 1) / segs) * span;
    const y0 = getBridgeElevation(x0);
    const y1 = getBridgeElevation(x1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) + 0.25;
    const slope = Math.atan2(dy, dx);

    const seg = new THREE.Group();
    seg.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, WORLD.bridgeZ);
    seg.rotation.z = slope;

    addBox(seg, len, 1.3, 21.6, concreteMat, 0, -0.7, 0, true);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(len, 19.6), deckMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.02;
    top.receiveShadow = true;
    seg.add(top);

    addBox(seg, len, 1.15, 0.65, whiteMat, 0, 0.6, -10.3, false);
    addBox(seg, len, 1.15, 0.65, whiteMat, 0, 0.6, 10.3, false);
    addBox(seg, len, 0.35, 0.72, redMat, 0, 1.25, -10.3, false);
    addBox(seg, len, 0.35, 0.72, redMat, 0, 1.25, 10.3, false);

    if (i % 4 === 2) {
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 6), whiteMat);
        pole.position.set(0, 3.1, side * 10.2);
        seg.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), lampGlow);
        bulb.position.set(0, 6.2, side * 9.6);
        seg.add(bulb);
      }
    }
    group.add(seg);
  }

  // Twin iconic red-and-white cable-stayed A-frame pylons + fan cables
  const pylonXs = [345, 471];
  for (let p = 0; p < pylonXs.length; p += 1) {
    const px = pylonXs[p];
    const py = getBridgeElevation(px);
    const towerTopY = 68;

    // Support pier down into bay water
    addBox(group, 8, py + 10, 26, concreteMat, px, (py - 10) * 0.5, WORLD.bridgeZ, true);

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 2.0, towerTopY, 8), redMat);
      leg.position.set(px, towerTopY * 0.5 - 2, WORLD.bridgeZ + side * 8.2);
      leg.rotation.x = side * 0.11;
      leg.castShadow = true;
      group.add(leg);
    }
    // White cross-beams & red crown arch
    addBox(group, 3.2, 3.2, 19.5, whiteMat, px, py + 12, WORLD.bridgeZ, true);
    addBox(group, 3.0, 2.8, 13.5, whiteMat, px, 42, WORLD.bridgeZ, true);
    addBox(group, 3.6, 3.6, 8.2, redMat, px, 64, WORLD.bridgeZ, true);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), new THREE.MeshBasicMaterial({ color: '#ff4d6d' }));
    beacon.position.set(px, 67.2, WORLD.bridgeZ);
    group.add(beacon);

    // Fan of gleaming white stay cables
    for (let c = 1; c <= 7; c += 1) {
      const dx = c * 11.5;
      for (const dir of [-1, 1]) {
        const ax = px + dir * dx;
        if (ax < startX + 8 || ax > endX - 8) continue;
        const ay = getBridgeElevation(ax) + 1.0;
        const topY = 63 - c * 3.1;
        for (const side of [-1, 1]) {
          const pA = new THREE.Vector3(px, topY, WORLD.bridgeZ + side * 3.0);
          const pB = new THREE.Vector3(ax, ay, WORLD.bridgeZ + side * 10.1);
          const diff = new THREE.Vector3().subVectors(pB, pA);
          const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, diff.length(), 5), cableMat);
          cable.position.copy(pA).add(pB).multiplyScalar(0.5);
          cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
          group.add(cable);
        }
      }
    }
  }
}

function buildSkyRingPier(group, textures) {
  const pierLen = WORLD.pierEndX - WORLD.pierStartX;
  const pierMidX = (WORLD.pierStartX + WORLD.pierEndX) * 0.5;
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.82 });
  const pilingMat = new THREE.MeshStandardMaterial({ color: '#5c4028', roughness: 0.9 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 });

  // Wooden pier deck & timber pilings
  addBox(group, pierLen, 0.85, 19, woodMat, pierMidX, 2.7, WORLD.pierZ, true);
  addBox(group, pierLen, 0.9, 0.4, railMat, pierMidX, 3.6, WORLD.pierZ - 9.2, false);
  addBox(group, pierLen, 0.9, 0.4, railMat, pierMidX, 3.6, WORLD.pierZ + 9.2, false);

  for (let x = WORLD.pierStartX + 8; x <= WORLD.pierEndX - 4; x += 16) {
    for (const side of [-8.2, 0, 8.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 6.5, 7), pilingMat);
      post.position.set(x, -0.4, WORLD.pierZ + side);
      group.add(post);
    }
  }

  // Entrance glowing archway sign: SKY-RING PIER
  const signMat = new THREE.MeshBasicMaterial({ map: textures.signs.skyRingPier });
  addBox(group, 1.2, 8.5, 1.2, railMat, WORLD.pierStartX + 6, 7.2, WORLD.pierZ - 8.5, true);
  addBox(group, 1.2, 8.5, 1.2, railMat, WORLD.pierStartX + 6, 7.2, WORLD.pierZ + 8.5, true);
  addBox(group, 1.4, 3.4, 18.2, signMat, WORLD.pierStartX + 6, 11.4, WORLD.pierZ, false);

  // Giant glowing Sky-Ring Observation Wheel
  const wx = 384;
  const wy = 28;
  const wz = WORLD.pierZ;
  const legMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35, metalness: 0.45 });
  for (const s of [-1, 1]) {
    for (const f of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 29, 8), legMat);
      leg.position.set(wx + f * 5.2, 15.5, wz + s * 4.4);
      leg.rotation.z = f * 0.24;
      leg.castShadow = true;
      group.add(leg);
    }
  }

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(wx, wy, wz);
  const radius = 21.5;
  const rimOuter = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.65, 10, 48),
    new THREE.MeshBasicMaterial({ color: '#22d3ee' }),
  );
  const rimInner = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 2.6, 0.42, 8, 42),
    new THREE.MeshBasicMaterial({ color: '#ff5e78' }),
  );
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 7.2, 16),
    new THREE.MeshBasicMaterial({ color: '#fde047' }),
  );
  hub.rotation.x = Math.PI / 2;
  wheelPivot.add(rimOuter, rimInner, hub);

  const podColors = ['#ff5e78', '#22d3ee', '#fbbf24', '#a78bfa', '#34d399', '#fb923c'];
  const spokeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#38bdf8', emissiveIntensity: 0.35 });
  const pods = [];
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, radius * 2, 5), spokeMat);
    spoke.rotation.z = a;
    wheelPivot.add(spoke);

    const pod = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.4, 3.2),
      new THREE.MeshStandardMaterial({
        color: podColors[i % podColors.length],
        emissive: podColors[i % podColors.length],
        emissiveIntensity: 0.55,
        roughness: 0.2,
      }),
    );
    pod.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    wheelPivot.add(pod);
    pods.push(pod);
  }
  group.add(wheelPivot);
  return { wheelPivot, pods };
}

export function buildSolariaWorld(scene, textures, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const lamps = [];
  const beacons = [];
  const ramps = [];

  // 1. Mainland urban ground slab & Starlight Isle terrain
  const baseMat = new THREE.MeshStandardMaterial({ color: '#d8ceb8', roughness: 0.9 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ map: textures.sidewalk, roughness: 0.85 });
  textures.sidewalk.repeat.set(34, 34);
  const mainGround = new THREE.Mesh(new THREE.BoxGeometry(680, 1.4, 820), sidewalkMat);
  mainGround.position.set(-72, -0.58, 0);
  mainGround.receiveShadow = true;
  group.add(mainGround);

  // Golden beach sand box cleanly meeting the boardwalk edge at x=268 and descending smoothly to ocean
  const sandMat = new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.92 });
  const beachMesh = new THREE.Mesh(new THREE.BoxGeometry(62, 1.4, 820), sandMat);
  beachMesh.position.set(299, -0.62, 0);
  beachMesh.receiveShadow = true;
  group.add(beachMesh);

  // Starlight Isle lush coastal plateau + perimeter golden beach
  const isleBeach = new THREE.Mesh(new THREE.BoxGeometry(254, 1.5, 434), sandMat);
  isleBeach.position.set(640, -0.45, 0);
  isleBeach.receiveShadow = true;
  group.add(isleBeach);
  const isleGrass = new THREE.Mesh(
    new THREE.BoxGeometry(224, 1.2, 396),
    new THREE.MeshStandardMaterial({ color: '#3ea86b', roughness: 0.88 }),
  );
  isleGrass.position.set(640, -0.22, 0);
  isleGrass.receiveShadow = true;
  group.add(isleGrass);

  // 2. Crisp Asphalt Avenues, Cross-Streets & Zebra Intersections
  const roadMatNS = new THREE.MeshStandardMaterial({ map: textures.road.clone(), roughness: 0.56, metalness: 0.08 });
  roadMatNS.map.needsUpdate = true;
  roadMatNS.map.repeat.set(1, 28);

  const roadMatEW = new THREE.MeshStandardMaterial({ map: textures.road.clone(), roughness: 0.56, metalness: 0.08 });
  roadMatEW.map.needsUpdate = true;
  roadMatEW.map.rotation = Math.PI / 2;
  roadMatEW.map.center.set(0.5, 0.5);
  roadMatEW.map.repeat.set(1, 24);

  const interMat = new THREE.MeshStandardMaterial({ map: textures.intersection, roughness: 0.56, metalness: 0.08 });

  for (let i = 0; i < WORLD.avenuesX.length; i += 1) {
    const ax = WORLD.avenuesX[i];
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, 790), roadMatNS);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(ax, 0.14, 0);
    strip.receiveShadow = true;
    group.add(strip);
  }
  for (let j = 0; j < WORLD.streetsZ.length; j += 1) {
    const sz = WORLD.streetsZ[j];
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(660, WORLD.roadWidth), roadMatEW);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(-60, 0.15, sz);
    strip.receiveShadow = true;
    group.add(strip);
  }
  for (let i = 0; i < WORLD.avenuesX.length; i += 1) {
    for (let j = 0; j < WORLD.streetsZ.length; j += 1) {
      const inter = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth + 1.5, WORLD.roadWidth + 1.5), interMat);
      inter.rotation.x = -Math.PI / 2;
      inter.position.set(WORLD.avenuesX[i], 0.17, WORLD.streetsZ[j]);
      inter.receiveShadow = true;
      group.add(inter);
    }
  }

  // Starlight Isle paved road loop
  const isleRoadMat = new THREE.MeshStandardMaterial({ color: '#2b313d', roughness: 0.82 });
  for (const ix of [560, 720]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 340), isleRoadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(ix, 0.42, 0); m.receiveShadow = true; group.add(m);
  }
  for (const iz of [-160, 0, 160]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(178, 18), isleRoadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(640, 0.43, iz); m.receiveShadow = true; group.add(m);
  }

  // 3. District Buildings (Art Deco Hotels, Glass Towers, Mirage Strip, Docks, Villas)
  const mats = {
    coral: new THREE.MeshStandardMaterial({ map: textures.coralDeco, roughness: 0.55 }),
    cream: new THREE.MeshStandardMaterial({ map: textures.creamDeco, roughness: 0.58 }),
    mint: new THREE.MeshStandardMaterial({ map: textures.mintDeco, roughness: 0.55 }),
    peach: new THREE.MeshStandardMaterial({ map: textures.peachDeco, roughness: 0.56 }),
    mirage: new THREE.MeshStandardMaterial({ map: textures.mirageDeco, roughness: 0.42, emissive: '#381c59', emissiveIntensity: 0.35 }),
    glassA: new THREE.MeshStandardMaterial({ map: textures.glassCobalt, roughness: 0.24, metalness: 0.45 }),
    glassB: new THREE.MeshStandardMaterial({ map: textures.glassAmber, roughness: 0.28, metalness: 0.4 }),
    brisa: new THREE.MeshStandardMaterial({ map: textures.brisaTerracotta, roughness: 0.65 }),
    warehouse: new THREE.MeshStandardMaterial({ map: textures.warehouse, roughness: 0.78 }),
    roof: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 }),
    terracotta: new THREE.MeshStandardMaterial({ color: '#c2543a', roughness: 0.75 }),
    awningCoral: new THREE.MeshStandardMaterial({ map: textures.awningCoral, roughness: 0.7 }),
    awningTeal: new THREE.MeshStandardMaterial({ map: textures.awningTeal, roughness: 0.7 }),
    helipad: new THREE.MeshStandardMaterial({ map: textures.helipad, roughness: 0.7 }),
    trimGold: new THREE.MeshBasicMaterial({ color: '#fbbf24' }),
    trimCyan: new THREE.MeshBasicMaterial({ color: '#22d3ee' }),
    trimPink: new THREE.MeshBasicMaterial({ color: '#ff5e78' }),
    glowShop: new THREE.MeshBasicMaterial({ color: '#ffe6b3' }),
  };

  const blocksX = [-300, -180, -60, 60, 180];
  const blocksZ = [-300, -180, -60, 60, 180, 300];
  const neonBands = [];

  for (let bx = 0; bx < blocksX.length; bx += 1) {
    for (let bz = 0; bz < blocksZ.length; bz += 1) {
      const cx = blocksX[bx];
      const cz = blocksZ[bz];
      const dist = getDistrictAt(cx, cz);

      // Raised sidewalk block curb plinth
      addBox(group, 86, 0.32, 86, baseMat, cx, 0.16, cz, false);

      // Place 2x2 articulated buildings per city block
      const slots = [[-20, -20], [20, -20], [-20, 20], [20, 20]];
      for (let s = 0; s < slots.length; s += 1) {
        const px = cx + slots[s][0];
        const pz = cz + slots[s][1];
        const r = hash2D(bx * 7 + s, bz * 11 + s, 42);
        const bw = 28 + r * 8;
        const bd = 28 + hash2D(bx + s, bz * 5, 99) * 8;
        const bh = dist.hMin + hash2D(bx * 13, bz * 3 + s, 77) * (dist.hMax - dist.hMin);

        let wallMat = mats.cream;
        if (dist.id === 'coral_promenade') {
          wallMat = [mats.coral, mats.cream, mats.mint, mats.peach][(bx + bz + s) % 4];
        } else if (dist.id === 'solaria_downtown') {
          wallMat = s % 2 === 0 ? mats.glassA : mats.glassB;
        } else if (dist.id === 'mirage_strip') {
          wallMat = s % 2 === 0 ? mats.mirage : mats.coral;
        } else if (dist.id === 'palma_vista') {
          wallMat = s % 2 === 0 ? mats.cream : mats.peach;
        } else if (dist.id === 'little_brisa') {
          wallMat = s % 2 === 0 ? mats.brisa : mats.peach;
        } else if (dist.id === 'cobre_docks') {
          wallMat = mats.warehouse;
        }

        addBox(group, bw, bh, bd, wallMat, px, bh * 0.5 + 0.3, pz, true);
        colliders.push({
          minX: px - bw * 0.5 - 0.6, maxX: px + bw * 0.5 + 0.6,
          minZ: pz - bd * 0.5 - 0.6, maxZ: pz + bd * 0.5 + 0.6,
          h: bh,
        });

        // Architectural silhouettes: Art Deco crowns, helipads, awnings, terracotta roofs, neon trims
        if (dist.id === 'solaria_downtown') {
          if (bh > 65) {
            addBox(group, bw * 0.68, 8, bd * 0.68, wallMat, px, bh + 4.3, pz, true);
            const band = addBox(group, bw * 0.72, 1.0, bd * 0.72, s % 2 === 0 ? mats.trimCyan : mats.trimGold, px, bh + 8.6, pz, false);
            neonBands.push(band);
          } else {
            const pad = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.72, bd * 0.72), mats.helipad);
            pad.rotation.x = -Math.PI / 2;
            pad.position.set(px, bh + 0.36, pz);
            group.add(pad);
          }
        } else if (dist.id === 'coral_promenade') {
          // Stepped pastel Art Deco crown + striped shop awning + framed illuminated boutique windows
          addBox(group, bw * 0.75, 4.2, bd * 0.75, mats.cream, px, bh + 2.4, pz, true);
          const trim = addBox(group, bw + 0.5, 0.85, bd + 0.5, s % 2 === 0 ? mats.trimPink : mats.trimCyan, px, bh + 0.3, pz, false);
          neonBands.push(trim);
          if (px > 190) {
            const awn = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, bd * 0.82), s % 2 === 0 ? mats.awningCoral : mats.awningTeal);
            awn.position.set(px + bw * 0.5 + 1.4, 4.6, pz);
            awn.rotation.z = -0.35;
            group.add(awn);
            for (let w = -1; w <= 1; w += 1) {
              addBox(group, 0.35, 2.7, 5.2, mats.glowShop, px + bw * 0.5 + 0.14, 1.9, pz + w * 7.5, false);
            }
          }
        } else if (dist.id === 'mirage_strip') {
          const neonMat = [mats.trimPink, mats.trimCyan, mats.trimGold][s % 3];
          neonBands.push(addBox(group, bw + 0.6, 1.1, bd + 0.6, neonMat, px, bh - 1.2, pz, false));
          neonBands.push(addBox(group, bw + 0.6, 0.75, bd + 0.6, neonMat, px, 5.6, pz, false));
          // Multi-pane warm lit boutique storefront windows on street level
          for (let w = -1; w <= 1; w += 1) {
            addBox(group, 5.4, 2.8, 0.45, mats.glowShop, px + w * 7.6, 2.0, pz + bd * 0.5 + 0.15, false);
          }
        } else if (dist.id === 'palma_vista' || dist.id === 'little_brisa') {
          const cap = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.66, 6.5, 4), mats.terracotta);
          cap.position.set(px, bh + 3.5, pz);
          cap.rotation.y = Math.PI / 4;
          group.add(cap);
        } else if (dist.id === 'cobre_docks') {
          // Stacked colorful shipping containers beside freight buildings
          const cCols = ['#dc2626', '#1d4ed8', '#d97706', '#0d9488'];
          const cMat = new THREE.MeshStandardMaterial({ color: cCols[(bx + s) % 4], roughness: 0.75 });
          addBox(group, 10, 3.2, 4.2, cMat, px, bh + 1.9, pz, false);
        }
      }
    }
  }

  // Signature Original Landmarks & Glowing Signage!
  const placeSign = (tex, w, h, x, y, z, rotY) => {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.8), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(x, y, z);
    sign.rotation.y = rotY;
    group.add(sign);
  };
  // Facing Ocean Palm Blvd (east +X) on Coral Promenade hotels:
  placeSign(textures.signs.hotelSolaria, 16, 3.8, 217, 13.5, -36, Math.PI / 2);
  placeSign(textures.signs.cafeBrisa, 14, 3.4, 217, 11, -158, Math.PI / 2);
  placeSign(textures.signs.hotelSolaria, 16, 3.8, 217, 18, 78, Math.PI / 2);
  // Facing Solaria Grand Ave (Downtown / Mirage Strip):
  placeSign(textures.signs.bancoSolaria, 20, 4.8, 23, 46, -42, -Math.PI / 2);
  placeSign(textures.signs.mirageLounge, 16, 3.8, -23, 13, -212, Math.PI / 2);
  placeSign(textures.signs.solariaCustoms, 16, 3.8, 23, 12, -212, -Math.PI / 2);
  placeSign(textures.signs.mirageLounge, 18, 4.2, 0, 17, -264, 0);

  // Starlight Isle luxury villas + Lighthouse
  const villaCoords = [[612, -88], [670, -88], [612, 88], [670, 88], [640, -182], [640, 182]];
  for (let i = 0; i < villaCoords.length; i += 1) {
    const [vx, vz] = villaCoords[i];
    const vh = 13 + (i % 3) * 5;
    addBox(group, 26, vh, 24, i % 2 === 0 ? mats.cream : mats.coral, vx, vh * 0.5 + 0.4, vz, true);
    addBox(group, 28, 1.2, 26, mats.terracotta, vx, vh + 0.8, vz, false);
    colliders.push({ minX: vx - 13.5, maxX: vx + 13.5, minZ: vz - 12.5, maxZ: vz + 12.5, h: vh });
  }
  // Starlight Lighthouse
  const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.2, 34, 12), mats.cream);
  lhBase.position.set(742, 17, -185);
  lhBase.castShadow = true;
  const lhStripe = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.5, 9, 12), new THREE.MeshStandardMaterial({ color: '#e11d48' }));
  lhStripe.position.set(742, 20, -185);
  const lhLamp = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 12), new THREE.MeshBasicMaterial({ color: '#fef08a' }));
  lhLamp.position.set(742, 35.5, -185);
  group.add(lhBase, lhStripe, lhLamp);

  // 4. Iconic Solaria Arch Bridge & Starlight Sky-Ring Pier
  buildSolariaArchBridge(group, textures);
  const skyRing = buildSkyRingPier(group, textures);

  // 5. Lush Curved 3D Palm Trees along Coral Promenade, Mirage Strip, Beach & Starlight Isle
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7c5534', roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: '#2ea85a', roughness: 0.65, side: THREE.DoubleSide });
  const palmSpots = [];
  for (let z = -340; z <= 340; z += 34) {
    if (Math.abs(z) < 20 || Math.abs(z - 120) < 20) continue;
    palmSpots.push([258, z, 1.15]);
    palmSpots.push([222, z + 12, 1.05]);
  }
  for (let z = -340; z <= -140; z += 44) {
    palmSpots.push([-17, z, 0.95], [17, z, 0.95]);
  }
  for (let z = -140; z <= 140; z += 48) {
    palmSpots.push([542, z, 1.1], [738, z, 1.1]);
  }
  for (let i = 0; i < palmSpots.length; i += 1) {
    const [px, pz, sc] = palmSpots[i];
    const rot = randRange(rng, 0, Math.PI * 2);
    group.add(createCurvedPalmTree(px, pz, sc * randRange(rng, 0.88, 1.16), rot, trunkMat, frondMat));
  }

  // 6. Beach Umbrellas & Lifeguard Towers on Coral Gold Beach
  const umbCols = ['#ff5e78', '#22d3ee', '#fbbf24', '#a78bfa', '#34d399'];
  const poleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });
  for (let z = -220; z <= 220; z += 36) {
    if (Math.abs(z) < 22 || Math.abs(z - 120) < 24) continue;
    const ux = 282 + (Math.abs(z) % 3) * 7;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 6), poleMat);
    pole.position.set(ux, 1.5, z);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: umbCols[Math.abs(z) % umbCols.length], roughness: 0.6 }),
    );
    canopy.position.set(ux, 3.1, z);
    canopy.castShadow = true;
    group.add(pole, canopy);
  }
  // Lifeguard Towers
  for (const lz of [-76, 62]) {
    addBox(group, 4.4, 3.4, 4.4, mats.cream, 294, 4.8, lz, true);
    addBox(group, 5.2, 0.9, 5.2, new THREE.MeshStandardMaterial({ color: '#ef4444' }), 294, 6.8, lz, false);
    for (const sx of [-1.8, 1.8]) {
      for (const sz of [-1.8, 1.8]) {
        addBox(group, 0.35, 3.6, 0.35, poleMat, 294 + sx, 1.6, lz + sz, false);
      }
    }
  }

  // 7. Streetlamps with Warm Glowing Globes & Ground Light Pools + Traffic Lights
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.6 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffe5a3' });
  const poolMat = new THREE.MeshBasicMaterial({ color: '#ffcf7d', transparent: true, opacity: 0.16, depthWrite: false });
  const lampAvenues = [0, 120, 240, -120];
  for (let a = 0; a < lampAvenues.length; a += 1) {
    const ax = lampAvenues[a];
    for (let z = -310; z <= 310; z += 58) {
      if (Math.abs(z % 120) < 20) continue;
      for (const side of [-1, 1]) {
        const lx = ax + side * 14.8;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 8.2, 6), lampPoleMat);
        pole.position.set(lx, 4.1, z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), bulbMat);
        bulb.position.set(lx - side * 1.4, 8.1, z);
        const pool = new THREE.Mesh(new THREE.CircleGeometry(6.5, 16), poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(lx - side * 1.6, 0.2, z);
        group.add(pole, bulb, pool);
        lamps.push(pool);
      }
    }
  }

  // Traffic Light Gantries at key intersections
  const redSig = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  const grnSig = new THREE.MeshBasicMaterial({ color: '#22c55e' });
  for (const ix of [0, 120, 240]) {
    for (const iz of [-240, -120, 0, 120]) {
      const gx = ix - 14.5;
      const gz = iz - 14.5;
      addBox(group, 0.35, 7.2, 0.35, lampPoleMat, gx, 3.6, gz, false);
      addBox(group, 6.2, 0.32, 0.32, lampPoleMat, gx + 3.0, 7.0, gz, false);
      addBox(group, 0.55, 1.4, 0.55, (ix + iz) % 240 === 0 ? grnSig : redSig, gx + 4.8, 6.5, gz, false);
    }
  }

  // 8. Six Physical 3D Stunt Ramps
  const rampSpecs = [
    { id: 'ramp_coral', x: 252, z: -150, yaw: 0, w: 6.5, l: 14, h: 3.4 },
    { id: 'ramp_pier', x: 278, z: 120, yaw: Math.PI / 2, w: 6.5, l: 13, h: 3.2 },
    { id: 'ramp_mirage', x: 0, z: -290, yaw: 0, w: 6.5, l: 14, h: 3.5 },
    { id: 'ramp_docks', x: -120, z: 290, yaw: Math.PI / 2, w: 7, l: 15, h: 3.8 },
    { id: 'ramp_downtown', x: 120, z: 60, yaw: 0, w: 6.5, l: 14, h: 3.4 },
    { id: 'ramp_isle', x: 560, z: -70, yaw: 0, w: 6.5, l: 14, h: 3.4 },
  ];
  const rampMat = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#9a3412', emissiveIntensity: 0.35, roughness: 0.45 });
  const rampStripeMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
  for (let i = 0; i < rampSpecs.length; i += 1) {
    const r = rampSpecs[i];
    const rg = new THREE.Group();
    rg.position.set(r.x, 0.15, r.z);
    rg.rotation.y = r.yaw;
    const slope = Math.atan2(r.h, r.l);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.5, Math.hypot(r.l, r.h)), rampMat);
    deck.position.set(0, r.h * 0.5, 0);
    deck.rotation.x = -slope;
    deck.castShadow = true;
    const edge = new THREE.Mesh(new THREE.BoxGeometry(r.w + 0.2, 0.22, 0.7), rampStripeMat);
    edge.position.set(0, r.h + 0.1, r.l * 0.48);
    rg.add(deck, edge);
    group.add(rg);
    ramps.push(r);
  }

  // 9. Service POI Glowing 3D Beacon Rings (Garages, Gun Shops, Safehouses)
  for (let i = 0; i < SERVICE_POIS.length; i += 1) {
    const p = SERVICE_POIS[i];
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.8, 0.22, 8, 28),
      new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.85 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(p.x, 0.45, p.z);
    group.add(ring);
    beacons.push({ mesh: ring, poi: p });
  }

  return {
    group,
    colliders,
    skyRing,
    lamps,
    neonBands,
    beacons,
    ramps,
    poolMat,
  };
}

export function updateWorldLandmarks(world, dt, elapsed, timeOfDay) {
  if (world.skyRing && world.skyRing.wheelPivot) {
    world.skyRing.wheelPivot.rotation.z += dt * 0.26;
    const pods = world.skyRing.pods;
    for (let i = 0; i < pods.length; i += 1) {
      pods[i].rotation.z = -world.skyRing.wheelPivot.rotation.z;
    }
  }
  const t = ((timeOfDay % 24) + 24) % 24;
  const nightFactor = (t >= 18.5 || t < 6.0) ? 0.44 : 0.14;
  world.poolMat.opacity = nightFactor;

  for (let i = 0; i < world.beacons.length; i += 1) {
    const b = world.beacons[i].mesh;
    b.position.y = 0.5 + Math.sin(elapsed * 3.0 + i) * 0.28;
    const s = 1 + Math.sin(elapsed * 2.5 + i) * 0.08;
    b.scale.set(s, s, 1);
  }
}
