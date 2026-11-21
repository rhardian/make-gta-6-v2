// Procedural sun-soaked coastal city generator for Solaria Bay: districts, road grid,
// art-deco hotels, downtown skyscrapers, neon signage, palm trees, beaches, marina piers,
// safehouses, customs garages and building collision queries.

import { CITY_DISTRICTS, WORLD_CONFIG } from './config.js';
import { createSeededRandom, hashCoords, randomChoice, randomRange } from './random.js';

const BUILDING_SIGNS = [
  'HOTEL SOLARIA', 'MIRAGE CASINO', 'CORAL BANK', 'SOLARIA CUSTOMS',
  'VANCE TOWER', 'CLUB ECLIPSE', 'STARLIGHT PIER', 'PALMA PLAZA',
  'BANCO SOLARIA', 'NEON LAGOON', 'AZURE RESORT', 'HELIO SKYBAR',
];

const FACADE_PALETTES = {
  coral_promenade: [
    { wall: '#f9a8d4', side: '#db2777', roof: '#fdf2f8', trim: '#22d3ee', window: '#fef08a' },
    { wall: '#67e8f9', side: '#0891b2', roof: '#ecfeff', trim: '#f472b6', window: '#fde047' },
    { wall: '#fde68a', side: '#d97706', roof: '#fffbeb', trim: '#fb7185', window: '#38bdf8' },
  ],
  solaria_downtown: [
    { wall: '#38bdf8', side: '#0369a1', roof: '#0f172a', trim: '#facc15', window: '#e0f2fe' },
    { wall: '#64748b', side: '#1e293b', roof: '#090d16', trim: '#38bdf8', window: '#bae6fd' },
    { wall: '#818cf8', side: '#3730a3', roof: '#1e1b4b', trim: '#2dd4bf', window: '#fef08a' },
  ],
  mirage_strip: [
    { wall: '#c084fc', side: '#6b21a8', roof: '#1e1035', trim: '#fb7185', window: '#f5d0fe' },
    { wall: '#f472b6', side: '#9d174d', roof: '#2a0e24', trim: '#22d3ee', window: '#fef08a' },
  ],
  starlight_marina: [
    { wall: '#5eead4', side: '#0f766e', roof: '#f0fdfa', trim: '#fde047', window: '#fef9c3' },
    { wall: '#93c5fd', side: '#1d4ed8', roof: '#eff6ff', trim: '#fb923c', window: '#fde68a' },
  ],
  palma_vista: [
    { wall: '#fdba74', side: '#c2410c', roof: '#7c2d12', trim: '#34d399', window: '#fef3c7' },
    { wall: '#fde047', side: '#ca8a04', roof: '#713f12', trim: '#fb7185', window: '#fffbeb' },
  ],
  cobre_docks: [
    { wall: '#94a3b8', side: '#334155', roof: '#1e293b', trim: '#f59e0b', window: '#fde68a' },
    { wall: '#d97706', side: '#78350f', roof: '#27272a', trim: '#38bdf8', window: '#fed7aa' },
  ],
};

export function getDistrictAt(x, y) {
  for (let i = 0; i < CITY_DISTRICTS.length; i += 1) {
    const d = CITY_DISTRICTS[i];
    if (x >= d.minX && x <= d.maxX && y >= d.minY && y <= d.maxY) return d;
  }
  return CITY_DISTRICTS[0];
}

