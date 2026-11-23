// Deterministic Mulberry32 PRNG and spatial hashing helpers for Solaria Bay.

export function createRng(seed = 1) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng, min, max) {
  return min + (max - min) * rng();
}

export function randInt(rng, min, max) {
  return Math.floor(randRange(rng, min, max + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function hash2D(ix, iz, seed = 17) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
