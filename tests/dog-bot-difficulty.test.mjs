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
 pawn(game,5,'goal',1);pawn(game,6,'goal',2);pawn(game,7,'goal',3);
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

test('a default level applies to unconfigured bots while overrides stay independent',()=>{
 const cache=new Map();
 const storage={getItem:key=>cache.get(key)||null,setItem:(key,val)=>cache.set(key,val)};
 let preferences=saveDogBotDifficulty('default','expert',storage);
 assert.equal(dogBotDifficultyForSeat(preferences,1),'expert');
 preferences=saveDogBotDifficulty(1,'easy',storage);
 assert.equal(dogBotDifficultyForSeat(preferences,1),'easy');
 assert.equal(dogBotDifficultyForSeat(preferences,2),'expert');
 assert.equal(readDogBotDifficulties(storage).default,'expert');
});

test('expert plans backward four as a shortcut towards its own finish',()=>{
 const game=fixture(['4','4','1/11']);
 pawn(game,4,'track',16);
 const saved=structuredClone(game);
 const move=chooseDogBotAction(game,1,'expert');
 assert.equal(move?.steps,-4,'going back four from start can save almost a whole lap');
 assert.equal(move?.to,'track:12');
 assert.deepEqual(game,saved,'planning does not mutate the live match');
});

test('expert can calculate a split-seven finishing sequence and win immediately',()=>{
 let game=fixture(['7','5']);
 pawn(game,4,'track',15);
 pawn(game,5,'goal',1);pawn(game,6,'goal',2);pawn(game,7,'goal',3);
 const opening=chooseDogBotAction(game,1,'expert');
 assert.equal(opening?.type,'seven');
 game=takeAction(game,1,opening,()=>.42);
 const step=chooseDogBotAction(game,1,'expert');
 assert.equal(step?.type,'seven-step');
 assert.equal(step?.steps,2);
 assert.equal(step?.viaGoal,true);
 game=takeAction(game,1,step,()=>.42);
 assert.equal(game.phase,'finished');
 assert.equal(game.winnerSeat,1);
});

test('expert cannot peek at hidden opponent hands or the shuffled deck',()=>{
 const state=fixture(['4','3','5']);
 pawn(state,4,'track',20);
 pawn(state,0,'track',23);
 pawn(state,8,'track',39);
 state.hands[0]=[{id:2,type:'joker'},{id:3,type:'13'}];
 state.hands[2]=[{id:4,type:'7'}];
 state.hands[3]=[{id:5,type:'12'}];
 const revised=structuredClone(state);
 revised.hands[0]=[{id:555,type:'2'},{id:556,type:'swap'}];
 revised.hands[2]=[{id:557,type:'joker'}];
 revised.hands[3]=[{id:558,type:'13'}];
 revised.deck.reverse();
 const first=chooseDogBotAction(state,1,'expert');
 const second=chooseDogBotAction(revised,1,'expert');
 assert.deepEqual(second,first,'different unseen cards cannot change expert decisions');
});

test('expert stays responsive with joker, split seven and several pawns in play',()=>{
 const game=fixture(['7','joker','3','4','5']);
 pawn(game,4,'track',28);pawn(game,5,'track',53);
 pawn(game,6,'track',10);pawn(game,7,'goal',2);
 const before=Date.now();
 const move=chooseDogBotAction(game,1,'expert');
 assert.ok(Date.now()-before<2500,'bounded lookahead must not hang the board');
 assert.ok(legalActions(game,1).some(a=>JSON.stringify(a)===JSON.stringify(move)));
});

test('expert keeps valuable split-seven cards when a completely blocked hand must discard',()=>{
 const game=fixture(['7','12','swap']);
 const actions=legalActions(game,1);
 assert.equal(actions.length,3);
 assert.ok(actions.every(action=>action.type==='discardDraw'));
 const choice=chooseDogBotAction(game,1,'expert');
 assert.equal(game.hands[1].find(card=>card.id===choice.cardId)?.type,'swap',
  'discard an unusable swap before wasting a flexible seven');
 assert.ok(actions.some(action=>JSON.stringify(action)===JSON.stringify(choice)));
});

test('expert prioritizes stopping an opponent at 3/4 goals with an immediate winning threat',()=>{
 const game=fixture(['2','3']);
 pawn(game,4,'track',15); // blue can enter its goal with a 2
 pawn(game,5,'track',60); // blue can capture red fourth pawn with a 3
 pawn(game,0,'track',63);
 pawn(game,1,'goal',1);pawn(game,2,'goal',2);pawn(game,3,'goal',3);
 game.hands[0]=[{id:801,type:'4'},{id:802,type:'9'},{id:803,type:'11'}];
 const before=structuredClone(game);
 const move=chooseDogBotAction(game,1,'expert');
 assert.equal(move?.type,'move');
 assert.equal(move?.steps,3);
 assert.deepEqual(move?.captures,[0],'deny red an imminent fourth goal');
 assert.deepEqual(game,before,'assessing opponents must never change their hand');
});

test('expert evaluates with a strict time bound even in complex tactical positions',()=>{
 const game=fixture(['7','joker','13','swap','4','5']);
 pawn(game,4,'track',19);pawn(game,5,'track',28);
 pawn(game,6,'track',49);pawn(game,7,'goal',2);
 pawn(game,0,'track',22);pawn(game,8,'track',37);
 const start=Date.now();
 const result=chooseDogBotAction(game,1,'expert');
 assert.ok(Date.now()-start<2500);
 assert.ok(legalActions(game,1).some(action=>JSON.stringify(action)===JSON.stringify(result)));
});

test('three-way and duel bot strategies never treat an unrelated seat as a teammate',()=>{
 for(const mode of ['solo3','solo2']){
  const game=createGame({rng:()=>.3,bots:[false,true,false,false],
    inactiveSeats:mode==='solo2'?[2,3]:[3]});
  assert.equal(game.mode,mode);
  game.phase='exchange';game.hands[1]=[{id:900,type:'13'},{id:901,type:'3'}];
  const chosen=chooseDogBotAction(game,1,'expert');
  assert.ok(legalActions(game,1).some(a=>JSON.stringify(a)===JSON.stringify(chosen)));
 }
});
test('Magie menu sends only host-owned online difficulty changes to Render',()=>{
 const {readFileSync}=await import('node:fs');
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 assert.match(app,/onlineBotDifficulties=room\.match\?\.dogBotDifficulties/);
 assert.match(app,/if\(online\)\{void setOnlineDogBotDifficulty\(bot\.seat,select\.value\)/);
 assert.match(app,/hubRequest\('\/dog\/bot-difficulty','POST'/);
 assert.match(app,/if\(!online\|\|!onlineRoomHost\|\|!acceptedMatchId\)return/);
});
