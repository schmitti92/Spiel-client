import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
test('SKYJO loader hashes all 35 modules exactly, and the concatenated engine parses',()=>{
 const manifest=JSON.parse(read('skyjo_action-manifest.json'));
 const parts=Object.entries(manifest.parts);
 assert.equal(parts.length,35);
 const source=parts.map(([file,digest])=>{
  const text=read(file);
  assert.equal(createHash('sha256').update(text).digest('hex'),digest,file);
  return text;
 }).join('');
 assert.doesNotThrow(()=>new Function(source));
});
test('SKYJO 100 Tore Special browser runtime and existing Monster Slots parse',()=>{
 assert.doesNotThrow(()=>new Function(read('skyjo_tore_special.js')));
 const deal=read('../DealOrNoDeal/js/monster-slots-final.js');
 assert.doesNotThrow(()=>new Function(deal));
 assert.match(deal,/for\(let i=6;i<12;i\+\+\)/);
 assert.match(read('skyjo_action.html'),/skyjo_tore_special\.js/);
});
test('Mission selection is stable, three per round, and includes hard missions',()=>{
 const browser={};
 new Function('window',read('skyjo_tore_special.js'))(browser);
 const engine=browser.SkyjoToreSpecial;
 assert.equal(engine.definitions.length,22);
 const match='abcdef12-3456-4abc-bcde-123456789abc';
 assert.deepEqual(engine.missionsFor(match,1),['two-zero','two-rows','clear-board']);
 for(let round=1;round<100;round++){
  const ids=engine.missionsFor(match,round);
  assert.equal(ids.length,3);
  assert.deepEqual(ids,engine.missionsFor(match,round));
  assert.deepEqual(ids.map(id=>engine.definitions.find(m=>m.id===id)?.tier),['easy','medium','hard']);
 }
});
test('Special rewards are mandatory before host may start next round',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const x=browser.SkyjoToreSpecial,state={round:1,phase:'play',players:[{name:'Chris',grid:[]}]};
 x.newGame(state,{toreSpecialEnabled:true},'abcdef12-3456-4abc-bcde-123456789abc');
 assert.equal(x.canNextRound(state),false);
 state.skyjoSpecial.finished=true;
 assert.equal(x.canNextRound(state),true);
});

test('The normal Weiter button stays enabled when special runtime is missing',()=>{
 const nextRound=read('skyjo_action-logic-part-19.txt');
 const returnToLobby=read('skyjo_action-logic-part-20.txt');
 assert.match(nextRound,/SkyjoToreSpecial\?\.canNextRound\(state\)===false/);
 assert.match(returnToLobby,/SkyjoToreSpecial\?\.canNextRound\(state\)===false/);
 assert.doesNotMatch(nextRound,/if\(!window\.SkyjoToreSpecial\?\.canNextRound\(state\)\)/);
 // In JavaScript, undefined===false is false: normal games never become blocked.
 assert.equal(undefined===false,false);
 assert.equal(false===false,true);
 assert.equal(true===false,false);
});
