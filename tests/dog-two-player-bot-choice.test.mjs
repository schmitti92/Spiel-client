import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,exchangeCard,finalizeCompletedDogGame,legalActions} from '../DOG/engine.js';
import {summarizeDogVictory} from '../DOG/victory-summary.js';

function startForTwoPeople(botCount){
 const active=2+botCount;
 return createGame({rng:()=>0.37,names:['Anna','Ben','Bot Rot','Bot Gelb'],
  bots:[false,false,botCount>=1,botCount===2],
  inactiveSeats:[2,3].filter(seat=>seat>=active)});
}
test('two human DOG seats can play with zero, one or two bots without phantom pawns',()=>{
 for(const count of [0,1,2]){
  const game=startForTwoPeople(count);
  assert.equal(game.mode,count===0?'solo2':count===1?'solo3':'teams4');
  assert.equal(game.players.filter(p=>p.bot).length,count);
  assert.equal(game.players.filter(p=>p.inactive).length,2-count);
  assert.equal(game.pieces.length,4*(2+count));
  assert.equal(game.hands.flat().length,6*(2+count));
  for(const p of game.players.filter(x=>x.inactive)){
   assert.deepEqual(game.hands[p.seat],[]);
   assert.equal(game.exchanges[p.seat],true);
   assert.deepEqual(legalActions(game,p.seat),[]);
  }
 }
});
test('two-person no-bot DOG exchange passes cards to the other human and does not wait for empty seats',()=>{
 let game=startForTwoPeople(0);
 const old0=game.hands[0][0].id,old1=game.hands[1][0].id;
 game=exchangeCard(game,0,old0,()=>0.37);
 assert.equal(game.phase,'exchange');
 game=exchangeCard(game,1,old1,()=>0.37);
 assert.equal(game.phase,'play');
 assert.equal(game.hands[0].length,6);
 assert.equal(game.hands[1].length,6);
 assert.ok(game.hands[0].some(c=>c.id===old1));
 assert.ok(game.hands[1].some(c=>c.id===old0));
 assert.equal(game.hands[2].length,0);
 assert.equal(game.hands[3].length,0);
});
test('solo2 and solo3 reward the actual first four-pawn winner, not team parity',()=>{
 for(const count of [0,1]){
  const game=startForTwoPeople(count);
  for(const piece of game.pieces.filter(piece=>piece.owner===1)){piece.place='goal';piece.pos=piece.id%4;}
  const result=finalizeCompletedDogGame(game);
  assert.equal(result.mode,count===0?'solo2':'solo3');
  assert.equal(result.winner,1);
  assert.equal(result.winnerSeat,1);
  const ceremony=summarizeDogVictory(result);
  assert.equal(ceremony.mode,result.mode);
  assert.equal(ceremony.players.length,2+count);
  assert.equal(ceremony.teams.length,2+count);
  assert.equal(ceremony.players[0].seat,1);
  assert.equal(ceremony.teams[0].capacity,4);
  if(count===1)assert.ok(ceremony.players.some(p=>p.bot));
 }
});
test('the online host controls the selector via the Render API; local player can select bot count',()=>{
 const html=readFileSync(new URL('../hub-lobby.html',import.meta.url),'utf8');
 const room=readFileSync(new URL('../DOG/room-lobby.js',import.meta.url),'utf8');
 const hub=readFileSync(new URL('../hub-lobby.js',import.meta.url),'utf8');
 const gameHTML=readFileSync(new URL('../DOG/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 assert.match(html,/id="dog-room-bot-count"/);
 assert.match(html,/option value="0">0 Bots/);
 assert.match(html,/option value="1">1 Bot/);
 assert.match(html,/option value="2">2 Bots/);
 assert.match(room,/twoHumans=total===2&&snapshot.phase==='preparing'/);
 assert.match(room,/send\('bots',\{botCount\}\)/);
 assert.match(hub,/request\('\/rooms\/'\+code\+'\/dog\/bots','POST',\{botCount\}\)/);
 assert.match(gameHTML,/id="local-bot-count"/);
 assert.match(app,/localBotCount=humans===2\?Number\(\$\('local-bot-count'\)\.value\)/);
 assert.match(app,/inactiveSeats:seats.filter\(i=>i>=activeCount\)/);
 assert.match(app,/g\.pieces\.length===4\*g\.players\.filter\(p=>!p\.inactive\)\.length/);
});
