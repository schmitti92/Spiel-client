import { bindComicCardInteractions } from './skyjo_comic_card_events.mjs';
const assert=(x,m)=>{if(!x)throw Error(m)};
const handlers={}, calls=[];
let enabled=false, detached=false;
const root={
 addEventListener:(type,fn)=>{handlers[type]=fn},
 removeEventListener:(type,fn)=>{if(handlers[type]===fn)delete handlers[type]},
 contains:target=>!target.outside
};
const target={
 outside:false,
 closest:()=>target,
 getAttribute:name=>({
 'data-comic-action':'selectGridCard',
 'data-player-index':'2',
 'data-card-index':'11'
 }[name])
};
const bridge={dispatch:(...args)=>calls.push(args)};
const stop=bindComicCardInteractions({root,bridge,isEnabled:()=>enabled,isOwnPlayer:index=>index===2});
let checks=0;
const click=()=>handlers.click({type:'click',target});
click();assert(calls.length===0,'Disabled must not dispatch');checks++;
enabled=true;click();
assert(calls.length===1&&calls[0][0]==='selectGridCard'&&calls[0][1].cardIndex===11,'Click dispatch');checks++;
let prevented=false;
handlers.keydown({type:'keydown',target,key:'Enter',preventDefault:()=>{prevented=true}});
assert(prevented&&calls.length===2,'Enter keyboard');checks++;
handlers.keydown({type:'keydown',target,key:'Escape',preventDefault:()=>{}});
assert(calls.length===2,'Ignore other keys');checks++;
target.outside=true;click();assert(calls.length===2,'Ignore outside root');checks++;
target.outside=false;
stop();assert(!handlers.click&&!handlers.keydown,'Cleanup listeners');checks++;
console.log('PASS: '+checks+' SKYJO Comic DOM interaction checks');
