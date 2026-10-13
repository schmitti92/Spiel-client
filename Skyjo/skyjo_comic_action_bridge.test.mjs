import { createComicActionBridge } from './skyjo_comic_action_bridge.mjs';
const assert=(v,m)=>{if(!v)throw Error(m)};
let authorized=false, calls=[], errors=[];
const game={
 drawFromDeck:()=>calls.push(['deck']),
 drawFromDiscard:()=>calls.push(['discard']),
 discardDrawn:()=>calls.push(['drop']),
 selectCard:(...a)=>calls.push(['card',...a]),
 resolveBoardMatch:(...a)=>calls.push(['match',...a])
};
const bridge=createComicActionBridge({game,canAct:()=>authorized,onError:e=>errors.push(e.message)});
let checks=0;
assert(bridge.dispatch('drawDeck')===false&&calls.length===0,'Unauthorized deck denied');checks++;
assert(bridge.dispatch('selectGridCard',{playerIndex:0,cardIndex:0})===false,'Unauthorized card denied');checks++;
authorized=true;
for(const action of ['drawDeck','drawDiscard','discardDrawn']){
 assert(bridge.dispatch(action)===true,'Action '+action);checks++;
}
assert(bridge.dispatch('selectGridCard',{playerIndex:2,cardIndex:11})===true,'Grid action');checks++;
assert(JSON.stringify(calls.at(-1))===JSON.stringify(['card',2,'grid',11]),'Grid args');checks++;
assert(bridge.dispatch('selectExtraCard',{playerIndex:0,cardIndex:0})===true,'Extra action');checks++;
assert(JSON.stringify(calls.at(-1))===JSON.stringify(['card',0,'extra',0]),'Extra args');checks++;
assert(bridge.dispatch('resolveMatch',{playerIndex:2,matchIndex:1})===true,'Match action');checks++;
const before=calls.length;
for(const [action,payload] of [
 ['admin',{}],['selectGridCard',{playerIndex:-1,cardIndex:0}],
 ['selectGridCard',{playerIndex:0,cardIndex:1.5}],
 ['selectGridCard',{playerIndex:0,cardIndex:'0'}],
 ['resolveMatch',{playerIndex:0,matchIndex:-1}]
]){
 assert(bridge.dispatch(action,payload)===false,'Invalid '+action);checks++;
}
assert(calls.length===before,'No action after invalid payloads');checks++;
const faulty=createComicActionBridge({game:{drawFromDeck:()=>{throw Error('engine failure')}},canAct:()=>true,onError:e=>errors.push(e.message)});
assert(faulty.dispatch('drawDeck')===false&&errors.at(-1)==='engine failure','Engine failure caught');checks++;
console.log('PASS: '+checks+' SKYJO Comic action bridge checks');
