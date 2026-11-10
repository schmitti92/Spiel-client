import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const load=relative=>readFileSync(resolve(root,relative),'utf8');
const html=load('weihnachtsmuetzen.html');
const css=load('css/christmas-hats-reveal-v5.css');
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean).join('\n');

test('V5 animation loads after V4 and does not replace server prize logic',()=>{
 const v4=html.indexOf('christmas-hats-premium-v4.css'),v5=html.indexOf('christmas-hats-reveal-v5.css');
 assert.ok(v4>=0&&v5>v4,'V5 overrides V4');
 assert.match(js,/\/api\/christmas-hats\/action/);
 assert.doesNotMatch(js,/const bombIndex\s*=/);
 assert.match(js,/DEMO\?{total:999/);
 assert.doesNotThrow(()=>new Script(js,{filename:'weihnachtsmuetzen.html'}));
});

test('Three transparent self-contained reveal objects exist',()=>{
 for(const name of ['reveal-gift.svg','reveal-super.svg','reveal-bomb.svg']){
  const path='assets/hats/'+name;
  assert.ok(existsSync(resolve(root,path)),name);
  const svg=load(path);
  assert.match(svg,/<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/<\/svg>\s*$/);
  assert.doesNotMatch(svg,/<script|<foreignObject|onload=|href="https?:/i);
  assert.match(css,new RegExp(name.replaceAll('.','\\.')));
 }
});

test('Chosen hat reveals first and remaining two reveal with staggered CSS',()=>{
 assert.match(js,/revealPhase='suspense'/);
 assert.match(js,/revealPhase='chosen'/);
 assert.match(js,/revealPhase='shown'/);
 assert.match(js,/revealPhase==='chosen'&&i===reveal\.index/);
 assert.match(js,/if\(later\)hat\.style\.setProperty\('--reveal-order'/);
 assert.match(js,/otherHatTimer=setTimeout/);
 assert.match(css,/\.hat\.opening \.santa-hat/);
 assert.match(css,/\.hat\.revealed-later \.santa-hat/);
 assert.match(css,/animation-delay:calc\(var\(--reveal-order/);
 assert.match(css,/@keyframes show-hat-lift/);
});

test('Status and settlement cannot spoil unrevealed bomb or prize result',()=>{
 assert.match(js,/showBeforeState=previousState/);
 assert.match(js,/const presented=showBeforeState&&\['suspense','chosen'\]\.includes\(revealPhase\)/);
 assert.match(js,/const comment=revealPhase==='suspense'/);
 assert.match(js,/revealPhase==='chosen'\?'🎬 Die Mütze wird langsam angehoben/);
 assert.match(js,/settledVisible=s\?\.status==='finished'&&!reveal/);
 assert.match(js,/ending\.hidden=!settledVisible/);
 assert.match(js,/formatItems\(presented\?\.secured/);
 assert.match(js,/formatItems\(presented\?\.pending/);
 assert.match(js,/setStatus\('🎬 Deine Wahl ist bestätigt/);
});

test('Skip reveal, reloading and animation cleanup never create extra game actions',()=>{
 assert.match(js,/function fastForwardReveal\(\)/);
 assert.match(js,/clearShowTimers\(\);closeCinema\(\)/);
 assert.match(js,/revealTimer=setTimeout\(\(\)=>\{if\(reveal===event\)finishReveal\(\)\},2400\)/);
 assert.match(js,/for\(const t of \[revealTimer,suspenseTimer,cinemaTimer,otherHatTimer\]\)/);
 assert.match(js,/\$\('continue'\)\.onclick=fastForwardReveal/);
 assert.match(js,/function finishReveal\(\)/);
 assert.match(js,/function showChoice\(\)/);
 const skip=js.slice(js.indexOf('function fastForwardReveal()'),js.indexOf("$('continue').onclick=fastForwardReveal"));
 assert.doesNotMatch(skip,/call\(|fetch\(|\baction\(/);
});

test('Reduced motion, portrait phone and 3D reveal remain functional',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/\.hat \.reveal-object/);
 assert.match(html,/id="reveal-hint"/);
 assert.match(html,/id="reveal-hint-text"/);
});
