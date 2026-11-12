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

test('Tor 10 uses local cinematic styling after functional battle styling',()=>{
 const live=html.indexOf('dog-boss-live.css'),art=html.indexOf('dog-boss-cinematic.css');
 assert.ok(live>=0 && art>live,'the cinematic layer must override the existing live CSS');
 assert.match(html,/rel="preload" as="image" href="\.\/dog-boss-art\/arena-volcano-cinematic\.svg"/);
 assert.match(css,/url\("\.\/dog-boss-art\/arena-volcano-cinematic\.svg"\)/);
 assert.match(css,/url\("\.\/dog-boss-art\/arena-rune-crest\.svg"\)/);
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

test('boss 10 and all later bosses show selected FULL-BODY hero artwork instead of only small portraits',()=>{
 const battleCss=read('dog-boss-real-heroes.css');
 const groupHtml=read('dog-group-boss.html');
 const fx=read('dog-boss-combat-fx.js');
 for(const page of [html,groupHtml]){
  assert.match(page,/dog-boss-real-heroes\.css\?v=20261112-realheroes2/);
  assert.ok(page.indexOf('dog-boss-real-heroes.css')>
   page.indexOf('dog-boss-legendary-arena.css'),'full-body styles must load last');
 }
 const sprite=battleCss.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
 assert.ok(sprite,'approved three-character sprite must be bundled locally');
 const data=Buffer.from(sprite[1],'base64');
 assert.ok(data.length>30000,'full body sprite must not be a placeholder');
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.match(battleCss,/background-size:300% 100%/);
 assert.match(battleCss,/\.combat-hero-symbol::after/);
 for(const type of ['krieger','magierin','waechter']){
  assert.ok(battleCss.includes('data-hero-class="'+type+'"'),'missing '+type+' sprite position');
 }
 assert.ok(fx.includes('heroClasses.includes(heroClass)?heroClasses.indexOf(heroClass):roleIndex'));
 assert.ok(fx.includes("membersByUid.get(m.uid)?.heroClass"),'chosen hero must be obtained from server member');
 assert.ok(fx.includes("item.setAttribute?.('data-hero-class',heroClasses[portraitIndex])"));
 assert.doesNotMatch(battleCss,/https?:\/\//,'battle art stays local and offline-capable');
});
