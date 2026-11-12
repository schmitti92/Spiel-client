import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('dog-boss10.html');
const css=read('dog-boss-cinematic.css');
const backdrop=read('dog-boss-art/arena-volcano-cinematic.svg');
const crest=read('dog-boss-art/arena-rune-crest.svg');
const cinematicCharacters=['aschewaechter','held-krieger','held-magier','held-schildtraeger']
 .map(name=>read('dog-boss-art/'+name+'-cinematic.svg'));

test('Tor 10 loads the single V3 visual layer after the functional minigame CSS',()=>{
 const live=html.indexOf('dog-boss-live.css'),art=html.indexOf('dog-boss-battle-v3.css');
 assert.ok(live>=0&&art>live,'V3 must own the final battle design');
 assert.match(html,/rel="preload" as="image" href="\.\/dog-boss-art\/arena-volcano-cinematic\.svg"/);
 const active=read('dog-boss-battle-v3.css');
 assert.match(active,/arena-volcano-cinematic\.svg/);
 assert.match(active,/aschewaechter-battle-v3\.webp/);
 assert.doesNotMatch(html,/href="\.\/dog-boss-cinematic\.css/);
});
test('original SVG assets are standalone, scalable and self-contained',()=>{
 for(const source of [backdrop,crest,...cinematicCharacters]){
  assert.match(source,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(source,/viewBox="0 0 /);
  assert.match(source,/<\/svg>\s*$/);
  assert.ok(!source.includes('<script') && !source.includes('href="http') && !source.includes("href='http"), 'no remote image or script resources');
 }
});
test('battle logic, clock and interaction elements stay in place',()=>{
 for(const id of ['arena','combat-scene','combat-hero-line','mini-game','live-cinematic',
  'live-shield-fill','live-hp-fill','timer','live-round-steps','cinematic-bonus','cinematic-cumulative']){
  assert.ok(html.includes('id="'+id+'"'),'missing gameplay element '+id);
 }
 for(const script of ['dog-boss-mini-ui.js','dog-boss-combat-fx.js',
  'dog-boss-live-ui.js','dog-boss10.js']){
  assert.ok(html.includes(script),'missing gameplay module '+script);
 }
 assert.doesNotMatch(css,/\bfetch\s*\(|XMLHttpRequest|@import|https?:\/\//i);
});
test('art has keyboard focus, mobile layouts and reduced motion support',()=>{
 assert.match(css,/\.mini-choice:focus-visible/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('boss 10 alone uses cinematic character files; remaining gates keep originals',()=>{
 const fx=read('dog-boss-combat-fx.js'),briefing=read('dog-boss-preflight.js');
 assert.ok(fx.includes("10:'aschewaechter-cinematic.svg'"));
 assert.ok(fx.includes('(gate===10?cinematicHeroPortraits:heroPortraits)'));
 assert.ok(briefing.includes('(gate===10?cinematicRolePortraits:rolePortraits)'));
 for(const name of ['aschewaechter','held-krieger','held-magier','held-schildtraeger']){
  assert.ok(fx.includes(name+'-cinematic.svg')||briefing.includes(name+'-cinematic.svg'));
 }
});

test('selected full-body artwork is embedded in the new isolated battle view',()=>{
 const active=read('dog-boss-battle-v3.css');
 const group=read('dog-group-boss.html');
 const fx=read('dog-boss-combat-fx.js');
 for(const page of [html,group]){
  assert.match(page,/dog-boss-battle-v3\.css\?v=/);
  assert.doesNotMatch(page,/href="\.\/dog-boss-real-heroes\.css/);
  assert.match(page,/data-arena-design="v3"/);
 }
 const sprite=active.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
 assert.ok(sprite,'existing approved heroes must be bundled in V3');
 const data=Buffer.from(sprite[1],'base64');
 assert.ok(data.length>30000);
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 for(const type of ['krieger','magierin','waechter'])
  assert.ok(active.includes('data-hero-class="'+type+'"'));
 assert.ok(fx.includes('heroClasses.includes(heroClass)?heroClasses.indexOf(heroClass):roleIndex'));
 assert.ok(fx.includes('membersByUid.get(m.uid)?.heroClass'));
});
