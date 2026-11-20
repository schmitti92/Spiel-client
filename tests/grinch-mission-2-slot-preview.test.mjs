import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSlotOutcome,EFFECT_IDS,DECOY_FIELDS,DOUBLE_SLOT_CHANCE,CATEGORY_BY_ID} from '../DOG/grinch-campaign/mission-2-slot-config.js';

test('40 genuine outcomes, three unwinnable free-ticket decoys',()=>{
 assert.equal(EFFECT_IDS.length,40);
 assert.equal(new Set(EFFECT_IDS).size,40);
 assert.deepEqual(DECOY_FIELDS.map(p=>p.count),[10,50,100]);
 assert.ok(DECOY_FIELDS.every(p=>p.kind==='decoy'&&p.selectable===false&&p.canAward===false));
 assert.ok(DECOY_FIELDS.every(p=>!EFFECT_IDS.includes(p.id)));
});
test('second slot activates below 10% boundary only',()=>{
 const sequence=values=>{let i=0;return ()=>values[i++];};
 assert.equal(DOUBLE_SLOT_CHANCE,0.1);
 assert.equal(drawSlotOutcome(sequence([0,0.099999,0])).double,true);
 assert.equal(drawSlotOutcome(sequence([0,0.1])).double,false);
});
test('each possible sampled outcome is one of the 40 real effects',()=>{
 for(let i=0;i<1000;i++){
  const random=()=>i/1000;
  const outcome=drawSlotOutcome(random);
  assert.ok(EFFECT_IDS.includes(outcome.first));
  assert.equal(outcome.double,i<100);
  if(outcome.second!==null){
   assert.ok(EFFECT_IDS.includes(outcome.second));
   assert.notEqual(CATEGORY_BY_ID(outcome.first),CATEGORY_BY_ID(outcome.second));
  }
  assert.equal(outcome.double,outcome.second!==null);
 }
});
test('a second slot always has an effect from another category',()=>{
 const outcome=drawSlotOutcome(()=>0);
 assert.equal(outcome.first,1);
 assert.equal(outcome.second,11);
});
