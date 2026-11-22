import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,legalActions,takeAction,completedDogSeat,finalizeCompletedDogGame} from '../DOG/engine.js';
import {summarizeDogVictory} from '../DOG/victory-summary.js';

test('client awards victory to Chris as soon as his fourth pawn reaches the goal',()=>{
 const s=createGame({rng:()=>0.5,bots:[false,false,true,true],names:['Chris','Vanessa','Bot 3','Bot 4']});
 s.phase='play';s.current=0;s.hands=[[{id:999,type:'1/11'}],[],[],[]];
 for(let i=0;i<4;i++){
  const p=s.pieces[i];p.place=i===0?'track':'goal';p.pos=i===0?0:i;
  if(i===0)p.goalReady=true;
 }
 const action=legalActions(s,0).find(m=>m.type==='move'&&m.steps===1&&m.viaGoal&&m.to==='goal:0');
 assert.ok(action);
 const next=takeAction(s,0,action);
 assert.equal(next.phase,'finished');assert.equal(next.winnerSeat,0);assert.equal(next.winner,0);
 const result=summarizeDogVictory(next);
 assert.equal(result.winningSeat,0);
 assert.equal(result.players.find(p=>p.seat===0).name,'Chris');
 assert.equal(result.teams[0].total,4,'does not require eight team pawns');
 assert.deepEqual(legalActions(next,0),[]);
});
test('client reconnect to legacy 4/4 requests verified Render finalization exactly once',()=>{
 const source=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 assert.match(source,/function autoFinishLegacyDogMatch\(\)/);
 assert.match(source,/const winner=completedDogSeat\(game\)/);
 assert.match(source,/lastLegacyVictoryAttempt===attempt/);
 assert.match(source,/sendOnlineDogAction\(\{type:'finalize-completed'\}\)/);
 assert.match(source,/autoFinishLegacyDogMatch\(\)/);
 assert.doesNotMatch(source,/firebase\.firestore\(\)/);
 const s=createGame({rng:()=>0.12});
 for(let id=0;id<4;id++){s.pieces[id].place='goal';s.pieces[id].pos=id;}
 assert.equal(completedDogSeat(s),0);
 assert.equal(finalizeCompletedDogGame(s).phase,'finished');
});
