import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Characterization tests: run the original V6 game script with a fake DOM,
// rather than testing a rewritten interpretation of its rules.
const html = readFileSync(new URL('../Minispiele/Zeitgefuehl_v6_Premium.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean);
const original = scripts.find(s => s.includes('function finish()') && s.includes('function begin()'));
assert.ok(original, 'Original V6 inline game script must be found');

function setup(random = () => 0) {
  const elements = new Map();
  const callbacks = [];
  let now = 0;
  let nextId = 0;
  class Element {
    constructor() {
      this.value = '0'; this.hidden = false; this.disabled = false;
      this.textContent = ''; this.innerHTML = ''; this.children = [];
      this.style = { setProperty() {} };
      this.classList = { add() {}, remove() {} };
    }
    append(...children) { this.children.push(...children); for (const child of children) if (child.id) elements.set(child.id, child); }
    querySelector(selector) {
      if (selector === 'button') return this.children.find(c => c.tag === 'button');
      return new Element();
    }
    querySelectorAll() { return [new Element(), new Element()]; }
    addEventListener(name, fn) { (this.events ??= {})[name] = fn; }
    setAttribute() {}
  }
  const document = {
    hidden: false,
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement(tag) { const el = new Element(); el.tag = tag; return el; },
    addEventListener() {}
  };
  const events = [];
  const window = { parent: null, dispatchEvent(e) { events.push(e); } };
  window.parent = window;
  const context = {
    document, window, Math: Object.assign(Object.create(Math), { random }),
    performance: { now: () => now },
    setTimeout(fn, ms) { const id = ++nextId; callbacks.push({ id, at: now + ms, fn }); return id; },
    clearTimeout(id) { const i = callbacks.findIndex(c => c.id === id); if (i >= 0) callbacks.splice(i, 1); },
    requestAnimationFrame() { return ++nextId; },
    cancelAnimationFrame() {},
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    console
  };
  vm.runInNewContext(original, context, { timeout: 2000 });
  const get = id => document.getElementById(id);
  function advance(to) {
    assert.ok(to >= now, 'time cannot run backwards');
    while (true) {
      callbacks.sort((a, b) => a.at - b.at || a.id - b.id);
      if (!callbacks.length || callbacks[0].at > to) break;
      const task = callbacks.shift(); now = task.at; task.fn();
    }
    now = to;
  }
  function start(humans, bots = 0) {
    get('humans').value = String(humans); get('bots').value = String(bots);
    get('start').events.click();
    advance(3000);
  }
  function stop(index) {
    const button = get('p' + index).querySelector('button');
    assert.ok(button, 'player button exists');
    button.events.click();
  }
  return { get, start, stop, advance, events, window };
}

test('goal is 10 seconds at lower random bound', () => {
  const g = setup(() => 0); g.start(1); assert.match(g.get('target').textContent, /10,00/);
});
test('goal is 20 seconds at upper random bound', () => {
  const g = setup(() => 0.999999); g.start(1); assert.match(g.get('target').textContent, /20,00/);
});
test('time display conceals at 3 seconds while elapsed measurement continues', () => {
  const g = setup(); g.start(1); g.advance(6000);
  assert.equal(g.get('digits').textContent, '?');
  g.advance(13000); g.stop(0);
  assert.equal(g.window.zeitgefuehlResult.results[0].elapsedMs, 10000);
});
test('one stop per human, finishing once all players stopped', () => {
  const g = setup(); g.start(2); g.advance(13000); g.stop(0); g.stop(0);
  assert.equal(g.window.zeitgefuehlResult, undefined);
  g.advance(14000); g.stop(1);
  assert.equal(g.window.zeitgefuehlResult.results.length, 2);
  assert.equal(g.events.filter(e => e.type === 'zeitgefuehl:finished').length, 1);
});
test('30 second timeout completes round', () => {
  const g = setup(); g.start(1); g.advance(33000);
  assert.equal(g.window.zeitgefuehlResult.results[0].elapsedMs, 30000);
  assert.equal(g.window.zeitgefuehlResult.results[0].timedOut, true);
});
test('closer stop wins and result ranks match V6', () => {
  const g = setup(); g.start(2); g.advance(12500); g.stop(0);
  g.advance(13000); g.stop(1);
  const r = g.window.zeitgefuehlResult.results;
  assert.equal(r[0].playerId, 2);
  assert.equal(r[0].rank, 1);
  assert.equal(r[1].rank, 2);
});
test('deviation below five milliseconds counts as shared winner', () => {
  const g = setup(); g.start(2); g.advance(13000); g.stop(0);
  g.advance(13004); g.stop(1);
  assert.deepEqual(Array.from(g.window.zeitgefuehlResult.results, x => x.rank), [1, 1]);
});
test('bots use the same stop and results pipeline', () => {
  const g = setup(() => 0.5); g.start(1, 1); g.advance(15000); g.stop(0);
  const r = g.window.zeitgefuehlResult.results;
  assert.equal(r.length, 2);
  assert.equal(r.some(x => x.isComputer), true);
});
test('four participants supported', () => {
  const g = setup(); g.start(4); g.advance(13000);
  for (let i = 0; i < 4; i++) g.stop(i);
  assert.equal(g.window.zeitgefuehlResult.results.length, 4);
});
