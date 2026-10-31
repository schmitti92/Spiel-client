import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const data=source=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(source);
const engineUrl=data(read('../engine/MiniGameEngine.js'));
const resultUrl=data(read('../engine/ResultContract.js'));
const standardSource=read('../engine/StandardSession.js')
  .replace("'./MiniGameEngine.js'",JSON.stringify(engineUrl))
  .replace("'./ResultContract.js'",JSON.stringify(resultUrl));
const {createStandardSession}=await import(data(standardSource));
const players=[{id:'a',type:'human'},{id:'b',type:'bot'}];
const game={
 id:'strict-demo',
 initialState:ps=>({finished:false,scores:Object.fromEntries(ps.map(p=>[p.id,0]))}),
 applyAction:(state,{playerId,action})=>{
  if(action.type==='score')state.scores[playerId]+=action.points;
  else if(action.type==='finish')state.finished=true;
  else throw Error('INVALID_ACTION');
  return state;
 },
 getResult:state=>state.finished?{finished:true,results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))}:null,
 botAction:()=>({type:'score',points:1})
};
test('strict V2 session supports human, bot, result and restart',()=>{
 const session=createStandardSession(game,players);
 assert.equal(session.snapshot().result,null);
 session.dispatch('a',{type:'score',points:4});
 session.botTurn('b');
 assert.deepEqual(session.dispatch('a',{type:'finish'}).result.results.map(x=>x.score),[4,1]);
 assert.equal(session.restart().result,null);
});
test('strict V2 session rejects legacy result format at completion',()=>{
 const old={...game,id:'old-format',getResult:state=>state.finished?{ranking:[]}:null};
 const session=createStandardSession(old,players);
 assert.throws(()=>session.dispatch('a',{type:'finish'}),/INVALID_RESULT_FORMAT/);
});
test('strict V2 session rejects invalid initial result',()=>{
 const invalid={...game,id:'invalid-start',getResult:()=>({finished:true,results:[]})};
 assert.throws(()=>createStandardSession(invalid,players),/INVALID_RESULT_COUNT/);
});

test('invalid completed result cannot change state or revision',()=>{
 const invalid={...game,id:'rollback-check',getResult:state=>state.finished?{ranking:[]}:null};
 const session=createStandardSession(invalid,players);
 const before=session.snapshot();
 assert.throws(()=>session.dispatch('a',{type:'finish'}),/INVALID_RESULT_FORMAT/);
 assert.deepEqual(session.snapshot(),before);
});

test('invalid bot result cannot change state or revision',()=>{
 const invalid={...game,id:'invalid-bot-result',botAction:()=>({type:'finish'}),getResult:state=>state.finished?{finished:true,results:[{playerId:'a',score:1}]}:null};
 const session=createStandardSession(invalid,players);
 const before=session.snapshot();
 assert.throws(()=>session.botTurn('b'),/INVALID_RESULT_COUNT/);
 assert.deepEqual(session.snapshot(),before);
});
test('game action exceptions do not mutate session',()=>{
 const session=createStandardSession(game,players);
 const before=session.snapshot();
 assert.throws(()=>session.dispatch('a',{type:'unsupported'}),/INVALID_ACTION/);
 assert.deepEqual(session.snapshot(),before);
});
