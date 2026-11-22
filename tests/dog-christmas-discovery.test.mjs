import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../DOG/christmas-discovery.js',import.meta.url),'utf8');
const {dogChristmasFoundMarkers,newDogChristmasDiscoveries}=await import('data:text/javascript,'+encodeURIComponent(script));
test('only verified found positions are marked; hidden field positions remain secret',()=>{
 const snap={enabled:true,foundGiftFields:[3,3,0,12,90],foundScratchFields:[12,15,16],giftFields:[21],scratchFields:[22]};
 assert.deepEqual(dogChristmasFoundMarkers(snap),[
  {field:3,kind:'gift',both:false},
  {field:12,kind:'gift',both:true},
  {field:12,kind:'scratch',both:true},
  {field:15,kind:'scratch',both:false}
 ]);
 assert.deepEqual(dogChristmasFoundMarkers(null),[]);
});
test('only newer, personally collected discoveries produce congratulations',()=>{
 const previous={enabled:true,eventSerial:8};
 const next={enabled:true,eventSerial:11,activity:[
  {id:8,type:'gift',field:5,seat:0},
  {id:9,type:'gift',field:9,seat:1,earnedTenths:10},
  {id:10,type:'scratch',field:13,seat:1,tier:'premium'},
  {id:11,type:'scratch',field:25,seat:2}
 ]};
 assert.deepEqual(newDogChristmasDiscoveries(previous,next,1).map(e=>e.id),[9,10]);
 assert.deepEqual(newDogChristmasDiscoveries(next,next,1),[]);
 assert.deepEqual(newDogChristmasDiscoveries(null,next,1),[]);
 assert.deepEqual(newDogChristmasDiscoveries(previous,next,0),[]);
 assert.deepEqual(newDogChristmasDiscoveries(previous,{...next,eventSerial:7},1),[]);
});
test('popup is only client presentation and does not request or write game state',()=>{
 assert.doesNotMatch(script,/fetch\(|getIdToken|firebase|sendOnlineDogAction/);
 assert.match(script,/Herzlichen Glückwunsch|Weihnachtslicht|Rubbellos-Feld/);
});

test('old verified activity shows previously collected fields even without the new stored arrays',()=>{
 const snap={enabled:true,activity:[
  {type:'gift',field:9,seat:0},{type:'scratch',field:11,seat:1},
  {type:'inn',earnedTenths:20},{type:'gift',field:16,seat:1},
  {type:'scratch',field:11,seat:1}
 ]};
 assert.deepEqual(dogChristmasFoundMarkers(snap),[
  {field:9,kind:'gift',both:false},{field:11,kind:'scratch',both:false}
 ]);
});
test('collected markers are drawn above pawns, not hidden behind them',()=>{
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 const pawnStart=app.indexOf('  for(const piece of game.pieces){',app.indexOf('function drawBoard()'));
 const permanentLayer=app.indexOf('    const byField=new Map();',pawnStart);
 const svgCommit=app.indexOf("  boardSvg.innerHTML=board.join('');",pawnStart);
 assert.ok(pawnStart>=0&&permanentLayer>pawnStart&&svgCommit>permanentLayer);
 assert.match(app.slice(permanentLayer,svgCommit),/pointer-events="none"/);
 assert.match(app.slice(permanentLayer,svgCommit),/pawnFields\.has\(field\)/);
});
