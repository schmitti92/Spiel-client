// Run: node --test DealOrNoDeal/tests/hammer-bingo-premium.test.mjs
// Structural/asset regression checks for the premium Hammer-Bingo redesign.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'weihnachten.html'), 'utf8');
const css = readFileSync(resolve(root, 'css/christmas-hammer-premium.css'), 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const segment = (from, to) => {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a + from.length);
  assert.ok(a >= 0 && b > a, `Expected source region: ${from}`);
  return html.slice(a, b);
};

test('Hammer Bingo page references isolated premium CSS and script parses', () => {
  assert.match(html, /christmas-hammer-premium\.css\?v=/);
  assert.ok(css.length > 2500);
  assert.ok(inline.length > 1000);
  assert.doesNotThrow(() => new Script(inline, { filename: 'weihnachten.inline.js' }));
});

test('all fixed Hammer Bingo cards and existing premium images are present', () => {
  const match = html.match(/const hammerBingoArtwork=(\[[^;]+\]);/);
  assert.ok(match, 'Fixed card image catalog');
  const art = JSON.parse(match[1]);
  assert.equal(art.length, 32);
  assert.equal(new Set(art.map(([name]) => name)).size, 32);
  for (const [filename, name] of art) {
    assert.ok(typeof name === 'string' && name.length > 0);
    assert.ok(existsSync(resolve(root, 'Weihnachtsevent2/Weihnachtsbilder', filename)), filename);
  }
  for (const asset of [
    'assets/weihnachts_event/card-back-workshop.svg',
    'assets/weihnachts_event/card-back-winter.svg',
    'assets/weihnachts_event/08_wichtelwerkstatt.png',
    'assets/weihnachts_event/10_eisschloss.png',
    'assets/weihnachts_event/geschenk_gold.png',
    'Weihnachtsevent2/Weihnachtsbilder/hammer-einfach.webp',
    'Weihnachtsevent2/Weihnachtsbilder/hammer-doppel.webp',
    'Weihnachtsevent2/Weihnachtsbilder/hammer-glueck.webp',
  ]) assert.ok(existsSync(resolve(root, asset)), asset);
});

test('locked Hammer Bingo cards create no image and reveal only after ownership', () => {
  const preview = segment('function renderHammerCardPreviews()', 'renderHammerCardPreviews();');
  const render = segment('function renderHammerCollection(data)', 'function christmasCardImage(card)');
  assert.doesNotMatch(preview, /createElement\(['"]img['"]\)/);
  assert.doesNotMatch(preview, /img\.src\s*=/);
  assert.match(preview, /Noch nicht entdeckt/);
  assert.match(preview, /Gesperrte Sammelkarte/);
  assert.match(render, /if\(count>0&&entry&&!priorImage\)/);
  assert.match(render, /else if\(count<=0&&priorImage\)/);
  assert.match(render, /img\.loading=['"]lazy['"]/);
});

test('all existing reward lines and authoritative claim route remain intact', () => {
  const prizes = segment('const hammerPrizeBase=[', 'function formatHammerPrize(prize)');
  assert.equal((prizes.match(/\{[^{}]*\}/g) || []).length, 10, '4 rows + 4 cols + 2 diagonals');
  assert.match(html, /request\('POST','hammer\/claim'\)/);
  assert.match(html, /data\?\.hammerProgress/);
  for (const field of ['common', 'mixed']) {
    for (const section of ['board', 'rows', 'columns', 'diagonals', 'progress', 'cycles']) {
      const id = section === 'board' ? `hammer-board-${field}` : `hammer-${field}-${section}`;
      assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id);
    }
  }
  assert.match(html, /10 Einfach-Hammer/);
  assert.match(html, /10 Doppel-Hammer \+ ✨🔨 3 goldene Glückshammer/);
});

test('grid reward geometry and accessible motion preference are maintained', () => {
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.hammer-rewards-rows\s*\{[^}]*grid-column:2;grid-row:1/s);
  assert.match(css, /\.hammer-rewards-columns\s*\{[^}]*grid-column:1;grid-row:2/s);
  assert.match(css, /\.hammer-rewards-diagonals\s*\{[^}]*grid-column:1\/-1;grid-row:3/s);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
