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
    'broadcast-math-note', 'broadcast-trend', 'broadcast-odds', 'broadcast-odds-title', 'broadcast-odds-value', 'broadcast-odds-fill', 'broadcast-pressure-fill', 'broadcast-pressure-caption']) {
    ids.set(name, {
      isConnected: true, hidden: false, textContent: '', dataset: {}, style: {}, classList: makeClasses(),
      insertAdjacentElement() {}
    });
  }
  let insertions = 0, stinger = null;
  const stage = {querySelector: () => ({}), insertBefore() {insertions++}, append(el) {insertions++; if (el.id === 'broadcast-no-deal-stinger') stinger = el;}};
  const feed = {dataset: {}, append() {insertions++}};
  const callbacks = [], timers = [];
  const document = {
    hidden: false,
    body: {classList: makeClasses()},
    querySelector: key => key === '.case-stage' ? stage
      : key === '#banker-call .banker-call-portrait' ? feed : null,
    getElementById: id => ids.get(id) || null,
    createElement: () => ({
      innerHTML: '', hidden: false, isConnected: true, dataset: {}, classList: makeClasses(),
      setAttribute() {}
    }),
    addEventListener() {}
  };
  const context = { document, window: { setInterval: callback => callbacks.push(callback), setTimeout: callback => (timers.push(callback), timers.length), clearTimeout() {} },
    g: null, values: [100, 300, 500], eur: value => '€' + (value / 100).toFixed(2) };
  vm.runInNewContext(script, context, {timeout: 1000});
  assert.equal(insertions, 3, 'The stage strap, the nonblocking stinger and banker feed must be initialized');
  assert.equal(callbacks.length, 1);
  return {context, ids, classes, feed, stinger, timers, refresh: callbacks[0]};
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

test('banker quote presentation reacts to increased, reduced, and generous offers', () => {
  const {context, ids, feed, refresh} = makeFixture();
  context.g = {id:'offer', revision:1, phase:'decision', openedAmounts:[{case:1,amount:100}],
    offer:200, history:[{offer:100},{offer:200}]};
  refresh();
  assert.equal(ids.get('broadcast-trend').dataset.direction, 'up');
  assert.match(ids.get('broadcast-trend').textContent, /100 %/);
  assert.equal(feed.dataset.bankerMood, 'calculating');

  context.g = {...context.g, revision:2, offer:100, history:[{offer:200},{offer:100}]};
  refresh();
  assert.equal(ids.get('broadcast-trend').dataset.direction, 'down');
  assert.equal(feed.dataset.bankerMood, 'poker');

  context.g = {...context.g, revision:3, offer:400, history:[{offer:100},{offer:400}]};
  refresh();
  assert.equal(ids.get('broadcast-trend').dataset.direction, 'up');
  assert.equal(feed.dataset.bankerMood, 'generous');
});

test('unanimous No Deal produces one nonblocking TV stinger after public votes', () => {
  const {context, refresh, stinger, timers} = makeFixture();
  assert.equal(stinger.hidden, true);
  context.g = {id:'show', revision:1, phase:'decision', offer:200, openedAmounts:[],
    history:[{round:1,participants:['a','b'],decisions:[{id:'a'}]}]};
  refresh();
  assert.equal(stinger.hidden,true, 'No secret vote must be revealed early');

  context.g = {...context.g, revision:2, phase:'open', offer:null,
    history:[{round:1,participants:['a','b'],decisions:[{id:'a',deal:false},{id:'b',deal:false}]}]};
  refresh();
  assert.equal(stinger.hidden,false);
  assert.equal(timers.length,1);
  context.g = {...context.g, revision:3};
  refresh();
  assert.equal(timers.length,1, 'A round must never replay its stinger');
  timers[0]();
  assert.equal(stinger.hidden,true);

  context.g = {...context.g, revision:4, phase:'decision', offer:200,
    history:[{round:1,participants:['a','b'],decisions:[{id:'a',deal:false},{id:'b',deal:false}]},
      {round:2,participants:['a','b'],decisions:[{id:'a'}]}]};
  refresh();
  context.g = {...context.g, revision:5, phase:'open', offer:null,
    history:[context.g.history[0],{round:2,participants:['a','b'],
      decisions:[{id:'a',deal:true},{id:'b',deal:false}]}]};
  refresh();
  assert.equal(stinger.hidden,true, 'A Deal round must not show the No Deal celebration');
});

test('risk meter derives exact public probability and hides outside opening', () => {
  const {context, ids, refresh} = makeFixture();
  context.values = [100, 100000000, 500, 200000000];
  context.g = {id:'risk', revision:1, phase:'open', openedAmounts:[{case:0,amount:100}]};
  refresh();
  assert.equal(ids.get('broadcast-odds').hidden,false);
  assert.equal(ids.get('broadcast-odds-value').textContent,'66,7 %');
  assert.equal(ids.get('broadcast-odds-fill').style.width,'66.67%');
  assert.equal(ids.get('broadcast-odds').dataset.risk,'high');
  context.g = {...context.g, revision:2, phase:'decision', offer:200};
  refresh();
  assert.equal(ids.get('broadcast-odds').hidden,true);
  context.g = {...context.g, revision:3, phase:'open', openedAmounts:[{case:0,amount:100},{case:1,amount:100000000},{case:3,amount:200000000}]};
  refresh();
  assert.equal(ids.get('broadcast-odds-value').textContent,'0 %');
  assert.equal(ids.get('broadcast-odds').dataset.risk,'low');
});

test('offer-strength gauge clamps to its 200 percent scale without changing game state', () => {
  const {context, ids, refresh} = makeFixture();
  const game = {id:'pressure', revision:1, phase:'decision', offer:100,
    openedAmounts:[{case:0,amount:100}], history:[{round:1,offer:100}]};
  context.g = game;
  refresh();
  assert.equal(ids.get('broadcast-pressure-fill').style.width,'12.50%');
  assert.equal(ids.get('broadcast-pressure-fill').dataset.pressure,'low');
  assert.match(ids.get('broadcast-pressure-caption').textContent,/POKERT/);
  context.g = {...game, revision:2, offer:800};
  refresh();
  assert.equal(ids.get('broadcast-pressure-fill').style.width,'100.00%');
  assert.equal(ids.get('broadcast-pressure-fill').dataset.pressure,'high');
  assert.match(ids.get('broadcast-pressure-caption').textContent,/ERNST/);
  assert.equal(game.offer,100, 'The original game state must remain unchanged');
});
