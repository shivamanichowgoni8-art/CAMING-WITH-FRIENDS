// Deterministic Seeded Pseudorandom Number Generator (Mulberry32 + SplitMix32)
// Ensures identical world generation and deterministic ecosystem simulation across all clients.

export function createPRNG(seed) {
  // Convert any string or number seed into a 32-bit unsigned integer
  let s = 0;
  if (typeof seed === 'string') {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    }
    s = h >>> 0;
  } else if (typeof seed === 'number') {
    s = (seed >>> 0) || 1337;
  } else {
    s = 1337;
  }

  // SplitMix32 state mixing for high entropy initial seed
  function splitmix32() {
    s |= 0;
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0);
  }

  // Primary PRNG state
  let state = splitmix32();

  // Mulberry32 generator: excellent distribution, period ~2^32, fast on mobile
  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    // Current seed state
    getSeed: () => seed,

    // Float in range [0, 1)
    next,

    // Float in range [min, max)
    nextFloat(min, max) {
      return min + (max - min) * next();
    },

    // Integer in range [min, max] inclusive
    nextInt(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },

    // Pick random item from array
    choice(array) {
      if (!array || array.length === 0) return null;
      return array[Math.floor(next() * array.length)];
    },

    // In-place Fisher-Yates array shuffle
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
      return array;
    },

    // Fork a new independent sub-generator with deterministic derived seed
    fork(salt = 0) {
      return createPRNG((state ^ (typeof salt === 'string' ? 777 : salt)) >>> 0);
    }
  };
}
