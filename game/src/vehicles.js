// Sculpted multi-part 3D vehicles (18 distinct models) with clearcoat metallic paint, spoked rotating
// wheels, lightbars & blooms, AIR-1 helicopter spotlight cone, and arcade-sim drift/ramp/boat physics.

import * as THREE from 'three';
import { VEHICLES, WORLD } from './config.js';
import { SHARED_FLARE_TEX } from './effects-particles.js';
import { pick } from './random.js';
import { getGroundHeightAt, isWaterAt, resolveBuildingCollision } from './world-city.js';

const SHARED_GEO = {
  tire: new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16),
  rim: new THREE.CylinderGeometry(0.26, 0.26, 0.36, 12),
  spoke: new THREE.BoxGeometry(0.46, 0.055, 0.37),
  headlight: new THREE.BoxGeometry(0.42, 0.14, 0.08),
  taillight: new THREE.BoxGeometry(0.56, 0.14, 0.08),
};
SHARED_GEO.tire.rotateZ(Math.PI / 2);
SHARED_GEO.rim.rotateZ(Math.PI / 2);

function buildCarChassisGeo(spec) {
  const L = spec.l;
  const W = spec.w;
  const H = spec.h;
  const halfL = L * 0.5;
  const shape = new THREE.Shape();

  if (spec.style === 'super' || spec.style === 'coupe' || spec.style === 'cabrio') {
    const hoodY = H * 0.56;
    const roofY = spec.openTop ? H * 0.62 : H * 1.02;
    shape.moveTo(-halfL, 0.36);
    shape.lineTo(halfL, 0.34);
    shape.lineTo(halfL, 0.56);
    shape.lineTo(halfL * 0.44, hoodY);
    if (spec.openTop) {
      shape.lineTo(halfL * 0.18, roofY);
      shape.lineTo(-halfL * 0.48, hoodY * 1.08);
    } else {
      shape.lineTo(halfL * 0.12, roofY);
      shape.lineTo(-halfL * 0.38, roofY * 0.96);
      shape.lineTo(-halfL * 0.88, hoodY * 1.12);
    }
    shape.lineTo(-halfL, 0.86);
    shape.closePath();
  } else if (spec.style === 'suv' || spec.style === 'police_suv' || spec.style === 'van' || spec.style === 'swat' || spec.style === 'truck') {
    const hoodY = H * 0.54;
    shape.moveTo(-halfL, 0.38);
    shape.lineTo(halfL, 0.38);
    shape.lineTo(halfL, hoodY * 0.85);
    shape.lineTo(halfL * 0.52, hoodY);
    shape.lineTo(halfL * 0.34, H);
    shape.lineTo(-halfL * 0.92, H);
    shape.lineTo(-halfL, H * 0.86);
    shape.closePath();
  } else {
    // Sleek muscle / sedan / police interceptor / taxi / limo / pickup
    const hoodY = H * 0.58;
    const roofY = H * 1.02;
    shape.moveTo(-halfL, 0.36);
    shape.lineTo(halfL, 0.36);
    shape.lineTo(halfL, hoodY * 0.85);
    shape.lineTo(halfL * 0.44, hoodY);
    shape.lineTo(halfL * 0.18, roofY);
    shape.lineTo(-halfL * 0.38, roofY);
    shape.lineTo(-halfL * 0.64, hoodY * 1.04);
    shape.lineTo(-halfL, hoodY * 0.96);
    shape.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: W - 0.14,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 2,
  });
  // Extrude runs along +Z; rotate so profile X becomes vehicle forward +Z and extrusion centers on X
  geo.translate(0, 0, -(W - 0.14) * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

const CHASSIS_CACHE = new Map();
function getChassisGeo(spec) {
  if (!CHASSIS_CACHE.has(spec.id)) CHASSIS_CACHE.set(spec.id, buildCarChassisGeo(spec));
  return CHASSIS_CACHE.get(spec.id);
}

const SHARED_MAT = {
  tire: new THREE.MeshStandardMaterial({ color: '#14171f', roughness: 0.88 }),
  rim: new THREE.MeshStandardMaterial({ color: '#dbe4f0', roughness: 0.25, metalness: 0.85 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#0c1829', roughness: 0.12, metalness: 0.35, clearcoat: 1.0, transparent: true, opacity: 0.86 }),
  trim: new THREE.MeshStandardMaterial({ color: '#181e2b', roughness: 0.55, metalness: 0.4 }),
  leather: new THREE.MeshStandardMaterial({ color: '#a16236', roughness: 0.72 }),
  headlight: new THREE.MeshBasicMaterial({ color: '#fff8d6' }),
  taillight: new THREE.MeshBasicMaterial({ color: '#ff2b4a' }),
  whitePaint: new THREE.MeshPhysicalMaterial({ color: '#f8fafc', roughness: 0.22, metalness: 0.25, clearcoat: 0.9 }),
  taxiGlow: new THREE.MeshBasicMaterial({ color: '#fde047' }),
  nitro: new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
};

function makeWheel() {
  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  const tire = new THREE.Mesh(SHARED_GEO.tire, SHARED_MAT.tire);
  tire.castShadow = true;
  const rim = new THREE.Mesh(SHARED_GEO.rim, SHARED_MAT.rim);
  const sp1 = new THREE.Mesh(SHARED_GEO.spoke, SHARED_MAT.trim);
  const sp2 = new THREE.Mesh(SHARED_GEO.spoke, SHARED_MAT.trim);
  sp2.rotation.x = Math.PI / 2;
  spin.add(tire, rim, sp1, sp2);
  pivot.add(spin);
  return { pivot, spin };
}

export function buildVehicleMesh(spec, paintHex) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paintHex,
    roughness: 0.2,
    metalness: 0.48,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
  });

  const wheels = [];
  let sirenRed = null;
  let sirenBlue = null;
  let sirenBloomR = null;
  let sirenBloomB = null;
  let mainRotor = null;
  let tailRotor = null;
  let spotlightCone = null;
  let nitroFlame = null;

  if (spec.isHeli) {
    // Sleek sculpted AIR-1 SBPD Falcon Helicopter with spinning rotors & volumetric translucent spotlight cone!
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 4.6, 12), paintMat);
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(0.95, 1.0, 0.86);
    hull.position.set(0, 1.5, 0.5);
    hull.castShadow = true;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.12, 12, 10), SHARED_MAT.glass);
    nose.scale.set(0.92, 0.8, 1.45);
    nose.position.set(0, 1.42, 2.75);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.36, 4.2), SHARED_MAT.whitePaint);
    stripe.position.set(0, 1.38, 0.4);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.45, 5.4, 8), paintMat);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 1.78, -4.3);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 1.15), SHARED_MAT.whitePaint);
    fin.position.set(0, 2.38, -6.7);
    const horizFin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.55), paintMat);
    horizFin.position.set(0, 1.82, -5.8);
    body.add(hull, nose, stripe, boom, fin, horizFin);

    // Landing skids
    for (const s of [-1.15, 1.15]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.2, 6), SHARED_MAT.trim);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(s, 0.22, 0.6);
      body.add(skid);
    }

    // Spinning 4-blade main rotor & tail rotor
    mainRotor = new THREE.Group();
    mainRotor.position.set(0, 2.95, 0.6);
    const bladeGeo = new THREE.BoxGeometry(10.8, 0.08, 0.38);
    const b1 = new THREE.Mesh(bladeGeo, SHARED_MAT.trim);
    const b2 = new THREE.Mesh(bladeGeo, SHARED_MAT.trim);
    b2.rotation.y = Math.PI / 2;
    const rotorDisc = new THREE.Mesh(
      new THREE.CircleGeometry(5.3, 24),
      new THREE.MeshBasicMaterial({ color: '#94a3b8', transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    );
    rotorDisc.rotation.x = -Math.PI / 2;
    mainRotor.add(b1, b2, rotorDisc);
    body.add(mainRotor);

    tailRotor = new THREE.Group();
    tailRotor.position.set(0.42, 2.5, -6.7);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.22), SHARED_MAT.trim);
    tailRotor.add(tb);
    body.add(tailRotor);

    // Volumetric translucent spotlight cone pointing down/forward
    const coneGeo = new THREE.ConeGeometry(8.8, 38, 28, 1, true);
    coneGeo.translate(0, -19, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: '#e0f7ff',
      transparent: true,
      opacity: 0.21,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    spotlightCone = new THREE.Mesh(coneGeo, coneMat);
    spotlightCone.position.set(0, 0.55, 3.6);
    spotlightCone.rotation.x = -0.34;
    body.add(spotlightCone);

    const lampOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    );
    lampOrb.position.set(0, 0.55, 3.8);
    body.add(lampOrb);

    return { root, body, paintMat, wheels, mainRotor, tailRotor, spotlightCone };
  }

  if (spec.isBoat) {
    // Sleek V-hull Corsair 380 Speedboat
    const hull = new THREE.Mesh(new THREE.BoxGeometry(spec.w, 0.85, spec.l * 0.78), paintMat);
    hull.position.set(0, 0.45, -0.35);
    hull.castShadow = true;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(spec.w * 0.68, 2.4, 4), paintMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.scale.set(1, 1, 0.42);
    bow.position.set(0, 0.48, spec.l * 0.48);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.06, 0.22, spec.l * 0.74),
      new THREE.MeshStandardMaterial({ color: spec.stripe || '#ff4d6d', roughness: 0.3 }),
    );
    stripe.position.set(0, 0.76, -0.2);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.78, 0.55, 1.15), SHARED_MAT.glass);
    shield.position.set(0, 1.12, 0.45);
    shield.rotation.x = -0.38;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.7, 0.48, 1.3), SHARED_MAT.leather);
    seat.position.set(0, 0.85, -1.0);
    body.add(hull, bow, stripe, shield, seat);
    return { root, body, paintMat, wheels };
  }

  if (spec.isBike) {
    // Sport Motorcycle / Coastal Scooter
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, spec.l * 0.72), paintMat);
    frame.position.set(0, 0.68, 0);
    frame.castShadow = true;
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.46, 0.72), paintMat);
    cowl.position.set(0, 0.92, spec.l * 0.28);
    cowl.rotation.x = 0.28;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.25), SHARED_MAT.glass);
    screen.position.set(0, 1.18, spec.l * 0.35);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.88), SHARED_MAT.trim);
    seat.position.set(0, 0.96, -0.34);
    const hl = new THREE.Mesh(SHARED_GEO.headlight, SHARED_MAT.headlight);
    hl.position.set(0, 0.86, spec.l * 0.46);
    body.add(frame, cowl, screen, seat, hl);
    for (const wz of [spec.l * 0.34, -spec.l * 0.34]) {
      const w = makeWheel();
      w.pivot.scale.set(0.55, 0.85, 0.85);
      w.pivot.position.set(0, 0.38, wz);
      body.add(w.pivot);
      wheels.push({ ...w, front: wz > 0 });
    }
    return { root, body, paintMat, wheels };
  }

  // Sculpted 4-Wheel Automobiles using smooth beveled ExtrudeGeometry silhouettes!
  const L = spec.l;
  const W = spec.w;
  const H = spec.h;
  const isTall = spec.style === 'suv' || spec.style === 'van' || spec.style === 'truck' || spec.style === 'swat' || spec.style === 'police_suv';

  // Sleek beveled aerodynamic chassis + dark lower diffuser & rocker skirts
  const chassis = new THREE.Mesh(getChassisGeo(spec), paintMat);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.18, L - 0.18), SHARED_MAT.trim);
  skirt.position.set(0, 0.34, 0);
  const rearDiff = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.24, 0.16), SHARED_MAT.trim);
  rearDiff.position.set(0, 0.46, -L * 0.502);
  body.add(chassis, skirt, rearDiff);

  const lowerH = isTall ? H * 0.54 : H * 0.56;
  const cabLen = spec.style === 'van' || spec.style === 'swat' || spec.style === 'truck' ? L * 0.72
    : spec.style === 'suv' || spec.style === 'police_suv' ? L * 0.58
    : spec.style === 'limo' ? L * 0.58 : L * 0.44;
  const cabH = isTall ? H * 0.38 : H * 0.36;
  const cabZ = spec.style === 'super' ? -0.22 : -0.14;

  if (spec.openTop) {
    const ws = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.44, 0.1), SHARED_MAT.glass);
    ws.position.set(0, lowerH + 0.24, L * 0.16);
    ws.rotation.x = -0.56;
    const tub = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.26, cabLen * 0.9), SHARED_MAT.leather);
    tub.position.set(0, lowerH + 0.04, -0.22);
    const bar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 6, 12, Math.PI), SHARED_MAT.rim);
    bar.position.set(-0.42, lowerH + 0.14, -0.88);
    const bar2 = bar.clone();
    bar2.position.x = 0.42;
    body.add(ws, tub, bar, bar2);
  } else {
    // Sleek dark tinted wraparound windshield, side & rear windows proud of chassis curve
    const glassWrap = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, cabH * 0.92, cabLen * 0.94), SHARED_MAT.glass);
    glassWrap.position.set(0, lowerH + cabH * 0.52, cabZ);
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, cabH * 1.1, 0.14), SHARED_MAT.glass);
    frontGlass.position.set(0, lowerH + cabH * 0.46, cabZ + cabLen * 0.56);
    frontGlass.rotation.x = -0.78;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, cabH * 1.15, 0.14), SHARED_MAT.glass);
    rearGlass.position.set(0, lowerH + cabH * 0.42, cabZ - cabLen * 0.58);
    rearGlass.rotation.x = 0.82;
    body.add(glassWrap, frontGlass, rearGlass);
  }

  // Police white doors + white roof panel + heavy bull-bar + glowing soft sprite Red/Blue Lightbar Flares!
  if (spec.isPolice) {
    const doors = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, lowerH * 0.58, L * 0.44), SHARED_MAT.whitePaint);
    doors.position.set(0, 0.44 + lowerH * 0.26, 0.02);
    const roofW = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.08, cabLen * 0.8), SHARED_MAT.whitePaint);
    roofW.position.set(0, H + 0.02, cabZ);
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.76, 0.52, 0.24), SHARED_MAT.trim);
    pushBar.position.set(0, 0.62, L * 0.54);
    body.add(doors, roofW, pushBar);

    const barY = H + 0.12;
    const baseBar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.66, 0.11, 0.32), SHARED_MAT.trim);
    baseBar.position.set(0, barY, cabZ + 0.1);
    const matR = new THREE.MeshBasicMaterial({ color: '#ff2448' });
    const matB = new THREE.MeshBasicMaterial({ color: '#2998ff' });
    sirenRed = new THREE.Mesh(new THREE.BoxGeometry(W * 0.29, 0.19, 0.34), matR);
    sirenRed.position.set(-W * 0.17, barY + 0.11, cabZ + 0.1);
    sirenBlue = new THREE.Mesh(new THREE.BoxGeometry(W * 0.29, 0.19, 0.34), matB);
    sirenBlue.position.set(W * 0.17, barY + 0.11, cabZ + 0.1);

    const flareMatR = new THREE.SpriteMaterial({ map: SHARED_FLARE_TEX, color: '#ff2b52', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const flareMatB = new THREE.SpriteMaterial({ map: SHARED_FLARE_TEX, color: '#38bdf8', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    sirenBloomR = new THREE.Sprite(flareMatR);
    sirenBloomR.position.copy(sirenRed.position);
    sirenBloomR.scale.setScalar(3.0);
    sirenBloomB = new THREE.Sprite(flareMatB);
    sirenBloomB.position.copy(sirenBlue.position);
    sirenBloomB.scale.setScalar(3.0);
    body.add(baseBar, sirenRed, sirenBlue, sirenBloomR, sirenBloomB);
  }

  // Distinct Styling Details: twin racing stripes, GT spoiler, muscle hood blower, taxi sign
  if (spec.stripe) {
    const st = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.04, L * 0.92),
      new THREE.MeshStandardMaterial({ color: spec.stripe, roughness: 0.32 }),
    );
    st.position.set(0, H * 0.72, 0);
    body.add(st);
  }
  if (spec.spoiler) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, 0.07, 0.36), SHARED_MAT.trim);
    wing.position.set(0, lowerH + 0.42, -L * 0.44);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.16), SHARED_MAT.trim);
    strutL.position.set(-W * 0.34, lowerH + 0.24, -L * 0.44);
    const strutR = strutL.clone();
    strutR.position.x = W * 0.34;
    body.add(wing, strutL, strutR);
  }
  if (spec.scoop) {
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.82), SHARED_MAT.rim);
    sc.position.set(0, lowerH + 0.12, L * 0.24);
    body.add(sc);
  }
  if (spec.taxiSign) {
    const ts = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.28), SHARED_MAT.taxiGlow);
    ts.position.set(0, H + 0.14, 0.05);
    body.add(ts);
  }

  // Crisp LED Headlights, Wide Supercar Taillight Bar & Dual Exhausts + Nitro Flame
  for (const sx of [-W * 0.34, W * 0.34]) {
    const hl = new THREE.Mesh(SHARED_GEO.headlight, SHARED_MAT.headlight);
    hl.position.set(sx, 0.62, L * 0.51);
    const tl = new THREE.Mesh(SHARED_GEO.taillight, SHARED_MAT.taillight);
    tl.position.set(sx, 0.72, -L * 0.51);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8), SHARED_MAT.rim);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx * 0.65, 0.42, -L * 0.52);
    body.add(hl, tl, pipe);
  }
  if (spec.style === 'super' || spec.style === 'coupe') {
    const ledBar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.07, 0.06), SHARED_MAT.taillight);
    ledBar.position.set(0, 0.74, -L * 0.515);
    body.add(ledBar);
  }
  nitroFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.5, 8), SHARED_MAT.nitro);
  nitroFlame.rotation.x = -Math.PI / 2;
  nitroFlame.position.set(0, 0.46, -L * 0.5 - 0.7);
  nitroFlame.visible = false;
  body.add(nitroFlame);

  // 4 Spoked Rotating & Steering Wheels
  const wx = W * 0.48;
  const wzF = L * 0.31;
  const wzR = -L * 0.31;
  const wCoords = [[-wx, wzF, true], [wx, wzF, true], [-wx, wzR, false], [wx, wzR, false]];
  for (let i = 0; i < wCoords.length; i += 1) {
    const [x, z, front] = wCoords[i];
    const w = makeWheel();
    w.pivot.position.set(x, 0.42, z);
    body.add(w.pivot);
    wheels.push({ ...w, front });
  }

  return {
    root, body, paintMat, wheels,
    sirenRed, sirenBlue, sirenBloomR, sirenBloomB, nitroFlame,
  };
}

