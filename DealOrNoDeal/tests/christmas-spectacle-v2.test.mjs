// node --test DealOrNoDeal/tests/christmas-spectacle-v2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script,createContext,runInContext} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const js=readFileSync(resolve(root,'js/christmas-spectacle-v2.js'),'utf8');
const css=readFileSync(resolve(root,'css/christmas-spectacle-v2.css'),'utf8');
const html=readFileSync(resolve(root,'weihnachten.html'),'utf8');
const bingo=readFileSync(resolve(root,'js/hammer-bingo-cinematics.js'),'utf8');
const packs=readFileSync(resolve(root,'js/christmas-pack-cinema.js'),'utf8');
const director=readFileSync(resolve(root,'js/christmas-show-director.js'),'utf8');

function rig({saved=null,saveData=false,memory=8,motion=false,failStorage=false}={}){
 const store=new Map();
 if(saved!==null)store.set('spielportal.christmas.visualEffects.v2',saved);
 const events={};let clicked=null;const classes=new Set();
 const button={textContent:'',dataset:{},title:'',
  addEventListener:(name,listener)=>{if(name==='click')clicked=listener;},
  setAttribute(name,value){this[name]=value;}};
 const document={
  readyState:'loading',hidden:false,
  body:{dataset:{},classList:{
   toggle(name,condition){if(condition)classes.add(name);else classes.delete(name);},
   contains(name){return classes.has(name);}
  }},
  getElementById:id=>id==='christmas-effects-toggle'?button:null,
  addEventListener:(name,listener)=>{events[name]=listener;},
  dispatchEvent(event){events['fired-'+event.type]=true;}
 };
 const window={matchMedia:()=>({matches:motion}),localStorage:{
  getItem(k){if(failStorage)throw Error('blocked');return store.get(k)||null;},
  setItem(k,v){if(failStorage)throw Error('blocked');store.set(k,v);}
 }};
 const ctx=createContext({window,document,navigator:{deviceMemory:memory,connection:{saveData}},Event:class{constructor(type){this.type=type}}});
 runInContext(js,ctx,{timeout:1000});
 assert.equal(typeof events.DOMContentLoaded,'function');
 events.DOMContentLoaded();
 return {api:window.ChristmasSpectacle,button,store,document,events,click(){clicked()}};
}

test('new visual assets are independent and render with accessible markup',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.match(html,/christmas-spectacle-v2\.css\?v=/);
 assert.match(html,/christmas-spectacle-v2\.js\?v=/);
 assert.equal((html.match(/id="christmas-effects-toggle"/g)||[]).length,1);
 for(const motif of ['hammer-cinema__halo','hammer-cinema__jackpot-crown',
  'hammer-cinema__award-crest','pack-cinema-orbit']){
  assert.ok(html.includes('class="'+motif+'"'),motif);
  assert.ok(css.includes('.'+motif),motif);
 }
 assert.match(html,/id="hammer-cinema-confirmation"/);
 assert.match(html,/id="pack-cinema-note"/);
 assert.match(html,/request\('POST','hammer\/claim'\)/);
 assert.match(html,/request\('POST','open',\{packId:pack,requestId:getPurchaseId\(pack\)\}\)/);
});

test('quality button cycles full, soft and off and stores only a local preference',()=>{
 const h=rig();
 assert.equal(h.api.currentLevel(),'full');
 assert.equal(h.document.body.dataset.xmasEffects,'full');
 assert.equal(h.api.particleLimit(28),28);
 h.click();
 assert.equal(h.api.currentLevel(),'soft');
 assert.equal(h.api.particleLimit(28),8);
 h.click();
 assert.equal(h.api.currentLevel(),'off');
 assert.equal(h.api.particleLimit(28),0);
 assert.equal(h.api.minimal(),true);
 assert.match(h.button.textContent,/Aus/);
 h.click();
 assert.equal(h.api.currentLevel(),'full');
 assert.equal(h.store.get('spielportal.christmas.visualEffects.v2'),'full');
 assert.equal(h.events['fired-christmas-effects-changed'],true);
 assert.equal(h.api.setLevel('bogus'),false);
});

test('saved preference wins over device hint; low power defaults soft',()=>{
 assert.equal(rig({saveData:true}).api.currentLevel(),'soft');
 assert.equal(rig({memory:2}).api.currentLevel(),'soft');
 assert.equal(rig({saved:'full',saveData:true}).api.currentLevel(),'full');
 assert.equal(rig({saved:'off'}).api.currentLevel(),'off');
 assert.equal(rig({saved:'invalid'}).api.currentLevel(),'full');
 assert.equal(rig({failStorage:true}).api.currentLevel(),'full');
});

test('accessibility reduced-motion prevents particles regardless of quality',()=>{
 const h=rig({motion:true});
 assert.equal(h.api.minimal(),true);
 assert.equal(h.api.particleLimit(27),0);
 h.api.setLevel('soft');assert.equal(h.api.particleLimit(28),0);
});

test('moving to background pauses CSS; returning resumes without polling',()=>{
 const h=rig();assert.equal(h.document.body.classList.contains('xmas-cinema-paused'),false);
 h.document.hidden=true;h.events.visibilitychange();
 assert.equal(h.document.body.classList.contains('xmas-cinema-paused'),true);
 h.document.hidden=false;h.events.visibilitychange();
 assert.equal(h.document.body.classList.contains('xmas-cinema-paused'),false);
});

test('legendary camera, foil, rare aura and motion limits are present',()=>{
 for(const key of ['xmas-v2-camera-jackpot','xmas-v2-foil-sweep',
  'xmas-v2-orbit','xmas-v2-crown-in','xmas-v2-legendary-stars',
  'data-xmas-effects=soft','data-xmas-effects=off',
  'prefers-reduced-motion:reduce','xmas-cinema-paused']){
  assert.ok(css.includes(key),key);
 }
 assert.match(css,/\.hammer-cinema\[data-kind=jackpot\] \.hammer-cinema__jackpot-crown\{display:block\}/);
 assert.match(css,/@media\(max-width:700px\)/);
});

test('existing cinematic controllers obey the visual budget without any award changes',()=>{
 for(const source of [bingo,packs,director]){
  assert.match(source,/ChristmasSpectacle\?\.minimal/);
 }
 assert.match(bingo,/ChristmasSpectacle\?\.particleLimit\?\.\(28\)/);
 assert.match(packs,/ChristmasSpectacle\?\.particleLimit\?\.\(27\)/);
 assert.match(bingo,/ChristmasShowDirector\?\.awardQueued\(fresh\.length\)/);
 assert.doesNotMatch(js,/\bfetch\s*\(|\bXMLHttpRequest\s*\(|\bindexedDB\b/);
});
