import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../core/clock.mjs';
test('clock starts at explicit value and advances deterministically', () => {
  const clock = createClock(3000);
  assert.equal(clock.now(), 3000);
  assert.equal(clock.advanceBy(2000), 5000);
  assert.equal(clock.advanceTo(13000), 13000);
  assert.equal(clock.now(), 13000);
});
test('clock rejects backward and invalid time', () => {
  const clock = createClock();
  assert.throws(() => clock.advanceTo(-1), /backwards/);
  assert.throws(() => clock.advanceBy(-1), /duration/);
  assert.throws(() => clock.advanceTo(Infinity), /backwards/);
  assert.throws(() => createClock(NaN), /initial/);
});