let nextVehId = 1;

export function spawnVehicle(scene, modelId, x, z, yaw, rng, opts = {}) {
  const spec = VEHICLES[modelId] || VEHICLES.brisa_sedan;
  const color = opts.color || pick(rng, spec.colors);
  const rig = buildVehicleMesh(spec, color);
  const y = opts.y ?? (spec.isHeli ? 26 : getGroundHeightAt(x, z));
  rig.root.position.set(x, y, z);
  rig.root.rotation.y = yaw;
  scene.add(rig.root);

  return {
    id: nextVehId++,
    modelId: spec.id,
    spec,
    color,
    rig,
    x, y, z,
    vx: 0, vy: 0, vz: 0,
    yaw,
    speed: opts.speed || 0,
    steer: 0,
    drifting: false,
    nitro: 100,
    nitroActive: false,
    health: opts.health ?? spec.hp,
    maxHealth: spec.hp,
    destroyed: Boolean(opts.destroyed),
    burning: Boolean(opts.burning),
    driverType: opts.driverType || 'parked', // player | traffic | police | parked | mission
    siren: Boolean(opts.siren || (spec.isPolice && opts.driverType === 'police')),
    callsign: opts.callsign || '',
    tactic: opts.tactic || '',
    roadAxis: opts.roadAxis || 'z',
    roadDir: opts.roadDir || 1,
    upgrades: { engine: 0, armor: 0, handling: 0 },
    rollAngle: 0,
    pitchAngle: 0,
    airTime: 0,
    spikeTimer: 0,
    missionTag: opts.missionTag || null,
  };
}

