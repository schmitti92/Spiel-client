import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('dog-boss10.html');
const css=read('dog-boss-cinematic.css');
const backdrop=read('dog-boss-art/arena-volcano-cinematic.svg');
const crest=read('dog-boss-art/arena-rune-crest.svg');

test('Tor 10 uses local cinematic styling after functional battle styling',()=>{
 const live=html.indexOf('dog-boss-live.css'),art=html.indexOf('dog-boss-cinematic.css');
 assert.ok(live>=0 && art>live,'the cinematic layer must override the existing live CSS');
 assert.match(html,/rel="preload" as="image" href="\.\/dog-boss-art\/arena-volcano-cinematic\.svg"/);
 assert.match(css,/url\("\.\/dog-boss-art\/arena-volcano-cinematic\.svg"\)/);
 assert.match(css,/url\("\.\/dog-boss-art\/arena-rune-crest\.svg"\)/);
});
test('original SVG assets are standalone, scalable and self-contained',()=>{
 for(const source of [backdrop,crest]){
  assert.match(source,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(source,/viewBox="0 0 /);
  assert.match(source,/<\/svg>\s*$/);
  assert.doesNotMatch(source,/<script\\b|(?:href|xlink:href)\\s*=\\s*["\x27]https?:\\/\\//i,'no remote image or script resources');
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
