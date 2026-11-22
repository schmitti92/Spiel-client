import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../DOG/christmas-discovery.js',import.meta.url),'utf8');
const {dogChristmasFoundMarkers,newDogChristmasDiscoveries}=await import('data:text/javascript,'+encodeURIComponent(source));

test('only actually found gold amounts become visible, with correct field and value',()=>{
 const event={enabled:true,goldFieldCount:4,foundGoldFields:[{field:9,amount:500},{field:21,amount:1}],
  goldFields:[{field:3,amount:2000},{field:39,amount:1000}]};
 assert.deepEqual(dogChristmasFoundMarkers(event),[
  {field:9,kind:'gold',both:false,amount:500},
  {field:21,kind:'gold',both:false,amount:1}
 ]);
 assert.ok(!JSON.stringify(dogChristmasFoundMarkers(event)).includes('2000'));
});
test('new verified personal gold find celebrates once, never on first load or opponent snapshots',()=>{
 const previous={enabled:true,eventSerial:14};
 const current={enabled:true,eventSerial:16,activity:[
  {id:15,type:'gold',field:19,seat:1,amount:2000},
  {id:16,type:'gold',field:23,seat:0,amount:1}
 ]};
 assert.deepEqual(newDogChristmasDiscoveries(previous,current,1).map(x=>x.amount),[2000]);
 assert.deepEqual(newDogChristmasDiscoveries(current,current,1),[]);
 assert.deepEqual(newDogChristmasDiscoveries(null,current,1),[]);
});
test('gold value and coin icon are drawn above pawns without adding any reads',()=>{
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 assert.match(app,/onlineChristmas\?\.foundGoldFields/);
 assert.match(app,/mark\.kind|kind===\x27gold\x27/);
 assert.match(app,/mark\.amount/);
 assert.doesNotMatch(source,/fetch\(|getIdToken|firebase/);
 assert.match(source,/Goldmünzen/);
});
