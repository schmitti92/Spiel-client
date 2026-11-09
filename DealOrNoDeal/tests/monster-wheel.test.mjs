import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const load=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=load('weihnachten.html');
const lobby=load('lobby.html');
const js=load('js/monster-wheel.js');
const lines=load('js/commentary-lines.js');
const game=load('js/app.js');

test('Monster wheel scripts and inline page scripts parse without syntax errors',()=>{
 new vm.Script(js,{filename:'monster-wheel.js'});
 new vm.Script(lines,{filename:'commentary-lines.js'});
 new vm.Script(game,{filename:'app.js'});
 for(const [filename,text] of [['weihnachten.html',html],['lobby.html',lobby]]){
  const matches=[...text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(matches.length>0,filename+' should contain an inline script');
  for(const match of matches)if(match[1].trim())new vm.Script(match[1],{filename});
 }
});

test('Monster wheel is present in collection with all required interaction nodes',()=>{
 for(const id of ['monster-spin-open','monster-wheel-overlay','monster-wheel-disc','monster-prize-list',
  'monster-spin-start','monster-wheel-close','monster-wheel-status','monster-wheel-prize',
  'monster-modal-tickets','monster-wheel-card-action','monster-wheel-result-avatar']){
  assert.match(html,new RegExp('id="'+id+'"'),id+' missing');
 }
 assert.match(html,/js\/monster-wheel\.js/);
 assert.match(html,/css\/monster-wheel\.css/);
 assert.match(html,/monster\/spin/);
 assert.match(js,/8000/);
 assert.match(js,/cubic-bezier/);
 assert.match(html,/monsterSpinRequestId/);
});

test('Giftzwerg avatar is wired to game portrait, lobby gate and commentary',()=>{
 assert.match(lobby,/Muffiger Giftzwerg/);
 assert.match(lobby,/giftzwergUnlocked/);
 assert.match(lobby,/n===15&&!giftzwergUnlocked/);
 assert.match(lobby,/giftzwerg\.svg/);
 assert.match(game,/avatarId===15/);
 assert.match(game,/winnerPlayer\.avatar===15/);
 assert.match(lines,/studioCommentLines\[15\]/);
 const match=lines.match(/studioCommentLines\[15\]=([\s\S]*?);\s*$/);
 assert.ok(match,'Giftzwerg catalogue missing');
 const cat=JSON.parse(match[1]);
 for(const key of ['oneCent','small','neutral','large','millionLost','bankerGood','bankerBad',
  'bankerVeryGood','bankerVeryBad','finalCases','deal','noDeal','streakGood','streakBad']){
  assert.ok(Array.isArray(cat[key])&&cat[key].length>=5,key+' lacks dialogue');
 }
});
