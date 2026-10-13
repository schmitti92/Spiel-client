import { connectComicMirror } from './skyjo_comic_mirror.mjs';
const assert=(v,m)=>{if(!v)throw Error(m)};
const listeners=new Map(), events={
 addEventListener:(n,fn)=>listeners.set(n,fn),
 removeEventListener:(n,fn)=>{if(listeners.get(n)===fn)listeners.delete(n)}
};
const el=()=>({innerHTML:''}),enemies=el(),self=el();
const root={
 getElementById:id=>id==='enemies'?enemies:id==='self'?self:null,
 querySelector:()=>null,addEventListener:()=>{},removeEventListener:()=>{},contains:()=>true
};
const errors=[];
const dispose=connectComicMirror({root,game:{},eventTarget:events,onError:e=>errors.push(e.message)});
let checks=0;
assert(listeners.has('skyjo-comic-snapshot'),'Mirror subscribed');checks++;
const room={kind:'skyjo-room-v2',version:2,lobby:{status:'playing',settings:{},players:[0,1,2].map(i=>({id:'seat-'+i,name:'Player '+i}))},
 game:{phase:'play',players:[0,1,2].map(()=>({grid:Array.from({length:12},(_,i)=>({type:'number',value:i,faceUp:true}))}))}};
listeners.get('skyjo-comic-snapshot')({detail:{room,seatId:'seat-1',revision:1}});
assert(self.innerHTML.includes('Player 1'),'Mirror renders own seat');checks++;
const before=self.innerHTML;
listeners.get('skyjo-comic-snapshot')({detail:{room,seatId:'seat-0',revision:0}});
assert(self.innerHTML===before,'Stale snapshot ignored');checks++;
dispose();
assert(!listeners.has('skyjo-comic-snapshot'),'Mirror detached');checks++;
assert(errors.length===0,'No errors');checks++;
console.log('PASS: '+checks+' SKYJO Comic mirror event checks');
