import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('dog-boss-legendary-arena.css');
const pages=['dog-boss10.html','dog-group-boss.html'];

test('premium arena visual layer loads last in Boss 10 and every later group boss',()=>{
 for(const page of pages){
  const html=read(page);
  assert.match(html,/<section class="arena arena-live" id="arena" data-arena-design="legendary"/);
  assert.match(html,/dog-boss-legendary-arena\.css\?v=20261112-legendary-v2/);
  const premium=html.indexOf('dog-boss-legendary-arena.css');
  for(const old of ['dog-boss-live.css','dog-boss-color-target.css','dog-boss-reaction-precision.css',
   'dog-boss-show-14.css','dog-boss-dodge-slow.css','dog-boss-math-endgame.css'])
   assert.ok(html.indexOf(old)>0&&html.indexOf(old)<premium,'visual overrides load last '+old);
  assert.match(html,/<span class="live-vital-crest boss-crest" aria-hidden="true">/);
  assert.match(html,/<span class="live-vital-crest team-crest" aria-hidden="true">/);
  assert.match(html,/<span class="live-vital-crest time-crest" aria-hidden="true">/);
  for(const id of ['boss-hp','live-hp-fill','live-boss-hp-track','live-shield-value',
   'live-shield-fill','live-group-hp-track','timer','timer-fill',
   'mini-game','live-round-steps','live-stage-announcement','combat-boss',
   'combat-hero-line','combat-camera','combat-fx','live-cinematic']){
   assert.match(html,new RegExp('id="'+id+'"'),id+' still linked to server data');
  }
  assert.match(html,/class="combat-arena-aura"/);
  assert.match(html,/class="combat-team-aegis"/);
  assert.match(html,/101 Sekunden/);
 }
});
test('boss and team HP remain different server-fed tracks, not fictitious displayed values',()=>{
 const liveUI=read('dog-boss-live-ui.js'),client=read('dog-boss10.js');
 assert.match(liveUI,/view\?\.bossLiveHp/);
 assert.match(liveUI,/view\?\.teamHealth/);
 assert.match(liveUI,/nodes\.hpFill\)nodes\.hpFill\.style\.width/);
 assert.match(liveUI,/nodes\.shieldFill\)nodes\.shieldFill\.style\.width/);
 assert.match(client,/DogBossLiveUI/);
 assert.doesNotMatch(css,/\b(fetch|XMLHttpRequest|setInterval|Date\.now)\s*\(/);
 assert.doesNotMatch(css,/@import|https?:\/\//);
});
test('gold, fire and shield HUD plus playfield and four-phase panels have dedicated styling',()=>{
 for(const selector of ['.live-metrics','.live-hp','.live-team-shield','.live-timer',
  '.live-vital-crest','.boss-crest','.team-crest','.time-crest','.live-hp-track',
  '.live-shield-track','.combat-scene','.combat-arena-aura','.combat-team-aegis',
  '.combat-boss','.combat-hero-line','.live-challenge','.mini-color-target',
  '.mini-dodge-lane.mini-danger','.mini-dodge-lane.mini-safe',
  '.mini-reaction','.live-round-step.is-current','.live-cinematic-panel',
  '.live-cinematic-score','.preflight-title','.preflight-hp-rail'])
  assert.ok(css.includes(selector),'missing design selector '+selector);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/url\("\.\/dog-boss-art\/arena-volcano-cinematic\.svg"\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/max-height:700px/);
 assert.match(css,/touch-action:manipulation|mini-choice:focus-visible/);
});
test('decorative shield and crests cannot block taps or escape the arena styling scope',()=>{
 assert.match(css,/\.combat-team-aegis\{[\s\S]*?pointer-events:none/);
 assert.match(css,/\.live-vital-crest\{[\s\S]*?pointer-events:none/);
 assert.match(css,/\.mini-choice:focus-visible/);
 const group=read('dog-group-boss.html');
 assert.match(group,/id="group-kicker"/);
 assert.match(group,/dog-group-boss\.js/);
});
