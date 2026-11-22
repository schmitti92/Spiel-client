import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,legalActions,takeAction} from '../DOG/engine.js';
import {
 DOG_BOT_DIFFICULTY_KEY,DOG_BOT_DIFFICULTIES,normalizeDogBotDifficulty,
 readDogBotDifficulties,saveDogBotDifficulty,dogBotDifficultyForSeat,chooseDogBotAction
} from '../DOG/bot-difficulty.js';

function fixture(cardTypes=['2'],phase='play'){
 const game=createGame({rng:()=>.34,bots:[false,true,true,true]});
 game.current=1;game.starter=1;game.phase=phase;
 game.hands=[[],cardTypes.map((type,i)=>({id:900+i,type})),[],[]];
 return game;
}
const pawn=(s,id,place,pos=-1)=>Object.assign(s.pieces.find(p=>p.id===id),{place,pos});

test('three supported bot strengths default to medium and persist per seat only in local preferences',()=>{
 assert.deepEqual([...DOG_BOT_DIFFICULTIES],['easy','medium','expert']);
 assert.equal(normalizeDogBotDifficulty('invalid'),'medium');
 const cache=new Map();
 const storage={getItem:key=>cache.get(key)||null,setItem:(key,val)=>cache.set(key,val)};
 assert.deepEqual(readDogBotDifficulties(storage),{});
 let options=saveDogBotDifficulty(1,'easy',storage);
 assert.equal(options[1],'easy');
 options=saveDogBotDifficulty(2,'expert',storage);
 assert.equal(dogBotDifficultyForSeat(options,1),'easy');
 assert.equal(dogBotDifficultyForSeat(options,2),'expert');
 assert.equal(dogBotDifficultyForSeat(options,3),'medium');
 options=saveDogBotDifficulty(2,'malformed',storage);
 assert.equal(options[2],'medium');
 assert.equal(JSON.parse(cache.get(DOG_BOT_DIFFICULTY_KEY))[1],'easy');
 assert.deepEqual(saveDogBotDifficulty(-1,'easy',storage),options);
 assert.deepEqual(readDogBotDifficulties({getItem:()=>'{invalid json'}),{});
 assert.deepEqual(readDogBotDifficulties({getItem:()=>{throw Error('blocked');}}),{});
 assert.equal(saveDogBotDifficulty(1,'expert',{getItem:()=>null,setItem:()=>{throw Error('blocked');}})[1],'expert');
});

test('easy picks random legal moves; medium preserves existing strategy; no rules are bypassed',()=>{
 const game=fixture(['2','3']);pawn(game,4,'track',20);
 const legal=legalActions(game,1);
 assert.ok(legal.length>=2);
 const first=chooseDogBotAction(game,1,'easy',()=>0);
 const last=chooseDogBotAction(game,1,'easy',()=>.9999);
 assert.deepEqual(first,legal[0]);
 assert.deepEqual(last,legal.at(-1));
 for(const level of DOG_BOT_DIFFICULTIES){
  const selected=chooseDogBotAction(game,1,level,()=>.25);
  assert.ok(legal.some(move=>JSON.stringify(move)===JSON.stringify(selected)),level);
 }
 assert.equal(chooseDogBotAction(game,0,'expert'),null,'non-bot seats are not controlled');
});

test('expert prefers a direct game-winning goal entry over another lap',()=>{
 const game=fixture(['2','8']);
 pawn(game,4,'track',15);
 pawn(game,5,'goal',0);pawn(game,6,'goal',1);pawn(game,7,'goal',2);
 const snapshot=structuredClone(game);
 const move=chooseDogBotAction(game,1,'expert');
 assert.equal(move?.cardId,900);
 assert.equal(move?.viaGoal,true);
 assert.equal(move?.to,'goal:0');
 assert.deepEqual(game,snapshot,'evaluating an action never modifies the game');
 const after=takeAction(game,1,move,()=>.42);
 assert.equal(after.phase,'finished');
 assert.equal(after.winnerSeat,1);
});

test('expert values capturing an opponent instead of a longer empty move',()=>{
 const game=fixture(['3','5']);
 pawn(game,4,'track',20);
 pawn(game,0,'track',23);
 const move=chooseDogBotAction(game,1,'expert');
 assert.equal(move?.type,'move');
 assert.equal(move?.steps,3);
 assert.deepEqual(move?.captures,[0]);
});

test('expert passes a start card to a teammate with no active figures',()=>{
 const game=fixture(['3','13'],'exchange');
 const move=chooseDogBotAction(game,1,'expert');
 assert.equal(move?.type,'exchange');
 assert.equal(move?.cardId,901);
 assert.equal(game.exchanges[1],null,'selection cannot exchange cards by itself');
});

test('an entire legal seven may be continued by a bot without sacrificing rule checks',()=>{
 let game=fixture(['7']);
 pawn(game,4,'track',20);
 let opening=chooseDogBotAction(game,1,'expert');
 assert.equal(opening.type,'seven');
 game=takeAction(game,1,opening,()=>.42);
 assert.equal(game.phase,'seven');
 const step=chooseDogBotAction(game,1,'expert');
 assert.ok(legalActions(game,1).some(a=>JSON.stringify(a)===JSON.stringify(step)));
 assert.ok(['seven-step','seven-finish'].includes(step.type));
});
