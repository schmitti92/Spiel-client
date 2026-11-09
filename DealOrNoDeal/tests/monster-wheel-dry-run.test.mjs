import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=load('weihnachten.html');
const demoSource=load('js/monster-wheel-demo.js');

function demo(){
 const context={window:{},Math};
 new vm.Script(demoSource,{filename:'monster-wheel-demo.js'}).runInNewContext(context);
 return context.window.ChristmasMonsterDemo;
}

test('offline test catalog mirrors every existing 25-stop Monster Wheel prize',()=>{
 const d=demo();
 assert.equal(d.catalog.length,25);
 assert.equal(new Set(d.catalog.map(s=>s.id)).size,25);
 assert.deepEqual(Array.from(d.catalog).flatMap((s,i)=>s.kind==='randomCash'?[i]:[]),[0,5,10,15,20]);
 assert.equal(d.catalog.filter(x=>x.featured).length,4);
 assert.equal(d.catalog[2].id,'giftzwerg');
 assert.equal(d.catalog[7].id,'gold-5');
 assert.equal(d.catalog[12].id,'premium-3');
 assert.equal(d.catalog[17].id,'gold-4');
 assert.equal(d.catalog[22].id,'cash-10m');
});

test('preview draw is pure and yields exact indexed prizes and bounded money',()=>{
 const d=demo(),original=JSON.stringify(d.catalog);
 for(let i=0;i<25;i++){
  const spin=d.draw(d.catalog,()=>i/25+0.000001);
  assert.equal(spin.prize.index,i);
  assert.equal(spin.prize.id,d.catalog[i].id);
  assert.equal(spin.isTest,true);
  assert.equal(spin.revealed.length,0);
 }
 assert.equal(d.draw(d.catalog,()=>0).prize.amountCents,10000);
 const upper=d.draw(d.catalog,()=>1-1e-12);
 assert.equal(upper.prize.index,24);
 const maxAmount=d.draw(d.catalog,(()=>{let n=0;return ()=>n++===0?0:1-1e-12})()).prize.amountCents;
 assert.equal(maxAmount,200000000);
 assert.equal(JSON.stringify(d.catalog),original,'test draw must never mutate the prize catalog');
});

test('test controls are visible and test result is labelled with no payout',()=>{
 for(const id of ['monster-test-open','monster-spin-test','monster-test-label']){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.match(page,/js\/monster-wheel-demo\.js/);
 assert.match(page,/TESTMODUS · KEINE GUTSCHRIFT/);
 assert.match(page,/Keine Karten werden gezogen oder gespeichert/);
 assert.match(page,/Dein Vorrat bleibt unverändert/);
 assert.match(page,/Nur Vorschau: Kein Geld/);
 assert.match(page,/monsterSpinTest\.addEventListener\('click'/);
});

test('end-to-end dry run spins for 8000 ms and reveals prize but never calls server',async()=>{
 const beginPrize=page.indexOf('function monsterShowPrize(spin,');
 const endPrize=page.indexOf("document.getElementById('monster-spin-open').addEventListener",beginPrize);
 const beginRun=page.indexOf('async function runMonsterTest(){',endPrize);
 const endRun=page.indexOf("monsterSpinTest.addEventListener",beginRun);
 assert.ok(beginPrize>0&&endPrize>beginPrize&&beginRun>endPrize&&endRun>beginRun);
 const prizeCode=page.slice(beginPrize,endPrize);
 const runCode=page.slice(beginRun,endRun);
 assert.doesNotMatch(runCode,/\bawait\s+request\s*\(/);
 assert.doesNotMatch(runCode,/\bfetch\s*\(/);
 assert.doesNotMatch(runCode,/monsterSpinRequestId\s*\(/);
 const el={};
 const element=id=>(el[id]??={hidden:true,textContent:'',disabled:false});
 const d=demo();
 let calls=0,spinArgs=null;
 const context={
  monsterSpinBusy:false,
  monsterOverlay:{hidden:false},
  monsterSpinRewardCards:null,
  monsterSpinPackId:null,
  monsterStatus:{textContent:''},
  monsterAvailableSlots:()=>d.catalog,
  monsterControls:()=>{},
  monsterFormat:n=>(n/100)+' €',
  document:{getElementById:element},
  window:{
   ChristmasMonsterDemo:{draw:()=>d.draw(d.catalog,()=>0)},
   ChristmasMonsterVisuals:{spin:async(index,ms)=>{spinArgs={index,ms}}}
  },
  request:()=>{calls++;throw Error('A test spin must not touch API')},
  fetch:()=>{calls++;throw Error('A test spin must not access network')}
 };
 const evaluation=new vm.Script(prizeCode+'\n'+runCode+'\nrunMonsterTest();',{filename:'dry-run-ui.js'});
 await evaluation.runInNewContext(context);
 assert.deepEqual(spinArgs,{index:0,ms:8000});
 assert.equal(calls,0);
 assert.equal(context.monsterSpinBusy,false);
 assert.equal(el['monster-wheel-prize'].hidden,false);
 assert.equal(el['monster-test-label'].hidden,false);
 assert.equal(el['monster-wheel-card-action'].hidden,true);
 assert.match(el['monster-wheel-result-name'].textContent,/Testgewinn/);
 assert.match(el['monster-wheel-result-details'].textContent,/Kein Geld/);
 assert.match(context.monsterStatus.textContent,/TEST BEENDET/);
});
