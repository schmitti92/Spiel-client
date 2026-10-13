import { createComicLiveView } from './skyjo_comic_live_view.mjs';
const assert=(condition,msg)=>{if(!condition)throw Error(msg)};
const node=()=>({innerHTML:''}), enemies=node(),self=node();
const root={getElementById:id=>id==='enemies'?enemies:id==='self'?self:null,querySelector:()=>null};
const errors=[];
let seat='seat-0';
const controller=createComicLiveView({root,getSeatId:()=>seat,onError:e=>errors.push(e.message)});
function room(n=3){
 return {kind:'skyjo-room-v2',version:2,
 lobby:{status:'playing',players:Array.from({length:n},(_,i)=>({id:'seat-'+i,name:'Player '+i})),settings:{}},
 game:{phase:'play',currentPlayer:0,players:Array.from({length:n},()=>({
 grid:Array.from({length:12},(_,j)=>({type:'number',value:j,faceUp:j%2===0}))
 }))}};
}
let checks=0;
assert(controller.receive(room(),1).selfIndex===0,'Initial snapshot');checks++;
assert(controller.revision===1,'Initial revision');checks++;
assert(controller.receive(room(),1)===false,'Duplicate revision ignored');checks++;
assert(controller.receive(room(),0)===false,'Older revision ignored');checks++;
seat='seat-2';
assert(controller.receive(room(5),2).selfIndex===2,'Seat switch');checks++;
const old=enemies.innerHTML;
const broken=room();broken.game.players[0].grid=[];
assert(controller.receive(broken,3)===false,'Invalid update rejected');checks++;
assert(controller.revision===2&&enemies.innerHTML===old,'Failed update does not advance or alter board');checks++;
assert(errors.length===1,'Error callback');checks++;
assert(controller.receive(room(5),4).selfIndex===2,'Recovery');checks++;
controller.stop();
assert(controller.receive(room(5),5)===false&&controller.revision===4,'Stopped controller');checks++;
console.log('PASS: '+checks+' SKYJO Comic live view checks');