export function createCityMap(seed = 101) {
  const rng = createSeededRandom(seed);
  const { blockPitch, roadWidth, sidewalkWidth, beachStartX, oceanStartX } = WORLD_CONFIG;

  const roadsX = [];
  const roadsY = [];
  for (let gx = -3; gx <= 2; gx += 1) roadsX.push(gx * blockPitch);
  for (let gy = -3; gy <= 3; gy += 1) roadsY.push(gy * blockPitch);

  const buildings = [];
  const palmTrees = [];
  const streetLamps = [];
  const beachProps = [];
  const piers = [
    { id: 'marina_pier_north', x: oceanStartX - 20, y: -180, width: 190, length: 34, height: 6 },
    { id: 'marina_pier_MAIN', x: oceanStartX - 20, y: 60, width: 220, length: 42, height: 7 },
    { id: 'marina_pier_south', x: oceanStartX - 20, y: 300, width: 175, length: 34, height: 6 },
  ];

  let buildingId = 1;
  const innerSpan = blockPitch - roadWidth - sidewalkWidth * 2;

  for (let gx = -3; gx < 2; gx += 1) {
    for (let gy = -3; gy < 3; gy += 1) {
      const centerX = (gx + 0.5) * blockPitch;
      const centerY = (gy + 0.5) * blockPitch;
      if (centerX > beachStartX - 40) continue;

      const district = getDistrictAt(centerX, centerY);
      const palettes = FACADE_PALETTES[district.id] || FACADE_PALETTES.coral_promenade;
      const blockMinX = gx * blockPitch + roadWidth * 0.5 + sidewalkWidth;
      const blockMinY = gy * blockPitch + roadWidth * 0.5 + sidewalkWidth;

      // Subdivide each city block into 2x2 or 1x2 architectural lots with alleyways
      const subCols = 2;
      const subRows = (gx === 0 && gy === 0) ? 1 : 2;
      const gap = 12;
      const lotW = (innerSpan - gap * (subCols - 1)) / subCols;
      const lotH = (innerSpan - gap * (subRows - 1)) / subRows;

      for (let sc = 0; sc < subCols; sc += 1) {
        for (let sr = 0; sr < subRows; sr += 1) {
          const bx = blockMinX + sc * (lotW + gap) + lotW * 0.5;
          const by = blockMinY + sr * (lotH + gap) + lotH * 0.5;
          const bw = lotW - randomRange(rng, 2, 10);
          const bd = lotH - randomRange(rng, 2, 10);
          const height = Math.round(randomRange(rng, district.heightMin, district.heightMax));
          const palette = randomChoice(rng, palettes);
          const hasSetback = height > 80 || rng() > 0.35;
          const hasHelipad = height > 105 && (gx === 0 || gx === -1 || rng() > 0.42);
          const hasPool = !hasHelipad && district.id === 'coral_promenade' && rng() > 0.4;
          const isPrimeAvenue = gx === 1 || gx === 0 || gx === -1;
          const signText = (isPrimeAvenue || (height > 58 && rng() > 0.32))
            ? BUILDING_SIGNS[(buildingId + Math.floor(hashCoords(gx, gy) * 16)) % BUILDING_SIGNS.length]
            : null;

          buildings.push({
            id: `bld_${buildingId++}`,
            x: bx,
            y: by,
            width: bw,
            depth: bd,
            height,
            districtId: district.id,
            wallColor: palette.wall,
            sideColor: palette.side,
            roofColor: palette.roof,
            trimColor: palette.trim,
            windowColor: palette.window,
            floors: Math.max(4, Math.floor(height / 12)),
            windowCols: Math.max(4, Math.floor(bw / 11)),
            windowRows: Math.max(4, Math.floor(bd / 11)),
            hasSetback,
            hasHelipad,
            hasPool,
            hasAcUnits: true,
            signText,
          });
        }
      }

      // Sidewalk palm trees & street lamps around block perimeter
      const corners = [
        [blockMinX - 5, blockMinY - 5],
        [blockMinX + innerSpan + 5, blockMinY - 5],
        [blockMinX - 5, blockMinY + innerSpan + 5],
        [blockMinX + innerSpan + 5, blockMinY + innerSpan + 5],
        [blockMinX - 5, centerY],
        [blockMinX + innerSpan + 5, centerY],
      ];
      for (let c = 0; c < corners.length; c += 1) {
        streetLamps.push({ x: corners[c][0], y: corners[c][1], height: 24 });
      }
      palmTrees.push(
        { x: centerX, y: blockMinY - 5, height: randomRange(rng, 28, 38), lean: randomRange(rng, -0.25, 0.25), seed: rng() },
        { x: centerX, y: blockMinY + innerSpan + 5, height: randomRange(rng, 28, 38), lean: randomRange(rng, -0.25, 0.25), seed: rng() },
      );
    }
  }

  // Ensure deterministic signature neon signs on key avenues for Ocean Palm Drive & Downtown
  const signatureAssignments = [
    { targetX: 410, targetY: -80, sign: 'HOTEL SOLARIA' },
    { targetX: 410, targetY: -180, sign: 'MIRAGE CASINO' },
    { targetX: 410, targetY: 60, sign: 'SOLARIA CUSTOMS' },
    { targetX: 410, targetY: -20, sign: 'CORAL BANK' },
    { targetX: -65, targetY: -50, sign: 'CORAL BANK' },
    { targetX: 65, targetY: -50, sign: 'VANCE TOWER' },
    { targetX: -65, targetY: 45, sign: 'SOLARIA CUSTOMS' },
    { targetX: 65, targetY: 45, sign: 'MIRAGE CASINO' },
    { targetX: 410, targetY: 165, sign: 'STARLIGHT PIER' },
  ];
  for (let s = 0; s < signatureAssignments.length; s += 1) {
    const item = signatureAssignments[s];
    let bestB = null;
    let bestD = Infinity;
    for (let i = 0; i < buildings.length; i += 1) {
      const d = Math.hypot(buildings[i].x - item.targetX, buildings[i].y - item.targetY);
      if (d < bestD) {
        bestD = d;
        bestB = buildings[i];
      }
    }
    if (bestB) bestB.signText = item.sign;
  }

  // Iconic Ocean Palm Boulevard palm colonnade, streetlamps & colorful 3D beach umbrellas
  for (let py = -780; py <= 780; py += 58) {
    palmTrees.push({
      x: beachStartX - 18,
      y: py,
      height: 36 + (Math.abs(py) % 11),
      lean: 0.18,
      seed: (py + 900) * 0.013,
    });
    streetLamps.push({ x: beachStartX - 24, y: py + 28, height: 24 });
    beachProps.push({
      x: beachStartX + 42 + ((Math.abs(py) * 5) % 44),
      y: py - 12,
      radius: 13.5,
      color: ['#ff2a78', '#00f5d4', '#facc15', '#fb923c', '#a855f7', '#38bdf8'][Math.abs(py) % 6],
      secondaryColor: '#f8fafc',
    });
    if (py % 116 === 0) {
      palmTrees.push({
        x: beachStartX + 24,
        y: py + 24,
        height: 33,
        lean: 0.28,
        seed: (py + 500) * 0.021,
      });
      beachProps.push({
        x: beachStartX + 76 + ((Math.abs(py) * 7) % 24),
        y: py + 18,
        radius: 12.5,
        color: ['#00f5d4', '#ff2a78', '#facc15', '#a855f7'][(Math.abs(py) / 116) % 4 | 0],
        secondaryColor: '#fef08a',
      });
    }
  }

  const ferrisWheel = {
    x: oceanStartX + 115,
    y: 60,
    zBase: 3.4,
    centerZ: 42,
    radius: 31,
    cabins: 10,
  };

  const landmarks = [
    {
      id: 'safehouse_coral',
      kind: 'safehouse',
      name: 'Valeria\'s Oceanfront Penthouse',
      x: 440,
      y: -115,
      color: '#25f4ee',
      description: 'Save Progress & Replenish Armor',
    },
    {
      id: 'customs_neon',
      kind: 'customs',
      name: 'Los Solaria Customs & Respray',
      x: 0,
      y: -240,
      color: '#c084fc',
      description: 'Respray Car & Clear Wanted Stars ($1,000)',
    },
    {
      id: 'ammu_downtown',
      kind: 'armory',
      name: 'Solaria Tactical Supply',
      x: -240,
      y: 0,
      color: '#fb923c',
      description: 'Restock Full Ammo & Body Armor ($500)',
    },
    {
      id: 'marina_dock',
      kind: 'marina',
      name: 'Starlight Speedboat Slip',
      x: oceanStartX + 45,
      y: 60,
      color: '#fde047',
      description: 'Board Corsair Jetboats & Smuggler Craft',
    },
  ];

  return {
    roadsX,
    roadsY,
    buildings,
    palmTrees,
    streetLamps,
    beachProps,
    piers,
    ferrisWheel,
    landmarks,
  };
}

