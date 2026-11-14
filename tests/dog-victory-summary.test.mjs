import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDogVictory,DOG_VICTORY_SEATS} from '../DOG/victory-summary.js';
const fixture=(winner=0)=>{
 const players=['Rot','Blau','Grün','Gelb'].map((name,seat)=>({name,seat,bot:seat===3}));
 const pieces=Array.from({length:16},(_,id)=>({id,owner:Math.floor(id/4),place:'home',pos:-1}));
 for(const seat of DOG_VICTORY_SEATS[winner])for(const p of pieces.filter(x=>x.owner===seat)){p.place='goal';p.pos=p.id%4;}
 return {phase:'finished',round:3,winner,players,pieces};
};
test('victory scoreboard shows only actual goal counts for every player',()=>{
 const game=fixture();
 const result=summarizeDogVictory(game);
 assert.equal(result.winner,0);
 assert.deepEqual(result.teams.map(x=>({name:x.name,total:x.total,winning:x.winning})),
  [{name:'Rot / Grün',total:8,winning:true},{name:'Blau / Gelb',total:0,winning:false}]);
 assert.deepEqual(result.players.map(p=>p.seat),[0,2,1,3]);
 assert.deepEqual(result.players.map(p=>p.goalCount),[4,4,0,0]);
 assert.equal(result.players[3].bot,true);
});
test('blue/yellow victory has correct team and seat ordering',()=>{
 const game=fixture(1);
 game.pieces[0].place='goal';game.pieces[0].pos=1;
 const result=summarizeDogVictory(game);
 assert.deepEqual(result.teams.map(x=>x.name),['Blau / Gelb','Rot / Grün']);
 assert.deepEqual(result.teams.map(x=>x.total),[8,1]);
 assert.deepEqual(result.players.map(p=>p.seat),[1,3,0,2]);
});
test('result is derived without modifying match or exposing private hands',()=>{
 const game=fixture();
 game.hands=[[{type:'joker',id:91}],[],[],[]];
 const original=structuredClone(game);
 const result=summarizeDogVictory(game);
 assert.deepEqual(game,original);
 assert.equal(JSON.stringify(result).includes('joker'),false);
 assert.deepEqual(Object.keys(result).sort(),['players','teams','winner']);
});
test('no fake victory screen for incomplete or invalid match',()=>{
 const game=fixture();
 assert.equal(summarizeDogVictory({...game,phase:'play'}),null);
 assert.equal(summarizeDogVictory({...game,winner:null}),null);
 assert.equal(summarizeDogVictory({...game,pieces:[]}),null);
});
