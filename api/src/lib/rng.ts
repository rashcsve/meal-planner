// Deterministic PRNG (mulberry32): same seed -> same sequence, every run.
// Needed so a bad plan can be reproduced from its stored seed for debugging.
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
