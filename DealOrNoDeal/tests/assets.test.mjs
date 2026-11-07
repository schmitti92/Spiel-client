// Run: node --test DealOrNoDeal/tests/assets.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'game.html'), 'utf8');
const css = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="(\.\/css\/[^"]+)"/g)].map(m => m[1].split('?')[0]);
const js = [...html.matchAll(/<script\s+src="(\.\/js\/[^"]+)"\s*><\/script>/g)].map(m => m[1].split('?')[0]);
const expectedCss = ['foundation', 'studio', 'cases', 'banker', 'avatars', 'effects', 'deluxe-director', 'broadcast', 'christmas-studio', 'christmas-gifts', 'commentary', 'banker-stage'].map(n => './css/' + n + '.css');
const expectedJs = ['core', 'cases', 'banker', 'finale', 'scenes', 'avatars', 'commentary-lines', 'commentary', 'app', 'deluxe-director', 'broadcast', 'christmas-themes'].map(n => './js/' + n + '.js');

test('HTML assets are complete, unique, and loaded in the intended order', () => {
  assert.deepEqual(css, expectedCss);
  assert.deepEqual(js, expectedJs);
  assert.equal(new Set([...css, ...js]).size, css.length + js.length);
  assert.ok(html.indexOf('profile-auth.js') < html.indexOf('./js/core.js'));
  assert.ok(!/<style\b/i.test(html));
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html));
});
test('all referenced local CSS and JS assets exist', () => {
  for (const path of [...css, ...js]) assert.ok(existsSync(resolve(root, path)), path);
});
test('all game JS assets parse as classic scripts', () => {
  for (const path of js) assert.doesNotThrow(() =>
    execFileSync(process.execPath, ['--check', resolve(root, path)], {stdio: 'pipe'}), path);
});
test('CSS rules are balanced and nonempty', () => {
  for (const path of css) {
    const source = readFileSync(resolve(root, path), 'utf8');
    assert.ok(source.trim().length > 0, path);
    let depth = 0, comment = false, quote = '', escaped = false;
    for (let i = 0; i < source.length; i++) {
      const c = source[i], n = source[i + 1];
      if (comment) { if (c === '*' && n === '/') { comment = false; i++; } continue; }
      if (quote) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === quote) quote = '';
        continue;
      }
      if (c === '/' && n === '*') { comment = true; i++; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '{') depth++;
      if (c === '}') { depth--; assert.ok(depth >= 0, path); }
    }
    assert.equal(depth, 0, path);
    assert.equal(comment, false, path);
  }
});
test('CSS image paths resolve relative to CSS files', () => {
  for (const path of css) {
    const source = readFileSync(resolve(root, path), 'utf8');
    for (const match of source.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
      const target = match[2].trim().split(/[?#]/)[0];
      if (/^(?:data:|https?:|#|\/)/i.test(target)) continue;
      assert.ok(existsSync(resolve(root, 'css', target)), path + ': missing ' + target);
    }
  }
});
test('DOM lookups refer to declared or dynamically created IDs', () => {
  const source = js.map(path => readFileSync(resolve(root, path), 'utf8')).join('\n');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g), ...source.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const match of source.matchAll(/\$\('([^']+)'\)(\?\.)?/g)) {
    if (!match[2]) assert.ok(ids.has(match[1]), 'Missing DOM id: ' + match[1]);
  }
});
test('game functions are not accidentally duplicated', () => {
  const names = new Map();
  for (const path of js) {
    const source = readFileSync(resolve(root, path), 'utf8');
    for (const match of source.matchAll(/(?:^|\n)(?:async )?function\s+([A-Za-z_$][\w$]*)/g)) {
      assert.ok(!names.has(match[1]), 'Duplicate ' + match[1] + ' in ' + path);
      names.set(match[1], path);
    }
  }
  for (const fn of ['makeCase', 'directorReveal', 'bankerPhrase', 'updateBankerCall',
    'startFinaleCinema', 'announceScene', 'studioCommentObserve', 'render', 'poll']) {
    assert.ok(names.has(fn), 'Missing function ' + fn);
  }
});
test('all local HTML source assets exist (including cache-busted paths)', () => {
  const links = [...html.matchAll(/<(?:script|img|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)]
    .map(m => m[1]).filter(v => !/^(?:https?:|data:|#|\/)/i.test(v));
  for (const link of links) assert.ok(existsSync(resolve(root, link.split('?')[0])), 'Missing asset ' + link);
});
test('only app.js triggers polling, and all scripts use strict mode', () => {
  assert.ok(js.includes('./js/app.js'));
  for (const path of js) {
    const source = readFileSync(resolve(root, path), 'utf8');
    assert.ok(source.trimStart().startsWith("'use strict';"), 'Strict mode missing: ' + path);
    if (path === './js/app.js') assert.ok(source.includes('poll();'), 'App must start polling');
    else assert.ok(!/(?:^|[;{}\n])\s*poll\(\)\s*;/.test(source), 'Unexpected top-level polling in ' + path);
  }
});
test('decorative broadcast scripts are read-only and never expose secret assignments', () => {
  for (const name of ['deluxe-director', 'broadcast']) {
    const source = readFileSync(resolve(root, 'js', name + '.js'), 'utf8');
    assert.doesNotMatch(source, /\/api\/deal-or-no-deal|request\s*\(\s*['"]POST['"]|action\s*\(\s*['"]/);
    assert.doesNotMatch(source, /\.finalValues|\.values\s*\[/);
  }
});

// Character portraits are now the sole commentary overlay; all six expressions must be available.
test('Stromberg expressions exist and the duplicate candidate overlay is absent', () => {
 for (const name of ['selbstzufrieden','genervt','wuetend','ueberrascht','nachdenklich','scheinheilig']) {
  assert.ok(existsSync(resolve(root,'assets','stromberg-'+name+'.png')),name);
 }
 assert.doesNotMatch(html,/id="candidate-cutaway"/);
 const cases=readFileSync(resolve(root,'js/cases.js'),'utf8');
 assert.ok(!cases.includes('showCandidateCutaway('),'Legacy cutaway call must be removed');
});

test('banker decision commentary stays visible and preserves case reactions', () => {
 const style=readFileSync(resolve(root,'css/commentary.css'),'utf8');
 const comments=readFileSync(resolve(root,'js/commentary.js'),'utf8');
 const core=readFileSync(resolve(root,'js/core.js'),'utf8');
 assert.match(style,/body:has\(#banker-call:not\(\[hidden\]\)\) \.studio-commentary:not\(\[hidden\]\)/);
 assert.match(style,/z-index:36!important/);
 assert.match(comments,/setTimeout\(studioCommentRender,5500\)/);
 assert.match(comments,/state\.queue\.unshift\(item\)/);
 assert.match(comments,/if\(state\.current\)state\.queue\.unshift\(state\.current\)/);
 assert.match(comments,/function studioCommentDecision\(deal,game\)/);
 assert.match(core,/type==='decide'&&typeof studioCommentDecision==='function'/);
});

test('final banker offer has non-overlapping tracks and no duplicate amount', () => {
 const css=readFileSync(resolve(root,'css/broadcast.css'),'utf8');
 assert.match(css,/grid-row:7!important;position:relative!important/);
 assert.match(css,/grid-row:9!important/);
 assert.match(css,/grid-row:10!important/);
 assert.match(css,/\.banker-call-card:has\(\.final-choice-compare:not\(\[hidden\]\)\) \.banker-call-amount/);
 assert.match(css,/\.broadcast-offer-math\{display:none!important\}/);
});

test('banker stage is opaque and loaded after legacy broadcast CSS', () => {
 const html=readFileSync(resolve(root,'game.html'),'utf8');
 const css=readFileSync(resolve(root,'css/banker-stage.css'),'utf8');
 assert.ok(html.indexOf('banker-stage.css?v=2')>html.indexOf('broadcast.css?'));
 assert.match(css,/background:#061328!important/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(css,/\.banker-call-card:has\(\.final-choice-compare:not\(\[hidden\]\)\) \.banker-call-amount/);
 assert.match(css,/\.banker-money-board\{grid-row:2\/13!important\}/);
});

test('rebuilt banker always displays a calculated offer quality gauge', () => {
 const html=readFileSync(resolve(root,'game.html'),'utf8');
 const css=readFileSync(resolve(root,'css/banker-stage.css'),'utf8');
 const js=readFileSync(resolve(root,'js/banker.js'),'utf8');
 assert.match(html,/id="banker-offer-quality"/);
 assert.match(html,/id="banker-offer-quality-fill"/);
 assert.match(js,/h\.offer\/average\*100/);
 assert.match(js,/values\.filter\(amount=>!removed\.has\(amount\)\)/);
 assert.match(css,/\.banker-offer-quality\[hidden\]\{display:none!important\}/);
});

test('opened-case reactions use the correct euro-cent boundaries', async () => {
 const vm=await import('node:vm');
 const script=readFileSync(resolve(root,'js/commentary.js'),'utf8');
 const context=vm.createContext({setTimeout,clearTimeout});
 vm.runInContext(script,context);
 const classify=value=>vm.runInContext('studioCaseReaction('+value+')',context);
 assert.equal(classify(0),'good');
 assert.equal(classify(99),'good');
 assert.equal(classify(9999),'good');
 assert.equal(classify(10000),'neutral');
 assert.equal(classify(2000000),'neutral');
 assert.equal(classify(2000001),'bad');
 assert.equal(classify(100000000),'bad');
 const commentary=readFileSync(resolve(root,'js/commentary.js'),'utf8');
 assert.ok(!commentary.includes('previous.good!==good'));
 assert.match(commentary,/amount\/100\)\.toLocaleString/);
 const lines=readFileSync(resolve(root,'js/commentary-lines.js'),'utf8');
 for(const avatar of [2,3,4,5,7])assert.ok(lines.includes(avatar+':{name:'));
 assert.match(lines,/neutral:/);
});

test('Stromberg has 20 additional exclusive million-loss reactions', async () => {
 const vm=await import('node:vm');
 const src=readFileSync(resolve(root,'commentary/stromberg.js'),'utf8');
 const context=vm.createContext({});
 vm.runInContext(src+';globalThis.__million=strombergCatalogue.millionLost',context);
 assert.ok(context.__million.length>=31);
 const logic=readFileSync(resolve(root,'js/commentary.js'),'utf8');
 assert.match(logic,/category==='millionLost'\)\{priority=3;line=studioCommentPick\(1,'millionLost'/);
});

test('every avatar has exclusive million lines and no generic fallback', async () => {
 const vm=await import('node:vm');
 const catalogue=readFileSync(resolve(root,'commentary/stromberg.js'),'utf8');
 const lines=readFileSync(resolve(root,'js/commentary-lines.js'),'utf8');
 const context=vm.createContext({});
 vm.runInContext(catalogue+'\n'+lines+'\n;globalThis.pool=studioCommentLines',context);
 for(const id of [1,2,3,4,5,7]){
  const pool=context.pool[id].millionLost;
  assert.ok(pool.length>=4,'missing million-only dialogue for avatar '+id);
  assert.equal(new Set(pool).size,pool.length,'duplicate million dialogue for avatar '+id);
 }
 const logic=readFileSync(resolve(root,'js/commentary.js'),'utf8');
 assert.match(logic,/const millionCase=amount>=100000000/);
 assert.match(logic,/if\(millionCase\)\{/);
 assert.match(logic,/line=studioCommentPick\(speakerAvatar,'millionLost'/);
});

test('one-cent reactions are exclusive for every character', async () => {
 const vm=await import('node:vm');
 const catalogue=readFileSync(resolve(root,'commentary/stromberg.js'),'utf8');
 const lines=readFileSync(resolve(root,'js/commentary-lines.js'),'utf8');
 const context=vm.createContext({});
 vm.runInContext(catalogue+'\n'+lines+'\n;globalThis.pool=studioCommentLines',context);
 for(const id of [1,2,3,4,5,7]){
  const pool=context.pool[id].oneCent;
  assert.ok(pool.length>=3,'missing one-cent lines for '+id);
  assert.equal(new Set(pool).size,pool.length,'duplicate one-cent dialogue for avatar '+id);
 }
 const logic=readFileSync(resolve(root,'js/commentary.js'),'utf8');
 assert.match(logic,/const oneCentCase=amount===1/);
 assert.match(logic,/if\(oneCentCase\)\{/);
 assert.match(logic,/line=studioCommentPick\(speakerAvatar,'oneCent'/);
});

test('expanded character pools provide varied situation-specific dialogue', async () => {
 const vm=await import('node:vm');
 const context=vm.createContext({});
 vm.runInContext(readFileSync(resolve(root,'commentary/stromberg.js'),'utf8')+'\n'+readFileSync(resolve(root,'js/commentary-lines.js'),'utf8')+'\n;globalThis.pools=studioCommentLines',context);
 for(const id of [2,3,4,5,7]){
  for(const category of ['oneCent','small','neutral','large','millionLost']){
   const pool=context.pools[id][category];
   assert.ok(pool.length>=5,'not enough '+category+' reactions for avatar '+id);
   assert.equal(new Set(pool).size,pool.length,'duplicate '+category+' lines for avatar '+id);
  }
 }
});

test('situational dialogue triggers without overriding one-cent or million events', async () => {
 const vm=await import('node:vm');
 const context=vm.createContext({});
 vm.runInContext(readFileSync(resolve(root,'commentary/stromberg.js'),'utf8')+'\n;globalThis.c=strombergCatalogue',context);
 for(const category of ['finalCases','bigLossStreak','bankerVeryGood','bankerVeryBad']){
  const pool=context.c[category];
  assert.ok(pool.length>=6,category+' needs six lines');
  assert.equal(new Set(pool).size,pool.length,'duplicates in '+category);
 }
 const logic=readFileSync(resolve(root,'js/commentary.js'),'utf8');
 assert.match(logic,/ratio>=1\.1\?'bankerVeryGood'/);
 assert.match(logic,/ratio<=\.35\?'bankerVeryBad'/);
 assert.match(logic,/story\.bad>=2/);
 assert.match(logic,/casesLeft<=3/);
 assert.ok(logic.indexOf("category==='millionLost'")<logic.indexOf('story.bad>=2'));
});
