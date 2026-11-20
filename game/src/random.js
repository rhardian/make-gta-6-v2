// Deterministic seeded PRNG (Mulberry32) and spatial hash utilities so city generation,
// traffic patterns and screenshot scenes (?seed=N) are 100% reproducible.

export function createSeededRandom(seed = 1337) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return next;
}

export function randomRange(rng, min, max) {
  return min + (max - min) * rng();
}

export function randomInt(rng, min, maxInclusive) {
  return Math.floor(min + (maxInclusive - min + 1) * rng());
}

export function randomChoice(rng, list) {
  if (!list || list.length === 0) return null;
  return list[Math.floor(rng() * list.length)];
}

export function hashCoords(x, y, salt = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 1442695041);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
