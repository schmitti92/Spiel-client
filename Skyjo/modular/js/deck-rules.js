/* SKYJO deck construction: existing card factory, shuffle and ACTIONS are injected. */
(function(global){
'use strict';
function makePlayDeck(jokerCount=8,newCard,shuffle){let d=[];for(let i=0;i<3;i++)d.push(newCard('number',-2));for(let i=0;i<11;i++)d.push(newCard('number',0));for(const v of [-1,1,2,3,4,5,6,7,8,9,10,11,12])for(let i=0;i<7;i++)d.push(newCard('number',v));const jc=Math.max(0,Math.min(30,Math.floor(Number(jokerCount)||0)));for(let i=0;i<jc;i++)d.push(newCard('star'));return shuffle(d)}
function makeActionDeck(beginner,ACTIONS,newAction,shuffle){let d=[];for(const t of Object.keys(ACTIONS)){if(beginner&&(t==='thief'||t==='meteor'))continue;for(let i=0;i<3;i++)d.push(newAction(t))}return shuffle(d)}
Object.defineProperty(global,'SKYJO_DECK_RULES',{value:Object.freeze({makePlayDeck,makeActionDeck}),writable:false,configurable:false});
})(window);
