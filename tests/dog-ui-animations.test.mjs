import test from 'node:test';
import assert from 'node:assert/strict';
import {createDogVisualFeedback} from '../DOG/ui-animations.js';

function fake(){
 const calls=[];
 const nodes={};
 function el(name){
  const classes=new Set();
  return {name,events:[],
   classList:{
    add:x=>{classes.add(x);calls.push(name+':+'+x)},
    remove:x=>{classes.delete(x);calls.push(name+':-'+x)},
    toggle:(x,on)=>{if(on)classes.add(x);else classes.delete(x);calls.push(name+':'+on+':'+x)},
    contains:x=>classes.has(x)
   },
   get offsetWidth(){return 10},
   addEventListener(type,fn){this.events.push({type,fn})},
   querySelector(){return nodes.active},
   closest(){return nodes.boardCard},
   dataset:{}
  };
 }
 for(const name of ['players','active','hand','dog-deck-art','dog-discard-art','winner','board','boardCard'])
  nodes[name]=el(name);
 return {nodes,calls,doc:{documentElement:el('root'),getElementById:id=>nodes[id]||null}};
}
const base={
 round:1,phase:'play',revision:3,winner:null,
 lastPlayedCard:null,discard:[{type:'5'}],hands:[[{id:1}],[],[],[]]
};
function event(game,activeSeat=0){
 return {game,activeSeat,matchKey:'match-42',seat:0,handVisible:true};
}
test('repeated room updates do not retrigger animations',()=>{
 const {doc,calls}=fake();
 const fx=createDogVisualFeedback(doc);
 fx.sync(event(base));const before=calls.length;
 fx.sync(event({...base}));
 assert.equal(calls.length,before);
 fx.sync(event({...base,revision:4},1));
 assert.equal(calls.filter(x=>x==='active:+dog-seat-turn-enter').length,1);
 fx.sync(event({...base,revision:4},1));
 assert.equal(calls.filter(x=>x==='active:+dog-seat-turn-enter').length,1);
});
test('new card and round trigger specific effects, no duplicate effect',()=>{
 const {doc,calls}=fake();
 const fx=createDogVisualFeedback(doc);
 fx.sync(event(base));
 const next={...base,revision:4,lastPlayedCard:{type:'joker',seat:1},discard:[...base.discard,{type:'joker'}]};
 fx.sync(event(next,1));
 assert.equal(calls.filter(x=>x==='dog-discard-art:+dog-discard-played').length,1);
 fx.sync(event(next,1));
 assert.equal(calls.filter(x=>x==='dog-discard-art:+dog-discard-played').length,1);
 fx.sync(event({...next,round:2,revision:5,phase:'exchange'},0));
 assert.equal(calls.filter(x=>x==='dog-deck-art:+dog-deck-shuffled').length,1);
});
test('pending and invalid feedback never alter game state',()=>{
 const {doc,nodes}=fake(),game=structuredClone(base);
 const fx=createDogVisualFeedback(doc);
 fx.sync(event(game));
 fx.pending(true);
 assert.equal(doc.documentElement.classList.contains('dog-move-pending'),true);
 fx.invalid();
 assert.equal(nodes.boardCard.classList.contains('dog-board-invalid'),true);
 fx.reset();
 assert.equal(doc.documentElement.classList.contains('dog-move-pending'),false);
 assert.deepEqual(game,base);
});
