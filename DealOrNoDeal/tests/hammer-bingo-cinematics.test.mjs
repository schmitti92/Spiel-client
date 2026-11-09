// Run: node --test DealOrNoDeal/tests/hammer-bingo-cinematics.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const js=readFileSync(resolve(root,'js/hammer-bingo-cinematics.js'),'utf8');
const css=readFileSync(resolve(root,'css/hammer-bingo-cinematics.css'),'utf8');
const html=readFileSync(resolve(root,'weihnachten.html'),'utf8');
// The controller does not initialize elements in this VM; its scene planner is pure.
const ctx=vm.createContext({window:{},document:{readyState:'loading',hidden:false,addEventListener(){},getElementById(id){return id==='reveal-overlay'?{hidden:true}:null}}});
vm.runInContext(js,ctx,{filename:'hammer-bingo-cinematics.js',timeout:1500});
const plan=ctx.window.HammerBingoCinematics.plan;
const artwork=Array.from({length:32},(_,i)=>'card_'+i+'.png');
const allCards={};
for(let index=33;index<=64;index++)allCards['christmas-'+index]=1;
const base={preClaimCards:allCards,artwork};

test('the cinematic controller loads without touching Firestore or any API',()=>{
 assert.equal(typeof plan,'function');
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 assert.doesNotMatch(js,/\bXMLHttpRequest\s*\(/);
 assert.doesNotMatch(js,/\bindexedDB\b/);
 assert.match(js,/prefers-reduced-motion/);
 assert.match(js,/christmas-pack-reveal-closed/);
 assert.match(js,/visibilitychange/);
});

test('only server-confirmed awards can create victory scenes',()=>{
 assert.equal(plan({...base}).length,0);
 assert.equal(plan({...base,awarded:[{board:3,line:-1,hammers:{single:99}}]}).length,0);
 assert.equal(plan({...base,awarded:[{board:9,line:0,hammers:{single:99}}]}).length,0);
});

test('one completed row creates one workshop Bingo showing actual awarded Hammer',()=>{
 const scenes=plan({...base,awarded:[{board:3,line:0,hammers:{single:1}}],hammerProgress:{boards:[{board:3,cycle:2}]}});
 assert.equal(scenes.length,1);
 const s=scenes[0];assert.equal(s.board,3);assert.equal(s.world,'workshop');
 assert.equal(s.kind,'bingo');assert.equal(s.cycle,2);assert.equal(s.totals.single,1);
 assert.equal(s.lines.length,1);assert.equal(s.lines[0],0);
 assert.match(s.subtitle,/Reihe 1/);assert.equal(s.id,'3:2:bingo:0');
});

test('multiple mixed-world Bingo lines combine into one scene and show awarded amounts only',()=>{
 const scenes=plan({...base,awarded:[
  {board:4,line:5,hammers:{single:4}},
  {board:4,line:9,hammers:{lucky:2}},
  {board:4,line:9,hammers:{lucky:0}}
 ],hammerProgress:{boards:[{board:4,cycle:3}]}});
 assert.equal(scenes.length,1);
 const s=scenes[0];assert.equal(s.world,'winter');assert.equal(s.kind,'bingo');
 assert.equal(s.completedBingos,2);assert.equal(s.totals.single,4);
 assert.equal(s.totals.lucky,2);assert.equal(s.totals.double,0);
 assert.equal(s.id,'4:3:bingo:5-9');
});

test('all completed cards plus jackpot create one grand scene, not 11 modals',()=>{
 const awarded=Array.from({length:10},(_,line)=>({board:4,line,hammers:{double:2}}));
 const scenes=plan({...base,awarded,jackpots:[{board:4,cycle:3,hammers:{single:0,double:10,lucky:3}}],
  hammerProgress:{boards:[{board:4,cycle:4}]}});
 assert.equal(scenes.length,1);
 const s=scenes[0];assert.equal(s.kind,'jackpot');
 assert.equal(s.lines.length,10);assert.equal(s.cycle,3);
 assert.equal(s.totals.double,30);assert.equal(s.totals.lucky,3);
 assert.equal(s.prize.double,10);assert.equal(s.prize.lucky,3);
 assert.equal(s.id,'4:3:jackpot:0-1-2-3-4-5-6-7-8-9');
});

test('both boards winning creates separate scenes with independent jackpot tracking',()=>{
 const scenes=plan({...base,awarded:[
  {board:3,line:4,hammers:{single:1}},
  {board:4,line:6,hammers:{double:2}}
 ],jackpots:[{board:4,cycle:2,hammers:{double:10,lucky:3}}]});
 assert.equal(scenes.length,2);
 assert.equal(scenes[0].board,3);assert.equal(scenes[0].kind,'bingo');
 assert.equal(scenes[1].board,4);assert.equal(scenes[1].kind,'jackpot');
});

test('no locked card art leaks into cards without confirmed ownership',()=>{
 const scenes=plan({preClaimCards:{'christmas-33':1},
  artwork,awarded:[{board:3,line:0,hammers:{single:1}}]});
 const s=scenes[0];assert.equal(s.owned['christmas-33'],true);
 assert.equal(s.owned['christmas-34'],false);
 assert.equal(s.art.length,32);
});

test('local demo can start without server calls, inventory mutations or real awards',()=>{
 assert.equal(typeof ctx.window.HammerBingoCinematics.preview,'function');
 assert.equal(ctx.window.HammerBingoCinematics.preview(artwork),true);
 // A queued two-scene demo is intentionally not replayed from an account receipt.
 assert.match(js,/function preview\(artwork=\[\]\)/);
 assert.match(js,/preview:true/);
 assert.match(js,/scene\.preview\?'🎬 Vorschau: keine Hammer gutgeschrieben'/);
 assert.match(html,/id="hammer-cinema-preview"/);
 assert.match(html,/HammerBingoCinematics\?\.preview/);
 assert.match(html,/id="hammer-cinema-footer-note"/);
});

test('HTML wiring retains server claim, pack-reveal and screen controls',()=>{
 const requiredIds=['hammer-cinema','hammer-cinema-grid','hammer-cinema-paths','hammer-cinema-next',
  'hammer-cinema-replay','hammer-cinema-sound','hammer-cinema-close','event-refresh','event-fullscreen'];
 for(const id of requiredIds)assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/hammer-bingo-cinematics\.css/);
 assert.match(html,/hammer-bingo-cinematics\.js/);
 assert.match(html,/HammerBingoCinematics\?\.celebrate/);
 assert.match(html,/request\('POST','hammer\/claim'\)/);
 assert.match(html,/christmas-pack-reveal-closed/);
 assert.match(html,/event-refresh'\)\.addEventListener\('click'/);
});

test('all three existing Hammer files and both themes used by the celebration exist',()=>{
 const files=['hammer-einfach.webp','hammer-doppel.webp','hammer-glueck.webp'];
 for(const name of files)assert.ok(existsSync(resolve(root,'Weihnachtsevent2/Weihnachtsbilder',name)),name);
 assert.match(css,/card-back-workshop\.svg/);
 assert.match(css,/card-back-winter\.svg/);
 assert.match(css,/08_wichtelwerkstatt\.png/);
 assert.match(css,/10_eisschloss\.png/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
