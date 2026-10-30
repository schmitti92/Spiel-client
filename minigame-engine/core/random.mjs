// Deterministic PRNG. Seed 0 is valid. Never use Math.random in game rules.
export function createRandom(seed = 1) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('Seed must be a safe integer');
  let state = seed >>> 0;
  return {
    next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    },
    getState() { return state; }
  };
}
