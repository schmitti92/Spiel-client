const assert=require('node:assert/strict');
const E=require('../Skyjo/skyjo_host_preview_engine.js');
const initialCounts=new Map(E.distribution);
function inventory(s){
 const values=[...s.deck,...s.discard,...s.boards.flat().map(c=>c.value)];
 if(s.pending)values.push(s.pending.value);
 const counts=new Map();
 for(const v of values)counts.set(v,(counts.get(v)||0)+1);
 return counts;
}
for(let game=0;game<35;game++){
 const s=E.create();
 assert.deepEqual(inventory(s),initialCounts,'every card must be accounted for at start');
 let turns=0;
 while(!s.finished&&turns++<300){
  const player=E.current(s);
  if(player===0){
   assert.ok(E.pick(s,'deck')||E.pick(s,'discard'),'host should be able to draw');
   assert.deepEqual(inventory(s),initialCounts,'pending card must remain in inventory');
   const hidden=s.boards[0].findIndex(c=>!c.up);
   const index=hidden>=0?hidden:0;
   const action=s.pending.source==='deck'&&hidden>=0&&turns%3===0?'discard-reveal':'swap';
   assert.equal(E.place(s,index,action),true,'host must finish legal action');
  }else{
   assert.equal(E.bot(s),true,'bot should take its turn');
  }
  assert.deepEqual(inventory(s),initialCounts,'card inventory conserved after every move');
  assert.equal(s.turn,turns,'exactly one turn per action');
  assert.equal(s.pending,null,'no pending card after completed action');
 }
 assert.equal(s.finished,true,'test should eventually terminate');
 assert.ok(s.winner>=0&&s.winner<=2);
 assert.equal(s.boards.every(b=>b.every(c=>c.up)),true);
}
console.log('35 randomized host-preview simulations passed with card conservation');
