const assert=require('node:assert/strict');const E=require('../Skyjo/skyjo_host_preview_engine.js');
const s=E.create();assert.equal(s.boards.length,3);assert.equal(s.boards.flat().length,36);assert.equal(s.deck.length,113);assert.equal(s.discard.length,1);
assert.equal(E.pick(s,'deck'),true);assert.equal(E.pick(s,'deck'),false);const v=s.pending.value;assert.equal(E.place(s,0,'swap'),true);assert.equal(s.boards[0][0].value,v);assert.equal(s.boards[0][0].up,true);assert.equal(s.turn,1);
assert.equal(E.bot(s),true);assert.equal(s.turn,2);assert.equal(E.bot(s),true);assert.equal(s.turn,3);
assert.equal(E.pick(s,'deck'),true);assert.equal(E.place(s,1,'discard-reveal'),true);assert.equal(s.boards[0][1].up,true);
let loops=0;while(!s.finished&&loops++<250){if(E.current(s)===0){assert.equal(E.pick(s,'deck')||E.pick(s,'discard'),true);const idx=s.boards[0].findIndex(c=>!c.up);assert.equal(E.place(s,idx<0?0:idx,'swap'),true)}else assert.equal(E.bot(s),true)}
assert.ok(s.finished,'preview terminates');assert.ok(s.winner>=0&&s.winner<=2);console.log('host preview engine tests passed');