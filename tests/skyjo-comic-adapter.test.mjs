import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeComicSnapshot, layoutForComicSeats } from '../Skyjo/skyjo_comic_adapter.mjs';
test('comic adapter rejects incompatible game versions', () => {
  assert.throws(() => normalizeComicSnapshot({kind:'skyjo-room-v1'}));
});
test('lobby seats stay in authoritative server order', () => {
  const players = ['A','B','C'].map((name,i)=>({id:'hub_'+i,name}));
  const s=normalizeComicSnapshot({kind:'skyjo-room-v2',version:2,lobby:{status:'lobby',players,settings:{}},game:null});
  assert.equal(s.players.length,3);
  assert.equal(s.players[2].seatId,'hub_2');
});
test('game and lobby player counts must agree',()=>{
  assert.throws(()=>normalizeComicSnapshot({kind:'skyjo-room-v2',version:2,lobby:{players:[{id:'a'},{id:'b'},{id:'c'}]},game:{players:[{},{}]}}));
});
test('each 3-5 player layout contains every opponent exactly once',()=>{
  for(const count of [3,4,5]) for(let self=0;self<count;self++){
    const result=layoutForComicSeats(count,self);
    assert.equal(result.opponents.length,count-1);
    assert.equal(new Set(result.opponents.map(p=>p.index)).size,count-1);
    assert.ok(result.opponents.every(p=>p.index!==self));
    assert.equal(new Set(result.opponents.map(p=>p.position)).size,count-1);
  }
});
test('invalid player counts and seat indices are rejected',()=>{
  assert.throws(()=>layoutForComicSeats(2,0));
  assert.throws(()=>layoutForComicSeats(5,5));
});
