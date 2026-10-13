import { mountComicGame } from './skyjo_comic_mount.mjs';
const assert=(v,m)=>{if(!v)throw Error(m)};
function fixture(){
 return {kind:'skyjo-room-v2',version:2,
  lobby:{status:'playing',settings:{},players:Array.from({length:3},(_,i)=>({id:'seat-'+i,name:'Spieler '+i}))},
  game:{phase:'play',currentPlayer:0,players:Array.from({length:3},()=>({grid:Array.from({length:12},(_,j)=>({type:'number',value:j,faceUp:true}))}))}};
}
function dom(){
 const listeners={}, enemies={innerHTML:''},self={innerHTML:''};
 return {listeners,enemies,self,
 root:{getElementById:id=>id==='enemies'?enemies:id==='self'?self:null,
 querySelector:()=>null,addEventListener:(t,fn)=>listeners[t]=fn,
 removeEventListener:(t,fn)=>{if(listeners[t]===fn)delete listeners[t]},
 contains:()=>true}};
}
let checks=0,calls=0,authorized=true;
const game={selectCard:()=>{calls++},drawFromDeck:()=>{calls++}};
const a=dom();
const passive=mountComicGame({root:a.root,getSeatId:()=> 'seat-0',game,canAct:()=>authorized});
assert(passive.update(fixture(),1).selfIndex===0,'Read-only render');checks++;
assert(!a.self.innerHTML.includes('data-comic-action'),'Passive cards must not be clickable');checks++;
assert(passive.action('drawDeck')===false&&calls===0,'Passive actions denied');checks++;
passive.dispose();
assert(!a.listeners.click&&!a.listeners.keydown,'Passive listeners removed');checks++;
const b=dom();
const active=mountComicGame({root:b.root,getSeatId:()=> 'seat-0',game,canAct:()=>authorized,interactive:true});
assert(active.update(fixture(),1).selfIndex===0,'Interactive render');checks++;
assert(b.self.innerHTML.includes('data-comic-action="selectGridCard"'),'Interactive card markers');checks++;
assert(active.action('drawDeck')===true&&calls===1,'Engine dispatch');checks++;
assert(active.action('selectGridCard',{playerIndex:1,cardIndex:0})===false&&calls===1,'Opponent card denied');checks++;
assert(active.action('selectGridCard',{playerIndex:0,cardIndex:0})===true&&calls===2,'Own card allowed');checks++;
authorized=false;
assert(active.action('drawDeck')===false&&calls===2,'Permission revoked');checks++;
active.dispose();
assert(active.action('drawDeck')===false&&active.update(fixture(),2)===false,'Dispose blocks updates and actions');checks++;
console.log('PASS: '+checks+' SKYJO Comic mounted integration checks');