export function queryBuildingCollision(cityMap, x, y, radius = 10) {
  const buildings = cityMap.buildings;
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    const halfW = b.width * 0.5 + radius;
    const halfD = b.depth * 0.5 + radius;
    if (Math.abs(x - b.x) < halfW && Math.abs(y - b.y) < halfD) {
      return b;
    }
  }
  return null;
}

export function resolveCircleBuildingCollision(cityMap, entity, radius = 12) {
  let hitBuilding = null;
  const buildings = cityMap.buildings;
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    const halfW = b.width * 0.5;
    const halfD = b.depth * 0.5;
    const clampedX = Math.max(b.x - halfW, Math.min(entity.x, b.x + halfW));
    const clampedY = Math.max(b.y - halfD, Math.min(entity.y, b.y + halfD));
    const dx = entity.x - clampedX;
    const dy = entity.y - clampedY;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      hitBuilding = b;
      const dist = Math.sqrt(distSq) || 0.001;
      if (dist < 0.01) {
        // Deep inside AABB: push out along nearest edge
        const overlapX = halfW + radius - Math.abs(entity.x - b.x);
        const overlapY = halfD + radius - Math.abs(entity.y - b.y);
        if (overlapX < overlapY) {
          entity.x += entity.x >= b.x ? overlapX : -overlapX;
        } else {
          entity.y += entity.y >= b.y ? overlapY : -overlapY;
        }
      } else {
        const push = radius - dist;
        entity.x += (dx / dist) * push;
        entity.y += (dy / dist) * push;
      }
    }
  }
  return hitBuilding;
}

export function findNearestRoadNode(cityMap, x, y) {
  let bestX = cityMap.roadsX[0];
  let bestDistX = Infinity;
  for (let i = 0; i < cityMap.roadsX.length; i += 1) {
    const d = Math.abs(x - cityMap.roadsX[i]);
    if (d < bestDistX) {
      bestDistX = d;
      bestX = cityMap.roadsX[i];
    }
  }
  let bestY = cityMap.roadsY[0];
  let bestDistY = Infinity;
  for (let i = 0; i < cityMap.roadsY.length; i += 1) {
    const d = Math.abs(y - cityMap.roadsY[i]);
    if (d < bestDistY) {
      bestDistY = d;
      bestY = cityMap.roadsY[i];
    }
  }
  return { x: bestX, y: bestY };
}

export function getTrafficLightState(simTime, intersectionX, intersectionY) {
  const phaseOffset = ((Math.round(intersectionX / 240) + Math.round(intersectionY / 240)) & 1) * 7;
  const cycle = (simTime + phaseOffset) % 14;
  // Returns which axis has green ('ns' or 'ew') or 'yellow'
  if (cycle < 5.5) return 'ns_green';
  if (cycle < 7.0) return 'ns_yellow';
  if (cycle < 12.5) return 'ew_green';
  return 'ew_yellow';
}
