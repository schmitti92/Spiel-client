// Deterministic logical clock. The host advances time explicitly.
// No Date.now(), performance.now() or setTimeout() in the game rule layer.
export function createClock(initialNow = 0) {
  if (!Number.isFinite(initialNow) || initialNow < 0) throw new RangeError('Invalid initial time');
  let now = initialNow;
  return Object.freeze({
    now() { return now; },
    advanceTo(value) {
      if (!Number.isFinite(value) || value < now) throw new RangeError('Clock cannot move backwards');
      now = value;
      return now;
    },
    advanceBy(delta) {
      if (!Number.isFinite(delta) || delta < 0) throw new RangeError('Invalid duration');
      return this.advanceTo(now + delta);
    }
  });
}