export function repaintVehicle(v, newColor) {
  v.color = newColor;
  v.rig.paintMat.color.set(newColor);
}

export function removeVehicle(scene, vehicles, v) {
  scene.remove(v.rig.root);
  const idx = vehicles.indexOf(v);
  if (idx >= 0) vehicles.splice(idx, 1);
}

export function stepVehiclePhysics(v, ctrl, world, effects, dt, elapsed) {
  const spec = v.spec;
  if (spec.isHeli) {
    if (v.rig.mainRotor) v.rig.mainRotor.rotation.y += dt * 26;
    if (v.rig.tailRotor) v.rig.tailRotor.rotation.x += dt * 34;
    v.rig.root.position.set(v.x, v.y, v.z);
    v.rig.root.rotation.y = v.yaw;
    return;
  }

  // Flashing police lightbars & blooms
  if (spec.isPolice && v.rig.sirenRed) {
    const onRed = Math.floor(elapsed * 9 + v.id) % 2 === 0;
    const active = v.siren && !v.destroyed;
    v.rig.sirenRed.visible = active ? onRed : true;
    v.rig.sirenBlue.visible = active ? !onRed : true;
    v.rig.sirenBloomR.visible = active && onRed;
    v.rig.sirenBloomB.visible = active && !onRed;
  }

  if (v.destroyed) {
    v.speed *= Math.max(0, 1 - dt * 4);
    if (v.burning && Math.random() < 0.45) {
      effects.spawnFireFlame(v.x, v.y + 0.9, v.z, 1.1);
    }
    v.rig.root.position.set(v.x, v.y, v.z);
    v.rig.root.rotation.y = v.yaw;
    return;
  }

  const throttle = ctrl.throttle || 0;
  const steerIn = ctrl.steer || 0;
  const handbrake = Boolean(ctrl.handbrake);
  const boost = Boolean(ctrl.nitro) && v.nitro > 4 && throttle > 0.1;

  const engMult = 1 + (v.upgrades?.engine || 0) * 0.12;
  const handMult = 1 + (v.upgrades?.handling || 0) * 0.12;
  const maxSpd = spec.maxSpd * engMult * (boost ? 1.28 : 1.0) * (v.spikeTimer > 0 ? 0.52 : 1);
  const accel = spec.accel * engMult * (boost ? 1.45 : 1.0);

  if (boost) {
    v.nitro = Math.max(0, v.nitro - dt * 28);
    v.nitroActive = true;
  } else {
    v.nitro = Math.min(100, v.nitro + dt * 11);
    v.nitroActive = false;
  }
  if (v.rig.nitroFlame) {
    v.rig.nitroFlame.visible = v.nitroActive;
    if (v.nitroActive) v.rig.nitroFlame.scale.setScalar(0.85 + Math.random() * 0.35);
  }

  if (v.spikeTimer > 0) v.spikeTimer = Math.max(0, v.spikeTimer - dt);

  // Forward acceleration & braking
  const fx = Math.sin(v.yaw);
  const fz = Math.cos(v.yaw);
  const rx = -Math.cos(v.yaw);
  const rz = Math.sin(v.yaw);

  let fwdSpd = v.vx * fx + v.vz * fz;
  let latSpd = v.vx * rx + v.vz * rz;

  if (throttle > 0.01) {
    fwdSpd += accel * throttle * dt;
  } else if (throttle < -0.01) {
    if (fwdSpd > 2) fwdSpd -= accel * 1.45 * dt;
    else fwdSpd += accel * 0.6 * throttle * dt;
  } else {
    fwdSpd *= Math.max(0, 1 - dt * (spec.isBoat ? 1.2 : 1.55));
  }
  if (handbrake) fwdSpd *= Math.max(0, 1 - dt * 2.1);
  fwdSpd = THREE.MathUtils.clamp(fwdSpd, -maxSpd * 0.38, maxSpd);

  // Steering & drift slip dynamics
  const speedRatio = Math.min(1, Math.abs(fwdSpd) / 14);
  const dirSign = fwdSpd >= -0.5 ? 1 : -1;
  const targetSteer = steerIn * (handbrake ? 1.38 : 1.0);
  v.steer = THREE.MathUtils.lerp(v.steer, targetSteer, Math.min(1, dt * 10));
  v.yaw += v.steer * spec.turn * handMult * speedRatio * dirSign * dt;

  // Lateral grip vs handbrake drift slip
  const grip = spec.isBoat ? 2.4 : (handbrake ? 1.8 : 6.4 * handMult);
  latSpd *= Math.max(0, 1 - dt * grip);

  const nfx = Math.sin(v.yaw);
  const nfz = Math.cos(v.yaw);
  const nrx = -Math.cos(v.yaw);
  const nrz = Math.sin(v.yaw);

  v.vx = nfx * fwdSpd + nrx * latSpd;
  v.vz = nfz * fwdSpd + nrz * latSpd;
  v.speed = Math.hypot(v.vx, v.vz);
  v.drifting = !spec.isBoat && Math.abs(latSpd) > 4.2 && v.speed > 14;

  // Move & enforce water vs land boundaries
  const nextX = THREE.MathUtils.clamp(v.x + v.vx * dt, WORLD.minX, WORLD.maxX);
  const nextZ = THREE.MathUtils.clamp(v.z + v.vz * dt, WORLD.minZ, WORLD.maxZ);
  const nextWater = isWaterAt(nextX, nextZ);

  if (spec.isBoat) {
    if (nextWater || nextX > WORLD.shorelineX - 6) {
      v.x = nextX;
      v.z = nextZ;
    } else {
      v.vx *= -0.3;
      v.vz *= -0.3;
    }
    v.y = -0.15 + Math.sin(elapsed * 2.5 + v.x * 0.08) * 0.18;
    if (v.speed > 8 && Math.random() < 0.5) {
      effects.spawnDriftSmoke(v.x - nfx * 2.6, 0.1, v.z - nfz * 2.6, 1, 0.6);
    }
  } else {
    if (nextWater && v.y < 1.2) {
      // Soft shoreline bounce back onto sand so land cars stay playable!
      v.vx *= -0.45;
      v.vz *= -0.45;
    } else {
      v.x = nextX;
      v.z = nextZ;
    }
    const col = resolveBuildingCollision(world, v.x, v.z, spec.w * 0.62);
    if (col.hit) {
      v.x = col.x;
      v.z = col.z;
      if (v.speed > 16) {
        effects.spawnSparks(v.x, v.y + 0.8, v.z, 8);
      }
      v.vx *= 0.35;
      v.vz *= 0.35;
    }
    // Vertical gravity + bridge/ramp elevation
    const groundY = getGroundHeightAt(v.x, v.z, world.ramps);
    if (v.y > groundY + 0.06 || v.vy > 0.1) {
      v.vy -= 26 * dt;
      v.y += v.vy * dt;
      v.airTime += dt;
      if (v.y <= groundY) {
        v.y = groundY;
        v.vy = 0;
        if (v.airTime > 0.45) effects.spawnSparks(v.x, v.y + 0.3, v.z, 10);
        v.airTime = 0;
      }
    } else {
      const slopeBoost = groundY - v.y;
      if (slopeBoost > 0.08 && v.speed > 20) v.vy = Math.min(13, slopeBoost / Math.max(dt, 0.016) * 0.52);
      v.y = groundY;
    }
  }

  // Drift tire smoke & asphalt skidmarks
  if (v.drifting && v.airTime === 0) {
    const rearX = v.x - nfx * spec.l * 0.34;
    const rearZ = v.z - nfz * spec.l * 0.34;
    if (Math.random() < 0.72) {
      effects.spawnDriftSmoke(rearX + nrx * 0.85, v.y, rearZ + nrz * 0.85, 1, 0.45);
      effects.spawnDriftSmoke(rearX - nrx * 0.85, v.y, rearZ - nrz * 0.85, 1, 0.45);
    }
    if (Math.random() < 0.65) {
      effects.addSkidmark(rearX + nrx * 0.82, v.y, rearZ + nrz * 0.82, v.yaw);
      effects.addSkidmark(rearX - nrx * 0.82, v.y, rearZ - nrz * 0.82, v.yaw);
    }
  }

  // Smoke if heavily damaged
  if (v.health < v.maxHealth * 0.35 && Math.random() < 0.25) {
    effects.spawnParticle(
      v.x + nfx * 1.4, v.y + 1.1, v.z + nfz * 1.4,
      0, 2.2, 0, 0.8, '#334155', 0.7, { opacity: 0.45, grow: 2.2 },
    );
  }

  // Animate spoked wheel spin, front steer & dynamic body roll/pitch
  for (let i = 0; i < v.rig.wheels.length; i += 1) {
    const w = v.rig.wheels[i];
    w.spin.rotation.x += (fwdSpd / 0.42) * dt;
    if (w.front) w.pivot.rotation.y = v.steer * 0.46;
  }
  const targetRoll = THREE.MathUtils.clamp(-v.steer * speedRatio * (spec.isBike ? 0.34 : 0.085), -0.35, 0.35);
  const targetPitch = THREE.MathUtils.clamp(-throttle * 0.035, -0.05, 0.05);
  v.rollAngle = THREE.MathUtils.lerp(v.rollAngle, targetRoll, Math.min(1, dt * 8));
  v.pitchAngle = THREE.MathUtils.lerp(v.pitchAngle, targetPitch, Math.min(1, dt * 8));

  v.rig.root.position.set(v.x, v.y, v.z);
  v.rig.root.rotation.y = v.yaw;
  v.rig.body.rotation.z = v.rollAngle;
  v.rig.body.rotation.x = v.pitchAngle;
}

