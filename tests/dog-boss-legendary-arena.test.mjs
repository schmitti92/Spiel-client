import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('dog-boss-battle-v3.css');
const pages=['dog-boss10.html','dog-group-boss.html'];
test('isolated V3 art and controls load after functional minigame CSS for every group boss',()=>{
 for(const page of pages){
  const html=read(page);
  assert.match(html,/<section class="arena arena-live" id="arena" data-arena-design="v3"/);
  const v3=html.indexOf('dog-boss-battle-v3.css');
  for(const old of ['dog-boss-live.css','dog-boss-color-target.css',
   'dog-boss-reaction-precision.css','dog-boss-show-14.css',
   'dog-boss-dodge-slow.css','dog-boss-math-endgame.css'])
   assert.ok(html.indexOf(old)>0&&html.indexOf(old)<v3,'V3 must load last: '+old);
  for(const removed of ['dog-boss-cinematic.css','dog-boss-legendary-arena.css',
   'dog-boss-compact-arena.css','dog-boss-real-heroes.css'])
   assert.doesNotMatch(html,new RegExp('href="\\./'+removed.replaceAll('.','\\.')+'\\?'));
  for(const id of ['boss-hp','live-hp-fill','live-boss-hp-track','live-shield-value',
   'live-shield-fill','live-group-hp-track','timer','timer-fill',
   'mini-game','live-round-steps','live-stage-announcement','combat-boss',
   'combat-hero-line','combat-camera','combat-fx','live-cinematic','v3-actor-action',
   'live-recent-damage']){
    assert.match(html,new RegExp('id="'+id+'"'),page+' must retain '+id);
  }
  assert.match(html,/class="combat-arena-aura"/);
  assert.match(html,/class="combat-team-aegis"/);
  assert.match(html,/135 Sekunden/);
 }
});
test('true boss and individual party HP are always sourced from the server',()=>{
 const live=read('dog-boss-live-ui.js'),client=read('dog-boss10.js');
 assert.match(live,/view\?\.bossLiveHp/);
 assert.match(live,/view\?\.teamHealth/);
 assert.match(live,/nodes\.hpFill\)nodes\.hpFill\.style\.width/);
 assert.match(live,/nodes\.shieldFill\)nodes\.shieldFill\.style\.width/);
 assert.match(client,/DogBossLiveUI/);
 assert.doesNotMatch(css,/\b(fetch|XMLHttpRequest|setInterval|Date\.now)\s*\(/);
 assert.doesNotMatch(css,/@import|https?:\/\//);
});
test('real full-size Magma Aschewächter, hero atlas and right-side minigame have one dedicated layout',()=>{
 for(const selector of ['.live-metrics','.live-hp','.live-team-shield','.live-timer',
  '.live-vital-crest','.live-hp-track','.live-shield-track','.combat-scene',
  '.combat-boss','.combat-hero-line','.live-challenge','.mini-color-target',
  '.mini-dodge-lane','.mini-choice','.live-challenge-content','.v3-compat'])
  assert.ok(css.includes(selector),'missing V3 selector '+selector);
 assert.match(css,/aschewaechter-battle-v3\.webp/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.75fr\) minmax\(320px,\.98fr\)/);
 assert.match(css,/arena-volcano-cinematic\.svg/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/touch-action:manipulation/);
});
test('UI effects and legacy compatibility are visual only, never block minigame taps',()=>{
 assert.match(css,/\.v3-impact-flare\{[\s\S]*?pointer-events:none/);
 assert.match(css,/\.v3-compat\{display:none!important\}/);
 const group=read('dog-group-boss.html');
 assert.match(group,/id="group-kicker"/);
 assert.match(group,/dog-group-boss\.js/);
});
