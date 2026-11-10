import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('js/app.js'),html=read('game.html');
const start=app.indexOf('function next29BankerCountdown(game){');
const end=app.indexOf('\n// Update the stable money board in place;',start);
assert.ok(start>=0&&end>start,'29-case countdown is available');
const context={};
runInNewContext(app.slice(start,end)+'\n;globalThis.countdown=next29BankerCountdown;',context);
const calc=context.countdown;
const newGame=(opts={})=>({
 caseCount:29,phase:'open',
 bankerSchedule:[6,5,5,4,3,2,2,1],
 round:0,roundOpened:0,
 players:[{id:'a'}],openedAmounts:[],
 ...opts
});
test('26–28 case UI stays unchanged, and legacy 29-case matches have no misleading countdown',()=>{
 for(const count of [26,27,28]){
  assert.equal(calc(newGame({caseCount:count})),'');
 }
 assert.equal(calc(newGame({bankerSchedule:undefined})),'');
 assert.equal(calc(newGame({phase:'decision'})),'');
 assert.equal(calc(newGame({phase:'final'})),'');
});
test('new 29-case countdown shows next banker after sixth opening, and every new round',()=>{
 assert.match(calc(newGame()),/Banker in 6 Koffern/);
 assert.match(calc(newGame({openedAmounts:Array(5).fill({}),roundOpened:5})),/Banker in 1 Koffer$/);
 assert.match(calc(newGame({round:1,openedAmounts:Array(6).fill({})})),/Banker in 5 Koffern/);
 assert.match(calc(newGame({round:6,openedAmounts:Array(25).fill({})})),/Banker in 2 Koffern/);
 assert.match(calc(newGame({round:7,openedAmounts:Array(27).fill({})})),/Banker in 1 Koffer$/);
});
test('four player match ends the countdown when only two openable cases remain',()=>{
 const players=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
 assert.match(calc(newGame({players,round:5,openedAmounts:Array(23).fill({})})),/Banker in 2 Koffern/);
 assert.match(calc(newGame({players,round:5,openedAmounts:Array(24).fill({}),roundOpened:1})),/Banker in 1 Koffer$/);
});
test('countdown is purely local and shown in money-summary with no network or Firestore access',()=>{
 const code=app.slice(start,end);
 assert.doesNotMatch(code,/fetch\(|request\(|setTimeout|setInterval|Firestore|Firebase/);
 assert.match(app,/ausgeschieden'\+next29BankerCountdown\(g\)/);
 assert.match(html,/app\.js\?v=20261110-30cases-50m-v1/);
 assert.doesNotThrow(()=>new Script(app));
});