export function resolveVehicleCollisions(vehicles, effects) {
  for (let i = 0; i < vehicles.length; i += 1) {
    const a = vehicles[i];
    if (a.spec.isHeli) continue;
    for (let j = i + 1; j < vehicles.length; j += 1) {
      const b = vehicles[j];
      if (b.spec.isHeli) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const minD = (a.spec.w + b.spec.w) * 0.56 + 0.6;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.001 && d2 < minD * minD) {
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const nz = dz / d;
        const overlap = (minD - d) * 0.55;
        a.x -= nx * overlap;
        a.z -= nz * overlap;
        b.x += nx * overlap;
        b.z += nz * overlap;
        const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rel < 0) {
          const imp = -rel * 0.72;
          a.vx -= nx * imp;
          a.vz -= nz * imp;
          b.vx += nx * imp;
          b.vz += nz * imp;
          if (Math.abs(rel) > 10) {
            effects.spawnSparks((a.x + b.x) * 0.5, Math.max(a.y, b.y) + 0.85, (a.z + b.z) * 0.5, 10);
            const dmg = Math.min(28, Math.abs(rel) * 0.45);
            if (!a.destroyed) a.health = Math.max(5, a.health - dmg * (a.driverType === 'player' ? 0.35 : 0.75));
            if (!b.destroyed) b.health = Math.max(5, b.health - dmg * (b.driverType === 'player' ? 0.35 : 0.75));
          }
        }
      }
    }
  }
}
