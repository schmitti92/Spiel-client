import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,legalActions,takeAction} from '../DOG/engine.js';

const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../DOG/index.html',import.meta.url),'utf8');

test('clicking a playable 7 directly dispatches the authorized seven action',()=>{
 assert.match(app,/function startSelectedSeven\(seat\)/);
 assert.match(app,/card\?\.type!=='7'&&\!\(card\?\.type==='joker'&&jokerAs==='7'\)/);
 assert.match(app,/available\.findIndex\(m=>m\.type==='seven'&&m\.cardId===selectedCard&&m\.as==='7'\)/);
 assert.match(app,/if\(index<0\)return false;\s*onMove\(index\);/);
 assert.match(app,/render\(\);\s*if\(startSelectedSeven\(seat\)\)return;/);
});
test('Joker declared as 7 also starts the split automatically',()=>{
 assert.match(app,/jokerAs=button\.dataset\.jokerAs;selectedPiece=null;jokerDialog\.close\(\);render\(\);\s*startSelectedSeven\(currentHuman\(\)\);/);
});
test('separate seven starter button is gone; ending a legal split stays available',()=>{
 assert.doesNotMatch(app,/🔥 7 Schritte verteilen/);
 assert.match(app,/const special=available\.filter\(m=>\['exchange','seven-finish','emptySwap'\]/);
 assert.match(html,/import\('\.\/app\.js\?v=107'\)/);
});
test('initiating seven does not move a pawn before the player selects the split',()=>{
 let s=createGame({rng:()=>0.42,bots:[false,false,false,false]});
 s.phase='play';s.current=0;s.hands=[[],[],[],[]];s.hands[0]=[{id:991,type:'7'}];
 for(const [id,pos] of [[0,2],[1,8]]){
  const pawn=s.pieces.find(p=>p.id===id);
  pawn.place='track';pawn.pos=pos;
 }
 const move=legalActions(s,0).find(a=>a.type==='seven'&&a.cardId===991);
 assert.ok(move);
 s=takeAction(s,0,move);
 assert.equal(s.phase,'seven');
 assert.equal(s.seven.spent,0);
 assert.ok(legalActions(s,0).some(a=>a.type==='seven-step'));
});
