import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planDogBotReplay} from '../DOG/online-bot-replay.js';
import {createGame} from '../DOG/engine.js';
const pawns=()=>createGame({rng:()=>.5}).pieces.map(({id,owner,place,pos})=>({id,owner,place,pos}));
function fixture(){
 const first=pawns();const moved=structuredClone(first),last=structuredClone(first);
 moved[0].place='track';moved[0].pos=0;
 last[0].place='track';last[0].pos=4;
 const old={revision:5,pieces:first};
 const current={revision:7,pieces:last};
 const replay={fromRevision:5,truncated:false,events:[
 {seat:0,bot:false,revision:6,pieces:moved},
 {seat:1,bot:true,revision:7,pieces:last}
 ]};
 return {old,current,replay};
}
test('each bot movement plays as a separate public frame in board order',()=>{
 const {old,current,replay}=fixture();
 const frames=planDogBotReplay(old,current,replay);
 assert.equal(frames.length,2);
 assert.equal(frames[0].revision,6);
 assert.equal(frames[1].revision,7);
 assert.equal(frames[1].pieces[0].pos,4);
 assert.equal(JSON.stringify(replay).includes('hands'),false);
 assert.equal(JSON.stringify(replay).includes('deck'),false);
});
test('old, malformed, truncated or out-of-order frames are skipped safely',()=>{
 const {old,current,replay}=fixture();
 assert.deepEqual(planDogBotReplay({...old,revision:4},current,replay),[]);
 assert.deepEqual(planDogBotReplay(old,current,{...replay,truncated:true}),[]);
 assert.deepEqual(planDogBotReplay(old,current,{...replay,events:[replay.events[1],replay.events[0]]}),[]);
 assert.deepEqual(planDogBotReplay(old,current,{...replay,events:replay.events.slice(0,1)}),[]);
 const contaminated=structuredClone(replay);contaminated.events[0].pieces[0].owner=10;
 assert.deepEqual(planDogBotReplay(old,current,contaminated),[]);
 const privateHand=structuredClone(replay);privateHand.events[0].pieces[0].place='secret';
 assert.deepEqual(planDogBotReplay(old,current,privateHand),[]);
});
test('ordinary human moves do not create an unnecessary bot replay',()=>{
 const {old,current,replay}=fixture();replay.events[1].bot=false;
 assert.deepEqual(planDogBotReplay(old,current,replay),[]);
});
test('the board replays the server frames without requesting new Render or Firebase moves',()=>{
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 assert.match(app,/planDogBotReplay\(previousGame,decision\.game,room\.match\?\.dogReplay\)/);
 assert.match(app,/onlineReplayFrame/);
 assert.match(app,/const visualGame=onlineReplayFrame/);
 assert.match(app,/lastMotionDuration\)\+\(betweenBots\?1000:240\)/);
});
