// Runtime smoke checks for the optional Goldstudio TV layer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = readFileSync(resolve(root, 'js/broadcast.js'), 'utf8');

function makeFixture() {
  const classes = new Set();
  const makeClasses = () => ({
    add: n => classes.add(n),
    remove: n => classes.delete(n),
    toggle: (n, yes) => { if (yes) classes.add(n); else classes.delete(n); }
  });
  const ids = new Map();
  for (const name of ['banker-call', 'banker-call-sub', 'broadcast-ticker',
    'broadcast-stakes', 'broadcast-math-average', 'broadcast-math-ratio',
    'broadcast-math-note']) {
    ids.set(name, {
      isConnected: true, hidden: false, textContent: '', classList: makeClasses(),
      insertAdjacentElement() {}
    });
  }
  let insertions = 0;
  const stage = {querySelector: () => ({}), insertBefore() {insertions++}};
  const feed = {append() {insertions++}};
  const callbacks = [];
  const document = {
    hidden: false,
    body: {classList: makeClasses()},
    querySelector: key => key === '.case-stage' ? stage
      : key === '#banker-call .banker-call-portrait' ? feed : null,
    getElementById: id => ids.get(id) || null,
    createElement: () => ({
      innerHTML: '', hidden: false, isConnected: true, classList: makeClasses(),
      setAttribute() {}
    }),
    addEventListener() {}
  };
  const context = { document, window: { setInterval: callback => callbacks.push(callback) },
    g: null, values: [100, 300, 500], eur: value => '€' + (value / 100).toFixed(2) };
  vm.runInNewContext(script, context, {timeout: 1000});
  assert.equal(insertions, 2, 'The stage strap and the banker feed must be initialized');
  assert.equal(callbacks.length, 1);
  return {context, ids, classes, refresh: callbacks[0]};
}

test('the banker comparison uses public remaining amounts and respects the phase', () => {
  const {context, ids, classes, refresh} = makeFixture();
  context.g = { id:'abc', revision:1, phase:'open', openedAmounts:[{case:4,amount:100}], offer:null };
  refresh();
  assert.equal(ids.get('broadcast-offer-math'), undefined); // Overlay is owned by the fixture's createElement.
  assert.equal(ids.get('broadcast-stakes').textContent, '★ TOP €5.00');
  context.g = { ...context.g, revision:2, phase:'decision', offer:200 };
  refresh();
  assert.equal(ids.get('broadcast-math-average').textContent, '€4.00');
  assert.equal(ids.get('broadcast-math-ratio').textContent, '50 %');
  assert.match(ids.get('broadcast-math-note').textContent, /2 unbekannte Beträge/);
  assert.equal(classes.has('broadcast-bank-live'), true);
  context.g = { ...context.g, revision:3, phase:'open', offer:null };
  refresh();
  assert.equal(classes.has('broadcast-bank-live'), false);
});
test('hidden case assignments never enter the broadcast copy', () => {
  const {context, ids, refresh} = makeFixture();
  context.g = { id:'private', revision:1, phase:'open', offer:null,
    openedAmounts:[{case:2,amount:100}],
    players:[{id:'p1',case:0}], finalValues:null };
  refresh();
  const copy = [ids.get('broadcast-ticker').textContent,ids.get('broadcast-stakes').textContent].join(' ');
  assert.doesNotMatch(copy, /Koffer 1|case 0|case 2/);
  assert.match(copy, /Noch|Koffer|Goldstudio|Millionen|entscheidet/i);
});
