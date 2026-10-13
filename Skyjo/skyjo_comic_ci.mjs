import { runComicAdapterTests } from './skyjo_comic_adapter.test.mjs';
import { renderComicSnapshot } from './skyjo_comic_snapshot_view.mjs';

const assert = (ok, message) => { if (!ok) throw Error(message); };
let checks = 0;
const makeRoom = n => ({
  kind:'skyjo-room-v2', version:2,
  lobby:{status:'playing',settings:{},players:Array.from({length:n},(_,i)=>({id:'seat-'+i,name:i===0?'<script>alert(1)</script>':'Player '+i}))},
  game:{phase:'playing',players:Array.from({length:n},(_,i)=>({grid:Array.from({length:12},(_,j)=>j%3===0?null:j===1?{type:'star',faceUp:true}:{type:'number',value:i+j,faceUp:j%2===0})}))}
});
const node = () => ({innerHTML:'',textContent:''});
const enemy=node(),self=node(),note=node();
const root={getElementById:id=>id==='enemies'?enemy:id==='self'?self:null,querySelector:()=>note};
const adapter=runComicAdapterTests();
assert(adapter.ok,'Adapter tests failed');
checks+=adapter.checks;
for(const n of [3,4,5]) {
 for(let seat=0;seat<n;seat++){
  const result=renderComicSnapshot(makeRoom(n),'seat-'+seat,root);
  assert(result.players===n&&result.selfIndex===seat&&result.opponents===n-1,'Seat layout failed');
  assert((enemy.innerHTML.match(/class="board /g)||[]).length===n-1,'Wrong opponent count');
  assert((self.innerHTML.match(/class="card /g)||[]).length===12,'Wrong card count');
  assert(!enemy.innerHTML.includes('<script>')&&!self.innerHTML.includes('<script>'),'Unescaped player name');
  assert(self.innerHTML.includes('★'),'Star card not rendered');
  assert(self.innerHTML.includes('card empty'),'Removed card must not look face-down');
  assert(self.innerHTML.includes('card hidden'),'Face-down card must be visible as a back');
  checks+=7;
 }
}
const before=enemy.innerHTML;
const invalid=makeRoom(3);
invalid.game.players[1].grid=[];
let rejected=false;
try {renderComicSnapshot(invalid,'seat-0',root)}catch(_){rejected=true}
assert(rejected,'Malformed board accepted');
assert(enemy.innerHTML===before,'Partial update after malformed board');
checks+=2;
console.log('PASS: '+checks+' SKYJO Comic adapter/view checks');
