import { publishComicSnapshot } from './skyjo_comic_publisher.mjs';
const assert=(v,m)=>{if(!v)throw Error(m)};
let events=[];
const target={dispatchEvent:e=>{events.push(e);return true}};
const room={kind:'skyjo-room-v2',version:2,
 lobby:{players:[0,1,2].map(i=>({id:'seat-'+i,name:'P'+i}))},
 game:{players:[{},{},{}]}};
let checks=0;
assert(publishComicSnapshot({target,room,seatId:'seat-1',revision:1})===true,'Valid publish');checks++;
assert(events.length===1&&events[0].type==='skyjo-comic-snapshot','Event type');checks++;
assert(events[0].detail.seatId==='seat-1','Seat passed');checks++;
for(const args of [
 {target,room,seatId:'other',revision:2},
 {target,room,seatId:'seat-0',revision:-1},
 {target,room:{...room,game:null},seatId:'seat-0',revision:2},
 {target,room:{...room,lobby:{players:room.lobby.players.slice(0,2)}},seatId:'seat-0',revision:2},
 {target:null,room,seatId:'seat-0',revision:2}
]){
 assert(publishComicSnapshot(args)===false,'Invalid publisher input rejected');checks++;
}
assert(events.length===1,'No invalid events dispatched');checks++;
console.log('PASS: '+checks+' SKYJO Comic publisher checks');
