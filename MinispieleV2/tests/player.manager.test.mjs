import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../engine/PlayerManager.js',import.meta.url),'utf8');
const {validatePlayers,createPlayerManager}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
test('supports 1 to 4 human and bot participants',()=>{
 for(let count=1;count<=4;count++){
  const ps=Array.from({length:count},(_,i)=>({id:'p'+i,type:i%2?'bot':'human'}));
  assert.equal(createPlayerManager(ps).list().length,count);
 }
 assert.throws(()=>validatePlayers([]),/PLAYER_COUNT_1_TO_4/);
 assert.throws(()=>validatePlayers(Array.from({length:5},(_,i)=>({id:'p'+i,type:'human'}))),/PLAYER_COUNT_1_TO_4/);
});
test('rejects invalid and duplicate identities without generating identities',()=>{
 assert.throws(()=>validatePlayers([{id:'a',type:'human'},{id:'a',type:'bot'}]),/DUPLICATE_PLAYER/);
 assert.throws(()=>validatePlayers([{id:'a',type:'computer'}]),/INVALID_PLAYER/);
 assert.throws(()=>validatePlayers([null]),/INVALID_PLAYER/);
});
test('roles are explicit and role requirements are enforced',()=>{
 const m=createPlayerManager([{id:'a',type:'human'},{id:'b',type:'bot'}]);
 assert.equal(m.isHuman('a'),true);
 assert.equal(m.isBot('b'),true);
 assert.equal(m.isBot('missing'),false);
 assert.equal(m.requireBot('b').id,'b');
 assert.throws(()=>m.requireBot('a'),/PLAYER_NOT_BOT/);
 assert.throws(()=>m.requireHuman('b'),/PLAYER_NOT_HUMAN/);
 assert.throws(()=>m.requireHuman('missing'),/UNKNOWN_PLAYER/);
});
test('roster snapshots cannot mutate manager state',()=>{
 const original=[{id:'a',type:'human'}];
 const m=createPlayerManager(original);
 original[0].type='bot';
 const copy=m.list();copy[0].type='bot';
 assert.equal(m.get('a').type,'human');
});
