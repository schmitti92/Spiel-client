// Run: node --test DealOrNoDeal/tests/assets.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'game.html'), 'utf8');
const css = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="(\.\/css\/[^"]+)"/g)].map(m => m[1]);
const js = [...html.matchAll(/<script\s+src="(\.\/js\/[^"]+)"\s*><\/script>/g)].map(m => m[1]);
const expectedCss = ['foundation', 'studio', 'cases', 'banker', 'avatars', 'effects'].map(n => './css/' + n + '.css');
const expectedJs = ['core', 'cases', 'banker', 'finale', 'scenes', 'avatars', 'app'].map(n => './js/' + n + '.js');

test('HTML includes all assets exactly once and in stable order', () => {
  assert.deepEqual(css, expectedCss);
  assert.deepEqual(js, expectedJs);
  assert.ok(html.indexOf('profile-auth.js') < html.indexOf('./js/core.js'));
  assert.ok(!/<style\b/i.test(html));
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html));
});
test('all referenced local assets exist', () => {
  for (const path of [...css, ...js]) assert.ok(existsSync(resolve(root, path)), path);
});
test('all game JavaScript files parse as classic scripts', () => {
  for (const path of js) {
    const absolute = resolve(root, path);
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', absolute], { stdio: 'pipe' }), path);
  }
});
test('CSS sections are balanced and nonempty', () => {
  for (const path of css) {
    const source = readFileSync(resolve(root, path), 'utf8');
    assert.ok(source.trim().length > 0, path);
    // Each split ends at a top-level CSS rule boundary.
    let depth = 0, comment = false, quote = '', escaped = false;
    for (let i = 0; i < source.length; i++) {
      const c = source[i], n = source[i + 1];
      if (comment) { if (c === '*' && n === '/') { comment = false; i++; } continue; }
      if (quote) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) quote = ''; continue; }
      if (c === '/' && n === '*') { comment = true; i++; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '{') depth++;
      if (c === '}') { depth--; assert.ok(depth >= 0, path); }
    }
    assert.equal(depth, 0, path);
    assert.equal(comment, false, path);
  }
});

test('CSS image URLs resolve relative to extracted CSS files', () => {
  for (const path of css) {
    const source = readFileSync(resolve(root, path), 'utf8');
    const urls = [...source.matchAll(/url\\(\\s*(['"]?)(.*?)\\1\\s*\\)/gi)].map(m => m[2].trim());
    for (const url of urls) {
      if (/^(?:data:|https?:|#|\\/)/i.test(url)) continue;
      const target = url.split(/[?#]/)[0];
      assert.ok(existsSync(resolve(root, 'css', target)), `${path}: broken CSS image URL ${url}`);
    }
  }
});

test('static DOM references point to real HTML elements', () => {
  const ids = new Set([...html.matchAll(/\\bid="([^"]+)"/g)].map(m => m[1]));
  const source = js.map(path => readFileSync(resolve(root, path), 'utf8')).join('\\n');
  for (const match of source.matchAll(/\\$\\('([^']+)'\\)(\\?\\.)?/g)) {
    // Optional chaining intentionally supports elements created later by scripts.
    if (match[2]) continue;
    assert.ok(ids.has(match[1]), `Missing HTML id: ${match[1]}`);
  }
});

test('game scripts contain exactly one copy of each declared function', () => {
  const names = new Map();
  for (const path of js) {
    const source = readFileSync(resolve(root, path), 'utf8');
    for (const match of source.matchAll(/(?:^|\\n)(?:async )?function\\s+([A-Za-z_$][\\w$]*)/g)) {
      const name = match[1];
      assert.ok(!names.has(name), `Duplicate function ${name} in ${path} and ${names.get(name)}`);
      names.set(name, path);
    }
  }
  for (const required of ['makeCase', 'directorReveal', 'bankerPhrase', 'updateBankerCall', 'startFinaleCinema', 'announceScene', 'showCandidateCutaway', 'render', 'poll']) {
    assert.ok(names.has(required), `Missing game function: ${required}`);
  }
});
