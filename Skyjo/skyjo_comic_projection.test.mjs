import { projectSkyjoGame } from './skyjo_comic_projection.mjs';
import { renderComicSnapshot } from './skyjo_comic_snapshot_view.mjs';

const assert = (ok, msg) => { if (!ok) throw Error(msg); };
const makeRoom = n => ({
  kind:'skyjo-room-v2',version:2,
  lobby:{status:'playing',settings:{},players:Array.from({length:n},(_,i)=>({id:'seat-'+i,name:'Spieler '+i}))},
  game:{phase:'play',currentPlayer:1,playDeck:[{},{}],
    players:Array.from({length:n},(_,i)=>({name:'Spieler '+i,total:i*5,
      grid:Array.from({length:12},(_,j)=>j===0?null:j===1?{type:'star',faceUp:true}:j===2?{type:'number',value:9,faceUp:false}:{type:'number',value:j-i,faceUp:true}),
      extras:[],actions:[]}))}
});
let checks=0;
for(const n of [3,4,5])for(let i=0;i<n;i++){
 const projected=projectSkyjoGame(makeRoom(n),'seat-'+i);
 assert(projected.players.length===n&&projected.selfIndex===i,'Seat mapping');
 assert(projected.currentPlayer===1&&projected.playDeckCount===2,'Turn and deck');
 assert(projected.players[i].cards[0]===null,'Removed card');
 assert(projected.players[i].cards[1].value==='★','Joker');
 assert(projected.players[i].cards[2].faceUp===false&&!('value' in projected.players[i].cards[2]),'Hidden card data');
 assert(projected.players[i].total===i*5,'Points');
 checks+=6;
}
const node=()=>({innerHTML:''}), enemy=node(),self=node();
const root={getElementById:id=>id==='enemies'?enemy:id==='self'?self:null,querySelector:()=>null};
const room=makeRoom(5);
const projection=projectSkyjoGame(room,'seat-3');
renderComicSnapshot(room,'seat-3',root);
assert(self.innerHTML.includes('Spieler 3'),'View renders selected seat');
assert(projection.players[3].cards[2].faceUp===false,'Projection privacy');
checks+=2;
for(const corrupt of [
 r=>{r.game.players[0].grid=[]},
 r=>{r.game.players[0].grid[1]={type:'unknown',faceUp:true}},
 r=>{r.game.players.pop()}
]){
 const r=makeRoom(3);corrupt(r);
 let rejected=false;try{projectSkyjoGame(r,'seat-0')}catch(_){rejected=true}
 assert(rejected,'Corrupt snapshot must be rejected');checks++;
}
console.log('PASS: '+checks+' SKYJO Comic projection checks');
